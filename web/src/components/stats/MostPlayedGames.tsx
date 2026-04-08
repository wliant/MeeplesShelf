import { useState } from "react";
import {
  FormControlLabel,
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
import type { GameStats } from "../../types/stats";
import useSortableTable from "../../hooks/useSortableTable";

interface Props {
  data: GameStats[];
}

export default function MostPlayedGames({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? data : data.filter((g) => g.times_played > 0);
  const { sorted, orderBy, order, onSort } = useSortableTable(displayData, "times_played", "desc");

  const top10 = displayData.slice(0, 10);
  const chartData = top10.map((g) => ({
    name: g.game_name,
    timesPlayed: g.times_played,
  }));

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Most Played Games</Typography>
        <FormControlLabel
          control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
          label="Show all"
          slotProps={{ typography: { variant: "body2" } }}
        />
      </Stack>

      {!isMobile && top10.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} />
            <Tooltip
              formatter={(value) => [value, "Sessions"]}
            />
            <Bar
              dataKey="timesPlayed"
              fill={theme.palette.secondary.main}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={orderBy === "game_name"} direction={orderBy === "game_name" ? order : "asc"} onClick={() => onSort("game_name")}>
                  Game
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "times_played"} direction={orderBy === "times_played" ? order : "asc"} onClick={() => onSort("times_played")}>
                  Sessions
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "unique_players"} direction={orderBy === "unique_players" ? order : "asc"} onClick={() => onSort("unique_players")}>
                  Players
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === "last_played"} direction={orderBy === "last_played" ? order : "asc"} onClick={() => onSort("last_played")}>
                  Last Played
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((g) => (
              <TableRow key={g.game_id}>
                <TableCell>{g.game_name}</TableCell>
                <TableCell align="right">{g.times_played}</TableCell>
                <TableCell align="right">{g.unique_players}</TableCell>
                <TableCell align="right">
                  {g.last_played
                    ? new Date(g.last_played).toLocaleDateString()
                    : "Never"}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No games yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
