from app.services.scoring import calculate_total


def test_raw_score():
    spec = {"fields": [{"id": "pts", "type": "raw_score"}]}
    assert calculate_total(spec, {"pts": 42}) == 42


def test_raw_score_missing():
    spec = {"fields": [{"id": "pts", "type": "raw_score"}]}
    assert calculate_total(spec, {}) == 0


def test_numeric_with_multiplier():
    spec = {"fields": [{"id": "cities", "type": "numeric", "multiplier": 3}]}
    assert calculate_total(spec, {"cities": 5}) == 15


def test_boolean_true():
    spec = {"fields": [{"id": "road", "type": "boolean", "value": 2}]}
    assert calculate_total(spec, {"road": True}) == 2


def test_boolean_false():
    spec = {"fields": [{"id": "road", "type": "boolean", "value": 2}]}
    assert calculate_total(spec, {"road": False}) == 0


def test_set_collection():
    spec = {
        "fields": [
            {"id": "goods", "type": "set_collection", "set_values": [0, 1, 6, 15, 28]}
        ]
    }
    assert calculate_total(spec, {"goods": 3}) == 15


def test_set_collection_clamps():
    spec = {
        "fields": [
            {"id": "goods", "type": "set_collection", "set_values": [0, 1, 6]}
        ]
    }
    assert calculate_total(spec, {"goods": 99}) == 6


def test_enum_count():
    spec = {
        "fields": [
            {
                "id": "vp",
                "type": "enum_count",
                "variants": [
                    {"id": "estates", "value": 1},
                    {"id": "duchies", "value": 3},
                ],
            }
        ]
    }
    assert calculate_total(spec, {"vp": {"estates": 3, "duchies": 2}}) == 9


def test_empty_spec():
    assert calculate_total({}, {}) == 0
    assert calculate_total({"fields": []}, {"anything": 5}) == 0


def test_multiple_fields():
    spec = {
        "fields": [
            {"id": "coins", "type": "raw_score"},
            {"id": "palaces", "type": "numeric", "multiplier": 5},
            {"id": "road", "type": "boolean", "value": 2},
        ]
    }
    assert calculate_total(spec, {"coins": 10, "palaces": 3, "road": True}) == 27
