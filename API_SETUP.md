# InReal Backend API Setup

## Quick Start

### 1. Create `.env` in the project root

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
DB_SSL=true
API_PORT=5000
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:5000
ADMIN_EMAILS=you@example.com
NODE_ENV=development
```

`DATABASE_URL` is your Postgres connection string (Supabase provides this in **Project Settings → Database**).

### 2. Set up the database (first time only)

```bash
npm run db:setup
```

This runs the schema and seed scripts in `database/pg/`.

### 3. Start the app

```bash
npm run dev
```

This starts both the API server (`server.js` on port 5000) and the Vite frontend (port 3000).

To run them separately:

```bash
npm run dev:backend    # API only
npm run dev:frontend   # Frontend only
```

---

## Authentication

Login requires **email and password**.

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "sarah.chen@email.com",
  "password": "Demo123!"
}
```

On success the response includes a `token` (demo bearer token) and user profile data. The frontend stores this in `localStorage` under `inreal_session`.

Protected endpoints require:

```
Authorization: Bearer demo-token-{userId}
```

### Demo accounts

| Email | Password | Status |
|-------|----------|--------|
| sarah.chen@email.com | Demo123! | Verified |
| james.smith@email.com | Demo123! | Verified |
| michael.johnson@email.com | Demo123! | Verified |
| aisha.mohammed@email.com | Demo123! | Verified |
| david.lee@email.com | Demo123! | Verified |
| priya.kumar@email.com | Demo123! | Pending (cannot log in until verified) |

New users can register via `POST /api/auth/signup` with email, password, and profile fields.

### User roles (`user` | `admin`)

Every account has a `role` on the `users` table (default: `user`). Admin-only API routes return **403 Admin access required** for normal investors.

**Promote someone to admin (pick one):**

1. **`.env` bootstrap (recommended)** — add emails to `ADMIN_EMAILS` (comma-separated). On server start, matching users are set to `role = 'admin'`:

   ```env
   ADMIN_EMAILS=sarah.chen@email.com,ops@investinreal.io
   ```

   Restart the API after changing this.

2. **Supabase SQL editor** — run once for a specific user:

   ```sql
   UPDATE users SET role = 'admin', updated_at = NOW()
   WHERE email = 'sarah.chen@email.com';
   ```

Login and `GET /api/auth/me` both return `"Role": "admin"` or `"Role": "user"` in the user object.

### How to test admin access

**1. Promote a test user** (e.g. Sarah) via SQL or `ADMIN_EMAILS`, then restart the API.

**2. Login as that user** and copy the `token` from the response.

**3. Call an admin endpoint with the token:**

```bash
# Should succeed for admin
curl http://localhost:5000/api/ops/investment-intents \
  -H "Authorization: Bearer demo-token-1"

# Should return 403 for a normal user (e.g. demo-token-2 after login as James)
curl http://localhost:5000/api/ops/investment-intents \
  -H "Authorization: Bearer demo-token-2"
```

**4. Without a token** — expect `401 Unauthorized`:

```bash
curl http://localhost:5000/api/ops/investment-intents
```

**5. Check role from the browser** — after logging in at `/auth`, open DevTools → Application → Local Storage → `inreal_session` and confirm `user.Role` is `"admin"` or `"user"`.

Or call:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer demo-token-1"
```

---

## API Endpoints

### Health

```bash
GET /api/health
```

### Properties

```bash
GET /api/properties
GET /api/properties/:id
```

### Auth

```bash
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/me          # requires Bearer token; returns Role
```

### User (authenticated)

```bash
GET /api/user/:userId/portfolio
GET /api/user/:userId/distributions
GET /api/user/:userId/intents
```

### Investment intents (authenticated)

```bash
POST /api/investment-intents
POST /api/investment-intents/:reference/proof
GET  /api/investment-intents/:reference/proof
```

### Ops (admin only)

```bash
GET  /api/ops/investment-intents
POST /api/ops/investment-intents/:reference/review
```

### Admin (admin only)

```bash
GET /api/users
```

---

## Testing with curl

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.chen@email.com","password":"Demo123!"}'

# Portfolio (replace token with value from login response)
curl http://localhost:5000/api/user/1/portfolio \
  -H "Authorization: Bearer demo-token-1"
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (required) |
| `DB_SSL` | Set to `false` for local Postgres without SSL; `true` for Supabase (default) |
| `API_PORT` | Backend port (default: 5000) |
| `FRONTEND_URL` | Frontend origin for CORS (comma-separated for multiple) |
| `VITE_API_URL` | API base URL used by the React frontend |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to `admin` on server start |
| `BANK_BENEFICIARY_NAME` | Transfer instructions for investment intents |
| `BANK_NAME` | Bank name for transfer instructions |
| `BANK_IBAN` | IBAN for transfer instructions |
| `BANK_SWIFT` | SWIFT code for transfer instructions |

---

## Deployment

| Service | Role |
|---------|------|
| **Vercel** | Frontend static build (`npm run build`) |
| **Render** | Backend (`node server.js`) — see `render.yaml` |
| **Supabase** | Hosted Postgres (`DATABASE_URL`) |

Set `VITE_API_URL` to your Render backend URL when building for production. Set `FRONTEND_URL` on Render to your Vercel domain for CORS.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Missing DATABASE_URL` | Add `DATABASE_URL` to `.env` |
| `ERR_CONNECTION_REFUSED` on API | Run `npm run dev:backend` or `npm run dev` |
| CORS errors | Set `FRONTEND_URL` to match your frontend origin |
| Login returns 401 | Check email/password; user must be identity-verified |
| Empty properties | Run `npm run db:setup` to seed the database |

---

## Related docs

- **Postgres schema:** `database/pg/01-create-schema-postgres.sql`
- **Seed data:** `database/pg/02-seed-demo-data-postgres.sql`
- **Schema overview:** `DATABASE_SCHEMA.md`
