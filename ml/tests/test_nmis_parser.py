from pathlib import Path

from aisec.ingest.nmis import parse_prevalence

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_nmis_state_table():
    text = (FIXTURES / "nmis_sample.txt").read_text()
    rows = parse_prevalence(text)

    by_state = {row["state"]: row for row in rows}
    assert by_state["FCT Abuja"]["rdt_positive_pct"] == 34.6
    assert by_state["FCT Abuja"]["microscopy_positive_pct"] == 18.8
    assert by_state["FCT Abuja"]["rdt_sample"] == 171
    assert by_state["Benue"]["rdt_positive_pct"] == 34.0
    assert by_state["NG"]["rdt_positive_pct"] == 39.6
    assert by_state["NG"]["rdt_sample"] == 11103
