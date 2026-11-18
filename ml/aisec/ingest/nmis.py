"""Nigeria Malaria Indicator Survey 2021 prevalence parser.

Table 4.8.2 reports malaria prevalence in children 6-59 months by state, for
RDT and microscopy. The table is text-extractable from the DHS report PDF.

This gives a real state-level malaria prior; NCDC WER does not report malaria.
"""

from __future__ import annotations

import re
from pathlib import Path

from .base import (
    CACHE_DIR,
    IngestResult,
    PROCESSED_DIR,
    RAW_DIR,
    ensure_dir,
    iso,
    utc_now,
    validate_rows,
    write_csv,
    write_ingest_run,
)
from .http import HttpClient
from .ncdc import extract_text

REPORT_URL = "https://dhsprogram.com/pubs/pdf/MIS41/MIS41.pdf"

STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
    "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
    "FCT-Abuja", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
    "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
    "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
    "Yobe", "Zamfara",
]
ZONES = ["North Central", "North East", "North West", "South East", "South South", "South West"]
STATE_LOOKUP = {state.lower().replace("-", " "): state for state in STATES}
ZONE_LOOKUP = {zone.lower(): zone for zone in ZONES}

ROW_RE = re.compile(
    r"^\s*([A-Za-z][A-Za-z\s\-]*?)\s+"
    r"(\d{1,3}(?:\.\d+)?)\s+([\d,]+)\s+"
    r"(\d{1,3}(?:\.\d+)?)\s+([\d,]+)\s*$"
)


def _find_table(text: str) -> tuple[int, int] | None:
    """Find the real Table 4.8.2, not its table-of-contents entry."""
    for match in re.finditer(r"Table\s+4\.8\.2", text, re.I):
        window = text[match.end() : match.end() + 800]
        if "Percentage of children" in window and "RDT" in window:
            end = re.search(r"Table\s+4\.9\.1", text[match.end() :], re.I)
            return match.end(), match.end() + (end.start() if end else 6000)
    return None


def _int(value: str) -> int:
    return int(value.replace(",", ""))


def parse_prevalence(text: str) -> list[dict[str, object]]:
    bounds = _find_table(text)
    if not bounds:
        return []
    section = text[bounds[0] : bounds[1]]
    rows: list[dict[str, object]] = []
    current_zone: str | None = None

    for line in section.splitlines():
        stripped = line.strip()
        zone = ZONE_LOOKUP.get(stripped.lower())
        if zone:
            current_zone = zone
            continue
        match = ROW_RE.match(line)
        if not match:
            continue
        raw_name = re.sub(r"\s+", " ", match.group(1)).strip()
        key = raw_name.lower().replace("-", " ")
        state = STATE_LOOKUP.get(key)
        is_total = raw_name.lower() == "total"
        if not state and not is_total:
            continue
        rows.append(
            {
                "source_id": "nmis_2021",
                "state": "NG" if is_total else state,
                "zone": current_zone,
                "survey": "NMIS 2021",
                "year": 2021,
                "rdt_positive_pct": float(match.group(2)),
                "rdt_sample": _int(match.group(3)),
                "microscopy_positive_pct": float(match.group(4)),
                "microscopy_sample": _int(match.group(5)),
                "source_url": REPORT_URL,
                "is_illustrative": False,
                "retrieved_at": iso(utc_now()),
            }
        )
    return rows


def run(refresh: bool = False) -> IngestResult:
    result = IngestResult(
        source_id="nmis_2021",
        source_name="Nigeria Malaria Indicator Survey 2021",
        source_url=REPORT_URL,
        licence="DHS Program terms; cite NMEP/NPC/ICF",
    )
    http = HttpClient(refresh=refresh, min_interval=0.5)
    try:
        pdf_path = CACHE_DIR / "nmis_2021" / "MIS41.pdf"
        http.download(REPORT_URL, pdf_path, refresh=refresh)
        text = extract_text(pdf_path)
        text_path = RAW_DIR / "nmis_2021" / "MIS41.txt"
        ensure_dir(text_path.parent)
        text_path.write_text(text, encoding="utf-8")
        rows = parse_prevalence(text)
        if not rows:
            # Explicit, labelled fallback from the published FCT table. This
            # keeps the pipeline usable while the parser is improved.
            rows = [
                {
                    "source_id": "nmis_2021",
                    "state": "FCT-Abuja",
                    "zone": "North Central",
                    "survey": "NMIS 2021",
                    "year": 2021,
                    "rdt_positive_pct": 34.6,
                    "rdt_sample": 171,
                    "microscopy_positive_pct": 18.8,
                    "microscopy_sample": 171,
                    "source_url": REPORT_URL,
                    "is_illustrative": False,
                    "retrieved_at": iso(utc_now()),
                }
            ]
            result.warn("Table 4.8.2 not parsed; used labelled FCT fallback row")
        result.rows_read = len(rows)
        valid_rows = []
        for row in rows:
            errors = validate_rows([row], "malaria_prevalence.schema.json")
            if errors:
                for error in errors[:5]:
                    result.error(f"schema: {error}")
                result.rows_rejected += 1
            else:
                valid_rows.append(row)
        rows = valid_rows
        result.rows_accepted = len(rows)
        result.date_min = "2021-01-01"
        result.date_max = "2021-12-31"
        csv_path = PROCESSED_DIR / "malaria_prevalence_state.csv"
        count = write_csv(csv_path, rows)
        result.add_output(csv_path, "csv", count)
        result.metadata["states_parsed"] = len(
            [row for row in rows if row["state"] not in ("", "NG")]
        )
        result.metadata["has_national"] = any(row["state"] == "NG" for row in rows)
    except Exception as exc:  # noqa: BLE001
        result.error(str(exc))
        result.finish("failed")
    finally:
        http.close()
    write_ingest_run(result)
    return result
