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
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Rating,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  SearchOff as SearchOffIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import MeepleIcon from "../components/common/MeepleIcon";
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
import { formatLastPlayed } from "../utils/stats";

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
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    (localStorage.getItem("ms_inventory_view") as "grid" | "list") || "grid",
  );

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
      sort: sortBy !== "name_asc" ? sortBy : undefined,
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
  }, [debouncedSearch, selectedFilterTags, sortBy, page]);

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

      {!loading && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
          flexWrap="wrap"
          useFlexGap
          spacing={1}
        >
          <Typography variant="body2" color="text.secondary">
            {total} game{total !== 1 ? "s" : ""}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="name_asc">Name A&#8211;Z</MenuItem>
              <MenuItem value="name_desc">Name Z&#8211;A</MenuItem>
              <MenuItem value="rating_desc">Highest Rated</MenuItem>
              <MenuItem value="last_played">Recently Played</MenuItem>
              <MenuItem value="most_played">Most Played</MenuItem>
            </TextField>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) {
                  setViewMode(v);
                  localStorage.setItem("ms_inventory_view", v);
                }
              }}
            >
              <ToggleButton value="grid" aria-label="Grid view"><ViewModuleIcon /></ToggleButton>
              <ToggleButton value="list" aria-label="List view"><ViewListIcon /></ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : games.length === 0 && (debouncedSearch || selectedFilterTags.length > 0) ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <SearchOffIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography color="text.secondary">
            No games match your search.
          </Typography>
        </Box>
      ) : games.length === 0 && !debouncedSearch && selectedFilterTags.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <MeepleIcon sx={{ fontSize: 64, color: "text.secondary", mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Your shelf is empty.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Add your first board game to start tracking.
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => { setEditingGame(null); setFormOpen(true); }}
            >
              Add your first game
            </Button>
          )}
        </Box>
      ) : viewMode === "grid" ? (
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
      ) : (
        <>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Players</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Sessions</TableCell>
                  <TableCell>Last Played</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {games.map((g) => (
                  <TableRow key={g.id} hover sx={{ cursor: "pointer" }} onClick={() => handleEdit(g)}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{g.min_players}&#8211;{g.max_players}</TableCell>
                    <TableCell>{g.rating !== null ? <Rating value={g.rating} max={10} readOnly size="small" /> : "-"}</TableCell>
                    <TableCell>{g.session_count}</TableCell>
                    <TableCell>{formatLastPlayed(g.last_played_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
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
