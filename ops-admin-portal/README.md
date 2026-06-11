# InReal Operations Admin Portal

Static internal workspace for staff with `role = admin`. Not linked from the public investor site.

## Local development

```bash
# Terminal 1 — API
npm run dev:backend

# Terminal 2 — admin UI
npx serve ops-admin-portal -p 3002
```

Open http://localhost:3002 and sign in with an admin account.

## Deploy to Vercel (separate project)

1. Push this folder to GitHub (it is tracked in the main repo under `ops-admin-portal/`).
2. Vercel → **Add New Project** → same GitHub repo.
3. Settings:
   - **Root Directory:** `ops-admin-portal`
   - **Framework Preset:** Other
   - **Build Command:** (leave empty)
   - **Output Directory:** `.`
4. Deploy. You get a URL like `https://inreal-ops.vercel.app`.
5. Do **not** add a link to this URL on the marketing site.

## Render (API)

Ensure these env vars are set on the backend service:

- `DATABASE_URL` — Supabase Postgres
- `ADMIN_EMAILS` — comma-separated staff emails to promote on startup
- `FRONTEND_URL` — investor Vercel URL; add custom admin domain here if used

CORS: `*.vercel.app` origins are allowed automatically. Custom admin domains must be listed in `FRONTEND_URL`.

## Staff access

1. Person creates an account on the live investor site (or you add them in Supabase `users`).
2. Set `role = admin` via `ADMIN_EMAILS` on Render or SQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'staff@example.com';
   ```
3. They sign in on the admin Vercel URL with the same email and password.

## API wiring

This app calls the same Render API as the investor portal:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users` (admin only)
- `GET /api/ops/investment-intents` (admin only)

Production API URL is set in `config.js` (defaults to `https://inreal-demo.onrender.com` when not on localhost).
