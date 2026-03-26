from typing import Any


def calculate_total(spec: dict, score_data: dict[str, Any]) -> int:
    total = 0
    for field in spec.get("fields", []):
        fid = field["id"]
        raw = score_data.get(fid, 0)

        ftype = field["type"]
        if ftype == "raw_score":
            total += int(raw or 0)

        elif ftype == "numeric":
            total += int(raw or 0) * field.get("multiplier", 1)

        elif ftype == "boolean":
            total += field["value"] if raw else 0

        elif ftype == "set_collection":
            idx = int(raw or 0)
            values = field["set_values"]
            total += values[min(idx, len(values) - 1)] if values else 0

        elif ftype == "enum_count":
            if isinstance(raw, dict):
                for variant in field["variants"]:
                    count = raw.get(variant["id"], 0)
                    total += int(count) * variant["value"]

    return total
