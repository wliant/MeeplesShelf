import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function buildGameDeleteMessage(
  name: string,
  expansionCount: number,
): string {
  if (expansionCount > 0) {
    return `Delete "${name}" and all its data? This will also remove ${expansionCount} expansion${expansionCount > 1 ? "s" : ""} and all associated sessions. This cannot be undone.`;
  }
  return `Delete "${name}" and all its data? All associated sessions will also be removed. This cannot be undone.`;
}

export function buildSessionDeleteMessage(
  gameName: string,
  playedAt: string,
): string {
  const date = new Date(playedAt).toLocaleDateString();
  return `Delete the ${gameName} session from ${date}? This cannot be undone.`;
}

export function buildExpansionDeleteMessage(
  expansionName: string,
  gameName: string,
): string {
  return `Delete the expansion "${expansionName}" from ${gameName}? This cannot be undone.`;
}

export function buildPlayerDeleteMessage(
  name: string,
  sessionCount: number,
): string {
  if (sessionCount > 0) {
    return `Delete "${name}"? This player appears in ${sessionCount} session${sessionCount !== 1 ? "s" : ""}. Their scores will be removed from those sessions. This cannot be undone.`;
  }
  return `Delete "${name}"? This player has no session history. This cannot be undone.`;
}
