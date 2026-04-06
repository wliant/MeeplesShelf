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
import type { PlayerStats } from "../../types/stats";
import { formatWinRate } from "../../utils/stats";

interface Props {
  data: PlayerStats[];
}

export default function PlayerLeaderboard({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const top10 = data.slice(0, 10);
  const chartData = top10.map((p) => ({
    name: p.player_name,
    winRate: Math.round(p.win_rate * 1000) / 10,
  }));

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Player Leaderboard
      </Typography>

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
              <TableCell>Player</TableCell>
              <TableCell align="right">Played</TableCell>
              <TableCell align="right">Wins</TableCell>
              <TableCell align="right">Win Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((p, i) => (
              <TableRow key={p.player_id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{p.player_name}</TableCell>
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
