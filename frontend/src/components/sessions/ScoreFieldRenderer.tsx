import {
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import { ScoringField } from "../../types/scoring";

interface Props {
  field: ScoringField;
  value: unknown;
  onChange: (value: unknown) => void;
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
        <TextField
          label={label}
          type="number"
          size="small"
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          helperText={
            field.type === "numeric" && field.multiplier !== 1
              ? `x${field.multiplier}`
              : undefined
          }
          fullWidth
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
