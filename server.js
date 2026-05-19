/**
 * InReal Backend API Server
 * Connects React frontend to SQL Server database
 * 
 * Run: node server.js
 * Base URL: http://localhost:5000
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sql from 'mssql';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, 'uploads');
const proofsDir = path.join(uploadsRoot, 'proofs');

function generateTransferReference() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `INR-${datePart}-${shortId}`;
}

function parseDescription(description) {
  if (!description) return {};
  try {
    return JSON.parse(description);
  } catch {
    return { rawDescription: description };
  }
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsRoot));

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'InReal_Demo',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || ''
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableKeepAlive: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

// Global connection pool
let pool = null;

/**
 * Initialize database connection pool
 */
async function initializePool() {
  try {
    if (!pool) {
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('✓ Database connection pool initialized');
    }
    return pool;
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    throw error;
  }
}

/**
 * Execute a query
 */
async function queryDatabase(query, params = {}) {
  try {
    const request = new sql.Request(pool);
    
    // Add parameters to request
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

/**
 * Execute a stored procedure
 */
async function executeStoredProcedure(procedureName, params = {}) {
  try {
    const request = new sql.Request(pool);
    
    // Add parameters
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (error) {
    console.error('Procedure error:', error.message);
    throw error;
  }
}

async function ensureUploadDirs() {
  await fs.mkdir(proofsDir, { recursive: true });
}

async function verifyUserAndProperty(userId, propertyId) {
  const users = await queryDatabase(
    'SELECT UserID, IdentityVerified, KYCStatus, IsActive, IsDeleted FROM Users WHERE UserID = @userId',
    { userId }
  );
  if (users.length === 0 || !users[0].IsActive || users[0].IsDeleted) {
    throw new Error('User not found or inactive');
  }
  if (!users[0].IdentityVerified || users[0].KYCStatus !== 'Approved') {
    throw new Error('User is not KYC/identity approved');
  }

  const properties = await queryDatabase(
    'SELECT PropertyID, IsActive, IsDeleted, Status FROM Properties WHERE PropertyID = @propertyId',
    { propertyId }
  );
  if (properties.length === 0 || !properties[0].IsActive || properties[0].IsDeleted) {
    throw new Error('Property not found or inactive');
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT 1 as status');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/properties
 * Fetch all active properties
 */
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await queryDatabase(`
      SELECT TOP 100
        PropertyID,
        PropertyName,
        Address,
        City,
        Country,
        PropertyType,
        Bedrooms,
        Bathrooms,
        SquareMeter,
        PropertyValue,
        FractionPrice,
        MonthlyRentalIncome,
        ProjectedAnnualYield,
        CurrentOccupancyRate,
        Status,
        FractionsSold,
        TotalFractions,
        PropertyDescription,
        ImageURL
      FROM Properties
      WHERE IsActive = 1 AND IsDeleted = 0
      ORDER BY PropertyName
    `);
    
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id
 * Fetch single property details
 */
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const properties = await queryDatabase(`
      SELECT *
      FROM Properties
      WHERE PropertyID = @id AND IsActive = 1 AND IsDeleted = 0
    `, { id: parseInt(id) });
    
    if (properties.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, data: properties[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user by email
 * Body: { email: string }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    const users = await queryDatabase(`
      SELECT
        UserID,
        Email,
        FirstName,
        LastName,
        CountryCode,
        AccreditationStatus,
        KYCStatus,
        IdentityVerified,
        BankAccountLinked,
        TotalInvested,
        PortfolioValue,
        TotalDistributions,
        CreatedAt
      FROM Users
      WHERE Email = @email AND IsActive = 1 AND IsDeleted = 0
    `, { email });
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const user = users[0];
    
    // In production, you would check password here
    // For demo, we accept any verified email
    if (!user.IdentityVerified) {
      return res.status(403).json({ success: false, error: 'Identity not verified' });
    }
    
    res.json({ 
      success: true, 
      data: user,
      token: `demo-token-${user.UserID}` // Mock token for demo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/signup
 * Create a new user account
 * Body: { firstName: string, lastName: string, email: string, phoneCode: string, phone: string, password: string, country: string }
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneCode, phone, countryCode } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email || !phoneCode || !phone || !countryCode) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Check if email already exists
    const existingUsers = await queryDatabase(`
      SELECT UserID FROM Users WHERE Email = @email
    `, { email });

    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Combine phone code and number
    const fullPhoneNumber = `${phoneCode} ${phone}`;

    // Create new user in database
    const result = await queryDatabase(`
      INSERT INTO Users (
        Email,
        FirstName,
        LastName,
        CountryCode,
        PhoneNumber,
        AccreditationStatus,
        KYCStatus,
        IdentityVerified,
        BankAccountLinked,
        TotalInvested,
        PortfolioValue,
        TotalDistributions,
        IsActive,
        IsDeleted,
        CreatedAt
      ) VALUES (
        @email,
        @firstName,
        @lastName,
        @countryCode,
        @phoneNumber,
        'Verified',
        'Approved',
        1,
        1,
        0,
        0,
        0,
        1,
        0,
        GETUTCDATE()
      );
      SELECT SCOPE_IDENTITY() as UserID;
    `, { email, firstName, lastName, countryCode, phoneNumber: fullPhoneNumber });

    if (!result || result.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to create user' });
    }

    const newUserId = result[0].UserID;

    // Fetch the created user
    const newUsers = await queryDatabase(`
      SELECT
        UserID,
        Email,
        FirstName,
        LastName,
        CountryCode,
        AccreditationStatus,
        KYCStatus,
        IdentityVerified,
        BankAccountLinked,
        TotalInvested,
        PortfolioValue,
        TotalDistributions,
        CreatedAt
      FROM Users
      WHERE UserID = @userId
    `, { userId: newUserId });

    if (newUsers.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to fetch created user' });
    }

    res.json({
      success: true,
      data: newUsers[0],
      message: 'Account created successfully. Please verify your identity to start investing.',
      token: `demo-token-${newUserId}`
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/user/:userId/portfolio
 * Fetch user's investment portfolio
 */
app.get('/api/user/:userId/portfolio', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user portfolio summary
    const summary = await queryDatabase(`
      SELECT *
      FROM UserPortfolioSummary
      WHERE UserID = @userId
    `, { userId: parseInt(userId) });
    
    if (summary.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get user's investments with property details
    const investments = await queryDatabase(`
      SELECT
        i.InvestmentID,
        i.PropertyID,
        i.FractionsOwned,
        i.InvestmentAmount,
        i.DistributionEarned,
        i.InvestmentDate,
        i.Status,
        p.PropertyName,
        p.City,
        p.Country,
        p.ProjectedAnnualYield,
        p.MonthlyRentalIncome,
        p.PropertyValue
      FROM Investments i
      JOIN Properties p ON i.PropertyID = p.PropertyID
      WHERE i.UserID = @userId AND i.Status = 'Active' AND i.IsDeleted = 0
      ORDER BY i.InvestmentDate DESC
    `, { userId: parseInt(userId) });
    
    res.json({ 
      success: true, 
      data: {
        summary: summary[0],
        investments: investments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/user/:userId/distributions
 * Fetch user's distribution history
 */
app.get('/api/user/:userId/distributions', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const distributions = await queryDatabase(`
      SELECT TOP 24
        id.InvestorDistributionID,
        id.AmountReceived,
        id.DistributionDate,
        id.Status,
        d.DistributionMonth,
        p.PropertyName,
        p.City,
        i.FractionsOwned
      FROM InvestorDistributions id
      JOIN Distributions d ON id.DistributionID = d.DistributionID
      JOIN Investments i ON id.InvestmentID = i.InvestmentID
      JOIN Properties p ON d.PropertyID = p.PropertyID
      WHERE i.UserID = @userId
      ORDER BY id.DistributionDate DESC
    `, { userId: parseInt(userId) });
    
    res.json({ success: true, data: distributions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/stats
 * Fetch dashboard statistics
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await executeStoredProcedure('sp_GetDashboardStats');
    
    if (stats.length === 0) {
      return res.status(404).json({ success: false, error: 'No stats available' });
    }
    
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/top-investors
 * Fetch top 10 investors
 */
app.get('/api/dashboard/top-investors', async (req, res) => {
  try {
    const topN = req.query.limit || 10;
    const investors = await executeStoredProcedure('sp_GetTopInvestors', { TopN: parseInt(topN) });
    
    res.json({ success: true, data: investors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/property-metrics
 * Fetch property performance metrics
 */
app.get('/api/dashboard/property-metrics', async (req, res) => {
  try {
    const propertyId = req.query.propertyId;
    
    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'propertyId is required' });
    }
    
    const metrics = await executeStoredProcedure('sp_GetPropertyMetrics', { PropertyID: parseInt(propertyId) });
    
    if (metrics.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, data: metrics[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users
 * Fetch all users (for admin demo)
 */
app.get('/api/users', async (req, res) => {
  try {
    const users = await queryDatabase(`
      SELECT TOP 100
        UserID,
        Email,
        FirstName,
        LastName,
        CountryCode,
        AccreditationStatus,
        KYCStatus,
        TotalInvested,
        TotalDistributions,
        CreatedAt
      FROM Users
      WHERE IsDeleted = 0
      ORDER BY CreatedAt DESC
    `);
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/investment-intents
 * Create an intent and return transfer instructions
 * Body: { userId, propertyId, amount, currency? }
 */
app.post('/api/investment-intents', async (req, res) => {
  try {
    const userId = parseInt(req.body.userId);
    const propertyId = parseInt(req.body.propertyId);
    const amount = Number(req.body.amount);
    const currency = (req.body.currency || 'USD').toUpperCase();

    if (!userId || !propertyId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'userId, propertyId and amount are required' });
    }

    await verifyUserAndProperty(userId, propertyId);

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
        requiredReference: referenceCode
      }
    };

    const created = await queryDatabase(
      `
      INSERT INTO Transactions (
        UserID,
        TransactionType,
        Amount,
        Currency,
        RelatedPropertyID,
        Description,
        Status,
        TransactionDate,
        CreatedAt
      )
      VALUES (
        @userId,
        'InvestmentIntent',
        @amount,
        @currency,
        @propertyId,
        @description,
        'Pending',
        GETUTCDATE(),
        GETUTCDATE()
      );
      SELECT SCOPE_IDENTITY() AS TransactionID;
      `,
      {
        userId,
        amount,
        currency,
        propertyId,
        description: JSON.stringify(intentDescription)
      }
    );

    const transactionId = created?.[0]?.TransactionID;

    res.status(201).json({
      success: true,
      data: {
        transactionId,
        referenceCode,
        amount,
        currency,
        status: 'Pending',
        workflowStatus: 'AwaitingTransfer',
        transferInstructions: intentDescription.transferInstructions
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/investment-intents/:reference/proof
 * Upload transfer proof as base64 payload (demo-safe fallback without multipart dependency)
 * Body: { proofBase64, fileName, mimeType? }
 */
app.post('/api/investment-intents/:reference/proof', async (req, res) => {
  try {
    const { reference } = req.params;
    const { proofBase64, fileName, mimeType = 'application/octet-stream' } = req.body;

    if (!proofBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'proofBase64 and fileName are required' });
    }

    const txRows = await queryDatabase(
      `
      SELECT TOP 1 TransactionID, UserID, RelatedPropertyID, Description, Status
      FROM Transactions
      WHERE TransactionType = 'InvestmentIntent'
      ORDER BY CreatedAt DESC
      `
    );

    const target = txRows.find((row) => parseDescription(row.Description).referenceCode === reference);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Investment intent not found for reference' });
    }

    await ensureUploadDirs();
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absolutePath = path.join(proofsDir, safeFileName);

    const payload = proofBase64.includes(',') ? proofBase64.split(',')[1] : proofBase64;
    await fs.writeFile(absolutePath, Buffer.from(payload, 'base64'));

    const parsed = parseDescription(target.Description);
    parsed.proofStatus = 'Submitted';
    parsed.workflowStatus = 'PendingOpsReview';
    parsed.proof = {
      fileName: safeFileName,
      originalFileName: fileName,
      mimeType,
      uploadedAt: new Date().toISOString(),
      publicPath: `/uploads/proofs/${safeFileName}`
    };

    await queryDatabase(
      `
      UPDATE Transactions
      SET Description = @description,
          Status = 'Pending'
      WHERE TransactionID = @transactionId
      `,
      {
        transactionId: target.TransactionID,
        description: JSON.stringify(parsed)
      }
    );

    res.json({
      success: true,
      data: {
        referenceCode: reference,
        proofStatus: 'Submitted',
        workflowStatus: 'PendingOpsReview',
        proofPath: parsed.proof.publicPath
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/user/:userId/intents
 * List user investment intents
 */
app.get('/api/user/:userId/intents', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const rows = await queryDatabase(
      `
      SELECT TOP 100
        t.TransactionID,
        t.Amount,
        t.Currency,
        t.RelatedPropertyID,
        t.Description,
        t.Status,
        t.TransactionDate,
        p.PropertyName,
        p.City,
        p.Country
      FROM Transactions t
      LEFT JOIN Properties p ON t.RelatedPropertyID = p.PropertyID
      WHERE t.UserID = @userId
        AND t.TransactionType = 'InvestmentIntent'
      ORDER BY t.CreatedAt DESC
      `,
      { userId }
    );

    const intents = rows.map((row) => {
      const d = parseDescription(row.Description);
      return {
        transactionId: row.TransactionID,
        referenceCode: d.referenceCode,
        amount: row.Amount,
        currency: row.Currency,
        status: row.Status,
        workflowStatus: d.workflowStatus || 'Unknown',
        proofStatus: d.proofStatus || 'Unknown',
        property: {
          propertyId: row.RelatedPropertyID,
          name: row.PropertyName,
          city: row.City,
          country: row.Country
        },
        proof: d.proof || null,
        createdAt: row.TransactionDate
      };
    });

    res.json({ success: true, data: intents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ops/investment-intents
 * Ops queue for manual verification
 */
app.get('/api/ops/investment-intents', async (req, res) => {
  try {
    const rows = await queryDatabase(
      `
      SELECT TOP 200
        t.TransactionID,
        t.UserID,
        t.Amount,
        t.Currency,
        t.RelatedPropertyID,
        t.Description,
        t.Status,
        t.TransactionDate,
        u.Email,
        u.FirstName,
        u.LastName,
        p.PropertyName
      FROM Transactions t
      JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN Properties p ON t.RelatedPropertyID = p.PropertyID
      WHERE t.TransactionType = 'InvestmentIntent'
      ORDER BY t.CreatedAt DESC
      `
    );

    const queue = rows
      .map((row) => ({ row, description: parseDescription(row.Description) }))
      .filter((entry) => ['PendingOpsReview', 'AwaitingTransfer', 'Approved', 'Rejected'].includes(entry.description.workflowStatus || ''))
      .map((entry) => ({
        transactionId: entry.row.TransactionID,
        referenceCode: entry.description.referenceCode,
        user: {
          userId: entry.row.UserID,
          email: entry.row.Email,
          name: `${entry.row.FirstName || ''} ${entry.row.LastName || ''}`.trim()
        },
        propertyName: entry.row.PropertyName,
        amount: entry.row.Amount,
        currency: entry.row.Currency,
        workflowStatus: entry.description.workflowStatus,
        proofStatus: entry.description.proofStatus,
        proof: entry.description.proof || null,
        status: entry.row.Status,
        createdAt: entry.row.TransactionDate,
        reviewNotes: entry.description.reviewNotes || null
      }));

    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ops/investment-intents/:reference/review
 * Body: { action: 'approve' | 'reject', reviewerName, notes? }
 */
app.post('/api/ops/investment-intents/:reference/review', async (req, res) => {
  try {
    const { reference } = req.params;
    const { action, reviewerName, notes = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }
    if (!reviewerName) {
      return res.status(400).json({ success: false, error: 'reviewerName is required' });
    }

    const rows = await queryDatabase(
      `
      SELECT TOP 100 TransactionID, Description
      FROM Transactions
      WHERE TransactionType = 'InvestmentIntent'
      ORDER BY CreatedAt DESC
      `
    );

    const target = rows.find((row) => parseDescription(row.Description).referenceCode === reference);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Investment intent not found for reference' });
    }

    const parsed = parseDescription(target.Description);
    parsed.workflowStatus = action === 'approve' ? 'Approved' : 'Rejected';
    parsed.proofStatus = parsed.proofStatus || 'Submitted';
    parsed.reviewedAt = new Date().toISOString();
    parsed.reviewedBy = reviewerName;
    parsed.reviewNotes = notes;

    const txStatus = action === 'approve' ? 'Completed' : 'Failed';

    await queryDatabase(
      `
      UPDATE Transactions
      SET Description = @description,
          Status = @status
      WHERE TransactionID = @transactionId
      `,
      {
        transactionId: target.TransactionID,
        description: JSON.stringify(parsed),
        status: txStatus
      }
    );

    res.json({
      success: true,
      data: {
        referenceCode: reference,
        workflowStatus: parsed.workflowStatus,
        transactionStatus: txStatus,
        reviewedBy: reviewerName,
        reviewedAt: parsed.reviewedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize database connection
    await initializePool();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 InReal API Server running on http://localhost:${PORT}`);
      console.log(`📊 Frontend: http://localhost:3000`);
      console.log(`🏥 Health check: GET http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹  Shutting down...');
  if (pool) {
    await pool.close();
    console.log('✓ Database connection closed');
  }
  process.exit(0);
});

// Start the server
startServer();
