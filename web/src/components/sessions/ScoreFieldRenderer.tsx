import { useEffect, useState } from "react";
import {
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import type { ReactNode } from "react";
import type { ScoringField } from "../../types/scoring";

interface Props {
  field: ScoringField;
  value: unknown;
  onChange: (value: unknown) => void;
}

interface NumericFieldProps {
  label: ReactNode;
  value: unknown;
  onChange: (value: number) => void;
  helperText?: ReactNode;
}

/**
 * Numeric score input that keeps a string editing buffer so partial entries
 * like a leading "-" survive while typing. Without the buffer, a controlled
 * number input coerces the intermediate "-" back to 0, making it impossible
 * to enter negative scores.
 */
function NumericField({ label, value, onChange, helperText }: NumericFieldProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const [text, setText] = useState(numericValue === 0 ? "" : String(numericValue));

  useEffect(() => {
    const parsed = text === "" || text === "-" ? 0 : Number(text);
    if (parsed !== numericValue) {
      setText(numericValue === 0 ? "" : String(numericValue));
    }
    // Only resync when the external value changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericValue]);

  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChange(raw === "" || raw === "-" ? 0 : Number(raw));
      }}
      helperText={helperText}
      fullWidth
    />
  );
}

export default function ScoreFieldRenderer({ field, value, onChange }: Props) {
  const label = field.description ? (
    <Tooltip title={field.description}>
      <span>{field.label}</span>
    </Tooltip>
  ) : (
    field.label
  );

  switch (field.type) {
    case "raw_score":
    case "numeric":
      return (
        <NumericField
          label={label}
          value={value}
          onChange={onChange}
          helperText={
            field.type === "numeric" && field.multiplier !== 1
              ? `x${field.multiplier}`
              : undefined
          }
        />
      );

    case "boolean":
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
          }
          label={
            <>
              {label}
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                ({field.value} pts)
              </Typography>
            </>
          }
        />
      );

    case "set_collection":
      return (
        <TextField
          label={label}
          type="number"
          size="small"
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          helperText={`Set size (max ${field.set_values.length - 1})`}
          slotProps={{
            htmlInput: { min: 0, max: field.set_values.length - 1 },
          }}
          fullWidth
        />
      );

    case "enum_count": {
      const counts = (value as Record<string, number>) ?? {};
      return (
        <Stack spacing={0.5}>
          <Typography variant="body2">{label}</Typography>
          {field.variants.map((v) => (
            <TextField
              key={v.id}
              label={`${v.label} (${v.value > 0 ? "+" : ""}${v.value} each)`}
              type="number"
              size="small"
              value={counts[v.id] ?? ""}
              onChange={(e) =>
                onChange({
                  ...counts,
                  [v.id]:
                    e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
            />
          ))}
        </Stack>
      );
    }
  }
}
