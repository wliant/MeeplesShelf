import { Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PlayerWinRate } from "../../types/stats";

interface Props {
  data: PlayerWinRate[];
}

export default function PlayerWinRateChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    win_rate_pct: Math.round(d.win_rate * 100),
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Player Win Rates
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted} layout="vertical">
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis
            type="category"
            dataKey="player_name"
            width={100}
            fontSize={12}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Win Rate"]}
          />
          <Bar dataKey="win_rate_pct" fill="#66bb6a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
