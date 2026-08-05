/**
 * Migration runner for database/pg/*.sql
 *
 * WHY THIS EXISTS
 * Until now, `npm run db:setup` knew about files 01 and 02 by name and nothing
 * else. Migrations 03 onwards were applied by pasting SQL into Supabase's editor
 * by hand, and nothing anywhere recorded which database had received which file.
 * That was survivable only because localhost and production shared one database
 * — a migration run locally WAS the production migration, so it could not be
 * forgotten.
 *
 * The moment those are split, it can be forgotten, and the failure mode is a
 * production 500 on a missing column found by a user. This runner is the
 * prerequisite for splitting them: it makes "which migrations does this database
 * have?" a question you can actually ask.
 *
 * USAGE
 *   node tools/migrate.mjs --status              what is applied vs pending
 *   node tools/migrate.mjs                       apply pending migrations
 *   node tools/migrate.mjs --with-seed           also apply seed files
 *   node tools/migrate.mjs --baseline            mark all as applied WITHOUT running
 *   node tools/migrate.mjs --url "postgres://…"  target a specific database
 *
 * --baseline exists for the production database, which already has all twelve
 * migrations applied but no record of it. Running them again would be wrong:
 * they are individually idempotent, but 02 seeds demo data and re-running it
 * would put fabricated rows back into a database that was just cleaned of them.
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'pg');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const MODE = has('--status') ? 'status' : has('--baseline') ? 'baseline' : 'up';
const WITH_SEED = has('--with-seed');
// --prod reads PRODUCTION_DATABASE_URL from .env. It exists because the
// alternative — pasting the production connection string on the command line
// every time — is both easy to get wrong and easy to leave in shell history.
// Now that local and production are separate databases, applying a migration to
// production is a routine step rather than an exceptional one, and a routine
// step needs a short, unambiguous command.
const USE_PROD = has('--prod');
if (USE_PROD && !process.env.PRODUCTION_DATABASE_URL) {
  console.error('--prod needs PRODUCTION_DATABASE_URL in .env. Add it (the Sydney/production');
  console.error('connection string) alongside DATABASE_URL, which stays pointed at local.');
  process.exit(1);
}
const DATABASE_URL = USE_PROD
  ? process.env.PRODUCTION_DATABASE_URL
  : (valueOf('--url') || process.env.DATABASE_URL);

if (!DATABASE_URL) {
  console.error('No database URL. Set DATABASE_URL in .env, or pass --url "postgres://…".');
  process.exit(1);
}

// A seed file is data, not schema. Applying one to production is how a database
// that was just cleaned of fabricated rows gets refilled with them, so it never
// happens implicitly.
const isSeed = (filename) => /seed/i.test(filename);

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+.*\.sql$/i.test(f))
    // Numeric sort on the leading digits — plain lexical sort puts 10 before 2.
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b))
    .map((filename) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      return {
        filename,
        sql,
        seed: isSeed(filename),
        checksum: createHash('sha256').update(sql).digest('hex').slice(0, 16),
      };
    });
}

// Shown before anything happens. Pointing this at the wrong database is the
// expensive mistake, and a host is the only part of a connection string that
// makes it obvious which one you are about to change.
function describeTarget(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ':' + u.port : ''}  db=${u.pathname.replace(/^\//, '') || '(default)'}`;
  } catch {
    return '(unparseable connection string)';
  }
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

// A wrong connection string is the most likely thing to go wrong here, and it
// happens before anything else. Say so plainly rather than dumping a driver
// stack trace — the useful information is which host was tried, not where in
// pg the socket gave up.
try {
  await client.connect();
} catch (error) {
  console.error(`\nCould not connect to ${describeTarget(DATABASE_URL)}`);
  console.error(`  ${error.message}\n`);
  console.error('Check DATABASE_URL in .env, or the --url you passed. For Supabase, use the');
  console.error('pooler connection string from Project Settings → Database.');
  process.exit(1);
}

console.log(`\nTarget: ${describeTarget(DATABASE_URL)}`);
console.log(`Mode:   ${MODE}${WITH_SEED ? ' (including seed files)' : ''}\n`);

// The tracking table is itself created idempotently, so a database that has
// never seen this runner and one that has are handled by the same path.
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT PRIMARY KEY,
    checksum    TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by  TEXT,
    baselined   BOOLEAN NOT NULL DEFAULT FALSE
  )
`);

const migrations = loadMigrations();
const { rows: appliedRows } = await client.query('SELECT * FROM schema_migrations');
const applied = new Map(appliedRows.map((r) => [r.filename, r]));

// ── status ─────────────────────────────────────────────────────────────────
if (MODE === 'status') {
  console.log('FILE                                     STATE      NOTE');
  console.log('-'.repeat(78));
  let pending = 0;
  for (const m of migrations) {
    const record = applied.get(m.filename);
    let state = 'PENDING';
    let note = m.seed ? 'seed data — needs --with-seed' : '';
    if (record) {
      state = record.baselined ? 'BASELINED' : 'APPLIED';
      // A migration edited after being applied means the file on disk no longer
      // describes the database. Silent drift is the thing worth catching.
      if (record.checksum !== m.checksum) {
        state = 'CHANGED';
        note = 'file edited since it was applied — the database does not match it';
      }
    } else {
      pending++;
    }
    console.log(`${m.filename.padEnd(40)} ${state.padEnd(10)} ${note}`);
  }
  const orphans = appliedRows.filter((r) => !migrations.some((m) => m.filename === r.filename));
  for (const o of orphans) {
    console.log(`${o.filename.padEnd(40)} ${'MISSING'.padEnd(10)} recorded as applied but the file is gone`);
  }
  console.log(`\n${applied.size} recorded, ${pending} pending.`);
  await client.end();
  process.exit(0);
}

// ── baseline ───────────────────────────────────────────────────────────────
if (MODE === 'baseline') {
  const toMark = migrations.filter((m) => !applied.has(m.filename));
  if (toMark.length === 0) {
    console.log('Nothing to baseline — every migration is already recorded.');
    await client.end();
    process.exit(0);
  }
  console.log('This will RECORD the following as applied WITHOUT running them:');
  for (const m of toMark) console.log(`  ${m.filename}`);
  console.log('\nOnly correct if this database already has all of them (i.e. the existing');
  console.log('production database). On an empty database this leaves you with a tracking');
  console.log('table that lies, and no schema.\n');

  if (!(await confirm('Baseline this database?'))) {
    console.log('Cancelled — nothing changed.');
    await client.end();
    process.exit(0);
  }
  for (const m of toMark) {
    await client.query(
      `INSERT INTO schema_migrations (filename, checksum, applied_by, baselined)
       VALUES ($1, $2, $3, TRUE) ON CONFLICT (filename) DO NOTHING`,
      [m.filename, m.checksum, 'baseline']
    );
  }
  console.log(`\nBaselined ${toMark.length} migration(s). Run --status to confirm.`);
  await client.end();
  process.exit(0);
}

// ── up ─────────────────────────────────────────────────────────────────────
// Refuse to proceed if a migration already applied has since been edited. The
// database and the file have diverged, and running the *next* migration on top
// of that mismatch buries the problem deeper.
const changed = migrations.filter((m) => {
  const r = applied.get(m.filename);
  return r && r.checksum !== m.checksum;
});
if (changed.length > 0) {
  console.error('REFUSING TO RUN — these were applied and have since been edited:\n');
  for (const m of changed) console.error(`  ${m.filename}`);
  console.error('\nA migration is a record of what was done, not a document to revise. Add a');
  console.error('new numbered migration with the change instead. If the edit was cosmetic and');
  console.error('the database really does match, update its checksum in schema_migrations.');
  await client.end();
  process.exit(1);
}

const pending = migrations.filter((m) => !applied.has(m.filename) && (WITH_SEED || !m.seed));
const skippedSeeds = migrations.filter((m) => !applied.has(m.filename) && m.seed && !WITH_SEED);

if (pending.length === 0) {
  console.log('Nothing to apply — the database is up to date.');
  if (skippedSeeds.length) {
    console.log(`(${skippedSeeds.length} seed file(s) not applied. Use --with-seed on a dev database if you want demo data.)`);
  }
  await client.end();
  process.exit(0);
}

console.log('Will apply:');
for (const m of pending) console.log(`  ${m.filename}${m.seed ? '   [SEED DATA]' : ''}`);
if (skippedSeeds.length) {
  console.log('\nSkipping (seed data, use --with-seed if wanted):');
  for (const m of skippedSeeds) console.log(`  ${m.filename}`);
}
console.log('');

if (!(await confirm(`Apply ${pending.length} migration(s) to ${describeTarget(DATABASE_URL)}?`))) {
  console.log('Cancelled — nothing changed.');
  await client.end();
  process.exit(0);
}

for (const m of pending) {
  process.stdout.write(`  ${m.filename} … `);
  // One transaction per migration: a failure leaves that file's changes fully
  // rolled back rather than half-applied, which is the state nothing can
  // recover from automatically.
  await client.query('BEGIN');
  try {
    await client.query(m.sql);
    await client.query(
      `INSERT INTO schema_migrations (filename, checksum, applied_by) VALUES ($1, $2, $3)`,
      [m.filename, m.checksum, process.env.USER || process.env.USERNAME || 'unknown']
    );
    await client.query('COMMIT');
    console.log('ok');
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('FAILED');
    console.error(`\n${m.filename} failed and was rolled back:\n  ${error.message}\n`);
    console.error('Nothing after it was attempted. Fix the migration and run again —');
    console.error('everything before it stays applied and will be skipped.');
    await client.end();
    process.exit(1);
  }
}

console.log(`\nApplied ${pending.length} migration(s).`);
await client.end();
