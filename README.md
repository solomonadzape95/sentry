# Sentry

**See the shortage before it happens.**

Predictive medicine supply intelligence for Nigerian health facilities.

We tell facilities which medicines will run out, when, and where the nearest verified
surplus stock is — before the shelf is empty.

> Hackathon build. Facility inventory and consumption are **simulated**. Disease
> signals mix **real NCDC outbreak reports** with **derived** malaria/weather
> indices. Weather is real Open-Meteo history for Abuja. Every number is labelled
> observed, derived or simulated in the app and in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

**Backend and data plan:** [`docs/BACKEND_DATA_PLAN.md`](docs/BACKEND_DATA_PLAN.md) ·
**Source catalogue:** [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) ·
**Deployment:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) ·
**Provenance page:** `/data` · **API:** `/api/v1/*`

---

## What works

### Landing and shell

- Public landing page at `/` with a live network snapshot, product story and clear demo entry.
- Authenticated network dashboard at `/dashboard` with a collapsible ink sidebar, warm paper surfaces, a live facility map, forecast explorer and risk horizon.
- Invite-only Auth.js accounts: sign-in, password reset, invitation acceptance,
  account security and capability-based facility scope. Every app route is
  behind sign-in; the demo profile never bypasses it. See
  [`docs/AUTH_AND_ROLES.md`](docs/AUTH_AND_ROLES.md).

### Inventory foundation

- Medicine catalogue with barcodes, pack sizes and supplier lead times.
- Batch-level stock, expiry dates and FEFO issue.
- Receive stock, issue stock, physical stock counts, variance adjustments and an audit ledger.
- Facility-level stock health, expiry watch and incoming deliveries.
- Mobile-first recording with an offline queue, idempotent sync and physical counts.

### Predictive intelligence

- 48 facility-medicine demand forecasts across 12 essential medicines.
- Python pipeline: seasonal baseline, 28-day moving average, Ridge regression and
  XGBoost with rainfall, temperature, humidity and disease indicators.
- Time-ordered backtesting, stockout-censored evaluation, MAE / WAPE / bias.
- 80% and 95% uncertainty intervals, confidence grading and low-data warnings.
- Live stockout projection from current stock + confirmed deliveries + forecast.
- Reorder recommendation that considers lead time, review period, safety stock and
  confirmed incoming orders.
- Explainable signals panel and a model performance page that reports the weakest lines.

### Real data foundation

- **NCDC Weekly Epidemiological Reports** — real weekly cholera, meningitis, Lassa
  fever, measles, diphtheria and AFP counts, parsed from the public PDFs.
- **GRID3 v4.0 + HDX NHFR snapshot** — 70,235 and 46,146 geocoded facilities;
  1,047 and 576 in the FCT, with an exact-match crosswalk.
- **NMIS 2021** — real state-level malaria prevalence (FCT-Abuja RDT 34.6%,
  microscopy 18.8%).
- **NEML 2024** — 768 medicine/dosage rows parsed from the adult 8th edition.
- **Open-Meteo ERA5** — real daily weather for Abuja.
- **Provenance** — every ingestion run records rows read/accepted/rejected, date
  coverage, warnings and a SHA-256. `/data` and `/api/v1/data-sources` expose it.
- **Honesty** — NCDC weeks after the latest report are marked `isImputed`;
  malaria and respiratory signals are marked `isDerived`; facility inventory and
  consumption remain `SIMULATED`.

### Network coordination

- Network overview of facilities at risk and transferable surplus.
- Shortage-to-surplus matching by medicine, shelf life and safe cover.
- Transfer recommendation with quantity, batch and expiry.
- Destination-requested → source-approved dispatch → receipt confirmation, with an audit trail.
- Stockout date recalculates after receipt; the alert clears automatically.

### Mobile PWA

- Installable mobile shell at `/m`.
- Camera barcode scanning with manual fallback and demo barcode labels.
- Quick issue/receive with batch, expiry and FEFO.
- Offline queue in IndexedDB; reconnect and sync with duplicate protection.
- Role-aware demo accounts and facility scoping.

---

## Quick start

