import { useRef, useState } from "react";
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
  IconButton,
  Tooltip,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  EmojiEvents as EmojiEventsIcon,
  Notes as NotesIcon,
  Extension as ExtensionIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  AddPhotoAlternate as AddPhotoIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { Game } from "../../types/game";
import type { GameSession } from "../../types/session";
import { formatDateTime, formatRelativeTime } from "../../utils/datetime";
import ReactionPicker from "./ReactionPicker";

interface Props {
  session: GameSession | null;
  games?: Game[];
  onClose: () => void;
  onEdit?: (session: GameSession) => void;
  canEdit?: boolean;
  isAdmin?: boolean;
  playerId?: number | null;
  onSeal?: (session: GameSession) => void;
  onUploadImage?: (
    sessionId: number,
    file: File,
    onProgress?: (pct: number) => void,
  ) => Promise<void>;
  onUploadComplete?: (sessionId: number, successCount: number, errorCount: number) => void;
  onDeleteImage?: (sessionId: number, imageId: number) => Promise<void>;
  onReact?: (sessionPlayerId: number, reaction: string) => Promise<void>;
}

type UploadEntry = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
};

export default function SessionDetail({
  session,
  games,
  onClose,
  onEdit,
  canEdit,
  isAdmin,
  playerId,
  onSeal,
  onUploadImage,
  onUploadComplete,
  onDeleteImage,
  onReact,
}: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(null);
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!session) return null;

  const game = games?.find((g) => g.id === session.game_id);

  const scoreFieldKeys: { key: string; label: string }[] = game?.scoring_spec
    ? game.scoring_spec.fields.map((f) => ({ key: f.id, label: f.label }))
    : Object.keys(session.players[0]?.score_data ?? {}).map((k) => ({ key: k, label: k }));

  const canUpload = !session.sealed && (!!playerId || isAdmin);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !onUploadImage) return;

    const sessionId = session.id;
    const entries: UploadEntry[] = files.map((f) => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: f.name,
      progress: 0,
      status: "uploading",
    }));
    setUploads((prev) => [...prev, ...entries]);

    const updateEntry = (id: string, patch: Partial<UploadEntry>) => {
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    };

    const results = await Promise.allSettled(
      files.map((file, i) => {
        const entry = entries[i];
        return onUploadImage(sessionId, file, (pct) => updateEntry(entry.id, { progress: pct }))
          .then(() => updateEntry(entry.id, { status: "done", progress: 100 }))
          .catch((err) => {
            updateEntry(entry.id, { status: "error" });
            throw err;
          });
      }),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const errorCount = results.length - successCount;
    onUploadComplete?.(sessionId, successCount, errorCount);

    const successIds = entries
      .filter((_, i) => results[i].status === "fulfilled")
      .map((u) => u.id);
    if (successIds.length > 0) {
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => !successIds.includes(u.id)));
      }, 1500);
    }
  };

  const isUploading = uploads.some((u) => u.status === "uploading");

  const myReaction = (sessionPlayerId: number) => {
    if (!playerId) return undefined;
    const sp = session.players.find((p) => p.id === sessionPlayerId);
    return sp?.reactions.find((r) => r.player_id === playerId)?.reaction;
  };

  // Group reactions by emoji
  const groupReactions = (reactions: typeof session.players[0]["reactions"]) => {
    const grouped: Record<string, { count: number; names: string[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.reaction]) grouped[r.reaction] = { count: 0, names: [] };
      grouped[r.reaction].count++;
      grouped[r.reaction].names.push(r.player.name);
    }
    return grouped;
  };

  return (
    <>
      <Dialog open={!!session} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
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
            <Box sx={{ flexGrow: 1 }}>
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(session.played_at)}
                  {" \u2014 "}
                  {formatRelativeTime(session.played_at)}
                </Typography>
                {session.sealed && (
                  <Chip
                    icon={<LockIcon sx={{ fontSize: 14 }} />}
                    label="Sealed"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
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

            {/* Image carousel */}
            {(session.images.length > 0 || canUpload) && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Photos</Typography>
                  {canUpload && onUploadImage && (
                    <Tooltip title="Upload photos">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <AddPhotoIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
                {uploads.length > 0 && (
                  <Stack spacing={0.5} sx={{ mb: 1 }}>
                    {uploads.map((u) => (
                      <Stack
                        key={u.id}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            flex: "0 0 40%",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color:
                              u.status === "error" ? "error.main" : "text.secondary",
                          }}
                          title={u.name}
                        >
                          {u.name}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={u.status === "error" ? 100 : u.progress}
                            color={
                              u.status === "error"
                                ? "error"
                                : u.status === "done"
                                ? "success"
                                : "primary"
                            }
                          />
                        </Box>
                        <Box sx={{ width: 20, display: "flex", justifyContent: "center" }}>
                          {u.status === "done" && (
                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                          )}
                          {u.status === "error" && (
                            <ErrorOutlineIcon color="error" sx={{ fontSize: 16 }} />
                          )}
                          {u.status === "uploading" && (
                            <Typography variant="caption" color="text.secondary">
                              {u.progress}%
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
                {session.images.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ overflowX: "auto", pb: 1 }}
                  >
                    {session.images.map((img) => (
                      <Box key={img.id} sx={{ position: "relative", flexShrink: 0 }}>
                        <Box
                          component="img"
                          src={img.image_url}
                          alt={img.original_filename}
                          sx={{
                            height: 120,
                            borderRadius: 1,
                            cursor: "pointer",
                            objectFit: "cover",
                          }}
                          onClick={() => setLightboxUrl(img.image_url)}
                        />
                        {!session.sealed &&
                          onDeleteImage &&
                          (isAdmin || playerId === img.player_id) && (
                            <IconButton
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                bgcolor: "rgba(0,0,0,0.5)",
                                color: "white",
                                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                                p: 0.25,
                              }}
                              onClick={() => onDeleteImage(session.id, img.id)}
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                      </Box>
                    ))}
                  </Stack>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={handleFileSelect}
                />
              </Box>
            )}

            {/* Players table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={isMobile ? { '& .MuiTableCell-root': { px: 1 } } : undefined}>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Score</TableCell>
                    <TableCell align="center">Winner</TableCell>
                    {!isMobile && <TableCell align="center">Reactions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {session.players.map((sp) => {
                    const grouped = groupReactions(sp.reactions);
                    return (
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
                          {sp.winner ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                              <EmojiEventsIcon color="primary" fontSize="small" />
                              {sp.win_note && (
                                <Tooltip title={sp.win_note}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      maxWidth: 160,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {sp.win_note}
                                  </Typography>
                                </Tooltip>
                              )}
                            </Stack>
                          ) : null}
                        </TableCell>
                        {!isMobile && (
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
                              {Object.entries(grouped).map(([emoji, { count, names }]) => (
                                <Tooltip key={emoji} title={names.join(", ")}>
                                  <Chip
                                    label={`${emoji} ${count}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: "0.75rem", height: 24 }}
                                  />
                                </Tooltip>
                              ))}
                              {playerId && onReact && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    setReactionAnchor(e.currentTarget);
                                    setReactionTarget(sp.id);
                                  }}
                                  sx={{ fontSize: "0.85rem", p: 0.5 }}
                                >
                                  +
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Score breakdown */}
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
          {isAdmin && onSeal && (
            <Button
              startIcon={session.sealed ? <LockOpenIcon /> : <LockIcon />}
              onClick={() => onSeal(session)}
              color={session.sealed ? "success" : "warning"}
            >
              {session.sealed ? "Unseal" : "Seal"}
            </Button>
          )}
          {canEdit && onEdit && !session.sealed && (
            <Button onClick={() => onEdit(session)}>Edit</Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reaction Picker */}
      <ReactionPicker
        anchorEl={reactionAnchor}
        open={!!reactionAnchor}
        onClose={() => setReactionAnchor(null)}
        onSelect={(reaction) => {
          if (reactionTarget && onReact) {
            onReact(reactionTarget, reaction);
          }
        }}
        currentReaction={reactionTarget ? myReaction(reactionTarget) : undefined}
      />

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onClose={() => setLightboxUrl(null)} maxWidth="lg">
        <IconButton
          onClick={() => setLightboxUrl(null)}
          sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.5)", color: "white" }}
        >
          <CloseIcon />
        </IconButton>
        {lightboxUrl && (
          <Box
            component="img"
            src={lightboxUrl}
            sx={{ maxWidth: "100%", maxHeight: "90vh", display: "block" }}
          />
        )}
      </Dialog>
    </>
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
