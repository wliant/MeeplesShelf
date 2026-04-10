import { Typography, useMediaQuery, useTheme } from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityMonth } from "../../types/stats";
import { formatMonth } from "../../utils/stats";

interface Props {
  data: ActivityMonth[];
}

export default function ActivityChart({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    sessions: d.session_count,
  }));

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Play Activity
      </Typography>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value) => [value, "Sessions"]}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke={theme.palette.primary.main}
              fill="url(#colorSessions)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Typography color="text.secondary">No activity data</Typography>
      )}
    </>
  );
}
