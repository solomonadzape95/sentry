"""Facility master ingestion from GRID3 v4.0 and the HDX NHFR snapshot."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from .base import (
    CACHE_DIR,
    IngestResult,
    PROCESSED_DIR,
    ensure_dir,
    iso,
    min_max_dates,
    utc_now,
    validate_rows,
    write_csv,
    write_ingest_run,
)
from .hdx import HDXClient

GRID3_DATASET = "grid3-nga-health-facilities-v4-0"
NHFR_DATASET = "nigeria-health-facilities"


def _norm(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def _pick(columns: dict[str, str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in columns:
            return columns[candidate]
    for key, original in columns.items():
        if any(candidate in key for candidate in candidates):
            return original
    return None


def _series(frame: pd.DataFrame, column: str | None, default: Any = None) -> pd.Series:
    if column and column in frame.columns:
        return frame[column]
    return pd.Series([default] * len(frame), index=frame.index)


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return None
        number = float(value)
        if number != number:  # NaN
            return None
        return number
    except (TypeError, ValueError):
        return None


def _normalise_frame(
    frame: pd.DataFrame,
    source_id: str,
    id_candidates: list[str],
    name_candidates: list[str],
    type_candidates: list[str],
    ownership_candidates: list[str],
    state_candidates: list[str],
    lga_candidates: list[str],
    ward_candidates: list[str],
    lat_candidates: list[str],
    lon_candidates: list[str],
    nhfr_candidates: list[str] | None = None,
    level_candidates: list[str] | None = None,
) -> list[dict[str, Any]]:
    columns = {str(column).lower().strip(): column for column in frame.columns}
    name_col = _pick(columns, name_candidates)
    type_col = _pick(columns, type_candidates)
    ownership_col = _pick(columns, ownership_candidates)
    state_col = _pick(columns, state_candidates)
    lga_col = _pick(columns, lga_candidates)
    ward_col = _pick(columns, ward_candidates)
    id_col = _pick(columns, id_candidates)
    lat_col = _pick(columns, lat_candidates)
    lon_col = _pick(columns, lon_candidates)
    nhfr_col = _pick(columns, nhfr_candidates or [])
    level_col = _pick(columns, level_candidates or ["facility_level", "level"])
    geometry = frame.geometry if "geometry" in frame else None

    rows: list[dict[str, Any]] = []
    for index, record in frame.iterrows():
        name = str(_series(frame, name_col, "UNKNOWN").loc[index]).strip()
        state = str(_series(frame, state_col, "UNKNOWN").loc[index]).strip()
        lga = str(_series(frame, lga_col, "").loc[index]).strip()
        ward = str(_series(frame, ward_col, "").loc[index]).strip()
        source_facility_id = str(_series(frame, id_col, "").loc[index]).strip()
        if not source_facility_id or source_facility_id.lower() in ("nan", "none"):
            source_facility_id = f"{_norm(name)}|{_norm(state)}|{_norm(lga)}"
        lat = _float_or_none(_series(frame, lat_col, None).loc[index])
        lon = _float_or_none(_series(frame, lon_col, None).loc[index])
        if (lat is None or lon is None) and geometry is not None:
            try:
                point = geometry.loc[index]
                lon = float(point.x) if lon is None else lon
                lat = float(point.y) if lat is None else lat
            except Exception:  # noqa: BLE001 - geometry may be missing/invalid
                pass
        rows.append(
            {
                "source_id": source_id,
                "source_facility_id": source_facility_id,
                "nhfr_id": str(_series(frame, nhfr_col, "").loc[index]).strip()
                if nhfr_col
                else None,
                "grid3_id": source_facility_id if source_id == "grid3_facilities" else None,
                "dhis2_org_unit_id": None,
                "name": name or "UNKNOWN",
                "short_name": None,
                "facility_type": str(_series(frame, type_col, "UNKNOWN").loc[index]).strip()
                or "UNKNOWN",
                "ownership": str(_series(frame, ownership_col, "UNKNOWN").loc[index]).strip()
                or "UNKNOWN",
                "level": str(_series(frame, level_col, "").loc[index]).strip() or None,
                "address": None,
                "ward": ward or None,
                "lga": lga or None,
                "state": state or "UNKNOWN",
                "latitude": lat,
                "longitude": lon,
                "catchment_population": None,
                "services": None,
                "is_verified": source_id == "nhfr_api",
                "is_illustrative": False,
                "retrieved_at": iso(utc_now()),
            }
        )
    return rows


def run(limit: int | None = None, refresh: bool = False) -> IngestResult:
    result = IngestResult(
        source_id="grid3_facilities",
        source_name="GRID3 NGA Health Facilities v4.0",
        source_url=f"https://data.humdata.org/dataset/{GRID3_DATASET}",
        licence="CC BY 4.0",
    )
    hdx = HDXClient()
    try:
        resource = hdx.find_resource(
            GRID3_DATASET, formats=("geopackage",), name_contains="health_facility"
        )
        url = hdx.download_resource(resource)
        result.metadata["resource_url"] = url
        extension = Path(url).suffix or ".gpkg"
        destination = CACHE_DIR / "grid3_facilities" / f"nga_health_facilities_v4{extension}"
        ensure_dir(destination.parent)
        hdx.http.download(url, destination, refresh=refresh)

        import geopandas as gpd
        import pyogrio

        layers = pyogrio.list_layers(destination)
        layer = str(layers[0][0]) if len(layers) else None
        result.metadata["layers"] = [str(item[0]) for item in layers]
        frame = gpd.read_file(destination, layer=layer) if layer else gpd.read_file(destination)
        result.metadata["detected_columns"] = [str(column) for column in frame.columns]
        if limit:
            frame = frame.head(limit)

        rows = _normalise_frame(
            frame,
            source_id="grid3_facilities",
            id_candidates=["facility_id", "unique_id", "id", "objectid", "fid"],
            name_candidates=["facility_name", "name", "health_facility", "facility"],
            type_candidates=["facility_type", "type", "level", "facility_level"],
            ownership_candidates=["ownership", "owner", "ownership_type"],
            state_candidates=["state", "state_name"],
            lga_candidates=["lga", "lga_name", "local_government_area"],
            ward_candidates=["ward", "ward_name"],
            lat_candidates=["latitude", "lat", "y"],
            lon_candidates=["longitude", "lon", "lng", "x"],
            nhfr_candidates=["nhfr_facility_code", "nhfr_id", "hfr_id", "facility_code"],
            level_candidates=["facility_level", "level"],
        )
        result.rows_read = len(rows)
        schema_errors = validate_rows(rows, "facility.schema.json")
        for error in schema_errors[:50]:
            result.error(f"schema: {error}")
        result.rows_accepted = len(rows) if not schema_errors else max(0, len(rows) - len(schema_errors))
        result.rows_rejected = len(rows) - result.rows_accepted
        result.date_min = None
        result.date_max = None

        csv_path = PROCESSED_DIR / "facilities_grid3.csv"
        count = write_csv(csv_path, rows)
        result.add_output(csv_path, "csv", count)
        fct_rows = [
            row for row in rows
            if "fct" in str(row.get("state", "")).lower()
            or "abuja" in str(row.get("state", "")).lower()
        ]
        fct_path = PROCESSED_DIR / "facilities_fct.csv"
        fct_count = write_csv(fct_path, fct_rows)
        result.add_output(fct_path, "csv", fct_count)
        result.metadata["facility_count"] = count
        result.metadata["fct_facility_count"] = fct_count
    except Exception as exc:  # noqa: BLE001
        result.error(str(exc))
        result.finish("failed")
    finally:
        hdx.close()
    write_ingest_run(result)
    return result


def run_nhfr(limit: int | None = None, refresh: bool = False) -> IngestResult:
    result = IngestResult(
        source_id="hdx_nhfr_facilities",
        source_name="Nigeria Health Facilities (NHFR snapshot)",
        source_url=f"https://data.humdata.org/dataset/{NHFR_DATASET}",
        licence="CC BY 4.0",
    )
    hdx = HDXClient()
    try:
        resource = hdx.find_resource(NHFR_DATASET, formats=("csv",), name_contains="healthfacilities")
        url = hdx.download_resource(resource)
        result.metadata["resource_url"] = url
        destination = CACHE_DIR / "hdx_nhfr_facilities" / "nigeriahealthfacilities.csv"
        ensure_dir(destination.parent)
        hdx.http.download(url, destination, refresh=refresh)
        frame = pd.read_csv(destination, dtype=str, low_memory=False)
        result.metadata["detected_columns"] = [str(column) for column in frame.columns]
        if limit:
            frame = frame.head(limit)

        rows = _normalise_frame(
            frame,
            source_id="hdx_nhfr_facilities",
            id_candidates=["id", "facility_code", "facility_id", "unique_id", "code"],
            name_candidates=["name", "facility_name", "health_facility"],
            type_candidates=["type", "facility_type", "level"],
            ownership_candidates=["category", "ownership", "owner"],
            state_candidates=["state_name", "state"],
            lga_candidates=["lga_name", "lga", "local_government_area"],
            ward_candidates=["ward", "ward_name"],
            lat_candidates=["latitude", "lat", "y"],
            lon_candidates=["longitude", "lon", "lng", "x"],
            nhfr_candidates=["global_id", "id", "facility_code", "nhfr_id", "hfr_id"],
            level_candidates=["facility_level", "level"],
        )
        result.rows_read = len(rows)
        schema_errors = validate_rows(rows, "facility.schema.json")
        for error in schema_errors[:50]:
            result.error(f"schema: {error}")
        result.rows_accepted = len(rows) if not schema_errors else max(0, len(rows) - len(schema_errors))
        result.rows_rejected = len(rows) - result.rows_accepted
        csv_path = PROCESSED_DIR / "facilities_nhfr.csv"
        count = write_csv(csv_path, rows)
        result.add_output(csv_path, "csv", count)
        fct_rows = [
            row for row in rows
            if "fct" in str(row.get("state", "")).lower()
            or "abuja" in str(row.get("state", "")).lower()
        ]
        fct_path = PROCESSED_DIR / "facilities_nhfr_fct.csv"
        fct_count = write_csv(fct_path, fct_rows)
        result.add_output(fct_path, "csv", fct_count)
        result.metadata["facility_count"] = count
        result.metadata["fct_facility_count"] = fct_count
    except Exception as exc:  # noqa: BLE001
        result.error(str(exc))
        result.finish("failed")
    finally:
        hdx.close()
    write_ingest_run(result)
    return result


def _norm_state(value: Any) -> str:
    normalised = _norm(value)
    if "fct" in normalised or "abuja" in normalised or "capital" in normalised:
        return "fct"
    return normalised


def crosswalk() -> Path | None:
    """Exact-match crosswalk between GRID3 and the HDX NHFR snapshot.

    This is deliberately conservative: only exact normalised name + LGA + state
    matches are labelled. Fuzzy matching is a post-submission task.
    """
    grid_path = PROCESSED_DIR / "facilities_grid3.csv"
    nhfr_path = PROCESSED_DIR / "facilities_nhfr.csv"
    if not grid_path.exists() or not nhfr_path.exists():
        return None
    grid = pd.read_csv(grid_path, dtype=str).fillna("")
    nhfr = pd.read_csv(nhfr_path, dtype=str).fillna("")
    for frame in (grid, nhfr):
        frame["match_key"] = (
            frame["name"].map(_norm)
            + "|"
            + frame["state"].map(_norm_state)
            + "|"
            + frame["lga"].map(_norm)
        )
    nhfr_index = (
        nhfr.drop_duplicates(subset=["match_key"])
        .set_index("match_key")[["source_facility_id", "nhfr_id"]]
        .rename(columns={"source_facility_id": "nhfr_source_id", "nhfr_id": "nhfr_global_id"})
    )
    merged = grid.merge(nhfr_index, left_on="match_key", right_index=True, how="left")
    rows = []
    for _, row in merged.iterrows():
        matched = pd.notna(row.get("nhfr_source_id")) and str(row.get("nhfr_source_id")) != ""
        rows.append(
            {
                "grid3_id": row.get("source_facility_id"),
                "nhfr_id": row.get("nhfr_global_id") if matched else row.get("nhfr_id"),
                "match_key": row.get("match_key"),
                "name": row.get("name"),
                "state": row.get("state"),
                "lga": row.get("lga"),
                "match_confidence": 1.0 if matched else 0.0,
                "method": "exact_name_state_lga" if matched else "unmatched",
            }
        )
    path = PROCESSED_DIR / "facility_crosswalk.csv"
    write_csv(path, rows)
    return path
