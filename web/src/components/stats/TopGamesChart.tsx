import { Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TopGame } from "../../types/stats";

interface Props {
  data: TopGame[];
}

export default function TopGamesChart({ data }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Most Played Games
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="game_name"
            width={120}
            fontSize={12}
          />
          <Tooltip />
          <Bar dataKey="play_count" fill="#ff7043" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
