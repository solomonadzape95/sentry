from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (
    FACILITIES,
    FORECAST_HORIZON,
    HISTORY_DAYS,
    MEDICINES,
    SCENARIO,
    SUPPLIERS,
    TODAY,
    USERS,
)

ROOT = Path(__file__).resolve().parent.parent.parent
SEED_DIR = ROOT / "data" / "seed"

DISEASE_SOURCES = {
    "CHOLERA": {
        "source": "NCDC Weekly Epidemiological Report (suspected cases)",
        "url": "https://ncdc.gov.ng/reports/weekly",
        "isIllustrative": False,
        "isDerived": False,
    },
    "MENINGITIS": {
        "source": "NCDC Weekly Epidemiological Report (suspected cases)",
        "url": "https://ncdc.gov.ng/reports/weekly",
        "isIllustrative": False,
        "isDerived": False,
    },
    "LASSA_FEVER": {
        "source": "NCDC Weekly Epidemiological Report (suspected cases)",
        "url": "https://ncdc.gov.ng/reports/weekly",
        "isIllustrative": False,
        "isDerived": False,
    },
    "MALARIA": {
        "source": "DERIVED: NMIS 2021 FCT prevalence + Open-Meteo rainfall",
        "url": "https://dhsprogram.com/pubs/pdf/MIS41/MIS41.pdf",
        "isIllustrative": False,
        "isDerived": True,
    },
    "RESPIRATORY": {
        "source": "DERIVED: Open-Meteo temperature/humidity seasonality",
        "url": "https://open-meteo.com",
        "isIllustrative": False,
        "isDerived": True,
    },
}


def _date(v) -> str:
    if isinstance(v, (pd.Timestamp, date)):
        return pd.Timestamp(v).date().isoformat()
    return str(v)


def _clean(obj):
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (pd.Timestamp, date)):
        return _date(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    return obj


def _write(name: str, payload) -> None:
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    path = SEED_DIR / name
    path.write_text(json.dumps(_clean(payload), separators=(",", ":")))
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.0f} KB)")


