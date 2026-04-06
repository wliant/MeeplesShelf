import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import BarChartIcon from "@mui/icons-material/BarChart";
import PeopleIcon from "@mui/icons-material/People";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { downloadJsonExport, downloadCsvExport } from "../../api/export";
import { downloadBlob } from "../../utils/download";

export default function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  const handleExport = async (format: "json" | "csv") => {
    setAnchorEl(null);
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

  const handleDrawerNav = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleDrawerExport = (format: "json" | "csv") => {
    setDrawerOpen(false);
    handleExport(format);
  };

  const handleDrawerLogout = () => {
    setDrawerOpen(false);
    handleLogout();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MeeplesShelf
          </Typography>
          {isMobile ? (
            <IconButton
              color="inherit"
              edge="end"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/inventory">
                Inventory
              </Button>
              <Button color="inherit" component={Link} to="/sessions">
                Sessions
              </Button>
              <Button color="inherit" component={Link} to="/players">
                Players
              </Button>
              <Button color="inherit" component={Link} to="/statistics">
                Statistics
              </Button>
              {auth.isAdmin && (
                <>
                  <IconButton
                    color="inherit"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={exporting}
                    aria-label="Export data"
                  >
                    {exporting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <FileDownloadIcon />
                    )}
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                  >
                    <MenuItem onClick={() => handleExport("json")}>
                      Export JSON (Full Backup)
                    </MenuItem>
                    <MenuItem onClick={() => handleExport("csv")}>
                      Export Sessions CSV
                    </MenuItem>
                  </Menu>
                </>
              )}
              <Chip
                label={auth.isAdmin ? "Admin" : "Guest"}
                size="small"
                sx={{
                  mx: 1,
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "inherit",
                }}
              />
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
            <Chip
              label={auth.isAdmin ? "Admin" : "Guest"}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleDrawerNav("/inventory")}>
                <ListItemIcon>
                  <SportsEsportsIcon />
                </ListItemIcon>
                <ListItemText primary="Inventory" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleDrawerNav("/sessions")}>
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText primary="Sessions" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleDrawerNav("/players")}>
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Players" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleDrawerNav("/statistics")}>
                <ListItemIcon>
                  <BarChartIcon />
                </ListItemIcon>
                <ListItemText primary="Statistics" />
              </ListItemButton>
            </ListItem>
          </List>
          {auth.isAdmin && (
            <>
              <Divider />
              <List>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleDrawerExport("json")}
                    disabled={exporting}
                  >
                    <ListItemIcon>
                      {exporting ? (
                        <CircularProgress size={20} />
                      ) : (
                        <FileDownloadIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText primary="Export JSON (Full Backup)" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleDrawerExport("csv")}
                    disabled={exporting}
                  >
                    <ListItemIcon>
                      {exporting ? (
                        <CircularProgress size={20} />
                      ) : (
                        <FileDownloadIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText primary="Export Sessions CSV" />
                  </ListItemButton>
                </ListItem>
              </List>
            </>
          )}
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleDrawerLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
