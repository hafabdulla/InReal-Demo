/**
 * ONE-OFF: remove test accounts from the shared Supabase database.
 *
 * ⚠️  DO NOT REUSE THIS AS THE BASIS FOR AN ACCOUNT-DELETION FEATURE.
 *
 * This hard-deletes kyc_decisions and user_documents. That is correct for
 * fabricated test data and wrong for anybody real: Compliance Manual §9
 * requires seven years' retention of all KYC documentation, screening results,
 * transaction records and compliance decisions, and the PRD explicitly forbids
 * deleting filed documents (REQ-DOC-01..08). An investor exercising a right to
 * erasure is legitimately refused for the compliance file.
 *
 * The compliant shape for a real account is CLOSE, not DELETE — set
 * users.is_deleted (26 endpoints already respect it), record who did it and
 * why, and leave every KYC and transaction record intact. See D.35.
 *
 * READ THIS BEFORE RUNNING. It deletes ~99 of 109 user rows and everything
 * attached to them, against the SAME database production uses. There is no
 * separate staging environment.
 *
 * What it does, in order:
 *   1. Writes a full JSON snapshot of every row it is about to delete, so the
 *      operation is recoverable. Nothing is deleted until that file exists.
 *   2. Writes the storage paths of affected documents to a text file — the
 *      Supabase Storage bucket is NOT touched by this script, and those files
 *      would otherwise be orphaned with no record of which they were.
 *   3. Deletes children first (every FK is ON DELETE NO ACTION, so nothing
 *      cascades on its own), then the users, inside a single transaction that
 *      rolls back completely on any error.
 *
 * Run with:  node cleanup-test-data.mjs
 * Dry run:   node cleanup-test-data.mjs --dry-run    (rolls back, prints counts)
 */
import 'dotenv/config';
import pg from 'pg';
import { writeFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');

// ── THE KEEP LIST ───────────────────────────────────────────────────────────
// Explicit IDs, not a name pattern. A pattern that drifts deletes the wrong
// people; ten numbers cannot. Confirmed with the product owner 05 Aug 2026.
const KEEP = [
  2,   // james.smith@email.com              — finance_admin, 2FA enrolled
  4,   // abdullakhaliq22@gmail.com
  5,   // abdullakhaliq3456@gmail.com
  6,   // mckenzey.connor.harrison@gmail.com — product owner, super_admin
  34,  // abdullakhaliq121@gmail.com
  56,  // abdullageo121@gmail.com
  78,  // hafiz.a@useentropy.com             — super_admin
  114, // i230030@isb.nu.edu.pk
  115, // carlo.mancini2@gmail.com           — product owner, super_admin
  123, // testadmin1@gmail.com               — super_admin
];

// Children of users, deleted before the users themselves.
//
// ORDER MATTERS and is not arbitrary. `transactions` must precede
// `investments` because transactions.related_investment_id points at it, and
// `investor_distributions` has to go before both — it is handled separately
// below because it has no user_id of its own and can only be reached through
// the investment it belongs to. The first dry run failed on exactly that
// constraint, which is the whole reason the dry run exists.
const CHILD_TABLES = [
  'password_reset_tokens', 'user_totp', 'transactions', 'investments',
  'user_documents', 'kyc_decisions', 'bank_detail_requests',
  'portfolio_adjustments', 'admin_role_grants', 'admin_users',
];

// Columns where a user appears as the ACTOR rather than the subject — a test
// admin who approved something. Checked on 05 Aug: none of these point at a
// kept user, so only test-on-test rows are removed and no real audit history
// is lost. THAT CHECK IS RE-RUN BELOW rather than trusted.
const ACTOR_COLUMNS = [
  ['kyc_decisions', 'admin_user_id'],
  ['user_documents', 'uploaded_by_admin_id'],
  ['admin_role_grants', 'performed_by'],
  ['admin_users', 'granted_by'],
  ['admin_users', 'revoked_by'],
  ['portfolio_adjustments', 'created_by'],
  ['bank_detail_requests', 'reviewed_by'],
];

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});
await c.connect();

const { rows: doomed } = await c.query(
  'SELECT user_id, email FROM users WHERE user_id <> ALL($1::int[]) ORDER BY user_id',
  [KEEP]
);
const ids = doomed.map((r) => r.user_id);
const { rows: keptRows } = await c.query(
  'SELECT user_id, email FROM users WHERE user_id = ANY($1::int[]) ORDER BY user_id',
  [KEEP]
);

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Keeping ${keptRows.length}, removing ${ids.length}.\n`);
console.log('KEEPING:');
for (const k of keptRows) console.log(`  #${String(k.user_id).padEnd(4)} ${k.email}`);
console.log('');

if (keptRows.length !== KEEP.length) {
  console.error(`ABORTING: expected to keep ${KEEP.length} accounts but found ${keptRows.length}.`);
  console.error('An ID in the keep list does not exist. Check it before running again.');
  await c.end();
  process.exit(1);
}

