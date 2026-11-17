from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta

import numpy as np
import pandas as pd

from .config import (
    AFFINITY,
    DISEASE_BASE,
    FACILITIES,
    HISTORY_DAYS,
    MEDICINES,
    PRICE_NGN,
    SCENARIO,
    SUPPLIERS,
    TODAY,
)
from .weather import add_weather_features


def build_disease(weather: pd.DataFrame) -> pd.DataFrame:
    """Illustrative weekly FCT disease indicators, correlated with weather.

    These are NOT official NCDC figures and are labelled illustrative in the UI.
    """
    rng = np.random.default_rng(7)
    w = weather.set_index("date").resample("W-MON", label="left").agg(
        rain=("rainfall_mm", "sum"),
        temp=("temp_mean_c", "mean"),
        humidity=("humidity_pct", "mean"),
    ).reset_index()
    w = w[w["date"] <= pd.Timestamp(TODAY)].copy()
    w["rain_lag3"] = w["rain"].shift(3)
    rz = (w["rain_lag3"] - w["rain_lag3"].mean()) / (w["rain_lag3"].std() or 1)
    rz = rz.fillna(0).clip(-2.5, 2.5)
    dry = ((45 - w["humidity"]) / 15).clip(-1.5, 2.5)
    month = w["date"].dt.month
    harmattan = month.isin([12, 1, 2]).astype(float)
    meningitis_season = month.isin([2, 3, 4]).astype(float)
    lassa_season = month.isin([1, 2, 3]).astype(float)

    n = len(w)
    outbreak = np.clip((np.arange(n) - (n - 9)) / 8, 0, 1)

    malaria = DISEASE_BASE["MALARIA"] * (1 + 0.42 * rz) * (1 + 0.08 * np.sin(np.arange(n) / 9))
    malaria = malaria * (1 + 0.38 * outbreak) + rng.normal(0, 28, n)
    # Late-season fever surge in the final three reporting weeks. Illustrative,
    # and deliberately aligned with the simulated ACT demand uptick.
    for offset, multiplier in enumerate([2.0, 1.7, 1.45]):
        idx = n - 1 - offset
        if idx >= 0:
            malaria[idx] *= multiplier
    cholera = DISEASE_BASE["CHOLERA"] * np.exp(0.55 * rz) + rng.poisson(4, n) * (rz > 1)
    respiratory = DISEASE_BASE["RESPIRATORY"] * (1 + 0.30 * dry + 0.55 * harmattan) + rng.normal(0, 18, n)
    meningitis = DISEASE_BASE["MENINGITIS"] * (1 + 1.8 * meningitis_season) + rng.poisson(3, n)
    lassa = DISEASE_BASE["LASSA_FEVER"] * (1 + 2.2 * lassa_season) + rng.poisson(1, n)

    w["MALARIA"] = np.maximum(0, malaria.round()).astype(int)
    w["CHOLERA"] = np.maximum(0, cholera.round()).astype(int)
    w["RESPIRATORY"] = np.maximum(0, respiratory.round()).astype(int)
    w["MENINGITIS"] = np.maximum(0, meningitis.round()).astype(int)
    w["LASSA_FEVER"] = np.maximum(0, lassa.round()).astype(int)
    w["periodEnd"] = w["date"] + pd.Timedelta(days=6)
    return w[["date", "periodEnd", "MALARIA", "CHOLERA", "RESPIRATORY", "MENINGITIS", "LASSA_FEVER"]]


