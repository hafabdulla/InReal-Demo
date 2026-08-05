# CLAUDE.md — InReal Platform

Reference for any Claude session (Claude Code or chat) picking up work on this repo. Read this first, then read **`InReal_Master_Tracker.md`** — that's the living, detailed history of every feature built, every bug found, and exactly how each was tested. This file is the map; the tracker is the territory.

## What this is

A real-estate fractional-investment platform, currently in a pre-launch pilot. Investors go through manual KYC (outside the app), get an account created by an admin, and can view/manage their investments, documents, and profile. Admins run everything through a separate ops portal.

## Architecture — three separate deployables, one repo

| Piece | Stack | Deploys to | Notes |
|---|---|---|---|
| Investor site | React + Vite, Tailwind, shadcn | Vercel | `src/`, built with `npm run build` |
| Admin portal | Plain HTML/CSS/vanilla JS, no build step | **Separate** Vercel project | `ops-admin-portal/` — has its own `vercel.json`. A push updates both projects, but check both deploys separately; they've gone out of sync before |
| Backend | Node/Express + `pg` (Postgres via Supabase) | Render | `server.js` — one file, ~3000 lines |

Database is Supabase Postgres, shared between local dev and production (same instance, not separate environments) — a migration you run locally already applies to prod.

## Before touching anything

