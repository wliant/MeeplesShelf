import { Paper, Typography } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PlayerScoreTrend } from "../../types/stats";

interface Props {
  data: PlayerScoreTrend[];
}

const COLORS = ["#5c6bc0", "#ff7043", "#66bb6a", "#ab47bc", "#ffa726", "#26c6da"];

export default function PlayerScoreTrendChart({ data }: Props) {
  if (data.length === 0) return null;

  // Flatten all data points into a unified timeline
  const allDates = new Set<string>();
  for (const trend of data) {
    for (const pt of trend.data_points) {
      allDates.add(pt.played_at);
    }
  }
  const sortedDates = Array.from(allDates).sort();

  const chartData = sortedDates.map((date) => {
    const point: Record<string, string | number> = { date };
    for (const trend of data) {
      const match = trend.data_points.find((p) => p.played_at === date);
      if (match) {
        point[trend.game_name] = match.score;
      }
    }
    return point;
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Score Trends
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" fontSize={12} />
          <YAxis />
          <Tooltip />
          <Legend />
          {data.map((trend, i) => (
            <Line
              key={trend.game_name}
              type="monotone"
              dataKey={trend.game_name}
              stroke={COLORS[i % COLORS.length]}
              connectNulls
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
