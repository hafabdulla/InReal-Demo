import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'database', 'pg', '01-create-schema-postgres.sql');
const seedPath = path.join(rootDir, 'database', 'pg', '02-seed-demo-data-postgres.sql');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Set it in .env before running npm run db:setup.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 15000,
});

async function runSqlFile(filePath) {
  const sql = await fs.readFile(filePath, 'utf8');
  await pool.query(sql);
}

async function main() {
  try {
    console.log('Applying PostgreSQL schema...');
    await runSqlFile(schemaPath);
    console.log('Applying PostgreSQL seed data...');
    await runSqlFile(seedPath);
    console.log('Database setup complete.');
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
