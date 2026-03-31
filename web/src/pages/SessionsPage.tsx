import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Fab, Stack, Skeleton, TablePagination, Button, Menu, MenuItem } from "@mui/material";
import { Add as AddIcon, Download as DownloadIcon, SportsEsports as SportsIcon } from "@mui/icons-material";
import type { GameBrief } from "../types/game";
import type { GameSession, GameSessionCreate } from "../types/session";
import { listGameOptions } from "../api/games";
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
} from "../api/sessions";
import SessionList from "../components/sessions/SessionList";
import SessionForm from "../components/sessions/SessionForm";
import SessionDetail from "../components/sessions/SessionDetail";
import SessionFilterBar from "../components/sessions/SessionFilterBar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import { useNotify } from "../components/common/useNotify";
import { exportSessions } from "../api/export";
import type { Player } from "../types/session";
import { listPlayers } from "../api/sessions";

export interface SessionFilters {
  gameId?: number;
  playerId?: number;
  dateFrom?: string;
  dateTo?: string;
  isIncomplete?: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [total, setTotal] = useState(0);
  const [games, setGames] = useState<GameBrief[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GameSession | null>(
    null
  );
  const [detailSession, setDetailSession] = useState<GameSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GameSession | null>(null);
  const [filters, setFilters] = useState<SessionFilters>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const { success, error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, gamesData, playersData] = await Promise.all([
        listSessions({ ...filters, offset: page * rowsPerPage, limit: rowsPerPage }),
        listGameOptions(),
        listPlayers(),
      ]);
      setSessions(sessionsData.items);
      setTotal(sessionsData.total);
      setGames(gamesData);
      setPlayers(playersData);
    } catch {
      error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleSave = async (data: GameSessionCreate) => {
    try {
      if (editingSession) {
        await updateSession(editingSession.id, data);
        success("Session updated");
      } else {
        await createSession(data);
        success("Session logged");
      }
      setFormOpen(false);
      setEditingSession(null);
      refresh();
    } catch {
      error("Failed to save session");
    }
  };

  const handleEdit = (session: GameSession) => {
    setDetailSession(null);
    setEditingSession(session);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSession(deleteTarget.id);
      success("Session deleted");
      setDeleteTarget(null);
      refresh();
    } catch {
      error("Failed to delete session");
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
        <Stack direction="row" spacing={1}>
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
            <MenuItem onClick={async () => { setExportAnchor(null); try { await exportSessions("csv"); success("Sessions exported"); } catch { error("Failed to export"); } }}>
              CSV
            </MenuItem>
            <MenuItem onClick={async () => { setExportAnchor(null); try { await exportSessions("json"); success("Sessions exported"); } catch { error("Failed to export"); } }}>
              JSON
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <SessionFilterBar
        games={games}
        players={players}
        filters={filters}
        onChange={setFilters}
      />

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<SportsIcon sx={{ fontSize: "inherit" }} />}
          title="No sessions yet"
          description="Log your first game session to start tracking your plays."
          actions={[
            { label: "Log Session", onClick: () => { setEditingSession(null); setFormOpen(true); } },
          ]}
        />
      ) : (
        <>
          <SessionList
            sessions={sessions}
            onDelete={(id) => {
              const s = sessions.find((s) => s.id === id);
              if (s) setDeleteTarget(s);
            }}
            onSelect={setDetailSession}
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
          setEditingSession(null);
          setFormOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      <SessionForm
        open={formOpen}
        games={games}
        session={editingSession}
        onClose={() => {
          setFormOpen(false);
          setEditingSession(null);
        }}
        onSave={handleSave}
      />

      <SessionDetail
        session={detailSession}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        onRefresh={refresh}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Session"
        message={`Are you sure you want to delete this ${deleteTarget?.game.name} session from ${deleteTarget ? new Date(deleteTarget.played_at).toLocaleDateString() : ""}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
