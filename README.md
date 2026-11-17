# Aisec

**Predictive medicine supply intelligence for Nigerian health facilities.**

We tell facilities which medicines will run out, when, and where the nearest verified
surplus stock is — before the shelf is empty.

> Hackathon build. Facility inventory and consumption are **simulated**. Disease
> indicators are **illustrative**. Weather is real Open-Meteo history for Abuja.

---

## What works

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

### Network coordination

- Network overview of facilities at risk and transferable surplus.
- Shortage-to-surplus matching by medicine, shelf life and safe cover.
- Transfer recommendation with quantity, batch and expiry.
- Request → approve/dispatch → confirm receipt workflow with audit trail.
- Stockout date recalculates after receipt; the alert clears automatically.

### Mobile PWA

- Installable mobile shell at `/m`.
- Camera barcode scanning with manual fallback and demo barcode labels.
- Quick issue/receive with batch, expiry and FEFO.
- Offline queue in IndexedDB; reconnect and sync with duplicate protection.
- Role-aware demo personas and facility scoping.

---

## Quick start

Requirements: Node 20+, npm, Python 3.11+, [uv](https://docs.astral.sh/uv/).

```bash
# 1. install web dependencies
cd web && npm install && cd ..

# 2. install Python dependencies, generate the demo dataset, seed SQLite
npm run setup

# 3. run
npm run dev
```

Open:

- Web dashboard: <http://localhost:3000>
- Mobile PWA: <http://localhost:3000/m>

If port 3000 is busy, Next prints the actual port.

The installable PWA and its offline shell register only in a production build. Use
`npm run build && npm start` (or the root `npm run build && npm start`) for the
full mobile experience. Camera scanning requires a secure context: use `localhost`
on the demo laptop, or an HTTPS tunnel/deployment for a phone. Manual entry and the
demo barcode labels work everywhere.

### Demo clock

The dataset is anchored to **17 November 2026**. The app uses a fixed demo clock so
the pitch is stable regardless of the presentation date. Replace `DEMO_TODAY` in
`web/src/lib/config.ts` with `new Date()` for a live deployment, and regenerate data.

### Reset the demo

```bash
npm run db:reset        # reset SQLite and re-seed from data/seed
npm run data            # regenerate data + forecasts (optional)
npm run db:seed         # load the latest generated data
```

`npm run setup` does the full pipeline end-to-end.

---

## Architecture

```
web/   Next.js 16 App Router · TypeScript · Tailwind v4 · Recharts
       Prisma + SQLite (Postgres-ready schema)
       Dashboard routes + mobile PWA + API route handlers
       Demo personas via secure cookies (replace with Supabase Auth for a pilot)

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
| `POST /api/session` | Switch demo persona |
| `POST /api/facility` | Set active facility scope |
| `POST /api/stock/issue` | FEFO issue + consumption + audit |
| `POST /api/stock/receive` | Create batch + receipt movement |
| `POST /api/transfers` | Create transfer request |
| `POST /api/transfers/:id/approve` | Deduct source stock, mark in transit |
| `POST /api/transfers/:id/receive` | Add destination batch, complete transfer |

Stock endpoints accept a `clientId` for idempotent mobile sync.

---

## Demo personas

Switch personas from the sidebar (or the mobile header on small screens).

| Persona | Role | Scope |
|---|---|---|
| Dr. Ngozi Adeyemi | Network authority | All four facilities |
| Amina Yusuf | Inventory operator | Gwagwalada PHC |
| Dr. Chidi Okonkwo | Facility manager | General Hospital Abuja |
| Dr. Bola Ajayi | Facility manager | Sunrise Hospital |
| Emeka Nwosu | Facility manager | CarePoint Pharmacy |
| Tunde Bakare | Supplier | Not exposed in the demo switcher; supplier portal is a pilot surface |

Personas are **not authentication**. See [DEMO.md](DEMO.md) for the presentation script.

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

Weather is real historical Open-Meteo data for Abuja. Disease indicators are
illustrative and labelled as such throughout the UI.

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

Latest run (simulated data): XGBoost **WAPE 16.7%** vs seasonal baseline **28.6%**.
These are pipeline validation numbers, **not** evidence of real-world stockout reduction.

---

## Security and data governance

- No patient-identifiable data is collected.
- Facility-scoped access checks on every mutation.
- Role-based approve/receive gates.
- Audit log for inventory and transfer actions.
- SQLite for the hackathon; production moves to Supabase Postgres with RLS.
- Demo persona cookies must be replaced with real auth, MFA for approvers and
  per-facility row-level security before a pilot.

---

## What is deliberately not built

- Hospital management, appointments, prescriptions, patient records.
- Automated diagnosis or medicine substitution.
- Supplier marketplace.
- Live NHLMIS / DHIS2 integration.
- Automatic ordering or automatic transfers.
- Deep learning.

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
