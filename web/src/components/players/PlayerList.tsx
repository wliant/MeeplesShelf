import { useState, useRef, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
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
  People as PeopleIcon,
} from "@mui/icons-material";
import type { PlayerWithCount } from "../../types/session";
import useSortableTable from "../../hooks/useSortableTable";
import { formatLastPlayed } from "../../utils/stats";

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
  const { sorted, orderBy, order, onSort } = useSortableTable(players, "name", "asc");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const navigate = useNavigate();

  if (players.length === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 6 }}>
        <PeopleIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          No players yet.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Players are created when you log a game session.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/sessions")}>
          Go to Sessions
        </Button>
      </Box>
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
    return (
      <Link
        component={RouterLink}
        to={`/players/${player.id}`}
        color="inherit"
        underline="hover"
      >
        {player.name}
      </Link>
    );
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
                    Last played: {formatLastPlayed(p.last_played)}
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
            <TableCell>
              <TableSortLabel active={orderBy === "name"} direction={orderBy === "name" ? order : "asc"} onClick={() => onSort("name")}>
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel active={orderBy === "session_count"} direction={orderBy === "session_count" ? order : "asc"} onClick={() => onSort("session_count")}>
                Sessions
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel active={orderBy === "last_played"} direction={orderBy === "last_played" ? order : "asc"} onClick={() => onSort("last_played")}>
                Last Played
              </TableSortLabel>
            </TableCell>
            {isAdmin && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{renderNameCell(p)}</TableCell>
              <TableCell>{p.session_count}</TableCell>
              <TableCell>{formatLastPlayed(p.last_played)}</TableCell>
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
