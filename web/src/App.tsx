import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SnackbarProvider } from "./context/SnackbarContext";
import { ThemeModeProvider } from "./context/ThemeContext";
import RequireAuth from "./components/auth/RequireAuth";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import InventoryPage from "./pages/InventoryPage";
import SessionsPage from "./pages/SessionsPage";
import PlayersPage from "./pages/PlayersPage";
import StatisticsPage from "./pages/StatisticsPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";

function App() {
  return (
    <ThemeModeProvider>
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
                  <Route path="/players/:id" element={<PlayerProfilePage />} />
                  <Route path="/statistics" element={<StatisticsPage />} />
                  <Route path="*" element={<Navigate to="/inventory" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeModeProvider>
  );
}

export default App;
