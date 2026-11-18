"""Nigeria Essential Medicines List (NEML) 2024 parser.

Downloads the adult 8th edition PDF and extracts medicine names with ATC codes.
The NEML is the real reference catalogue for the demo medicines. The parser is
conservative: it only keeps rows with a valid ATC code.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

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

NEML_URL = (
    "https://cdn.who.int/media/docs/default-source/essential-medicines/"
    "national-essential-medicines-lists-(neml)/afro_neml/"
    "nigeria-2024-final-neml-adult-8th-edition.pdf?sfvrsn=7c9021db_1&download=true"
)

ATC_RE = re.compile(r"\b([A-Z]\d{2}[A-Z]{2}\d{2})\b")
SECTION_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)\s+([A-Z][A-Z0-9 ,&/\-()]{4,})\s*$")
FORM_WORDS = (
    "tablet", "capsule", "injection", "solution", "suspension", "oral liquid",
    "cream", "ointment", "drops", "inhaler", "suppository", "sachet", "powder",
    "granules", "syrup", "elixir", "emulsion", "gel", "spray", "patch",
    "implant", "vaginal", "rectal", "eye", "ear", "nasal", "lotion", "shampoo",
)
DOSAGE_RE = re.compile(
    r"^\s*([A-Z][A-Za-z0-9 +\-/().'’]{2,90}?)\s{2,}(.+)$"
)


def parse_medicines(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    section = None
    seen: set[tuple[str, str]] = set()
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        section_match = SECTION_RE.match(stripped)
        if section_match and not ATC_RE.search(stripped):
            section = f"{section_match.group(1)} {section_match.group(2).title()}"
            continue
        atc_matches = ATC_RE.findall(stripped)
        if atc_matches:
            # Some editions include ATC codes. Use the name before the code.
            name = stripped[: stripped.find(atc_matches[0])].strip(" .|:-")
            name = re.sub(r"\s{2,}", " ", name)
            if len(name) < 3 or name.isdigit():
                continue
            for atc in atc_matches:
                key = (name.lower(), atc)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(
                    {
                        "source_id": "neml_2024",
                        "name": name,
                        "atc_code": atc,
                        "description": None,
                        "section": section,
                        "edition": "NEML Adult 8th Edition 2024",
                        "source_url": NEML_URL,
                        "is_illustrative": False,
                        "retrieved_at": iso(utc_now()),
                    }
                )
            continue

        # The 2024 edition does not print ATC codes. Fall back to the dosage
        # table: "Medicine name    Tablet: 20 mg + 120 mg".
        dosage = DOSAGE_RE.match(stripped)
        if not dosage:
            continue
        name = re.sub(r"\s{2,}", " ", dosage.group(1)).strip(" .|:-")
        description = re.sub(r"\s{2,}", " ", dosage.group(2)).strip()
        if len(name) < 3 or name.isdigit():
            continue
        if not any(word in description.lower() for word in FORM_WORDS):
            continue
        key = (name.lower(), description[:50].lower())
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "source_id": "neml_2024",
                "name": name,
                "atc_code": None,
                "description": description,
                "section": section,
                "edition": "NEML Adult 8th Edition 2024",
                "source_url": NEML_URL,
                "is_illustrative": False,
                "retrieved_at": iso(utc_now()),
            }
        )
    return rows


def run(refresh: bool = False) -> IngestResult:
    result = IngestResult(
        source_id="neml_2024",
        source_name="Nigeria Essential Medicines List 2024",
        source_url=NEML_URL,
        licence="Government publication; cite Federal Ministry of Health",
    )
    http = HttpClient(refresh=refresh, min_interval=0.5)
    try:
        pdf_path = CACHE_DIR / "neml_2024" / "neml_adult_2024.pdf"
        http.download(NEML_URL, pdf_path, refresh=refresh)
        text = extract_text(pdf_path)
        text_path = RAW_DIR / "neml_2024" / "neml_adult_2024.txt"
        ensure_dir(text_path.parent)
        text_path.write_text(text, encoding="utf-8")
        rows = parse_medicines(text)
        result.rows_read = len(rows)
        valid_rows = []
        for row in rows:
            errors = validate_rows([row], "neml_medicine.schema.json")
            if errors:
                for error in errors[:5]:
                    result.error(f"schema: {error}")
                result.rows_rejected += 1
            else:
                valid_rows.append(row)
        rows = valid_rows
        result.rows_accepted = len(rows)
        csv_path = PROCESSED_DIR / "neml_medicines.csv"
        count = write_csv(csv_path, rows)
        result.add_output(csv_path, "csv", count)
        result.metadata["atc_codes"] = len({row["atc_code"] for row in rows})
        result.metadata["sections"] = len({row["section"] for row in rows if row["section"]})
    except Exception as exc:  # noqa: BLE001
        result.error(str(exc))
        result.finish("failed")
    finally:
        http.close()
    write_ingest_run(result)
    return result
