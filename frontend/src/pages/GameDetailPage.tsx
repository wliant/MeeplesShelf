import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Skeleton,
  Grid,
  CardMedia,
} from "@mui/material";
import type { Game } from "../types/game";
import type { GameStats } from "../types/stats";
import { getGame } from "../api/games";
import { getGameStats } from "../api/stats";
import { useNotify } from "../components/common/useNotify";

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useNotify();

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, s] = await Promise.all([
        getGame(Number(id)),
        getGameStats(Number(id)).catch(() => null),
      ]);
      setGame(g);
      setStats(s);
    } catch {
      error("Failed to load game");
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={40} />
      </Box>
    );
  }

  if (!game) {
    return <Typography>Game not found.</Typography>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {game.image_url && (
          <Grid size={{ xs: 12, md: 4 }}>
            <CardMedia
              component="img"
              image={game.image_url}
              alt={game.name}
              sx={{ borderRadius: 2, maxHeight: 300, objectFit: "contain" }}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, md: game.image_url ? 8 : 12 }}>
          <Stack spacing={1}>
            <Typography variant="h4">
              {game.name}
              {game.year_published && (
                <Typography
                  component="span"
                  variant="h5"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  ({game.year_published})
                </Typography>
              )}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${game.min_players}-${game.max_players} players`} />
              {game.min_playtime && game.max_playtime && (
                <Chip label={`${game.min_playtime}-${game.max_playtime} min`} />
              )}
              {game.weight != null && (
                <Chip
                  label={`Weight ${game.weight.toFixed(1)}`}
                  color="secondary"
                />
              )}
              {game.min_age && <Chip label={`Age ${game.min_age}+`} />}
            </Stack>

            {game.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {game.description.slice(0, 500)}
                {game.description.length > 500 ? "..." : ""}
              </Typography>
            )}

            {game.designers.length > 0 && (
              <Typography variant="body2">
                <strong>Designers:</strong>{" "}
                {game.designers.map((d) => d.name).join(", ")}
              </Typography>
            )}
            {game.publishers.length > 0 && (
              <Typography variant="body2">
                <strong>Publishers:</strong>{" "}
                {game.publishers.map((p) => p.name).join(", ")}
              </Typography>
            )}

            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {game.categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  size="small"
                  variant="outlined"
                />
              ))}
              {game.mechanics.map((m) => (
                <Chip
                  key={m.id}
                  label={m.name}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {stats && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="h5" color="primary">
                {stats.total_plays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Plays
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="h5" color="primary">
                {stats.unique_players}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique Players
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="h5" color="primary">
                {stats.average_score ?? "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Score
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="h5" color="primary">
                {stats.highest_score ?? "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Score
              </Typography>
            </Grid>
          </Grid>
          {Object.keys(stats.win_distribution).length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Wins:
              </Typography>
              {Object.entries(stats.win_distribution).map(([name, count]) => (
                <Chip
                  key={name}
                  label={`${name}: ${count}`}
                  size="small"
                  color="primary"
                />
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
