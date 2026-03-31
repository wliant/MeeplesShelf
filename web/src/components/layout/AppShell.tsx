import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import { AccountCircle, DarkMode, Keyboard, LightMode, SettingsBrightness } from "@mui/icons-material";
import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import { useThemeMode } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import useKeyboardShortcuts, { SHORTCUTS } from "../../hooks/useKeyboardShortcuts";

export default function AppShell() {
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    onShowHelp: () => setShortcutsOpen(true),
  });

  const cycleMode = () => {
    const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MeeplesShelf
          </Typography>
          <Button color="inherit" component={Link} to="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" component={Link} to="/inventory">
            Inventory
          </Button>
          <Button color="inherit" component={Link} to="/sessions">
            Sessions
          </Button>
          <Button color="inherit" component={Link} to="/import">
            Import
          </Button>
          <IconButton color="inherit" onClick={() => setShortcutsOpen(true)} title="Keyboard Shortcuts (?)">
            <Keyboard />
          </IconButton>
          <IconButton color="inherit" onClick={cycleMode} title={`Theme: ${mode}`}>
            {mode === "dark" ? (
              <DarkMode />
            ) : mode === "light" ? (
              <LightMode />
            ) : (
              <SettingsBrightness />
            )}
          </IconButton>
          {user && (
            <>
              <IconButton
                color="inherit"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                title={user.display_name}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem disabled>
                  {user.display_name}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    logout();
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>

      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableBody>
              {SHORTCUTS.map((s) => (
                <TableRow key={s.key}>
                  <TableCell sx={{ fontFamily: "monospace", fontWeight: "bold" }}>
                    {s.key}
                  </TableCell>
                  <TableCell>{s.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShortcutsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
