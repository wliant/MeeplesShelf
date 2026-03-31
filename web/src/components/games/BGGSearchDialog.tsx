import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useState, useRef, useCallback } from "react";
import type { BGGSearchResult } from "../../types/bgg";
import type { Game } from "../../types/game";
import { searchBGG, importFromBGG } from "../../api/bgg";
import { useNotify } from "../common/useNotify";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (game: Game) => void;
}

export default function BGGSearchDialog({ open, onClose, onImport }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BGGSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { success, error } = useNotify();

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      searchBGG(q)
        .then(setResults)
        .catch(() => error("BGG search failed"))
        .finally(() => setSearching(false));
    },
    [error]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleImport = async (result: BGGSearchResult) => {
    setImporting(true);
    try {
      const game = await importFromBGG(result.bgg_id);
      success(`Imported "${game.name}"`);
      onImport(game);
      onClose();
      setQuery("");
      setResults([]);
    } catch {
      error("Failed to import game");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import from BoardGameGeek</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Search BGG"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
            fullWidth
          />
          {searching && <CircularProgress size={24} sx={{ mx: "auto" }} />}
          {results.length > 0 && (
            <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
              {results.map((r) => (
                <ListItemButton
                  key={r.bgg_id}
                  onClick={() => handleImport(r)}
                  disabled={importing}
                >
                  <ListItemText
                    primary={r.name}
                    secondary={r.year_published ?? ""}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
          {!searching && query.length >= 2 && results.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              No results found.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
