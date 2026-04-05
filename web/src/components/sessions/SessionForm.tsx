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
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import type { Game } from "../../types/game";
import type { Player, GameSession, GameSessionCreate, GameSessionUpdate } from "../../types/session";
import { listPlayers, createPlayer } from "../../api/sessions";
import { mergeScoringSpec } from "../../utils/scoring";
import ScoreSheet from "./ScoreSheet";

interface Props {
  open: boolean;
  games: Game[];
  onClose: () => void;
  onSave: (data: GameSessionCreate | GameSessionUpdate) => void;
  editSession?: GameSession | null;
  saving?: boolean;
}

export default function SessionForm({ open, games, onClose, onSave, editSession, saving = false }: Props) {
  const isEditMode = !!editSession;
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
  const [selectedExpansionIds, setSelectedExpansionIds] = useState<Set<number>>(
    new Set()
  );

  const effectiveSpec = useMemo(() => {
    if (!selectedGame?.scoring_spec) return null;
    if (selectedExpansionIds.size === 0) return selectedGame.scoring_spec;

    const patches = selectedGame.expansions
      .filter((exp) => selectedExpansionIds.has(exp.id))
      .map((exp) => exp.scoring_spec_patch);

    return mergeScoringSpec(selectedGame.scoring_spec, patches);
  }, [selectedGame, selectedExpansionIds]);

  useEffect(() => {
    if (open) {
      listPlayers().then(setAllPlayers);
      if (editSession) {
        const game = games.find((g) => g.id === editSession.game_id) ?? null;
        setSelectedGame(game);
        setPlayedAt(new Date(editSession.played_at).toISOString().slice(0, 16));
        setNotes(editSession.notes ?? "");
        setSelectedExpansionIds(new Set(editSession.expansions.map((e) => e.id)));
      } else {
        setSelectedGame(null);
        setSelectedPlayers([]);
        setScoreData({});
        setSelectedExpansionIds(new Set());
        setPlayedAt(new Date().toISOString().slice(0, 16));
        setNotes("");
      }
    }
  }, [open]);

  useEffect(() => {
    setPlayers(allPlayers);
    if (open && editSession && allPlayers.length > 0) {
      const selected = editSession.players
        .map((sp) => allPlayers.find((p) => p.id === sp.player_id))
        .filter((p): p is Player => p !== undefined);
      setSelectedPlayers(selected);
      const scores: Record<number, Record<string, unknown>> = {};
      for (const sp of editSession.players) {
        scores[sp.player_id] = { ...sp.score_data };
      }
      setScoreData(scores);
    }
  }, [allPlayers]);

  useEffect(() => {
    if (!isEditMode) {
      setSelectedExpansionIds(new Set());
      setScoreData({});
    }
  }, [selectedGame]);

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
    const playerData = selectedPlayers.map((p) => ({
      player_id: p.id,
      score_data: scoreData[p.id] ?? {},
    }));
    if (isEditMode) {
      onSave({
        played_at: new Date(playedAt).toISOString(),
        notes: notes || undefined,
        expansion_ids: [...selectedExpansionIds],
        players: playerData,
      } as GameSessionUpdate);
    } else {
      onSave({
        game_id: selectedGame.id,
        played_at: new Date(playedAt).toISOString(),
        notes: notes || undefined,
        expansion_ids: [...selectedExpansionIds],
        players: playerData,
      });
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Game Session" : "Log Game Session"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={games}
            getOptionLabel={(g) => g.name}
            value={selectedGame}
            onChange={(_, v) => setSelectedGame(v)}
            disabled={isEditMode}
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

          {selectedGame && selectedGame.expansions.length > 0 && (
            <>
              <Typography variant="subtitle2">Expansions</Typography>
              <FormGroup row>
                {selectedGame.expansions.map((exp) => (
                  <FormControlLabel
                    key={exp.id}
                    control={
                      <Checkbox
                        checked={selectedExpansionIds.has(exp.id)}
                        onChange={(e) => {
                          setSelectedExpansionIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(exp.id);
                            else next.delete(exp.id);
                            return next;
                          });
                        }}
                      />
                    }
                    label={exp.name}
                  />
                ))}
              </FormGroup>
            </>
          )}

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

          {effectiveSpec && selectedPlayers.length > 0 && (
            <>
              <Typography variant="subtitle1">Score Entry</Typography>
              <ScoreSheet
                spec={effectiveSpec}
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
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedGame || selectedPlayers.length === 0 || saving}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : isEditMode ? "Update Session" : "Save Session"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
