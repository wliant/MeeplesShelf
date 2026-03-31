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
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import type { Game, GameBrief } from "../../types/game";
import type { Player, GameSessionCreate, GameSession } from "../../types/session";
import type { PlayerGroup } from "../../types/group";
import { listPlayers, createPlayer } from "../../api/sessions";
import { listGroups } from "../../api/groups";
import { getGame } from "../../api/games";
import ScoreSheet from "./ScoreSheet";

interface Props {
  open: boolean;
  games: GameBrief[];
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
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isCooperative, setIsCooperative] = useState(false);
  const [cooperativeResult, setCooperativeResult] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [location, setLocation] = useState("");
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [tiebreakerWinnerId, setTiebreakerWinnerId] = useState<number | null>(null);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const gameSelectRef = useRef(0);

  useEffect(() => {
    if (open) {
      Promise.all([listPlayers(), listGroups()]).then(([players, grps]) => {
        setAllPlayers(players);
        setGroups(grps);

        if (session) {
          // Pre-populate for editing
          getGame(session.game_id).then((g) => setSelectedGame(g)).catch(() => setSelectedGame(null));
          setPlayedAt(new Date(session.played_at).toISOString().slice(0, 16));
          setNotes(session.notes ?? "");
          setDurationMinutes(session.duration_minutes ?? "");
          setIsCooperative(session.is_cooperative ?? false);
          setCooperativeResult(session.cooperative_result ?? "");
          setLocation(session.location ?? "");
          setIsIncomplete(session.is_incomplete ?? false);
          setTiebreakerWinnerId(session.tiebreaker_winner_id ?? null);

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
          setDurationMinutes("");
          setIsCooperative(false);
          setCooperativeResult("");
          setLocation("");
          setIsIncomplete(false);
          setTiebreakerWinnerId(null);
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
      duration_minutes: durationMinutes || null,
      is_cooperative: isCooperative,
      cooperative_result: isCooperative && cooperativeResult ? cooperativeResult : null,
      location: location || null,
      is_incomplete: isIncomplete,
      tiebreaker_winner_id: tiebreakerWinnerId,
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
            value={games.find((g) => g.id === selectedGame?.id) ?? null}
            onChange={async (_, v) => {
              if (v) {
                const requestId = ++gameSelectRef.current;
                const full = await getGame(v.id);
                if (gameSelectRef.current === requestId) {
                  setSelectedGame(full);
                }
              } else {
                ++gameSelectRef.current;
                setSelectedGame(null);
              }
            }}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
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

          {groups.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                Fill from group:
              </Typography>
              {groups.map((g) => (
                <Chip
                  key={g.id}
                  label={g.name}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const newPlayers = [...selectedPlayers];
                    for (const m of g.members) {
                      if (!newPlayers.find((p) => p.id === m.id)) {
                        newPlayers.push(m);
                      }
                    }
                    setSelectedPlayers(newPlayers);
                  }}
                />
              ))}
            </Stack>
          )}

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

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Duration (minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              sx={{ width: 180 }}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isCooperative}
                  onChange={(e) => {
                    setIsCooperative(e.target.checked);
                    if (!e.target.checked) setCooperativeResult("");
                  }}
                />
              }
              label="Cooperative"
            />
            {isCooperative && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Result</InputLabel>
                <Select
                  value={cooperativeResult}
                  label="Result"
                  onChange={(e) => setCooperativeResult(e.target.value)}
                >
                  <MenuItem value="">Undecided</MenuItem>
                  <MenuItem value="win">Win</MenuItem>
                  <MenuItem value="loss">Loss</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Location (optional)"
              placeholder="e.g. Home, Game Store, Convention"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isIncomplete}
                  onChange={(e) => setIsIncomplete(e.target.checked)}
                />
              }
              label="Incomplete"
            />
          </Stack>

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
