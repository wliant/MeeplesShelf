import type { ScoringSpec, ScoringField } from "../types/scoring";

/**
 * Merge expansion scoring_spec_patch objects into a base scoring spec.
 *
 * Patch semantics:
 * - If a patch field has the same `id` as a base field, it replaces that field.
 * - If a patch field has a new `id`, it is appended.
 * - Multiple patches are applied sequentially in list order.
 */
export function mergeScoringSpec(
  baseSpec: ScoringSpec,
  patches: (ScoringSpec | null)[],
): ScoringSpec {
  let mergedFields: ScoringField[] = baseSpec.fields.map((f) => ({ ...f }));

  for (const patch of patches) {
    if (!patch || patch.fields.length === 0) continue;

    for (const pf of patch.fields) {
      const existingIdx = mergedFields.findIndex((f) => f.id === pf.id);
      if (existingIdx !== -1) {
        mergedFields[existingIdx] = { ...pf };
      } else {
        mergedFields = [...mergedFields, { ...pf }];
      }
    }
  }

  return { ...baseSpec, fields: mergedFields };
}

export function calculateTotal(
  spec: ScoringSpec,
  scoreData: Record<string, unknown>
): number {
  let total = 0;

  for (const field of spec.fields) {
    const raw = scoreData[field.id];

    switch (field.type) {
      case "raw_score":
        total += Number(raw) || 0;
        break;

      case "numeric":
        total += (Number(raw) || 0) * field.multiplier;
        break;

      case "boolean":
        total += raw ? field.value : 0;
        break;

      case "set_collection": {
        const idx = Number(raw) || 0;
        const values = field.set_values;
        total += values[Math.min(idx, values.length - 1)] ?? 0;
        break;
      }

      case "enum_count": {
        if (raw && typeof raw === "object") {
          const counts = raw as Record<string, number>;
          for (const variant of field.variants) {
            total += (Number(counts[variant.id]) || 0) * variant.value;
          }
        }
        break;
      }
    }
  }

  return total;
}
