# Sentry — Predictive Medicine Supply Intelligence

Working name; rebrand via `APP_NAME` in `web/src/lib/config.ts`.

## One-line pitch

We tell Nigerian health facilities which medicines will run out, when, and where
the nearest surplus stock is — before the shelf is empty.

## The demo story (90 seconds)

1. Network dashboard shows 4 illustrative facilities in the FCT.
2. Malaria season + rainfall + rising fever cases push ACT demand up.
3. Forecast: **Gwagwalada PHC runs out of Artemether/Lumefantrine in 12 days**
   (80% interval: 9–16 days).
4. Reorder recommendation exceeds supplier lead time — too late to order.
5. Network view finds **840 units of verified surplus** at General Hospital Abuja,
   same product, 14 months shelf life.
6. Transfer recommended → authorised user approves → stock moves.
7. Stockout date recomputes to **31 days**. Alert clears. Value proven.

## What we are building

- **Inventory foundation:** medicine catalogue, batches, expiry/FEFO, receive,
  issue, stock counts, adjustments, movement audit trail.
- **Prediction:** demand forecasting per facility/medicine with uncertainty,
  predicted stockout date, shortage quantity, reorder recommendation, and
  explainable signals (seasonality, weather, disease indicators).
- **Coordination:** network-wide surplus/shortage matching, transfer
  recommendation, approval workflow, and live re-projection.
- **Mobile-first PWA:** barcode scan with manual fallback, quick issue/receive,
  offline queue with sync status.
- **Web dashboard:** network overview, facility dashboard, predictive dashboard,
  transfers, light administration, model evaluation.

## What we are NOT building

HMS, patient records, appointments, prescriptions, diagnosis, automatic medicine
substitution, supplier marketplace, live NHLMIS/DHIS2 integration, deep learning.

## Architecture

```
web/  Next.js 16 (App Router, TS, Tailwind)
      ├─ dashboard routes (server components)
      ├─ /api/* route handlers (mutations + mobile sync)
      ├─ Prisma → SQLite (Postgres-ready schema)
      └─ PWA (manifest, service worker, offline queue in IndexedDB)
ml/   Python 3.11 + uv
      ├─ fetch Open-Meteo historical weather (cached)
      ├─ generate illustrative consumption/stockout history
      ├─ feature engineering, baselines, XGBoost
      ├─ time-series backtest (MAE, WAPE, bias)
      └─ export seed artifacts → data/seed/*.json
```

Forecasts are trained offline and stored as artifacts. Stockout dates and reorder
quantities are recomputed at request time from live inventory + forecast demand
curves, so approvals and transfers change the projection immediately.

## Core entities

`facilities`, `users`, `facility_members`, `medicines`, `inventory_batches`,
`stock_movements`, `consumption_records`, `suppliers`, `purchase_orders`,
`disease_observations`, `weather_observations`, `forecasts`, `forecast_points`,
`stock_alerts`, `transfer_requests`, `audit_logs`.

## Roles (demo personas)

- **Inventory operator** — mobile inventory operations, scanning, counts.
- **Facility manager** — facility dashboard, approvals, reporting.
- **Network authority** — network view, forecasts, transfer approval.
- **Supplier** — limited: shared orders and availability.

## Forecast approach

1. **Seasonal naive** — same period last year (baseline that must be beaten).
2. **Moving average** — 28-day benchmark for low-data series.
3. **Ridge regression** — lag/rolling/seasonal features.
4. **XGBoost** — adds rainfall, temperature, humidity, disease indicators.

Backtest: rolling-origin, 28-day horizon, per facility/medicine. Metrics: MAE,
WAPE, forecast bias, stockout warning lead time. Low-data series get an explicit
warning, not fake confidence.

Intervals: empirical residual quantiles from backtest (80% and 95%).

## Data honesty rules

- All demo facility data labelled **SIMULATED** in the UI and in exports.
- Weather is real Open-Meteo history for Abuja; disease indicators are
  illustrative and flagged as such.
- Disease→medicine relationships are presented as hypotheses, not clinical advice.
- No automatic orders or transfers; every action requires authorised approval.
- Forecast uncertainty is always visible.

## 5-day schedule

| Day | Deliverable |
|---|---|
| 1 | Scaffold, schema, design system, seed generator, forecast v1, network page |
| 2 | Inventory core, facility dashboard, alerts, FEFO |
| 3 | Predictive dashboard, reorder engine, stockout projection, metrics |
| 4 | Transfers, network matching, mobile PWA, roles |
| 5 | Polish, demo script, pitch assets, dry run |

## Demo credentials

