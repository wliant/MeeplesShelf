import { useState } from "react";
import {
  Paper,
  Typography,
  Collapse,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import type { HIndexResponse } from "../../types/stats";

interface Props {
  data: HIndexResponse;
}

export default function HIndexCard({ data }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack>
          <Typography variant="h3" color="primary">
            {data.h_index}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            H-Index
          </Typography>
        </Stack>
        {data.contributing_games.length > 0 && (
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Stack>
      <Collapse in={expanded}>
        <List dense sx={{ mt: 1 }}>
          {data.contributing_games.map((g) => (
            <ListItem key={g.game_id} disablePadding>
              <ListItemText
                primary={g.game_name}
                secondary={`${g.play_count} plays`}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
}
