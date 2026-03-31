import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import { EmojiEvents } from "@mui/icons-material";
import { listBadges, evaluateBadges, seedBadges } from "../api/badges";
import type { Badge } from "../api/badges";
import { useNotify } from "../components/common/useNotify";

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const { success } = useNotify();

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listBadges();
      setBadges(data);
    } catch {
      // Badge definitions may not exist yet
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEvaluate = async () => {
    const result = await evaluateBadges();
    if (result.newly_awarded.length > 0) {
      success(`New badges earned: ${result.newly_awarded.join(", ")}`);
    } else {
      success("No new badges earned");
    }
    refresh();
  };

  const handleSeed = async () => {
    await seedBadges();
    success("Badge definitions seeded");
    refresh();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Achievements</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {badges.length === 0 && (
            <Button variant="outlined" onClick={handleSeed}>
              Setup Badges
            </Button>
          )}
          <Button variant="contained" onClick={handleEvaluate}>
            Check Progress
          </Button>
        </Box>
      </Box>

      <Typography variant="body1" sx={{ mb: 2 }}>
        {badges.filter((b) => b.earned).length} / {badges.length} badges earned
      </Typography>

      <Grid container spacing={2}>
        {badges.map((badge) => (
          <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                opacity: badge.earned ? 1 : 0.5,
                border: badge.earned ? "2px solid" : "none",
                borderColor: "primary.main",
              }}
            >
              <CardContent sx={{ textAlign: "center" }}>
                <EmojiEvents
                  sx={{
                    fontSize: 48,
                    color: badge.earned ? "primary.main" : "text.disabled",
                    mb: 1,
                  }}
                />
                <Typography variant="h6">{badge.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {badge.description}
                </Typography>
                {badge.earned && badge.awarded_at && (
                  <Chip
                    label={`Earned ${new Date(badge.awarded_at).toLocaleDateString()}`}
                    size="small"
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
