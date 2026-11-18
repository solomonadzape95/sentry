"""NCDC Weekly Epidemiological Report scraper and parser.

Source: https://ncdc.gov.ng/reports/weekly
Each weekly page links to a PDF. The PDFs are text-extractable with
`pdftotext -layout`. This module downloads the PDF into the cache, keeps the
extracted text, parses the disease tables and writes normalised rows.

NCDC WER does not report malaria. Malaria priors come from NMIS/DHIS2.
"""

from __future__ import annotations

import calendar
import re
import subprocess
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from dateutil import parser as date_parser

from .base import (
    CACHE_DIR,
    IngestResult,
    PROCESSED_DIR,
    RAW_DIR,
    ensure_dir,
    iso,
    min_max_dates,
    utc_now,
    validate_rows,
    write_csv,
    write_ingest_run,
)
from .http import HttpClient

INDEX_URL = "https://ncdc.gov.ng/reports/weekly"
BASE_URL = "https://ncdc.gov.ng"
WEEK_LINK_RE = re.compile(r"/reports/weekly/(\d{4})/(\d{1,2})/(\d{1,2})")
PDF_RE = re.compile(r"/themes/common/docs/wers/[^\"'<> ]+\.pdf")
WEEK_RE = re.compile(
    r"Week\s+(\d+)\s*:\s*(\d{1,2})(?:st|nd|rd|th)?\s*[-\u2013\u2014]\s*"
    r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})",
    re.I,
)
ISSUE_RE = re.compile(
    r"Issue:\s*Volume\s+(\d+)\s+No\.\s*(\d+)\.\s*"
    r"([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\.?\s+\d{4})",
    re.I,
)

# Canonical code -> heading variants (normalised whitespace).
DISEASES: list[tuple[str, str, list[str]]] = [
    ("LASSA_FEVER", "Lassa fever", ["Lassa Fever"]),
    ("MENINGITIS", "Cerebrospinal meningitis (CSM)", ["Cerebrospinal Meningitis (CSM)"]),
    ("YELLOW_FEVER", "Yellow fever", ["Yellow Fever"]),
    ("CHOLERA", "Cholera", ["Cholera"]),
    ("MEASLES", "Measles", ["Measles"]),
    ("MPOX", "Mpox", ["Mpox"]),
    ("AFP", "Acute flaccid paralysis", ["Acute Flaccid Paralysis (AFP)", "Acute Flaccid Paralysis (APF)"]),
    ("COVID19", "COVID-19", ["COVID-19"]),
    ("DIPHTHERIA", "Diphtheria", ["Diphtheria"]),
]


@dataclass
class ReportMeta:
    epi_year: int | None
    epi_week: int | None
    period_start: str | None
    period_end: str | None
    volume: int | None
    issue: int | None
    published_at: str | None
    pdf_url: str
    text_path: str
    diseases_found: list[str]
    warnings: list[str]


def normalise_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def week_links(html: str, base_url: str = BASE_URL) -> list[tuple[int, int, str]]:
    soup = BeautifulSoup(html, "lxml")
    found: dict[tuple[int, int], str] = {}
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"])
        match = WEEK_LINK_RE.search(href)
        if not match:
            continue
        year, month, week = (int(part) for part in match.groups())
        key = (year, week)
        # Keep the first link for a week; duplicates are common on the index.
        found.setdefault(key, urljoin(base_url, href))
    return sorted((year, week, url) for (year, week), url in found.items())


def pdf_links(html: str, base_url: str) -> list[str]:
    found = []
    for match in PDF_RE.findall(html):
        url = urljoin(base_url, match)
        if url not in found:
            found.append(url)
    if not found:
        soup = BeautifulSoup(html, "lxml")
        for anchor in soup.find_all("a", href=True):
            href = str(anchor["href"])
            if href.lower().endswith(".pdf") and "wers" in href.lower():
                url = urljoin(base_url, href)
                if url not in found:
                    found.append(url)
    return found


