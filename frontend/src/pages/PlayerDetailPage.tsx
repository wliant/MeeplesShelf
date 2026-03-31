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
} from "@mui/material";
import type { PlayerStats } from "../types/stats";
import { getPlayerStats } from "../api/stats";
import { useNotify } from "../components/common/useNotify";

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useNotify();

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const s = await getPlayerStats(Number(id));
      setStats(s);
    } catch {
      error("Failed to load player");
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
        <Skeleton variant="text" width="30%" height={50} />
        <Skeleton variant="rounded" height={150} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!stats) {
    return <Typography>Player not found.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {stats.player_name}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="primary">
              {stats.total_sessions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sessions
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="primary">
              {stats.total_wins}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wins
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="primary">
              {(stats.win_rate * 100).toFixed(0)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Win Rate
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h5" color="primary" noWrap>
              {stats.favorite_game ?? "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Favorite Game
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Games Played
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {stats.games_played.map((g) => (
          <Chip key={g} label={g} />
        ))}
      </Stack>
    </Box>
  );
}
