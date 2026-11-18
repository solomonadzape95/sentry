# Data Sources

**Status:** living document — last verified 2026-11-17
**See also:** [`BACKEND_DATA_PLAN.md`](./BACKEND_DATA_PLAN.md) and
[`data/registry/sources.yaml`](../data/registry/sources.yaml)

This document records what each source is, how to access it, what it can and
cannot support, and the licence/attribution obligations. If a source changes,
update this file and the registry together.

---

## 1. Public and scrapeable now

### NCDC Weekly Epidemiological Reports (WER)

- **Owner:** Nigeria Centre for Disease Control and Prevention (NCDC)
- **Index:** <https://ncdc.gov.ng/reports/weekly>
- **Pattern:** `/reports/weekly/{year}/{month}/{epi_week}` → PDF at
  `/themes/common/docs/wers/{id}_{timestamp}.pdf`
- **Granularity:** weekly, national; per-disease text includes states and LGAs
  affected (not always a full per-state breakdown).
- **Diseases:** Lassa fever, cerebrospinal meningitis (CSM), yellow fever,
  cholera, measles, mpox, acute flaccid paralysis (AFP), COVID-19, diphtheria,
  sentinel influenza.
- **Not included:** malaria. Malaria must come from NMIS/DHIS2/WHO.
- **Extraction:** `pdftotext -layout` works cleanly. Tested on W34 2026: 13
  pages, structured summary and per-disease tables.
- **Caveat:** formats drift between years. Start with 2021–2026 and add
  per-year fixtures. Some values are reported as "State: 14 + FCT" and
  "LGA: 37", not full counts.
- **Licence/attribution:** Nigerian government public report. Attribute NCDC and
  link the source report. Do not imply NCDC endorsement.
- **Use:** real outbreak disease covariates; ORS/cholera, Lassa, meningitis and
  respiratory demand drivers.

### GRID3 NGA Health Facilities v4.0

- **Owner:** GRID3 / CIESIN
- **HDX dataset:** `grid3-nga-health-facilities-v4-0`
- **API:** `https://data.humdata.org/api/3/action/package_show?id=grid3-nga-health-facilities-v4-0`
- **Resources:** national GeoPackage (27 MB), state GeoPackage ZIP (6.7 MB),
  data release notes (PDF), XML metadata.
- **Coverage:** ~51k geocoded facilities, 2018–2025.
- **Fields (expected):** facility name, type, ownership, ward, LGA, state,
  latitude/longitude, unique ID. Confirm exact column names after the first
  read; map them in `ml/aisec/ingest/grid3.py`.
- **Licence:** CC BY 4.0. Attribute GRID3 and CIESIN.
- **Use:** facility master list, catchment denominators, network topology.

### HDX Nigeria Health Facilities (NHFR snapshot)

- **Owner:** Nigeria Federal Ministry of Health / HDX
- **HDX dataset:** `nigeria-health-facilities`
- **API:** `https://data.humdata.org/api/3/action/package_show?id=nigeria-health-facilities`
- **Resources:** CSV (9.9 MB), JSON (25 MB), SHP (3.2 MB).
- **Coverage:** ~34k facilities, 2020 snapshot.
- **Licence:** CC BY 4.0.
- **Use:** second facility source; crosswalk against GRID3; historical
  comparison.

### HDX DHS / MIS / population / WHO indicators

- **Datasets:** `dhs-data-for-nigeria`, `dhs-subnational-data-for-nigeria`,
  `nigeria-health-facilities`, `who-data-for-nga`,
  `world-bank-health-indicators-for-nigeria`, `worldpop-population-counts-for-nigeria`.
- **API:** `https://data.humdata.org/api/3/action/package_search?q=...`
- **Licence:** usually CC BY; check each dataset.
- **Use:** care-seeking, treatment rates, malaria prevalence, population
  denominators, validation.

### Nigeria Malaria Indicator Survey (NMIS) 2021

- **Owner:** NMEP, NPC, ICF / DHS Program
- **Report:** <https://dhsprogram.com/pubs/pdf/MIS41/MIS41.pdf>
- **Key table:** Table 4.8.2 — malaria prevalence in children 6–59 months by
  state (RDT and microscopy). Example: FCT-Abuja RDT 34.6%, microscopy 18.8%.
- **Microdata:** <https://microdata.worldbank.org/index.php/catalog/5763>
  (registration and terms apply).
- **Licence:** DHS Program terms; cite NMEP/NPC/ICF.
- **Use:** real malaria prevalence prior for FCT; calibration of ACT demand.

### Nigeria Essential Medicines List (NEML) 2024

- **Owner:** Federal Ministry of Health and Social Welfare
- **WHO page:** <https://www.who.int/publications/m/item/nigeria--essential-medicines-list-2024-(english)>
- **Also:** NEML for Children 2024; NEML 2020; NHIS medicines price list 2021.
- **Use:** medicine catalogue, ATC mapping, essential-medicine flags.
- **Parser:** `ml/aisec/ingest/neml.py` downloads the adult 8th edition and
  extracts 768 medicine/dosage rows to `data/processed/neml_medicines.csv`.
