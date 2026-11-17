from __future__ import annotations

import math
from datetime import date, timedelta

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from .config import FACILITIES, FORECAST_HORIZON, MEDICINES, TODAY
from .weather import future_climatology

FAC_IDS = [f["id"] for f in FACILITIES]
MED_IDS = [m["id"] for m in MEDICINES]

BASE_FEATURES = [
    "lag1", "lag7", "lag14", "lag21", "lag28",
    "roll7", "roll14", "roll28", "roll7_std", "stockout_lag1",
    "dow_sin", "dow_cos", "doy_sin", "doy_cos", "doy_sin2", "doy_cos2",
    "rainfall_mm", "rain_lag7", "rain_sum14", "rain_sum21", "rain_z21",
    "temp_mean_c", "humidity_pct",
    "malaria", "cholera", "respiratory",
]
FEATURES = BASE_FEATURES + [f"fac_{f}" for f in FAC_IDS] + [f"med_{m}" for m in MED_IDS]

MODEL_LABELS = {
    "SEASONAL_NAIVE": "Seasonal baseline (same week last year)",
    "MOVING_AVERAGE": "28-day moving average",
    "RIDGE": "Ridge regression (climate + disease)",
    "XGBOOST": "XGBoost (climate + disease)",
    "ENSEMBLE": "XGBoost + seasonal ensemble",
}


def build_panel(obs: pd.DataFrame, weather: pd.DataFrame, disease: pd.DataFrame) -> pd.DataFrame:
    df = obs.merge(weather, on="date", how="left")
    dis = disease.copy()
    dis["week"] = pd.to_datetime(dis["date"]).dt.to_period("W-SUN").dt.start_time
    dis = dis.drop(columns=["date"])
    df["week"] = df["date"].dt.to_period("W-SUN").dt.start_time
    df = df.merge(dis[["week", "MALARIA", "CHOLERA", "RESPIRATORY"]], on="week", how="left")
    df = df.rename(columns={"MALARIA": "malaria", "CHOLERA": "cholera", "RESPIRATORY": "respiratory"})
    df = df.sort_values(["facility_id", "medicine_id", "date"]).reset_index(drop=True)

    g = df.groupby(["facility_id", "medicine_id"], sort=False)
    for lag in (1, 7, 14, 21, 28):
        df[f"lag{lag}"] = g["consumed"].shift(lag)
    for win in (7, 14, 28):
        df[f"roll{win}"] = g["consumed"].transform(lambda s, w=win: s.shift(1).rolling(w, min_periods=3).mean())
    df["roll7_std"] = g["consumed"].transform(lambda s: s.shift(1).rolling(7, min_periods=3).std())
    df["stockout_lag1"] = g["was_stockout"].shift(1).fillna(False).astype(int)

    dow = df["date"].dt.dayofweek.to_numpy()
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    doy = df["date"].dt.dayofyear.to_numpy()
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["doy_sin2"] = np.sin(4 * np.pi * doy / 365.25)
    df["doy_cos2"] = np.cos(4 * np.pi * doy / 365.25)

    for f in FAC_IDS:
        df[f"fac_{f}"] = (df["facility_id"] == f).astype(int)
    for m in MED_IDS:
        df[f"med_{m}"] = (df["medicine_id"] == m).astype(int)

    for col in ["rain_lag7", "rain_sum14", "rain_sum21", "rain_z21"]:
        if col not in df:
            df[col] = 0.0
    return df


