"""Export provenance artefacts for the web seed.

Reads the source registry, the ingest manifest and the disease signal
provenance, then writes:

- data/seed/data_sources.json
- data/seed/ingest_runs.json
- data/seed/data_quality.json

The web seed script loads these into `DataSource` and `IngestRun`.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
REGISTRY = DATA / "registry" / "sources.yaml"
MANIFEST = DATA / "processed" / "manifest.json"
DISEASE_PROVENANCE = DATA / "processed" / "disease_signal_provenance.csv"
SEED = DATA / "seed"

KIND = {
    "ncdc_wer": "OBSERVED",
    "nmis_2021": "OBSERVED_PRIOR",
    "open_meteo": "OBSERVED",
    "grid3_facilities": "REFERENCE",
    "hdx_nhfr_facilities": "REFERENCE",
    "hdxx_dhs": "REFERENCE",
    "hdx_dhs": "REFERENCE",
    "neml_2024": "REFERENCE",
    "nhfr_api": "GATED",
    "dhis2_nigeria": "GATED",
    "nbs_nhfs_2023": "GATED",
    "nhlmis": "GATED",
    "facility_hms": "GATED",
}
STATUS = {"active": "ACTIVE", "planned": "PLANNED", "blocked": "GATED"}


def _source_url(source: dict[str, Any]) -> str | None:
    for key in ("url", "index_url", "api", "report_url", "archive_url"):
        value = source.get(key)
        if value:
            return str(value)
    return None


def _write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str) + "\n")


def export_provenance() -> dict[str, Any]:
    registry = yaml.safe_load(REGISTRY.read_text()) if REGISTRY.exists() else {"sources": []}
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"runs": []}
    runs_by_source = {run["source_id"]: run for run in manifest.get("runs", [])}

    sources = []
    for source in registry.get("sources", []):
        source_id = source["id"]
        run = runs_by_source.get(source_id)
        sources.append(
            {
                "id": source_id,
                "name": source.get("name", source_id),
                "kind": KIND.get(source_id, "REFERENCE"),
                "coverage": source.get("coverage") or source.get("granularity"),
                "url": _source_url(source),
                "licence": source.get("licence"),
                "status": STATUS.get(source.get("status", "planned"), "PLANNED"),
                "lastRunAt": run.get("finished_at") if run else None,
                "rowsAccepted": run.get("rows_accepted") if run else None,
                "dateMin": run.get("date_min") if run else None,
                "dateMax": run.get("date_max") if run else None,
            }
        )

    ingest_runs = []
    for run in manifest.get("runs", []):
        ingest_runs.append(
            {
                "sourceId": run.get("source_id"),
                "status": run.get("status", "success"),
                "rowsRead": run.get("rows_read", 0),
                "rowsAccepted": run.get("rows_accepted", 0),
                "rowsRejected": run.get("rows_rejected", 0),
                "dateMin": run.get("date_min"),
                "dateMax": run.get("date_max"),
                "startedAt": run.get("started_at"),
                "finishedAt": run.get("finished_at"),
                "warnings": json.dumps(run.get("warnings", [])),
                "errors": json.dumps(run.get("errors", [])),
            }
        )

    disease_signals = []
    if DISEASE_PROVENANCE.exists():
        frame = pd.read_csv(DISEASE_PROVENANCE)
        disease_signals = frame.to_dict(orient="records")

    totals = {
        "sources": len(sources),
        "activeSources": sum(1 for source in sources if source["status"] == "ACTIVE"),
        "gatedSources": sum(1 for source in sources if source["status"] == "GATED"),
        "rowsAccepted": sum(int(run.get("rowsAccepted") or 0) for run in ingest_runs),
        "warnings": sum(1 for run in ingest_runs if json.loads(run.get("warnings") or "[]")),
        "failedRuns": sum(1 for run in ingest_runs if run.get("status") == "failed"),
    }

    quality = {
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "totals": totals,
        "sources": sources,
        "runs": ingest_runs,
        "diseaseSignals": disease_signals,
    }

    _write(SEED / "data_sources.json", sources)
    _write(SEED / "ingest_runs.json", ingest_runs)
    _write(SEED / "data_quality.json", quality)
    return quality
