# Backend & Data Plan

**Status:** IN PROGRESS
**Last updated:** 2026-11-18
**Deadline:** 2026-11-21 (hackathon delivery)
**Owner:** Backend/Data workstream

This is the living plan for the backend and data side of Cheta. Update the
checkboxes and the progress log as work lands. Do not let this document drift
from the code.

---

## 1. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Delivery target | Pilot-ready backbone, with the demo kept green | The demo must still work on 21 Nov, but the data/backend should survive beyond it. |
| Data strategy | Hybrid calibrated | Real public data where it exists; transparent derived demand; partner LMIS data plugged in later. |
| Backend shape | Next.js + Prisma product API + Python batch jobs | Avoids a rewrite and keeps the existing product surface. |
| Database | Postgres now, with a SQLite demo fallback | Postgres is needed for provenance, concurrency and real ingestion. |
| Public data | Scrape what is genuinely public | Do not bypass API keys, logins or NHLMIS access controls. |
| Forecast target | Real service/disease drivers, then convert to medicine units | Avoids claiming accuracy on synthetic medicine sales. |

**Non-negotiable honesty rule:** every number in the UI and exports must be
labelled `OBSERVED`, `DERIVED` or `SIMULATED`. No real-world accuracy claim is
made on derived or simulated data.

---

## 2. Four-day sprint (17–21 Nov 2026)

### Day 1 — Tue 17 Nov: data foundation

- [x] Document the plan in the repo (`docs/BACKEND_DATA_PLAN.md`, `docs/DATA_SOURCES.md`)
- [x] Add machine-readable source registry (`data/registry/sources.yaml`)
- [x] Add data contracts (`data/contracts/*.schema.json`)
- [x] Build ingestion framework (`ml/aisec/ingest/`)
- [x] Scrape NCDC Weekly Epidemiological Reports (2023-07 → latest; 1,338 rows)
- [x] Scrape GRID3 + HDX facility master data (70,235 GRID3; 46,146 NHFR; 1,047 FCT)
- [x] Scrape NMIS 2021 malaria prevalence (37 states + national)
- [x] Scrape NEML 2024 medicine catalogue (768 medicine/dosage rows)
- [x] Validate scraped data and write a manifest
- [x] Wire real NCDC/NMIS signals into the forecasting pipeline
- [x] Preserve provenance in the exported seed (`isDerived`, `isImputed`, `dataSources`)

### Day 2 — Wed 18 Nov: integrate real data

- [x] Add provenance columns and new models to Prisma schema (`DataSource`,
      `IngestRun`; provenance on facilities, disease, consumption)
- [x] Add Postgres docker-compose and schema-generation path
      (validated; live Postgres seed not yet run because Docker was not running)
- [x] Keep the SQLite `demo` profile working
- [x] Replace the synthetic disease input with real NCDC + NMIS + weather signals
- [~] Replace the demo facility inputs with real GRID3/NHFR records
      (real FCT extracts are in `data/processed/`; the 4 demo facilities are
      still illustrative and labelled as such)
- [ ] Add `APP_TODAY` clock abstraction
- [x] Add data-quality checks and a quality report (`/data`, manifest, API)
- [x] Extend the export contract so the web app can display provenance

### Day 3 — Thu 19 Nov: model + API

- [x] Build a real disease-burden target from NCDC weekly counts
      (a standalone service-volume/regimen dataset is still pending)
- [ ] Add a versioned regimen table for medicine-unit conversion
- [x] Backtest on a real target (4-week rolling holdout on NCDC counts;
      selected WAPE 46.1% vs seasonal 103.7%)
- [ ] Add forecast versioning and a model registry
- [x] Add `/api/v1/*` read endpoints (health, data sources, disease, facilities,
      forecasts)
- [ ] Add OpenAPI contract and typed response helpers
- [~] Add data-quality and model-run endpoints (data sources and disease done;
      model runs pending)

### Day 4 — Fri 20 Nov: product surface + hardening

- [x] Show data provenance and confidence in the UI (`/data`)
- [x] Add a data-quality page or panel
- [x] Update the demo seed from the new pipeline
- [x] Add scraper fixtures and tests (`ml/tests/`, 4 passing)
- [x] Run lint, typecheck and a production build
- [~] Update `README.md`, `PLAN.md` and this document (README and this document
      updated; `PLAN.md` still pending)
- [x] Full clean-state reset (`npm run data` + `npm run db:reset`) and
      page/API verification (`/dashboard`, `/data`, `/model`, `/api/v1/*`)

### Fri 21 Nov: freeze + verify

