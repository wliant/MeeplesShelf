import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Action {
  label: string;
  onClick: () => void;
  variant?: "contained" | "outlined";
}

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: Action[];
}

export default function EmptyState({ icon, title, description, actions }: Props) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 2,
      }}
    >
      <Box sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}>{icon}</Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
        {description}
      </Typography>
      {actions && actions.length > 0 && (
        <Stack direction="row" spacing={1} justifyContent="center">
          {actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant ?? (i === 0 ? "contained" : "outlined")}
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  );
}
