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
import ConfirmDialog, { buildGameDeleteMessage } from "../components/common/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [pendingDeleteGame, setPendingDeleteGame] = useState<Game | null>(null);

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

  const handleDeleteClick = (game: Game) => {
    setPendingDeleteGame(game);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteGame) {
      await deleteGame(pendingDeleteGame.id);
      setPendingDeleteGame(null);
      refresh();
    }
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
        {isAdmin && games.length === 0 && (
          <Button variant="outlined" onClick={handleSeed}>
            Seed Default Games
          </Button>
        )}
      </Stack>

      <GameList
        games={games}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onRefresh={refresh}
        isAdmin={isAdmin}
      />

      {isAdmin && (
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
      )}

      <ConfirmDialog
        open={pendingDeleteGame !== null}
        title="Delete Game"
        message={
          pendingDeleteGame
            ? buildGameDeleteMessage(pendingDeleteGame.name, pendingDeleteGame.expansions.length)
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteGame(null)}
      />

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
