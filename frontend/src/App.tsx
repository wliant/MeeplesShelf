import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { SnackbarProvider } from "notistack";
import AppShell from "./components/layout/AppShell";
import InventoryPage from "./pages/InventoryPage";
import SessionsPage from "./pages/SessionsPage";

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
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
      >
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="*" element={<Navigate to="/inventory" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