Requirements: Node 20+, npm, Python 3.11+, [uv](https://docs.astral.sh/uv/).

```bash
# 1. install web dependencies
cd web && npm install && cd ..

# 2. install Python dependencies, generate the demo dataset, seed SQLite
npm run setup

# 3. optional: refresh the real public data, then regenerate and reseed
cd ml && uv run python -m aisec.ingest all && cd ..
npm run data && npm run db:reset

# 4. run
npm run dev
```

The committed `data/processed/` extracts let a fresh clone run without scraping.
`npm run data` uses the real NCDC/NMIS disease signals when those files exist and
falls back to the synthetic generator only if they are missing.

Open:

- Landing page: <http://localhost:3000>
- Sign in: <http://localhost:3000/sign-in>
- Role home: <http://localhost:3000/home>
- Network dashboard after sign-in: <http://localhost:3000/dashboard>
- Mobile PWA after sign-in: <http://localhost:3000/m>

Every seeded demo account uses `sentry-demo-2026` unless `DEMO_PASSWORD` is set.
`AUTH_SECRET` is required by Auth.js; copy it from `web/.env.example` and generate
one with `openssl rand -base64 32`. Sign-in is always enforced. The demo profile
only keeps the fixed clock and simulated dataset; the sign-in page lists demo
accounts as credential shortcuts, but the credentials still have to be submitted.

If port 3000 is busy, Next prints the actual port. The landing page owns `/`; the dashboard is at `/dashboard`.

The installable PWA and its offline shell register only in a production build. Use
`npm run build && npm start` (or the root `npm run build && npm start`) for the
full mobile experience. Camera scanning requires a secure context: use `localhost`
on the demo laptop, or an HTTPS tunnel/deployment for a phone. Manual entry and the
demo barcode labels work everywhere.

### Demo clock

The dataset is anchored to **17 November 2026**. The app uses a fixed demo clock so
the pitch is stable regardless of the presentation date.

- `APP_PROFILE=live` switches reads to the real clock.
- `APP_TODAY=2026-11-17` pins a different demo date.
- Mutations use `appNow()` so write timestamps match the read clock.

Regenerate the data after changing the clock.

### Reset the demo

```bash
npm run db:reset        # reset SQLite and re-seed from data/seed
npm run data            # regenerate data + forecasts (optional)
npm run db:seed         # load the latest generated data
```

`npm run setup` does the full pipeline end-to-end.

### Postgres profile (optional)

SQLite remains the zero-setup demo default. A Postgres profile is included for
the pilot-ready path:

```bash
# 1. start Postgres on localhost:5433
docker compose up -d postgres

# 2. generate the Postgres schema/client and seed it
cd web
DATABASE_URL="postgresql://aisec:aisec@localhost:5433/aisec?schema=public" npm run db:pg:setup

# 3. run the app against Postgres
DATABASE_URL="postgresql://aisec:aisec@localhost:5433/aisec?schema=public" npm run dev

# 4. switch the generated client back to SQLite for the demo
npm run db:sqlite:generate
```

Prisma cannot switch providers from an environment variable, so
`db:pg:schema` generates `prisma/schema.postgres.prisma` from the canonical
schema. The Postgres schema and seed are verified against PostgreSQL 17.8, and
the checked-in Render deployment runs the same `db:pg:push` + `db:pg:seed` path
automatically.

### Deploy

The simplest deployment is **everything on Render** (app + Postgres). The
checked-in [`render.yaml`](render.yaml) Blueprint creates both resources; the
service starts serving, then a background bootstrap applies the schema and seeds
the demo data if it is missing.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full runbook, free-plan
limits and recovery commands. Deploying the frontend on Vercel instead remains
supported, but the database then has to use its external URL and be seeded
manually.

---

## Architecture

```
web/   Next.js 16 App Router · TypeScript · Tailwind v4 · Recharts
       Prisma + SQLite locally / Postgres on Render
       Dashboard routes + mobile PWA + API route handlers
       Auth.js sessions with capability-scoped facility access

ml/    Python 3.11 forecasting pipeline (uv)
       Open-Meteo weather → illustrative demand/inventory simulation →
       feature engineering → baselines + Ridge + XGBoost → backtest →
       data/seed/*.json artifacts

data/  Generated, labelled demonstration dataset used by the seed script.
```

Forecasts are trained offline and stored as immutable model artifacts. The live
app recomputes stockout dates and reorder quantities from current inventory,
confirmed deliveries and the stored demand curve, so transfers and receipts
change the answer immediately.

### Core entities

`Facility`, `User`, `FacilityMember`, `Medicine`, `Supplier`, `InventoryBatch`,
`StockMovement`, `ConsumptionRecord`, `PurchaseOrder`, `DiseaseObservation`,
`WeatherObservation`, `Forecast`, `ForecastPoint`, `StockAlert`, `TransferRequest`,
`AuditLog`, `ModelRun`.

### API

| Endpoint | Purpose |
|---|---|
| `POST /api/facility` | Set active facility scope |
| `POST /api/stock/issue` | FEFO issue + consumption + audit |
| `POST /api/stock/receive` | Create batch + receipt movement |
| `POST /api/transfers` | Destination facility raises a stock request |
| `POST /api/transfers/:id/approve` | Deduct source stock, mark in transit |
| `POST /api/transfers/:id/receive` | Add destination batch, complete transfer |

Versioned read API:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Liveness and database check |
| `GET /api/v1/data-sources` | Source register and recent ingestion runs |
| `GET /api/v1/disease-observations` | Observed/derived disease rows (`disease`, `from`, `to`, `limit`) |
| `GET /api/v1/facilities` | Facilities scoped to the signed-in account |
| `GET /api/v1/forecasts` | Forecast, intervals and metrics (`facilityId`, `medicineId`, `limit`) |

Stock endpoints accept a `clientId` for idempotent mobile sync. Responses use
`{ data, meta }` with a `generatedAt` timestamp.

---

## Demo accounts

Sign in with any account below. Each role lands on its own home; there is no
in-app persona switcher. The sign-in page lists the same accounts as shortcuts.
Every account uses the demo password from `DEMO_PASSWORD` (`sentry-demo-2026` by
default).

| Account | Role | Scope |
|---|---|---|
| Dr. Ngozi Adeyemi | Network authority | All four facilities |
| Amina Yusuf | Inventory operator | Gwagwalada PHC |
| Dr. Chidi Okonkwo | Facility manager | General Hospital Abuja |
| Dr. Bola Ajayi | Facility manager | Sunrise Hospital |
| Emeka Nwosu | Facility manager | CarePoint Pharmacy |
| Tunde Bakare | Supplier | Supplier portal is a pilot surface |

These are real Auth.js accounts, not a client-side persona switch. See [DEMO.md](DEMO.md) for the presentation script.

---

## The demo network

All facility data is simulated. The network is designed to show different operating
models and different stock positions.

| Facility | Type | Role in the demo |
|---|---|---|
| Gwagwalada PHC | Primary health centre | ACT stockout risk: 109 units, ~11 days cover |
| General Hospital Abuja | General hospital | Holds ~761 units of ACT above safe cover |
| Sunrise Hospital | Private hospital | Amoxicillin pressure; medium-risk lines |
| CarePoint Pharmacy | Community pharmacy | ORS pressure; near-expiry ibuprofen |

Weather is real historical Open-Meteo data for Abuja. Disease signals come from
public NCDC and NMIS sources, with medicine mappings labelled as hypotheses.

---

## Model

| Model | Purpose |
|---|---|
| Seasonal baseline | Same period last year; the benchmark that must be beaten |
| 28-day moving average | Robust benchmark for noisy / low-data series |
| Ridge regression | Lag, rolling, seasonal and exogenous features |
| XGBoost | Rainfall, temperature, humidity, disease and consumption features |
| XGBoost + seasonal ensemble | Damps recursive drift |

Backtest: 28-day held-out horizon per facility-medicine series. Stockout days are
excluded from accuracy scoring because true demand was unobserved. Metrics: MAE,
WAPE, bias, confidence. The pipeline selects per series and keeps a baseline where
a learned model does not earn its place.

Latest run (simulated medicine demand): XGBoost **WAPE 16.7%** vs seasonal baseline
**28.6%**. These are pipeline validation numbers, **not** evidence of real-world
stockout reduction.

**Real-target check (18 Nov 2026):** a 4-week rolling holdout on six real NCDC
disease series. Per-disease model selection reached **WAPE 46.1%**, versus
**58.4%** for a 4-week moving average and **103.7%** for the seasonal baseline.
This validates disease-burden forecasting on real public data; it is **not**
medicine-demand accuracy. Medicine demand still needs partner LMIS/HMS
consumption data and a versioned regimen conversion layer.

---

## Security and data governance

- No patient-identifiable data is collected.
- Invite-only Auth.js accounts with database-validated, revocable sessions.
- Facility-scoped access checks on every mutation.
- Capability-based approve/receive gates and an audit log for inventory and
  transfer actions.
- SQLite for the hackathon; production moves to managed Postgres with RLS
  (the included deployment uses Render Postgres).
- MFA for approvers and per-facility row-level security remain before a pilot.

---

## What is deliberately not built

- Hospital management, appointments, prescriptions, patient records.
- Automated diagnosis or medicine substitution.
- Supplier marketplace.
- Live NHLMIS / DHIS2 integration.
- Automatic ordering or automatic transfers.
- Deep learning.
- GS1 DataMatrix batch/expiry parsing and Bluetooth scanners (the MVP identifies
the product by EAN-13 and captures batch/expiry on receipt).
- Live weather-forecast ingestion (future weather uses seasonal climatology in the
current model; the 16-day Open-Meteo forecast API is a next step).
- Field-level offline conflict merging (the MVP validates and applies queued
operations idempotently; it does not merge concurrent edits).

---

## Next steps after the hackathon

1. Stabilise the MVP and fix onboarding.
2. Interview pharmacists, PHC inventory officers and state supply-chain leads.
3. Secure 3–5 pilot facilities and data-sharing agreements.
4. Request NHFR API access and investigate authorised DHIS2 / NHLMIS integration.
5. Validate disease-to-medicine relationships with a clinical advisory group.
6. Run an 8–12 week pilot and measure stockout days, emergency procurement,
   expiry and stock availability against a baseline.
7. Only then pursue state and federal institutional partnerships.

See [PLAN.md](PLAN.md) for the full product and post-hackathon strategy.