def _row_features(
    hist: list[float], stockout_hist: list[int], d: pd.Timestamp,
    exog: dict, facility_id: str, medicine_id: str,
) -> dict:
    def lag(k: int) -> float:
        return float(hist[-k]) if len(hist) >= k else float(np.mean(hist) if hist else 0.0)

    tail7 = hist[-7:] if len(hist) >= 7 else hist
    tail14 = hist[-14:] if len(hist) >= 14 else hist
    tail28 = hist[-28:] if len(hist) >= 28 else hist
    doy = d.dayofyear
    dow = d.dayofweek
    row = {
        "lag1": lag(1), "lag7": lag(7), "lag14": lag(14), "lag21": lag(21), "lag28": lag(28),
        "roll7": float(np.mean(tail7)) if tail7 else 0.0,
        "roll14": float(np.mean(tail14)) if tail14 else 0.0,
        "roll28": float(np.mean(tail28)) if tail28 else 0.0,
        "roll7_std": float(np.std(tail7)) if len(tail7) > 1 else 0.0,
        "stockout_lag1": int(stockout_hist[-1]) if stockout_hist else 0,
        "dow_sin": math.sin(2 * math.pi * dow / 7),
        "dow_cos": math.cos(2 * math.pi * dow / 7),
        "doy_sin": math.sin(2 * math.pi * doy / 365.25),
        "doy_cos": math.cos(2 * math.pi * doy / 365.25),
        "doy_sin2": math.sin(4 * math.pi * doy / 365.25),
        "doy_cos2": math.cos(4 * math.pi * doy / 365.25),
        "rainfall_mm": float(exog.get("rainfall_mm", 0.0)),
        "rain_lag7": float(exog.get("rain_lag7", exog.get("rainfall_mm", 0.0))),
        "rain_sum14": float(exog.get("rain_sum14", 0.0)),
        "rain_sum21": float(exog.get("rain_sum21", 0.0)),
        "rain_z21": float(exog.get("rain_z21", 0.0)),
        "temp_mean_c": float(exog.get("temp_mean_c", 28.0)),
        "humidity_pct": float(exog.get("humidity_pct", 60.0)),
        "malaria": float(exog.get("malaria", 0.0)),
        "cholera": float(exog.get("cholera", 0.0)),
        "respiratory": float(exog.get("respiratory", 0.0)),
        **{f"fac_{f}": int(facility_id == f) for f in FAC_IDS},
        **{f"med_{m}": int(medicine_id == m) for m in MED_IDS},
    }
    return row


def _metrics(actual: np.ndarray, pred: np.ndarray) -> dict:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    err = pred - actual
    denom = float(np.sum(np.abs(actual)))
    return {
        "mae": float(np.mean(np.abs(err))) if len(err) else 0.0,
        "wape": float(np.sum(np.abs(err)) / denom) if denom else 1.0,
        "bias": float(np.sum(err) / denom) if denom else 0.0,
        "abs_sum": float(np.sum(np.abs(err))),
        "signed_sum": float(np.sum(err)),
        "actual_sum": denom,
    }


def _seasonal_value(series_map: dict, d: pd.Timestamp, fallback: float) -> float:
    for back in (364, 371, 357):
        v = series_map.get((d - pd.Timedelta(days=back)).normalize())
        if v is not None:
            return float(v)
    return float(fallback)