def extract_text(pdf_path: Path) -> str:
    try:
        completed = subprocess.run(
            ["pdftotext", "-layout", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            check=True,
        )
        if completed.stdout.strip():
            return completed.stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    # Fallback that works without poppler installed.
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def parse_period(text: str) -> tuple[int | None, int | None, str | None, str | None]:
    match = WEEK_RE.search(text)
    if not match:
        return None, None, None, None
    week = int(match.group(1))
    start_day = int(match.group(2))
    end_day = int(match.group(3))
    month_name = match.group(4).rstrip(".")
    year = int(match.group(5))
    months = {name.lower(): index for index, name in enumerate(calendar.month_name) if name}
    months.update({name.lower(): index for index, name in enumerate(calendar.month_abbr) if name})
    month = months.get(month_name.lower())
    if month is None:
        return week, year, None, None
    start_month = month
    start_year = year
    if start_day > end_day:
        start_month = 12 if month == 1 else month - 1
        if month == 1:
            start_year = year - 1
    try:
        start = date(start_year, start_month, start_day)
        end = date(year, month, end_day)
    except ValueError:
        return week, year, None, None
    return week, year, start.isoformat(), end.isoformat()


def parse_issue(text: str) -> tuple[int | None, int | None, str | None]:
    match = ISSUE_RE.search(text)
    if not match:
        return None, None, None
    volume = int(match.group(1))
    issue = int(match.group(2))
    published = match.group(3)
    try:
        published_at = date_parser.parse(published, fuzzy=True).date().isoformat()
    except (ValueError, OverflowError):
        published_at = None
    return volume, issue, published_at


def _section_for(text: str, heading: str) -> str | None:
    """Return the text around the first occurrence of a disease heading that
    is followed by a `Table N: Week ...` block."""
    pattern = re.compile(r"\s+".join(re.escape(part) for part in heading.split()), re.I)
    for match in pattern.finditer(text):
        # The real section heading is immediately followed by its weekly table.
        # A 220-char window avoids matching the summary table or narrative
        # mentions of the disease earlier in the report.
        window = text[match.end() : match.end() + 220]
        has_table = re.search(r"Table\s+\d+\s*:\s*Week\s+\d+", window, re.I)
        has_old_table = re.search(r"(?m)^\s*Week\s+\d+\s*$", window)
        if has_table or has_old_table:
            return text[match.end() : match.end() + 4000]
    return None


def _weekly_counts(section: str) -> tuple[int | None, int | None, int | None]:
    match = re.search(r"Table\s+\d+\s*:\s*Week\s+\d+", section, re.I)
    if not match:
        # Older WER formats (pre-2024) omit the "Table N:" prefix and put a
        # bare "Week 27" line above the weekly counts.
        match = re.search(r"(?m)^\s*Week\s+\d+\s*$", section)
    if not match:
        return None, None, None
    table_text = section[match.end() : match.end() + 1200]
    # State/LGA counts sit inside the table; remove them before reading the
    # suspected / confirmed / deaths triple.
    cleaned = re.sub(r"State:\s*\d+(?:\s*\+\s*FCT)?", " ", table_text, flags=re.I)
    cleaned = re.sub(r"LGA:\s*\d+", " ", cleaned, flags=re.I)
    numbers = [int(value) for value in re.findall(r"\b\d+\b", cleaned)]
    if len(numbers) < 3:
        return None, None, None
    return numbers[0], numbers[1], numbers[2]


def _affected(section: str) -> tuple[int | None, int | None, str | None]:
    state_match = re.search(r"State:\s*(\d+)(\s*\+\s*FCT)?", section, re.I)
    lga_match = re.search(r"LGA:\s*(\d+)", section, re.I)
    states = int(state_match.group(1)) if state_match else None
    raw = None
    if state_match:
        raw = state_match.group(0).strip()
        if state_match.group(2):
            states = (states or 0) + 1
    lgas = int(lga_match.group(1)) if lga_match else None
    return states, lgas, raw


def _ytd(section: str, epi_year: int | None) -> dict[str, int | None]:
    match = re.search(r"Year to date", section, re.I)
    if not match:
        return {}
    raw = section[match.end() : match.end() + 900]

    # Older format first: a header line of years, then a values line with
    # suspected/confirmed/deaths for the previous and current year.
    header = re.search(r"(?m)^\s*((?:20\d{2}\s+){3,}20\d{2})\s*$", raw)
    if header:
        years = [int(value) for value in re.findall(r"20\d{2}", header.group(1))]
        values_match = re.search(
            r"(?m)^\s*(\d+(?:\s+\d+){5,})", raw[header.end() :]
        )
        if values_match and len(years) >= 2:
            values = [int(value) for value in values_match.group(1).split()]
            if len(values) >= 6:
                return {
                    "ytd_current_suspected": values[1],
                    "ytd_current_confirmed": values[3],
                    "ytd_current_deaths": values[5],
                    "ytd_previous_suspected": values[0],
                    "ytd_previous_confirmed": values[2],
                    "ytd_previous_deaths": values[4],
                }

    # Newer format: one row per year, e.g. "2025 7253 862 160 18.7%".
    window = normalise_whitespace(raw)
    rows = re.findall(
        r"(20\d{2})\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+[\d.]+%?)?", window
    )
    parsed = {int(year): tuple(int(value) for value in values) for year, *values in rows}
    if len(parsed) >= 2:
        years = sorted(parsed)
        current_year = epi_year if epi_year in parsed else years[-1]
        previous_year = current_year - 1 if (current_year - 1) in parsed else None
        current = parsed.get(current_year)
        previous = parsed.get(previous_year) if previous_year else None
        return {
            "ytd_current_suspected": current[0] if current else None,
            "ytd_current_confirmed": current[1] if current else None,
            "ytd_current_deaths": current[2] if current else None,
            "ytd_previous_suspected": previous[0] if previous else None,
            "ytd_previous_confirmed": previous[1] if previous else None,
            "ytd_previous_deaths": previous[2] if previous else None,
        }
    return {}


def parse_report(
    text: str,
    pdf_url: str,
    text_path: Path,
    fallback_year: int | None = None,
    fallback_week: int | None = None,
) -> tuple[list[dict[str, Any]], ReportMeta]:
    week, year, period_start, period_end = parse_period(text)
    if year is None:
        year = fallback_year
    if week is None:
        week = fallback_week
    volume, issue, published_at = parse_issue(text)
    if (not period_start or not period_end) and year and week and 1 <= week <= 53:
        # Fallback to the ISO week when the report header is formatted
        # unusually. This keeps the observation dateable without guessing.
        try:
            start = datetime.fromisocalendar(year, week, 1).date()
            period_start = start.isoformat()
            period_end = (start + timedelta(days=6)).isoformat()
        except ValueError:
            pass
    rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    found: list[str] = []

    for code, label, headings in DISEASES:
        section = None
        for heading in headings:
            section = _section_for(text, heading)
            if section:
                break
        if not section:
            warnings.append(f"{code}: section not found")
            continue
        suspected, confirmed, deaths = _weekly_counts(section)
        if suspected is None:
            warnings.append(f"{code}: weekly counts not parsed")
            continue
        states, lgas, states_raw = _affected(section)
        ytd = _ytd(section, year)
        row = {
            "source_id": "ncdc_wer",
            "disease": code,
            "disease_label": label,
            "state": "NG",
            "lga": None,
            "epi_year": year,
            "epi_week": week,
            "period_start": period_start,
            "period_end": period_end,
            "suspected": suspected,
            "confirmed": confirmed,
            "deaths": deaths,
            "states_affected": states,
            "lgas_affected": lgas,
            "states_affected_raw": states_raw,
            **ytd,
            "source_url": pdf_url,
            "source_page": None,
            "raw_text_path": str(text_path.relative_to(RAW_DIR.parent.parent))
            if text_path.is_relative_to(RAW_DIR.parent.parent)
            else str(text_path),
            "is_illustrative": False,
            "retrieved_at": iso(utc_now()),
        }
        rows.append(row)
        found.append(code)

    meta = ReportMeta(
        epi_year=year,
        epi_week=week,
        period_start=period_start,
        period_end=period_end,
        volume=volume,
        issue=issue,
        published_at=published_at,
        pdf_url=pdf_url,
        text_path=str(text_path),
        diseases_found=found,
        warnings=warnings,
    )
    return rows, meta


def run(
    from_year: int = 2023,
    to_year: int | None = None,
    limit: int | None = None,
    refresh: bool = False,
) -> IngestResult:
    to_year = to_year or date.today().year
    result = IngestResult(
        source_id="ncdc_wer",
        source_name="NCDC Weekly Epidemiological Reports",
        source_url=INDEX_URL,
        licence="Nigerian government public report; attribute NCDC",
    )
    http = HttpClient(refresh=refresh, min_interval=0.6)
    rows: list[dict[str, Any]] = []
    reports: list[dict[str, Any]] = []
    try:
        index = http.get(INDEX_URL)
        links = [
            item
            for item in week_links(index.text, BASE_URL)
            if from_year <= item[0] <= to_year
        ]
        if limit:
            links = links[-limit:]
        result.metadata["weeks_requested"] = len(links)
        result.metadata["from_year"] = from_year
        result.metadata["to_year"] = to_year

        for year, week, page_url in links:
            try:
                page = http.get(page_url)
                pdfs = pdf_links(page.text, BASE_URL)
                if not pdfs:
                    result.warn(f"{year} W{week}: no PDF link on {page_url}")
                    continue
                pdf_url = pdfs[0]
                pdf_path = CACHE_DIR / "ncdc_wer" / str(year) / f"w{week:02d}.pdf"
                http.download(pdf_url, pdf_path, refresh=refresh)
                text = extract_text(pdf_path)
                text_path = RAW_DIR / "ncdc_wer" / str(year) / f"w{week:02d}.txt"
                ensure_dir(text_path.parent)
                text_path.write_text(text, encoding="utf-8")
                parsed, meta = parse_report(
                    text, pdf_url, text_path, fallback_year=year, fallback_week=week
                )
                rows.extend(parsed)
                reports.append(
                    {
                        "source_id": "ncdc_wer",
                        "epi_year": meta.epi_year,
                        "epi_week": meta.epi_week,
                        "period_start": meta.period_start,
                        "period_end": meta.period_end,
                        "volume": meta.volume,
                        "issue": meta.issue,
                        "published_at": meta.published_at,
                        "pdf_url": meta.pdf_url,
                        "text_path": meta.text_path,
                        "diseases_found": ",".join(meta.diseases_found),
                        "warnings": "; ".join(meta.warnings),
                        "retrieved_at": iso(utc_now()),
                    }
                )
                result.rows_read += len(parsed)
                if meta.warnings:
                    for warning in meta.warnings:
                        result.warn(f"{year} W{week}: {warning}")
            except Exception as exc:  # noqa: BLE001 - one bad report must not kill the run
                result.error(f"{year} W{week}: {exc}", context=page_url)
    finally:
        http.close()

    # Deduplicate by disease/year/week, keeping the latest row.
    deduped: dict[tuple[str, int | None, int | None], dict[str, Any]] = {}
    for row in rows:
        key = (row["disease"], row.get("epi_year"), row.get("epi_week"))
        deduped[key] = row
    rows = sorted(
        deduped.values(),
        key=lambda item: (
            item.get("period_start") or "",
            item.get("disease") or "",
        ),
    )

    valid_rows: list[dict[str, Any]] = []
    for row in rows:
        errors = validate_rows([row], "disease_observation.schema.json")
        if errors:
            for error in errors[:5]:
                result.error(f"schema: {error}")
            result.rows_rejected += 1
        else:
            valid_rows.append(row)
    rows = valid_rows
    result.rows_read = len(rows) + result.rows_rejected
    result.rows_accepted = len(rows)

    dates = [row.get("period_start") for row in rows]
    result.date_min, result.date_max = min_max_dates(dates)

    csv_path = PROCESSED_DIR / "ncdc_disease_weekly.csv"
    count = write_csv(csv_path, rows)
    result.add_output(csv_path, "csv", count)
    reports_path = PROCESSED_DIR / "ncdc_reports.csv"
    report_count = write_csv(reports_path, reports)
    result.add_output(reports_path, "csv", report_count)
    result.metadata["reports_parsed"] = len(reports)
    result.metadata["diseases"] = sorted({row["disease"] for row in rows})
    result.checksum = result.outputs[0].sha256 if result.outputs else None

    if not rows:
        result.error("No disease rows parsed")
    write_ingest_run(result)
    return result
