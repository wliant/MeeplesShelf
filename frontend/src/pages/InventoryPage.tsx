import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Fab,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
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
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotify } from "../components/common/useNotify";

type SortBy = "name" | "created_at" | "min_players";
type SortDir = "asc" | "desc";

export default function InventoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const { success, error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGames();
      setGames(data);
    } catch {
      error("Failed to load games");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = games
    .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "created_at")
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "min_players") cmp = a.min_players - b.min_players;
      return sortDir === "desc" ? -cmp : cmp;
    });

  const handleSave = async (data: GameCreate) => {
    try {
      if (editingGame) {
        await updateGame(editingGame.id, data);
        success("Game updated");
      } else {
        await createGame(data);
        success("Game created");
      }
      setFormOpen(false);
      setEditingGame(null);
      refresh();
    } catch {
      error("Failed to save game");
    }
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGame(deleteTarget.id);
      success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refresh();
    } catch {
      error("Failed to delete game");
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedGames();
      success(`Seeded ${result.seeded.length} games`);
      refresh();
    } catch {
      error("Failed to seed games");
    }
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
        {games.length === 0 && !loading && (
          <Button variant="outlined" onClick={handleSeed}>
            Seed Default Games
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          size="small"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="created_at">Date Added</MenuItem>
            <MenuItem value="min_players">Players</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={sortDir}
            label="Order"
            onChange={(e) => setSortDir(e.target.value as SortDir)}
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <GameList
          games={filtered}
          onEdit={handleEdit}
          onDelete={(id) => {
            const game = games.find((g) => g.id === id);
            if (game) setDeleteTarget(game);
          }}
          onRefresh={refresh}
        />
      )}

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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Game"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all associated sessions.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
