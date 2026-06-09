/**
 * InReal Backend API Server (PostgreSQL / Supabase)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, 'uploads');
const proofsDir = path.join(uploadsRoot, 'proofs');

if (!process.env.DATABASE_URL) {
  console.error(
    'Missing DATABASE_URL. Set DATABASE_URL to your Postgres connection string (e.g. Supabase) before starting server.js.'
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);

    const defaults = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];

    // Support comma-separated FRONTEND_URL env var; normalize by stripping trailing slashes
    const fromEnv = (process.env.FRONTEND_URL || '')
      .split(',')
      .map(s => s.trim().replace(/\/$/, ''))
      .filter(Boolean);

    const allowedOrigins = [...defaults, ...fromEnv];

    // Allow vercel preview domains automatically (convenient for demos)
    const isVercelPreview = origin.endsWith('.vercel.app') || origin.endsWith('.vercel.sh');

    if (allowedOrigins.includes(origin.replace(/\/$/, '')) || isVercelPreview) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

async function q(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function getUserFinancialSummary(userId) {
  const rows = await q(
    `SELECT
      u.user_id AS "UserID",
      u.email AS "Email",
      u.first_name AS "FirstName",
      u.last_name AS "LastName",
      u.country_code AS "CountryCode",
      u.accreditation_status AS "AccreditationStatus",
      u.kyc_status AS "KYCStatus",
      u.identity_verified AS "IdentityVerified",
      u.bank_account_linked AS "BankAccountLinked",
      COUNT(DISTINCT i.property_id) AS "PropertiesOwned",
      COALESCE(SUM(i.investment_amount), 0) AS "TotalInvested",
      COALESCE(SUM(i.distribution_earned), 0) AS "TotalDistributions",
      COALESCE(SUM(i.investment_amount + i.distribution_earned), 0) AS "PortfolioValue",
      0::numeric AS "AvailableBalance",
      u.created_at AS "CreatedAt"
    FROM users u
    LEFT JOIN investments i
      ON u.user_id = i.user_id
      AND i.status = 'Active'
      AND i.is_deleted = false
    WHERE u.user_id = $1
      AND u.is_deleted = false
      AND u.is_active = true
    GROUP BY
      u.user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.country_code,
      u.accreditation_status,
      u.kyc_status,
      u.identity_verified,
      u.bank_account_linked,
      u.created_at`,
    [userId]
  );

  return rows[0] || null;
}

function generateTransferReference() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `INR-${datePart}-${shortId}`;
}

function parseDescription(description) {
  if (!description) return {};
  try {
    return typeof description === 'string' ? JSON.parse(description) : description;
  } catch {
    return { rawDescription: description };
  }
}

function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const match = /^demo-token-(\d+)$/i.exec(token);
  return match ? Number(match[1]) : null;
}

function requireAuthenticatedUserId(req, res) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function getUserRole(userId) {
  const rows = await q(
    `SELECT COALESCE(role, 'user') AS role
     FROM users
     WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
    [userId]
  );
  return rows[0]?.role || null;
}

async function requireAdmin(req, res) {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return null;

  const role = await getUserRole(userId);
  if (!role) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return null;
  }
  if (role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return null;
  }
  return userId;
}

function sanitizeUserRecord(user) {
  const { PasswordHash, PasswordSalt, password_hash, password_salt, ...safeUser } = user;
  return {
    ...safeUser,
    Role: safeUser.Role || safeUser.role || 'user',
  };
}

async function ensureUploadDirs() {
  await fs.mkdir(proofsDir, { recursive: true });
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = pbkdf2Sync(password, salt, 120000, 64, 'sha512');
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actualHash.length && timingSafeEqual(expected, actualHash);
}

async function ensureAuthColumns() {
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`);
  await q(`UPDATE users SET role = 'user' WHERE role IS NULL`);
}

async function bootstrapAdminUsers() {
  const emails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  for (const email of emails) {
    const updated = await q(
      `UPDATE users
       SET role = 'admin', updated_at = NOW()
       WHERE LOWER(email) = $1 AND is_deleted = false
       RETURNING user_id`,
      [email]
    );
    if (updated.length > 0) {
      console.log(`Admin role granted to ${email}`);
    }
  }
}

async function verifyUserAndProperty(userId, propertyId) {
  const users = await q(
    `SELECT user_id, identity_verified, kyc_status, is_active, is_deleted
     FROM users
     WHERE user_id = $1`,
    [userId]
  );
  if (users.length === 0 || !users[0].is_active || users[0].is_deleted) {
    throw new Error('User not found or inactive');
  }
  if (!users[0].identity_verified || users[0].kyc_status !== 'Approved') {
    throw new Error('User is not KYC/identity approved');
  }

  const properties = await q(
    `SELECT property_id, is_active, is_deleted, status
     FROM properties
     WHERE property_id = $1`,
    [propertyId]
  );
  if (properties.length === 0 || !properties[0].is_active || properties[0].is_deleted) {
    throw new Error('Property not found or inactive');
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await q('SELECT 1 AS status');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    const properties = await q(
      `SELECT
        property_id AS "PropertyID",
        property_name AS "PropertyName",
        address AS "Address",
        city AS "City",
        country AS "Country",
        property_type AS "PropertyType",
        bedrooms AS "Bedrooms",
        bathrooms AS "Bathrooms",
        square_meter AS "SquareMeter",
        property_value AS "PropertyValue",
        fraction_price AS "FractionPrice",
        monthly_rental_income AS "MonthlyRentalIncome",
        projected_annual_yield AS "ProjectedAnnualYield",
        current_occupancy_rate AS "CurrentOccupancyRate",
        status AS "Status",
        fractions_sold AS "FractionsSold",
        total_fractions AS "TotalFractions",
        property_description AS "PropertyDescription",
        image_url AS "ImageURL"
      FROM properties
      WHERE is_active = true AND is_deleted = false
      ORDER BY property_name
      LIMIT 100`
    );

    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await q(
      `SELECT
        property_id AS "PropertyID",
        property_name AS "PropertyName",
        address AS "Address",
        city AS "City",
        country AS "Country",
        property_type AS "PropertyType",
        bedrooms AS "Bedrooms",
        bathrooms AS "Bathrooms",
        square_meter AS "SquareMeter",
        property_value AS "PropertyValue",
        total_fractions AS "TotalFractions",
        fraction_price AS "FractionPrice",
        monthly_rental_income AS "MonthlyRentalIncome",
        projected_annual_yield AS "ProjectedAnnualYield",
        actual_annual_yield AS "ActualAnnualYield",
        current_occupancy_rate AS "CurrentOccupancyRate",
        property_description AS "PropertyDescription",
        image_url AS "ImageURL",
        status AS "Status",
        fractions_sold AS "FractionsSold",
        acquisition_date AS "AcquisitionDate",
        is_active AS "IsActive",
        is_deleted AS "IsDeleted"
      FROM properties
      WHERE property_id = $1 AND is_active = true AND is_deleted = false`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const users = await q(
      `SELECT
        user_id AS "UserID",
        email AS "Email",
        first_name AS "FirstName",
        last_name AS "LastName",
        country_code AS "CountryCode",
        accreditation_status AS "AccreditationStatus",
        kyc_status AS "KYCStatus",
        identity_verified AS "IdentityVerified",
        bank_account_linked AS "BankAccountLinked",
        password_hash AS "PasswordHash",
        password_salt AS "PasswordSalt",
        COALESCE(role, 'user') AS "Role",
        created_at AS "CreatedAt"
      FROM users
      WHERE email = $1 AND is_active = true AND is_deleted = false`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = users[0];
    if (!user.IdentityVerified) {
      return res.status(403).json({ success: false, error: 'Identity not verified' });
    }

    const hasStoredPassword = Boolean(user.PasswordHash && user.PasswordSalt);
    const demoPassword = 'Demo123!';

    if (hasStoredPassword) {
      const isValid = verifyPassword(password, user.PasswordSalt, user.PasswordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
    } else if (password !== demoPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    } else {
      const { salt, hash } = hashPassword(password);
      await q('UPDATE users SET password_hash = $2, password_salt = $3, updated_at = NOW() WHERE user_id = $1', [user.UserID, hash, salt]);
    }

    const summary = await getUserFinancialSummary(user.UserID);
    await q('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1', [user.UserID]);

    res.json({
      success: true,
      data: {
        ...sanitizeUserRecord(user),
        TotalInvested: summary?.TotalInvested ?? 0,
        PortfolioValue: summary?.PortfolioValue ?? 0,
        TotalDistributions: summary?.TotalDistributions ?? 0,
        PropertiesOwned: summary?.PropertiesOwned ?? 0,
      },
      token: `demo-token-${user.UserID}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const rows = await q(
      `SELECT
        user_id AS "UserID",
        email AS "Email",
        first_name AS "FirstName",
        last_name AS "LastName",
        country_code AS "CountryCode",
        accreditation_status AS "AccreditationStatus",
        kyc_status AS "KYCStatus",
        identity_verified AS "IdentityVerified",
        bank_account_linked AS "BankAccountLinked",
        COALESCE(role, 'user') AS "Role",
        created_at AS "CreatedAt"
      FROM users
      WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const summary = await getUserFinancialSummary(userId);

    res.json({
      success: true,
      data: {
        ...rows[0],
        TotalInvested: summary?.TotalInvested ?? 0,
        PortfolioValue: summary?.PortfolioValue ?? 0,
        TotalDistributions: summary?.TotalDistributions ?? 0,
        PropertiesOwned: summary?.PropertiesOwned ?? 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneCode, phone, countryCode, password } = req.body;
    if (!firstName || !lastName || !email || !phoneCode || !phone || !countryCode || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existing = await q('SELECT user_id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const fullPhoneNumber = `${phoneCode} ${phone}`;
    const { salt, hash } = hashPassword(password);
    const inserted = await q(
      `INSERT INTO users (
        email, first_name, last_name, country_code, phone_number,
        password_hash, password_salt,
        accreditation_status, kyc_status, identity_verified, bank_account_linked,
        total_invested, portfolio_value, total_distributions,
        role, is_active, is_deleted, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        'Verified', 'Approved', true, true,
        0, 0, 0,
        'user', true, false, NOW(), NOW()
      ) RETURNING user_id AS "UserID"`,
      [email, firstName, lastName, countryCode, fullPhoneNumber, hash, salt]
    );

    const newUserId = inserted[0].UserID;
    const newUsers = await q(
      `SELECT
        user_id AS "UserID",
        email AS "Email",
        first_name AS "FirstName",
        last_name AS "LastName",
        country_code AS "CountryCode",
        accreditation_status AS "AccreditationStatus",
        kyc_status AS "KYCStatus",
        identity_verified AS "IdentityVerified",
        bank_account_linked AS "BankAccountLinked",
        COALESCE(role, 'user') AS "Role",
        created_at AS "CreatedAt"
      FROM users
      WHERE user_id = $1`,
      [newUserId]
    );

    const summary = await getUserFinancialSummary(newUserId);

    res.json({
      success: true,
      data: {
        ...sanitizeUserRecord(newUsers[0]),
        TotalInvested: summary?.TotalInvested ?? 0,
        PortfolioValue: summary?.PortfolioValue ?? 0,
        TotalDistributions: summary?.TotalDistributions ?? 0,
        PropertiesOwned: summary?.PropertiesOwned ?? 0,
      },
      message: 'Account created successfully. Please verify your identity to start investing.',
      token: `demo-token-${newUserId}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/user/:userId/portfolio', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    if (authenticatedUserId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const summaryRow = await getUserFinancialSummary(userId);

    if (!summaryRow) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const investments = await q(
      `SELECT
        i.investment_id AS "InvestmentID",
        i.property_id AS "PropertyID",
        i.fractions_owned AS "FractionsOwned",
        i.investment_amount AS "InvestmentAmount",
        i.distribution_earned AS "DistributionEarned",
        i.investment_date AS "InvestmentDate",
        i.status AS "Status",
        p.property_name AS "PropertyName",
        p.city AS "City",
        p.country AS "Country",
        p.projected_annual_yield AS "ProjectedAnnualYield",
        p.monthly_rental_income AS "MonthlyRentalIncome",
        p.property_value AS "PropertyValue"
      FROM investments i
      JOIN properties p ON i.property_id = p.property_id
      WHERE i.user_id = $1 AND i.status = 'Active' AND i.is_deleted = false
      ORDER BY i.investment_date DESC`,
      [userId]
    );

    res.json({ success: true, data: { summary: summaryRow, investments } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/user/:userId/distributions', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    if (authenticatedUserId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const distributions = await q(
      `SELECT
        id.investor_distribution_id AS "InvestorDistributionID",
        id.amount_received AS "AmountReceived",
        id.distribution_date AS "DistributionDate",
        id.status AS "Status",
        d.distribution_month AS "DistributionMonth",
        p.property_name AS "PropertyName",
        p.city AS "City",
        i.fractions_owned AS "FractionsOwned"
      FROM investor_distributions id
      JOIN distributions d ON id.distribution_id = d.distribution_id
      JOIN investments i ON id.investment_id = i.investment_id
      JOIN properties p ON d.property_id = p.property_id
      WHERE i.user_id = $1
      ORDER BY id.distribution_date DESC
      LIMIT 24`,
      [userId]
    );

    res.json({ success: true, data: distributions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const users = await q(
      `SELECT
        user_id AS "UserID",
        email AS "Email",
        first_name AS "FirstName",
        last_name AS "LastName",
        country_code AS "CountryCode",
        accreditation_status AS "AccreditationStatus",
        kyc_status AS "KYCStatus",
        COALESCE(role, 'user') AS "Role",
        created_at AS "CreatedAt"
      FROM users
      WHERE is_deleted = false
      ORDER BY created_at DESC
      LIMIT 100`
    );

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/investment-intents', async (req, res) => {
  try {
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    const propertyId = parseInt(req.body.propertyId);
    const amount = Number(req.body.amount);
    const currency = (req.body.currency || 'USD').toUpperCase();
    const bodyUserId = parseInt(req.body.userId);

    if (bodyUserId && bodyUserId !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (!propertyId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'userId, propertyId and amount are required' });
    }

    await verifyUserAndProperty(authenticatedUserId, propertyId);

    const referenceCode = generateTransferReference();
    const intentDescription = {
      type: 'InvestmentIntent',
      referenceCode,
      workflowStatus: 'AwaitingTransfer',
      proofStatus: 'NotSubmitted',
      amount,
      currency,
      createdAt: new Date().toISOString(),
      transferInstructions: {
        beneficiaryName: process.env.BANK_BENEFICIARY_NAME || 'InReal Client Funds',
        bankName: process.env.BANK_NAME || 'Demo Escrow Bank',
        iban: process.env.BANK_IBAN || 'TH00 0000 0000 0000 0000',
        swift: process.env.BANK_SWIFT || 'DEMOTHBK',
        requiredReference: referenceCode,
      },
    };

    const created = await q(
      `INSERT INTO transactions (
        user_id, transaction_type, amount, currency, related_property_id,
        description, status, transaction_date, created_at
      ) VALUES ($1, 'InvestmentIntent', $2, $3, $4, $5::jsonb, 'Pending', NOW(), NOW())
      RETURNING transaction_id AS "TransactionID"`,
      [authenticatedUserId, amount, currency, propertyId, JSON.stringify(intentDescription)]
    );

    res.status(201).json({
      success: true,
      data: {
        transactionId: created[0].TransactionID,
        referenceCode,
        amount,
        currency,
        status: 'Pending',
        workflowStatus: 'AwaitingTransfer',
        transferInstructions: intentDescription.transferInstructions,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/investment-intents/:reference/proof', async (req, res) => {
  try {
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    const { reference } = req.params;
    const { proofBase64, fileName, mimeType = 'application/octet-stream' } = req.body;

    if (!proofBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'proofBase64 and fileName are required' });
    }

    const txRows = await q(
      `SELECT transaction_id, user_id, description, status
       FROM transactions
       WHERE transaction_type = 'InvestmentIntent'
       ORDER BY created_at DESC
       LIMIT 300`
    );

    const target = txRows.find((row) => parseDescription(row.description).referenceCode === reference);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Investment intent not found for reference' });
    }

    if (target.user_id !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await ensureUploadDirs();
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absolutePath = path.join(proofsDir, safeFileName);
    const payload = proofBase64.includes(',') ? proofBase64.split(',')[1] : proofBase64;
    await fs.writeFile(absolutePath, Buffer.from(payload, 'base64'));

    const parsed = parseDescription(target.description);
    parsed.proofStatus = 'Submitted';
    parsed.workflowStatus = 'PendingOpsReview';
    parsed.proof = {
      fileName: safeFileName,
      originalFileName: fileName,
      mimeType,
      uploadedAt: new Date().toISOString(),
      downloadPath: `/api/investment-intents/${reference}/proof`,
    };

    await q(
      `UPDATE transactions
       SET description = $1::jsonb,
           status = 'Pending'
       WHERE transaction_id = $2`,
      [JSON.stringify(parsed), target.transaction_id]
    );

    res.json({
      success: true,
      data: {
        referenceCode: reference,
        proofStatus: 'Submitted',
        workflowStatus: 'PendingOpsReview',
        proofPath: parsed.proof.downloadPath,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/investment-intents/:reference/proof', async (req, res) => {
  try {
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    const { reference } = req.params;
    const txRows = await q(
      `SELECT transaction_id, user_id, description
       FROM transactions
       WHERE transaction_type = 'InvestmentIntent'
       ORDER BY created_at DESC
       LIMIT 300`
    );

    const target = txRows.find((row) => parseDescription(row.description).referenceCode === reference);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Investment intent not found for reference' });
    }

    if (target.user_id !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const parsed = parseDescription(target.description);
    const proof = parsed.proof;
    if (!proof?.fileName) {
      return res.status(404).json({ success: false, error: 'Proof file not found' });
    }

    const absolutePath = path.join(proofsDir, proof.fileName);
    await fs.access(absolutePath);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.download(absolutePath, proof.originalFileName || proof.fileName);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'Proof file not found' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/user/:userId/intents', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    if (authenticatedUserId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const rows = await q(
      `SELECT
        t.transaction_id,
        t.amount,
        t.currency,
        t.related_property_id,
        t.description,
        t.status,
        t.transaction_date,
        p.property_name,
        p.city,
        p.country
      FROM transactions t
      LEFT JOIN properties p ON t.related_property_id = p.property_id
      WHERE t.user_id = $1
        AND t.transaction_type = 'InvestmentIntent'
      ORDER BY t.created_at DESC
      LIMIT 100`,
      [userId]
    );

    const intents = rows.map((row) => {
      const d = parseDescription(row.description);
      return {
        transactionId: row.transaction_id,
        referenceCode: d.referenceCode,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        workflowStatus: d.workflowStatus || 'Unknown',
        proofStatus: d.proofStatus || 'Unknown',
        property: {
          propertyId: row.related_property_id,
          name: row.property_name,
          city: row.city,
          country: row.country,
        },
        proof: d.proof || null,
        createdAt: row.transaction_date,
      };
    });

    res.json({ success: true, data: intents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ops/investment-intents', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const rows = await q(
      `SELECT
        t.transaction_id,
        t.user_id,
        t.amount,
        t.currency,
        t.related_property_id,
        t.description,
        t.status,
        t.transaction_date,
        u.email,
        u.first_name,
        u.last_name,
        p.property_name
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN properties p ON t.related_property_id = p.property_id
      WHERE t.transaction_type = 'InvestmentIntent'
      ORDER BY t.created_at DESC
      LIMIT 200`
    );

    const queue = rows
      .map((row) => ({ row, description: parseDescription(row.description) }))
      .filter((entry) => ['PendingOpsReview', 'AwaitingTransfer', 'Approved', 'Rejected'].includes(entry.description.workflowStatus || ''))
      .map((entry) => ({
        transactionId: entry.row.transaction_id,
        referenceCode: entry.description.referenceCode,
        user: {
          userId: entry.row.user_id,
          email: entry.row.email,
          name: `${entry.row.first_name || ''} ${entry.row.last_name || ''}`.trim(),
        },
        propertyName: entry.row.property_name,
        amount: entry.row.amount,
        currency: entry.row.currency,
        workflowStatus: entry.description.workflowStatus,
        proofStatus: entry.description.proofStatus,
        proof: entry.description.proof || null,
        status: entry.row.status,
        createdAt: entry.row.transaction_date,
        reviewNotes: entry.description.reviewNotes || null,
      }));

    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ops/investment-intents/:reference/review', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const { reference } = req.params;
    const { action, reviewerName, notes = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }
    if (!reviewerName) {
      return res.status(400).json({ success: false, error: 'reviewerName is required' });
    }

    const rows = await q(
      `SELECT transaction_id, description
       FROM transactions
       WHERE transaction_type = 'InvestmentIntent'
       ORDER BY created_at DESC
       LIMIT 300`
    );

    const target = rows.find((row) => parseDescription(row.description).referenceCode === reference);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Investment intent not found for reference' });
    }

    const parsed = parseDescription(target.description);
    parsed.workflowStatus = action === 'approve' ? 'Approved' : 'Rejected';
    parsed.proofStatus = parsed.proofStatus || 'Submitted';
    parsed.reviewedAt = new Date().toISOString();
    parsed.reviewedBy = reviewerName;
    parsed.reviewNotes = notes;

    const txStatus = action === 'approve' ? 'Completed' : 'Failed';

    await q(
      `UPDATE transactions
       SET description = $1::jsonb,
           status = $2
       WHERE transaction_id = $3`,
      [JSON.stringify(parsed), txStatus, target.transaction_id]
    );

    res.json({
      success: true,
      data: {
        referenceCode: reference,
        workflowStatus: parsed.workflowStatus,
        transactionStatus: txStatus,
        reviewedBy: reviewerName,
        reviewedAt: parsed.reviewedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

async function startServer() {
  try {
    await q('SELECT 1');
    await ensureUploadDirs();
    await ensureAuthColumns();
    await bootstrapAdminUsers();

    const server = app.listen(PORT, () => {
      console.log(`\nInReal API Server running on http://localhost:${PORT}`);
      console.log(`Health check: GET http://localhost:${PORT}/api/health\n`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Reusing the existing backend and continuing.`);
        process.exit(0);
      }

      throw error;
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

startServer();
