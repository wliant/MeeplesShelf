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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { Game, GameCreate, CollectionStatus, GameType, GameCondition } from "../../types/game";
import { Rating } from "@mui/material";
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

const STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: "owned", label: "Owned" },
  { value: "wishlist", label: "Wishlist" },
  { value: "want_to_play", label: "Want to Play" },
  { value: "previously_owned", label: "Previously Owned" },
  { value: "want_to_trade", label: "Want to Trade" },
  { value: "for_trade", label: "For Trade" },
  { value: "preordered", label: "Preordered" },
];

const GAME_TYPE_OPTIONS: { value: GameType; label: string }[] = [
  { value: "base_game", label: "Base Game" },
  { value: "expansion", label: "Expansion" },
  { value: "reimplementation", label: "Reimplementation" },
  { value: "standalone_expansion", label: "Standalone Expansion" },
];

const CONDITION_OPTIONS: { value: GameCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
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

  // Metadata
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [minPlaytime, setMinPlaytime] = useState<number | "">("");
  const [maxPlaytime, setMaxPlaytime] = useState<number | "">("");
  const [minAge, setMinAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [yearPublished, setYearPublished] = useState<number | "">("");
  const [collectionStatus, setCollectionStatus] =
    useState<CollectionStatus>("owned");
  const [gameType, setGameType] = useState<GameType>("base_game");
  const [userRating, setUserRating] = useState<number | null>(null);
  const [shelfLocation, setShelfLocation] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionPrice, setAcquisitionPrice] = useState<number | "">("");
  const [condition, setCondition] = useState<GameCondition | "">("");
  const [lentTo, setLentTo] = useState("");
  const [designerNames, setDesignerNames] = useState("");
  const [publisherNames, setPublisherNames] = useState("");
  const [categoryNames, setCategoryNames] = useState("");
  const [mechanicNames, setMechanicNames] = useState("");

  useEffect(() => {
    if (game) {
      setName(game.name);
      setMinPlayers(game.min_players);
      setMaxPlayers(game.max_players);
      setFields(game.scoring_spec?.fields ?? []);
      setDescription(game.description ?? "");
      setImageUrl(game.image_url ?? "");
      setMinPlaytime(game.min_playtime ?? "");
      setMaxPlaytime(game.max_playtime ?? "");
      setMinAge(game.min_age ?? "");
      setWeight(game.weight ?? "");
      setYearPublished(game.year_published ?? "");
      setCollectionStatus(game.collection_status);
      setGameType(game.game_type ?? "base_game");
      setUserRating(game.user_rating);
      setShelfLocation(game.shelf_location ?? "");
      setAcquisitionDate(game.acquisition_date ?? "");
      setAcquisitionPrice(game.acquisition_price ?? "");
      setCondition((game.condition as GameCondition) ?? "");
      setLentTo(game.lent_to ?? "");
      setDesignerNames(game.designers.map((d) => d.name).join(", "));
      setPublisherNames(game.publishers.map((p) => p.name).join(", "));
      setCategoryNames(game.categories.map((c) => c.name).join(", "));
      setMechanicNames(game.mechanics.map((m) => m.name).join(", "));
    } else {
      setName("");
      setMinPlayers(1);
      setMaxPlayers(4);
      setFields([]);
      setDescription("");
      setImageUrl("");
      setMinPlaytime("");
      setMaxPlaytime("");
      setMinAge("");
      setWeight("");
      setYearPublished("");
      setCollectionStatus("owned");
      setGameType("base_game");
      setUserRating(null);
      setShelfLocation("");
      setAcquisitionDate("");
      setAcquisitionPrice("");
      setCondition("");
      setLentTo("");
      setDesignerNames("");
      setPublisherNames("");
      setCategoryNames("");
      setMechanicNames("");
    }
  }, [game, open]);

  const splitNames = (s: string) =>
    s
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

  const handleSubmit = () => {
    onSave({
      name,
      min_players: minPlayers,
      max_players: maxPlayers,
      scoring_spec: fields.length > 0 ? { version: 1, fields } : null,
      description: description || null,
      image_url: imageUrl || null,
      thumbnail_url: imageUrl || null,
      min_playtime: minPlaytime || null,
      max_playtime: maxPlaytime || null,
      min_age: minAge || null,
      weight: weight || null,
      year_published: yearPublished || null,
      game_type: gameType,
      collection_status: collectionStatus,
      user_rating: userRating,
      shelf_location: shelfLocation || null,
      acquisition_date: acquisitionDate || null,
      acquisition_price: acquisitionPrice || null,
      condition: condition || null,
      lent_to: lentTo || null,
      designer_names: splitNames(designerNames),
      publisher_names: splitNames(publisherNames),
      category_names: splitNames(categoryNames),
      mechanic_names: splitNames(mechanicNames),
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
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={collectionStatus}
                label="Status"
                onChange={(e) =>
                  setCollectionStatus(e.target.value as CollectionStatus)
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Game Type</InputLabel>
              <Select
                value={gameType}
                label="Game Type"
                onChange={(e) => setGameType(e.target.value as GameType)}
              >
                {GAME_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">My Rating:</Typography>
            <Rating
              value={userRating ? userRating / 2 : null}
              precision={0.5}
              onChange={(_, v) => setUserRating(v ? v * 2 : null)}
              max={5}
            />
            {userRating != null && (
              <Typography variant="body2" color="text.secondary">
                {userRating.toFixed(1)}/10
              </Typography>
            )}
          </Stack>

          <Accordion variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Game Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  label="Description"
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <TextField
                  label="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Min Playtime (min)"
                    type="number"
                    value={minPlaytime}
                    onChange={(e) =>
                      setMinPlaytime(e.target.value ? Number(e.target.value) : "")
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Max Playtime (min)"
                    type="number"
                    value={maxPlaytime}
                    onChange={(e) =>
                      setMaxPlaytime(e.target.value ? Number(e.target.value) : "")
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Min Age"
                    type="number"
                    value={minAge}
                    onChange={(e) =>
                      setMinAge(e.target.value ? Number(e.target.value) : "")
                    }
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Weight (1-5)"
                    type="number"
                    value={weight}
                    onChange={(e) =>
                      setWeight(e.target.value ? Number(e.target.value) : "")
                    }
                    slotProps={{ htmlInput: { min: 1, max: 5, step: 0.1 } }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Year Published"
                    type="number"
                    value={yearPublished}
                    onChange={(e) =>
                      setYearPublished(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <TextField
                  label="Designers (comma-separated)"
                  value={designerNames}
                  onChange={(e) => setDesignerNames(e.target.value)}
                />
                <TextField
                  label="Publishers (comma-separated)"
                  value={publisherNames}
                  onChange={(e) => setPublisherNames(e.target.value)}
                />
                <TextField
                  label="Categories (comma-separated)"
                  value={categoryNames}
                  onChange={(e) => setCategoryNames(e.target.value)}
                />
                <TextField
                  label="Mechanics (comma-separated)"
                  value={mechanicNames}
                  onChange={(e) => setMechanicNames(e.target.value)}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Collection Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  label="Shelf Location"
                  placeholder="e.g. Shelf A, Living Room"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Acquisition Date"
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Acquisition Price"
                    type="number"
                    value={acquisitionPrice}
                    onChange={(e) =>
                      setAcquisitionPrice(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={condition}
                      label="Condition"
                      onChange={(e) =>
                        setCondition(e.target.value as GameCondition | "")
                      }
                    >
                      <MenuItem value="">None</MenuItem>
                      {CONDITION_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Lent To"
                    placeholder="e.g. Friend's name"
                    value={lentTo}
                    onChange={(e) => setLentTo(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Typography variant="subtitle1" sx={{ pt: 1 }}>
            Scoring Specification
          </Typography>

          {fields.map((field, i) => (
            <Box
              key={i}
              sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}
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
