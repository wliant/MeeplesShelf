import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Stack,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import type { GameSession } from "../../types/session";

interface Props {
  sessions: GameSession[];
  onDelete: (id: number) => void;
  onSelect: (session: GameSession) => void;
  isAdmin: boolean;
}

export default function SessionList({ sessions, onDelete, onSelect, isAdmin }: Props) {
  if (sessions.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        No sessions logged yet.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Game</TableCell>
            <TableCell>Players</TableCell>
            <TableCell>Winner</TableCell>
            {isAdmin && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions.map((s) => {
            const winners = s.players.filter((p) => p.winner);
            return (
              <TableRow
                key={s.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => onSelect(s)}
              >
                <TableCell>
                  {new Date(s.played_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{s.game.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {s.players.map((p) => (
                      <Chip
                        key={p.id}
                        label={`${p.player.name}${p.total_score != null ? ` (${p.total_score})` : ""}`}
                        size="small"
                        color={p.winner ? "primary" : "default"}
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  {winners.map((w) => w.player.name).join(", ") || "-"}
                </TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
