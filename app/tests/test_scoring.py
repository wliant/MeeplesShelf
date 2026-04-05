import copy

import pytest

from app.services.scoring import calculate_total, merge_scoring_spec


# --- Fixtures ---

BASE_SPEC = {
    "version": 1,
    "fields": [
        {"id": "coins", "label": "Coins", "type": "raw_score"},
        {"id": "military", "label": "Military", "type": "numeric", "multiplier": 2},
        {"id": "longest_road", "label": "Longest Road", "type": "boolean", "value": 5},
    ],
}


# --- merge_scoring_spec tests ---


class TestMergeScoringSpec:
    def test_no_patches(self):
        result = merge_scoring_spec(BASE_SPEC, [])
        assert result["fields"] == BASE_SPEC["fields"]

    def test_none_patches(self):
        result = merge_scoring_spec(BASE_SPEC, [None, None])
        assert result["fields"] == BASE_SPEC["fields"]

    def test_empty_patch_fields(self):
        patch = {"version": 1, "fields": []}
        result = merge_scoring_spec(BASE_SPEC, [patch])
        assert result["fields"] == BASE_SPEC["fields"]

    def test_append_new_field(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "harbor", "label": "Harbor Bonus", "type": "raw_score"},
            ],
        }
        result = merge_scoring_spec(BASE_SPEC, [patch])
        assert len(result["fields"]) == 4
        assert result["fields"][3]["id"] == "harbor"
        assert result["fields"][3]["label"] == "Harbor Bonus"

    def test_override_existing_field(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "military", "label": "Military (Upgraded)", "type": "numeric", "multiplier": 3},
            ],
        }
        result = merge_scoring_spec(BASE_SPEC, [patch])
        assert len(result["fields"]) == 3
        military = next(f for f in result["fields"] if f["id"] == "military")
        assert military["multiplier"] == 3
        assert military["label"] == "Military (Upgraded)"

    def test_multiple_expansions_sequential(self):
        patch1 = {
            "version": 1,
            "fields": [
                {"id": "harbor", "label": "Harbor", "type": "raw_score"},
            ],
        }
        patch2 = {
            "version": 1,
            "fields": [
                {"id": "harbor", "label": "Harbor (v2)", "type": "numeric", "multiplier": 2},
            ],
        }
        result = merge_scoring_spec(BASE_SPEC, [patch1, patch2])
        assert len(result["fields"]) == 4
        harbor = next(f for f in result["fields"] if f["id"] == "harbor")
        assert harbor["label"] == "Harbor (v2)"
        assert harbor["type"] == "numeric"
        assert harbor["multiplier"] == 2

    def test_mixed_append_and_override(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "coins", "label": "Gold Coins", "type": "raw_score"},
                {"id": "trade", "label": "Trade Routes", "type": "raw_score"},
            ],
        }
        result = merge_scoring_spec(BASE_SPEC, [patch])
        assert len(result["fields"]) == 4
        coins = result["fields"][0]
        assert coins["label"] == "Gold Coins"
        assert result["fields"][3]["id"] == "trade"

    def test_does_not_mutate_base(self):
        original = copy.deepcopy(BASE_SPEC)
        patch = {
            "version": 1,
            "fields": [
                {"id": "coins", "label": "Modified", "type": "raw_score"},
                {"id": "new_field", "label": "New", "type": "raw_score"},
            ],
        }
        merge_scoring_spec(BASE_SPEC, [patch])
        assert BASE_SPEC == original

    def test_preserves_version(self):
        spec = {"version": 42, "fields": [{"id": "a", "label": "A", "type": "raw_score"}]}
        patch = {"version": 1, "fields": [{"id": "b", "label": "B", "type": "raw_score"}]}
        result = merge_scoring_spec(spec, [patch])
        assert result["version"] == 42


# --- calculate_total with merged specs ---


class TestCalculateTotalWithMerge:
    def test_total_with_appended_field(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "harbor", "label": "Harbor", "type": "raw_score"},
            ],
        }
        merged = merge_scoring_spec(BASE_SPEC, [patch])
        score_data = {"coins": 10, "military": 3, "longest_road": True, "harbor": 7}
        total = calculate_total(merged, score_data)
        # 10 + (3*2) + 5 + 7 = 28
        assert total == 28

    def test_total_with_overridden_multiplier(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "military", "label": "Military", "type": "numeric", "multiplier": 5},
            ],
        }
        merged = merge_scoring_spec(BASE_SPEC, [patch])
        score_data = {"coins": 10, "military": 3, "longest_road": False}
        total = calculate_total(merged, score_data)
        # 10 + (3*5) + 0 = 25
        assert total == 25

    def test_missing_score_data_for_expansion_field(self):
        patch = {
            "version": 1,
            "fields": [
                {"id": "harbor", "label": "Harbor", "type": "raw_score"},
            ],
        }
        merged = merge_scoring_spec(BASE_SPEC, [patch])
        score_data = {"coins": 10, "military": 3, "longest_road": True}
        total = calculate_total(merged, score_data)
        # 10 + (3*2) + 5 + 0 = 21
        assert total == 21

    def test_total_without_expansion_ignores_extra_data(self):
        score_data = {"coins": 10, "military": 3, "longest_road": True, "harbor": 7}
        total = calculate_total(BASE_SPEC, score_data)
        # 10 + (3*2) + 5 = 21  (harbor ignored since not in spec)
        assert total == 21
