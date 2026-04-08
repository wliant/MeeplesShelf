import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useNavigate } from "react-router-dom";
import {
  getOverviewStats,
  getPlayerStats,
  getGameStats,
  getActivityStats,
} from "../api/stats";
import type {
  OverviewStats,
  PlayerStats,
  GameStats,
  ActivityMonth,
} from "../types/stats";
import OverviewCards from "../components/stats/OverviewCards";
import PlayerLeaderboard from "../components/stats/PlayerLeaderboard";
import MostPlayedGames from "../components/stats/MostPlayedGames";
import ActivityChart from "../components/stats/ActivityChart";

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [activity, setActivity] = useState<ActivityMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getOverviewStats(),
      getPlayerStats(),
      getGameStats(),
      getActivityStats(),
    ])
      .then(([o, p, g, a]) => {
        setOverview(o);
        setPlayerStats(p);
        setGameStats(g);
        setActivity(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (overview && overview.total_sessions === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <BarChartIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          No statistics yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Log some game sessions to see statistics here.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/sessions")}>
          Log a Session
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4">Statistics</Typography>
      </Stack>

      {overview && <OverviewCards data={overview} />}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <PlayerLeaderboard data={playerStats} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <MostPlayedGames data={gameStats} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <ActivityChart data={activity} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