- [ ] Freeze data and model artifacts
- [ ] Run the full `npm run setup` from a clean state
- [ ] Verify the 90-second demo path
- [ ] Record the exact outputs and known limitations
- [ ] Final progress-log entry

### Explicitly post-submission

- [x] Auth.js accounts, invitations and revocable sessions
- [ ] MFA for approvers and Postgres RLS
- [ ] NHLMIS / DHIS2 credentialed ingestion
- [ ] Full crosswalk review across NHFR / GRID3 / DHIS2 / NHLMIS
- [ ] Pilot data-sharing agreements
- [ ] Production scheduling and monitoring

---

## 3. Data sources

Detailed notes and parser guidance live in [`DATA_SOURCES.md`](./DATA_SOURCES.md).
The machine-readable registry is [`data/registry/sources.yaml`](../data/registry/sources.yaml).

### Public and scrapeable now

| Source | Data | Method | Status |
|---|---|---|---|
| NCDC Weekly Epidemiological Reports | Weekly outbreak disease counts | HTML index → PDF → `pdftotext -layout` | To build |
| GRID3 NGA Health Facilities v4.0 | ~51k geocoded facilities | HDX API → GeoPackage → GeoPandas | To build |
| HDX Nigeria Health Facilities (NHFR snapshot) | ~34k facilities | HDX API → CSV | To build |
| HDX DHS / MIS / population / WHO indicators | Care-seeking, prevalence, denominators | HDX API → CSV | To build |
| NMIS 2021 report | State malaria prevalence, treatment | DHS PDF → text tables | To build |
| NEML 2024 | Essential medicines + ATC | WHO PDF → tables | To build |
| Open-Meteo ERA5 | Daily weather | Archive API (already used) | Existing |

### Gated — request access, do not bypass

| Source | Why it matters | Route |
|---|---|---|
| NHFR API (`backend.hfr.fmohconnect.gov.ng/api/v1`) | Official facility master | `X-API-Key`; request via NHFR/FMoH |
| DHIS2 Nigeria (`dhis2nigeria.org.ng/dhis`) | Monthly service volumes, malaria cases | FMoH/NHMIS credentials |
| NHMIS dashboards | Aggregated service data | FMoH access |
| NBS NHFS 2023 | Facility readiness and stockout priors | NBS microdata registration |
| NHLMIS | Real consumption, stock-on-hand, stockouts | FMoH/NPSCMP data-sharing agreement |
| Facility HMS/pharmacy systems | Real dispensing | Pilot facility agreement |

### Not public — do not scrape

- NHLMIS transactional data.
- Patient-level records.
- Any credentialed DHIS2/NHMIS endpoint.

---

