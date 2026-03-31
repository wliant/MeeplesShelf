import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import type { GameSession } from "../../types/session";

interface Props {
  session: GameSession | null;
  onClose: () => void;
  onEdit: (session: GameSession) => void;
}

export default function SessionDetail({ session, onClose, onEdit }: Props) {
  if (!session) return null;

  return (
    <Dialog open={!!session} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {session.game.name} -{" "}
        {new Date(session.played_at).toLocaleDateString()}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {session.notes && (
            <Typography variant="body2" color="text.secondary">
              {session.notes}
            </Typography>
          )}

          {session.expansions.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Typography variant="body2">Expansions:</Typography>
              {session.expansions.map((e) => (
                <Chip key={e.id} label={e.name} size="small" />
              ))}
            </Stack>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Total Score</TableCell>
                  <TableCell align="center">Winner</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {session.players.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell>{sp.player.name}</TableCell>
                    <TableCell align="center">
                      {sp.total_score ?? "-"}
                    </TableCell>
                    <TableCell align="center">
                      {sp.winner ? (
                        <Chip label="Winner" color="primary" size="small" />
                      ) : (
                        ""
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle2">Score Breakdown</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  {session.players.map((sp) => (
                    <TableCell key={sp.id} align="center">
                      {sp.player.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(session.players[0]?.score_data ?? {}).map(
                  (key) => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      {session.players.map((sp) => (
                        <TableCell key={sp.id} align="center">
                          {formatScoreValue(sp.score_data[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onEdit(session)}>Edit</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function formatScoreValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(value);
}
