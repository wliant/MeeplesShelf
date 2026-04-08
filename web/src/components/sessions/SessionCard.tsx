import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import type { GameSession } from "../../types/session";

interface Props {
  session: GameSession;
  onDelete: (session: GameSession) => void;
  onSelect: (session: GameSession) => void;
  isAdmin: boolean;
}

export default function SessionCard({
  session,
  onDelete,
  onSelect,
  isAdmin,
}: Props) {
  const winners = session.players.filter((p) => p.winner);

  return (
    <Card variant="outlined" sx={{ borderRadius: 0, border: 0 }}>
      <CardActionArea onClick={() => onSelect(session)}>
        <CardContent sx={{ pb: isAdmin ? 0.5 : undefined }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {session.game.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(session.played_at).toLocaleDateString()}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1 }}
          >
            {session.players.map((p) => (
              <Chip
                key={p.id}
                label={`${p.player.name}${p.total_score != null ? ` (${p.total_score})` : ""}`}
                size="small"
                color={p.winner ? "primary" : "default"}
              />
            ))}
          </Stack>
          <Typography
            variant="body2"
            sx={{ mt: 1 }}
            color={winners.length ? "primary" : "text.secondary"}
          >
            Winner: {winners.map((w) => w.player.name).join(", ") || "-"}
          </Typography>
        </CardContent>
      </CardActionArea>
      {isAdmin && (
        <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
          <Tooltip title="Delete session">
            <IconButton size="small" aria-label={`Delete session for ${session.game.name}`} onClick={() => onDelete(session)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      )}
    </Card>
  );
}
