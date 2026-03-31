import {
  Stack,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import type { GameBrief } from "../../types/game";
import type { Player } from "../../types/session";
import type { SessionFilters } from "../../pages/SessionsPage";

interface Props {
  games: GameBrief[];
  players: Player[];
  filters: SessionFilters;
  onChange: (filters: SessionFilters) => void;
}

export default function SessionFilterBar({
  games,
  players,
  filters,
  onChange,
}: Props) {
  const hasFilters =
    filters.gameId || filters.playerId || filters.dateFrom || filters.dateTo;

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap" useFlexGap>
      <Autocomplete
        options={games}
        getOptionLabel={(g) => g.name}
        value={games.find((g) => g.id === filters.gameId) ?? null}
        onChange={(_, v) => onChange({ ...filters, gameId: v?.id })}
        renderInput={(params) => (
          <TextField {...params} label="Game" size="small" />
        )}
        sx={{ minWidth: 200 }}
        size="small"
      />
      <Autocomplete
        options={players}
        getOptionLabel={(p) => p.name}
        value={players.find((p) => p.id === filters.playerId) ?? null}
        onChange={(_, v) => onChange({ ...filters, playerId: v?.id })}
        renderInput={(params) => (
          <TextField {...params} label="Player" size="small" />
        )}
        sx={{ minWidth: 200 }}
        size="small"
      />
      <TextField
        label="From"
        type="date"
        size="small"
        value={filters.dateFrom ?? ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 160 }}
      />
      <TextField
        label="To"
        type="date"
        size="small"
        value={filters.dateTo ?? ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 160 }}
      />
      {hasFilters && (
        <Button size="small" onClick={() => onChange({})}>
          Clear
        </Button>
      )}
    </Stack>
  );
}
