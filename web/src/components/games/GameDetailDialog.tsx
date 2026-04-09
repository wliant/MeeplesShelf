import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { Game } from "../../types/game";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { setGameRating } from "../../api/games";
import { formatLastPlayed } from "../../utils/stats";
import MeepleIcon from "../common/MeepleIcon";

function nameHue(name: string): number {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

interface Props {
  open: boolean;
  game: Game | null;
  onClose: () => void;
  onRatingChange?: () => void;
}

export default function GameDetailDialog({ open, game, onClose, onRatingChange }: Props) {
  const { playerId } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();

  if (!game) return null;

  const handleRatingChange = async (_: React.SyntheticEvent, value: number | null) => {
    if (!playerId || !value) return;
    try {
      await setGameRating(game.id, value);
      showSnackbar("Rating saved", "success");
      onRatingChange?.();
    } catch {
      showSnackbar("Failed to save rating", "error");
    }
  };

  const hue = nameHue(game.name);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          {game.image_url ? (
            <Box
              component="img"
              src={game.image_url}
              alt={game.name}
              sx={{ width: 64, height: 64, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 1,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `hsl(${hue}, 40%, ${theme.palette.mode === "dark" ? 25 : 85}%)`,
              }}
            >
              <MeepleIcon sx={{ fontSize: 32, opacity: 0.3 }} />
            </Box>
          )}
          <Box>
            <Typography variant="h6">{game.name}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip label={`${game.min_players}-${game.max_players} players`} size="small" />
              {game.expansions.length > 0 && (
                <Chip
                  label={`${game.expansions.length} expansion${game.expansions.length > 1 ? "s" : ""}`}
                  size="small"
                  color="secondary"
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Tags */}
          {game.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {game.tags.map((tag) => (
                <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
              ))}
            </Stack>
          )}

          {/* Session stats */}
          <Typography variant="body2" color="text.secondary">
            {game.session_count > 0
              ? `Played ${game.session_count} time${game.session_count > 1 ? "s" : ""} \u00B7 Last: ${formatLastPlayed(game.last_played_at)}`
              : "Never played"}
          </Typography>

          {/* Rating */}
          <Box>
            {game.average_rating !== null && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating value={game.average_rating} max={10} readOnly size="small" precision={0.5} />
                <Typography variant="body2" color="text.secondary">
                  {game.average_rating.toFixed(1)} ({game.rating_count} {game.rating_count === 1 ? "rating" : "ratings"})
                </Typography>
              </Stack>
            )}
            {playerId && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Your Rating
                </Typography>
                <Rating
                  value={game.user_rating}
                  max={10}
                  onChange={handleRatingChange}
                />
              </Box>
            )}
          </Box>

          {/* Description */}
          {game.description && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                {game.description}
              </Typography>
            </Box>
          )}

          {/* Scoring Summary */}
          {game.scoring_summary && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Scoring Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                {game.scoring_summary}
              </Typography>
            </Box>
          )}

          {/* Notes */}
          {game.notes && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {game.notes}
              </Typography>
            </Box>
          )}

          {/* Expansions */}
          {game.expansions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Expansions
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {game.expansions.map((e) => (
                  <Chip key={e.id} label={e.name} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          {/* Scoring Categories */}
          {game.scoring_spec && game.scoring_spec.fields.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Scoring Categories
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {game.scoring_spec.fields.map((f) => (
                  <Chip key={f.id} label={f.label} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
