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
import type { Player, GameSessionCreate } from "../../types/session";
import { listPlayers, createPlayer } from "../../api/sessions";
import ScoreSheet from "./ScoreSheet";

interface Props {
  open: boolean;
  games: Game[];
  onClose: () => void;
  onSave: (data: GameSessionCreate) => void;
}

export default function SessionForm({ open, games, onClose, onSave }: Props) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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
      listPlayers().then(setAllPlayers);
      setSelectedGame(null);
      setSelectedPlayers([]);
      setScoreData({});
      setPlayedAt(new Date().toISOString().slice(0, 16));
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    setPlayers(allPlayers);
  }, [allPlayers]);

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Log Game Session</DialogTitle>
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
              options={players.filter(
                (p) => !selectedPlayers.find((sp) => sp.id === p.id)
              )}
              getOptionLabel={(p) => typeof p === "string" ? p : p.name}
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
          Save Session
        </Button>
      </DialogActions>
    </Dialog>
  );
}
