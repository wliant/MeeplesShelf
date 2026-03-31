import { Card, CardContent, Grid, Typography } from "@mui/material";
import type { OverviewStats } from "../../types/stats";

interface Props {
  stats: OverviewStats;
}

export default function OverviewCards({ stats }: Props) {
  const cards = [
    { label: "Total Games", value: stats.total_games },
    { label: "Total Sessions", value: stats.total_sessions },
    { label: "Total Players", value: stats.total_players },
    { label: "Games Played", value: stats.unique_games_played },
    {
      label: "Play Time",
      value: `${Math.round(stats.total_play_time_minutes / 60)}h`,
    },
    { label: "Last 30 Days", value: stats.sessions_last_30_days },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((c) => (
        <Grid key={c.label} size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" color="primary">
                {c.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {c.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