Auth.js accounts now back the demo. Every seeded persona uses the password in
`DEMO_PASSWORD` (default `sentry-demo-2026`). The persona switcher remains in the
header only while `APP_PROFILE=demo`; outside that profile it is replaced by a
real session and account menu. See [docs/AUTH_AND_ROLES.md](docs/AUTH_AND_ROLES.md).

---

## Hackathon build status (17 Nov 2026)

### Built and verified

- [x] Public landing page at `/` with a live demo snapshot
- [x] Next.js dashboard at `/dashboard` + mobile PWA shell
- [x] Shared cream / forest / lime design language across landing, dashboard and mobile
- [x] SQLite/Prisma schema covering facilities, users, medicines, batches,
      movements, consumption, suppliers, purchase orders, weather, disease,
      forecasts, alerts, transfers, audit logs and model runs
- [x] Illustrative FCT network: 4 facilities, 12 medicines, 731 days of history
- [x] Real Open-Meteo Abuja weather (cached, with offline fallback)
- [x] Illustrative disease signals (clearly labelled)
- [x] Python pipeline: seasonal baseline, moving average, Ridge, XGBoost, ensemble
- [x] 28-day backtest with MAE, WAPE, bias, censoring-aware scoring
- [x] Per-series model selection and low-data/confidence warnings
- [x] 30-day forecasts with 80%/95% intervals
- [x] Live stockout projection, shortage quantity and reorder recommendation
- [x] Network surplus matching and transfer recommendations
- [x] Request → approve/dispatch → receive workflow with audit trail
- [x] Transfer receipt recalculates cover and clears the alert
- [x] Batch register, FEFO issue, receive, expiry and stock-count adjustments
- [x] Mobile barcode scanner with manual fallback and demo labels
- [x] Offline IndexedDB queue with idempotent sync
- [x] PWA manifest, service worker, offline shell and installable icons
- [x] Role-based navigation, facility scoping and read-only supplier exclusion
- [x] Demo personas and person switcher
- [x] Model performance page including weakest lines and limitations
- [x] Build, lint and typecheck pass

### Explicitly deferred

- [ ] MFA for approvers and Postgres RLS (Auth.js accounts and invite flow are built)
- [ ] Live NHLMIS / DHIS2 / NHFR integrations
- [ ] Supplier portal and purchase-order workflow
- [ ] Clinical validation of disease-to-medicine relationships
- [ ] Real pilot data, 8–12 week operational pilot and impact measurement
- [ ] Native Android app (PWA is the hackathon delivery; API is mobile-ready)
- [ ] GS1 DataMatrix batch/expiry parsing and Bluetooth scanner support
- [ ] Live 16-day weather forecast ingestion (future weather is climatology today)
- [ ] Field-level offline conflict merging

### Known demo limitations

- Persona switching is not authentication; it is a demonstration device.
- The PWA caches the server-rendered mobile shell; production should cache a
  user-neutral shell and fetch personalised data at runtime.
- Disease signals mix real NCDC reports with derived malaria/weather indices;
  no clinical claims are made.
- Inventory and consumption are simulated; impact claims must wait for a pilot.

---

## Backend & data update (18 Nov 2026)

The full plan lives in [docs/BACKEND_DATA_PLAN.md](docs/BACKEND_DATA_PLAN.md);
source notes are in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

### Shipped

- Public ingestion pipeline: NCDC Weekly Epidemiological Reports, GRID3 v4.0
  facilities, HDX NHFR snapshot, NMIS 2021 malaria prevalence and Open-Meteo.
- 1,338 NCDC disease-week rows; 70,235 GRID3 facilities; 46,146 NHFR facilities;
  1,047 FCT facilities; 37 states + national malaria prevalence.
- Real NCDC/NMIS signals now feed the forecasting pipeline; malaria and
  respiratory signals are explicitly `DERIVED`; stale NCDC weeks are `IMPUTED`.
- Provenance in the database (`DataSource`, `IngestRun`), `/data` page and
  `/api/v1/*` read endpoints.
- Postgres docker-compose profile and schema-generation scripts, with SQLite as
  the zero-setup demo fallback.
- Real-target backtest on NCDC disease counts: 4-week rolling holdout,
  per-disease selection WAPE **46.1%** vs seasonal **103.7%**. This is
  disease-burden accuracy, not medicine-demand accuracy.
- Scraper fixtures and 4 passing pytest tests; lint, typecheck and production
  build pass.

### Still open

- NEML 2024 catalogue parser and a versioned regimen table for medicine units.
- Forecast versioning and a model registry.
- Live Postgres seed verification (Docker was not running during the build).
- NHLMIS/DHIS2 access and real medicine-consumption ingestion.
- Full clean-state reset and final demo verification.
