import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { loginAdmin } from "../api/auth";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = () => {
    auth.enterAsGuest();
    navigate("/inventory");
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
        bgcolor: "grey.100",
      }}
    >
      <Card sx={{ width: 360, p: 1 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            MeeplesShelf
          </Typography>
          <Stack spacing={2}>
            <Button variant="outlined" fullWidth onClick={handleGuestLogin}>
              Continue as Guest
            </Button>
            <Divider>or</Divider>
            <TextField
              label="Admin Password"
              type="password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
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
