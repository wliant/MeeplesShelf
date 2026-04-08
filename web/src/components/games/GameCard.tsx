import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Stack,
  Collapse,
  Box,
  Rating,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Game } from "../../types/game";
import { formatLastPlayed } from "../../utils/stats";
import ExpansionList from "./ExpansionList";

interface Props {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

export default function GameCard({ game, onEdit, onDelete, onRefresh, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {game.name}
        </Typography>
        {game.rating !== null && (
          <Rating value={game.rating} max={10} readOnly size="small" sx={{ mb: 1 }} />
        )}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip
            label={`${game.min_players}-${game.max_players} players`}
            size="small"
          />
          {game.scoring_spec && (
            <Chip
              label={`${game.scoring_spec.fields.length} scoring fields`}
              size="small"
              color="primary"
            />
          )}
          {game.expansions.length > 0 && (
            <Chip
              label={`${game.expansions.length} expansion${game.expansions.length > 1 ? "s" : ""}`}
              size="small"
              color="secondary"
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {game.session_count > 0
            ? `Played ${game.session_count} time${game.session_count !== 1 ? "s" : ""} · Last: ${formatLastPlayed(game.last_played_at)}`
            : "Never played"}
        </Typography>
      </CardContent>
      <CardActions>
        {isAdmin && (
          <IconButton size="small" onClick={() => onEdit(game)}>
            <EditIcon />
          </IconButton>
        )}
        {isAdmin && (
          <IconButton size="small" onClick={() => onDelete(game)}>
            <DeleteIcon />
          </IconButton>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </CardActions>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          {game.notes && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {game.notes}
              </Typography>
            </Box>
          )}
          <ExpansionList game={game} onRefresh={onRefresh} isAdmin={isAdmin} />
        </Box>
      </Collapse>
    </Card>
  );
}
