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
  Tabs,
  Tab,
  TablePagination,
  Chip,
  Menu,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Casino as CasinoIcon,
} from "@mui/icons-material";
import type { Game, GameCreate, GameTag, CollectionStatus } from "../types/game";
import {
  listGames,
  listTags,
  createGame,
  updateGame,
  deleteGame,
  seedGames,
  toggleFavorite,
} from "../api/games";
import GameList from "../components/games/GameList";
import GameForm from "../components/games/GameForm";
import BGGSearchDialog from "../components/games/BGGSearchDialog";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import { useNotify } from "../components/common/useNotify";
import { exportCollection } from "../api/export";

type SortBy = "name" | "created_at" | "min_players";
type SortDir = "asc" | "desc";

const STATUS_TABS: { label: string; value: CollectionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Owned", value: "owned" },
  { label: "Wishlist", value: "wishlist" },
  { label: "Want to Play", value: "want_to_play" },
  { label: "Previously Owned", value: "previously_owned" },
  { label: "For Trade", value: "for_trade" },
];

export default function InventoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [statusTab, setStatusTab] = useState<CollectionStatus | "all">("all");
  const [bggOpen, setBggOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [tags, setTags] = useState<GameTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const { success, error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        sort_by: sortBy,
        sort_dir: sortDir,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
      };
      if (statusTab !== "all") params.collection_status = statusTab;
      if (search) params.search = search;
      if (selectedTagId) params.tag_id = selectedTagId;
      const [data, tagsData] = await Promise.all([
        listGames(params),
        listTags(),
      ]);
      setGames(data.items);
      setTotal(data.total);
      setTags(tagsData);
    } catch {
      error("Failed to load games");
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, sortBy, sortDir, page, rowsPerPage, selectedTagId, error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset page when filters/sort change
  useEffect(() => {
    setPage(0);
  }, [statusTab, search, sortBy, sortDir, selectedTagId]);

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

  const handleToggleFavorite = async (id: number) => {
    try {
      await toggleFavorite(id);
      refresh();
    } catch {
      error("Failed to toggle favorite");
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
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Game Inventory</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setBggOpen(true)}>
            Import from BGG
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchor}
            open={!!exportAnchor}
            onClose={() => setExportAnchor(null)}
          >
            <MenuItem onClick={() => { exportCollection("csv"); setExportAnchor(null); }}>
              CSV
            </MenuItem>
            <MenuItem onClick={() => { exportCollection("json"); setExportAnchor(null); }}>
              JSON
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Tabs
        value={statusTab}
        onChange={(_, v) => setStatusTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {STATUS_TABS.map((t) => (
          <Tab key={t.value} label={t.label} value={t.value} />
        ))}
      </Tabs>

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

      {tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <Chip
            label="All Tags"
            size="small"
            variant={selectedTagId === null ? "filled" : "outlined"}
            onClick={() => setSelectedTagId(null)}
          />
          {tags.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              size="small"
              variant={selectedTagId === t.id ? "filled" : "outlined"}
              sx={selectedTagId === t.id ? { bgcolor: t.color, color: "white" } : {}}
              onClick={() => setSelectedTagId(selectedTagId === t.id ? null : t.id)}
            />
          ))}
        </Stack>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      ) : games.length === 0 ? (
        <EmptyState
          icon={<CasinoIcon sx={{ fontSize: "inherit" }} />}
          title="No games yet"
          description="Start building your collection by adding a game or importing from BoardGameGeek."
          actions={[
            { label: "Add Game", onClick: () => { setEditingGame(null); setFormOpen(true); } },
            { label: "Import from BGG", onClick: () => setBggOpen(true), variant: "outlined" },
            { label: "Seed Defaults", onClick: handleSeed, variant: "outlined" },
          ]}
        />
      ) : (
        <>
          <GameList
            games={games}
            onEdit={handleEdit}
            onDelete={(id) => {
              const game = games.find((g) => g.id === id);
              if (game) setDeleteTarget(game);
            }}
            onRefresh={refresh}
            onToggleFavorite={handleToggleFavorite}
          />
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </>
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

      <BGGSearchDialog
        open={bggOpen}
        onClose={() => setBggOpen(false)}
        onImport={() => refresh()}
      />
    </Box>
  );
}
