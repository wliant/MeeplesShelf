import { Paper, Typography, Stack, ToggleButtonGroup, ToggleButton } from "@mui/material";
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
  period?: string;
  onPeriodChange?: (period: string) => void;
}

export default function PlayFrequencyChart({ data, period, onPeriodChange }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.period).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Play Frequency</Typography>
        {onPeriodChange && (
          <ToggleButtonGroup
            value={period ?? "month"}
            exclusive
            onChange={(_, v) => v && onPeriodChange(v)}
            size="small"
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
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
