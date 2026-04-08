import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import {
  FormControlLabel,
  Link,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlayerStats } from "../../types/stats";
import useSortableTable from "../../hooks/useSortableTable";
import { formatWinRate } from "../../utils/stats";

interface Props {
  data: PlayerStats[];
}

export default function PlayerLeaderboard({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? data : data.filter((p) => p.sessions_played > 0);
  const { sorted, orderBy, order, onSort } = useSortableTable(displayData, "win_rate", "desc");

  const top10 = displayData.slice(0, 10);
  const chartData = top10.map((p) => ({
    name: p.player_name,
    winRate: Math.round(p.win_rate * 1000) / 10,
  }));

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Player Leaderboard</Typography>
        <FormControlLabel
          control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
          label="Show all"
          slotProps={{ typography: { variant: "body2" } }}
        />
      </Stack>

      {!isMobile && top10.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(value) => [`${value}%`, "Win Rate"]}
            />
            <Bar
              dataKey="winRate"
              fill={theme.palette.primary.main}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === "player_name"} direction={orderBy === "player_name" ? order : "asc"} onClick={() => onSort("player_name")}>
                  Player
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "sessions_played"} direction={orderBy === "sessions_played" ? order : "asc"} onClick={() => onSort("sessions_played")}>
                  Played
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "wins"} direction={orderBy === "wins" ? order : "asc"} onClick={() => onSort("wins")}>
                  Wins
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "win_rate"} direction={orderBy === "win_rate" ? order : "asc"} onClick={() => onSort("win_rate")}>
                  Win Rate
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((p, i) => (
              <TableRow key={p.player_id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <Link
                    component={RouterLink}
                    to={`/players/${p.player_id}`}
                    color="inherit"
                    underline="hover"
                  >
                    {p.player_name}
                  </Link>
                </TableCell>
                <TableCell align="right">{p.sessions_played}</TableCell>
                <TableCell align="right">{p.wins}</TableCell>
                <TableCell align="right">
                  {formatWinRate(p.win_rate)}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No players yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