def forecast_all(
    obs: pd.DataFrame, weather: pd.DataFrame, disease: pd.DataFrame,
) -> tuple[list[dict], list[dict], dict[tuple[str, str], list[float]]]:
    panel = build_panel(obs, weather, disease)
    today = pd.Timestamp(TODAY)
    cutoff = today - pd.Timedelta(days=28)
    horizon = FORECAST_HORIZON

    train = panel[(panel["date"] <= cutoff) & panel[FEATURES].notna().all(axis=1) & panel["consumed"].notna()].copy()
    # A handful of missing feature rows are fine; keep series with enough history.
    train = train.dropna(subset=FEATURES)

    Xtr = train[FEATURES].astype(float)
    ytr = train["consumed"].astype(float)

    print(f"  model: training on {len(train):,} rows, {train.groupby(['facility_id', 'medicine_id']).ngroups} series")

    ridge = make_pipeline(StandardScaler(), Ridge(alpha=2.0))
    ridge.fit(Xtr, ytr)
    xgb = XGBRegressor(
        n_estimators=420, max_depth=6, learning_rate=0.045,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
        reg_lambda=1.0, n_jobs=4, random_state=0, tree_method="hist",
    )
    xgb.fit(Xtr, ytr)

    models = {"RIDGE": ridge, "XGBOOST": xgb}
    results: dict[str, dict[tuple[str, str], dict]] = {
        k: {} for k in ["SEASONAL_NAIVE", "MOVING_AVERAGE", "RIDGE", "XGBOOST", "ENSEMBLE"]
    }

    # Future exogenous values for the final forecast are prepared once.
    fut_weather = future_climatology(weather, (today + pd.Timedelta(days=1)).date(), horizon)
    disease_weekly = disease.copy()
    disease_weekly["week"] = pd.to_datetime(disease_weekly["date"]).dt.to_period("W-SUN").dt.start_time
    disease_weekly = disease_weekly.sort_values("week")
    last_disease = disease_weekly.iloc[-1]
    future_dates = [today + pd.Timedelta(days=i) for i in range(1, horizon + 1)]

    future_exog: dict[pd.Timestamp, dict] = {}
    for i, d in enumerate(future_dates):
        wr = fut_weather[fut_weather["date"] == d]
        if wr.empty:
            wr = fut_weather.tail(1)
        wrow = wr.iloc[0].to_dict()
        seasonal = disease_weekly[
            (disease_weekly["week"].dt.dayofyear - d.dayofyear).abs().isin(range(0, 16))
        ]
        if seasonal.empty:
            seasonal = disease_weekly.tail(8)
        blend = max(0.0, 1 - i / 21)
        dz = {}
        for col in ["MALARIA", "CHOLERA", "RESPIRATORY"]:
            season_mean = float(seasonal[col].mean())
            dz[col.lower()] = blend * float(last_disease[col]) + (1 - blend) * season_mean
        wrow.update(dz)
        future_exog[d] = wrow

    per_series: list[tuple[str, str, pd.DataFrame]] = []
    for fac in FAC_IDS:
        for med in MED_IDS:
            s = panel[(panel.facility_id == fac) & (panel.medicine_id == med)].sort_values("date").reset_index(drop=True)
            if len(s) < 120:
                continue
            per_series.append((fac, med, s))

    for fac, med, s in per_series:
        hist_df = s[s["date"] <= cutoff]
        val_df = s[s["date"] > cutoff].copy()
        if len(val_df) < 7 or len(hist_df) < 60:
            continue
        hist_vals = hist_df["consumed"].astype(float).tolist()
        hist_stock = hist_df["was_stockout"].astype(int).tolist()
        actual = val_df["consumed"].to_numpy(dtype=float)
        dates = val_df["date"].tolist()
        exog_rows = val_df.to_dict("records")
        series_map = dict(zip(hist_df["date"], hist_df["consumed"].astype(float)))

        base_mean = float(np.mean(hist_vals[-28:])) if hist_vals else 1.0
        preds: dict[str, list[float]] = {}
        preds["SEASONAL_NAIVE"] = [_seasonal_value(series_map, d, base_mean) for d in dates]
        preds["MOVING_AVERAGE"] = [base_mean for _ in dates]

        for name, model in models.items():
            hvals = list(hist_vals)
            hstock = list(hist_stock)
            out: list[float] = []
            for i, d in enumerate(dates):
                row = _row_features(hvals, hstock, pd.Timestamp(d), exog_rows[i], fac, med)
                x = pd.DataFrame([row], columns=FEATURES).astype(float)
                p = max(0.0, float(model.predict(x)[0]))
                out.append(p)
                hvals.append(p)
                hstock.append(0)
            preds[name] = out

        # A 50/50 ensemble with the seasonal baseline damps recursive drift.
        preds["ENSEMBLE"] = [
            0.5 * a + 0.5 * b
            for a, b in zip(preds["XGBOOST"], preds["SEASONAL_NAIVE"])
        ]

        for name, p in preds.items():
            # Stockout days are censored: the facility did not observe true demand.
            # Score forecast accuracy on uncensored days only.
            mask = val_df["was_stockout"].to_numpy() == 0
            if mask.sum() >= 7:
                a_eval = actual[mask]
                p_eval = np.array(p)[mask]
            else:
                a_eval = actual
                p_eval = np.array(p)
            results[name][(fac, med)] = {"metrics": _metrics(a_eval, p_eval), "residuals": p_eval - a_eval}

    # Choose the best model per series, preferring a baseline when improvement is negligible.
    chosen: dict[tuple[str, str], str] = {}
    hero_key = ("fac_phc", "med_act")
    if hero_key in results["XGBOOST"]:
        print(
            "  hero validation WAPE:",
            {name: round(results[name][hero_key]["metrics"]["wape"], 3) for name in results if hero_key in results[name]},
        )
    for fac, med, s in per_series:
        key = (fac, med)
        if key not in results["XGBOOST"]:
            chosen[key] = "MOVING_AVERAGE"
            continue
        wapes = {n: results[n][key]["metrics"]["wape"] for n in results if key in results[n]}
        best = min(wapes, key=wapes.get)
        baseline = wapes.get("SEASONAL_NAIVE", 1.0)
        # When the signal-aware model is effectively tied with a trailing baseline,
        # keep the model that can respond to weather and disease signals. This avoids
        # flattening a genuine demand shift into a 28-day average.
        if best in ("SEASONAL_NAIVE", "MOVING_AVERAGE") and "XGBOOST" in wapes:
            if wapes["XGBOOST"] <= wapes[best] + 0.02:
                best = "XGBOOST"
        if best in ("XGBOOST", "RIDGE", "ENSEMBLE") and wapes[best] > baseline - 0.015:
            best = "SEASONAL_NAIVE" if baseline < 0.5 else "MOVING_AVERAGE"
        chosen[key] = best

    # Refit on all available data for the final horizon.
    full = panel[FEATURES + ["consumed", "was_stockout", "date", "facility_id", "medicine_id"]].copy()
    full = full.dropna(subset=FEATURES + ["consumed"])
    Xfull = full[FEATURES].astype(float)
    yfull = full["consumed"].astype(float)
    ridge_full = make_pipeline(StandardScaler(), Ridge(alpha=2.0)).fit(Xfull, yfull)
    xgb_full = XGBRegressor(
        n_estimators=420, max_depth=6, learning_rate=0.045,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
        reg_lambda=1.0, n_jobs=4, random_state=0, tree_method="hist",
    ).fit(Xfull, yfull)
    final_models = {"RIDGE": ridge_full, "XGBOOST": xgb_full}

    forecasts: list[dict] = []
    demand_map: dict[tuple[str, str], list[float]] = {}

    for fac, med, s in per_series:
        key = (fac, med)
        model_name = chosen.get(key, "MOVING_AVERAGE")
        hist_vals = s["consumed"].astype(float).tolist()
        hist_stock = s["was_stockout"].astype(int).tolist()
        series_map = dict(zip(s["date"], s["consumed"].astype(float)))
        base_mean = float(np.mean(hist_vals[-28:])) if hist_vals else 1.0

        if model_name in ("RIDGE", "XGBOOST", "ENSEMBLE"):
            hvals = list(hist_vals)
            hstock = list(hist_stock)
            xgb_preds: list[float] = []
            for d in future_dates:
                row = _row_features(hvals, hstock, d, future_exog[d], fac, med)
                x = pd.DataFrame([row], columns=FEATURES).astype(float)
                p = max(0.0, float(final_models["XGBOOST"].predict(x)[0]))
                xgb_preds.append(p)
                hvals.append(p)
                hstock.append(0)

            if model_name == "ENSEMBLE":
                seasonal = [max(0.0, _seasonal_value(series_map, d, base_mean)) for d in future_dates]
                preds = [0.5 * a + 0.5 * b for a, b in zip(xgb_preds, seasonal)]
            elif model_name == "RIDGE":
                hvals = list(hist_vals)
                hstock = list(hist_stock)
                preds = []
                for d in future_dates:
                    row = _row_features(hvals, hstock, d, future_exog[d], fac, med)
                    x = pd.DataFrame([row], columns=FEATURES).astype(float)
                    p = max(0.0, float(final_models["RIDGE"].predict(x)[0]))
                    preds.append(p)
                    hvals.append(p)
                    hstock.append(0)
            else:
                preds = xgb_preds
        elif model_name == "SEASONAL_NAIVE":
            preds = [max(0.0, _seasonal_value(series_map, d, base_mean)) for d in future_dates]
        else:
            preds = [max(0.0, base_mean) for _ in future_dates]

        # Uncertainty from validation residuals, widened with horizon.
        res = results.get(model_name, {}).get(key, {}).get("residuals")
        if res is None or len(res) < 5:
            res = np.array([0.0])
        sigma = float(np.std(res))
        sigma = max(sigma, 0.35 * max(1.0, float(np.mean(preds))))
        points = []
        for i, (d, p) in enumerate(zip(future_dates, preds)):
            scale_h = math.sqrt(min(2.4, max(0.55, (i + 1) / 7)))
            s_h = sigma * scale_h
            points.append({
                "date": d.date().isoformat(),
                "predicted": round(float(p), 2),
                "lower80": round(max(0.0, float(p) - 1.2816 * s_h), 2),
                "upper80": round(float(p) + 1.2816 * s_h, 2),
                "lower95": round(max(0.0, float(p) - 1.96 * s_h), 2),
                "upper95": round(float(p) + 1.96 * s_h, 2),
            })

        metrics = results.get(model_name, {}).get(key, {}).get("metrics", {"mae": 0.0, "wape": 1.0, "bias": 0.0})
        non_stockout = int((s["was_stockout"] == 0).sum())
        low_data = non_stockout < 120
        if low_data:
            confidence = "LOW"
        elif metrics["wape"] <= 0.24:
            confidence = "HIGH"
        elif metrics["wape"] <= 0.42:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        forecasts.append({
            "facilityId": fac,
            "medicineId": med,
            "model": model_name,
            "modelLabel": MODEL_LABELS[model_name],
            "horizonDays": horizon,
            "mae": round(float(metrics["mae"]), 2),
            "wape": round(float(metrics["wape"]), 4),
            "bias": round(float(metrics["bias"]), 4),
            "confidence": confidence,
            "dataPoints": int(len(s)),
            "lowData": low_data,
            "trainedAt": pd.Timestamp(TODAY).isoformat(),
            "points": points,
        })
        demand_map[key] = [float(p["predicted"]) for p in points]

    # Aggregate model comparison for the evaluation page.
    model_runs = []
    wins = {name: 0 for name in results}
    for name in wins:
        for key in chosen:
            if chosen.get(key) == name:
                wins[name] += 1
    for name in ["SEASONAL_NAIVE", "MOVING_AVERAGE", "RIDGE", "XGBOOST", "ENSEMBLE"]:
        vals = results[name]
        if not vals:
            continue
        abs_sum = sum(v["metrics"]["abs_sum"] for v in vals.values())
        signed_sum = sum(v["metrics"]["signed_sum"] for v in vals.values())
        act_sum = sum(v["metrics"]["actual_sum"] for v in vals.values())
        mae = float(np.mean([v["metrics"]["mae"] for v in vals.values()]))
        model_runs.append({
            "model": name,
            "horizonDays": 28,
            "seriesCount": len(vals),
            "overallMae": round(mae, 2),
            "overallWape": round(abs_sum / act_sum, 4) if act_sum else 1.0,
            "overallBias": round(signed_sum / act_sum, 4) if act_sum else 0.0,
            "baselineWape": round(
                sum(v["metrics"]["abs_sum"] for v in results["SEASONAL_NAIVE"].values())
                / max(1.0, sum(v["metrics"]["actual_sum"] for v in results["SEASONAL_NAIVE"].values())), 4
            ),
            "notes": f"Selected for {wins[name]} of {len(chosen)} series",
        })

    selected = [f for f in forecasts if f["model"] in ("XGBOOST", "RIDGE")]
    print(f"  model: {len(forecasts)} forecasts; {len(selected)} use learned models; {len(forecasts) - len(selected)} use baselines")
    return forecasts, model_runs, demand_map