def export_all(
    obs: pd.DataFrame,
    batches: list[dict],
    movements: list[dict],
    purchases: list[dict],
    weather: pd.DataFrame,
    disease: pd.DataFrame,
    forecasts: list[dict],
    model_runs: list[dict],
    demand_map: dict[tuple[str, str], list[float]],
    scenario_summary: dict,
) -> None:
    _write("facilities.json", [
        {
            "id": f["id"], "name": f["name"], "shortName": f["shortName"],
            "type": f["type"], "ownership": f["ownership"], "address": f["address"],
            "lga": f["lga"], "state": f["state"], "latitude": f["latitude"],
            "longitude": f["longitude"], "phone": f["phone"], "contactName": f["contactName"],
            "bedCount": f["bedCount"],
        }
        for f in FACILITIES
    ])

    _write("medicines.json", [
        {
            "id": m["id"], "name": m["name"], "genericName": m["genericName"],
            "strength": m["strength"], "form": m["form"], "category": m["category"],
            "unit": m["unit"], "packSize": m["packSize"], "barcode": m["barcode"],
            "atcCode": m["atcCode"], "essential": m["essential"], "storage": m["storage"],
            "leadTimeDays": m["leadTimeDays"], "shelfLifeDays": m["shelfLifeDays"],
        }
        for m in MEDICINES
    ])

    _write("suppliers.json", SUPPLIERS)
    _write("users.json", USERS)

    _write("inventory.json", [
        {
            "id": b["id"], "facilityId": b["facility_id"], "medicineId": b["medicine_id"],
            "supplierId": b["supplier_id"], "batchNumber": b["batch_number"],
            "quantityReceived": b["quantity_received"], "quantityRemaining": b["quantity_remaining"],
            "expiryDate": _date(b["expiry_date"]), "receivedAt": _date(b["received_at"]),
            "unitCostNgn": b["unit_cost_ngn"], "status": b["status"],
        }
        for b in batches
    ])

    _write("movements.json", [
        {
            "facilityId": m["facility_id"], "medicineId": m["medicine_id"],
            "type": m["type"], "quantity": m["quantity"], "balanceAfter": m["balance_after"],
            "reason": m["reason"], "reference": m["reference"],
            "occurredAt": _date(m["occurred_at"]),
            "batchNumber": m.get("batch_number"),
        }
        for m in movements
    ])

    _write("purchase_orders.json", [
        {
            "reference": p["reference"], "facilityId": p["facility_id"],
            "supplierId": p["supplier_id"], "medicineId": p["medicine_id"],
            "quantity": p["quantity"], "status": p["status"],
            "orderedAt": _date(p["ordered_at"]), "expectedAt": _date(p["expected_at"]),
        }
        for p in purchases
    ])

    _write("weather.json", [
        {
            "location": "Abuja", "state": "FCT", "date": _date(r.date),
            "rainfallMm": round(float(r.rainfall_mm), 1),
            "tempMaxC": round(float(r.temp_max_c), 1),
            "tempMinC": round(float(r.temp_min_c), 1),
            "humidityPct": round(float(r.humidity_pct), 1),
            "source": getattr(r, "source", "Open-Meteo ERA5"),
        }
        for r in weather.itertuples()
    ])

    disease_rows = []
    for _, row in disease.iterrows():
        for name in ["MALARIA", "CHOLERA", "RESPIRATORY", "MENINGITIS", "LASSA_FEVER"]:
            provenance = DISEASE_SOURCES.get(
                name,
                {"source": "Unknown", "isIllustrative": True, "isDerived": False},
            )
            is_ncdc = name in ("CHOLERA", "MENINGITIS", "LASSA_FEVER")
            stale = is_ncdc and bool(row.get("NCDC_STALE", False))
            source = provenance["source"]
            if stale:
                source = f"{source} — last observation carried forward"
            disease_rows.append({
                "disease": name, "state": "FCT", "lga": None,
                "periodStart": _date(row["date"]), "periodEnd": _date(row["periodEnd"]),
                "cases": int(row[name]),
                "source": source,
                "sourceUrl": provenance.get("url"),
                "isIllustrative": provenance["isIllustrative"],
                "isDerived": provenance["isDerived"] or stale,
                "isImputed": stale,
            })
    _write("disease.json", disease_rows)

    # Compact consumption rows keep the seed file manageable.
    consumption = [
        [r.facility_id, r.medicine_id, _date(r.date), int(r.consumed), bool(r.was_stockout)]
        for r in obs.itertuples()
    ]
    _write("consumption.json", consumption)

    _write("forecasts.json", forecasts)
    _write("model_runs.json", model_runs)

    weather_source = "Open-Meteo ERA5"
    if "source" in weather.columns and len(weather):
        weather_source = str(weather["source"].iloc[0])

    ncdc_latest = None
    if "NCDC_STALE" in disease.columns:
        observed = disease[~disease["NCDC_STALE"]]
        if not observed.empty:
            ncdc_latest = _date(observed["date"].max())

    real_backtest = None
    real_backtest_path = ROOT / "data" / "processed" / "real_target_backtest.json"
    if real_backtest_path.exists():
        real_backtest = json.loads(real_backtest_path.read_text())

    _write("meta.json", {
        "today": TODAY,
        "historyDays": HISTORY_DAYS,
        "horizonDays": FORECAST_HORIZON,
        "weatherSource": weather_source,
        "ncdcLatestObservation": ncdc_latest,
        "dataDisclaimer": (
            "Facility inventory and consumption are simulated for demonstration. "
            "Cholera, meningitis and Lassa fever signals come from real NCDC Weekly "
            "Epidemiological Reports. Malaria is derived from the NMIS 2021 FCT "
            "prevalence and Open-Meteo rainfall. Respiratory demand is derived from "
            "Open-Meteo seasonality. Weather is real Open-Meteo history for Abuja. "
            "Disease-to-medicine relationships are hypotheses, not clinical advice."
        ),
        "dataSources": [
            {
                "id": "ncdc_wer",
                "name": "NCDC Weekly Epidemiological Reports",
                "kind": "OBSERVED",
                "coverage": "2023-07 to latest available report",
                "url": "https://ncdc.gov.ng/reports/weekly",
            },
            {
                "id": "nmis_2021",
                "name": "Nigeria Malaria Indicator Survey 2021",
                "kind": "OBSERVED_PRIOR",
                "coverage": "2021 state-level prevalence",
                "url": "https://dhsprogram.com/pubs/pdf/MIS41/MIS41.pdf",
            },
            {
                "id": "open_meteo",
                "name": "Open-Meteo ERA5",
                "kind": "OBSERVED",
                "coverage": "daily history for Abuja",
                "url": "https://open-meteo.com",
            },
            {
                "id": "grid3_facilities",
                "name": "GRID3 NGA Health Facilities v4.0",
                "kind": "REFERENCE",
                "coverage": "national facility master list",
                "url": "https://data.humdata.org/dataset/grid3-nga-health-facilities-v4-0",
            },
            {
                "id": "hdx_nhfr_facilities",
                "name": "Nigeria Health Facilities (NHFR snapshot)",
                "kind": "REFERENCE",
                "coverage": "2020 facility snapshot",
                "url": "https://data.humdata.org/dataset/nigeria-health-facilities",
            },
            {
                "id": "neml_2024",
                "name": "Nigeria Essential Medicines List 2024",
                "kind": "REFERENCE",
                "coverage": "NEML Adult 8th Edition 2024",
                "url": "https://www.who.int/publications/m/item/nigeria--essential-medicines-list-2024-(english)",
            },
        ],
        "diseaseSignals": [
            {"signal": name, **provenance}
            for name, provenance in DISEASE_SOURCES.items()
        ],
        "realTargetBacktest": real_backtest,
        "scenario": scenario_summary,
        "demoTransferUnits": SCENARIO["transferUnits"],
    })


