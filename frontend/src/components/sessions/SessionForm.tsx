import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Chip,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import type { Game } from "../../types/game";
import type { Player, GameSessionCreate, GameSession } from "../../types/session";
import { listPlayers, createPlayer } from "../../api/sessions";
import ScoreSheet from "./ScoreSheet";

interface Props {
  open: boolean;
  games: Game[];
  session?: GameSession | null;
  onClose: () => void;
  onSave: (data: GameSessionCreate) => void;
}

export default function SessionForm({
  open,
  games,
  session,
  onClose,
  onSave,
}: Props) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [scoreData, setScoreData] = useState<
    Record<number, Record<string, unknown>>
  >({});
  const [playedAt, setPlayedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    if (open) {
      listPlayers().then((players) => {
        setAllPlayers(players);

        if (session) {
          // Pre-populate for editing
          const game = games.find((g) => g.id === session.game_id) ?? null;
          setSelectedGame(game);
          setPlayedAt(new Date(session.played_at).toISOString().slice(0, 16));
          setNotes(session.notes ?? "");

          const sessionPlayerObjs = session.players.map((sp) => sp.player);
          setSelectedPlayers(sessionPlayerObjs);

          const sd: Record<number, Record<string, unknown>> = {};
          for (const sp of session.players) {
            sd[sp.player_id] = sp.score_data;
          }
          setScoreData(sd);
        } else {
          setSelectedGame(null);
          setSelectedPlayers([]);
          setScoreData({});
          setPlayedAt(new Date().toISOString().slice(0, 16));
          setNotes("");
        }
      });
    }
  }, [open, session, games]);

  const availablePlayers = allPlayers.filter(
    (p) => !selectedPlayers.find((sp) => sp.id === p.id)
  );

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const existing = allPlayers.find(
      (p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
    );
    if (existing) {
      if (!selectedPlayers.find((p) => p.id === existing.id)) {
        setSelectedPlayers([...selectedPlayers, existing]);
      }
    } else {
      const player = await createPlayer(newPlayerName.trim());
      setAllPlayers([...allPlayers, player]);
      setSelectedPlayers([...selectedPlayers, player]);
    }
    setNewPlayerName("");
  };

  const handleScoreChange = (
    playerId: number,
    fieldId: string,
    value: unknown
  ) => {
    setScoreData((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] ?? {}),
        [fieldId]: value,
      },
    }));
  };

  const handleSubmit = () => {
    if (!selectedGame) return;
    onSave({
      game_id: selectedGame.id,
      played_at: new Date(playedAt).toISOString(),
      notes: notes || undefined,
      players: selectedPlayers.map((p) => ({
        player_id: p.id,
        score_data: scoreData[p.id] ?? {},
      })),
    });
  };

  const isEditing = !!session;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {isEditing ? "Edit Game Session" : "Log Game Session"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={games}
            getOptionLabel={(g) => g.name}
            value={selectedGame}
            onChange={(_, v) => setSelectedGame(v)}
            renderInput={(params) => (
              <TextField {...params} label="Select Game" />
            )}
          />

          <TextField
            label="Played At"
            type="datetime-local"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Autocomplete
              options={availablePlayers}
              getOptionLabel={(p) => (typeof p === "string" ? p : p.name)}
              inputValue={newPlayerName}
              onInputChange={(_, v) => setNewPlayerName(v)}
              onChange={(_, v) => {
                if (v && typeof v !== "string") {
                  setSelectedPlayers([...selectedPlayers, v]);
                  setNewPlayerName("");
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Add Player" size="small" />
              )}
              sx={{ flex: 1 }}
              freeSolo
            />
            <Button variant="outlined" size="small" onClick={handleAddPlayer}>
              Add
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedPlayers.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                onDelete={() =>
                  setSelectedPlayers(
                    selectedPlayers.filter((sp) => sp.id !== p.id)
                  )
                }
              />
            ))}
          </Stack>

          {selectedGame?.scoring_spec && selectedPlayers.length > 0 && (
            <>
              <Typography variant="subtitle1">Score Entry</Typography>
              <ScoreSheet
                spec={selectedGame.scoring_spec}
                players={selectedPlayers}
                scoreData={scoreData}
                onChange={handleScoreChange}
              />
            </>
          )}

          <TextField
            label="Notes (optional)"
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedGame || selectedPlayers.length === 0}
        >
          {isEditing ? "Update Session" : "Save Session"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
