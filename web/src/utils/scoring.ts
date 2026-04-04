import type { ScoringSpec } from "../types/scoring";

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
