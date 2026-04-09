import { createContext, useContext, useState, type ReactNode } from "react";

type Role = "admin" | "guest" | null;

interface AuthContextValue {
  role: Role;
  isAdmin: boolean;
  canLogSessions: boolean;
  playerName: string | null;
  playerId: number | null;
  login: (token: string) => void;
  enterAsGuest: (token: string, playerId: number, playerName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_KEY = "ms_role";
const TOKEN_KEY = "ms_token";
const PLAYER_NAME_KEY = "ms_player_name";
const PLAYER_ID_KEY = "ms_player_id";

function readStoredRole(): Role {
  const stored = localStorage.getItem(ROLE_KEY);
  if (stored === "admin") return "admin";
  if (stored === "guest") {
    // Backward compat: old guests had no token — force logout
    if (!localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(ROLE_KEY);
      return null;
    }
    return "guest";
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(readStoredRole);
  const [playerName, setPlayerName] = useState<string | null>(
    () => localStorage.getItem(PLAYER_NAME_KEY),
  );
  const [playerId, setPlayerId] = useState<number | null>(() => {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    return stored ? Number(stored) : null;
  });

  const login = (token: string) => {
    setRole("admin");
    setPlayerName(null);
    setPlayerId(null);
    localStorage.setItem(ROLE_KEY, "admin");
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(PLAYER_NAME_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
  };

  const enterAsGuest = (token: string, id: number, name: string) => {
    setRole("guest");
    setPlayerName(name);
    setPlayerId(id);
    localStorage.setItem(ROLE_KEY, "guest");
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PLAYER_NAME_KEY, name);
    localStorage.setItem(PLAYER_ID_KEY, String(id));
  };

  const logout = () => {
    setRole(null);
    setPlayerName(null);
    setPlayerId(null);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_NAME_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
  };

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        role,
        isAdmin,
        canLogSessions: role === "admin" || role === "guest",
        playerName,
        playerId,
        login,
        enterAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