1. Read `InReal_Master_Tracker.md`, specifically:
   - **The PRODUCT OWNER DECISIONS LOG, before anything else.** Two tables: decisions already given (quoted and dated), and questions still waiting on an answer. Several things in this project have been rebuilt, re-asked, or left blocked purely because a decision lived only in a WhatsApp thread — the re-application mechanism sat marked "blocked" for days after the PO had already answered it. **Never guess an answer that belongs in the second table**, and when a new decision arrives, add it to the first table the same day with the PO's own words, not a paraphrase. The qualifiers are where the compliance risk lives.
   - The **Plain-English Status** table at the top — what's actually live vs. built-but-untested vs. not started.
   - **Part C** — the priority order from the actual client meeting (not the same as technical build-dependency order — both are documented, don't confuse them).
   - The **Engineering Log** (Parts A/B and the D.x entries) — exact bugs found, exact fixes, exact tests run. Several real mistakes happened during this build (a KYC-status value mixup, an email case-sensitivity bug, a CSS grid overflow bug) — all documented there so they aren't rediscovered as "new" issues.
2. Check `database/pg/` for the current schema — numbered migration files (`01` through `11` so far). **Migrations are not auto-applied.** `npm run db:setup` only knows about files `01` and `02` by name. Every migration after that must be manually pasted into Supabase's SQL Editor. Always keep the `.sql` file in the repo for the record even though running it is a separate manual step.

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Everything | Supabase Postgres connection string |
| `DB_SSL` | DB connection | `true` |
| `JWT_SECRET` | Auth | Server refuses to boot without it |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Document storage | Server refuses to boot without these — used for the private Storage bucket, not auth |
| `SUPABASE_DOCUMENTS_BUCKET` | Document storage | Optional, defaults to `user-documents` |
| `TOTP_ENCRYPTION_KEY` | 2FA + bank details + **operator login** | 64 hex chars (32 bytes). Encrypts TOTP secrets AND bank account numbers — one key for both, deliberately (same risk profile, no reason for two). **Checked loudly at boot but NOT fatal** — the server prints a prominent warning and keeps serving. Briefly made a hard `exit(1)` on 05 Aug and reverted the same day: without the key only 2FA, bank details and operator login degrade, so exiting turns a contained failure into a total outage of both portals. The endpoints that need it return a named error instead of an opaque 500 |
| `REQUIRE_OPERATOR_2FA` | Operator login | `true` makes 2FA **mandatory** for operators — an un-enrolled operator is refused with `OPERATOR_2FA_REQUIRED`. Defaults to `false`, which challenges enrolled operators and lets the rest in with a nudge. **Check every operator has actually enrolled before flipping it**, or you lock people out of production; enrolment lives behind this same login, so they cannot fix it themselves |
| `ADMIN_EMAILS` | Admin bootstrap | Comma-separated list; granted admin role on server boot |
| `FRONTEND_URL` | CORS | Comma-separated allowlist containing **both** portals — don't reuse it to build investor-facing links |
| `RESEND_API_KEY` | Outbound email | Setup + password-reset codes, sent via Resend (`re_…`). Absent → mail silently disabled and codes fall back to the server log / admin toast. Server says which at boot. Was SendGrid until 31 July 2026 — swapped because SendGrid's signup requires SMS verification that never arrived on a Pakistani number, locking the account out entirely |
| `MAIL_FROM` | Outbound email | Sender address. Must be on a domain verified in Resend, or every send fails. **Switching provider did not remove this requirement** — Resend needs SPF/DKIM on a domain the business owns just as SendGrid did |
| `MAIL_FROM_NAME` | Outbound email | Optional, defaults to `InReal` |
| `INVESTOR_PORTAL_URL` | Email links | Investor site origin. The real value is **`https://in-real-demo.vercel.app`** — hyphenated, and this table previously gave a different domain the business does not own. **Must include the scheme.** A bare domain makes every email link relative, so mail clients resolve it against their own host and the investor never reaches the portal — this happened on 04 Aug. `normalizeLinkOrigin()` now prepends `https://` as a guard, but set it correctly anyway. Falls back to the first `FRONTEND_URL` entry |

`.env` locally, Render dashboard → Environment for production. Never commit any of these.

## Non-negotiable security patterns — follow these, don't reinvent them

- **Every user-scoped query is scoped server-side**, never trusted from a client-supplied ID. (`WHERE user_id = $1` using the *authenticated session's* ID, not `req.body.userId` or similar.)
- **Money-adjacent and audit-sensitive fields are append-only ledgers**, never a raw `UPDATE`. See `portfolio_adjustments` and `bank_detail_requests` — a displayed value is always the sum of a real calculation plus a ledger of explained adjustments, never a value someone just typed over the old one.
- **Bank detail changes require step-up (a fresh TOTP code) to even create a pending request**, and a *separate* admin approval to ever touch the live row. This is explicitly the one item on the whole feature list flagged as not allowed to be shortcut, at any timeline pressure.
- **Passwords are hashed (PBKDF2), TOTP secrets and bank numbers are encrypted (AES-256-GCM via `encryptValue`/`decryptValue`)** — know the difference before adding a new sensitive field: hash what only ever needs comparing, encrypt what needs to be recovered later.
- **Tokens (password reset, account setup) are hashed, single-use, short-expiry, and reuse the same shared machinery** — don't build a second parallel token system for a new "send someone a one-time code" feature; extend the existing one.
- **Emails are always compared via `LOWER(email) = $1`** with a lowercased input, everywhere, including in signup. This was a real bug (case-sensitivity silently breaking login/reset) — don't reintroduce it in a new query.
- **The admin portal renders a lot of server data via `innerHTML`** — always run new dynamic content through `escapeHtml()` (or `escapeAttr()` for attribute contexts). This has now been the source of real stored-XSS bugs **twice** (D.1, then D.11 — five unescaped sites in total, in the same file). The second one was remotely triggerable by an unauthenticated attacker through public signup and led to admin session takeover. Treat any new unescaped `innerHTML` as the default suspect, and run `node test-escaping.mjs` after touching that file — it now scans the source and will fail on a new unescaped interpolation.
- **`kyc_status` uses `'Approved'`, `accreditation_status` uses `'Verified'`** — yes, that's backwards-sounding, but it's what's actually in the code (confirmed against the real `UPDATE` statement, not assumed). Getting this backwards once already broke investment eligibility for every user; don't re-derive it from intuition, check the actual KYC-decision code if unsure.
- **The three-role operator model now exists and is live** (`super_admin`/`finance_admin`/`operations_admin`, migration 11). Both money-adjacent stopgaps — bank-detail review and portfolio adjustments — have been retrofitted to `FINANCE_ROLES`, and the four real operators hold real roles as of 04 Aug. Use `requireOperator(req, res, <ROLE_SET>)`; the sets are defined near the top of `server.js`. The legacy `users.role` fallback still exists on purpose and is what makes the current state safe — don't remove it yet. **Authorisation is decided by `getOperatorRole()`, never by reading `users.role` directly** — the ops login door did the latter and silently blocked every operator granted through the Operators tab, including a product owner (D.33).
- **The ops portal now has a second factor at login** (D.34). Operator sign-in is two calls: `/api/admin/auth/login` (password → challenge token) then `/api/admin/auth/login/mfa` (code → session). Tokens carry a `scp` claim and `getAuthenticatedUserId` accepts only `session`, so a challenge token is refused everywhere real. Enforcement is currently **conditional** — see `REQUIRE_OPERATOR_2FA` above; don't make it mandatory until every operator has enrolled.
- **Client-side caches are scoped to the session that filled them.** The ops portal keeps server data in module state *and* in `localStorage`, and a sign-out that only clears the token leaves all of it readable by the next person to log in on that machine — this was a real cross-session data leak, fixed 04 Aug. Anything new that caches server data must be cleared in `resetWorkspaceForSignOut()`, and any role-gated panel must be unreachable via `setActiveTab()`.

## Frontend gotchas

- **CSS Grid items don't shrink below their content's size by default.** Any wide child (a table, a long form) inside a `.split`/grid layout needs `min-width: 0` on the grid item, or it blows out the whole page's horizontal width instead of scrolling internally. Already fixed once in the admin portal; watch for it in new layouts.
- **CSS rule order matters more than you'd think inside media queries.** An unconditional rule declared *after* a media-query rule of equal specificity always wins, regardless of the media condition. (This silently broke the admin portal's mobile sidebar toggle for a while — the fix was just reordering the rules.)
- **The admin portal's drawers (KYC review, bank requests, portfolio adjustment) share one CSS class (`.kyc-drawer`) and one backdrop element (`#drawerBackdrop`).** Fix/style it once, it applies everywhere. Don't duplicate drawer styling for a new admin review screen — reuse the pattern.
- Some Tailwind-looking classes in the investor site (`text-portal-primary`, `bg-portal-tertiary`, etc.) are **not real Tailwind utilities** — they're hand-written custom classes in `src/index.css`. Check there before assuming a color/spacing utility exists; a few invented-but-nonexistent classes have shipped before (they silently no-op, no build error).
- Scrollbar theming already exists globally on the investor site (`src/index.css`) and the admin portal (`ops-admin-portal/styles.css`) — don't re-add it.

## Dev workflow (agreed, followed throughout)

1. Implement.
2. Test rigorously against **localhost** — PowerShell hitting the API directly for anything security-critical (not just clicking through the UI), plus one manual UI pass.
3. Push to `main`.
4. Re-run the **same** critical checks against the **live** URL before calling anything done. Localhost passing is not sufficient on its own for this app.

One recurring gremlin: the terminal used for testing has repeatedly shown **blank output on certain caught PowerShell errors**, even when the underlying rejection genuinely happened. If a test result looks ambiguous (no visible error, but no visible success either), don't assume either outcome — re-run with explicit status-code/response-body capture before concluding anything. The same rule covers transport errors (`ENOTFOUND`, "remote name could not be resolved", "underlying connection was closed") — those are the local network, not the application, and a security-critical assertion that lands on one must be re-run standalone rather than written off.

Two practical notes for a live pass:

- **Force TLS 1.2 before hitting the Render URL from PowerShell 5.1**, or the first request dies with "The underlying connection was closed": `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`.
- **A broad, multi-area test failure is usually one expired token, not a regression.** A decline suite once reported 10 pass / 15 fail purely because the admin token had expired — every admin call 401'd, so no fixture reached the state the later assertions needed. Re-running with a fresh token gave 25/25 with no code change. Check the credential before reading a wide failure as broken code.

## No automated test suite

There isn't one. `test-escaping.mjs` (root of the repo) is a standalone, manually-run check — not part of a larger framework. It does two things: unit-tests `escapeHtml`/`escapeAttr`, **and** scans `ops-admin-portal/app.js` for any HTML-building template that interpolates server data unescaped, failing if it finds one. That source scan exists because the earlier helper-only version passed cleanly while three unescaped render sites sat in the file (see D.11) — a test that only checks the helper cannot catch a call site that never calls it. Run it after any change to that file.

Everything else is manual: PowerShell for API/security behaviour, browser click-throughs for UI. If asked to add real test infrastructure, that's a genuine gap worth raising, not something to quietly assume exists.
