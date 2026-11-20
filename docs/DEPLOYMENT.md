# Deploying Sentry

The simplest deployment is **everything on Render**:

```
Render Web Service (Next.js, runs from repo root, commands cd into web/)
        ↓
Render Postgres (private URL)
```

One Blueprint creates both resources. On the first deploy Render builds the app,
applies the schema, and seeds the demo data automatically.

> The previous Blueprint created **only** the database. Seeding was a manual
> `npm run db:pg:setup` step, so an empty database was expected if that command
> had not been run.

## What you need

- A Render account (the free plan is enough for the demo).
- The repository pushed to GitHub.
- Node 20.9+ locally only if you want to run recovery commands.

## 1. Apply the Blueprint

1. Open <https://dashboard.render.com/blueprints>.
2. **New Blueprint Instance** → select this repository and `main`.
3. Apply it. Render creates:
   - `sentry-db` — Postgres 17, free plan, 1 GB.
   - `sentry` — Next.js web service, free plan.

No environment variables need to be entered manually. The Blueprint sets:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Internal connection string of `sentry-db` |
| `AUTH_SECRET` | Generated once by Render and kept stable |
| `APP_PROFILE` | `demo` (fixed 17 Nov 2026 clock) |
| `DEMO_PASSWORD` | `sentry-demo-2026` |
| `NODE_VERSION` | `22.22.0` |

## 2. What happens on the first deploy

1. **Build:** `cd web && npm install --production=false && npm run build:render`
   - Installs dev dependencies (the Prisma CLI is required).
   - **Forces the PostgreSQL Prisma client**, even if the build environment has
     not injected `DATABASE_URL` yet.
   - Builds the Next.js app.
2. **Start:** `cd web && npm run db:pg:push && npm run start -- -H 0.0.0.0`
   - Applies the schema with `prisma db push` (idempotent).
   - Starts Next.js on Render's `$PORT` and all interfaces.
3. **Seed:** `initialDeployHook` runs
   `cd web && npm run db:pg:push && npm run db:pg:seed`
   once, after the first successful deploy.
   - Seeds 4 facilities, 12 medicines, 6 demo users, inventory, 35k
     consumption rows and 48 forecasts.
   - The app is live while this runs; pages that need data may show errors for
     the first minute or two. The health endpoint already passes.

After it finishes, open the `onrender.com` URL shown on the service page and sign
in with a demo account. The sign-in page lists them.

Verify:

```bash
curl https://sentry-xxxx.onrender.com/api/v1/health
# { "data": { "status": "ok", "database": "reachable", ... } }
```

## 3. Free plan limits (important)

| Resource | Limit |
|---|---|
| Render web service | 0.1 CPU / 512 MB; **spins down after 15 minutes idle**; first request after idle takes ~30–60s |
| Render Postgres | 1 GB, one free database per workspace, **expires 30 days after creation**, no backups |

Upgrade both before the demo if it must stay warm or survive past 30 days. A
free web service also cold-starts `prisma db push` on the first request, adding a
few seconds.

## Manual recovery and reseeding

The service uses the database's **internal** URL. To run commands from your
machine, copy the **External Database URL** from the database page and append
`sslmode=require`:

```bash
cd web

# schema only
DATABASE_URL="postgresql://.../sentry?sslmode=require" npm run db:pg:push

# schema + full demo seed (destructive: clears all tables first)
DATABASE_URL="postgresql://.../sentry?sslmode=require" npm run db:pg:setup
```

If you change `DEMO_PASSWORD`, reseed, because the existing password hashes keep
the old password. The Blueprint owns that variable, so update it in
`render.yaml` as well or the next sync will reset it:

```bash
DATABASE_URL="postgresql://.../sentry?sslmode=require" \
DEMO_PASSWORD="your-new-password" \
npm run db:pg:setup
```

To force the seed on an existing service, use the external URL command above. If
your Render plan includes Shell access, you can also open the service's Shell and
run `npm run db:pg:seed`.

## Schema changes after the first deploy

The start command runs `prisma db push` on every boot, so additive schema changes
apply automatically when the new code deploys. If a change would lose data,
`db push` refuses to run non-interactively and the service will not start. Apply
that change manually first:

```bash
cd web
DATABASE_URL="postgresql://.../sentry?sslmode=require" \
npx prisma db push --schema=prisma/schema.postgres.prisma
```

Then deploy. There is no migrations directory; `db push` is the project's
migration mechanism.

## Optional: deploy the frontend on Vercel instead

Vercel is no longer required, but the repo still supports it. The important
differences are:

- Vercel must use the database's **External Database URL**, not the internal one.
- Vercel cannot run the Render `initialDeployHook`, so the seed is manual.
- Set the Vercel project **Root Directory** to `web`.
- Set `DATABASE_URL` (external, with `sslmode=require`), `AUTH_SECRET`, and
  optionally `APP_PROFILE`/`DEMO_PASSWORD`.
- Preview deployments need their own `DATABASE_URL` or they fall back to SQLite
  and fail.
- Seed once from your machine with `db:pg:setup` before opening the app.

The most common cause of a blank/broken Vercel deployment is a database that was
never seeded, followed by a missing `DATABASE_URL`/`AUTH_SECRET` in the project
environment. Check the Vercel build and function logs for `P1001`, `P2021`
(table does not exist) or `MissingSecret`.

## Local SQLite is unaffected

The committed default remains SQLite (`web/prisma/schema.prisma`). Local
`npm install`, `npm run dev`, and `npm run build` detect `DATABASE_URL` from
`web/.env` and generate the matching client. To force the demo client back:

```bash
cd web
npm run db:sqlite:generate
```
