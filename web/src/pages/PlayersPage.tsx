import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import type { PlayerWithCount } from "../types/session";
import { listPlayers, renamePlayer, deletePlayer } from "../api/sessions";
import PlayerList from "../components/players/PlayerList";
import ConfirmDialog, { buildPlayerDeleteMessage } from "../components/common/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../context/SnackbarContext";
import { extractErrorMessage } from "../utils/errors";

export default function PlayersPage() {
  const { isAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [players, setPlayers] = useState<PlayerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeletePlayer, setPendingDeletePlayer] = useState<PlayerWithCount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim().toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, searchQuery]);

  const refresh = useCallback(() => {
    setLoading(true);
    listPlayers()
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRename = async (id: number, name: string) => {
    try {
      await renamePlayer(id, name);
      showSnackbar("Player renamed successfully");
      refresh();
    } catch (err) {
      showSnackbar(extractErrorMessage(err), "error");
    }
  };

  const handleDeleteClick = (player: PlayerWithCount) => {
    setPendingDeletePlayer(player);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeletePlayer) {
      setSaving(true);
      try {
        await deletePlayer(pendingDeletePlayer.id);
        showSnackbar("Player deleted successfully");
        setPendingDeletePlayer(null);
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
        <Typography variant="h4">Players</Typography>
      </Stack>

      {!loading && players.length > 0 && (
        <TextField
          size="small"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2, minWidth: { xs: 0, sm: 200 }, width: { xs: '100%', sm: 'auto' } }}
        />
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredPlayers.length === 0 && searchQuery.trim() ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No players match your search.
        </Typography>
      ) : (
        <PlayerList
          players={filteredPlayers}
          isAdmin={isAdmin}
          onRename={handleRename}
          onDelete={handleDeleteClick}
        />
      )}

      <ConfirmDialog
        open={pendingDeletePlayer !== null}
        title="Delete Player"
        message={
          pendingDeletePlayer
            ? buildPlayerDeleteMessage(pendingDeletePlayer.name, pendingDeletePlayer.session_count)
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeletePlayer(null)}
        loading={saving}
      />
    </Box>
  );
}
