import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material";
import type { ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
  resolvedMode: "light",
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("theme-mode");
    return (stored as ThemeMode) ?? "system";
  });
  const [systemPref, setSystemPref] = useState(getSystemPreference);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("theme-mode", m);
  }, []);

  const resolvedMode = mode === "system" ? systemPref : mode;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedMode,
          primary: { main: "#5c6bc0" },
          secondary: { main: "#ff7043" },
        },
      }),
    [resolvedMode]
  );

  const value = useMemo(
    () => ({ mode, setMode, resolvedMode }),
    [mode, setMode, resolvedMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
