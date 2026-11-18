"""Real-data signals for the forecasting pipeline.

The original pipeline generated a synthetic disease signal. This module uses
real public data where it exists and labels the derived parts explicitly:

- CHOLERA, MENINGITIS, LASSA_FEVER, MEASLES, DIPHTHERIA, AFP: NCDC WER
- MALARIA: derived from the NMIS 2021 FCT prevalence and Open-Meteo rainfall
- RESPIRATORY: derived from Open-Meteo temperature/humidity seasonality

NCDC WER does not report malaria. That is why malaria is derived, not observed.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .config import DISEASE_BASE, HISTORY_DAYS, TODAY
from .weather import add_weather_features

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data" / "processed"
NCDC_PATH = PROCESSED / "ncdc_disease_weekly.csv"
NMIS_PATH = PROCESSED / "malaria_prevalence_state.csv"
OUTPUT_PATH = PROCESSED / "disease_signals_weekly.csv"

# FCT share of Nigeria's population, used only to scale national outbreak
# counts into a local signal. This is an explicit, documented assumption.
FCT_POPULATION_SHARE = 0.022
NATIONAL_MALARIA_RDT = 39.6  # NMIS 2021 national RDT prevalence
FCT_MALARIA_RDT_FALLBACK = 34.6  # NMIS 2021 FCT-Abuja RDT prevalence


def _load_ncdc() -> pd.DataFrame | None:
    if not NCDC_PATH.exists():
        return None
    frame = pd.read_csv(NCDC_PATH)
    frame["date"] = pd.to_datetime(frame["period_start"])
    frame = frame.dropna(subset=["date", "disease", "suspected"])
    pivot = frame.pivot_table(
        index="date", columns="disease", values="suspected", aggfunc="sum"
    ).sort_index()
    # NCDC period starts are already weekly Mondays. Reindex rather than
    # resample so the dates are not shifted by a week.
    full = pd.date_range(pivot.index.min(), pivot.index.max(), freq="7D")
    return pivot.reindex(full)


def _load_fct_prevalence() -> float:
    if not NMIS_PATH.exists():
        return FCT_MALARIA_RDT_FALLBACK
    frame = pd.read_csv(NMIS_PATH)
    fct = frame[
        frame["state"].astype(str).str.contains("FCT|Abuja", case=False, na=False)
    ]
    if fct.empty:
        return FCT_MALARIA_RDT_FALLBACK
    return float(fct["rdt_positive_pct"].mean())


def _weekly_weather(weather: pd.DataFrame) -> pd.DataFrame:
    enriched = add_weather_features(weather)
    enriched["date"] = pd.to_datetime(enriched["date"])
    weekly = (
        enriched.set_index("date")
        .resample("W-MON", label="left")
        .agg(
            rain=("rainfall_mm", "sum"),
            temp=("temp_mean_c", "mean"),
            humidity=("humidity_pct", "mean"),
            rain_z21=("rain_z21", "mean"),
            temp_z=("temp_z", "mean"),
            humidity_z=("humidity_z", "mean"),
        )
        .reset_index()
    )
    return weekly


def build_disease_signals(weather: pd.DataFrame) -> pd.DataFrame:
    """Return weekly disease signals over the demo history window.

    Real NCDC outbreak counts are used for cholera, meningitis and Lassa fever.
    Malaria and respiratory signals are derived from real prevalence/weather and
    are labelled as derived in the exported provenance file.
    """
    today = pd.Timestamp(TODAY)
    start = today - pd.Timedelta(days=HISTORY_DAYS - 1)
    weekly = _weekly_weather(weather)
    weekly = weekly[(weekly["date"] >= start - pd.Timedelta(days=7)) & (weekly["date"] <= today)].copy()

    ncdc = _load_ncdc()
    prevalence = _load_fct_prevalence()
    prevalence_factor = prevalence / NATIONAL_MALARIA_RDT
    sources: dict[str, str] = {}

    latest_ncdc = ncdc.index.max() if ncdc is not None else None
    if ncdc is not None:
        ncdc = ncdc.reindex(weekly["date"]).ffill().bfill()
        for disease in ("CHOLERA", "MENINGITIS", "LASSA_FEVER", "MEASLES", "DIPHTHERIA", "AFP"):
            if disease in ncdc.columns:
                weekly[disease] = ncdc[disease].fillna(0).to_numpy()
                sources[disease] = "NCDC Weekly Epidemiological Report"
    else:
        for disease in ("CHOLERA", "MENINGITIS", "LASSA_FEVER", "MEASLES", "DIPHTHERIA", "AFP"):
            weekly[disease] = 0
            sources[disease] = "Unavailable (NCDC scrape not run)"

    # FCT-scale cholera and Lassa signals: national counts are scaled by FCT's
    # population share. The unscaled national columns are kept for audit.
    for disease in ("CHOLERA", "LASSA_FEVER"):
        weekly[f"{disease}_NATIONAL"] = weekly[disease]
        weekly[disease] = weekly[disease] * FCT_POPULATION_SHARE

    rain_z = weekly["rain_z21"].fillna(0).clip(-2.5, 2.5)
    # Malaria: real FCT prevalence, seasonal rainfall response and a stable
    # baseline. This is an index, not an observed case count.
    malaria = (
        DISEASE_BASE["MALARIA"]
        * prevalence_factor
        * np.exp(0.35 * rain_z)
        * (1 + 0.08 * np.sin(np.arange(len(weekly)) / 9))
    )
    weekly["MALARIA"] = np.maximum(0, np.round(malaria)).astype(int)
    sources["MALARIA"] = "DERIVED: NMIS 2021 FCT prevalence + Open-Meteo rainfall"

    # Respiratory: dry/harmattan season proxy from real weather.
    dry = ((-weekly["humidity_z"].fillna(0)) * 0.30).clip(-1.0, 1.2)
    harmattan = weekly["date"].dt.month.isin([12, 1, 2]).astype(float)
    respiratory = DISEASE_BASE["RESPIRATORY"] * np.exp(dry) * (1 + 0.45 * harmattan)
    weekly["RESPIRATORY"] = np.maximum(0, np.round(respiratory)).astype(int)
    sources["RESPIRATORY"] = "DERIVED: Open-Meteo temperature/humidity seasonality"

    weekly["periodEnd"] = weekly["date"] + pd.Timedelta(days=6)
    # Weeks after the latest NCDC report are carried forward, not observed.
    weekly["NCDC_STALE"] = (
        weekly["date"] > latest_ncdc if latest_ncdc is not None else True
    )
    weekly["source"] = weekly.get("source", "")
    weekly.attrs["sources"] = sources
    weekly.attrs["fct_malaria_prevalence"] = prevalence

    # Keep the columns the model expects, plus the real outbreak columns.
    columns = [
        "date",
        "periodEnd",
        "MALARIA",
        "CHOLERA",
        "RESPIRATORY",
        "MENINGITIS",
        "LASSA_FEVER",
        "MEASLES",
        "DIPHTHERIA",
        "AFP",
        "CHOLERA_NATIONAL",
        "LASSA_FEVER_NATIONAL",
        "NCDC_STALE",
    ]
    out = weekly[[column for column in columns if column in weekly.columns]].copy()
    out = out[out["date"] >= start].reset_index(drop=True)

    # Provenance file: one row per signal with its source and derivation note.
    provenance = pd.DataFrame(
        [
            {
                "signal": signal,
                "source": source,
                "is_derived": source.startswith("DERIVED"),
                "is_illustrative": False,
                "fct_malaria_rdt_pct": prevalence if signal == "MALARIA" else None,
                "latest_observation": latest_ncdc.date().isoformat() if latest_ncdc is not None else None,
                "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
            }
            for signal, source in sources.items()
        ]
    )
    PROCESSED.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_PATH, index=False)
    provenance.to_csv(PROCESSED / "disease_signal_provenance.csv", index=False)
    return out