def scenario_summary(batches: list[dict], demand_map: dict[tuple[str, str], list[float]]) -> dict:
    hero = SCENARIO["hero"]
    surplus = SCENARIO["surplus"]
    today = pd.Timestamp(TODAY)

    def active_units(fac: str, med: str) -> int:
        return int(sum(
            b["quantity_remaining"] for b in batches
            if b["facility_id"] == fac and b["medicine_id"] == med and b["status"] == "ACTIVE"
        ))

    def days_to_stockout(units: int, series: list[float]) -> float:
        total = 0.0
        for i, v in enumerate(series):
            total += v
            if total > units:
                return round(i + 1 - (total - units) / max(v, 0.001), 1)
        return float(len(series))

    hero_units = active_units(hero["facilityId"], hero["medicineId"])
    hero_series = demand_map.get((hero["facilityId"], hero["medicineId"]), [1.0] * FORECAST_HORIZON)
    surplus_units = active_units(surplus["facilityId"], surplus["medicineId"])
    surplus_series = demand_map.get((surplus["facilityId"], surplus["medicineId"]), [1.0] * FORECAST_HORIZON)
    surplus_cover = float(np.sum(surplus_series[:45]))
    surplus_available = max(0, int(round(surplus_units - surplus_cover)))

    return {
        "heroFacilityId": hero["facilityId"],
        "heroMedicineId": hero["medicineId"],
        "heroUsableUnits": hero_units,
        "heroDaysToStockout": days_to_stockout(hero_units, hero_series),
        "heroAvgDailyDemand": round(float(np.mean(hero_series[:14])), 2),
        "heroStockoutDate": (today + pd.Timedelta(days=days_to_stockout(hero_units, hero_series))).date().isoformat(),
        "surplusFacilityId": surplus["facilityId"],
        "surplusMedicineId": surplus["medicineId"],
        "surplusUsableUnits": surplus_units,
        "surplusAvailable": surplus_available,
        "recommendedTransferUnits": SCENARIO["transferUnits"],
        "daysToStockoutAfterTransfer": days_to_stockout(hero_units + SCENARIO["transferUnits"], hero_series),
    }
