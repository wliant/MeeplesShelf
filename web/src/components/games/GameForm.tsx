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
  CircularProgress,
  Rating,
  Tooltip,
  Autocomplete,
  Chip,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { Game, GameCreate, Tag } from "../../types/game";
import type { ScoringField } from "../../types/scoring";
import { listTags, createTag } from "../../api/tags";
import { useSnackbar } from "../../context/SnackbarContext";
import { extractErrorMessage } from "../../utils/errors";

interface Props {
  open: boolean;
  game: Game | null;
  onClose: () => void;
  onSave: (data: GameCreate) => void;
  saving?: boolean;
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

export default function GameForm({ open, game, onClose, onSave, saving = false }: Props) {
  const [name, setName] = useState("");
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState<ScoringField[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) {
      listTags().then(setAvailableTags).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (game) {
      setName(game.name);
      setMinPlayers(game.min_players);
      setMaxPlayers(game.max_players);
      setRating(game.rating);
      setNotes(game.notes ?? "");
      setFields(game.scoring_spec?.fields ?? []);
      setSelectedTags(game.tags ?? []);
    } else {
      setName("");
      setMinPlayers(1);
      setMaxPlayers(4);
      setRating(null);
      setNotes("");
      setFields([]);
      setSelectedTags([]);
    }
  }, [game, open]);

  const handleSubmit = () => {
    onSave({
      name,
      min_players: minPlayers,
      max_players: maxPlayers,
      scoring_spec:
        fields.length > 0 ? { version: 1, fields } : null,
      rating,
      notes: notes.trim() || null,
      tag_ids: selectedTags.map((t) => t.id),
    });
  };

  const handleTagChange = async (
    _event: React.SyntheticEvent,
    value: (Tag | string)[],
  ) => {
    const result: Tag[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) continue;
        // Check if it already exists (case-insensitive)
        const existing = availableTags.find(
          (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) {
          if (!result.some((r) => r.id === existing.id)) result.push(existing);
          continue;
        }
        try {
          const newTag = await createTag({ name: trimmed });
          setAvailableTags((prev) => [...prev, newTag]);
          result.push(newTag);
        } catch (err) {
          showSnackbar(extractErrorMessage(err), "error");
        }
      } else {
        result.push(item);
      }
    }
    setSelectedTags(result);
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
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
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

          <Box>
            <Typography variant="subtitle1" sx={{ pt: 1 }}>
              Rating
            </Typography>
            <Rating
              value={rating}
              max={10}
              onChange={(_event, newValue) => setRating(newValue)}
            />
          </Box>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            placeholder="Personal notes about this game..."
          />

          <Autocomplete
            multiple
            freeSolo
            options={availableTags}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name
            }
            value={selectedTags}
            onChange={handleTagChange}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderTags={(value, getTagProps) =>
              value.map((tag, index) => (
                <Chip
                  label={tag.name}
                  size="small"
                  {...getTagProps({ index })}
                  key={tag.id}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Type to search or create tags..."
              />
            )}
          />

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
                  <Tooltip title="Delete scoring field">
                    <IconButton
                      size="small"
                      aria-label={`Delete field ${field.label || field.id}`}
                      onClick={() => setFields(fields.filter((_, j) => j !== i))}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
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
                        <Tooltip title="Delete variant">
                          <IconButton
                            size="small"
                            aria-label={`Delete variant ${v.label}`}
                            onClick={() => {
                              const variants = field.variants.filter(
                                (_, j) => j !== vi
                              );
                              updateField(i, { ...field, variants });
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!name || saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : game ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
