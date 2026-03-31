import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Skeleton, Paper, List, ListItem, ListItemText } from "@mui/material";
import { Dashboard as DashboardIcon } from "@mui/icons-material";
import type {
  OverviewStats,
  PlayFrequencyEntry,
  TopGame,
  HIndexResponse,
  PlayerWinRate,
} from "../types/stats";
import {
  getOverviewStats,
  getPlayFrequency,
  getTopGames,
  getHIndex,
  getPlayerWinRates,
} from "../api/stats";
import OverviewCards from "../components/stats/OverviewCards";
import PlayFrequencyChart from "../components/stats/PlayFrequencyChart";
import TopGamesChart from "../components/stats/TopGamesChart";
import HIndexCard from "../components/stats/HIndexCard";
import PlayerWinRateChart from "../components/stats/PlayerWinRateChart";
import EmptyState from "../components/common/EmptyState";
import { useNotify } from "../components/common/useNotify";
import { getFriendActivity, type ActivityEvent } from "../api/social";

function formatActivityEvent(e: ActivityEvent): string {
  const name = e.user_name;
  switch (e.event_type) {
    case "session_logged":
      return `${name} played ${(e.payload.game_name as string) || "a game"}`;
    case "game_added":
      return `${name} added ${(e.payload.game_name as string) || "a game"} to their collection`;
    case "badge_earned":
      return `${name} earned the "${(e.payload.badge_name as string) || "?"}" badge`;
    case "friend_added":
      return `${name} made a new friend: ${(e.payload.friend_name as string) || "someone"}`;
    default:
      return `${name} did something`;
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [frequency, setFrequency] = useState<PlayFrequencyEntry[]>([]);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [hIndex, setHIndex] = useState<HIndexResponse | null>(null);
  const [winRates, setWinRates] = useState<PlayerWinRate[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [freqPeriod, setFreqPeriod] = useState("month");
  const freqPeriodRef = useRef(freqPeriod);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f, t, h, w, a] = await Promise.all([
        getOverviewStats(),
        getPlayFrequency(freqPeriodRef.current, 12),
        getTopGames(10),
        getHIndex(),
        getPlayerWinRates(),
        getFriendActivity(10).catch(() => []),
      ]);
      setOverview(o);
      setFrequency(f);
      setTopGames(t);
      setHIndex(h);
      setWinRates(w);
      setActivity(a);
    } catch {
      error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePeriodChange = async (period: string) => {
    setFreqPeriod(period);
    freqPeriodRef.current = period;
    try {
      const f = await getPlayFrequency(period, 12);
      setFrequency(f);
    } catch {
      error("Failed to load play frequency");
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={100} />
          <Skeleton variant="rounded" height={280} />
        </Stack>
      ) : overview && overview.total_games === 0 && overview.total_sessions === 0 ? (
        <EmptyState
          icon={<DashboardIcon sx={{ fontSize: "inherit" }} />}
          title="Welcome to MeeplesShelf"
          description="Add some games to your collection and log sessions to see your stats here."
          actions={[
            { label: "Go to Inventory", onClick: () => navigate("/inventory") },
            { label: "Log a Session", onClick: () => navigate("/sessions"), variant: "outlined" },
          ]}
        />
      ) : (
        <Stack spacing={3}>
          {overview && <OverviewCards stats={overview} />}

          {hIndex && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ width: { xs: "100%", md: 200 } }}>
                <HIndexCard data={hIndex} />
              </Box>
              <Box sx={{ flex: 1 }}>
                {winRates.length > 0 && <PlayerWinRateChart data={winRates} />}
              </Box>
            </Stack>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <PlayFrequencyChart
                data={frequency}
                period={freqPeriod}
                onPeriodChange={handlePeriodChange}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TopGamesChart data={topGames} />
            </Box>
          </Stack>

          {activity.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Friend Activity
              </Typography>
              <List dense>
                {activity.map((e) => (
                  <ListItem key={e.id}>
                    <ListItemText
                      primary={formatActivityEvent(e)}
                      secondary={new Date(e.created_at).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}
