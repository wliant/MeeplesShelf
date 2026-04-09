import { Box, IconButton, Popover } from "@mui/material";

const REACTIONS = ["🏆", "👏", "🔥", "😱", "💀", "😂", "👍", "👎", "😮"];

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelect: (reaction: string) => void;
  currentReaction?: string;
}

export default function ReactionPicker({
  anchorEl,
  open,
  onClose,
  onSelect,
  currentReaction,
}: Props) {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Box sx={{ display: "flex", p: 0.5, gap: 0.25 }}>
        {REACTIONS.map((r) => (
          <IconButton
            key={r}
            size="small"
            onClick={() => {
              onSelect(r);
              onClose();
            }}
            sx={{
              fontSize: "1.3rem",
              bgcolor: r === currentReaction ? "action.selected" : undefined,
              borderRadius: 1,
            }}
          >
            {r}
          </IconButton>
        ))}
      </Box>
    </Popover>
  );
}
