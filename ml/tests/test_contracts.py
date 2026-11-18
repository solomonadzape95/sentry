from aisec.ingest.base import validate_rows


def test_disease_contract_accepts_valid_row():
    row = {
        "source_id": "ncdc_wer",
        "disease": "CHOLERA",
        "state": "NG",
        "period_start": "2026-08-17",
        "period_end": "2026-08-23",
        "suspected": 154,
        "confirmed": 125,
        "deaths": 3,
        "source_url": "https://ncdc.gov.ng/reports/weekly",
    }
    assert validate_rows([row], "disease_observation.schema.json") == []


def test_disease_contract_rejects_negative_counts():
    row = {
        "source_id": "ncdc_wer",
        "disease": "CHOLERA",
        "period_start": "2026-08-17",
        "period_end": "2026-08-23",
        "suspected": -1,
        "confirmed": 0,
        "deaths": 0,
        "source_url": "https://ncdc.gov.ng/reports/weekly",
    }
    errors = validate_rows([row], "disease_observation.schema.json")
    assert errors
