# Forecasting pipeline

Generates the illustrative demonstration dataset and the demand forecasts consumed by
the web app. Python 3.11, managed with `uv`.

## Run

```bash
cd ml
uv sync
uv run python run.py
```

Outputs JSON artifacts to `../data/seed/`:

| File | Contents |
|---|---|
| `facilities.json` | Four FCT demonstration facilities |
| `medicines.json` | 12 essential medicines with barcodes and lead times |
| `inventory.json` | Final batch snapshot, including expired and near-expiry stock |
| `movements.json` | Recent stock ledger entries |
| `consumption.json` | 731 days of facility-medicine consumption |
| `purchase_orders.json` | Confirmed and delivered purchase orders |
| `weather.json` | Real Open-Meteo ERA5 history for Abuja |
| `disease.json` | Illustrative weekly FCT disease indicators |
| `forecasts.json` | Chosen model, metrics, intervals and 30-day points |
| `model_runs.json` | Backtest comparison across models |
| `meta.json` | Demo clock, disclaimer, scenario summary |

The web seed script loads these files into SQLite.

## What it does

1. Fetches/caches Open-Meteo daily rainfall, temperature and humidity for Abuja.
   Falls back to synthetic Abuja climate if offline.
2. Generates illustrative weekly disease indicators (malaria, cholera, respiratory,
   meningitis, Lassa fever). These are **not** official NCDC data.
3. Simulates facility demand with weekday effects, seasonality, weather sensitivity
   and a labelled late-season ACT demand surge.
4. Simulates ordering, lead times, FEFO issue, stockouts and expiry.
5. Normalises final stock cover so the demonstration network reads clearly, without
   hiding stockout history from the model.
6. Trains and backtests:
   - seasonal naive baseline
   - 28-day moving average
   - Ridge regression
   - XGBoost with climate and disease features
   - XGBoost + seasonal ensemble
7. Selects a model per series (keeping baselines where they win), writes 30-day
   forecasts with 80% and 95% intervals.
8. Reconciles the hero stockout scenario in units derived from the actual forecast.

## Data honesty

- Facility inventory and consumption are simulated.
- Disease indicators are illustrative.
- Weather is real Open-Meteo history.
- Backtest metrics are on simulated data and are not evidence of real-world impact.
- Disease-to-medicine relationships require clinical and pharmaceutical validation.

## Files

```
aisec/config.py     facilities, medicines, suppliers, scenario, disease baselines
aisec/weather.py    Open-Meteo fetch/cache, weather features, future climatology
aisec/generate.py   disease + demand simulation, inventory simulation, scenario
aisec/model.py      features, backtest, model selection, final forecasts
aisec/export.py     JSON artifacts and scenario summary
run.py              orchestrator
```
