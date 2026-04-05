import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Snackbar, Alert, type AlertColor } from "@mui/material";

interface SnackbarContextValue {
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("success");

  const showSnackbar = useCallback(
    (msg: string, sev: AlertColor = "success") => {
      setMessage(msg);
      setSeverity(sev);
      setOpen(true);
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx)
    throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
}
