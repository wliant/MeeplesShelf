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
import type { Game } from "../../types/game";
import { addExpansion, deleteExpansion } from "../../api/games";

interface Props {
  game: Game;
  onRefresh: () => void;
}

export default function ExpansionList({ game, onRefresh }: Props) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addExpansion(game.id, { name: name.trim() });
    setName("");
    setAdding(false);
    onRefresh();
  };

  const handleDelete = async (expansionId: number) => {
    await deleteExpansion(game.id, expansionId);
    onRefresh();
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
              <IconButton
                edge="end"
                size="small"
                onClick={() => handleDelete(exp.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText primary={exp.name} />
          </ListItem>
        ))}
      </List>
      {adding ? (
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
      )}
    </>
  );
}
