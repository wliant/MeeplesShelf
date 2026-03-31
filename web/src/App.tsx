import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { ThemeContextProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import SessionsPage from "./pages/SessionsPage";
import GameDetailPage from "./pages/GameDetailPage";
import PlayerDetailPage from "./pages/PlayerDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ImportPage from "./pages/ImportPage";
import AchievementsPage from "./pages/AchievementsPage";
import PublicProfilePage from "./pages/PublicProfilePage";

function App() {
  return (
    <ThemeContextProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
      >
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile/:slug" element={<PublicProfilePage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/sessions" element={<SessionsPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/games/:id" element={<GameDetailPage />} />
                  <Route path="/players/:id" element={<PlayerDetailPage />} />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeContextProvider>
  );
}

export default App;
