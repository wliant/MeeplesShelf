import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Fab,
  Button,
  Stack,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Game, GameCreate } from "../types/game";
import {
  listGames,
  createGame,
  updateGame,
  deleteGame,
  seedGames,
} from "../api/games";
import GameList from "../components/games/GameList";
import GameForm from "../components/games/GameForm";

export default function InventoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const refresh = useCallback(() => {
    listGames().then(setGames);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (data: GameCreate) => {
    if (editingGame) {
      await updateGame(editingGame.id, data);
    } else {
      await createGame(data);
    }
    setFormOpen(false);
    setEditingGame(null);
    refresh();
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteGame(id);
    refresh();
  };

  const handleSeed = async () => {
    await seedGames();
    refresh();
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">Game Inventory</Typography>
        {games.length === 0 && (
          <Button variant="outlined" onClick={handleSeed}>
            Seed Default Games
          </Button>
        )}
      </Stack>

      <GameList
        games={games}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={refresh}
      />

      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => {
          setEditingGame(null);
          setFormOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      <GameForm
        open={formOpen}
        game={editingGame}
        onClose={() => {
          setFormOpen(false);
          setEditingGame(null);
        }}
        onSave={handleSave}
      />
    </Box>
  );
}
