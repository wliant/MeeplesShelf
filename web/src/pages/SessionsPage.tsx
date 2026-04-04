import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Fab, Stack } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Game } from "../types/game";
import type { GameSession, GameSessionCreate } from "../types/session";
import { listGames } from "../api/games";
import {
  listSessions,
  createSession,
  deleteSession,
} from "../api/sessions";
import SessionList from "../components/sessions/SessionList";
import SessionForm from "../components/sessions/SessionForm";
import SessionDetail from "../components/sessions/SessionDetail";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<GameSession | null>(null);

  const refresh = useCallback(() => {
    listSessions().then(setSessions);
    listGames().then(setGames);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (data: GameSessionCreate) => {
    await createSession(data);
    setFormOpen(false);
    refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteSession(id);
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
        <Typography variant="h4">Game Sessions</Typography>
      </Stack>

      <SessionList
        sessions={sessions}
        onDelete={handleDelete}
        onSelect={setDetailSession}
      />

      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => setFormOpen(true)}
      >
        <AddIcon />
      </Fab>

      <SessionForm
        open={formOpen}
        games={games}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <SessionDetail
        session={detailSession}
        onClose={() => setDetailSession(null)}
      />
    </Box>
  );
}