## 4. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│ web/  Next.js 16 — product UI + versioned product API       │
│  • server components (read)                                 │
│  • /api/v1/* route handlers (read + write)                   │
│  • auth, roles, facility scope, audit                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma
┌──────────────────────────▼──────────────────────────────────┐
│ Postgres                                                    │
│  core · raw_meta · analytics · ops                          │
└──────────────────────────▲──────────────────────────────────┘
                           │ idempotent upserts + artifacts
┌──────────────────────────┴──────────────────────────────────┐
│ ml/  Python batch system (uv)                               │
│  ingest/ → validate/ → features/ → models/ → eval/ → export │
│  CLI + scheduled jobs; writes data, not UI                  │
└─────────────────────────────────────────────────────────────┘
        │
        └── data/raw (immutable) · data/contracts · data/processed
```

### Repository layout

```
data/
  raw/{source}/{as_of}/...          immutable downloaded payloads
  contracts/*.schema.json           artifact contracts
  processed/                        normalised CSV/JSON + manifest
  registry/sources.yaml             source registry
  seed/                             existing app seed (demo profile)

ml/aisec/ingest/
  __init__.py
  __main__.py                       CLI
  base.py                           Source protocol, manifests, hashing
  http.py                           polite HTTP client + cache
  hdx.py                            HDX API helper
  ncdc.py                           NCDC WER scraper/parser
  grid3.py                          GRID3 + NHFR facility ingest
  nmis.py                           NMIS 2021 prevalence parser
  neml.py                           NEML catalogue parser
  open_meteo.py                     weather provenance wrapper
  validate.py                       contract + quality checks

docs/
  BACKEND_DATA_PLAN.md              this file
  DATA_SOURCES.md                   source notes
  README.md                         docs index
```

---

## 5. Schema changes

### New models

| Model | Purpose |
|---|---|
| `DataSource` | Source registry mirrored in the DB |
| `IngestRun` | Every ingestion attempt, rows, checksum, status |
| `DataQualityIssue` | Validation failures and warnings |
| `Geography` | State/LGA/ward codes and population |
| `ServiceObservation` | OPD visits, malaria cases, fever cases, ANC, etc. |
| `StockObservation` | Stock-on-hand, stock status, AMC, months of stock |
| `Regimen` | Medicine-unit conversion with citations |
| `FacilityAlias` / `MedicineAlias` | Crosswalk between source identifiers |
| `TrainingDataset` | Versioned dataset manifest |
| `ModelArtifact` | Trained model, params, features, metrics, URI |
| `ForecastRun` | A forecast issuance event |
| `BacktestRun` / `BacktestResult` | Rolling-origin evaluation |

### Extensions

- `Facility`: `nhfrId`, `grid3Id`, `dhis2OrgUnitId`, `lgaCode`, `ward`,
  `catchmentPopulation`, `level`, `services`, `sourceId`, `isVerified`
- `Medicine`: `nemlId`, `nafdacProductId`, `route`, `isControlled`, `coldChain`
- `ConsumptionRecord`: `observedQuantity`, `adjustedQuantity`, `censoring`,
  `granularity`, `sourceId`, `qualityFlag`, `reportedAt`, `isIllustrative`
- `DiseaseObservation`: `lgaCode`, `sourceId`, `ingestRunId`, `confirmed`,
  `suspected`, `deaths`; fix the nullable unique key
- `WeatherObservation`: `sourceId`, `ingestRunId`, `latitude`, `longitude`
- `Forecast`: `forecastRunId`, `modelArtifactId`, `asOf`, `issuedAt`, `version`;
  keep history instead of one row per facility/medicine
- `StockAlert`: `dedupeKey`, `lastEvaluatedAt`
- `AuditLog`: `requestId`, `ipHash`

### Database rules

- Postgres in dev and prod. SQLite only for the pinned demo profile.
- Prisma owns the schema and migrations. Python writes through SQL/psycopg.
- No `prisma db push` for real data.
- JSONB for JSON fields.

---

## 6. API changes

| Endpoint | Purpose | Priority |
|---|---|---|
| `GET /api/v1/facilities` | Facility master, scope-aware | Must |
| `GET /api/v1/medicines` | Catalogue with NEML/ATC identifiers | Must |
| `GET /api/v1/forecasts` | Versioned forecast + intervals + metrics | Must |
| `GET /api/v1/data-quality` | Freshness, missingness, source coverage | Must |
| `GET /api/v1/model-runs` | Backtest and registry data | Should |
| `GET /api/v1/inventory` | Batches, movements, stock position | Should |
| `GET /api/v1/alerts` | Open/acknowledged/resolved, deduped | Should |
| `GET /api/v1/opportunities` | Surplus→shortage matches | Could |
| `POST /api/v1/ingest/runs` | Service-token ingest trigger | Post-submission |
| `POST /api/v1/forecasts/run` | Service-token retrain/issue | Post-submission |

Contract rules: Zod → OpenAPI, cursor pagination, `Idempotency-Key`,
`If-Match`, RFC 7807 errors, request IDs.

---

## 7. Model plan

The current model trains on simulated medicine consumption. That cannot support
real accuracy claims. The revised approach:

1. **Forecast real drivers** — monthly/weekly service volumes and disease counts.
2. **Convert to units** through a versioned `Regimen` table:
   `units = cases × regimen_units × coverage × (1 + wastage)`, rounded to pack size.
3. **Label the result** `DERIVED`, with the assumption set attached.
4. **Calibrate** to real consumption when partner LMIS/HMS data arrives.

Validation: rolling-origin walk-forward, multiple cutoffs, WAPE/MASE/bias,
pinball loss and empirical 80/95 interval coverage on the real target.

Models: seasonal naive, moving average, Croston/TSB for intermittent series,
Ridge, XGBoost/LightGBM, quantile GBM, conformal intervals, hierarchical
reconciliation.

---

## 8. Data contracts and quality

Every artifact must have a JSON Schema in `data/contracts/` and a manifest with:

- source id, source URL, retrieval time, HTTP status
- SHA-256 of the raw payload
- row counts: read, accepted, rejected
- date coverage and granularity
- validation errors and warnings
- licence and attribution
- `is_illustrative` / `is_derived` flags

Quality checks:

- schema validation
- required fields and types
- date continuity and duplicate detection
- value ranges and impossible values
- referential integrity (facility/medicine/geography)
- freshness
- outlier flags (report, do not silently drop)

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| No public Nigerian medicine consumption data | Hybrid strategy; provenance labels; pilot adapter ready |
| NCDC WER does not include malaria | Use NMIS 2021 prevalence and DHIS2 malaria data if access lands |
| PDF formats change between years | Per-year parser fixtures; start with 2021–2026 |
| Facility ID mismatches across sources | Crosswalk table with confidence and manual review |
| NHFR API key / DHIS2 login unavailable | Use GRID3/HDX and public survey data; request access |
| Four-day deadline | Must-ship scope is scraped data + provenance + read API; Postgres/auth can follow |
| Open-Meteo licence for commercial use | Confirm plan or switch to ERA9/NiMet |

---

## 10. Progress log

Newest entries first. Keep them short and factual.

### 2026-11-18
- Added first-class provenance to the database: `DataSource`, `IngestRun`, and
  provenance fields on `Facility`, `DiseaseObservation` and `ConsumptionRecord`.
- Seeded the source register and ingestion runs from the Python manifest.
- Added `/data` provenance page and `/api/v1/*` read endpoints (health, data
  sources, disease observations, facilities, forecasts). `{ data, meta }`
  response envelope.
- Added the Postgres docker-compose profile, schema-generation script and
  `db:pg:*` commands. The generated Postgres schema validates; the live seed
  was not run because the Docker daemon was not running in this environment.
- Reseeded SQLite and verified the app builds, lints and typechecks.
- Replaced scattered write-clock calls with `appNow()`; added `APP_PROFILE` and
  `APP_TODAY` so the demo clock and live clock are explicit.
- Added scraper fixtures and 4 passing pytest tests for the NCDC parser, NMIS
  parser and JSON contracts.
- Added a real-target backtest (`ml/aisec/real_forecast.py`): 4-week rolling
  holdout on six NCDC disease series, 6 cutoffs, per-disease model selection.
  Selected WAPE 46.1%, moving average 58.4%, seasonal baseline 103.7%. This is
  disease-burden accuracy, not medicine-demand accuracy.
- Exposed the backtest on `/data` and in `meta.json`.
- Added the NEML 2024 parser: 768 medicine/dosage rows extracted from the adult
  8th edition. The 2024 edition has no ATC codes, so the curated ATC mapping for
  the 12 demo medicines is retained.
- Full verification: data pipeline regenerated, SQLite reset and reseeded,
  5 pytest tests passed, TypeScript and ESLint clean, production build passed.
  Pages `/dashboard`, `/data`, `/model` and `/api/v1/*` returned 200.
- Still open: regimen table, forecast versioning, live Postgres seed
  verification, and the final 21 Nov freeze.

### 2026-11-17
- Added this plan, `docs/DATA_SOURCES.md`, `data/registry/sources.yaml` and
  `data/contracts/`.
- Built the Python ingestion framework under `ml/aisec/ingest/` (HTTP cache,
  manifests, JSON Schema validation, polite retries).
- Scraped NCDC WER 2023→latest: 1,338 disease-week rows, 149 report weeks.
  Handles both the modern `Table N: Week` layout and the older bare `Week N`
  layout.
- Scraped GRID3 v4.0 and the HDX NHFR snapshot: 70,235 and 46,146 facilities;
  1,047 and 576 FCT facilities respectively; exact-match crosswalk built.
- Parsed NMIS 2021 Table 4.8.2: 37 states + national malaria prevalence.
- Confirmed live access: NCDC WER PDFs are text-extractable; GRID3 v4.0 and HDX
  NHFR CSV are downloadable; NHFR API requires `X-API-Key`; DHIS2 Nigeria
  requires login; NHLMIS is not public.
- Confirmed NCDC WER does not report malaria; malaria priors come from NMIS
  2021 and DHIS2 if access lands.
- Replaced the synthetic disease input in `run.py` with real NCDC outbreak
  signals plus derived malaria/respiratory signals. The pipeline still trains
  on simulated medicine demand, but the covariates are now real.
- Exported provenance: `data/seed/meta.json` now names every data source, and
  `disease.json` carries `isDerived` / `isImputed` flags. NCDC weeks after the
  latest report are explicitly marked as carried forward.
- Known gaps: 9 NCDC rows are still rejected for missing dates; older 2023
  reports have a few section-not-found warnings; the NEML catalogue parser is
  not built yet.

---

## 11. How to update this document

1. Tick the checkbox when the item is done in code and verified.
2. Add a dated bullet to the progress log.
3. If a decision changes, update the decisions table and record why.
4. Keep the "Last updated" date current.
5. Do not mark data as `OBSERVED` unless it came from a real source with a
   recorded URL and retrieval time.
