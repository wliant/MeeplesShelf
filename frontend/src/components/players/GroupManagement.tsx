import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  CircularProgress,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import type { PlayerGroup } from "../../types/group";
import type { Player } from "../../types/session";
import {
  listGroups,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
} from "../../api/groups";
import { listPlayers } from "../../api/sessions";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GroupManagement({ open, onClose }: Props) {
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([listGroups(), listPlayers()]);
      setGroups(g);
      setPlayers(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim());
    setNewName("");
    refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteGroup(id);
    refresh();
  };

  const handleAddMember = async (groupId: number, playerId: number) => {
    await addGroupMember(groupId, playerId);
    refresh();
  };

  const handleRemoveMember = async (groupId: number, playerId: number) => {
    await removeGroupMember(groupId, playerId);
    refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Player Groups</DialogTitle>
      <DialogContent>
        {loading && groups.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress /></Stack>
        ) : (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="New Group"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" size="small" onClick={handleCreate}>
              Create
            </Button>
          </Stack>

          {groups.map((group) => {
            const memberIds = new Set(group.members.map((m) => m.id));
            const available = players.filter((p) => !memberIds.has(p.id));
            return (
              <Stack key={group.id} spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2">{group.name}</Typography>
                  <IconButton size="small" onClick={() => handleDelete(group.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {group.members.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      size="small"
                      onDelete={() => handleRemoveMember(group.id, m.id)}
                    />
                  ))}
                </Stack>
                {available.length > 0 && (
                  <Autocomplete
                    size="small"
                    options={available}
                    getOptionLabel={(p) => p.name}
                    onChange={(_, v) => {
                      if (v) handleAddMember(group.id, v.id);
                    }}
                    value={null}
                    renderInput={(params) => (
                      <TextField {...params} label="Add player" size="small" />
                    )}
                  />
                )}
              </Stack>
            );
          })}
        </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