- **Caveat:** the 2024 edition does not print ATC codes. The existing curated
  ATC mapping for the 12 demo medicines is retained; the NEML extract is used
  for catalogue validation, not for claiming a full ATC crosswalk.

### Open-Meteo ERA5

- **Archive API:** `https://archive-api.open-meteo.com/v1/archive`
- **Forecast API:** `https://api.open-meteo.com/v1/forecast` (16-day horizon)
- **Variables:** rainfall, temperature max/min/mean, relative humidity.
- **Licence:** CC BY 4.0; free tier is non-commercial. Confirm a commercial plan
  before production.
- **Use:** weather features and future weather. Already used by `ml/aisec/weather.py`.

---

## 2. Gated sources — request access

### Nigeria Health Facility Registry (NHFR) API

- **Frontend:** <https://hfr.fmohconnect.gov.ng/> and <https://hfr.health.gov.ng/>
- **API root:** `https://backend.hfr.fmohconnect.gov.ng/api/v1`
- **Auth:** `X-API-Key` header. Without it:
  `{"status":"error","message":"API key is required...","code":"MISSING_API_KEY"}`
- **Endpoints advertised:** `facilities`, `pharmacies`, `laboratories`,
  `imaging`, `lookups/states`, `facilities/statistics`.
- **Route:** request a key from NHFR/FMoH. Until then, use GRID3 + HDX.
- **Do not:** attempt to bypass the key or scrape the authenticated backend.

### DHIS2 Nigeria (NHMIS)

- **Instance:** <https://dhis2nigeria.org.ng/dhis/>
- **Auth:** login required. API calls redirect to the login page without a
  session/basic auth.
- **Value:** monthly facility→LGA→state service volumes, malaria cases, OPD
  visits, ANC, deliveries, immunization.
- **Route:** FMoH/NHMIS credentials or an approved data extract.
- **Do not:** attempt to bypass the login.

### NHMIS dashboards

- **Dashboard SPA:** <https://dashboards.fmohconnect.gov.ng/>
- **Monthly analysis:** <http://monthly-nhmis-analysis.fmohconnect.gov.ng/>
- **Status:** SPA/static; data access is not obviously public. Treat as gated.
- **Route:** FMoH data team.

### NBS National Health Facility Survey 2023

- **Catalog:** <https://microdata.nigerianstat.gov.ng/index.php/catalog/149>
- **Value:** facility readiness, medicine availability/stockouts,
  cross-sectional priors.
- **Access:** NBS microdata registration and terms.

### NHLMIS

- **What:** national health logistics management information system.
- **Reported scale:** 1M+ batch-level transactions, ~34k facilities, 5+ years,
  APIs to DHIS2.
- **Value:** the only real national source of consumption, stock-on-hand and
  stockouts.
- **Access:** FMoH / NPSCMP data-sharing agreement.
- **Do not:** scrape or bypass access controls.

### Facility HMS / pharmacy systems

- **Access:** pilot facility agreement.
- **Value:** real dispensing/consumption, the best calibration target.

---

## 3. Derived and synthetic data

### Derived demand

When real service volumes are unavailable, demand is derived from real drivers
using a versioned regimen table:

```
units = cases × regimen_units × coverage × (1 + wastage)
```

Every multiplier must have a citation and be stored in `Regimen`. Derived rows
are labelled `DERIVED`; they are not observations.

### Simulated data

The existing `data/seed/` dataset remains the hackathon demo. It is labelled
`SIMULATED`. It must not be mixed into real-data training or reported as real.

---

## 4. Attribution checklist

- [ ] NCDC WER: link the report and attribute NCDC.
- [ ] GRID3: attribute GRID3/CIESIN, CC BY 4.0.
- [ ] HDX/NHFR: attribute FMoH and HDX, CC BY 4.0.
- [ ] DHS/NMIS: cite NMEP, NPC and ICF.
- [ ] Open-Meteo: attribute Open-Meteo/ERA5, CC BY 4.0.
- [ ] NEML: cite FMoH and the NEML edition.
- [ ] Never imply government or partner endorsement.
- [ ] No patient-identifiable data.

---

## 5. Parser notes

### NCDC WER

The PDF text contains:

- `Issue: Volume 16 No. 34. 14th Sept. 2026`
- `Week 34: 17th – 23rd August 2026`
- `Table 1: Week 34, ...` summary with suspected/confirmed/deaths triples
- Per-disease `Table N: Week 34` and `Table N: <Disease> Year to date`
- `State: 14 + FCT` / `LGA: 37` lines

Parse strategy: extract text with `pdftotext -layout`, split on disease
headings, pull integer triples, and validate against the narrative key points.
Keep the raw text path and page number for audit.

### GRID3 GeoPackage

Read with GeoPandas (`geopandas.read_file`). Inspect `gdf.columns` on the first
run and map to canonical facility fields. Do not assume column names; log the
detected schema in the ingest manifest.

### NMIS 2021

Find Table 4.8.2 in the extracted text, then parse lines of the form
`<state> <rdt_pct> <n> <micro_pct> <n>`. Keep the state name as published; map
to LGA/state codes later.

### NEML 2024

Prefer `pdfplumber` table extraction. If the table structure is unstable,
produce a curated CSV with page references and mark `manual_verified: true`.
