import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MeeplesShelf
          </Typography>
          <Button color="inherit" component={Link} to="/inventory">
            Inventory
          </Button>
          <Button color="inherit" component={Link} to="/sessions">
            Sessions
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
            sx={{ mx: 1, bgcolor: "rgba(255,255,255,0.2)", color: "inherit" }}
          />
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
