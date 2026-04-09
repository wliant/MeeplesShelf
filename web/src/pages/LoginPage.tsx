import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { loginAdmin, loginGuest } from "../api/auth";
import MeepleIcon from "../components/common/MeepleIcon";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGuestLogin = async () => {
    setGuestError(null);
    setGuestLoading(true);
    try {
      const { access_token, player_id, player_name } = await loginGuest(
        guestName.trim()
      );
      auth.enterAsGuest(access_token, player_id, player_name);
      navigate("/inventory");
    } catch {
      setGuestError("Could not log in. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await loginAdmin(password);
      auth.login(access_token);
      navigate("/inventory");
    } catch {
      setError("Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: 360, p: 1 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
            <MeepleIcon sx={{ fontSize: 48, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" align="center" gutterBottom>
            MeeplesShelf
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 1 }}
          >
            Enter your name to log game sessions and scores.
            Admin access requires the shared password.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Your Name"
              fullWidth
              size="small"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && guestName.trim() && handleGuestLogin()
              }
            />
            {guestError && <Alert severity="error">{guestError}</Alert>}
            <Button
              variant="outlined"
              fullWidth
              onClick={handleGuestLogin}
              disabled={!guestName.trim() || guestLoading}
            >
              Continue as Player
            </Button>
            <Divider>admin</Divider>
            <TextField
              label="Admin Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              size="small"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              variant="contained"
              fullWidth
              onClick={handleAdminLogin}
              disabled={loading || !password}
            >
              Login as Admin
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
