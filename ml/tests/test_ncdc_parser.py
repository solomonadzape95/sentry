from pathlib import Path

from aisec.ingest.ncdc import parse_report

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_ncdc_report_extracts_period_and_counts():
    text = (FIXTURES / "ncdc_sample.txt").read_text()
    rows, meta = parse_report(
        text,
        "https://ncdc.gov.ng/example.pdf",
        Path("data/raw/ncdc_wer/2026/w34.txt"),
    )

    assert meta.epi_year == 2026
    assert meta.epi_week == 34
    assert meta.period_start == "2026-08-17"
    assert meta.period_end == "2026-08-23"

    lassa = next(row for row in rows if row["disease"] == "LASSA_FEVER")
    assert lassa["suspected"] == 146
    assert lassa["confirmed"] == 21
    assert lassa["deaths"] == 1
    assert lassa["states_affected"] == 15  # 14 states + FCT
    assert lassa["lgas_affected"] == 37
    assert lassa["ytd_current_suspected"] == 7580

    csm = next(row for row in rows if row["disease"] == "MENINGITIS")
    assert csm["suspected"] == 0
    assert csm["confirmed"] == 0
    assert csm["deaths"] == 0
