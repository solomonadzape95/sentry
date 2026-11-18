"""Shared ingestion infrastructure: paths, hashing, manifests and contracts."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import jsonschema

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CACHE_DIR = RAW_DIR / "_cache"
PROCESSED_DIR = DATA_DIR / "processed"
CONTRACTS_DIR = DATA_DIR / "contracts"
REGISTRY_PATH = DATA_DIR / "registry" / "sources.yaml"
RUNS_DIR = RAW_DIR / "_runs"
MANIFEST_PATH = PROCESSED_DIR / "manifest.json"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: Any, indent: int = 2) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(payload, indent=indent, ensure_ascii=False, default=str) + "\n")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_csv(path: Path, rows: Iterable[dict[str, Any]], fieldnames: list[str] | None = None) -> int:
    rows = list(rows)
    ensure_dir(path.parent)
    if not rows:
        path.write_text("")
        return 0
    fields = fieldnames or list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return len(rows)


def validate_rows(rows: Iterable[dict[str, Any]], contract: str) -> list[str]:
    """Validate rows against a JSON Schema in data/contracts.

    Returns a list of human-readable errors. An empty list means every row passed.
    """
    schema_path = CONTRACTS_DIR / contract
    if not schema_path.exists():
        return [f"contract not found: {schema_path}"]
    schema = read_json(schema_path)
    validator = jsonschema.Draft202012Validator(schema)
    errors: list[str] = []
    for index, row in enumerate(rows):
        for error in validator.iter_errors(row):
            location = ".".join(str(part) for part in error.absolute_path) or "<root>"
            errors.append(f"row {index} {location}: {error.message}")
    return errors


@dataclass
class Output:
    path: str
    format: str
    rows: int
    sha256: str | None = None


@dataclass
class IngestResult:
    source_id: str
    started_at: datetime = field(default_factory=utc_now)
    source_name: str | None = None
    source_url: str | None = None
    status: str = "success"
    rows_read: int = 0
    rows_accepted: int = 0
    rows_rejected: int = 0
    date_min: str | None = None
    date_max: str | None = None
    licence: str | None = None
    checksum: str | None = None
    errors: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    outputs: list[Output] = field(default_factory=list)
    finished_at: datetime | None = None

    def add_output(self, path: Path, format: str, rows: int) -> None:
        digest = sha256_file(path) if path.exists() and path.is_file() else None
        try:
            relative = str(path.relative_to(ROOT))
        except ValueError:
            relative = str(path)
        self.outputs.append(Output(path=relative, format=format, rows=rows, sha256=digest))

    def error(self, message: str, context: str | None = None) -> None:
        self.errors.append({"message": message, "context": context})
        if self.status == "success":
            self.status = "partial"

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def finish(self, status: str | None = None) -> None:
        self.finished_at = utc_now()
        if status:
            self.status = status
        if self.errors and self.status == "success":
            self.status = "partial"
        if self.rows_accepted == 0 and self.rows_read > 0:
            self.status = "failed"

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["started_at"] = iso(self.started_at)
        payload["finished_at"] = iso(self.finished_at or utc_now())
        payload["outputs"] = [asdict(output) for output in self.outputs]
        return payload


def write_ingest_run(result: IngestResult) -> Path:
    result.finish()
    stamp = result.started_at.strftime("%Y%m%dT%H%M%SZ")
    path = RUNS_DIR / f"{stamp}-{result.source_id}.json"
    write_json(path, result.to_dict())
    update_manifest(result)
    return path


def update_manifest(result: IngestResult) -> Path:
    """Append a compact run summary to data/processed/manifest.json."""
    manifest: dict[str, Any] = {"version": 1, "updated": iso(utc_now()), "runs": []}
    if MANIFEST_PATH.exists():
        try:
            manifest = read_json(MANIFEST_PATH)
        except json.JSONDecodeError:
            pass
    summary = {
        "source_id": result.source_id,
        "status": result.status,
        "started_at": iso(result.started_at),
        "finished_at": iso(result.finished_at or utc_now()),
        "rows_read": result.rows_read,
        "rows_accepted": result.rows_accepted,
        "rows_rejected": result.rows_rejected,
        "date_min": result.date_min,
        "date_max": result.date_max,
        "outputs": [asdict(output) for output in result.outputs],
        "warnings": result.warnings[:10],
        "errors": result.errors[:10],
    }
    runs = [run for run in manifest.get("runs", []) if run.get("source_id") != result.source_id]
    runs.append(summary)
    manifest["runs"] = runs
    manifest["updated"] = iso(utc_now())
    write_json(MANIFEST_PATH, manifest)
    return MANIFEST_PATH


def min_max_dates(values: Iterable[str]) -> tuple[str | None, str | None]:
    dates = sorted(value for value in values if value)
    if not dates:
        return None, None
    return dates[0], dates[-1]


def parse_iso_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])
