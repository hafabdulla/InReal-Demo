## Hosted Option 2 Deploy (Free tier): Supabase Postgres + Render + Vercel

This is the fastest hosted path for your meeting link without keeping your laptop online.

### 1) Create Supabase project and run SQL
In Supabase SQL editor, run in order:
1. `database/pg/01-create-schema-postgres.sql`
2. `database/pg/02-seed-demo-data-postgres.sql`

Then copy the Postgres connection string (`DATABASE_URL`) from Supabase project settings.

### 2) Deploy backend on Render
Create a new Web Service from this repository.

Use:
- Build command:
  `npm install`
- Start command:
  `node server.postgres.js`

Set environment variables:
- `NODE_ENV=production`
- `API_PORT=10000`
- `DATABASE_URL=<your-supabase-postgres-url>`
- `DB_SSL=true`
- `FRONTEND_URL=<your-vercel-url>`
- `BANK_BENEFICIARY_NAME=InReal Client Funds`
- `BANK_NAME=Demo Escrow Bank`
- `BANK_IBAN=TH00 0000 0000 0000 0000`
- `BANK_SWIFT=DEMOTHBK`

After deploy, test:
- `GET https://<render-app>.onrender.com/api/health`

### 3) Deploy frontend on Vercel
In Vercel project environment variables add:
- `VITE_API_URL=https://<render-app>.onrender.com`

Deploy and verify:
- `/auth` login works
- `/portal/properties` loads from live backend
- `/portal/properties/:id` loads from live backend

### 4) Demo flow checks
Run through:
1. Login with seeded user email
2. Create investment intent
3. Upload proof
4. Ops queue and approve
5. Status reflects approval

### 5) Security quick checks before sharing link
- CORS only allows Vercel domain + localhost
- Do not expose Supabase service role keys in frontend
- Keep proof files private for production (current setup is demo-only)
