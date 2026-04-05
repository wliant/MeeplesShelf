import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useState } from "react";
import type { Game, Expansion } from "../../types/game";
import { addExpansion, deleteExpansion } from "../../api/games";
import ConfirmDialog, { buildExpansionDeleteMessage } from "../common/ConfirmDialog";

interface Props {
  game: Game;
  onRefresh: () => void;
  isAdmin: boolean;
}

export default function ExpansionList({ game, onRefresh, isAdmin }: Props) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingDeleteExpansion, setPendingDeleteExpansion] = useState<Expansion | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addExpansion(game.id, { name: name.trim() });
    setName("");
    setAdding(false);
    onRefresh();
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteExpansion) {
      await deleteExpansion(game.id, pendingDeleteExpansion.id);
      setPendingDeleteExpansion(null);
      onRefresh();
    }
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Expansions
      </Typography>
      {game.expansions.length === 0 && !adding && (
        <Typography variant="body2" color="text.secondary">
          No expansions
        </Typography>
      )}
      <List dense disablePadding>
        {game.expansions.map((exp) => (
          <ListItem
            key={exp.id}
            secondaryAction={
              isAdmin ? (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => setPendingDeleteExpansion(exp)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              ) : undefined
            }
          >
            <ListItemText primary={exp.name} />
          </ListItem>
        ))}
      </List>
      {isAdmin && (
        adding ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Expansion name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <Button size="small" onClick={handleAdd}>
              Add
            </Button>
            <Button size="small" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </Stack>
        ) : (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAdding(true)}
            sx={{ mt: 1 }}
          >
            Add Expansion
          </Button>
        )
      )}
      <ConfirmDialog
        open={pendingDeleteExpansion !== null}
        title="Delete Expansion"
        message={
          pendingDeleteExpansion
            ? buildExpansionDeleteMessage(pendingDeleteExpansion.name, game.name)
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteExpansion(null)}
      />
    </>
  );
}
