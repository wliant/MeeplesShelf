import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
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
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import { Rating } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Game } from "../../types/game";
import ExpansionList from "./ExpansionList";

interface Props {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
  onToggleFavorite: (id: number) => void;
}

export default function GameCard({
  game,
  onEdit,
  onDelete,
  onRefresh,
  onToggleFavorite,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const playtimeLabel =
    game.min_playtime && game.max_playtime
      ? game.min_playtime === game.max_playtime
        ? `${game.min_playtime} min`
        : `${game.min_playtime}-${game.max_playtime} min`
      : game.min_playtime
        ? `${game.min_playtime}+ min`
        : null;

  return (
    <Card>
      {game.thumbnail_url && (
        <CardMedia
          component="img"
          height="140"
          image={game.thumbnail_url}
          alt={game.name}
          sx={{ objectFit: "contain", bgcolor: "grey.100" }}
        />
      )}
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1 }}
            noWrap
            component={Link}
            to={`/games/${game.id}`}
            color="inherit"
          >
            {game.name}
          </Typography>
          {game.year_published && (
            <Typography variant="caption" color="text.secondary">
              ({game.year_published})
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Chip
            label={`${game.min_players}-${game.max_players} players`}
            size="small"
          />
          {playtimeLabel && <Chip label={playtimeLabel} size="small" />}
          {game.weight != null && (
            <Chip
              label={`Weight ${game.weight.toFixed(1)}`}
              size="small"
              color="secondary"
            />
          )}
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
            />
          )}
          {game.game_type && game.game_type !== "base_game" && (
            <Chip
              label={game.game_type.replace(/_/g, " ")}
              size="small"
              color="info"
            />
          )}
        </Stack>
        {game.user_rating != null && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <Rating
              value={game.user_rating / 2}
              precision={0.5}
              readOnly
              size="small"
              max={5}
            />
            <Typography variant="caption" color="text.secondary">
              {game.user_rating.toFixed(1)}
            </Typography>
          </Stack>
        )}
        {(game.categories.length > 0 || game.mechanics.length > 0) && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {game.categories.map((c) => (
              <Chip key={`c-${c.id}`} label={c.name} size="small" variant="outlined" />
            ))}
            {game.mechanics.slice(0, 3).map((m) => (
              <Chip key={`m-${m.id}`} label={m.name} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
        {game.tags?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {game.tags.map((t) => (
              <Chip
                key={`t-${t.id}`}
                label={t.name}
                size="small"
                sx={{ bgcolor: t.color, color: "white" }}
              />
            ))}
          </Stack>
        )}
      </CardContent>
      <CardActions>
        <IconButton
          size="small"
          onClick={() => onToggleFavorite(game.id)}
          color={game.is_favorite ? "warning" : "default"}
        >
          {game.is_favorite ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
        <IconButton size="small" onClick={() => onEdit(game)}>
          <EditIcon />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(game.id)}>
          <DeleteIcon />
        </IconButton>
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
          <ExpansionList game={game} onRefresh={onRefresh} />
        </Box>
      </Collapse>
    </Card>
  );
}
