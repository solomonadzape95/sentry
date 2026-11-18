"""CLI: python -m aisec.ingest <command>."""

from __future__ import annotations

import argparse
import json

from . import grid3, ncdc, neml, nmis
from .base import PROCESSED_DIR, write_json


def _print_result(result) -> None:
    payload = result.to_dict()
    print(
        json.dumps(
            {
                "source_id": payload["source_id"],
                "status": payload["status"],
                "rows_read": payload["rows_read"],
                "rows_accepted": payload["rows_accepted"],
                "rows_rejected": payload["rows_rejected"],
                "date_min": payload["date_min"],
                "date_max": payload["date_max"],
                "outputs": [output["path"] for output in payload["outputs"]],
                "warnings": payload["warnings"][:8],
                "errors": payload["errors"][:8],
            },
            indent=2,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Cheta public data ingestion")
    sub = parser.add_subparsers(dest="command", required=True)

    ncdc_parser = sub.add_parser("ncdc", help="Scrape NCDC Weekly Epidemiological Reports")
    ncdc_parser.add_argument("--from-year", type=int, default=2023)
    ncdc_parser.add_argument("--to-year", type=int, default=None)
    ncdc_parser.add_argument("--limit", type=int, default=None)
    ncdc_parser.add_argument("--refresh", action="store_true")

    grid_parser = sub.add_parser("grid3", help="Download GRID3 + HDX NHFR facilities")
    grid_parser.add_argument("--limit", type=int, default=None)
    grid_parser.add_argument("--refresh", action="store_true")
    grid_parser.add_argument("--skip-nhfr", action="store_true")

    nmis_parser = sub.add_parser("nmis", help="Parse NMIS 2021 malaria prevalence")
    nmis_parser.add_argument("--refresh", action="store_true")

    neml_parser = sub.add_parser("neml", help="Parse the NEML 2024 medicine catalogue")
    neml_parser.add_argument("--refresh", action="store_true")

    all_parser = sub.add_parser("all", help="Run every public source")
    all_parser.add_argument("--from-year", type=int, default=2023)
    all_parser.add_argument("--to-year", type=int, default=None)
    all_parser.add_argument("--limit", type=int, default=None)
    all_parser.add_argument("--refresh", action="store_true")

    args = parser.parse_args()
    results = []

    if args.command in ("ncdc", "all"):
        results.append(
            ncdc.run(
                from_year=args.from_year,
                to_year=getattr(args, "to_year", None),
                limit=args.limit,
                refresh=args.refresh,
            )
        )

    if args.command in ("grid3", "all"):
        results.append(grid3.run(limit=args.limit, refresh=args.refresh))
        if not getattr(args, "skip_nhfr", False):
            results.append(grid3.run_nhfr(limit=args.limit, refresh=args.refresh))
        crosswalk_path = grid3.crosswalk()
        if crosswalk_path:
            print(f"crosswalk: {crosswalk_path}")

    if args.command in ("nmis", "all"):
        results.append(nmis.run(refresh=args.refresh))

    if args.command in ("neml", "all"):
        results.append(neml.run(refresh=args.refresh))

    for result in results:
        _print_result(result)

    summary = [result.to_dict() for result in results]
    write_json(PROCESSED_DIR / "last_ingest.json", summary)
    failed = [result for result in results if result.status == "failed"]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
