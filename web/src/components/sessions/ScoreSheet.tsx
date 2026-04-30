import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { ScoringSpec } from "../../types/scoring";
import type { Player } from "../../types/session";
import { calculateTotal } from "../../utils/scoring";
import ScoreFieldRenderer from "./ScoreFieldRenderer";

interface Props {
  spec: ScoringSpec;
  players: Player[];
  scoreData: Record<number, Record<string, unknown>>;
  onChange: (playerId: number, fieldId: string, value: unknown) => void;
}

export default function ScoreSheet({
  spec,
  players,
  scoreData,
  onChange,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {players.map((p) => (
          <Paper key={p.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                {p.name}
              </Typography>
              <Typography variant="h6">
                {calculateTotal(spec, scoreData[p.id] ?? {})}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1.5}>
              {spec.fields.map((field) => (
                <Box key={field.id}>
                  <ScoreFieldRenderer
                    field={field}
                    value={scoreData[p.id]?.[field.id]}
                    onChange={(val) => onChange(p.id, field.id, val)}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Category</TableCell>
            {players.map((p) => (
              <TableCell key={p.id} align="center" sx={{ fontWeight: "bold" }}>
                {p.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {spec.fields.map((field) => (
            <TableRow key={field.id}>
              <TableCell sx={{ minWidth: 140 }}>
                <Typography variant="body2">{field.label}</Typography>
              </TableCell>
              {players.map((p) => (
                <TableCell key={p.id} align="center" sx={{ minWidth: 140 }}>
                  <ScoreFieldRenderer
                    field={field}
                    value={scoreData[p.id]?.[field.id]}
                    onChange={(val) => onChange(p.id, field.id, val)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
            {players.map((p) => (
              <TableCell
                key={p.id}
                align="center"
                sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
              >
                {calculateTotal(spec, scoreData[p.id] ?? {})}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
