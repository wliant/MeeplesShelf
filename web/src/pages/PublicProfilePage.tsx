import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  Typography,
  Alert,
} from "@mui/material";
import { getPublicProfile } from "../api/social";

interface PublicProfile {
  display_name: string;
  games: Array<{
    name: string;
    year_published: number | null;
    collection_status: string;
    thumbnail_url: string | null;
  }>;
}

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicProfile(slug)
      .then(setProfile)
      .catch(() => setError("Profile not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return <Alert severity="error">{error || "Profile not found"}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {profile.display_name}'s Collection
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        {profile.games.length} games
      </Typography>

      <Grid container spacing={2}>
        {profile.games.map((game, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <Card>
              {game.thumbnail_url && (
                <CardMedia
                  component="img"
                  height="140"
                  image={game.thumbnail_url}
                  alt={game.name}
                />
              )}
              <CardContent>
                <Typography variant="body2" noWrap>
                  {game.name}
                </Typography>
                {game.year_published && (
                  <Typography variant="caption" color="text.secondary">
                    {game.year_published}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
