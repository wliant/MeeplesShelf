import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Skeleton } from "@mui/material";
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

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [frequency, setFrequency] = useState<PlayFrequencyEntry[]>([]);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [hIndex, setHIndex] = useState<HIndexResponse | null>(null);
  const [winRates, setWinRates] = useState<PlayerWinRate[]>([]);
  const [freqPeriod, setFreqPeriod] = useState("month");
  const freqPeriodRef = useRef(freqPeriod);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f, t, h, w] = await Promise.all([
        getOverviewStats(),
        getPlayFrequency(freqPeriodRef.current, 12),
        getTopGames(10),
        getHIndex(),
        getPlayerWinRates(),
      ]);
      setOverview(o);
      setFrequency(f);
      setTopGames(t);
      setHIndex(h);
      setWinRates(w);
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
        </Stack>
      )}
    </Box>
  );
}
