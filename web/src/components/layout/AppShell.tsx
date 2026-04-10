import { useRef, useState } from "react";
import {
  AppBar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import HistoryIcon from "@mui/icons-material/History";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import BarChartIcon from "@mui/icons-material/BarChart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { useThemeMode } from "../../context/ThemeContext";
import MeepleIcon from "../common/MeepleIcon";
import { downloadJsonExport, downloadCsvExport, uploadJsonImport } from "../../api/export";
import { downloadBlob } from "../../utils/download";

const DRAWER_WIDTH = 240;

const ALL_NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: <DashboardIcon />, guestOnly: true },
  { path: "/inventory", label: "Inventory", icon: <SportsEsportsIcon /> },
  { path: "/sessions", label: "Sessions", icon: <HistoryIcon /> },
  { path: "/players", label: "Players", icon: <PeopleIcon /> },
  { path: "/statistics", label: "Statistics", icon: <BarChartIcon /> },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Game Inventory",
  "/sessions": "Game Sessions",
  "/players": "Players",
  "/statistics": "Statistics",
};

export default function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSnackbar } = useSnackbar();
  const { mode, toggleTheme } = useThemeMode();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.guestOnly || auth.role === "guest",
  );

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/players/") ? "Player Profile" : "MeeplesShelf");

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  const handleExport = async (format: "json" | "csv") => {
    setMobileOpen(false);
    setExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        const blob = await downloadJsonExport();
        downloadBlob(blob, `meeplesshelf-export-${date}.json`);
      } else {
        const blob = await downloadCsvExport();
        downloadBlob(blob, `meeplesshelf-sessions-${date}.csv`);
      }
      showSnackbar("Export downloaded successfully", "success");
    } catch {
      showSnackbar("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleImportClick = () => {
    setMobileOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const result = await uploadJsonImport(file);
      const parts: string[] = [];
      if (result.games_created) parts.push(`${result.games_created} games`);
      if (result.sessions_created) parts.push(`${result.sessions_created} sessions`);
      if (result.players_created) parts.push(`${result.players_created} new players`);
      showSnackbar(
        parts.length ? `Import complete: ${parts.join(", ")}` : "Import complete (no new data)",
        "success",
      );
    } catch {
      showSnackbar("Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Sidebar content (shared between permanent & temporary drawer)     */
  /* ------------------------------------------------------------------ */
  const sidebarContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header / branding */}
      <Box
        component={Link}
        to="/inventory"
        onClick={() => setMobileOpen(false)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
          py: 2.5,
          textDecoration: "none",
          color: "text.primary",
        }}
      >
        <MeepleIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          MeeplesShelf
        </Typography>
      </Box>

      <Divider />

      {/* Primary navigation */}
      <Box component="nav" aria-label="Main navigation">
        <List sx={{ px: 1, py: 1 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNav(item.path)}
                  aria-current={active ? "page" : undefined}
                  sx={{
                    borderRadius: 2,
                    pl: active ? 1.75 : 2,
                    borderLeft: active ? `3px solid ${theme.palette.primary.main}` : "3px solid transparent",
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                    color: active ? "primary.main" : "text.primary",
                    "&:hover": {
                      bgcolor: active
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.action.hover, 0.08),
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: active ? "primary.main" : "text.secondary",
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 600 : 400 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Spacer */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Admin data section */}
      {auth.isAdmin && (
        <>
          <Divider />
          <List sx={{ px: 1, py: 0.5 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleExport("json")}
                disabled={exporting}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
                </ListItemIcon>
                <ListItemText primary="Export JSON" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleExport("csv")}
                disabled={exporting}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
                </ListItemIcon>
                <ListItemText primary="Export CSV" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleImportClick}
                disabled={importing}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {importing ? <CircularProgress size={20} /> : <FileUploadIcon />}
                </ListItemIcon>
                <ListItemText primary="Import JSON" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}

      {/* Theme toggle */}
      <Divider />
      <List sx={{ px: 1, py: 0.5 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={toggleTheme}
            sx={{ borderRadius: 2 }}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </ListItemIcon>
            <ListItemText primary={mode === "dark" ? "Light Mode" : "Dark Mode"} />
          </ListItemButton>
        </ListItem>
      </List>

      {/* User info & logout */}
      <Divider />
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Chip
          label={auth.isAdmin ? "Admin" : auth.playerName ?? "Guest"}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={handleLogout} aria-label="Logout">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Skip to content */}
      <MuiLink
        href="#main-content"
        sx={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          "&:focus": {
            left: 8,
            top: 8,
            zIndex: 9999,
            bgcolor: "primary.main",
            color: "white",
            px: 2,
            py: 1,
            borderRadius: 1,
            textDecoration: "none",
          },
        }}
      >
        Skip to main content
      </MuiLink>

      {/* Sidebar — permanent on desktop, temporary on mobile */}
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Right side: top bar + main content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Thin top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "background.paper",
            color: "text.primary",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Toolbar variant="dense">
            {!isDesktop && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600, fontSize: "1.1rem" }}>
              {pageTitle}
            </Typography>
            <Chip
              label={auth.isAdmin ? "Admin" : auth.playerName ?? "Guest"}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <IconButton
              size="small"
              onClick={toggleTheme}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mode === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Main content */}
        <Box component="main" id="main-content" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>

      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json,application/json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />
    </Box>
  );
}
