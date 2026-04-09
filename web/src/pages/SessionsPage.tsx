import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Fab,
  Stack,
  CircularProgress,
  Autocomplete,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import type { Game } from "../types/game";
import type { GameSession, GameSessionCreate, GameSessionUpdate } from "../types/session";
import { listGames } from "../api/games";
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
} from "../api/sessions";
import type { SessionFilters } from "../api/sessions";
import SessionList from "../components/sessions/SessionList";
import SessionForm from "../components/sessions/SessionForm";
import SessionDetail from "../components/sessions/SessionDetail";
import ConfirmDialog, { buildSessionDeleteMessage } from "../components/common/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../context/SnackbarContext";
import { extractErrorMessage } from "../utils/errors";
import { filterSessionsByPlayerName } from "../utils/filters";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 20;

export default function SessionsPage() {
  const { isAdmin, canLogSessions } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [quicklogGameId, setQuicklogGameId] = useState<number | null>(() => {
    const id = searchParams.get("quicklog");
    return id ? Number(id) : null;
  });
  const [detailSession, setDetailSession] = useState<GameSession | null>(null);
  const [editSession, setEditSession] = useState<GameSession | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterGameId, setFilterGameId] = useState<number | undefined>(undefined);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");

  const filteredSessions = useMemo(
    () => filterSessionsByPlayerName(sessions, playerSearch),
    [sessions, playerSearch],
  );

  const hasFilters = filterGameId !== undefined || filterDateFrom !== "" || filterDateTo !== "" || playerSearch !== "";

  // Clear quicklog URL param after consuming it
  useEffect(() => {
    if (searchParams.has("quicklog")) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open session form when quicklog game is set and games are loaded
  useEffect(() => {
    if (quicklogGameId !== null && games.length > 0) {
      setFormOpen(true);
    }
  }, [quicklogGameId, games]);

  // Reset page when server-side filters change
  useEffect(() => {
    setPage(0);
  }, [filterGameId, filterDateFrom, filterDateTo]);

  const refresh = useCallback(() => {
    setLoading(true);
    const filters: SessionFilters = {
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    if (filterGameId !== undefined) filters.game_id = filterGameId;
    if (filterDateFrom) filters.date_from = filterDateFrom;
    if (filterDateTo) filters.date_to = filterDateTo;
    Promise.all([listSessions(filters), listGames({ limit: 100 })])
      .then(([s, g]) => {
        setSessions(s.items);
        setTotal(s.total);
        setGames(g.items);
      })
      .finally(() => setLoading(false));
  }, [filterGameId, filterDateFrom, filterDateTo, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (data: GameSessionCreate | GameSessionUpdate) => {
    setSaving(true);
    try {
      if (editSession) {
        await updateSession(editSession.id, data as GameSessionUpdate);
        showSnackbar("Session updated successfully");
        setEditSession(null);
      } else {
        await createSession(data as GameSessionCreate);
        showSnackbar("Session created successfully");
        setFormOpen(false);
      }
      refresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (session: GameSession) => {
    setDetailSession(null);
    setEditSession(session);
  };

  const handleDeleteClick = (session: GameSession) => {
    setPendingDeleteSession(session);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteSession) {
      setSaving(true);
      try {
        await deleteSession(pendingDeleteSession.id);
        showSnackbar("Session deleted successfully");
        setPendingDeleteSession(null);
        refresh();
      } catch (err) {
        showSnackbar(extractErrorMessage(err), "error");
      } finally {
        setSaving(false);
      }
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
        <Typography variant="h4">Game Sessions</Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems={{ sm: "center" }}
        flexWrap="wrap"
        useFlexGap
      >
        <Autocomplete
          size="small"
          options={games}
          getOptionLabel={(g) => g.name}
          value={games.find((g) => g.id === filterGameId) ?? null}
          onChange={(_, g) => setFilterGameId(g?.id ?? undefined)}
          renderInput={(params) => (
            <TextField {...params} placeholder="Filter by game" />
          )}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          type="date"
          label="From"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          placeholder="Search by player..."
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 180 }}
        />
        {hasFilters && (
          <Button
            size="small"
            onClick={() => {
              setFilterGameId(undefined);
              setFilterDateFrom("");
              setFilterDateTo("");
              setPlayerSearch("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredSessions.length === 0 && hasFilters ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No sessions match your filters.
        </Typography>
      ) : (
        <SessionList
          sessions={filteredSessions}
          onDelete={handleDeleteClick}
          onSelect={setDetailSession}
          isAdmin={isAdmin}
          total={total}
          page={page}
          rowsPerPage={PAGE_SIZE}
          onPageChange={setPage}
          onAddNew={canLogSessions ? () => setFormOpen(true) : undefined}
        />
      )}

      {canLogSessions && (
        <Fab
          color="primary"
          aria-label="Log new session"
          sx={{ position: "fixed", bottom: 24, right: 24 }}
          onClick={() => setFormOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      <ConfirmDialog
        open={pendingDeleteSession !== null}
        title="Delete Session"
        message={
          pendingDeleteSession
            ? buildSessionDeleteMessage(pendingDeleteSession.game.name, pendingDeleteSession.played_at)
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteSession(null)}
        loading={saving}
      />

      <SessionForm
        open={formOpen || editSession !== null}
        games={games}
        defaultGame={quicklogGameId !== null ? games.find((g) => g.id === quicklogGameId) ?? null : null}
        onClose={() => { setFormOpen(false); setEditSession(null); setQuicklogGameId(null); }}
        onSave={handleSave}
        editSession={editSession}
        saving={saving}
      />

      <SessionDetail
        session={detailSession}
        games={games}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        canEdit={canLogSessions}
      />
    </Box>
  );
}
