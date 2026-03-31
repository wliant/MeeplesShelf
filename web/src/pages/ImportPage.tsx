import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";
import {
  previewImport,
  importSessions,
} from "../api/imports";
import type {
  ImportPreviewResponse,
  ImportResultResponse,
} from "../api/imports";

type Format = "csv" | "bgstats";

export default function ImportPage() {
  const [format, setFormat] = useState<Format>("csv");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await previewImport(file, format);
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const data = await importSessions(file, format);
      setResult(data);
      setPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import Sessions
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value as Format)}
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="bgstats">BG Stats JSON</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
            {file ? file.name : "Choose File"}
            <input
              type="file"
              hidden
              accept={format === "csv" ? ".csv" : ".json"}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setResult(null);
              }}
            />
          </Button>

          <Button
            variant="contained"
            onClick={handlePreview}
            disabled={!file || loading}
          >
            Preview
          </Button>
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Import complete: {result.imported} sessions imported, {result.skipped}{" "}
          skipped.
          {result.errors.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {result.errors.map((e, i) => (
                <Typography key={i} variant="body2" color="error">
                  {e}
                </Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {preview && (
        <>
          <Typography variant="h6" gutterBottom>
            Preview ({preview.total} sessions)
          </Typography>
          {preview.errors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {preview.errors.length} parsing errors:
              {preview.errors.slice(0, 5).map((e, i) => (
                <Typography key={i} variant="body2">
                  {e}
                </Typography>
              ))}
            </Alert>
          )}
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Game</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Players</TableCell>
                  <TableCell>Winner</TableCell>
                  <TableCell>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.slice(0, 50).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.game_name}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.players.join(", ")}</TableCell>
                    <TableCell>{row.winner || "-"}</TableCell>
                    <TableCell>
                      {row.duration_minutes ? `${row.duration_minutes}m` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            variant="contained"
            color="primary"
            onClick={handleImport}
            disabled={loading}
          >
            Confirm Import ({preview.total} sessions)
          </Button>
        </>
      )}
    </Box>
  );
}
