import { AppBar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import { DarkMode, LightMode, SettingsBrightness } from "@mui/icons-material";
import { Link, Outlet } from "react-router-dom";
import { useThemeMode } from "../../contexts/ThemeContext";

export default function AppShell() {
  const { mode, setMode } = useThemeMode();

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
          <IconButton color="inherit" onClick={cycleMode} title={`Theme: ${mode}`}>
            {mode === "dark" ? (
              <DarkMode />
            ) : mode === "light" ? (
              <LightMode />
            ) : (
              <SettingsBrightness />
            )}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
