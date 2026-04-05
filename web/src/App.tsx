import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "./context/AuthContext";
import { SnackbarProvider } from "./context/SnackbarContext";
import RequireAuth from "./components/auth/RequireAuth";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import InventoryPage from "./pages/InventoryPage";
import SessionsPage from "./pages/SessionsPage";
import PlayersPage from "./pages/PlayersPage";

const theme = createTheme({
  palette: {
    primary: { main: "#5c6bc0" },
    secondary: { main: "#ff7043" },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/sessions" element={<SessionsPage />} />
                  <Route path="/players" element={<PlayersPage />} />
                  <Route path="*" element={<Navigate to="/inventory" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
