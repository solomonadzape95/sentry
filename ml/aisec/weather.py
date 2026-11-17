from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from .config import FACILITIES, HISTORY_DAYS, TODAY

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE = DATA_DIR / "weather_abuja.csv"
META = DATA_DIR / "weather_abuja.meta.json"

LAT = 9.0765
LON = 7.3986
LOCATION = "Abuja"
STATE = "FCT"


def _daterange(start: date, end: date) -> pd.DatetimeIndex:
    return pd.date_range(start, end, freq="D")


def _fetch_open_meteo(start: date, end: date) -> pd.DataFrame | None:
    # The ERA5 archive lags a few days; never ask for today.
    end = min(end, date.today() - timedelta(days=1))
    params = {
        "latitude": LAT,
        "longitude": LON,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "rain_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean",
        "timezone": "Africa/Lagos",
    }
    url = "https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(params)
    for attempt in range(2):
        try:
            with urllib.request.urlopen(url, timeout=40) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            daily = payload.get("daily", {})
            if not daily.get("time"):
                return None
            df = pd.DataFrame(
                {
                    "date": pd.to_datetime(daily["time"]),
                    "rainfall_mm": daily.get("rain_sum"),
                    "temp_max_c": daily.get("temperature_2m_max"),
                    "temp_min_c": daily.get("temperature_2m_min"),
                    "temp_mean_c": daily.get("temperature_2m_mean"),
                    "humidity_pct": daily.get("relative_humidity_2m_mean"),
                }
            )
            if df["rainfall_mm"].isna().all():
                return None
            return df
        except Exception as exc:  # noqa: BLE001 - offline demo must still run
            print(f"  weather fetch attempt {attempt + 1} failed: {exc}")
    return None


def _synthetic(start: date, end: date) -> pd.DataFrame:
    """Plausible Abuja climate fallback so the demo never depends on wifi."""
    rng = np.random.default_rng(42)
    dates = _daterange(start, end)
    doy = dates.dayofyear.to_numpy()
    monthly_rain = np.array([0.1, 0.2, 1.0, 3.0, 6.0, 7.0, 8.5, 9.0, 8.0, 4.0, 0.5, 0.1])
    idx = (dates.month.to_numpy() - 1)
    base_rain = monthly_rain[idx]
    wet = np.clip(np.sin(np.pi * (doy - 60) / 213), 0, 1)
    rain = np.where(base_rain > 0.05, rng.gamma(shape=1.3, scale=base_rain / 1.3), 0.0)
    temp_max = 34.5 - 4.2 * wet + rng.normal(0, 0.9, len(dates))
    temp_min = 21.5 + 1.6 * wet + rng.normal(0, 0.7, len(dates))
    humidity = 38 + 46 * wet + rng.normal(0, 4.0, len(dates))
    return pd.DataFrame(
        {
            "date": dates,
            "rainfall_mm": np.round(rain, 1),
            "temp_max_c": np.round(temp_max, 1),
            "temp_min_c": np.round(temp_min, 1),
            "temp_mean_c": np.round((temp_max + temp_min) / 2, 1),
            "humidity_pct": np.round(np.clip(humidity, 20, 98), 1),
        }
    )


def load_weather() -> pd.DataFrame:
    today = date.fromisoformat(TODAY)
    start = today - timedelta(days=HISTORY_DAYS - 1)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    df: pd.DataFrame | None = None
    if CACHE.exists() and META.exists():
        cached = pd.read_csv(CACHE, parse_dates=["date"])
        meta = json.loads(META.read_text())
        if meta.get("start") == start.isoformat() and meta.get("end") == today.isoformat():
            df = cached
            print(f"  weather: using cached Open-Meteo history ({len(df)} days)")

    if df is None:
        print("  weather: fetching Open-Meteo archive for Abuja...")
        df = _fetch_open_meteo(start, today)
        if df is not None:
            print(f"  weather: fetched {len(df)} days from Open-Meteo")
            df.to_csv(CACHE, index=False)
            META.write_text(json.dumps({"start": start.isoformat(), "end": today.isoformat(), "source": "open-meteo"}))
        else:
            print("  weather: falling back to synthetic Abuja climate")

    if df is None:
        df = _synthetic(start, today)
        df.to_csv(CACHE, index=False)
        META.write_text(json.dumps({"start": start.isoformat(), "end": today.isoformat(), "source": "synthetic"}))

    # Ensure the full date range exists, and gaps are filled sensibly.
    full = pd.DataFrame({"date": _daterange(start, today)})
    df = full.merge(df, on="date", how="left").sort_values("date")
    for col in ["rainfall_mm", "temp_max_c", "temp_min_c", "temp_mean_c", "humidity_pct"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].interpolate(limit_direction="both")
    df["rainfall_mm"] = df["rainfall_mm"].clip(lower=0).fillna(0)
    df["humidity_pct"] = df["humidity_pct"].clip(10, 100)
    df["source"] = "Open-Meteo ERA5"
    if META.exists():
        src = json.loads(META.read_text()).get("source")
        if src == "synthetic":
            df["source"] = "Synthetic Abuja climate"
    return df.reset_index(drop=True)


def add_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    rain = out["rainfall_mm"]
    out["rain_lag7"] = rain.shift(7)
    out["rain_lag14"] = rain.shift(14)
    out["rain_sum14"] = rain.rolling(14, min_periods=7).sum()
    out["rain_sum21"] = rain.rolling(21, min_periods=10).sum()
    out["rain_anom21"] = rain.rolling(21, min_periods=10).sum()
    mu, sd = out["rain_anom21"].mean(), out["rain_anom21"].std()
    out["rain_z21"] = ((out["rain_anom21"] - mu) / (sd if sd else 1)).clip(-2.5, 2.5)
    mu_t, sd_t = out["temp_mean_c"].mean(), out["temp_mean_c"].std()
    out["temp_z"] = ((out["temp_mean_c"] - mu_t) / (sd_t if sd_t else 1)).clip(-2.5, 2.5)
    mu_h, sd_h = out["humidity_pct"].mean(), out["humidity_pct"].std()
    out["humidity_z"] = ((out["humidity_pct"] - mu_h) / (sd_h if sd_h else 1)).clip(-2.5, 2.5)
    return out


def weather_for_location(facility: dict) -> pd.DataFrame:
    # All demo facilities are in the FCT; one cached Abuja series is used.
    return add_weather_features(load_weather())


def future_climatology(base: pd.DataFrame, start: date, horizon: int) -> pd.DataFrame:
    """Seasonal climatology for forecast horizons beyond the 16-day weather API."""
    hist = base.copy()
    hist["doy"] = hist["date"].dt.dayofyear
    rows = []
    for i in range(horizon):
        d = start + timedelta(days=i)
        doy = d.timetuple().tm_yday
        window = hist[((hist["doy"] - doy).abs() <= 7) | (((hist["doy"] - doy).abs()) >= 358)]
        if window.empty:
            window = hist
        row = {
            "date": pd.Timestamp(d),
            "rainfall_mm": float(window["rainfall_mm"].mean()),
            "temp_max_c": float(window["temp_max_c"].mean()),
            "temp_min_c": float(window["temp_min_c"].mean()),
            "temp_mean_c": float(window["temp_mean_c"].mean()),
            "humidity_pct": float(window["humidity_pct"].mean()),
        }
        rows.append(row)
    out = pd.DataFrame(rows)
    combined = pd.concat([base, out], ignore_index=True)
    return add_weather_features(combined).tail(horizon).reset_index(drop=True)
