Render (Backend) + Vercel (Frontend) deployment guide

Overview
- Backend: Render Web Service running `node server.postgres.js`, connected to Supabase Postgres.
- Frontend: Vercel static site serving Vite build output (`dist`).

Prereqs
- GitHub repo pushed (done).
- Supabase project provisioned with the demo schema executed (run `database/pg/01-create-schema-postgres.sql` and `02-seed-demo-data-postgres.sql` in Supabase SQL Editor).
- Render and Vercel accounts (free tier) connected to your GitHub account.

Render (Backend)
1. In Render, create a new "Web Service".
   - Connect your GitHub account and choose the repo `hafabdulla/InReal-Demo` and branch `main`.
   - Environment: `Node`
   - Start Command: `node server.postgres.js`
   - Build Command: (leave blank)
   - Health check path: `/api/health`
2. Add environment variables in Render (Dashboard → Environment → Add):
   - `DATABASE_URL` = your Supabase connection string (use Session Pooler URI if available)
   - `DB_SSL` = `true`
   - `API_PORT` = `5000`
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your frontend URL (set after Vercel deploy)
3. Deploy. Verify:
   - `GET https://<your-render-service>.onrender.com/api/health` returns `{ status: 'ok', database: 'connected' }`.

Vercel (Frontend)
1. In Vercel, create a new Project → Import Git Repository (`hafabdulla/InReal-Demo`).
2. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment variables (Vercel Dashboard → Settings → Environment Variables):
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com`
4. Deploy. Verify site and portal flows.

Notes & Post-deploy Checklist
- Do NOT commit `.env` — keep secrets in Render/Vercel secret vars.
- For Supabase DB, run the SQL files in the Supabase SQL Editor to create schema + demo data.
- After backend is live, run the db seed (or run `tools/setup-postgres-db.js` once with `DATABASE_URL` set) to ensure demo users exist.
- Set `FRONTEND_URL` in Render to the Vercel URL so CORS works.
- Enable HTTPS and confirm all third-party integrations (S3/Cloud storage) are configured before demo.

If you want, I can continue by creating the Render service and Vercel project via CLI steps (you'll authenticate), or I can prepare the exact environment variable values to paste into each dashboard.
