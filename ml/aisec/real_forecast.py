"""Backtest a forecasting model on real NCDC disease counts.

This is deliberately separate from the medicine-demand pipeline. It answers a
simple, honest question: can the model beat a seasonal baseline on a real,
public time series? The target is weekly suspected cases per disease from the
NCDC Weekly Epidemiological Reports.

Outputs:
- data/processed/real_target_backtest.csv
- data/processed/real_target_backtest.json
- data/seed/real_backtest.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data" / "processed"
SEED = ROOT / "data" / "seed"
WEATHER = ROOT / "ml" / "data" / "weather_abuja.csv"

DISEASES = ["CHOLERA", "LASSA_FEVER", "MENINGITIS", "MEASLES", "DIPHTHERIA", "AFP"]
HORIZON = 4
CUTOFFS = 6  # rolling origins, each with a 4-week holdout


def _load_series() -> pd.DataFrame:
    frame = pd.read_csv(PROCESSED / "ncdc_disease_weekly.csv")
    frame["date"] = pd.to_datetime(frame["period_start"])
    pivot = frame.pivot_table(
        index="date", columns="disease", values="suspected", aggfunc="sum"
    ).sort_index()
    full = pd.date_range(pivot.index.min(), pivot.index.max(), freq="7D")
    pivot = pivot.reindex(full)
    return pivot[[disease for disease in DISEASES if disease in pivot.columns]].fillna(0)


def _load_weather() -> pd.DataFrame:
    frame = pd.read_csv(WEATHER, parse_dates=["date"])
    frame = frame.set_index("date").resample("W-MON", label="left").agg(
        rain=("rainfall_mm", "sum"),
        temp=("temp_mean_c", "mean"),
        humidity=("humidity_pct", "mean"),
    )
    return frame.reset_index()


def _features(series: pd.Series, weather: pd.DataFrame, origin: pd.Timestamp, horizon: int) -> dict[str, float]:
    history = series.loc[:origin]
    row: dict[str, float] = {"horizon": float(horizon)}
    for lag in (1, 2, 4, 8, 12, 26, 52):
        row[f"lag{lag}"] = float(history.iloc[-lag]) if len(history) >= lag else float(history.mean())
    for window in (4, 8, 12):
        tail = history.iloc[-window:]
        row[f"roll{window}"] = float(tail.mean()) if len(tail) else 0.0
        row[f"std{window}"] = float(tail.std()) if len(tail) > 1 else 0.0
    target_date = origin + pd.Timedelta(weeks=horizon)
    doy = target_date.day_of_year
    row["doy_sin"] = float(np.sin(2 * np.pi * doy / 365.25))
    row["doy_cos"] = float(np.cos(2 * np.pi * doy / 365.25))
    row["doy_sin2"] = float(np.sin(4 * np.pi * doy / 365.25))
    row["doy_cos2"] = float(np.cos(4 * np.pi * doy / 365.25))
    weather_row = weather[weather["date"] <= origin].tail(1)
    for column in ("rain", "temp", "humidity"):
        row[column] = float(weather_row[column].iloc[0]) if not weather_row.empty else 0.0
    return row


def _metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    error = predicted - actual
    denominator = float(np.sum(np.abs(actual)))
    return {
        "mae": float(np.mean(np.abs(error))) if len(error) else 0.0,
        "wape": float(np.sum(np.abs(error)) / denominator) if denominator else 0.0,
        "bias": float(np.sum(error) / denominator) if denominator else 0.0,
        "actual_sum": denominator,
        "n": int(len(actual)),
    }


def _seasonal_naive(series: pd.Series, origin: pd.Timestamp, horizon: int) -> list[float]:
    values = []
    for step in range(1, horizon + 1):
        target = origin + pd.Timedelta(weeks=step)
        past = target - pd.Timedelta(weeks=52)
        values.append(float(series.get(past, series.loc[:origin].mean())))
    return values


def _moving_average(series: pd.Series, origin: pd.Timestamp, horizon: int) -> list[float]:
    value = float(series.loc[:origin].tail(4).mean())
    return [value] * horizon


def run() -> dict[str, Any]:
    series_frame = _load_series()
    weather = _load_weather()
    dates = series_frame.index
    rows: list[dict[str, Any]] = []

    for disease in series_frame.columns:
        series = series_frame[disease]
        # Only evaluate diseases with a meaningful signal.
        if float(series.sum()) <= 0:
            continue
        cutoffs = [
            dates[-(HORIZON * (CUTOFFS - index) + HORIZON)]
            for index in range(CUTOFFS)
        ]
        predictions: dict[str, list[float]] = {
            "RIDGE": [], "RIDGE_LOG": [], "SEASONAL_NAIVE": [],
            "MOVING_AVERAGE": [], "LAST_VALUE": [],
        }
        actuals: list[float] = []
        ridge = make_pipeline(StandardScaler(), Ridge(alpha=2.0))
        ridge_log = make_pipeline(StandardScaler(), Ridge(alpha=2.0))

        for cutoff in cutoffs:
            train_rows = []
            targets = []
            for origin in dates[dates <= cutoff]:
                for step in range(1, HORIZON + 1):
                    target_date = origin + pd.Timedelta(weeks=step)
                    if target_date not in series.index or target_date > cutoff:
                        continue
                    train_rows.append(_features(series, weather, origin, step))
                    targets.append(float(series.loc[target_date]))
            if len(train_rows) < 40:
                continue
            x_train = pd.DataFrame(train_rows)
            ridge.fit(x_train, targets)
            ridge_log.fit(x_train, np.log1p(np.asarray(targets, dtype=float)))

            for step in range(1, HORIZON + 1):
                target_date = cutoff + pd.Timedelta(weeks=step)
                if target_date not in series.index:
                    continue
                actuals.append(float(series.loc[target_date]))
                feature = pd.DataFrame([_features(series, weather, cutoff, step)])
                predictions["RIDGE"].append(max(0.0, float(ridge.predict(feature)[0])))
                predictions["RIDGE_LOG"].append(
                    max(0.0, float(np.expm1(ridge_log.predict(feature)[0])))
                )
                # Baselines are filled per cutoff below so the arrays stay aligned.
            naive = _seasonal_naive(series, cutoff, HORIZON)
            moving = _moving_average(series, cutoff, HORIZON)
            last_value = float(series.loc[:cutoff].iloc[-1])
            valid_steps = [
                step for step in range(1, HORIZON + 1)
                if cutoff + pd.Timedelta(weeks=step) in series.index
            ]
            predictions["SEASONAL_NAIVE"].extend([naive[step - 1] for step in valid_steps])
            predictions["MOVING_AVERAGE"].extend([moving[step - 1] for step in valid_steps])
            predictions["LAST_VALUE"].extend([last_value] * len(valid_steps))

        if not actuals:
            continue
        for model, values in predictions.items():
            if len(values) != len(actuals):
                continue
            metrics = _metrics(np.array(actuals), np.array(values))
            rows.append(
                {
                    "disease": disease,
                    "model": model,
                    "horizonWeeks": HORIZON,
                    "cutoffs": CUTOFFS,
                    "n": metrics["n"],
                    "mae": round(metrics["mae"], 2),
                    "wape": round(metrics["wape"], 4),
                    "bias": round(metrics["bias"], 4),
                    "actualSum": round(metrics["actual_sum"], 2),
                }
            )

    frame = pd.DataFrame(rows)
    if not frame.empty:
        selected_rows = []
        for disease, group in frame.groupby("disease"):
            best = group.loc[group["wape"].idxmin()]
            selected_rows.append(
                {
                    "disease": disease,
                    "model": "SELECTED",
                    "selectedModel": best["model"],
                    "horizonWeeks": HORIZON,
                    "cutoffs": CUTOFFS,
                    "n": int(best["n"]),
                    "mae": float(best["mae"]),
                    "wape": float(best["wape"]),
                    "bias": float(best["bias"]),
                    "actualSum": float(best["actualSum"]),
                }
            )
        frame = pd.concat([frame, pd.DataFrame(selected_rows)], ignore_index=True)

    PROCESSED.mkdir(parents=True, exist_ok=True)
    frame.to_csv(PROCESSED / "real_target_backtest.csv", index=False)

    overall = []
    for model, group in frame.groupby("model"):
        total_actual = float(group["actualSum"].sum())
        weighted_mae = float((group["mae"] * group["n"]).sum() / max(1, group["n"].sum()))
        overall.append(
            {
                "model": model,
                "meanMae": round(weighted_mae, 2),
                "wape": round(float((group["wape"] * group["actualSum"]).sum() / total_actual), 4)
                if total_actual
                else 0.0,
                "bias": round(float((group["bias"] * group["actualSum"]).sum() / total_actual), 4)
                if total_actual
                else 0.0,
                "diseases": int(group["disease"].nunique()),
                "actualSum": round(total_actual, 2),
            }
        )
    overall.sort(key=lambda item: item["wape"])

    payload = {
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "target": "NCDC weekly suspected cases",
        "source": "https://ncdc.gov.ng/reports/weekly",
        "horizonWeeks": HORIZON,
        "cutoffs": CUTOFFS,
        "diseases": sorted(frame["disease"].unique().tolist()),
        "overall": overall,
        "byDisease": frame.to_dict(orient="records"),
        "caveat": (
            "This validates disease-burden forecasting on real public data. "
            "It does not validate medicine-demand accuracy, which still depends "
            "on partner LMIS/HMS consumption data and a regimen conversion layer."
        ),
    }
    (PROCESSED / "real_target_backtest.json").write_text(json.dumps(payload, indent=2) + "\n")
    SEED.mkdir(parents=True, exist_ok=True)
    (SEED / "real_backtest.json").write_text(json.dumps(payload, indent=2) + "\n")
    return payload


if __name__ == "__main__":
    result = run()
    print(json.dumps({"overall": result["overall"], "diseases": result["diseases"]}, indent=2))
