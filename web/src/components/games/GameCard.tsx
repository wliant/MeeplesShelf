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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Game } from "../../types/game";
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
          <ExpansionList game={game} onRefresh={onRefresh} isAdmin={isAdmin} />
        </Box>
      </Collapse>
    </Card>
  );
}
