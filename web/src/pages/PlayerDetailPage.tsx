import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Chip,
  Paper,
  Skeleton,
  Grid,
  TextField,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import type { PlayerStats, WinStreakResponse, PlayerScoreTrend } from "../types/stats";
import type { Player } from "../types/session";
import { getPlayerStats, getWinStreaks, getPlayerScoreTrends } from "../api/stats";
import { listPlayers, updatePlayer } from "../api/sessions";
import PlayerScoreTrendChart from "../components/stats/PlayerScoreTrendChart";
import { useNotify } from "../components/common/useNotify";

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [streaks, setStreaks] = useState<WinStreakResponse | null>(null);
  const [scoreTrends, setScoreTrends] = useState<PlayerScoreTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editColor, setEditColor] = useState("#666666");
  const { success, error } = useNotify();

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, players, ws, st] = await Promise.all([
        getPlayerStats(Number(id)),
        listPlayers(),
        getWinStreaks(Number(id)),
        getPlayerScoreTrends(Number(id)),
      ]);
      setStats(s);
      setPlayer(players.find((p) => p.id === Number(id)) ?? null);
      setStreaks(ws);
      setScoreTrends(st);
    } catch {
      error("Failed to load player");
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEditOpen = () => {
    setEditAvatarUrl(player?.avatar_url ?? "");
    setEditColor(player?.color ?? "#666666");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    try {
      const updated = await updatePlayer(Number(id), {
        avatar_url: editAvatarUrl || null,
        color: editColor || null,
      });
      setPlayer(updated);
      setEditOpen(false);
      success("Profile updated");
    } catch {
      error("Failed to update profile");
    }
  };

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
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Avatar
          src={player?.avatar_url ?? undefined}
          sx={{
            width: 56,
            height: 56,
            bgcolor: player?.color ?? "primary.main",
          }}
        >
          {stats.player_name[0]}
        </Avatar>
        <Typography variant="h4">{stats.player_name}</Typography>
        <Button size="small" startIcon={<EditIcon />} onClick={handleEditOpen}>
          Edit Profile
        </Button>
      </Stack>

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
        {streaks && (
          <>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h4" color="primary">
                  {streaks.current_streak}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Win Streak
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h4" color="primary">
                  {streaks.longest_streak}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Longest Win Streak
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>

      <Typography variant="h6" gutterBottom>
        Games Played
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {stats.games_played.map((g) => (
          <Chip key={g} label={g} />
        ))}
      </Stack>

      {scoreTrends.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <PlayerScoreTrendChart data={scoreTrends} />
        </Box>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Player Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Avatar URL"
              value={editAvatarUrl}
              onChange={(e) => setEditAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <TextField
              label="Player Color"
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
