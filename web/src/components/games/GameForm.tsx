import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { Game, GameCreate } from "../../types/game";
import type { ScoringField } from "../../types/scoring";

interface Props {
  open: boolean;
  game: Game | null;
  onClose: () => void;
  onSave: (data: GameCreate) => void;
}

const FIELD_TYPE_OPTIONS = [
  { value: "raw_score", label: "Raw Score" },
  { value: "numeric", label: "Numeric (with multiplier)" },
  { value: "boolean", label: "Boolean (checkbox)" },
  { value: "enum_count", label: "Enum Count (variants)" },
  { value: "set_collection", label: "Set Collection (lookup table)" },
];

function emptyField(type: string): ScoringField {
  switch (type) {
    case "numeric":
      return { id: "", label: "", type: "numeric", multiplier: 1 };
    case "boolean":
      return { id: "", label: "", type: "boolean", value: 2 };
    case "enum_count":
      return {
        id: "",
        label: "",
        type: "enum_count",
        variants: [{ id: "", label: "", value: 1 }],
      };
    case "set_collection":
      return { id: "", label: "", type: "set_collection", set_values: [0] };
    default:
      return { id: "", label: "", type: "raw_score" };
  }
}

export default function GameForm({ open, game, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [fields, setFields] = useState<ScoringField[]>([]);

  useEffect(() => {
    if (game) {
      setName(game.name);
      setMinPlayers(game.min_players);
      setMaxPlayers(game.max_players);
      setFields(game.scoring_spec?.fields ?? []);
    } else {
      setName("");
      setMinPlayers(1);
      setMaxPlayers(4);
      setFields([]);
    }
  }, [game, open]);

  const handleSubmit = () => {
    onSave({
      name,
      min_players: minPlayers,
      max_players: maxPlayers,
      scoring_spec:
        fields.length > 0 ? { version: 1, fields } : null,
    });
  };

  const updateField = (index: number, updated: ScoringField) => {
    const next = [...fields];
    next[index] = updated;
    setFields(next);
  };

  const changeFieldType = (index: number, newType: string) => {
    const old = fields[index];
    const next = [...fields];
    const f = emptyField(newType);
    f.id = old.id;
    f.label = old.label;
    f.description = old.description;
    next[index] = f;
    setFields(next);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{game ? "Edit Game" : "Add Game"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Game Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Min Players"
              type="number"
              value={minPlayers}
              onChange={(e) => setMinPlayers(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Max Players"
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Stack>

          <Typography variant="subtitle1" sx={{ pt: 1 }}>
            Scoring Specification
          </Typography>

          {fields.map((field, i) => (
            <Box
              key={i}
              sx={{ p: 2, border: "1px solid #ddd", borderRadius: 1 }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    label="Field ID"
                    value={field.id}
                    onChange={(e) =>
                      updateField(i, { ...field, id: e.target.value })
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Label"
                    value={field.label}
                    onChange={(e) =>
                      updateField(i, { ...field, label: e.target.value })
                    }
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={field.type}
                      label="Type"
                      onChange={(e) => changeFieldType(i, e.target.value)}
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() => setFields(fields.filter((_, j) => j !== i))}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>

                {field.type === "numeric" && (
                  <TextField
                    size="small"
                    label="Multiplier"
                    type="number"
                    value={field.multiplier}
                    onChange={(e) =>
                      updateField(i, {
                        ...field,
                        multiplier: Number(e.target.value),
                      })
                    }
                    sx={{ width: 120 }}
                  />
                )}

                {field.type === "boolean" && (
                  <TextField
                    size="small"
                    label="Points when true"
                    type="number"
                    value={field.value}
                    onChange={(e) =>
                      updateField(i, {
                        ...field,
                        value: Number(e.target.value),
                      })
                    }
                    sx={{ width: 150 }}
                  />
                )}

                {field.type === "enum_count" && (
                  <Box>
                    <Typography variant="caption">Variants</Typography>
                    {field.variants.map((v, vi) => (
                      <Stack
                        key={vi}
                        direction="row"
                        spacing={1}
                        sx={{ mt: 0.5 }}
                      >
                        <TextField
                          size="small"
                          label="ID"
                          value={v.id}
                          onChange={(e) => {
                            const variants = [...field.variants];
                            variants[vi] = { ...v, id: e.target.value };
                            updateField(i, { ...field, variants });
                          }}
                        />
                        <TextField
                          size="small"
                          label="Label"
                          value={v.label}
                          onChange={(e) => {
                            const variants = [...field.variants];
                            variants[vi] = { ...v, label: e.target.value };
                            updateField(i, { ...field, variants });
                          }}
                        />
                        <TextField
                          size="small"
                          label="Value"
                          type="number"
                          value={v.value}
                          onChange={(e) => {
                            const variants = [...field.variants];
                            variants[vi] = {
                              ...v,
                              value: Number(e.target.value),
                            };
                            updateField(i, { ...field, variants });
                          }}
                          sx={{ width: 80 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const variants = field.variants.filter(
                              (_, j) => j !== vi
                            );
                            updateField(i, { ...field, variants });
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button
                      size="small"
                      onClick={() =>
                        updateField(i, {
                          ...field,
                          variants: [
                            ...field.variants,
                            { id: "", label: "", value: 1 },
                          ],
                        })
                      }
                    >
                      + Variant
                    </Button>
                  </Box>
                )}

                {field.type === "set_collection" && (
                  <TextField
                    size="small"
                    label="Set values (comma-separated)"
                    value={field.set_values.join(", ")}
                    onChange={(e) =>
                      updateField(i, {
                        ...field,
                        set_values: e.target.value
                          .split(",")
                          .map((s) => Number(s.trim()) || 0),
                      })
                    }
                    fullWidth
                    helperText="Point values indexed by set size (e.g. 0, 1, 6, 15, 28)"
                  />
                )}

                <TextField
                  size="small"
                  label="Description (optional)"
                  value={field.description ?? ""}
                  onChange={(e) =>
                    updateField(i, {
                      ...field,
                      description: e.target.value || undefined,
                    } as ScoringField)
                  }
                  fullWidth
                />
              </Stack>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={() => setFields([...fields, emptyField("raw_score")])}
          >
            Add Scoring Field
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!name}>
          {game ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
