import {
  Paper,
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

interface Props {
  data: GameStats[];
}

export default function MostPlayedGames({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const top10 = data.slice(0, 10);
  const chartData = top10.map((g) => ({
    name: g.game_name,
    timesPlayed: g.times_played,
  }));

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Most Played Games
      </Typography>

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
              <TableCell>Game</TableCell>
              <TableCell align="right">Sessions</TableCell>
              <TableCell align="right">Players</TableCell>
              <TableCell align="right">Last Played</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((g) => (
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
