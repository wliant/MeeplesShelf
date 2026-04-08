import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Stack,
  Collapse,
  Box,
  Rating,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoCamera as PhotoCameraIcon,
  PlaylistAdd as PlaylistAddIcon,
  Close as RemoveImageIcon,
} from "@mui/icons-material";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import type { Game } from "../../types/game";
import type { ScoringField } from "../../types/scoring";
import MeepleIcon from "../common/MeepleIcon";
import { formatLastPlayed } from "../../utils/stats";
import { uploadGameImage, deleteGameImage } from "../../api/games";
import { useSnackbar } from "../../context/SnackbarContext";
import { extractErrorMessage } from "../../utils/errors";
import ExpansionList from "./ExpansionList";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface Props {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

function nameHue(name: string): number {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

function scoringFieldLabel(field: ScoringField): string {
  switch (field.type) {
    case "numeric": return `${field.label} (x${field.multiplier})`;
    case "boolean": return `${field.label} (+${field.value})`;
    case "enum_count": return `${field.label} (${field.variants.length} types)`;
    case "set_collection": return `${field.label} (set)`;
    default: return field.label;
  }
}

export default function GameCard({ game, onEdit, onDelete, onRefresh, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSnackbar } = useSnackbar();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      showSnackbar("Unsupported file type. Allowed: JPEG, PNG, WebP", "error");
      return;
    }
    if (file.size > MAX_SIZE) {
      showSnackbar("File too large. Maximum size: 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      await uploadGameImage(game.id, file);
      showSnackbar("Image uploaded", "success");
      onRefresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    try {
      await deleteGameImage(game.id);
      showSnackbar("Image removed", "success");
      onRefresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <Box sx={{ position: "relative" }}>
        {game.image_url ? (
          <CardMedia
            component="img"
            height="180"
            image={game.image_url}
            alt={`${game.name} cover`}
            sx={{ objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              bgcolor: `hsl(${nameHue(game.name)}, 40%, ${theme.palette.mode === "dark" ? 25 : 85}%)`,
            }}
          >
            <MeepleIcon sx={{ fontSize: 80, position: "absolute", opacity: 0.15 }} />
            <Typography variant="h2" sx={{ fontWeight: 700, opacity: 0.6, zIndex: 1 }}>
              {game.name.charAt(0).toUpperCase()}
            </Typography>
          </Box>
        )}
        {uploading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.6)",
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {isAdmin && !uploading && (
          <>
            <Tooltip title="Upload image">
              <IconButton
                size="small"
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "rgba(255,255,255,0.8)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
                }}
                onClick={() => fileInputRef.current?.click()}
                aria-label={`Upload image for ${game.name}`}
              >
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {game.image_url && (
              <Tooltip title="Remove image">
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 44,
                    bgcolor: "rgba(255,255,255,0.8)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
                  }}
                  onClick={handleRemoveImage}
                  aria-label={`Remove image for ${game.name}`}
                >
                  <RemoveImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileSelect}
        />
      </Box>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {game.name}
        </Typography>
        {game.rating !== null && (
          <Rating value={game.rating} max={10} readOnly size="small" sx={{ mb: 1 }} />
        )}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip
            label={`${game.min_players}-${game.max_players} players`}
            size="small"
          />
          {game.scoring_spec && (
            <Chip
              label={`${game.scoring_spec.fields.length} scoring fields`}
              size="small"
              color="primary"
            />
          )}
          {game.expansions.length > 0 && (
            <Chip
              label={`${game.expansions.length} expansion${game.expansions.length > 1 ? "s" : ""}`}
              size="small"
              color="secondary"
            />
          )}
        </Stack>
        {game.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {game.tags.map((tag) => (
              <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {game.session_count > 0
            ? `Played ${game.session_count} time${game.session_count !== 1 ? "s" : ""} · Last: ${formatLastPlayed(game.last_played_at)}`
            : "Never played"}
        </Typography>
      </CardContent>
      <CardActions>
        {isAdmin && (
          <Tooltip title="Log session">
            <IconButton size="small" aria-label={`Log session for ${game.name}`} onClick={() => navigate(`/sessions?quicklog=${game.id}`)}>
              <PlaylistAddIcon />
            </IconButton>
          </Tooltip>
        )}
        {isAdmin && (
          <Tooltip title="Edit game">
            <IconButton size="small" aria-label={`Edit ${game.name}`} onClick={() => onEdit(game)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
        {isAdmin && (
          <Tooltip title="Delete game">
            <IconButton size="small" aria-label={`Delete ${game.name}`} onClick={() => onDelete(game)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={expanded ? "Hide details" : "Show details"}>
          <IconButton
            size="small"
            aria-label={expanded ? "Hide details" : "Show details"}
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          {game.notes && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {game.notes}
              </Typography>
            </Box>
          )}
          <ExpansionList game={game} onRefresh={onRefresh} isAdmin={isAdmin} />
          {game.scoring_spec && game.scoring_spec.fields.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Scoring Categories
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {game.scoring_spec.fields.map((field) => (
                  <Chip key={field.id} label={scoringFieldLabel(field)} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}
