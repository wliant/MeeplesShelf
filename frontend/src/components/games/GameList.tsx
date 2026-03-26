import { Grid } from "@mui/material";
import { Game } from "../../types/game";
import GameCard from "./GameCard";

interface Props {
  games: Game[];
  onEdit: (game: Game) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

export default function GameList({ games, onEdit, onDelete, onRefresh }: Props) {
  return (
    <Grid container spacing={2}>
      {games.map((game) => (
        <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <GameCard
            game={game}
            onEdit={onEdit}
            onDelete={onDelete}
            onRefresh={onRefresh}
          />
        </Grid>
      ))}
    </Grid>
  );
}
