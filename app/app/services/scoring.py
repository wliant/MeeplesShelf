import copy
import logging
from typing import Any

logger = logging.getLogger(__name__)


def merge_scoring_spec(
    base_spec: dict,
    patches: list[dict | None],
) -> dict:
    """Merge expansion scoring_spec_patch dicts into a base scoring spec.

    Patch semantics:
    - If a patch field has the same ``id`` as a base field, it replaces that field.
    - If a patch field has a new ``id``, it is appended.
    - Multiple patches are applied sequentially in list order.
    """
    merged_fields: list[dict] = copy.deepcopy(base_spec.get("fields", []))

    for patch in patches:
        if patch is None:
            continue
        patch_fields = patch.get("fields", [])
        if not patch_fields:
            continue

        logger.info("Applying scoring patch with %d field(s)", len(patch_fields))

        for pf in patch_fields:
            pid = pf["id"]
            existing_idx = next(
                (i for i, f in enumerate(merged_fields) if f["id"] == pid),
                None,
            )
            if existing_idx is not None:
                logger.debug("Overriding field '%s'", pid)
                merged_fields[existing_idx] = copy.deepcopy(pf)
            else:
                logger.debug("Appending new field '%s'", pid)
                merged_fields.append(copy.deepcopy(pf))

    return {**base_spec, "fields": merged_fields}


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
