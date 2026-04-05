import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Fab, Stack, CircularProgress } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Game } from "../types/game";
import type { GameSession, GameSessionCreate, GameSessionUpdate } from "../types/session";
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
import ConfirmDialog, { buildSessionDeleteMessage } from "../components/common/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

export default function SessionsPage() {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<GameSession | null>(null);
  const [editSession, setEditSession] = useState<GameSession | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([listSessions(), listGames()])
      .then(([s, g]) => { setSessions(s); setGames(g); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (data: GameSessionCreate | GameSessionUpdate) => {
    setSaving(true);
    try {
      if (editSession) {
        await updateSession(editSession.id, data as GameSessionUpdate);
        setEditSession(null);
      } else {
        await createSession(data as GameSessionCreate);
        setFormOpen(false);
      }
      refresh();
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
        setPendingDeleteSession(null);
        refresh();
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

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <SessionList
          sessions={sessions}
          onDelete={handleDeleteClick}
          onSelect={setDetailSession}
          isAdmin={isAdmin}
        />
      )}

      {isAdmin && (
        <Fab
          color="primary"
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
        onClose={() => { setFormOpen(false); setEditSession(null); }}
        onSave={handleSave}
        editSession={editSession}
        saving={saving}
      />

      <SessionDetail
        session={detailSession}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        isAdmin={isAdmin}
      />
    </Box>
  );
}
