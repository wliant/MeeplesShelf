import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
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
  Link as MuiLink,
} from "@mui/material";
import {
  EmojiEvents as EmojiEventsIcon,
  Notes as NotesIcon,
  Extension as ExtensionIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { Game } from "../../types/game";
import type { GameSession } from "../../types/session";
import { formatRelativeTime } from "../../utils/stats";

interface Props {
  session: GameSession | null;
  games?: Game[];
  onClose: () => void;
  onEdit?: (session: GameSession) => void;
  canEdit?: boolean;
}

export default function SessionDetail({ session, games, onClose, onEdit, canEdit }: Props) {
  const navigate = useNavigate();

  if (!session) return null;

  const game = games?.find((g) => g.id === session.game_id);

  // Use scoring spec fields if available (shows all fields with labels), otherwise fall back to score_data keys
  const scoreFieldKeys: { key: string; label: string }[] = game?.scoring_spec
    ? game.scoring_spec.fields.map((f) => ({ key: f.id, label: f.label }))
    : Object.keys(session.players[0]?.score_data ?? {}).map((k) => ({ key: k, label: k }));

  return (
    <Dialog open={!!session} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          {game?.image_url && (
            <Box
              component="img"
              src={game.image_url}
              alt={game.name}
              sx={{ width: 56, height: 56, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
            />
          )}
          <Box>
            <MuiLink
              component="button"
              variant="h6"
              underline="hover"
              onClick={() => {
                onClose();
                navigate(`/inventory?search=${encodeURIComponent(session.game.name)}`);
              }}
              sx={{ cursor: "pointer", verticalAlign: "baseline" }}
            >
              {session.game.name}
            </MuiLink>
            <Typography variant="body2" color="text.secondary">
              {new Date(session.played_at).toLocaleDateString()}
              {" \u2014 "}
              {formatRelativeTime(session.played_at)}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {session.notes && (
            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                <NotesIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Notes</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {session.notes}
              </Typography>
            </Box>
          )}

          {session.expansions.length > 0 && (
            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                <ExtensionIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Expansions</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {session.expansions.map((e) => (
                  <Chip key={e.id} label={e.name} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
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
                  <TableRow
                    key={sp.id}
                    sx={sp.winner ? { bgcolor: (theme) => `${theme.palette.primary.main}14` } : undefined}
                  >
                    <TableCell sx={{ fontWeight: sp.winner ? "bold" : "normal" }}>
                      {sp.player.name}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: sp.winner ? "bold" : "normal" }}>
                      {sp.total_score ?? "-"}
                    </TableCell>
                    <TableCell align="center">
                      {sp.winner ? <EmojiEventsIcon color="primary" fontSize="small" /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {scoreFieldKeys.length > 0 && (
            <>
              <Typography variant="subtitle2">Score Breakdown</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      {session.players.map((sp) => (
                        <TableCell
                          key={sp.id}
                          align="center"
                          sx={{ fontWeight: sp.winner ? "bold" : "normal", color: sp.winner ? "primary.main" : undefined }}
                        >
                          {sp.player.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scoreFieldKeys.map(({ key, label }) => (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        {session.players.map((sp) => (
                          <TableCell key={sp.id} align="center">
                            {formatScoreValue(sp.score_data[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {canEdit && onEdit && (
          <Button onClick={() => onEdit(session)}>Edit</Button>
        )}
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
