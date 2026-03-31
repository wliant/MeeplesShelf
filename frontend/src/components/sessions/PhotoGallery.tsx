import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import type { SessionPhoto } from "../../types/session";
import { addSessionPhoto, deleteSessionPhoto } from "../../api/sessions";

interface Props {
  sessionId: number;
  photos: SessionPhoto[];
  onUpdate: () => void;
}

export default function PhotoGallery({ sessionId, photos, onUpdate }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const handleAdd = async () => {
    if (!url.trim()) return;
    await addSessionPhoto(sessionId, {
      url: url.trim(),
      caption: caption.trim() || undefined,
    });
    setUrl("");
    setCaption("");
    setAddOpen(false);
    onUpdate();
  };

  const handleDelete = async (photoId: number) => {
    await deleteSessionPhoto(sessionId, photoId);
    onUpdate();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">Photos</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Photo
        </Button>
      </Stack>

      {photos.length > 0 ? (
        <ImageList cols={3} gap={8} sx={{ mt: 1 }}>
          {photos.map((photo) => (
            <ImageListItem key={photo.id}>
              <img
                src={photo.url}
                alt={photo.caption ?? "Session photo"}
                loading="lazy"
                style={{ borderRadius: 4, objectFit: "cover", height: 150 }}
              />
              <ImageListItemBar
                title={photo.caption}
                actionIcon={
                  <IconButton
                    size="small"
                    sx={{ color: "white" }}
                    onClick={() => handleDelete(photo.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No photos yet.
        </Typography>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Photo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Image URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              required
            />
            <TextField
              label="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!url.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
