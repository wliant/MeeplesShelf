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
  Chip,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import type { Game, GameCreate, Tag } from "../types/game";
import {
  listGames,
  createGame,
  updateGame,
  deleteGame,
  seedGames,
} from "../api/games";
import { listTags } from "../api/tags";
import { importBGGImage } from "../api/bgg";
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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // Clear URL search param after consuming it
  useEffect(() => {
    if (searchParams.has("search")) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tags on mount
  useEffect(() => {
    listTags().then(setAllTags).catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleFilterTag = (tagName: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName],
    );
    setPage(0);
  };

  const refresh = useCallback(() => {
    setLoading(true);
    listGames({
      name: debouncedSearch || undefined,
      tag: selectedFilterTags.length > 0 ? selectedFilterTags : undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        setGames(res.items);
        setTotal(res.total);
      })
      .finally(() => {
        setLoading(false);
        // Reload tags in case new ones were created in GameForm
        listTags().then(setAllTags).catch(() => {});
      });
  }, [debouncedSearch, selectedFilterTags, page]);

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
        const created = await createGame(data);
        showSnackbar("Game created successfully");
        if (data.bgg_id) {
          try {
            await importBGGImage(data.bgg_id, created.id);
          } catch {
            showSnackbar("Game created but BGG image import failed", "warning");
          }
        }
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
        <>
          <TextField
            size="small"
            fullWidth
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: allTags.length > 0 ? 1 : 2 }}
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
          {allTags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {allTags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  variant={selectedFilterTags.includes(tag.name) ? "filled" : "outlined"}
                  color={selectedFilterTags.includes(tag.name) ? "primary" : "default"}
                  onClick={() => toggleFilterTag(tag.name)}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : games.length === 0 && (debouncedSearch || selectedFilterTags.length > 0) ? (
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
          aria-label="Add new game"
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
