import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import type { PlayerWithCount } from "../../types/session";

interface Props {
  players: PlayerWithCount[];
  isAdmin: boolean;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (player: PlayerWithCount) => void;
}

export default function PlayerList({
  players,
  isAdmin,
  onRename,
  onDelete,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (players.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        No players yet. Players are created when you log a game session.
      </Typography>
    );
  }

  const startEdit = (player: PlayerWithCount) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const commitEdit = async (player: PlayerWithCount) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === player.name) {
      cancelEdit();
      return;
    }
    await onRename(player.id, trimmed);
    setEditingId(null);
    setEditName("");
  };

  const renderNameCell = (player: PlayerWithCount) => {
    if (editingId === player.id) {
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            size="small"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit(player);
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={() => commitEdit(player)}
            inputRef={inputRef}
            sx={{ minWidth: 120 }}
          />
          <Tooltip title="Cancel editing">
            <IconButton size="small" aria-label="Cancel editing" onMouseDown={(e) => e.preventDefault()} onClick={cancelEdit}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    }
    return <Typography>{player.name}</Typography>;
  };

  if (isMobile) {
    return (
      <Paper variant="outlined">
        <Stack divider={<Divider />}>
          {players.map((p) => (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 0, border: 0 }}>
              <CardContent sx={{ pb: isAdmin ? 0.5 : undefined, "&:last-child": { pb: isAdmin ? 0.5 : 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    {renderNameCell(p)}
                  </Stack>
                  {isAdmin && editingId !== p.id && (
                    <Stack direction="row" spacing={0}>
                      <Tooltip title="Edit player">
                        <IconButton size="small" aria-label={`Edit ${p.name}`} onClick={() => startEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete player">
                        <IconButton size="small" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Added {new Date(p.created_at).toLocaleDateString()}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Sessions</TableCell>
            <TableCell>Created</TableCell>
            {isAdmin && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{renderNameCell(p)}</TableCell>
              <TableCell>{p.session_count}</TableCell>
              <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
              {isAdmin && (
                <TableCell align="right">
                  {editingId !== p.id && (
                    <Tooltip title="Edit player">
                      <IconButton size="small" aria-label={`Edit ${p.name}`} onClick={() => startEdit(p)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete player">
                    <IconButton size="small" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