def demand_frame(weather: pd.DataFrame, disease: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(11)
    today = pd.Timestamp(TODAY)
    dates = pd.date_range(today - pd.Timedelta(days=HISTORY_DAYS - 1), today, freq="D")
    n = len(dates)

    wx = weather.copy()
    wx["rain_zL14"] = wx["rain_z21"].shift(14)
    wx["rain_zL7"] = wx["rain_z21"].shift(7)
    base = pd.DataFrame({"date": dates})
    merged = base.merge(wx, on="date", how="left")

    # Weekly disease indicators mapped onto days.
    dis = disease.copy()
    dis["week"] = pd.to_datetime(dis["date"]).dt.to_period("W-SUN").dt.start_time
    dis = dis.drop(columns=["date"])
    merged["week"] = merged["date"].dt.to_period("W-SUN").dt.start_time
    merged = merged.merge(
        dis[["week", "MALARIA", "CHOLERA", "RESPIRATORY", "MENINGITIS", "LASSA_FEVER"]],
        on="week", how="left",
    )
    for col in ["MALARIA", "CHOLERA", "RESPIRATORY", "MENINGITIS", "LASSA_FEVER"]:
        merged[col] = merged[col].ffill().bfill()

    rows = []
    for fac in FACILITIES:
        for med in MEDICINES:
            m = merged.copy()
            aff = AFFINITY[fac["type"]][med["id"]]
            base_daily = med["base"] * fac["scale"] * aff
            t = np.arange(n)
            lam = base_daily * (1 + med["growth"] * t / 365)
            dow = m["date"].dt.dayofweek.to_numpy()
            weekend = np.where(dow == 6, 0.72, np.where(dow == 5, 0.88, 1.0))
            if fac["type"] == "PHARMACY":
                weekend = np.where(dow == 6, 1.12, np.where(dow == 5, 1.18, 1.0))
            lam = lam * weekend

            wz = m["rain_zL14"].fillna(0).to_numpy()
            tz = m["temp_z"].fillna(0).to_numpy()
            hz = m["humidity_z"].fillna(0).to_numpy()
            if "rain" in med["weather"]:
                lam = lam * np.exp(0.22 * wz)
            if "heat" in med["weather"]:
                lam = lam * np.exp(0.10 * tz)
            if "dry" in med["weather"]:
                # dry = low humidity; a negative humidity z-score raises demand
                lam = lam * np.exp(-0.16 * hz)

            # Late-season fever surge: a deliberate, labelled demo scenario.
            if med["id"] == "med_act":
                ramp = np.clip((t - (n - 56)) / 40, 0, 1)
                strength = 0.62 if fac["id"] == "fac_phc" else 0.34
                lam = lam * (1 + strength * ramp)

            demand = lam * rng.lognormal(0, 0.14, n)
            spikes = rng.random(n) < 0.018
            demand = np.where(spikes, demand * rng.uniform(1.7, 2.6, n), demand)
            demand = np.maximum(0, np.round(demand)).astype(int)

            for i in range(n):
                rows.append((fac["id"], med["id"], dates[i], int(demand[i])))

    df = pd.DataFrame(rows, columns=["facility_id", "medicine_id", "date", "demand"])
    return df


def simulate_inventory(demand: pd.DataFrame) -> tuple[pd.DataFrame, list[dict], list[dict]]:
    """Simulate ordering, stockouts and FEFO issue so the demo has real texture."""
    rng = np.random.default_rng(23)
    today = pd.Timestamp(TODAY)
    batches: list[dict] = []
    movements: list[dict] = []
    observed = []
    stock_by_series: dict[tuple[str, str], int] = {}

    for fac in FACILITIES:
        for med in MEDICINES:
            s = demand[(demand.facility_id == fac["id"]) & (demand.medicine_id == med["id"])].reset_index(drop=True)
            dates = s["date"].tolist()
            dem = s["demand"].to_numpy()
            n = len(dem)
            lead = int(med["leadTimeDays"] + fac["leadTimeOffset"])
            cycle = int(fac["orderCycleDays"])
            initial = max(30, int(np.mean(dem[:30]) * (lead + cycle + 42)))

            live: list[dict] = [{
                "qty": initial,
                "expiry": dates[0] + pd.Timedelta(days=med["shelfLifeDays"]),
                "received": dates[0] - pd.Timedelta(days=25),
                "supplier_id": "sup_central",
            }]
            scheduled: dict[int, list[dict]] = defaultdict(list)
            outstanding = 0
            next_review = int(rng.integers(2, max(3, cycle)))
            seq = 0

            for i, d in enumerate(dates):
                # expire before issue
                for b in live:
                    if b["qty"] > 0 and b["expiry"] <= d:
                        b["expired"] = True

                avail = sum(b["qty"] for b in live if b["qty"] > 0 and b["expiry"] > d)
                want = int(dem[i])
                take = min(want, avail)
                remaining = take
                for b in sorted([x for x in live if x["qty"] > 0 and x["expiry"] > d], key=lambda x: x["expiry"]):
                    if remaining <= 0:
                        break
                    used = min(b["qty"], remaining)
                    b["qty"] -= used
                    remaining -= used
                stockout = want > avail
                bal = sum(b["qty"] for b in live if b["qty"] > 0 and b["expiry"] > d)
                observed.append((fac["id"], med["id"], d, take, stockout, bal))

                if i >= n - 21:
                    movements.append({
                        "facility_id": fac["id"], "medicine_id": med["id"],
                        "type": "ISSUE", "quantity": -take, "balance_after": int(bal),
                        "reason": "Dispensed / issued to clinical units" if take else "Stockout — no units issued",
                        "reference": f"ISS-{d.strftime('%y%m%d')}-{fac['id'][-3:].upper()}",
                        "occurred_at": d,
                    })

                for b in scheduled.get(i, []):
                    live.append(b)
                    outstanding = max(0, outstanding - 1)
                    if i >= n - 45:
                        movements.append({
                            "facility_id": fac["id"], "medicine_id": med["id"],
                            "type": "RECEIPT", "quantity": b["qty"],
                            "balance_after": int(sum(x["qty"] for x in live if x["qty"] > 0 and x["expiry"] > d)),
                            "reason": "Scheduled replenishment received",
                            "reference": b["ref"],
                            "occurred_at": d,
                        })

                if i >= next_review:
                    mean_d = float(np.mean(dem[max(0, i - 28): i + 1]))
                    rop = mean_d * (lead + 14)
                    projected = bal + sum(x["qty"] for arr in scheduled.values() for x in arr)
                    if projected < rop and outstanding == 0 and i + lead < n:
                        qty = int(max(mean_d * (cycle + lead + 24), 1))
                        arrive = i + lead
                        seq += 1
                        ref = f"PO-{fac['id'][-3:].upper()}-{med['id'][-3:].upper()}-{seq:03d}"
                        scheduled[arrive].append({
                            "qty": qty,
                            "expiry": dates[arrive] + pd.Timedelta(days=med["shelfLifeDays"] + int(rng.integers(-40, 90))),
                            "received": dates[arrive],
                            "supplier_id": SUPPLIERS[int(rng.integers(0, len(SUPPLIERS)))]["id"],
                            "ref": ref,
                        })
                        outstanding += 1
                    next_review += cycle

            # final active batches, with deterministic ids
            active = [b for b in live if b["qty"] > 0]
            active.sort(key=lambda b: b["expiry"])
            for j, b in enumerate(active):
                batches.append({
                    "id": f"bat_{fac['id'][4:]}_{med['id'][4:]}_{j:02d}",
                    "facility_id": fac["id"],
                    "medicine_id": med["id"],
                    "supplier_id": b["supplier_id"],
                    "batch_number": f"{med['id'][4:].upper()}-{fac['id'][4:].upper()}-{b['received'].strftime('%y%m')}-{j + 1}",
                    "quantity_received": int(b["qty"]),
                    "quantity_remaining": int(b["qty"]),
                    "expiry_date": b["expiry"],
                    "received_at": b["received"],
                    "unit_cost_ngn": PRICE_NGN[med["id"]],
                    "status": "EXPIRED" if b["expiry"] <= today else "ACTIVE",
                })

            stock_by_series[(fac["id"], med["id"])] = sum(
                b["quantity_remaining"] for b in batches
                if b["facility_id"] == fac["id"] and b["medicine_id"] == med["id"] and b["status"] == "ACTIVE"
            )

    obs = pd.DataFrame(observed, columns=["facility_id", "medicine_id", "date", "consumed", "was_stockout", "balance"])
    return obs, batches, movements


def _override_series(batches: list[dict], facility_id: str, medicine_id: str) -> None:
    batches[:] = [
        b for b in batches
        if not (b["facility_id"] == facility_id and b["medicine_id"] == medicine_id and b["status"] == "ACTIVE")
    ]


def _add_batch(
    batches: list[dict], facility_id: str, medicine_id: str, qty: int,
    expiry_days: int, received_days_ago: int, tag: str,
) -> dict:
    today = pd.Timestamp(TODAY)
    med = next(m for m in MEDICINES if m["id"] == medicine_id)
    fac = next(f for f in FACILITIES if f["id"] == facility_id)
    b = {
        "id": f"bat_{facility_id[4:]}_{medicine_id[4:]}_{tag}",
        "facility_id": facility_id,
        "medicine_id": medicine_id,
        "supplier_id": "sup_central",
        "batch_number": f"{medicine_id[4:].upper()}-{facility_id[4:].upper()}-{tag.upper()}",
        "quantity_received": int(qty),
        "quantity_remaining": int(qty),
        "expiry_date": today + pd.Timedelta(days=expiry_days),
        "received_at": today - pd.Timedelta(days=received_days_ago),
        "unit_cost_ngn": PRICE_NGN[medicine_id],
        "status": "ACTIVE",
    }
    batches.append(b)
    return b


BUILTIN_RISK_TARGETS = {
    ("fac_carepoint", "med_ors"): 9.0,
    ("fac_sunrise", "med_amox"): 13.0,
    ("fac_gh", "med_cipro"): 24.0,
    ("fac_phc", "med_folic"): 27.0,
    ("fac_sunrise", "med_salbutamol"): 20.0,
}

DEFAULT_COVER_DAYS = [50, 60, 70, 80]


def _normalise_inventory(
    batches: list[dict],
    movements: list[dict],
    forecasts: dict[tuple[str, str], list[float]],
) -> None:
    """Bring non-scenario lines to a controlled cover so the demo network reads clearly.

    The simulation deliberately produces messy history (including stockouts), but an
    end-state where eight unrelated lines are critical would obscure the demo story.
    This is a labelled data-generation step, not a product rule.
    """
    today = pd.Timestamp(TODAY)
    protected = {
        (SCENARIO["hero"]["facilityId"], SCENARIO["hero"]["medicineId"]),
        (SCENARIO["surplus"]["facilityId"], SCENARIO["surplus"]["medicineId"]),
    }
    for item in SCENARIO["nearExpiry"]:
        protected.add((item["facilityId"], item["medicineId"]))
    for item in SCENARIO["overstock"]:
        protected.add((item["facilityId"], item["medicineId"]))

    for fi, fac in enumerate(FACILITIES):
        for mi, med in enumerate(MEDICINES):
            key = (fac["id"], med["id"])
            if key in protected:
                continue
            series = forecasts.get(key)
            if not series:
                continue
            avg = max(1.0, float(np.mean(series[:14])))
            target_days = BUILTIN_RISK_TARGETS.get(key, DEFAULT_COVER_DAYS[(fi + mi) % len(DEFAULT_COVER_DAYS)])
            target = int(round(avg * target_days))

            active = [
                b for b in batches
                if b["facility_id"] == fac["id"] and b["medicine_id"] == med["id"]
                and b["status"] == "ACTIVE" and b["quantity_remaining"] > 0
            ]
            current = sum(b["quantity_remaining"] for b in active)
            delta = target - current
            if delta == 0:
                continue

            if delta > 0:
                received = today - pd.Timedelta(days=4 + (fi * 11 + mi * 7) % 20)
                _add_batch(
                    batches, fac["id"], med["id"], delta,
                    300 + (fi * 37 + mi * 53) % 300, int((today - received).days),
                    f"N{fi}{mi}",
                )
                movements.append({
                    "facility_id": fac["id"], "medicine_id": med["id"],
                    "type": "RECEIPT", "quantity": delta, "balance_after": target,
                    "reason": "Scheduled replenishment received",
                    "reference": f"RCV-{fac['id'][-3:].upper()}-{med['id'][-3:].upper()}",
                    "occurred_at": received,
                })
            else:
                remaining = -delta
                for b in sorted(active, key=lambda x: x["expiry_date"]):
                    if remaining <= 0:
                        break
                    used = min(b["quantity_remaining"], remaining)
                    b["quantity_remaining"] -= used
                    if b["quantity_remaining"] == 0:
                        b["status"] = "DEPLETED"
                    remaining -= used
                movements.append({
                    "facility_id": fac["id"], "medicine_id": med["id"],
                    "type": "ADJUSTMENT", "quantity": delta, "balance_after": target,
                    "reason": "Physical stock count reconciliation",
                    "reference": f"CNT-{today.strftime('%y%m%d')}",
                    "occurred_at": today - pd.Timedelta(days=2),
                })


def finalize_inventory(
    batches: list[dict],
    movements: list[dict],
    forecasts: dict[tuple[str, str], list[float]],
) -> tuple[list[dict], list[dict], list[dict]]:
    """Apply the demo scenario in *units*, derived from the actual forecast."""
    today = pd.Timestamp(TODAY)
    purchases: list[dict] = []

    def forecast_mean(fac: str, med: str, days: int) -> float:
        series = forecasts.get((fac, med), [1.0] * days)
        return max(1.0, float(np.mean(series[:days])))

    hero = SCENARIO["hero"]
    _override_series(batches, hero["facilityId"], hero["medicineId"])
    hero_qty = int(round(hero["stockDays"] * forecast_mean(hero["facilityId"], hero["medicineId"], 21)))
    _add_batch(batches, hero["facilityId"], hero["medicineId"], hero_qty,
               hero["batchExpiryDays"], hero["batchReceivedDaysAgo"], "A26H")

    surplus = SCENARIO["surplus"]
    _override_series(batches, surplus["facilityId"], surplus["medicineId"])
    surplus_qty = int(round(
        surplus["stockDays"] * forecast_mean(surplus["facilityId"], surplus["medicineId"], 30)
        + surplus["surplusUnits"]
    ))
    part = int(round(surplus_qty * 0.72))
    _add_batch(batches, surplus["facilityId"], surplus["medicineId"], part,
               surplus["batchExpiryDays"], surplus["batchReceivedDaysAgo"], "B26S")
    _add_batch(batches, surplus["facilityId"], surplus["medicineId"], surplus_qty - part,
               max(120, surplus["batchExpiryDays"] - 180), 20, "B26T")

    for item in SCENARIO["nearExpiry"]:
        _add_batch(batches, item["facilityId"], item["medicineId"], item["units"],
                   item["expiryDays"], 120, f"E{item['expiryDays']}")

    for item in SCENARIO["overstock"]:
        _add_batch(batches, item["facilityId"], item["medicineId"], item["units"], 520, 65, "O26")

    # A couple of genuinely expired batches keep the expiry workflow honest.
    _add_batch(batches, "fac_carepoint", "med_amox", 36, -18, 300, "X26")
    for b in batches:
        if b["expiry_date"] <= today and b["quantity_remaining"] > 0:
            b["status"] = "EXPIRED"

    _normalise_inventory(batches, movements, forecasts)

    # Reconcile scenario overrides with an explicit physical count adjustment.
    sim_totals: dict[tuple[str, str], int] = defaultdict(int)
    for m in movements:
        if m["type"] == "ISSUE":
            sim_totals[(m["facility_id"], m["medicine_id"])] += m["quantity"]
    for fac, med, tag in [
        (hero["facilityId"], hero["medicineId"], "Hero scenario stock count"),
        (surplus["facilityId"], surplus["medicineId"], "Surplus verification count"),
    ]:
        existing = sum(
            b["quantity_remaining"] for b in batches
            if b["facility_id"] == fac and b["medicine_id"] == med and b["status"] == "ACTIVE"
        )
        # last known simulated balance for a clean audit trail
        bal_rows = [m for m in movements if m["facility_id"] == fac and m["medicine_id"] == med and m["type"] == "ISSUE"]
        prior = bal_rows[-1]["balance_after"] if bal_rows else existing
        delta = existing - prior
        movements.append({
            "facility_id": fac, "medicine_id": med, "type": "ADJUSTMENT",
            "quantity": int(delta), "balance_after": int(existing),
            "reason": tag, "reference": f"CNT-{today.strftime('%y%m%d')}",
            "occurred_at": today - pd.Timedelta(days=1),
        })

    order = SCENARIO["incomingOrder"]
    purchases.append({
        "reference": f"PO-{order['facilityId'][-3:].upper()}-ACT-0926",
        "facility_id": order["facilityId"],
        "supplier_id": order["supplierId"],
        "medicine_id": order["medicineId"],
        "quantity": order["quantity"],
        "status": "CONFIRMED",
        "ordered_at": today - pd.Timedelta(days=7),
        "expected_at": today + pd.Timedelta(days=order["expectedInDays"]),
    })
    # A second, already-delivered order gives the dashboard something normal.
    purchases.append({
        "reference": "PO-GH-PCM-0926",
        "facility_id": "fac_gh",
        "supplier_id": "sup_emzor",
        "medicine_id": "med_pcm",
        "quantity": 8000,
        "status": "DELIVERED",
        "ordered_at": today - pd.Timedelta(days=24),
        "expected_at": today - pd.Timedelta(days=12),
    })

    # Stable ids for movement rows
    for i, m in enumerate(movements):
        m["id"] = f"mov_{i:05d}"
        m["occurred_at"] = pd.Timestamp(m["occurred_at"])
    for i, b in enumerate(batches):
        b["expiry_date"] = pd.Timestamp(b["expiry_date"])
        b["received_at"] = pd.Timestamp(b["received_at"])
    return batches, movements, purchases


def build_weather_export(weather: pd.DataFrame) -> list[dict]:
    rows = []
    for _, r in weather.iterrows():
        rows.append({
            "location": "Abuja",
            "state": "FCT",
            "date": r["date"].date().isoformat(),
            "rainfall_mm": round(float(r["rainfall_mm"]), 1),
            "temp_max_c": round(float(r["temp_max_c"]), 1),
            "temp_min_c": round(float(r["temp_min_c"]), 1),
            "humidity_pct": round(float(r["humidity_pct"]), 1),
            "source": r.get("source", "Open-Meteo ERA5"),
        })
    return rows


def build_disease_export(disease: pd.DataFrame) -> list[dict]:
    rows = []
    for _, r in disease.iterrows():
        for disease_name in ["MALARIA", "CHOLERA", "RESPIRATORY", "MENINGITIS", "LASSA_FEVER"]:
            rows.append({
                "disease": disease_name,
                "state": "FCT",
                "lga": None,
                "periodStart": r["date"].date().isoformat(),
                "periodEnd": r["periodEnd"].date().isoformat(),
                "cases": int(r[disease_name]),
                "source": "Illustrative FCT signal (not official NCDC data)",
                "isIllustrative": True,
            })
    return rows
