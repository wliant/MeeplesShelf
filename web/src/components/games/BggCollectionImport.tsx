import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { importCollection } from "../../api/bgg";
import type { CollectionImportResult } from "../../api/bgg";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function BggCollectionImport({ open, onClose, onComplete }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollectionImportResult | null>(null);
  const [error, setError] = useState("");

  const handleImport = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await importCollection(username);
      setResult(res);
      onComplete();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to import collection"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import BGG Collection</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enter your BoardGameGeek username to import your entire collection.
          Existing games will not be overwritten.
        </Typography>
        <TextField
          label="BGG Username"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          autoFocus
        />
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
            <CircularProgress size={24} />
            <Typography>Fetching collection from BGG...</Typography>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Import complete: {result.imported} new, {result.updated} updated,{" "}
            {result.skipped} unchanged ({result.total} total)
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!username.trim() || loading}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
