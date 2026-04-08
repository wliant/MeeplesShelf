import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HistoryIcon from "@mui/icons-material/History";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PersonIcon from "@mui/icons-material/Person";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPlayerProfileStats } from "../api/sessions";
import type { PlayerProfileStats } from "../types/stats";
import { formatScore, formatWinRate } from "../utils/stats";
import ActivityChart from "../components/stats/ActivityChart";

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [stats, setStats] = useState<PlayerProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getPlayerProfileStats(Number(id))
      .then(setStats)
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !stats) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <PersonIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Player not found
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/players")}
        >
          All Players
        </Button>
      </Box>
    );
  }

  const overviewCards = [
    {
      label: "Sessions Played",
      value: stats.sessions_played,
      icon: <HistoryIcon color="primary" />,
    },
    {
      label: "Wins",
      value: stats.wins,
      icon: <EmojiEventsIcon color="primary" />,
    },
    {
      label: "Win Rate",
      value: formatWinRate(stats.win_rate),
      icon: <TrendingUpIcon color="primary" />,
    },
    {
      label: "Favorite Game",
      value: stats.favorite_game ?? "N/A",
      icon: <SportsEsportsIcon color="primary" />,
    },
  ];

  const gameChartData = stats.games.slice(0, 10).map((g) => ({
    name: g.game_name,
    timesPlayed: g.times_played,
  }));

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/players")}
        sx={{ mb: 2 }}
      >
        All Players
      </Button>

      <Typography variant="h4" gutterBottom>
        {stats.player_name}
      </Typography>

      {/* Overview cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {overviewCards.map((c) => (
          <Grid key={c.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 2,
                }}
              >
                {c.icon}
                <Typography
                  variant="h4"
                  sx={{ mt: 1, fontSize: typeof c.value === "string" && c.value.length > 6 ? "1.2rem" : undefined }}
                >
                  {c.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Per-game breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Games Breakdown
            </Typography>

            {!isMobile && gameChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gameChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => [value, "Sessions"]} />
                  <Bar
                    dataKey="timesPlayed"
                    fill={theme.palette.secondary.main}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ mt: gameChartData.length > 0 && !isMobile ? 2 : 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Game</TableCell>
                    <TableCell align="right">Played</TableCell>
                    <TableCell align="right">Wins</TableCell>
                    <TableCell align="right">Win Rate</TableCell>
                    {!isMobile && (
                      <>
                        <TableCell align="right">Avg Score</TableCell>
                        <TableCell align="right">Best</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.games.map((g) => (
                    <TableRow key={g.game_id}>
                      <TableCell>{g.game_name}</TableCell>
                      <TableCell align="right">{g.times_played}</TableCell>
                      <TableCell align="right">{g.wins}</TableCell>
                      <TableCell align="right">
                        {formatWinRate(g.win_rate)}
                      </TableCell>
                      {!isMobile && (
                        <>
                          <TableCell align="right">
                            {g.avg_score !== null ? g.avg_score.toFixed(1) : "--"}
                          </TableCell>
                          <TableCell align="right">
                            {formatScore(g.best_score)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {stats.games.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 4 : 6} align="center">
                        No games played yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent sessions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Sessions
            </Typography>

            {isMobile ? (
              <Stack spacing={1}>
                {stats.recent_sessions.map((s) => (
                  <Card key={s.session_id} variant="outlined">
                    <CardActionArea sx={{ p: 1.5 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box>
                          <Typography variant="subtitle2">
                            {s.game_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(s.played_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">
                            {formatScore(s.total_score)}
                          </Typography>
                          {s.winner && (
                            <Chip
                              label="Win"
                              color="primary"
                              size="small"
                            />
                          )}
                        </Stack>
                      </Stack>
                    </CardActionArea>
                  </Card>
                ))}
                {stats.recent_sessions.length === 0 && (
                  <Typography
                    color="text.secondary"
                    align="center"
                    sx={{ py: 2 }}
                  >
                    No sessions yet
                  </Typography>
                )}
              </Stack>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Game</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="center">Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recent_sessions.map((s) => (
                      <TableRow key={s.session_id}>
                        <TableCell>{s.game_name}</TableCell>
                        <TableCell>
                          {new Date(s.played_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          {formatScore(s.total_score)}
                        </TableCell>
                        <TableCell align="center">
                          {s.winner && (
                            <Chip label="Win" color="primary" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {stats.recent_sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No sessions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Activity chart */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <ActivityChart data={stats.activity} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
