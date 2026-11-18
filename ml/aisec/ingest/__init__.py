"""Real-data ingestion for Cheta.

Public sources only. Credentialed sources (NHFR API, DHIS2, NHLMIS) are
documented in docs/DATA_SOURCES.md and must not be bypassed.
"""

from .base import (
    DATA_DIR,
    PROCESSED_DIR,
    RAW_DIR,
    IngestResult,
    write_ingest_run,
)
from .http import HttpClient
from .hdx import HDXClient

__all__ = [
    "DATA_DIR",
    "PROCESSED_DIR",
    "RAW_DIR",
    "IngestResult",
    "write_ingest_run",
    "HttpClient",
    "HDXClient",
]
