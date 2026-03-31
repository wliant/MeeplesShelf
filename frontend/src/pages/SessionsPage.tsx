import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Fab, Stack, Skeleton } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Game } from "../types/game";
import type { GameSession, GameSessionCreate } from "../types/session";
import { listGames } from "../api/games";
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
import { useNotify } from "../components/common/useNotify";
import type { Player } from "../types/session";
import { listPlayers } from "../api/sessions";

export interface SessionFilters {
  gameId?: number;
  playerId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GameSession | null>(
    null
  );
  const [detailSession, setDetailSession] = useState<GameSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GameSession | null>(null);
  const [filters, setFilters] = useState<SessionFilters>({});
  const { success, error } = useNotify();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, gamesData, playersData] = await Promise.all([
        listSessions(filters),
        listGames(),
        listPlayers(),
      ]);
      setSessions(sessionsData);
      setGames(gamesData);
      setPlayers(playersData);
    } catch {
      error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [filters, error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      ) : (
        <SessionList
          sessions={sessions}
          onDelete={(id) => {
            const s = sessions.find((s) => s.id === id);
            if (s) setDeleteTarget(s);
          }}
          onSelect={setDetailSession}
        />
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
