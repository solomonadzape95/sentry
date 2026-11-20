# Deploying Sentry

Production layout:

```
Vercel (Next.js app, repo root directory = web/)  →  Render Postgres (external URL)
```

The app has no server-side dependency on Render beyond PostgreSQL, and the
forecast/data artifacts it serves are read from that database. The Python
pipeline and the raw `data/` extracts are **not** deployed.

## What you need

- A Render account and a Vercel account.
- The repository pushed to GitHub.
- Node 20.9+ locally (same minimum as the app).

## 1. Create the Render Postgres database

Either import the checked-in Blueprint (`render.yaml`):

1. Open <https://dashboard.render.com/blueprints> → **New Blueprint Instance**.
2. Select this repository and the `main` branch, then apply it.
3. Wait for `sentry-db` to become available.

Or create it manually in the Render dashboard: **New → Postgres**, name it
`sentry-db`, database `sentry`, user `sentry`, and choose a region close to your
Vercel functions (the Blueprint uses `virginia`, matching Vercel's default
`iad1`).

Then open the database and copy the **External Database URL**, for example:

```
postgresql://sentry:XXXX@dpg-xxxxx-a.virginia-postgres.render.com/sentry
```

Notes:

- **Use the external URL.** Vercel cannot resolve or reach Render's
  internal-only hostname; that address works only from services inside Render.
- Append `sslmode=require` if Render did not include it. Prisma needs it for the
  public endpoint:
  `postgresql://.../sentry?sslmode=require`
- Optional, recommended for serverless: add `&connection_limit=1` so each Vercel
  function instance holds one connection. The free database allows 100
  connections.
- Leave the database's **IP allow list** open (the Blueprint does). Vercel's
  function IPs are dynamic, so an allow list will block the app.
- The **free** Render Postgres plan is 1 GB, one database per workspace, and
  **expires 30 days after creation**. Upgrade it before expiry if the demo needs
  to stay online. Free databases also have no backups and can restart for
  maintenance.

## 2. Create the schema and seed the demo data

Run this once from your machine, against the external URL:

```bash
cd web
DATABASE_URL="postgresql://.../sentry?sslmode=require" npm run db:pg:setup
```

`db:pg:setup` generates the Postgres Prisma schema/client, runs `prisma db push`,
and seeds the demo dataset. It writes the new client into `node_modules`; the
app's `predev` and `build` scripts switch the client automatically based on
`DATABASE_URL`, so local SQLite development keeps working.

- `db:pg:push` applies the schema without seeding (use this for schema-only
  updates).
- `db:pg:reset` **destroys and re-seeds** the database.
- `db:pg:setup` and `db:pg:reset` are destructive. Never run them against a
  database with data you want to keep.

If you set a custom demo password, set it for this command too, and use the same
value on Vercel later:

```bash
DATABASE_URL="postgresql://.../sentry?sslmode=require" \
DEMO_PASSWORD="your-demo-password" \
npm run db:pg:setup
```

Verify connectivity and row counts from the command output. The seed ends with a
`Seeded: { ... }` summary.

## 3. Deploy the frontend on Vercel

1. In Vercel, **Add New → Project** and import this repository.
2. Set **Root Directory** to `web`. Do not deploy the repository root.
3. Framework preset: **Next.js**. The checked-in `web/vercel.json` sets the
   build command to `npm run build`, which regenerates the correct Prisma client
   before building.
4. Add the environment variables below for **Production** (and Preview only if
   you point it at a separate database).

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | Yes | Render **External Database URL**, with `sslmode=require` and optionally `connection_limit=1` |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32`; keep it stable across deploys |
| `APP_PROFILE` | No | `demo` (default, fixed clock), or `live` for the real clock |
| `APP_TODAY` | No | Pin a demo date, e.g. `2026-11-17` |
| `DEMO_PASSWORD` | No | Must match the password used when seeding. Defaults to `sentry-demo-2026` |
| `RESEND_API_KEY` | No | Enables email for invitations and password resets |
| `MAIL_FROM` | No | Verified Resend sender, e.g. `Sentry <no-reply@your-domain>` |

Notes:

- In `APP_PROFILE=demo`, the sign-in page lists the seeded demo accounts and
  exposes the demo password as a shortcut. That is intentional for the
  hackathon; do not put real data behind a demo deployment. In `APP_PROFILE=live`
  the shortcuts disappear and `RESEND_API_KEY` becomes required for invitations.
- The seeded dataset is anchored to **17 November 2026**. Keep `APP_PROFILE=demo`
  for the pitch so the fixed clock matches the data.
- Do not set `NODE_ENV=production` as a Vercel environment variable; Vercel
  installs dev dependencies (including the Prisma CLI) during the build.
- Auth.js uses `trustHost: true`, so `NEXTAUTH_URL`/`AUTH_URL` are not needed on
  Vercel.
- **Environment scope:** Vercel also builds Preview deployments for branches and
  PRs. If `DATABASE_URL` exists only in Production, a Preview build falls back to
  the SQLite client and fails at runtime. Either add the variables to Preview as
  well (ideally pointing at a separate preview database) or disable Preview
  deployments for this project.

Deploy. The build runs:

```
npm install             # postinstall generates the Prisma client for DATABASE_URL
npm run build           # regenerates it again, then next build
```

## 4. Verify

```bash
curl https://your-app.vercel.app/api/v1/health
```

A healthy response includes `"database": "reachable"` and a `latencyMs`. Then
open the landing page and sign in with a demo account.

If the health check fails:

- `P1001 Can't reach database server` — you used Render's internal URL, the
  database is still starting, or a free database has expired. Re-copy the
  **External** URL.
- `P1010 User was denied access` — check the username, password and database
  name in the URL. For TLS/certificate errors, make sure the URL ends with
  `sslmode=require`.
- `The table public.User does not exist` — step 2 did not run against this
  database. Run `db:pg:push` (and `db:pg:seed` if the demo data is missing).
- `PrismaClientInitializationError` about `file:` — the Vercel build used the
  SQLite schema. Confirm `DATABASE_URL` is set in the project environment (not
  only locally) and redeploy.

## Schema changes after the first deploy

`prisma db push` is the project's migration mechanism (there is no migrations
directory). Apply schema changes from your machine before deploying code that
depends on them:

```bash
cd web
DATABASE_URL="postgresql://.../sentry?sslmode=require" npm run db:pg:push
```

Then deploy the new code. If the change requires destructive data loss, Prisma
will prompt; review it before confirming. For a demo reset, use `db:pg:reset`
(seed included).

## Local SQLite is unaffected

The committed default remains SQLite (`web/prisma/schema.prisma`). Local
`npm install`, `npm run dev`, and `npm run build` detect `DATABASE_URL` from
`web/.env` and generate the matching client. To force the demo client back:

```bash
cd web
npm run db:sqlite:generate
```

## Optional: custom domain and HTTPS

Vercel issues HTTPS automatically, which the installable PWA and camera
scanning require. Add the domain in Vercel → Settings → Domains, then update
`MAIL_FROM` to a verified Resend sender on that domain if email is enabled.

## Cost and lifecycle summary

| Service | Plan | Limits |
|---|---|---|
| Vercel Hobby | Free | Personal/non-commercial use; serverless function limits apply |
| Render Postgres | Free | 1 GB, one free DB per workspace, expires after 30 days, no backups |

For a long-lived pilot, upgrade the Render database and move from `db push` to
versioned Prisma migrations before multiple people share the environment.
