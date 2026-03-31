import { Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PlayFrequencyEntry } from "../../types/stats";

interface Props {
  data: PlayFrequencyEntry[];
}

export default function PlayFrequencyChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.period).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Play Frequency
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#5c6bc0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
