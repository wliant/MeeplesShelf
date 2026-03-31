import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ShortcutActions {
  onNewGame?: () => void;
  onNewSession?: () => void;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
}

export default function useKeyboardShortcuts(actions: ShortcutActions = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "g":
          navigate("/inventory");
          break;
        case "p":
          navigate("/sessions");
          break;
        case "d":
          navigate("/dashboard");
          break;
        case "n":
          if (location.pathname === "/inventory") {
            actions.onNewGame?.();
          }
          break;
        case "s":
          if (location.pathname === "/sessions") {
            actions.onNewSession?.();
          }
          break;
        case "/":
          if (location.pathname === "/inventory") {
            e.preventDefault();
            actions.onFocusSearch?.();
          }
          break;
        case "?":
          actions.onShowHelp?.();
          break;
      }
    },
    [navigate, location.pathname, actions]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

export const SHORTCUTS = [
  { key: "g", description: "Go to Inventory" },
  { key: "p", description: "Go to Sessions (plays)" },
  { key: "d", description: "Go to Dashboard" },
  { key: "n", description: "New game (on Inventory page)" },
  { key: "s", description: "New session (on Sessions page)" },
  { key: "/", description: "Focus search bar (on Inventory page)" },
  { key: "?", description: "Show keyboard shortcuts" },
];
