/**
 * InReal Backend API Server (PostgreSQL / Supabase)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID, pbkdf2Sync, randomBytes, timingSafeEqual, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { isMailConfigured, sendAccountSetupEmail, sendPasswordResetEmail } from './mailer.js';

dotenv.config();

const app = express();

// Render (and most PaaS hosts) sit the app behind a reverse proxy. This setting
// affects a few Express conveniences (e.g. req.secure, req.protocol) that this
// app doesn't currently rely on for anything security-sensitive — the rate
// limiters below intentionally do NOT depend on it (see getClientIp below and
// the comment next to the limiter definitions for why). Left as `true` for
// general correctness/compatibility, not as a security control.
app.set('trust proxy', true);
const PORT = process.env.API_PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, 'uploads');
const proofsDir = path.join(uploadsRoot, 'proofs');
const userDocsDir = path.join(uploadsRoot, 'user-docs');

if (!process.env.DATABASE_URL) {
  console.error(
    'Missing DATABASE_URL. Set DATABASE_URL to your Postgres connection string (e.g. Supabase) before starting server.js.'
  );
  process.exit(1);
}

// JWT_SECRET signs session tokens. It must be a long random value kept only on the
// server (Render env var) — never committed, never sent to the client.
// Generate one with: openssl rand -hex 32
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'Missing or weak JWT_SECRET. Set JWT_SECRET to a long random string (32+ chars, e.g. `openssl rand -hex 32`) before starting server.js.'
  );
  process.exit(1);
}
const SESSION_TOKEN_TTL = process.env.SESSION_TOKEN_TTL || '12h';

// Supabase Storage holds user documents (KYC/Finance/Property uploads). This
// replaced local-disk storage because Render's filesystem is ephemeral —
// anything written to local disk is silently lost on the next deploy or
// restart, which is not acceptable for documents subject to the compliance
// manual's 7-year retention requirement. Required in every environment (same
// fail-fast bar as JWT_SECRET) so this can't quietly regress back to disk.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || 'user-documents';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Both are required to store user documents ' +
    'in Supabase Storage instead of local disk. Set them (Project Settings > API in the Supabase ' +
    'dashboard — use the service_role key, never the anon key, and never expose it to any frontend) ' +
    'before starting server.js.'
  );
  process.exit(1);
}
// The service_role key bypasses Row Level Security and must only ever exist
// here, server-side. It is never sent to src/ or ops-admin-portal/.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman, Render health checks)
    if (!origin) return callback(null, true);

    const defaults = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];

    // Production origins come from FRONTEND_URL env var (comma-separated).
    // On Render, set this to: https://in-real-demo.vercel.app,https://inreal-ops.vercel.app
    // Do NOT use a wildcard like *.vercel.app — that trusts any free Vercel deployment.
    const fromEnv = (process.env.FRONTEND_URL || '')
      .split(',')
      .map(s => s.trim().replace(/\/$/, ''))
      .filter(Boolean);

    const allowedOrigins = [...defaults, ...fromEnv];

    if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    // Origin not in allowlist — reject silently. Using callback(null, false) rather
    // than callback(new Error(...)) so the server returns no ACAO header without
    // throwing a 500, which is the correct browser-facing CORS rejection behaviour.
    return callback(null, false);
  },
  credentials: true,
}));
// Base64 encoding inflates a file's size by roughly 33% (3 bytes become 4
// base64 characters), plus a little more for the surrounding JSON. Our real
// content-size cap is 8MB (MAX_FILE_BYTES, checked on the DECODED file below)
// — but if this body-parser limit were also set to 8MB, any file larger than
// ~6MB actual size would already exceed the limit as base64 text, before our
// own size check ever ran. That produced a confusing generic 500 instead of
// the clear "File too large" message, and — critically — meant an ordinary
// phone camera photo (commonly 6-12MB) could fail even though it looked like
// it should fit under "8MB max." Sized generously above the true 8MB content
// cap's base64 inflation (8 * 4/3 ≈ 10.7MB) so the body parser never becomes
// the bottleneck; MAX_FILE_BYTES remains the real, user-facing size limit.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ────────────────────────────────────────────────────────────

// Both limiters below identify a client by IP for coarse abuse protection
// (NOT the primary security boundary — see the login lockout further down,
// which keys by account email and doesn't depend on any of this).
//
// We deliberately do NOT rely on Express's `req.ip` / numeric `trust proxy`
// hop-counting for this. In testing against this app's actual Render
// deployment, the number of hops in X-Forwarded-For was not constant across
// requests, which meant any fixed hop count sometimes resolved to the wrong
// (and inconsistent) address, silently defeating the rate limiter — it never
// threw an error, it just never accumulated a stable key.
//
// Instead we read X-Forwarded-For ourselves and always take the left-most
// address, which is the original client by convention (each hop appends its
// own address to the right as the request passes through). This is
// independent of how many hops Render's infrastructure adds on any given
// request.
//
// Residual risk (documented, not hidden): this is only trustworthy if the
// left-most entry was actually placed there by the real client's first
// contact point and can't be overwritten by something further upstream that
// we don't control. On Render specifically, the app is not reachable except
// through Render's own edge, so this holds — but this is exactly the
// assumption to re-verify if the hosting setup ever changes (e.g. adding a
// CDN in front of Render, or exposing the service directly).
//
// Because we're extracting the IP ourselves rather than asking
// express-rate-limit to derive it from req.ip, we also disable its built-in
// trust-proxy validation below (`validate: { trustProxy: false, xForwardedForHeader: false }`)
// — not to silence a real problem, but because that validation is specifically
// checking Express's `req.ip` derivation, which we're intentionally not using.
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  let ip;
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    ip = first || undefined;
  }
  if (!ip) {
    ip = req.socket?.remoteAddress || req.ip || 'unknown';
  }
  // Normalize IPv6 addresses to a /56 subnet before using them as a rate-limit
  // key. Without this, a client can request a new address from within their
  // own ISP-assigned IPv6 block (trivially easy — many home connections have
  // a whole /64 or /56 to themselves) and get a fresh rate-limit bucket on
  // every request, defeating the limiter entirely. IPv4 addresses pass
  // through unchanged.
  return ipKeyGenerator(ip);
}

// General API limiter — protects against scraping and DoS.
// 200 requests per 15 minutes per client IP. Generous enough not to affect real users.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { success: false, error: 'Too many requests — please try again later.' },
});

app.use('/api', generalLimiter);

// ── Declined-account lockout ─────────────────────────────────────────────────
// Product owner decision, 28 July 2026: a declined account is locked, not left
// dormant. It authenticates only far enough to show the decline notice, with no
// further navigation.
//
// This is enforced HERE, server-side, rather than by hiding navigation in the
// investor site. A declined user still holds a perfectly valid, unexpired JWT —
// nothing about being declined invalidates it — so without this middleware that
// token would keep opening /api/user/documents, portfolio data and everything
// else, no matter what the UI chose to render. Hidden navigation is not an
// access control.
//
// The allow-list is deliberately tiny: only what the decline screen itself
// needs. /api/auth/me supplies the KYC status and decline reason the notice is
// built from; login must keep working so they can reach that notice at all;
// logout must keep working so they can leave.
const DECLINED_ACCOUNT_ALLOWED_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]);

app.use('/api', async (req, res, next) => {
  try {
    // req.path here is relative to the '/api' mount point, so rebuild the full
    // path before comparing against the allow-list above.
    const fullPath = `/api${req.path}`;
    if (DECLINED_ACCOUNT_ALLOWED_PATHS.has(fullPath)) return next();

    // Unauthenticated requests are none of this middleware's business — they
    // are rejected (or not) by each route's own auth check. Skipping them also
    // keeps the extra query off every public request.
    const userId = getAuthenticatedUserId(req);
    if (!userId) return next();

    const rows = await q('SELECT kyc_status FROM users WHERE user_id = $1', [userId]);
    if (rows[0]?.kyc_status === 'Declined') {
      return res.status(403).json({
        success: false,
        error: 'This account is closed. Please see the notice on your account for details.',
        code: 'ACCOUNT_DECLINED',
      });
    }
    return next();
  } catch (error) {
    // A failure to establish whether the account is declined must not fall
    // through as "not declined" — that would turn a database blip into an
    // access-control bypass. Fail closed.
    console.error('Declined-account check failed:', error);
    return res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
  }
});

// Password-reset-request limiter — separate from the login lockout above.
// There's no "account" to lock yet at this point (we haven't confirmed the
// email belongs to anyone), so this limits by IP: 5 reset requests per
// 15 minutes is enough for a real user who mistypes an email a couple of
// times, and blunts an attacker trying to enumerate accounts or spam a
// victim's inbox/concierge channel with reset requests.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { success: false, error: 'Too many requests — please try again later.' },
});

// Reset-LINK pre-flight limiter, for /password-reset/validate below.
//
// Deliberately a separate budget from passwordResetLimiter above. That one
// rations how many reset EMAILS an IP can cause to be sent — a spam and
// enumeration concern. This one rations reads of whether a link is still good,
// where the only real abuse is grinding token guesses. Sharing the /request
// budget would mean that opening your own reset link and reloading it a couple
// of times could leave you unable to ask for a new one, which is precisely the
// situation someone clicking a stale link is already in.
//
// 20 per 15 minutes sits far above any legitimate use (click, maybe reload,
// maybe reopen the email) and far below anything useful against a 32-byte
// random token.
const passwordResetValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { success: false, error: 'Too many requests — please try again later.' },
});

// Password-CHANGE limiter (the logged-in "change my password" endpoint), which
// is a different threat from both of the above and needs its own budget.
//
// The attacker this exists for: someone holding a stolen session token who
// wants to make their access permanent by changing the password and locking
// the real owner out. The only thing standing in their way is having to supply
// the CURRENT password, so that field is guessable-in-principle and therefore
// needs a ceiling.
//
// Keyed by authenticated user id rather than IP, for the same reason the login
// lockout is per-account: two investors behind one office NAT should not be
// able to exhaust each other's budget. Falls back to IP only for unauthenticated
// callers, which this route rejects anyway.
//
// Deliberately NOT wired into the login lockout Map. Reusing it would mean a
// legitimate investor who mistypes their current password in Settings ten times
// gets locked out of logging in entirely — punishing a typo in one place by
// closing a different door.
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = getAuthenticatedUserId(req);
    return userId ? `user:${userId}` : getClientIp(req);
  },
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { success: false, error: 'Too many password change attempts — please try again later.' },
});

// ── Account-based login lockout ───────────────────────────────────────────────
// Tracks failed login attempts per email address (not per IP).
// This means an attacker hammering one account gets that account locked,
// while every other user — even on the same IP, network, or country — is
// completely unaffected. A correct login resets the counter immediately.
//
// Storage: in-memory Map. Resets on server restart (acceptable for Phase 1).
// Phase 2: move to a Redis-backed store for persistence across restarts.

const LOCKOUT_MAX_ATTEMPTS = 10;      // failed attempts before lockout
const LOCKOUT_WINDOW_MS   = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map(); // email → { count, lockedUntil }

function recordFailedLogin(email) {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: null };

  // Reset counter if the previous lockout window has expired
  if (entry.lockedUntil && now > entry.lockedUntil) {
    entry.count = 0;
    entry.lockedUntil = null;
  }

  entry.count += 1;

  if (entry.count >= LOCKOUT_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_WINDOW_MS;
    console.warn(`Account lockout triggered for ${key} after ${entry.count} failed attempts`);
  }

  loginAttempts.set(key, entry);
}

function resetLoginAttempts(email) {
  loginAttempts.delete(email.toLowerCase().trim());
}

function isAccountLocked(email) {
  const key = email.toLowerCase().trim();
  const entry = loginAttempts.get(key);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(key); // auto-clear expired lockout
    return false;
  }
  return true;
}

async function q(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Runs `fn` inside a single DB transaction using one dedicated client. Used wherever a
// state change (e.g. KYC decision) must be paired with its audit record atomically —
// we never want the users.kyc_status to change without the matching kyc_decisions row
// being written, or vice versa.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txQuery = async (text, params = []) => (await client.query(text, params)).rows;
    const result = await fn(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

  const summary = rows[0] || null;
  if (!summary) return null;

  // Portfolio adjustments (C.1 item 7) — ops-entered corrections, ADDED to
  // the real, investment-derived value above. Deliberately never replaces
  // or hides the underlying calculation — TotalInvested and
  // TotalDistributions above are untouched; only the final displayed
  // PortfolioValue includes the adjustment total.
  const adjustmentRows = await q(
    `SELECT COALESCE(SUM(adjustment_amount), 0) AS total FROM portfolio_adjustments WHERE user_id = $1`,
    [userId]
  );
  summary.PortfolioValue = Number(summary.PortfolioValue) + Number(adjustmentRows[0]?.total || 0);

  return summary;
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

function signSessionToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_TOKEN_TTL,
  });
}

function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    // Covers expired, malformed, or tampered tokens — all treated as unauthenticated.
    return null;
  }
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

const GENERIC_LOGIN_ERROR = 'Invalid email or password';

async function verifyLoginCredentials(email, password) {
  const users = await q(
    `SELECT
      user_id AS "UserID",
      email AS "Email",
      first_name AS "FirstName",
      last_name AS "LastName",
      phone_number AS "PhoneNumber",
      whatsapp_number AS "WhatsappNumber",
      preferred_contact_channel AS "PreferredContactChannel",
      country_code AS "CountryCode",
      country_of_residence AS "CountryOfResidence",
      nationalities AS "Nationalities",
      us_person AS "UsPerson",
      profile_completed_at AS "ProfileCompletedAt",
      kyc_decline_reason_type AS "KycDeclineReasonType",
      kyc_declined_at AS "KycDeclinedAt",
      accreditation_status AS "AccreditationStatus",
      kyc_status AS "KYCStatus",
      identity_verified AS "IdentityVerified",
      bank_account_linked AS "BankAccountLinked",
      password_hash AS "PasswordHash",
      password_salt AS "PasswordSalt",
      COALESCE(role, 'user') AS "Role",
      created_at AS "CreatedAt"
    FROM users
    WHERE LOWER(email) = $1 AND is_active = true AND is_deleted = false`,
    [email]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  // NOTE: identity_verified is intentionally NOT checked here. A user can be
  // legitimately mid-onboarding (KYC "Pending") for days under the real
  // compliance process, and should still be able to log in to see their
  // status. Investing is gated separately and correctly in
  // verifyUserAndProperty(), which checks identity_verified/kyc_status at
  // the point of creating an investment intent, not at login.

  const hasStoredPassword = Boolean(user.PasswordHash && user.PasswordSalt);

  if (!hasStoredPassword) {
    // No password hash on record — reject login unconditionally.
    // Previously this accepted 'Demo123!' as a universal fallback, which meant
    // any account created without going through the signup flow (e.g. direct DB
    // insert, seed scripts, ops-created accounts) was silently accessible with
    // a known password. That backdoor is now removed.
    // If a seed/demo account can no longer log in, re-run the seed script so it
    // stores a proper PBKDF2 hash via the normal signup or the hash utility.
    return null;
  }

  const isValid = verifyPassword(password, user.PasswordSalt, user.PasswordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

async function buildLoginResponse(user) {
  const summary = await getUserFinancialSummary(user.UserID);
  await q('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1', [user.UserID]);

  return {
    success: true,
    data: {
      ...sanitizeUserRecord(user),
      TotalInvested: summary?.TotalInvested ?? 0,
      PortfolioValue: summary?.PortfolioValue ?? 0,
      TotalDistributions: summary?.TotalDistributions ?? 0,
      PropertiesOwned: summary?.PropertiesOwned ?? 0,
    },
    token: signSessionToken(user.UserID),
  };
}

async function requireAdmin(req, res) {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return null;

  const role = await getUserRole(userId);
  if (!role || role !== 'admin') {
    res.status(401).json({ success: false, error: 'Unauthorized' });
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
  // Only proof-of-payment uploads still use local disk (F11's document
  // assignment feature moved to Supabase Storage — see ensureDocumentsBucket
  // below). Proof-of-payment isn't yet migrated; that's a known follow-up,
  // not an oversight — see the tracker.
  await fs.mkdir(proofsDir, { recursive: true });
}

// Creates the private Supabase Storage bucket for user documents if it
// doesn't already exist. Idempotent — safe to call on every boot. `public:
// false` is the whole point: files are only ever reachable through a
// short-lived signed URL we generate per-request, never a public bucket URL.
async function ensureDocumentsBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Could not list Supabase Storage buckets: ${listError.message}`);
  }
  const exists = (buckets || []).some((b) => b.name === DOCUMENTS_BUCKET);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  });
  if (createError) {
    throw new Error(`Could not create Supabase Storage bucket "${DOCUMENTS_BUCKET}": ${createError.message}`);
  }
  console.log(`Created private Supabase Storage bucket "${DOCUMENTS_BUCKET}".`);
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

// Password reset tokens. A reset "link" is really just this row: a hash of a
// random token, a short expiry, and a used_at marker so it can only ever be
// consumed once. We never store the raw token — only its SHA-256 hash — so a
// database read (backup, breach, careless log) can't be turned into a working
// reset link.
async function ensurePasswordResetTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users(user_id),
      token_hash     TEXT NOT NULL,
      expires_at     TIMESTAMPTZ NOT NULL,
      used_at        TIMESTAMPTZ,
      requested_ip   TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await q(`CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash)`);
}

// Durable, queryable record of every KYC approve/decline decision. Required by the
// Compliance Manual (Section 8 "documented onboarding decision"; Section 9 record-keeping,
// 7-year retention of "all Compliance reviews, escalations and decision documentation").
// A console.log line is not a record — it doesn't survive a redeploy/restart and isn't
// queryable. This table is the actual system of record; rows are never updated or deleted
// by the app (insert-only) so the history can't be silently rewritten.
async function ensureKycDecisionsTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS kyc_decisions (
      decision_id    SERIAL PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users(user_id),
      admin_user_id  INTEGER NOT NULL REFERENCES users(user_id),
      action         VARCHAR(10) NOT NULL CHECK (action IN ('approve', 'decline')),
      reviewer_name  TEXT NOT NULL,
      notes          TEXT NOT NULL DEFAULT '',
      decided_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await q(`CREATE INDEX IF NOT EXISTS idx_kyc_decisions_user_id ON kyc_decisions(user_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_kyc_decisions_decided_at ON kyc_decisions(decided_at DESC)`);
}

// Documents an admin assigns to a specific investor (KYC / Finance / Property).
// This is the real backend for what the ops portal's upload form previously
// only faked client-side ("Document recorded (local)" — no server round-trip,
// no file actually stored, no real user reference). Rows are never hard-deleted:
// per the KYC/AML Compliance Manual's 7-year retention requirement, a superseded
// document is marked `is_superseded`, not removed — the old file and row stay in
// place alongside whatever replaces them.
// Enables fast partial-match search (the admin document form's "assign to
// user" picker) as the user base grows. A plain ILIKE '%query%' query — the
// kind needed for "match anywhere in the name/email," not just "starts
// with" — can't use a normal B-tree index because of the leading wildcard;
// without this, it gets slower in direct proportion to how many users exist.
// pg_trgm's GIN index supports arbitrary substring search efficiently. Wrapped
// in try/catch and never fails startup: at pilot scale (a handful of users)
// this genuinely doesn't matter yet, and some hosted Postgres setups restrict
// CREATE EXTENSION to a superuser — if that's the case here, the search still
// works, it just does a full sequential scan, which is fine until the user
// count is in the thousands.
async function ensureUserSearchIndex() {
  try {
    await q(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await q(`CREATE INDEX IF NOT EXISTS idx_users_search_trgm
             ON users USING GIN ((first_name || ' ' || last_name || ' ' || email) gin_trgm_ops)`);
  } catch (error) {
    console.warn('Could not create pg_trgm search index (search will still work, just unindexed):', error.message);
  }
}

async function ensureUserDocumentsTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS user_documents (
      document_id          SERIAL PRIMARY KEY,
      user_id              INTEGER NOT NULL REFERENCES users(user_id),
      category             VARCHAR(20) NOT NULL CHECK (category IN ('KYC', 'Finance', 'Property')),
      label                TEXT NOT NULL,
      file_name            TEXT NOT NULL, -- Supabase Storage object key (bucket-relative path), not a local filename
      original_file_name   TEXT NOT NULL,
      mime_type            TEXT NOT NULL,
      uploaded_by_admin_id INTEGER NOT NULL REFERENCES users(user_id),
      is_superseded        BOOLEAN NOT NULL DEFAULT false,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- NULL = a general document (not tied to one property). See
      -- database/pg/09-add-document-property-link.sql for the full reasoning.
      -- Declared here as well as in that migration so a FRESH database gets the
      -- column too — this CREATE TABLE only runs when the table doesn't exist,
      -- so a new install would otherwise never receive it.
      property_id          BIGINT REFERENCES properties(property_id),
      -- Whether the investor can see this document at all. Deliberately has NO
      -- default: see database/pg/10-add-document-visibility.sql for why a guess
      -- is the wrong shape here (one direction of a wrong guess is an
      -- irreversible disclosure, and in the SAR case an unlawful one).
      visibility           VARCHAR(20) NOT NULL
                             CHECK (visibility IN ('investor_visible', 'operator_only'))
    )
  `);
  await q(`CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_user_documents_created_at ON user_documents(created_at DESC)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_user_documents_user_property ON user_documents(user_id, property_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_user_documents_user_visibility ON user_documents(user_id, visibility)`);
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
  // CORRECTION 09 July 2026: an earlier pass mis-swapped which column gets
  // which value. The KYC-decision code (see the isApprove branch further
  // down) actually sets kyc_status = 'Approved' and accreditation_status =
  // 'Verified' — this check's original 'Approved' comparison was correct
  // all along; it was mistakenly "fixed" to 'Verified' and has been
  // reverted back here.
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
    console.error('API error:', error); res.status(500).json({ status: 'error', message: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    // Normalized the same way every account is stored (see signup and
    // admin account creation, both of which lowercase on write) — without
    // this, a browser auto-capitalizing the first letter, or a copy-pasted
    // email with different casing, would silently fail to match even though
    // the account genuinely exists.
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (isAccountLocked(email)) {
      return res.status(429).json({
        success: false,
        error: 'This account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
      });
    }

    const user = await verifyLoginCredentials(email, password);
    if (!user) {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    resetLoginAttempts(email);
    res.json(await buildLoginResponse(user));
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Password reset ────────────────────────────────────────────────────────────
// Two-step flow: request a token, then confirm with the token + new password.
// Design constraints (do not relax these when "just testing"):
//   - Never reveal whether an email exists in the system (both branches of
//     /request return the identical 200 response).
//   - Never store the raw token — only its SHA-256 hash. If the DB leaks, the
//     leaked rows are useless as reset links.
//   - Single-use: the token is marked used_at on successful confirm, and any
//     other outstanding tokens for that user are invalidated at the same time.
//   - Short expiry (30 minutes) so an intercepted-but-unused token goes stale fast.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Account-setup codes live longer than reset codes, and the difference is
// deliberate rather than an inconsistency. A reset is something you asked for
// seconds ago and are sitting in front of, so 30 minutes is generous. A setup
// code is now emailed unprompted (PO requirement #4) to someone who may be
// asleep, in another timezone, or not checking that address daily — at 30
// minutes most of them would expire unused and every one of those becomes a
// support ticket. 72 hours matches the usual shape of an invitation link.
//
// This is the only security property of the setup flow that the emailing
// change alters, so it is called out rather than buried: the token is still
// single-use, still stored only as a SHA-256 hash, and still useless without
// the mailbox it was sent to.
const SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Where to point the "set my password" link in an email.
//
// FRONTEND_URL is deliberately not used directly: it is a comma-separated CORS
// allowlist that contains BOTH portals, and its first entry happening to be
// the investor site is a coincidence rather than a guarantee. Sending an
// investor to the ops portal would be a confusing dead end at best. So there
// is a dedicated variable, falling back to the first FRONTEND_URL entry only
// so a missing variable degrades to "probably right" rather than "no link".
function getInvestorPortalUrl() {
  const explicit = (process.env.INVESTOR_PORTAL_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const firstAllowedOrigin = (process.env.FRONTEND_URL || '').split(',')[0].trim();
  return firstAllowedOrigin ? firstAllowedOrigin.replace(/\/+$/, '') : null;
}

// ── Encryption for small, recoverable secrets ────────────────────────────────
// Used for anything that must be decrypted back to its real value later —
// TOTP secrets (to check future codes against) and bank account numbers (to
// show/verify them). NOT for passwords or reset tokens, which use one-way
// hashing instead because they never need to be recovered, only compared.
// AES-256-GCM; the IV and auth tag travel alongside the ciphertext in the
// same stored value rather than needing a separate column each, and GCM's
// auth tag means a tampered ciphertext fails to decrypt rather than
// silently decrypting to garbage.
//
// Deliberately NOT a hard boot-time requirement the way SUPABASE_URL is —
// both features that use this are additive, and a missing key here
// shouldn't take down every other unrelated endpoint. Callers get a clear
// 500 instead. One key (TOTP_ENCRYPTION_KEY) covers both use cases —
// same algorithm, same risk profile, no reason to ask for a second key/env
// var to protect a second category of data.
function getEncryptionKey() {
  const keyHex = process.env.TOTP_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY is not configured correctly (must be exactly 64 hex characters / 32 bytes).'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function encryptValue(plainText) {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // standard IV size for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptValue(encryptedBase64) {
  const key = getEncryptionKey();
  const buf = Buffer.from(encryptedBase64, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// Reusable step-up check — verifies a fresh code against the user's ACTIVE
// TOTP secret. Used by /totp/disable now; this is exactly the function
// C.1 item 6's bank-detail step-up middleware will also call, so that
// flow doesn't need to reinvent TOTP verification later.
async function verifyFreshTotpCode(userId, code) {
  if (!code) return false;
  const rows = await q('SELECT secret_encrypted, is_active FROM user_totp WHERE user_id = $1', [userId]);
  if (rows.length === 0 || !rows[0].is_active) return false;
  const secret = decryptValue(rows[0].secret_encrypted);
  return authenticator.check(String(code).trim(), secret);
}

const GENERIC_RESET_REQUEST_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

// ── Timing-based enumeration protection ──────────────────────────────────────
// Enumeration protection has two halves, and this endpoint only ever had one.
//
// The identical response BODY was always here and was always deliberate. But
// the account-exists branch makes two extra round trips to a remote Postgres
// that the other branch does not — invalidate prior tokens, then insert the
// new one — at roughly 250ms each. Measured on localhost: ~750ms when the
// account exists against ~250ms when it does not, consistently. That gap is a
// reliable oracle. An attacker times the response and learns whether an
// address is registered, which is precisely what the identical body exists to
// prevent. Having the body right made the endpoint *look* solved, which is
// why this survived so long.
//
// The fix pads every response up to a floor, so the fast branch is slowed to
// match the slow one rather than the slow one being hurried.
//
// WHY A FLOOR AND NOT NON-BLOCKING WRITES. Dispatching the two writes without
// awaiting them would also close the gap, and it is what the email send on
// this same endpoint already does. It is the wrong call here: a failed token
// write would become invisible, and the investor would be told to check their
// email for a code that was never stored. A silent failure on the email is
// recoverable — the code is in the log and the admin can relay it. A silent
// failure on the write leaves nothing anywhere. Slow and correct beats fast
// and quietly broken on a security endpoint.
//
// HONEST LIMITS. This removes the systematic signal, not every possible one.
// If Postgres is slow enough that the exists-branch overruns the floor, that
// individual request still leaks. The floor is set well above the observed
// warm worst case (~830ms) to make that rare, and the 5-per-15-minute rate
// limit is what makes the residual impractical to attack statistically. This
// is a large improvement, not a mathematical guarantee — anyone tempted to
// call it constant-time should not.
//
// NOT A DOS CONCERN. Holding a request for ~1.2s is an await, not a blocked
// thread, and this endpoint allows 5 requests per 15 minutes per IP.
const RESET_REQUEST_MIN_RESPONSE_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Waits until at least `floorMs` has passed since `startedAt`. Returns
// immediately if that much time has already gone.
async function padToFloor(startedAt, floorMs) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < floorMs) {
    await sleep(floorMs - elapsed);
  }
}

app.post('/api/auth/password-reset/request', passwordResetLimiter, async (req, res) => {
  // Taken at the very top so every branch is measured from the same instant.
  const startedAt = Date.now();
  try {
    // Same normalization as login/signup — without this, a mismatched-case
    // email would silently fail to find the account and no token would ever
    // be issued, while still (correctly, deliberately) showing the same
    // generic success message either way, making the failure invisible.
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      // Deliberately NOT padded, and that is not an oversight. This fires
      // before any lookup happens, on a request that named no account, so a
      // fast reply here reveals nothing about whether any address is
      // registered. Padding it would only slow down a malformed request.
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const users = await q(
      `SELECT user_id, first_name FROM users WHERE LOWER(email) = $1 AND is_active = true AND is_deleted = false`,
      [email]
    );

    // Always respond identically whether or not the account exists — this is
    // the enumeration protection. The branching below only affects what we do
    // server-side, never what the client sees.
    if (users.length > 0) {
      const userId = users[0].user_id;
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      // Invalidate any prior unused tokens for this user so only the newest
      // request is ever valid.
      await q(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
      );
      await q(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4)`,
        [userId, tokenHash, expiresAt, getClientIp(req) || null]
      );

      // Kept even now that email exists. It is the fallback when mail is
      // unconfigured or the provider is down, and the only record of the code
      // in either case. Never returned in the API response.
      console.log(`[password-reset] token issued for user_id=${userId} (deliver via concierge): ${rawToken}`);

      // NOT awaited, and that is a security decision rather than a
      // performance one.
      //
      // This endpoint's whole contract is that a caller cannot tell whether
      // the email exists — both branches return a byte-identical 200. But an
      // awaited network call to SendGrid only ever happens on the branch
      // where the account DOES exist, and it costs a few hundred
      // milliseconds. That turns an indistinguishable response into a
      // reliably distinguishable one, and rebuilds by timing exactly the
      // enumeration oracle the identical body was written to remove.
      // Dispatching without awaiting keeps both branches doing the same
      // negligible amount of work before responding.
      //
      // The .catch is load-bearing: an unhandled rejection on a floating
      // promise takes the process down on Node. mailer.js is written not to
      // reject, so this should never fire — it is here so that a future
      // change inside the mailer cannot turn a failed email into a crashed
      // server.
      sendPasswordResetEmail({
        to: email,
        firstName: users[0].first_name,
        code: rawToken,
        portalUrl: getInvestorPortalUrl(),
        expiryMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
      }).catch((error) => console.error('[mail] password-reset send threw unexpectedly:', error));
    }

    // Both branches converge here, having taken visibly different amounts of
    // time to arrive. This is what makes them indistinguishable from outside.
    await padToFloor(startedAt, RESET_REQUEST_MIN_RESPONSE_MS);
    return res.json({ success: true, message: GENERIC_RESET_REQUEST_MESSAGE });
  } catch (error) {
    console.error('API error:', error);
    // Padded too. A DB failure is overwhelmingly likelier on the exists-branch
    // (it is the only one that writes), so an unpadded 500 would be its own
    // weaker version of the same signal.
    await padToFloor(startedAt, RESET_REQUEST_MIN_RESPONSE_MS);
    // Even on an unexpected error, don't leak internals or existence info.
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const MIN_PASSWORD_LENGTH = 10;
const COMMON_PASSWORD_BLOCKLIST = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', 'qwerty123',
  'letmein123', 'iloveyou1', 'welcome123', 'admin1234', 'changeme1',
]);

function isPasswordAcceptable(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return false;
  if (COMMON_PASSWORD_BLOCKLIST.has(password.toLowerCase())) return false;
  return true;
}

// Advisory pre-flight for the /auth?code=… links in setup and reset emails.
//
// WHAT THIS IS NOT: an authorisation check. Nothing is granted on the strength
// of it, and /password-reset/confirm below re-validates the same token against
// the same rules before it will change any password, exactly as it did before
// this endpoint existed. This only decides which SCREEN the investor lands on,
// so a link that has already been used shows a "no longer valid" notice instead
// of a form that looks usable and can only fail at submit. The standing rule
// that a URL is never itself proof of anything is unchanged.
//
// It deliberately does NOT consume the token. Reading a link must never burn
// it — a mail client that pre-fetches URLs, or an investor who reloads the
// page, would otherwise destroy a code nobody had used yet.
//
// POST rather than GET for a read-only operation, on purpose: a GET would put
// the token in the query string, and therefore in server access logs, Referer
// headers and browser history. It is already in the address bar (inherent to
// emailing a link at all) and that is enough surface without adding more.
//
// The response is one boolean. Not-found, expired and already-used all return
// the same `valid: false`, matching the GENERIC_TOKEN_ERROR rule at confirm —
// distinguishing them tells an attacker which guess landed closer to a real
// token. No user id, email or expiry timestamp comes back: the caller supplied
// a token, and a token is not proof of whose account it belongs to.
app.post('/api/auth/password-reset/validate', passwordResetValidateLimiter, async (req, res) => {
  try {
    const token = req.body.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const rows = await q(
      `SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
      [hashResetToken(token)]
    );

    // Both outcomes cost exactly one lookup and the same comparisons, so there
    // is no timing gap of the kind D.16 had to pad away on /request — that
    // endpoint's branches did genuinely different amounts of work (two writes
    // on one side, none on the other). These do not.
    const row = rows[0];
    const valid = Boolean(row) && !row.used_at && new Date(row.expires_at).getTime() > Date.now();

    return res.json({ success: true, valid });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const token = req.body.token;
    const newPassword = req.body.newPassword;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    if (!isPasswordAcceptable(newPassword)) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and not a commonly used password.`,
      });
    }

    const tokenHash = hashResetToken(token);
    const rows = await q(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    // Deliberately generic error for every failure mode (not found, expired,
    // already used) — distinguishing them tells an attacker which guess was
    // closer to a real token.
    const GENERIC_TOKEN_ERROR = 'This reset link is invalid or has expired. Please request a new one.';

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: GENERIC_TOKEN_ERROR });
    }

    const row = rows[0];
    if (row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: GENERIC_TOKEN_ERROR });
    }

    const { salt, hash } = hashPassword(newPassword);

    await q(
      `UPDATE users SET password_hash = $1, password_salt = $2, updated_at = NOW() WHERE user_id = $3`,
      [hash, salt, row.user_id]
    );

    // Single-use: mark this token consumed and invalidate any other
    // outstanding tokens for the same user in one go.
    await q(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [row.user_id]
    );

    // A password reset is a meaningful account-security event — clear any
    // login lockout so a legitimate user isn't still locked out after proving
    // account ownership via the reset token.
    const userRows = await q(`SELECT email FROM users WHERE user_id = $1`, [row.user_id]);
    if (userRows[0]?.email) {
      resetLoginAttempts(userRows[0].email);
    }

    console.log(`[password-reset] completed for user_id=${row.user_id}`);

    return res.json({ success: true, message: 'Password updated. You can now log in with your new password.' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── TOTP two-factor authentication ───────────────────────────────────────────
// C.1 item 6a — prerequisite for bank-detail step-up (item 6b/6c, not built
// yet). Standard authenticator-app flow: enroll (generate a secret, not yet
// active) -> verify (user proves they scanned it, THEN it activates) ->
// disable (requires a fresh code, never a plain on/off toggle).

// Shared by every TOTP route's catch block below, so "is this the
// missing-encryption-key case?" is checked in exactly one named place
// instead of being re-typed at each call site.
function sendTotpErrorResponse(error, res) {
  console.error('API error:', error);
  if (String(error.message || '').includes('TOTP_ENCRYPTION_KEY')) {
    return res.status(500).json({ success: false, error: 'Two-factor authentication is not yet configured on this server.' });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
}

// POST /api/auth/totp/enroll — starts enrollment. Does not activate 2FA by
// itself; nothing is enforced until /verify succeeds. Re-enrolling while
// already active is blocked — must disable (with a valid code) first,
// so a compromised session can't quietly swap out an owner's real 2FA.
app.post('/api/auth/totp/enroll', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const existing = await q('SELECT is_active FROM user_totp WHERE user_id = $1', [userId]);
    if (existing.length > 0 && existing[0].is_active) {
      return res.status(409).json({
        success: false,
        error: 'Two-factor authentication is already enabled. Disable it first to re-enroll.',
      });
    }

    const userRows = await q('SELECT email FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const secret = authenticator.generateSecret();
    const encryptedSecret = encryptValue(secret);
    const otpauthUrl = authenticator.keyuri(userRows[0].email, 'InReal', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await q(
      `INSERT INTO user_totp (user_id, secret_encrypted, is_active)
       VALUES ($1, $2, false)
       ON CONFLICT (user_id) DO UPDATE SET
         secret_encrypted = EXCLUDED.secret_encrypted,
         is_active = false,
         enrolled_at = NULL,
         recovery_codes_hash = NULL,
         updated_at = NOW()`,
      [userId, encryptedSecret]
    );

    // The raw secret is returned once, for manual entry if the investor
    // can't scan the QR code — same one-time-disclosure principle as a
    // password-reset token or an account-setup code elsewhere in this app.
    res.json({ success: true, data: { qrCodeDataUrl, secret, otpauthUrl } });
  } catch (error) {
    sendTotpErrorResponse(error, res);
  }
});

// POST /api/auth/totp/verify — proves the investor actually has the secret
// (scanned it into a real authenticator app) before 2FA becomes active.
// Issues one-time recovery codes on success, shown exactly once.
app.post('/api/auth/totp/verify', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }

    const rows = await q('SELECT secret_encrypted, is_active FROM user_totp WHERE user_id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No pending enrollment found. Start enrollment first.' });
    }
    if (rows[0].is_active) {
      return res.status(409).json({ success: false, error: 'Two-factor authentication is already enabled.' });
    }

    const secret = decryptValue(rows[0].secret_encrypted);
    const isValid = authenticator.check(String(code).trim(), secret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid code. Please try again.' });
    }

    // 8 recovery codes, shown once, stored only as SHA-256 hashes — same
    // non-reversible pattern as password-reset tokens. Redemption (using a
    // recovery code in place of a live TOTP code) isn't wired into
    // login/step-up yet; tracked as a known follow-up, not silently skipped.
    const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'));
    const hashedRecoveryCodes = recoveryCodes.map((c) => hashResetToken(c));

    await q(
      `UPDATE user_totp SET is_active = true, enrolled_at = NOW(), recovery_codes_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [hashedRecoveryCodes, userId]
    );

    console.log(`[totp.enabled] user_id=${userId}`);

    res.json({
      success: true,
      data: { recoveryCodes },
      message: 'Two-factor authentication enabled.',
    });
  } catch (error) {
    sendTotpErrorResponse(error, res);
  }
});

// POST /api/auth/totp/disable — deliberately requires a fresh valid code,
// never a plain toggle. If an attacker has a stolen session but not the
// investor's phone, they still can't turn off the one protection standing
// between them and a bank-detail change.
app.post('/api/auth/totp/disable', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const { code } = req.body;
    const isValid = await verifyFreshTotpCode(userId, code);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'A valid current authenticator code is required to disable two-factor authentication.',
      });
    }

    await q('DELETE FROM user_totp WHERE user_id = $1', [userId]);
    console.log(`[totp.disabled] user_id=${userId}`);

    res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (error) {
    sendTotpErrorResponse(error, res);
  }
});

// GET /api/auth/totp/status — lets the frontend show enabled/disabled
// without needing to know anything about the secret itself.
app.get('/api/auth/totp/status', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const rows = await q('SELECT is_active FROM user_totp WHERE user_id = $1', [userId]);
    res.json({ success: true, data: { enabled: rows.length > 0 && rows[0].is_active === true } });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/auth/login', async (req, res) => {
  try {
    // Same normalization as /api/auth/login — see the comment there.
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (isAccountLocked(email)) {
      return res.status(429).json({
        success: false,
        error: 'This account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
      });
    }

    const user = await verifyLoginCredentials(email, password);
    if (!user || user.Role !== 'admin') {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    resetLoginAttempts(email);
    res.json(await buildLoginResponse(user));
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/admin/auth/me', async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
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
      return res.status(401).json({ success: false, error: 'Unauthorized' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
        phone_number AS "PhoneNumber",
        whatsapp_number AS "WhatsappNumber",
        preferred_contact_channel AS "PreferredContactChannel",
        country_code AS "CountryCode",
        country_of_residence AS "CountryOfResidence",
        nationalities AS "Nationalities",
        us_person AS "UsPerson",
        profile_completed_at AS "ProfileCompletedAt",
        kyc_decline_reason_type AS "KycDeclineReasonType",
        kyc_declined_at AS "KycDeclinedAt",
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Hard jurisdiction exclusions per the Compliance Owner's KYC/AML policy (Appendix A.14).
//
// WHERE THIS IS ENFORCED — changed 28 July 2026 on the product owner's decision.
// This list used to hard-block signup with a 403. It no longer does: anyone can
// create an account from any country, and the jurisdiction decision is made by an
// admin at KYC review instead. The control was MOVED, not removed — see
// assessJurisdiction() below and the approval guard in the KYC decision endpoint,
// which refuses to approve a prohibited jurisdiction at all.
//
// The reasoning for moving it: the country checked at signup was previously
// *inferred* from the phone dial code the user picked, so it screened a guess
// rather than a declaration. Deciding at review time means screening the
// nationality and country of residence the investor actually declared, which is
// both better AML data and what Appendix A.16 (dual nationality — highest risk
// tier across all held nationalities) requires. It also gives Appendix A.15 the
// "unlisted jurisdiction routes to manual review" behaviour it always wanted,
// which a binary allow/block at signup could never express.
//
// A self-declared country is still not a substitute for the full
// citizenship/residency verification done via documents (Section 5) — a user can
// misreport, exactly as the manual process already accounts for.
const EXCLUDED_COUNTRY_CODES = new Set([
  'US', // United States — policy exclusion (FATCA / Reg S)
  'RU', // Russia — comprehensive UK/EU/US sanctions
  'BY', // Belarus — comprehensive sanctions exposure
  'IR', // Iran — FATF black-list; comprehensive sanctions
  'KP', // North Korea — FATF black-list; comprehensive sanctions
  'SY', // Syria — comprehensive sanctions exposure
  'CU', // Cuba — US sanctions exposure
  'MM', // Myanmar — FATF black-list (2022); sanctions
  'AF', // Afghanistan — sanctions exposure; ongoing review
  'VE', // Venezuela — US sanctions exposure
  'IQ', // Iraq — elevated AML risk; sanctions adjacency
  'YE', // Yemen — conflict zone; sanctions exposure
  'LY', // Libya — sanctions exposure; political instability
  'SD', // Sudan — sanctions exposure; conflict
  'SS', // South Sudan — sanctions exposure; conflict
  'SO', // Somalia — FATF black-list; conflict
  'ML', // Mali — sanctions exposure; political instability
  'BF', // Burkina Faso — sanctions exposure; political instability
  'NE', // Niger — sanctions exposure; political instability
  'CF', // Central African Republic — sanctions exposure
  'CD', // DR Congo — sanctions exposure on specific entities; full exclusion
  'ZW', // Zimbabwe — sanctions exposure
  'CN', // China (PRC) — Phase 1 exclusion (SAFE FX restrictions, sanctions complexity)
]);

// FATF grey-list / elevated-risk jurisdictions requiring Enhanced Due Diligence
// (Compliance Manual Appendix A). Distinct from the list above: EDD countries
// CAN be onboarded, with extra documentation. Prohibited ones cannot, at all.
// Kept server-side deliberately — the admin portal used to hold the only copy
// of this, which meant the risk tier shown to a reviewer was computed entirely
// in the browser and could not be trusted for an actual access decision.
const EDD_COUNTRY_CODES = new Set([
  'LB','TR','AL','BH','BI','CM','HT','KH','KG','LA','MA','MZ','NI','NG',
  'PK','PA','PH','SN','TZ','TT','UG','VN','ZA','KE',
]);

// The three kinds of decline. Only 'jurisdiction' is ever disclosed to the
// investor; the other two produce the PRD's neutral message (REQ-USR-13)
// because naming them would tip off the subject of a screening finding.
// 'suspicion' additionally has no automatic route back — a further application
// needs a founders' resolution first.
const DECLINE_REASON_TYPES = ['jurisdiction', 'compliance', 'suspicion'];

// Medium-risk jurisdictions (Compliance Manual Appendix A): standard due
// diligence plus enhanced source-of-funds evidence. Moved here from the admin
// portal for the same reason as the EDD list — one authoritative copy, so the
// tier a reviewer sees is by construction the tier the approval endpoint
// applies, rather than two lists that can quietly drift apart.
const MEDIUM_COUNTRY_CODES = new Set([
  'DZ','AD','AO','AR','AM','AZ','BD','BJ','BT','BO','BA','BN','BG',
  'CO','EG','GH','GE','GT','ID','JO','KZ','MV','MX','MD','MN','ME',
  'NA','NP','MK','PE','SM','RS','LK','TH','TN','UA','UZ',
]);

// Highest-risk-wins assessment across every jurisdiction an investor is
// connected to — their declared nationalities (which may be several, per
// Appendix A.16) plus their country of residence plus the country recorded at
// signup. Appendix A.16 is explicit that where multiple nationalities are held,
// the HIGHEST risk tier among them applies; this is what implements that.
//
// Tiers, worst first:
//   Prohibited — an excluded jurisdiction. Cannot be approved. Hard stop.
//   EDD        — elevated risk. Approvable with enhanced due diligence.
//   Unlisted   — country not on any list. Appendix A.15 requires this to route
//                to manual review rather than silently pass as low-risk, which
//                is exactly what used to happen.
//   Standard   — normal due diligence.
function assessJurisdiction({ countryCode, countryOfResidence, nationalities }) {
  const codes = [
    countryCode,
    countryOfResidence,
    ...(Array.isArray(nationalities) ? nationalities : []),
  ]
    .filter(Boolean)
    .map((c) => String(c).trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));

  const uniqueCodes = [...new Set(codes)];

  const prohibited = uniqueCodes.filter((c) => EXCLUDED_COUNTRY_CODES.has(c));
  if (prohibited.length > 0) {
    return {
      tier: 'Prohibited',
      canApprove: false,
      countries: uniqueCodes,
      triggeredBy: prohibited,
      reason: `Prohibited jurisdiction(s): ${prohibited.join(', ')}. Compliance Manual Appendix A excludes these outright.`,
    };
  }

  const edd = uniqueCodes.filter((c) => EDD_COUNTRY_CODES.has(c));
  if (edd.length > 0) {
    return {
      tier: 'EDD',
      canApprove: true,
      countries: uniqueCodes,
      triggeredBy: edd,
      reason: `Enhanced Due Diligence required for: ${edd.join(', ')}.`,
    };
  }

  const medium = uniqueCodes.filter((c) => MEDIUM_COUNTRY_CODES.has(c));
  if (medium.length > 0) {
    return {
      tier: 'Medium',
      canApprove: true,
      countries: uniqueCodes,
      triggeredBy: medium,
      reason: `Standard due diligence plus enhanced source-of-funds evidence for: ${medium.join(', ')}.`,
    };
  }

  if (uniqueCodes.length === 0) {
    return {
      tier: 'Unlisted',
      canApprove: true,
      countries: [],
      triggeredBy: [],
      reason: 'No jurisdiction declared yet — manual review required before approval.',
    };
  }

  // KNOWN GAP — Appendix A.15 (catch-all for unlisted jurisdictions).
  // The manual requires that a country appearing on NO tier of the risk matrix
  // routes to manual compliance review rather than passing as low-risk. That is
  // not implemented here, because doing it properly needs an authoritative list
  // of which countries ARE explicitly assessed as standard-risk, and no such
  // list exists in the repo or the manual excerpt this code was written against.
  // Inventing one would mean fabricating compliance data.
  //
  // Consequence today: a country on none of the three lists falls through to
  // 'Standard' below. That is the pre-existing behaviour, not a regression
  // introduced by moving the check to review time — but it IS still the A.15
  // gap already recorded in the tracker (C.3), and it needs the compliance
  // owner to supply the standard-risk list before it can be closed.
  return {
    tier: 'Standard',
    canApprove: true,
    countries: uniqueCodes,
    triggeredBy: [],
    reason: 'Standard due diligence.',
  };
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, phoneCode, phone, countryCode, password } = req.body;
    // Normalized the same way login/reset already are — without this,
    // "John@Example.com" and "john@example.com" would be treated as two
    // different accounts, and case-sensitive lookups elsewhere would
    // silently fail to find a legitimately existing account.
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!firstName || !lastName || !email || !phoneCode || !phone || !countryCode || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Normalized to uppercase before STORAGE, not just before comparison.
    // Now that jurisdiction is judged at KYC review rather than here, the
    // stored value is the thing that gets screened later — so letting both
    // "ru" and "RU" persist would hand someone a trivial casing bypass of the
    // review-time check. One canonical form only.
    const normalizedCountryCode = String(countryCode).trim().toUpperCase();

    // Signup deliberately does NOT reject excluded jurisdictions any more
    // (product owner decision, 28 July 2026). Anyone may create an account;
    // the jurisdiction call is made by an admin at KYC review, and the
    // approval endpoint hard-refuses prohibited jurisdictions there.
    //
    // This is only safe because a self-signed-up account lands as
    // kyc_status='Pending' and therefore MUST pass through that review before
    // it can do anything. Note the contrast with POST /api/ops/users, which
    // creates accounts already 'Approved' and so still keeps its own hard
    // block — there is no later review on that path to catch anything.

    // LOWER() on the column, not just a lowercased input, so this still
    // catches a match against any pre-existing row that was stored with
    // mixed case before this fix — not just future signups.
    const existing = await q('SELECT user_id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
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
        'Unverified', 'Pending', false, false,
        0, 0, 0,
        'user', true, false, NOW(), NOW()
      ) RETURNING user_id AS "UserID"`,
      [email, firstName, lastName, normalizedCountryCode, fullPhoneNumber, hash, salt]
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
      token: signSessionToken(newUserId),
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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

// Shared file-content validation used by every upload endpoint in this app
// (investor proof-of-payment uploads, and now admin-assigned user documents).
// Validates by magic bytes, not by filename or client-supplied mimeType —
// those are trivially spoofable. Returns { ok: true, fileBuffer, extension }
// or { ok: false, error } so callers can respond consistently.
//
// `extension` is the CORRECT extension for the content we actually detected,
// independent of whatever the uploader's filename claimed. This matters
// beyond security: a genuine PDF uploaded as "resume.txt" passes the content
// check (it really is a valid PDF), but if we then stored/served it back
// under a .txt name, the OS hands it to a text editor on download and shows
// garbled binary — the file was never corrupted, it was just mislabeled.
// Industry-standard handling (same approach browsers, cloud storage, and
// mail providers use) is to trust the sniffed content type for the filename
// that's actually stored and served, not the extension the client sent.
function extensionForDetectedType(label) {
  if (label === 'PDF') return '.pdf';
  if (label === 'JPEG') return '.jpg';
  if (label === 'PNG') return '.png';
  return '';
}

// Maps the extension we detected from magic bytes to a Content-Type for
// Supabase Storage. Deliberately not the client-supplied `mimeType` field —
// that field is only ever a display label elsewhere in this app and isn't
// validated against the actual bytes, so it shouldn't be trusted for what
// the file is served as either.
function contentTypeForDetectedExtension(extension) {
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.jpg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  return 'application/octet-stream';
}

const ALLOWED_FILE_SIGNATURES = [
  { label: 'PDF',  bytes: [0x25, 0x50, 0x44, 0x46] },            // %PDF
  { label: 'JPEG', bytes: [0xFF, 0xD8, 0xFF] },                   // JPEG SOI marker
  { label: 'PNG',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A] }, // PNG header
];
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

function validateUploadedFile(base64Payload) {
  const payload = base64Payload.includes(',') ? base64Payload.split(',')[1] : base64Payload;
  const fileBuffer = Buffer.from(payload, 'base64');

  const matchedSignature = ALLOWED_FILE_SIGNATURES.find(({ bytes }) =>
    bytes.every((byte, i) => fileBuffer[i] === byte)
  );
  if (!matchedSignature) {
    return { ok: false, error: 'Unsupported file type. Please upload a PDF, JPEG, or PNG.' };
  }
  if (fileBuffer.length > MAX_FILE_BYTES) {
    return { ok: false, error: 'File too large. Maximum size is 8 MB.' };
  }
  return { ok: true, fileBuffer, extension: extensionForDetectedType(matchedSignature.label) };
}

// Given the name the uploader supplied and the extension we actually detected
// from content, returns a filename with the correct extension — preserving
// the uploader's base name (so "resume.txt" containing a real PDF becomes
// "resume.pdf", not a generic name) but never trusting their claimed suffix.
function withDetectedExtension(originalFileName, detectedExtension) {
  const base = String(originalFileName || 'document').replace(/\.[^./\\]+$/, '');
  return `${base}${detectedExtension}`;
}

app.post('/api/investment-intents/:reference/proof', async (req, res) => {
  try {
    const authenticatedUserId = requireAuthenticatedUserId(req, res);
    if (!authenticatedUserId) return;

    const { reference } = req.params;
    const { proofBase64, fileName, mimeType = 'application/octet-stream' } = req.body;

    if (!proofBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'proofBase64 and fileName are required' });
    }

    // Validate file content by magic bytes BEFORE hitting the DB.
    // Reject anything that isn't a PDF, JPEG, or PNG regardless of what the
    // filename or mimeType field claims. Failing fast here avoids a DB query
    // on every disguised-file upload attempt.
    const validation = validateUploadedFile(proofBase64);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    const { fileBuffer, extension } = validation;
    const correctedFileName = withDetectedExtension(fileName, extension);

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
    // Stored and served under the extension we detected from content, not
    // whatever the uploader's filename claimed — see withDetectedExtension().
    const safeFileName = `${Date.now()}-${correctedFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const absolutePath = path.join(proofsDir, safeFileName);

    await fs.writeFile(absolutePath, fileBuffer);

    const parsed = parseDescription(target.description);
    parsed.proofStatus = 'Submitted';
    parsed.workflowStatus = 'PendingOpsReview';
    parsed.proof = {
      fileName: safeFileName,
      originalFileName: correctedFileName,
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Admin: KYC review queue ──────────────────────────────────────────────────
// GET  /api/ops/kyc-reviews          — list all users awaiting KYC review
// POST /api/ops/kyc-reviews/:id/decision — approve or decline a user's KYC

app.get('/api/ops/kyc-reviews', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    // Return all users whose KYC is still Pending, ordered oldest first so
    // the Compliance Owner works through them in the sequence they arrived.
    const rows = await q(
      `SELECT
         user_id              AS "UserID",
         first_name           AS "FirstName",
         last_name            AS "LastName",
         email                AS "Email",
         country_code         AS "CountryCode",
         country_of_residence AS "CountryOfResidence",
         nationalities        AS "Nationalities",
         phone_number         AS "PhoneNumber",
         kyc_status           AS "KYCStatus",
         accreditation_status AS "AccreditationStatus",
         identity_verified    AS "IdentityVerified",
         profile_completed_at AS "ProfileCompletedAt",
         created_at           AS "CreatedAt"
       FROM users
       WHERE kyc_status = 'Pending'
         AND is_active = true
         AND is_deleted = false
       ORDER BY created_at ASC`
    );

    // Risk tier is computed HERE, not in the browser. The admin portal used to
    // hold the only copy of the country lists and derive the tier client-side,
    // which was fine while it was merely decorative — but now that a
    // Prohibited tier actually blocks approval, the reviewer must be shown the
    // same verdict the approval endpoint will enforce. Deriving it in two
    // places invites the two from drifting apart.
    const withJurisdiction = rows.map((row) => ({
      ...row,
      Jurisdiction: assessJurisdiction({
        countryCode: row.CountryCode,
        countryOfResidence: row.CountryOfResidence,
        nationalities: row.Nationalities,
      }),
    }));

    return res.json({ success: true, data: withJurisdiction, count: withJurisdiction.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/ops/kyc-reviews/:userId/decision', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const { action, reviewerName, notes = '', declineReasonType } = req.body;

    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: "action must be 'approve' or 'decline'" });
    }
    if (!reviewerName || String(reviewerName).trim().length === 0) {
      return res.status(400).json({ success: false, error: 'reviewerName is required' });
    }

    // A decline must say WHICH KIND it is, because the two kinds behave
    // differently for the investor (product owner decision, 28 July 2026):
    // 'jurisdiction' is disclosed to them plainly, while 'compliance' and
    // 'suspicion' only ever produce the PRD's neutral message because naming
    // them would be tipping off.
    //
    // Required rather than defaulted, deliberately. A default would eventually
    // mislabel a sanctions hit as a jurisdiction decline and disclose a
    // screening finding to its subject — the failure mode here is regulatory,
    // not cosmetic, so the reviewer has to choose.
    if (action === 'decline') {
      if (!DECLINE_REASON_TYPES.includes(declineReasonType)) {
        return res.status(400).json({
          success: false,
          error: `declineReasonType is required for a decline and must be one of: ${DECLINE_REASON_TYPES.join(', ')}`,
        });
      }
    } else if (declineReasonType !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'declineReasonType only applies to a decline',
      });
    }

    // Confirm the target user exists and is actually in Pending status.
    // Declining/approving an already-resolved account would overwrite a prior
    // decision silently — so we guard against that here.
    const targets = await q(
      `SELECT user_id, kyc_status FROM users
       WHERE user_id = $1 AND is_active = true AND is_deleted = false
       LIMIT 1`,
      [targetUserId]
    );
    if (targets.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (targets[0].kyc_status !== 'Pending') {
      return res.status(409).json({
        success: false,
        error: `User KYC is already '${targets[0].kyc_status}' — decision was already recorded`,
      });
    }

    const isApprove = action === 'approve';
    const trimmedReviewerName = String(reviewerName).trim();
    const trimmedNotes = String(notes).trim();

    const decisionRow = await withTransaction(async (tx) => {
      // Re-check status inside the transaction (not just the earlier read) to close the
      // race where two admins submit a decision for the same user at nearly the same time.
      const locked = await tx(
        `SELECT user_id, kyc_status, country_code, country_of_residence, nationalities
         FROM users WHERE user_id = $1 FOR UPDATE`,
        [targetUserId]
      );
      if (locked.length === 0) {
        throw Object.assign(new Error('User not found'), { httpStatus: 404 });
      }
      if (locked[0].kyc_status !== 'Pending') {
        throw Object.assign(
          new Error(`User KYC is already '${locked[0].kyc_status}' — decision was already recorded`),
          { httpStatus: 409 }
        );
      }

      // Prohibited jurisdictions can never be APPROVED. This is the control
      // that replaced the old signup-time 403 (removed 28 July 2026), so it is
      // now the only thing standing between a sanctioned jurisdiction and an
      // approved account — it lives here, server-side and inside the same
      // transaction as the status write, not in the admin UI. The portal also
      // disables the approve button, but a disabled button is a convenience,
      // never a control: this check is what actually enforces it.
      //
      // Declining is always permitted — the whole point is that these accounts
      // can be resolved, just never approved.
      if (isApprove) {
        const jurisdiction = assessJurisdiction({
          countryCode: locked[0].country_code,
          countryOfResidence: locked[0].country_of_residence,
          nationalities: locked[0].nationalities,
        });
        if (!jurisdiction.canApprove) {
          throw Object.assign(
            new Error(
              `Cannot approve: ${jurisdiction.reason} This account may only be declined.`
            ),
            { httpStatus: 422 }
          );
        }
      }

      // kyc_declined_at is the anchor the retention tier is measured from —
      // someone declined before submitting any documents has no "end of the
      // Participant relationship" for the Manual's 7-year clock to run from,
      // so this decision date is the only clean start point that cohort has.
      // Cleared on approval so a previously-declined-then-approved account
      // doesn't carry a stale decline date or reason.
      await tx(
        `UPDATE users SET
           kyc_status              = $1,
           accreditation_status    = $2,
           identity_verified       = $3,
           kyc_decline_reason_type = $4,
           kyc_declined_at         = $5,
           updated_at              = NOW()
         WHERE user_id = $6`,
        [
          isApprove ? 'Approved' : 'Declined',
          isApprove ? 'Verified' : 'Unverified',
          isApprove,
          isApprove ? null : declineReasonType,
          isApprove ? null : new Date(),
          targetUserId,
        ]
      );

      const inserted = await tx(
        `INSERT INTO kyc_decisions (user_id, admin_user_id, action, reviewer_name, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING decision_id AS "DecisionID", decided_at AS "DecidedAt"`,
        [targetUserId, adminUserId, action, trimmedReviewerName, trimmedNotes]
      );
      return inserted[0];
    });

    return res.json({
      success: true,
      message: `KYC ${action}d successfully for user ${targetUserId}`,
      data: {
        decisionId: decisionRow.DecisionID,
        userId: targetUserId,
        action,
        reviewerName: trimmedReviewerName,
        notes: trimmedNotes,
        decidedAt: decisionRow.DecidedAt,
      },
    });
  } catch (error) {
    if (error.httpStatus) {
      return res.status(error.httpStatus).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/ops/kyc-reviews/:userId/history — full decision audit trail for one user.
// Read-only, admin-only, never mutates anything. This is the durable record the
// Compliance Manual requires (Section 9 retention of decision documentation) — it reads
// straight from kyc_decisions rather than any client-side or log-based source.
app.get('/api/ops/kyc-reviews/:userId/history', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const rows = await q(
      `SELECT
         d.decision_id    AS "DecisionID",
         d.action         AS "Action",
         d.reviewer_name  AS "ReviewerName",
         d.notes          AS "Notes",
         d.decided_at     AS "DecidedAt",
         d.admin_user_id  AS "AdminUserID",
         a.email          AS "AdminEmail"
       FROM kyc_decisions d
       JOIN users a ON a.user_id = d.admin_user_id
       WHERE d.user_id = $1
       ORDER BY d.decided_at DESC`,
      [targetUserId]
    );

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Admin: bank-detail change review (C.1 item 6c) ───────────────────────────
// The role check here is a deliberate, clearly-labeled stopgap: the spec
// calls for gating this behind finance_admin/super_admin specifically, but
// that tiered role model (F8) doesn't exist yet — this app currently only
// has a binary admin/user role. Per the same pattern the spec itself
// endorses for the portfolio-adjustment item, this gates behind "any
// authenticated admin" for now and MUST be retrofitted to the real role
// check the moment F8 lands — this is not meant to become permanent.

// GET /api/ops/bank-detail-requests — pending requests queue, decrypted for
// review. Only admins ever see the decrypted proposed/prior values —
// the investor who submitted it never sees this endpoint at all.
app.get('/api/ops/bank-detail-requests', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const rows = await q(
      `SELECT
         r.request_id               AS "RequestID",
         r.user_id                  AS "UserID",
         u.first_name               AS "FirstName",
         u.last_name                AS "LastName",
         u.email                    AS "Email",
         r.proposed_values_encrypted,
         r.prior_values_encrypted,
         r.status                   AS "Status",
         r.step_up_verified_at      AS "StepUpVerifiedAt",
         r.created_at               AS "CreatedAt"
       FROM bank_detail_requests r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    );

    const data = rows.map((row) => ({
      RequestID: row.RequestID,
      UserID: row.UserID,
      FirstName: row.FirstName,
      LastName: row.LastName,
      Email: row.Email,
      Status: row.Status,
      StepUpVerifiedAt: row.StepUpVerifiedAt,
      CreatedAt: row.CreatedAt,
      ProposedValues: JSON.parse(decryptValue(row.proposed_values_encrypted)),
      PriorValues: row.prior_values_encrypted ? JSON.parse(decryptValue(row.prior_values_encrypted)) : null,
    }));

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('API error:', error);
    if (String(error.message || '').includes('TOTP_ENCRYPTION_KEY')) {
      return res.status(500).json({ success: false, error: 'This feature is not yet configured on this server.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/ops/bank-detail-requests/:id/verify — applies the proposed
// values to the live users row. Transactional and row-locked, same pattern
// as the KYC decision endpoint above, so two admins can't both approve the
// same request at once.
app.post('/api/ops/bank-detail-requests/:id/verify', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const requestId = req.params.id;

    const result = await withTransaction(async (tx) => {
      const locked = await tx(
        `SELECT request_id, user_id, proposed_values_encrypted, status FROM bank_detail_requests WHERE request_id = $1 FOR UPDATE`,
        [requestId]
      );
      if (locked.length === 0) {
        throw Object.assign(new Error('Request not found'), { httpStatus: 404 });
      }
      if (locked[0].status !== 'pending') {
        throw Object.assign(
          new Error(`This request is already '${locked[0].status}' — decision was already recorded`),
          { httpStatus: 409 }
        );
      }

      const proposed = JSON.parse(decryptValue(locked[0].proposed_values_encrypted));

      await tx(
        `UPDATE users SET
           bank_account_holder_name       = $1,
           bank_name                      = $2,
           bank_account_number_encrypted  = $3,
           bank_swift_bic                 = $4,
           bank_country_code              = $5,
           bank_account_linked            = true,
           updated_at                     = NOW()
         WHERE user_id = $6`,
        [
          proposed.accountHolderName,
          proposed.bankName,
          encryptValue(proposed.accountNumber),
          proposed.swiftBic,
          proposed.countryCode,
          locked[0].user_id,
        ]
      );

      await tx(
        `UPDATE bank_detail_requests SET status = 'verified', reviewed_by = $1, reviewed_at = NOW() WHERE request_id = $2`,
        [adminUserId, requestId]
      );

      return { userId: locked[0].user_id };
    });

    console.log(`[bank_detail.change_verified] request_id=${requestId} user_id=${result.userId} reviewed_by=${adminUserId}`);

    res.json({ success: true, message: 'Bank detail change verified and applied.' });
  } catch (error) {
    if (error.httpStatus) {
      return res.status(error.httpStatus).json({ success: false, error: error.message });
    }
    console.error('API error:', error);
    if (String(error.message || '').includes('TOTP_ENCRYPTION_KEY')) {
      return res.status(500).json({ success: false, error: 'This feature is not yet configured on this server.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/ops/bank-detail-requests/:id/reject — a rejection note is
// mandatory, not optional, so there's always a real explanation on record
// for why a bank-detail change didn't go through.
app.post('/api/ops/bank-detail-requests/:id/reject', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const requestId = req.params.id;
    const { rejectionNote } = req.body;
    if (!rejectionNote || String(rejectionNote).trim().length === 0) {
      return res.status(400).json({ success: false, error: 'rejectionNote is required' });
    }

    const result = await withTransaction(async (tx) => {
      const locked = await tx(
        `SELECT request_id, user_id, status FROM bank_detail_requests WHERE request_id = $1 FOR UPDATE`,
        [requestId]
      );
      if (locked.length === 0) {
        throw Object.assign(new Error('Request not found'), { httpStatus: 404 });
      }
      if (locked[0].status !== 'pending') {
        throw Object.assign(
          new Error(`This request is already '${locked[0].status}' — decision was already recorded`),
          { httpStatus: 409 }
        );
      }

      await tx(
        `UPDATE bank_detail_requests
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_note = $2
         WHERE request_id = $3`,
        [adminUserId, String(rejectionNote).trim(), requestId]
      );

      return { userId: locked[0].user_id };
    });

    console.log(`[bank_detail.change_rejected] request_id=${requestId} user_id=${result.userId} reviewed_by=${adminUserId}`);

    res.json({ success: true, message: 'Bank detail change rejected.' });
  } catch (error) {
    if (error.httpStatus) {
      return res.status(error.httpStatus).json({ success: false, error: error.message });
    }
    console.error('API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// C.1 item 3. The account is created with a random password that is
// generated, hashed, and immediately discarded — no one, including this
// admin, ever knows it or could reconstruct it. The investor's real first
// password is set by them, through the exact same "reset password" screen
// already built and tested (see C.0.1 / D.0), using a one-time setup code
// generated below. This is the same token machinery as
// /api/auth/password-reset — same hashing, same 30-minute expiry, same
// single-use guarantee — reused rather than duplicated, so this relies on
// code that's already been security-reviewed instead of a second parallel
// mechanism that could drift out of sync with it.
//
// Per the 23 June meeting, accounts created this way have already been
// through manual KYC review before the admin creates them (the pilot's KYC
// happens up front, outside this app) — so this endpoint marks the account
// verified immediately, matching the same status values the KYC-approval
// flow itself sets (see the isApprove branch further down: 'Approved' /
// 'Verified'), rather than leaving it 'Pending' the way public self-signup
// does.
app.post('/api/ops/users', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const { firstName, lastName, email, phoneCode, phone, countryCode } = req.body;
    if (!firstName || !lastName || !email || !phoneCode || !phone || !countryCode) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCountryCode = String(countryCode).trim().toUpperCase();

    // This block STAYS, even though the equivalent one was removed from public
    // signup on 28 July 2026. The two paths are not symmetrical: a self-signed-up
    // account is created 'Pending' and must pass KYC review, where the
    // jurisdiction decision now happens. An admin-created account is inserted
    // already 'Approved' / identity_verified=true (see the INSERT below), because
    // the premise is that manual KYC was completed outside the app first — so it
    // never enters the review queue, and there is no later checkpoint that would
    // catch a prohibited jurisdiction. Removing this would mean an excluded
    // jurisdiction could be onboarded and approved with no screening whatsoever.
    if (EXCLUDED_COUNTRY_CODES.has(normalizedCountryCode)) {
      return res.status(403).json({
        success: false,
        error: 'InReal is unable to accept participants from this jurisdiction at this time.',
      });
    }

    const existing = await q('SELECT user_id FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const throwawayPassword = randomBytes(24).toString('hex');
    const { salt, hash } = hashPassword(throwawayPassword);
    const fullPhoneNumber = `${phoneCode} ${phone}`;

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
        'Verified', 'Approved', true, false,
        0, 0, 0,
        'user', true, false, NOW(), NOW()
      ) RETURNING user_id AS "UserID"`,
      [normalizedEmail, firstName, lastName, normalizedCountryCode, fullPhoneNumber, hash, salt]
    );
    const newUserId = inserted[0].UserID;

    const setupToken = randomBytes(32).toString('hex');
    const setupTokenHash = hashResetToken(setupToken);
    await q(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, $3, $4)`,
      [newUserId, setupTokenHash, new Date(Date.now() + SETUP_TOKEN_TTL_MS), getClientIp(req) || null]
    );

    // Logged the same way password-reset tokens are, for a consistent audit
    // trail and as a fallback if the admin's screen closes before they copy
    // it. Also returned directly in the response below — unlike
    // password-reset/request, the caller here is a known, authenticated
    // admin who is *supposed* to receive this code to relay it onward, not
    // an anonymous requester whose existence-knowledge needs hiding.
    console.log(`[account-setup] setup code issued for user_id=${newUserId} (deliver via concierge): ${setupToken}`);

    // Awaited here, unlike the password-reset path. There is no enumeration
    // concern to protect — the caller is an authenticated admin who already
    // knows this account exists, because they just created it — and waiting
    // buys something worth having: the admin is told truthfully whether the
    // email actually went out, instead of the UI asserting it did.
    //
    // The result is never allowed to fail the request. The account exists and
    // the token is valid regardless; a failed send means this falls back to
    // the manual relay that was the only option before requirement #4, which
    // is why the code is still returned below in both cases.
    const mailResult = await sendAccountSetupEmail({
      to: normalizedEmail,
      firstName,
      code: setupToken,
      portalUrl: getInvestorPortalUrl(),
      expiryHours: Math.round(SETUP_TOKEN_TTL_MS / 3600000),
    });

    if (!mailResult.delivered) {
      console.warn(
        `[account-setup] setup email NOT delivered for user_id=${newUserId} (${mailResult.reason}) — admin must relay the code manually`
      );
    }

    res.json({
      success: true,
      data: {
        UserID: newUserId,
        Email: normalizedEmail,
        FirstName: firstName,
        LastName: lastName,
        KYCStatus: 'Approved',
        AccreditationStatus: 'Verified',
      },
      setupToken,
      emailed: mailResult.delivered,
      emailFailureReason: mailResult.delivered ? undefined : mailResult.reason,
      message: mailResult.delivered
        ? 'Account created and a setup email has been sent. The code below is a backup if the investor does not receive it.'
        : 'Account created, but the setup email could not be sent. Share the code below with the investor directly.',
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Admin: portfolio value adjustments (C.1 item 7) ──────────────────────────
// Deliberately append-only — see database/pg/06-add-portfolio-adjustments.sql.
// This NEVER becomes a raw `UPDATE users SET portfolio_value = X`; every
// adjustment is its own row with a mandatory reason, added on top of the
// real, investment-derived value (see getUserFinancialSummary above), not
// a replacement for it. The whole point is that the number an investor
// sees is always explainable from this ledger, not just typed in once and
// forgotten.
//
// Same role-gating stopgap as bank-detail review (D.8): the spec calls for
// finance_admin/super_admin specifically, but that tiered role model (F8)
// doesn't exist yet. Gated behind "any authenticated admin" for now,
// clearly flagged here to retrofit the moment F8 lands — not meant to
// become permanent.

// POST /api/ops/users/:userId/portfolio-adjustment — creates one ledger
// entry. Never updates an existing row.
app.post('/api/ops/users/:userId/portfolio-adjustment', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const { amount, reason } = req.body;
    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || Number.isNaN(numericAmount) || numericAmount === 0) {
      return res.status(400).json({ success: false, error: 'amount is required and must be a non-zero number' });
    }
    if (!reason || String(reason).trim().length === 0) {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }

    const targetUser = await q(
      `SELECT user_id FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [targetUserId]
    );
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const inserted = await q(
      `INSERT INTO portfolio_adjustments (user_id, adjustment_amount, reason, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING adjustment_id AS "AdjustmentID", created_at AS "CreatedAt"`,
      [targetUserId, numericAmount, String(reason).trim(), adminUserId]
    );

    console.log(
      `[portfolio.adjustment_created] user_id=${targetUserId} amount=${numericAmount} created_by=${adminUserId} reason="${String(reason).trim()}"`
    );

    // Return the updated live summary so the admin UI can show the new
    // total immediately, without a second round trip.
    const updatedSummary = await getUserFinancialSummary(targetUserId);

    res.json({
      success: true,
      data: {
        AdjustmentID: inserted[0].AdjustmentID,
        CreatedAt: inserted[0].CreatedAt,
        NewPortfolioValue: updatedSummary?.PortfolioValue ?? null,
      },
      message: 'Adjustment recorded.',
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/ops/users/:userId/portfolio-adjustments — the ledger itself.
// Without this, "audited" would just mean rows nobody ever looks at.
app.get('/api/ops/users/:userId/portfolio-adjustments', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const rows = await q(
      `SELECT
         a.adjustment_id     AS "AdjustmentID",
         a.adjustment_amount AS "Amount",
         a.reason            AS "Reason",
         a.created_at        AS "CreatedAt",
         u.first_name        AS "CreatedByFirstName",
         u.last_name         AS "CreatedByLastName",
         u.email             AS "CreatedByEmail"
       FROM portfolio_adjustments a
       JOIN users u ON u.user_id = a.created_by
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [targetUserId]
    );

    // Bundled with the history in one response, rather than a separate
    // endpoint just for this one number — the frontend always needs both
    // together when opening the adjustment drawer.
    const currentSummary = await getUserFinancialSummary(targetUserId);

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      currentPortfolioValue: currentSummary?.PortfolioValue ?? null,
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Admin: user documents (KYC / Finance / Property assignment) ─────────────
// This replaces the ops portal's previous local-only mock ("Document recorded
// (local)" — no server round-trip, no file actually stored, no real user
// reference). Every route here is admin-gated and every user reference is
// checked against the real `users` table server-side — the client only ever
// supplies a userId to search/select against, never something we trust blindly
// into a query or a file path.

// GET /api/ops/users/search?q=... — used by the admin document-upload form's
// user picker. Deliberately returns only the minimal safe fields needed to
// pick the right person (id, name, email) — not KYC status, phone, or
// anything else a document-assignment screen doesn't need to see.
app.get('/api/ops/users/search', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const query = String(req.query.q || '').trim();
    if (query.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const rows = await q(
      `SELECT
         user_id    AS "UserID",
         first_name AS "FirstName",
         last_name  AS "LastName",
         email      AS "Email"
       FROM users
       WHERE is_active = true AND is_deleted = false
         AND (
           email ILIKE $1
           OR first_name ILIKE $1
           OR last_name ILIKE $1
           OR (first_name || ' ' || last_name) ILIKE $1
         )
       ORDER BY first_name, last_name
       LIMIT 20`,
      [`%${query}%`]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const DOCUMENT_CATEGORIES = new Set(['KYC', 'Finance', 'Property']);

// Whether the investor may see a document. Names taken from the PRD rather than
// coined here: Section 4's document taxonomy marks every code it adds
// (KYC-NUS, KYC-PEP, KYC-TAX, KYC-UBO, PRP-INSP, PRP-RNV, PRP-LSE) as
// `operator_only`, and "investor-visible" is the term used throughout for the
// counterpart. See database/pg/10-add-document-visibility.sql for the
// compliance rules that make this column necessary rather than nice to have.
const DOCUMENT_VISIBILITIES = new Set(['investor_visible', 'operator_only']);

// POST /api/ops/documents — admin uploads a document and assigns it to a
// specific user. userId is validated against the real users table before
// anything is written to disk or the database — never trusted as-is.
app.post('/api/ops/documents', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const { userId, category, label, fileBase64, fileName, propertyId, visibility, mimeType = 'application/octet-stream' } = req.body;

    const targetUserId = Number(userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: 'A valid userId is required' });
    }

    // Optional property link (PO requirement #3). Absent/null/empty means a
    // general document — a real category, not a missing value.
    //
    // Validated against the real properties table below for the same reason the
    // user reference is: a client-supplied id that is written straight into a
    // row is a client-controlled foreign key. The database FK would catch a
    // bogus id too, but as a 500 rather than a clear 404, and after the file has
    // already been uploaded to storage.
    let targetPropertyId = null;
    if (propertyId !== undefined && propertyId !== null && propertyId !== '') {
      targetPropertyId = Number(propertyId);
      if (!Number.isInteger(targetPropertyId) || targetPropertyId <= 0) {
        return res.status(400).json({ success: false, error: 'propertyId must be a positive integer' });
      }
    }
    if (!DOCUMENT_CATEGORIES.has(category)) {
      return res.status(400).json({ success: false, error: "category must be 'KYC', 'Finance', or 'Property'" });
    }

    // Required, with no fallback. An upload that does not say who may see the
    // document is rejected rather than assumed, because the two ways of being
    // wrong here are not equally recoverable: a document wrongly hidden is
    // re-filed once someone notices, while a document wrongly disclosed has
    // already been read, and where it is screening or SAR-supporting material
    // that disclosure is the tipping-off the Compliance Manual §8 forbids.
    // Same reasoning migration 08 applied to the KYC decline reason.
    if (!DOCUMENT_VISIBILITIES.has(visibility)) {
      return res.status(400).json({
        success: false,
        error: "visibility must be 'investor_visible' or 'operator_only'",
      });
    }
    if (!label || !String(label).trim()) {
      return res.status(400).json({ success: false, error: 'label is required' });
    }
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'fileBase64 and fileName are required' });
    }

    // Confirm the target user actually exists before writing anything.
    const targetUsers = await q(
      `SELECT user_id FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [targetUserId]
    );
    if (targetUsers.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Checked before the file is uploaded, not after, so a bad property id
    // fails fast without leaving an orphaned object in storage.
    if (targetPropertyId !== null) {
      const targetProperties = await q(
        `SELECT property_id FROM properties WHERE property_id = $1`,
        [targetPropertyId]
      );
      if (targetProperties.length === 0) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }
    }

    // Same magic-byte validation as every other upload path in this app —
    // PDF/JPEG/PNG only, checked by content not filename or claimed mimeType.
    const validation = validateUploadedFile(fileBase64);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    const { fileBuffer, extension } = validation;
    // Store and serve under the extension we detected from content, not
    // whatever the admin's uploaded filename claimed. See
    // withDetectedExtension() — this is what fixes a real PDF uploaded as
    // "resume.txt" from downloading back as a garbled, mislabeled file.
    const correctedFileName = withDetectedExtension(fileName, extension);

    // Stored in the private Supabase Storage bucket, never local disk — local
    // disk on Render is ephemeral and would silently lose every document on
    // the next deploy/restart, which isn't acceptable for files subject to
    // the compliance manual's 7-year retention rule. Path is namespaced by
    // user id so a bucket listing alone doesn't mix users' files together.
    const storagePath = `${targetUserId}/${Date.now()}-${correctedFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await ensureDocumentsBucket();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: contentTypeForDetectedExtension(extension),
        upsert: false,
      });
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Could not store document' });
    }

    const inserted = await q(
      `INSERT INTO user_documents (
         user_id, category, label, file_name, original_file_name, mime_type, uploaded_by_admin_id, property_id, visibility
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING document_id AS "DocumentID", created_at AS "CreatedAt"`,
      [targetUserId, category, String(label).trim(), storagePath, correctedFileName, mimeType, adminUserId, targetPropertyId, visibility]
    );

    res.status(201).json({
      success: true,
      data: {
        documentId: inserted[0].DocumentID,
        userId: targetUserId,
        propertyId: targetPropertyId,
        category,
        visibility,
        label: String(label).trim(),
        originalFileName: correctedFileName,
        createdAt: inserted[0].CreatedAt,
      },
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/ops/documents — admin document queue. Optional ?userId= filter.
// Metadata only — the actual file is only ever served through the
// auth-gated download route below, never a public/static path.
app.get('/api/ops/documents', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    // Filters. Every one of these is a bound parameter — none is ever
    // interpolated into the SQL string, and the two enum-ish filters are
    // additionally checked against the same Sets the upload endpoint validates
    // against, so an unexpected value is a 400 rather than a query that
    // silently matches nothing and looks like "no documents exist".
    const conditions = [];
    const params = [];

    const addCondition = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace('$?', `$${params.length}`));
    };

    if (req.query.userId) {
      const userIdFilter = Number(req.query.userId);
      if (!Number.isInteger(userIdFilter) || userIdFilter <= 0) {
        return res.status(400).json({ success: false, error: 'userId must be a positive integer' });
      }
      addCondition('d.user_id = $?', userIdFilter);
    }

    if (req.query.category) {
      if (!DOCUMENT_CATEGORIES.has(req.query.category)) {
        return res.status(400).json({ success: false, error: "category must be 'KYC', 'Finance', or 'Property'" });
      }
      addCondition('d.category = $?', req.query.category);
    }

    if (req.query.visibility) {
      if (!DOCUMENT_VISIBILITIES.has(req.query.visibility)) {
        return res.status(400).json({
          success: false,
          error: "visibility must be 'investor_visible' or 'operator_only'",
        });
      }
      addCondition('d.visibility = $?', req.query.visibility);
    }

    // 'general' is a real filter value, not an absent one — it means "documents
    // tied to no property", which is the box the investor portal shows
    // alongside the per-property ones. It has to be spelled explicitly because
    // an empty propertyId is indistinguishable from "no filter applied".
    if (req.query.propertyId) {
      if (req.query.propertyId === 'general') {
        conditions.push('d.property_id IS NULL');
      } else {
        const propertyFilter = Number(req.query.propertyId);
        if (!Number.isInteger(propertyFilter) || propertyFilter <= 0) {
          return res.status(400).json({ success: false, error: 'propertyId must be a positive integer or "general"' });
        }
        addCondition('d.property_id = $?', propertyFilter);
      }
    }

    // Free-text search across the label and the person it is filed against,
    // because an admin looking for a document generally remembers one or the
    // other. ILIKE with the wildcards in the BOUND VALUE, never in the SQL —
    // the % characters are data here, not syntax.
    if (req.query.q && String(req.query.q).trim()) {
      const term = `%${String(req.query.q).trim()}%`;
      params.push(term);
      conditions.push(
        `(d.label ILIKE $${params.length} OR u.email ILIKE $${params.length} OR (u.first_name || ' ' || u.last_name) ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Pagination, which is the half of this that actually fixes a bug rather
    // than adding convenience. The previous version was a bare LIMIT 200 with
    // no count and no offset: once an admin passed 200 documents the older ones
    // simply stopped appearing, with nothing on screen to say so. Combined with
    // there being no edit or delete path for a document, anything past the
    // cutoff was unreachable through the UI entirely.
    //
    // Returning the total alongside the page is what makes that visible — the
    // portal can say "showing 1–50 of 347" and page back, instead of quietly
    // presenting a truncated list as if it were everything.
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * pageSize;

    params.push(pageSize, offset);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await q(
      `SELECT
         COUNT(*) OVER()        AS "TotalCount",
         d.document_id          AS "DocumentID",
         d.user_id              AS "UserID",
         u.email                AS "UserEmail",
         u.first_name           AS "UserFirstName",
         u.last_name            AS "UserLastName",
         d.category             AS "Category",
         d.label                AS "Label",
         d.original_file_name   AS "OriginalFileName",
         d.mime_type            AS "MimeType",
         d.is_superseded        AS "IsSuperseded",
         d.created_at           AS "CreatedAt",
         d.property_id          AS "PropertyID",
         p.property_name        AS "PropertyName",
         -- Surfaced in the queue so an admin can see what a document was filed
         -- as. Without it the setting is write-once and invisible, and there is
         -- no edit path for documents, so a misfile would be undetectable
         -- rather than merely uncorrectable.
         d.visibility           AS "Visibility",
         a.email                AS "UploadedByEmail"
       FROM user_documents d
       JOIN users u ON u.user_id = d.user_id
       JOIN users a ON a.user_id = d.uploaded_by_admin_id
       LEFT JOIN properties p ON p.property_id = d.property_id
       ${whereClause}
       ORDER BY d.created_at DESC
       ${limitClause}`,
      params
    );

    // COUNT(*) OVER() rides on every row, so it is only readable when at least
    // one row came back. An empty page means zero matches for these filters,
    // which is a real total of 0 — not a missing value to guess at.
    const total = rows.length > 0 ? Number(rows[0].TotalCount) : 0;
    // Stripped from the payload: it is identical on every row and belongs in
    // the envelope, not repeated inside each record where a caller might
    // mistake it for a per-document field.
    const data = rows.map(({ TotalCount, ...rest }) => rest);

    res.json({
      success: true,
      data,
      count: data.length,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/ops/documents/:id/file — admin-only download. The file itself
// lives in the private Supabase Storage bucket (never a public bucket URL);
// this route stays the single gate in front of it, so a client-side download
// still requires a fresh admin-authenticated request either way.
app.get('/api/ops/documents/:id/file', async (req, res) => {
  try {
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid document id' });
    }

    const rows = await q(
      `SELECT file_name, original_file_name, mime_type FROM user_documents WHERE document_id = $1`,
      [documentId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(rows[0].file_name);
    if (downloadError || !data) {
      console.error('Supabase Storage download error:', downloadError);
      return res.status(404).json({ success: false, error: 'Document file not found' });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const safeDownloadName = String(rows[0].original_file_name || 'document').replace(/"/g, '');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Investor: edit own contact info ──────────────────────────────────────────
// C.1 item 5. Covers the full "contact fields" group from the PRD
// (REQ-USR-14): phone, WhatsApp number, and preferred contact channel — all
// three self-editable together, each optional in a given request. Per the
// implementation spec, legal name, DOB, nationality (country_code),
// residential address, and bank/payout details are all explicitly NOT
// editable here — those either require a higher-friction flow (bank details
// need step-up 2FA, not built yet — see C.1 item 6) or shouldn't change
// post-KYC at all without a fresh review. Email changes are out of scope for
// the pilot per the spec too.
//
// The request body is allow-listed to exactly these three fields, not
// "accept anything and only read what we recognize" — an unexpected field is
// rejected outright with a 400, so a client bug (or an attempt to sneak in
// e.g. countryCode) can never silently slip through unnoticed.
const CONTACT_CHANNELS = ['phone', 'whatsapp', 'email'];

// ── Investor changes their own password while logged in ──────────────────────
// PRD F1 / REQ-AUTH-02 ("password reset" on both surfaces). Until now the
// Settings > Security "Change Password" card was three unwired inputs and a
// button with no onClick, sitting above no endpoint at all — the only code
// path in this file that could write a password was the reset-token flow. The
// practical effect was that a logged-in investor who simply wanted a new
// password had to log out and pretend they had forgotten it.
//
// HOW THIS DIFFERS FROM /api/auth/password-reset/confirm, and why it is not the
// same endpoint wearing a hat: the reset flow proves identity with a token sent
// to the registered mailbox, and is used precisely when the old password is
// unavailable. This one proves identity with the CURRENT password, because a
// live session on its own is not proof of the account owner — a borrowed laptop
// or a stolen token both produce one. Requiring the current password is what
// stops a session-holder turning temporary access into permanent ownership.
// That is the same reasoning REQ-AUTH-12 applies to bank details, at a lower
// tier: a password change is sensitive, so it re-authenticates.
app.put('/api/user/password', passwordChangeLimiter, async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    // Allow-list the body, same as the contact endpoint below: an unexpected
    // field is a rejected request, never a silently ignored one, so a client
    // bug can't quietly believe it changed something it didn't.
    const allowedFields = ['currentPassword', 'newPassword'];
    const unexpectedKeys = Object.keys(req.body || {}).filter((key) => !allowedFields.includes(key));
    if (unexpectedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unexpected field(s): ${unexpectedKeys.join(', ')}. Only ${allowedFields.join(', ')} can be sent here.`,
      });
    }

    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Both currentPassword and newPassword are required',
      });
    }

    const rows = await q(
      'SELECT password_hash, password_salt FROM users WHERE user_id = $1',
      [userId]
    );
    if (rows.length === 0 || !rows[0].password_hash || !rows[0].password_salt) {
      // No usable password on file. Reachable by an admin-created account that
      // has not yet been through its setup code — those hold a random password
      // that was generated and discarded, so there is nothing the account owner
      // could possibly supply as "current". Send them to the setup/reset path.
      return res.status(400).json({
        success: false,
        error: 'This account has no password set yet. Please use the password reset flow instead.',
      });
    }

    if (!verifyPassword(currentPassword, rows[0].password_salt, rows[0].password_hash)) {
      // 403, not 401: the session is perfectly valid, it is the re-authentication
      // that failed. A 401 would tell the frontend's interceptor the token had
      // expired and bounce the investor to the login screen mid-edit.
      return res.status(403).json({ success: false, error: 'Current password is incorrect' });
    }

    // Same policy the reset flow enforces — one definition of "acceptable
    // password", not a second, looser one that happens to live on this route.
    if (!isPasswordAcceptable(newPassword)) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and not a commonly used password.`,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from your current password',
      });
    }

    const { salt, hash } = hashPassword(newPassword);
    await q(
      'UPDATE users SET password_hash = $1, password_salt = $2, updated_at = NOW() WHERE user_id = $3',
      [hash, salt, userId]
    );

    // Burn any outstanding reset tokens. This matters more than it looks: the
    // commonest reason someone changes their password deliberately is that they
    // think somebody else has it. If an attacker had already requested a reset,
    // that token would otherwise still be sitting there valid for its 30
    // minutes, handing back the account the investor just secured.
    await q(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    // Matches the lightweight console-log audit pattern used elsewhere in this
    // file — there is still no persisted audit table (see the cross-cutting
    // "Audit events: not started" row in the tracker). Never logs either
    // password, only that the event happened.
    console.log(`[password-change] user_id=${userId} changed their own password at ${new Date().toISOString()}`);

    // KNOWN LIMITATION, stated rather than hidden: this does not invalidate
    // JWTs already issued to this user. They are stateless and this project has
    // no token denylist, so a session opened elsewhere keeps working until it
    // expires (12h). The implementation spec anticipated exactly this and asked
    // for "invalidate existing sessions if feasible, at minimum log the event"
    // — this is the log. Real revocation arrives with ADR-01 (Supabase Auth),
    // which owns sessions properly. Worth closing then, not worth hand-rolling
    // a denylist now.
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/api/user/profile/contact', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const allowedFields = ['phoneNumber', 'whatsappNumber', 'preferredContactChannel'];
    const bodyKeys = Object.keys(req.body || {});
    const unexpectedKeys = bodyKeys.filter((key) => !allowedFields.includes(key));
    if (unexpectedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unexpected field(s): ${unexpectedKeys.join(', ')}. Only ${allowedFields.join(', ')} can be updated here.`,
      });
    }
    if (bodyKeys.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one field is required' });
    }

    // Loose, deliberately permissive E.164-ish check (optional leading +,
    // digits/spaces, 7-20 chars) — enough to reject obvious garbage without
    // being falsely restrictive on real international numbers, matching the
    // "basic check" the spec calls for rather than full libphonenumber-style
    // validation. Shared by both phone and WhatsApp since they're the same
    // kind of value.
    const isValidPhoneish = (value) => /^\+?[0-9 ]{7,20}$/.test(value);

    const updates = {}; // column name -> new value, only for fields actually provided

    if ('phoneNumber' in req.body) {
      const trimmed = String(req.body.phoneNumber || '').trim();
      if (!isValidPhoneish(trimmed)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid phone number' });
      }
      updates.phone_number = trimmed;
    }

    if ('whatsappNumber' in req.body) {
      // Allowed to be cleared (empty string -> null) — not everyone uses
      // WhatsApp, unlike the phone number which is required at signup.
      const raw = req.body.whatsappNumber;
      const trimmed = raw == null ? '' : String(raw).trim();
      if (trimmed !== '' && !isValidPhoneish(trimmed)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid WhatsApp number' });
      }
      updates.whatsapp_number = trimmed === '' ? null : trimmed;
    }

    if ('preferredContactChannel' in req.body) {
      const channel = String(req.body.preferredContactChannel || '').trim().toLowerCase();
      if (!CONTACT_CHANNELS.includes(channel)) {
        return res.status(400).json({
          success: false,
          error: `preferredContactChannel must be one of: ${CONTACT_CHANNELS.join(', ')}`,
        });
      }
      updates.preferred_contact_channel = channel;
    }

    const before = await q(
      `SELECT phone_number, whatsapp_number, preferred_contact_channel
       FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [userId]
    );
    if (before.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const previous = before[0];

    // Only actually changed fields go into the UPDATE and the audit line —
    // avoids a pointless write and a misleading log entry for a field the
    // investor submitted unchanged (e.g. the frontend always sends all
    // three current values, not just the one they edited).
    const changedColumns = Object.keys(updates).filter((col) => (previous[col] || null) !== (updates[col] || null));

    if (changedColumns.length === 0) {
      return res.json({
        success: true,
        data: {
          PhoneNumber: previous.phone_number,
          WhatsappNumber: previous.whatsapp_number,
          PreferredContactChannel: previous.preferred_contact_channel,
        },
        message: 'No change.',
      });
    }

    // Builds e.g. "phone_number = $1, whatsapp_number = $2" for only the
    // fields that changed, in the same order as `values` below — so $1
    // always lines up with values[0], and userId is appended last, one
    // placeholder past however many fields changed.
    const setClauses = changedColumns.map((col, i) => `${col} = $${i + 1}`);
    const values = changedColumns.map((col) => updates[col]);
    await q(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE user_id = $${values.length + 1}`,
      [...values, userId]
    );

    // This app doesn't have a persisted, queryable audit-log table for
    // low-risk profile fields the way it does for KYC decisions — a console
    // log matches the same lightweight pattern already used for
    // password-reset and account-setup events. If this needs to become
    // queryable later (e.g. for a support ticket), that's a small follow-up,
    // not a reason to block this low-risk field on a bigger table now.
    changedColumns.forEach((col) => {
      console.log(`[profile.contact_updated] user_id=${userId} ${col}: "${previous[col] || ''}" -> "${updates[col] || ''}"`);
    });

    const after = await q(
      `SELECT phone_number, whatsapp_number, preferred_contact_channel FROM users WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        PhoneNumber: after[0].phone_number,
        WhatsappNumber: after[0].whatsapp_number,
        PreferredContactChannel: after[0].preferred_contact_channel,
      },
      message: 'Contact information updated.',
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Investor: declared identity — nationality + country of residence ─────────
// New PO requirement #1 (28 July 2026): profile details the investor completes
// AFTER signup, rather than being guessed from their phone dial code.
//
// These are NOT contact fields and deliberately do not live on the contact
// endpoint above. They feed the jurisdiction assessment an admin uses to
// approve or refuse KYC (see assessJurisdiction), so they belong to a
// different risk tier entirely — mixing them into the contact allow-list would
// quietly collapse the tiering REQ-USR-14 sets up.
//
// LOCKED ONCE KYC IS APPROVED — the product owner's explicit decision. Freely
// editable while an application is Pending; afterwards a change needs support,
// exactly as legal name does today. This is the control that prevents the
// obvious bypass now that the jurisdiction check happens at review rather than
// at signup: sign up declaring an acceptable country, get approved, then
// quietly switch nationality to a prohibited one afterwards. Without this
// lock, moving the check to review time would have opened that door.
//
// `nationalities` is an array because Appendix A.16 requires every nationality
// held to be captured for dual/multi-nationals, with the highest risk tier
// among them applying.
app.put('/api/user/profile/identity', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    // Same allow-list-and-reject approach as the contact endpoint: an
    // unexpected field is a 400, never silently dropped, so a client bug that
    // thinks it changed something can't go unnoticed.
    const allowedFields = ['nationalities', 'countryOfResidence', 'usPerson'];
    const bodyKeys = Object.keys(req.body || {});
    const unexpectedKeys = bodyKeys.filter((key) => !allowedFields.includes(key));
    if (unexpectedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unexpected field(s): ${unexpectedKeys.join(', ')}. Only ${allowedFields.join(', ')} can be updated here.`,
      });
    }
    if (bodyKeys.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one field is required' });
    }

    const current = await q(
      `SELECT kyc_status, country_of_residence, nationalities, profile_completed_at, us_person
       FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [userId]
    );
    if (current.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // The lock. Checked server-side against the authenticated session's own
    // row — the frontend also hides the form once approved, but that is a
    // convenience, not the control.
    if (current[0].kyc_status === 'Approved') {
      return res.status(403).json({
        success: false,
        error: 'Your identity details are locked because your verification has been completed. Please contact support to request a change.',
      });
    }

    const updates = {};

    if ('nationalities' in req.body) {
      const raw = req.body.nationalities;
      if (!Array.isArray(raw)) {
        return res.status(400).json({ success: false, error: 'nationalities must be an array of 2-letter country codes' });
      }
      if (raw.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one nationality is required' });
      }
      if (raw.length > 5) {
        return res.status(400).json({ success: false, error: 'At most 5 nationalities can be declared' });
      }
      const normalized = raw.map((c) => String(c ?? '').trim().toUpperCase());
      const invalid = normalized.filter((c) => !/^[A-Z]{2}$/.test(c));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid country code(s): ${invalid.join(', ')}. Use 2-letter ISO codes.`,
        });
      }
      // De-duplicated: declaring the same nationality twice is meaningless and
      // would skew nothing but would look like corrupt data on a compliance record.
      updates.nationalities = [...new Set(normalized)];
    }

    if ('countryOfResidence' in req.body) {
      const value = String(req.body.countryOfResidence ?? '').trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(value)) {
        return res.status(400).json({
          success: false,
          error: 'countryOfResidence must be a 2-letter ISO country code',
        });
      }
      updates.country_of_residence = value;
    }

    // US-person hard gate. Appendix A of the Compliance Manual excludes US
    // citizens, US tax residents and Green Card holders outright in Phase 1, so
    // this is refused at the profile step rather than accepted and then declined
    // later at review — there is no outcome where declaring true leads anywhere,
    // and running someone through document upload first would waste their time
    // and collect personal data we have no basis to hold.
    //
    // Deliberately NOT stored as true: the declaration is refused, so there is
    // nothing to record. Storing it would create a US-person register out of
    // people who never became participants.
    //
    // This is a self-declaration and therefore a speed bump, not enforcement —
    // anyone can answer "no". The real control stays the KYC-NUS declaration
    // document verified at review. A stored `false` here means "said no", never
    // "confirmed not a US person".
    if ('usPerson' in req.body) {
      const value = req.body.usPerson;
      if (typeof value !== 'boolean') {
        return res.status(400).json({ success: false, error: 'usPerson must be true or false' });
      }
      if (value === true) {
        return res.status(403).json({
          success: false,
          code: 'US_PERSON_INELIGIBLE',
          error: 'InReal is not able to accept US persons — this includes US citizens, US tax residents and Green Card holders — during this phase. We are sorry we cannot help on this occasion.',
        });
      }
      updates.us_person = false;
    }

    const previous = current[0];
    const sameArray = (a, b) =>
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

    const changedColumns = Object.keys(updates).filter((col) => {
      if (col === 'nationalities') return !sameArray(previous.nationalities, updates.nationalities);
      // us_person is a boolean, so `|| null` would collapse a genuine false
      // into null and make "first time answering no" look like no change.
      if (col === 'us_person') return previous.us_person !== updates.us_person;
      return (previous[col] || null) !== (updates[col] || null);
    });

    if (changedColumns.length === 0) {
      return res.json({
        success: true,
        data: {
          Nationalities: previous.nationalities,
          CountryOfResidence: previous.country_of_residence,
          UsPerson: previous.us_person,
          ProfileCompletedAt: previous.profile_completed_at,
        },
        message: 'No change.',
      });
    }

    // profile_completed_at is stamped once both fields are present — it marks
    // that the investor has finished the post-signup step, which is what the
    // frontend uses to decide whether to keep prompting them.
    const willHaveNationalities = updates.nationalities || previous.nationalities;
    const willHaveResidence = updates.country_of_residence || previous.country_of_residence;
    const stampCompletion = Boolean(willHaveNationalities && willHaveResidence) && !previous.profile_completed_at;

    const setClauses = changedColumns.map((col, i) => `${col} = $${i + 1}`);
    const values = changedColumns.map((col) => updates[col]);
    if (stampCompletion) setClauses.push('profile_completed_at = NOW()');

    await q(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE user_id = $${values.length + 1}`,
      [...values, userId]
    );

    changedColumns.forEach((col) => {
      const before = Array.isArray(previous[col]) ? previous[col].join('+') : (previous[col] || '');
      const after = Array.isArray(updates[col]) ? updates[col].join('+') : (updates[col] || '');
      console.log(`[profile.identity_updated] user_id=${userId} ${col}: "${before}" -> "${after}"`);
    });

    const after = await q(
      `SELECT nationalities, country_of_residence, us_person, profile_completed_at
       FROM users WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        Nationalities: after[0].nationalities,
        CountryOfResidence: after[0].country_of_residence,
        UsPerson: after[0].us_person,
        ProfileCompletedAt: after[0].profile_completed_at,
      },
      message: 'Identity details updated.',
    });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Investor: bank details (C.1 item 6 — the highest-risk item on the pilot
// list; see the tracker's C.0.3/C.4 notes on why this one isn't allowed to
// be shortcut). Unlike contact-info editing, a request here NEVER touches
// the live bank fields directly — it only ever creates a pending row that
// an admin has to separately approve. See bank-detail-request below for the
// step-up requirement that gates even creating that pending row.

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const digits = String(accountNumber);
  if (digits.length <= 4) return '••••';
  return `••••${digits.slice(-4)}`;
}

// GET /api/user/profile/bank-details — the investor's own CURRENT (live,
// already-approved) bank details, masked. Never the full account number —
// there's no legitimate reason the investor's own browser needs to display
// the whole thing back to them once it's already on file.
app.get('/api/user/profile/bank-details', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const rows = await q(
      `SELECT bank_account_holder_name, bank_name, bank_account_number_encrypted, bank_swift_bic, bank_country_code, bank_account_linked
       FROM users WHERE user_id = $1 AND is_active = true AND is_deleted = false`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const row = rows[0];

    if (!row.bank_account_linked || !row.bank_account_number_encrypted) {
      return res.json({ success: true, data: { linked: false } });
    }

    const accountNumber = decryptValue(row.bank_account_number_encrypted);
    res.json({
      success: true,
      data: {
        linked: true,
        accountHolderName: row.bank_account_holder_name,
        bankName: row.bank_name,
        maskedAccountNumber: maskAccountNumber(accountNumber),
        swiftBic: row.bank_swift_bic,
        countryCode: row.bank_country_code,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    if (String(error.message || '').includes('TOTP_ENCRYPTION_KEY')) {
      return res.status(500).json({ success: false, error: 'This feature is not yet configured on this server.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/user/bank-detail-requests — the investor's own change requests
// and their status (pending/verified/rejected), so they can see where a
// request stands without contacting support. Masked the same way as above.
app.get('/api/user/bank-detail-requests', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const rows = await q(
      `SELECT request_id AS "RequestID", status AS "Status", rejection_note AS "RejectionNote",
              created_at AS "CreatedAt", reviewed_at AS "ReviewedAt"
       FROM bank_detail_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/user/profile/bank-detail-request — the ONLY way an investor can
// propose a bank-detail change. Requires a fresh, valid TOTP code in the
// same request (step-up) — without it, this never even creates a pending
// row. Creating the row itself doesn't touch the live bank fields; an admin
// has to separately verify it (see /api/ops/bank-detail-requests/:id/verify).
app.post('/api/user/profile/bank-detail-request', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const { code, accountHolderName, bankName, accountNumber, swiftBic, countryCode } = req.body;

    const hasValidCode = await verifyFreshTotpCode(userId, code);
    if (!hasValidCode) {
      return res.status(400).json({
        success: false,
        error: 'A valid authenticator code is required to change bank details. Set up two-factor authentication in Security settings first if you haven\'t already.',
      });
    }

    if (!accountHolderName || !bankName || !accountNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'accountHolderName, bankName, accountNumber, and countryCode are required',
      });
    }
    const trimmedAccountNumber = String(accountNumber).trim();
    if (trimmedAccountNumber.length < 4) {
      return res.status(400).json({ success: false, error: 'Please enter a valid account number' });
    }

    const before = await q(
      `SELECT bank_account_holder_name, bank_name, bank_account_number_encrypted, bank_swift_bic, bank_country_code
       FROM users WHERE user_id = $1`,
      [userId]
    );
    const priorValues = before.length > 0 ? before[0] : null;

    const proposedValues = {
      accountHolderName: String(accountHolderName).trim(),
      bankName: String(bankName).trim(),
      accountNumber: trimmedAccountNumber,
      swiftBic: swiftBic ? String(swiftBic).trim() : null,
      countryCode: String(countryCode).trim().toUpperCase(),
    };

    // Prior values are stored encrypted too — a snapshot of what's about to
    // be replaced, kept for the admin's review screen and for the record,
    // never re-decrypted-and-shown anywhere except that review screen.
    const priorValuesForStorage = priorValues
      ? {
          accountHolderName: priorValues.bank_account_holder_name,
          bankName: priorValues.bank_name,
          accountNumber: priorValues.bank_account_number_encrypted
            ? decryptValue(priorValues.bank_account_number_encrypted)
            : null,
          swiftBic: priorValues.bank_swift_bic,
          countryCode: priorValues.bank_country_code,
        }
      : null;

    const inserted = await q(
      `INSERT INTO bank_detail_requests (user_id, proposed_values_encrypted, prior_values_encrypted, step_up_verified_at, status)
       VALUES ($1, $2, $3, NOW(), 'pending')
       RETURNING request_id AS "RequestID", created_at AS "CreatedAt"`,
      [
        userId,
        encryptValue(JSON.stringify(proposedValues)),
        priorValuesForStorage ? encryptValue(JSON.stringify(priorValuesForStorage)) : null,
      ]
    );

    // Matches the lightweight console-log audit pattern used elsewhere in
    // this app (password-reset, account-setup, contact-info) — never logs
    // the actual account number, only that a request happened.
    console.log(`[bank_detail.change_requested] user_id=${userId} request_id=${inserted[0].RequestID}`);

    res.json({
      success: true,
      data: { requestId: inserted[0].RequestID, createdAt: inserted[0].CreatedAt },
      message: 'Your bank detail change has been submitted for review. This can take up to 2 business days.',
    });
  } catch (error) {
    console.error('API error:', error);
    if (String(error.message || '').includes('TOTP_ENCRYPTION_KEY')) {
      return res.status(500).json({ success: false, error: 'This feature is not yet configured on this server.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



app.get('/api/user/documents', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    // The property join is a LEFT join, deliberately: a document with no
    // property is a general document, which is a normal and permanent state,
    // not missing data. An inner join would silently hide every general
    // document from the investor's own list.
    //
    // The scoping that matters is unchanged — `WHERE d.user_id = $1` against
    // the authenticated session. property_id is only a grouping label here and
    // is never used to find documents; see the note in migration 09.
    const rows = await q(
      `SELECT
         d.document_id          AS "DocumentID",
         d.category             AS "Category",
         d.label                AS "Label",
         d.original_file_name   AS "OriginalFileName",
         d.mime_type            AS "MimeType",
         d.created_at           AS "CreatedAt",
         d.property_id          AS "PropertyID",
         p.property_name        AS "PropertyName",
         p.city                 AS "PropertyCity"
       FROM user_documents d
       LEFT JOIN properties p ON p.property_id = d.property_id
       WHERE d.user_id = $1 AND d.is_superseded = false
         AND d.visibility = 'investor_visible'
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/user/documents/:id/file — an investor downloading their OWN
// document. The WHERE clause below checks user_id against the authenticated
// session, not anything client-supplied — the :id in the URL alone is never
// treated as sufficient. A document that exists but belongs to someone else
// gets the identical 404 as one that doesn't exist at all, so this endpoint
// can't be used to enumerate which document ids are real.
app.get('/api/user/documents/:id/file', async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid document id' });
    }

    // The visibility filter belongs HERE as much as on the list query, and
    // omitting it here would be the whole control failing while appearing to
    // work. Hiding a row from the list only removes the link; document ids are
    // small sequential integers, so anyone who can call this endpoint can walk
    // them. A list-only filter is the classic broken-object-level-authorisation
    // shape: the UI stops showing it, the API keeps serving it.
    //
    // An operator_only document deliberately returns the SAME 404 as one that
    // does not exist and one belonging to somebody else. There is no separate
    // 403, because a distinguishable response would confirm that a document
    // exists on this investor's file that they are not allowed to see — and for
    // SAR-supporting material, confirming its existence is itself the
    // tipping-off that Compliance Manual §8 prohibits. Same no-enumeration-signal
    // reasoning as the cross-user case D.2 established.
    const rows = await q(
      `SELECT file_name, original_file_name, mime_type
       FROM user_documents
       WHERE document_id = $1 AND user_id = $2
         AND visibility = 'investor_visible'`,
      [documentId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(rows[0].file_name);
    if (downloadError || !data) {
      console.error('Supabase Storage download error:', downloadError);
      return res.status(404).json({ success: false, error: 'Document file not found' });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const safeDownloadName = String(rows[0].original_file_name || 'document').replace(/"/g, '');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('API error:', error); res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  // A request body that's too large for express.json's limit lands here as
  // a distinct error type, not a normal application error — give it its own
  // clear, correct response instead of the generic 500 below. Before this,
  // an oversized upload (or, more confusingly, a legitimate ~7MB photo that
  // only became "oversized" after base64 encoding — see the limit comment
  // above) surfaced as an unhelpful "Internal server error" with no
  // indication of what actually went wrong.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 8 MB.',
    });
  }

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
    await ensureKycDecisionsTable();
    await ensurePasswordResetTable();
    await ensureUserDocumentsTable();
    await ensureDocumentsBucket();
    await ensureUserSearchIndex();
    await bootstrapAdminUsers();

    const server = app.listen(PORT, () => {
      console.log(`\nInReal API Server running on http://localhost:${PORT}`);
      console.log(`Health check: GET http://localhost:${PORT}/api/health`);
      // Stated at boot because the difference is invisible at runtime
      // otherwise: unconfigured mail fails silently by design, and "the
      // investor never got the email" is a much harder thing to diagnose
      // after the fact than at startup.
      console.log(
        isMailConfigured()
          ? `Email delivery: enabled (setup and reset codes will be emailed)`
          : `Email delivery: DISABLED — set RESEND_API_KEY and MAIL_FROM to enable. Codes are logged here for manual relay.`
      );
      console.log('');
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