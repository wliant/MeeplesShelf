import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Fab,
  Button,
  Stack,
  TextField,
  InputAdornment,
  CircularProgress,
  Pagination,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
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
import { useSnackbar } from "../context/SnackbarContext";
import { extractErrorMessage } from "../utils/errors";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = useMemo(() => searchParams.get("search") ?? "", []);
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [pendingDeleteGame, setPendingDeleteGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Clear URL search param after consuming it
  useEffect(() => {
    if (searchParams.has("search")) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const refresh = useCallback(() => {
    setLoading(true);
    listGames({
      name: debouncedSearch || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        setGames(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (data: GameCreate) => {
    setSaving(true);
    try {
      if (editingGame) {
        await updateGame(editingGame.id, data);
        showSnackbar("Game updated successfully");
      } else {
        await createGame(data);
        showSnackbar("Game created successfully");
      }
      setFormOpen(false);
      setEditingGame(null);
      refresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
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
      setSaving(true);
      try {
        await deleteGame(pendingDeleteGame.id);
        showSnackbar("Game deleted successfully");
        setPendingDeleteGame(null);
        refresh();
      } catch (err) {
        showSnackbar(extractErrorMessage(err), "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    try {
      await seedGames();
      showSnackbar("Default games seeded successfully");
      refresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
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
        {isAdmin && total === 0 && !loading && !debouncedSearch && (
          <Button variant="outlined" onClick={handleSeed} disabled={saving}>
            Seed Default Games
          </Button>
        )}
      </Stack>

      {!loading && (
        <TextField
          size="small"
          fullWidth
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : games.length === 0 && debouncedSearch ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No games match your search.
        </Typography>
      ) : (
        <>
          <GameList
            games={games}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onRefresh={refresh}
            isAdmin={isAdmin}
          />
          {total > PAGE_SIZE && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(total / PAGE_SIZE)}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
              />
            </Box>
          )}
        </>
      )}

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
        loading={saving}
      />

      <GameForm
        open={formOpen}
        game={editingGame}
        onClose={() => {
          setFormOpen(false);
          setEditingGame(null);
        }}
        onSave={handleSave}
        saving={saving}
      />
    </Box>
  );
}
