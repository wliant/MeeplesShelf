import { Card, CardContent, Grid, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import PeopleIcon from "@mui/icons-material/People";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { OverviewStats } from "../../types/stats";

interface Props {
  data: OverviewStats;
}

const cards = [
  {
    key: "total_games" as const,
    label: "Total Games",
    icon: <SportsEsportsIcon color="primary" />,
  },
  {
    key: "total_sessions" as const,
    label: "Total Sessions",
    icon: <HistoryIcon color="primary" />,
  },
  {
    key: "total_players" as const,
    label: "Total Players",
    icon: <PeopleIcon color="primary" />,
  },
  {
    key: "recent_sessions" as const,
    label: "Last 30 Days",
    icon: <TrendingUpIcon color="primary" />,
  },
];

export default function OverviewCards({ data }: Props) {
  return (
    <Grid container spacing={2}>
      {cards.map((c) => (
        <Grid key={c.key} size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
              }}
            >
              {c.icon}
              <Typography variant="h4" sx={{ mt: 1 }}>
                {data[c.key]}
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
