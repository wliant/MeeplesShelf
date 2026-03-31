import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Stack, Skeleton } from "@mui/material";
import type { OverviewStats, PlayFrequencyEntry, TopGame } from "../types/stats";
import { getOverviewStats, getPlayFrequency, getTopGames } from "../api/stats";
import OverviewCards from "../components/stats/OverviewCards";
import PlayFrequencyChart from "../components/stats/PlayFrequencyChart";
import TopGamesChart from "../components/stats/TopGamesChart";
import { useNotify } from "../components/common/useNotify";

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [frequency, setFrequency] = useState<PlayFrequencyEntry[]>([]);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f, t] = await Promise.all([
        getOverviewStats(),
        getPlayFrequency("month", 12),
        getTopGames(10),
      ]);
      setOverview(o);
      setFrequency(f);
      setTopGames(t);
    } catch {
      error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      ) : (
        <Stack spacing={3}>
          {overview && <OverviewCards stats={overview} />}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <PlayFrequencyChart data={frequency} />
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