// ── Safety re-check: no test account may have acted on a KEPT user ──────────
let blockers = 0;
for (const [table, col] of ACTOR_COLUMNS) {
  const { rows } = await c.query(
    `SELECT COUNT(*)::int n FROM ${table} t
      WHERE t.${col} = ANY($1::int[]) AND t.user_id = ALL($2::int[])`,
    [ids, KEEP]
  );
  if (rows[0].n > 0) {
    console.error(`BLOCKER: ${table}.${col} has ${rows[0].n} row(s) where a removed account acted on a kept user.`);
    blockers += rows[0].n;
  }
}
if (blockers > 0) {
  console.error('\nABORTING: deleting these would destroy audit history belonging to a kept account.');
  await c.end();
  process.exit(1);
}
// Second safety check: a KEPT user's transaction must not point at a removed
// user's investment. Same shape of problem as the actor columns — it would
// mean deleting something a kept account still depends on.
const { rows: crossTx } = await c.query(
  `SELECT COUNT(*)::int n FROM transactions t
    WHERE t.user_id = ALL($2::int[])
      AND t.related_investment_id IN (SELECT investment_id FROM investments WHERE user_id = ANY($1::int[]))`,
  [ids, KEEP]
);
if (crossTx[0].n > 0) {
  console.error(`BLOCKER: ${crossTx[0].n} transaction(s) on a kept account reference a removed account's investment.`);
  await c.end();
  process.exit(1);
}
console.log('Safety check passed: no removed account has acted on a kept one.\n');

// ── Snapshot before touching anything ──────────────────────────────────────
const snapshot = { takenAt: new Date().toISOString(), keptUserIds: KEEP, tables: {} };
for (const t of CHILD_TABLES) {
  snapshot.tables[t] = (await c.query(`SELECT * FROM ${t} WHERE user_id = ANY($1::int[])`, [ids])).rows;
}
snapshot.tables.investor_distributions = (await c.query(
  `SELECT * FROM investor_distributions
    WHERE investment_id IN (SELECT investment_id FROM investments WHERE user_id = ANY($1::int[]))`,
  [ids]
)).rows;
snapshot.tables.users = (await c.query('SELECT * FROM users WHERE user_id = ANY($1::int[])', [ids])).rows;

const snapPath = `db-cleanup-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(snapPath, JSON.stringify(snapshot, null, 2));
console.log(`Snapshot: ${snapPath} (${(JSON.stringify(snapshot).length / 1024).toFixed(0)} KB)`);

// `file_name` holds the Supabase Storage key (`<user_id>/<timestamp>-<name>`),
// not a display name — see the upload handler in server.js. `original_file_name`
// is the human-readable one. Guessing the wrong column here silently produced
// an empty list on the first run, which would have left every file orphaned
// with no record of which they were.
const storagePaths = snapshot.tables.user_documents.map((d) => d.file_name).filter(Boolean);
writeFileSync('db-cleanup-orphaned-storage-paths.txt', storagePaths.join('\n'));
console.log(`Storage paths: db-cleanup-orphaned-storage-paths.txt (${storagePaths.length} files)\n`);

// ── Delete ─────────────────────────────────────────────────────────────────
await c.query('BEGIN');
const removed = {};
try {
  // Reached only through its investment — it has no user_id column of its own.
  // Must go before `investments`, and therefore before the loop below.
  removed.investor_distributions = (await c.query(
    `DELETE FROM investor_distributions
      WHERE investment_id IN (SELECT investment_id FROM investments WHERE user_id = ANY($1::int[]))`,
    [ids]
  )).rowCount;

  for (const t of CHILD_TABLES) {
    removed[t] = (await c.query(`DELETE FROM ${t} WHERE user_id = ANY($1::int[])`, [ids])).rowCount;
  }
  for (const [t, col] of ACTOR_COLUMNS) {
    const n = (await c.query(`DELETE FROM ${t} WHERE ${col} = ANY($1::int[])`, [ids])).rowCount;
    if (n) removed[`${t}.${col}`] = n;
  }
  removed.users = (await c.query('DELETE FROM users WHERE user_id = ANY($1::int[])', [ids])).rowCount;

  if (removed.users !== ids.length) {
    throw new Error(`Expected to delete ${ids.length} users, deleted ${removed.users}.`);
  }

  if (DRY_RUN) {
    await c.query('ROLLBACK');
    console.log('DRY RUN — rolled back, nothing was deleted.\n');
  } else {
    await c.query('COMMIT');
    console.log('COMMITTED.\n');
  }
} catch (e) {
  await c.query('ROLLBACK');
  console.error('ROLLED BACK — nothing was deleted. Reason:', e.message);
  await c.end();
  process.exit(1);
}

console.log('REMOVED:');
for (const [k, v] of Object.entries(removed)) if (v) console.log(`  ${k.padEnd(36)} ${v}`);

const { rows: left } = await c.query(
  `SELECT u.user_id, u.email, a.role
     FROM users u LEFT JOIN admin_users a ON a.user_id = u.user_id
    ORDER BY u.user_id`
);
console.log(`\nREMAINING (${left.length}):`);
for (const u of left) console.log(`  #${String(u.user_id).padEnd(4)} ${u.email.padEnd(40)} ${u.role || ''}`);

if (storagePaths.length) {
  console.log(`\nSTILL TO DO: ${storagePaths.length} files remain in the Supabase Storage bucket.`);
  console.log('This script does not touch Storage. Delete them from the Supabase dashboard');
  console.log('using the paths in db-cleanup-orphaned-storage-paths.txt.');
}
await c.end();
