from pathlib import Path

from aisec.ingest.neml import parse_medicines

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_neml_dosage_table():
    text = (FIXTURES / "neml_sample.txt").read_text()
    rows = parse_medicines(text)
    names = {row["name"] for row in rows}
    assert "Ketamine" in names
    assert "Artemether + Lumefantrine" in names
    assert "Oral Rehydration Salts" in names
    assert all(row["source_id"] == "neml_2024" for row in rows)
