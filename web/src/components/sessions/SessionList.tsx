import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  Typography,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import type { GameSession } from "../../types/session";
import useSortableTable from "../../hooks/useSortableTable";
import SessionCard from "./SessionCard";

interface Props {
  sessions: GameSession[];
  onDelete: (session: GameSession) => void;
  onSelect: (session: GameSession) => void;
  isAdmin: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onAddNew?: () => void;
}

export default function SessionList({
  sessions,
  onDelete,
  onSelect,
  isAdmin,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onAddNew,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { sorted, orderBy, order, onSort } = useSortableTable(sessions, "played_at", "desc");

  if (sessions.length === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 6 }}>
        <HistoryIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          No sessions logged yet.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Log a game session to start tracking your plays.
        </Typography>
        {onAddNew && (
          <Button variant="contained" onClick={onAddNew}>
            Log your first session
          </Button>
        )}
      </Box>
    );
  }

  const sortableHeader = (label: string, key: string) => (
    <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"} onClick={() => onSort(key)}>
      {label}
    </TableSortLabel>
  );

  return (
    <Paper variant="outlined">
      {isMobile ? (
        <Stack divider={<Divider />}>
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onDelete={onDelete}
              onSelect={onSelect}
              isAdmin={isAdmin}
            />
          ))}
        </Stack>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{sortableHeader("Date", "played_at")}</TableCell>
              <TableCell>{sortableHeader("Game", "game.name")}</TableCell>
              <TableCell>Players</TableCell>
              <TableCell>Winner</TableCell>
              {isAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((s) => {
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
                          label={`${p.player.name}${p.total_score != null ? ` - ${p.total_score} pts` : ""}`}
                          size="small"
                          color={p.winner ? "primary" : "default"}
                          icon={p.winner ? <EmojiEventsIcon /> : undefined}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {winners.map((w) => w.player.name).join(", ") || "-"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Tooltip title="Delete session">
                        <IconButton
                          size="small"
                          aria-label={`Delete session for ${s.game.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {total > rowsPerPage && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          onPageChange={(_, newPage) => onPageChange(newPage)}
        />
      )}
    </Paper>
  );
}
