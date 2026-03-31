import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { ThemeContextProvider } from "./contexts/ThemeContext";
import AppShell from "./components/layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import SessionsPage from "./pages/SessionsPage";
import GameDetailPage from "./pages/GameDetailPage";
import PlayerDetailPage from "./pages/PlayerDetailPage";

function App() {
  return (
    <ThemeContextProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
      >
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/games/:id" element={<GameDetailPage />} />
              <Route path="/players/:id" element={<PlayerDetailPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeContextProvider>
  );
}

export default App;
