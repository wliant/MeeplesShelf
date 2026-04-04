import { createContext, useContext, useState, type ReactNode } from "react";

type Role = "admin" | "guest" | null;

interface AuthContextValue {
  role: Role;
  isAdmin: boolean;
  login: (token: string) => void;
  enterAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_KEY = "ms_role";
const TOKEN_KEY = "ms_token";

function readStoredRole(): Role {
  const stored = localStorage.getItem(ROLE_KEY);
  if (stored === "admin" || stored === "guest") return stored;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(readStoredRole);

  const login = (token: string) => {
    setRole("admin");
    localStorage.setItem(ROLE_KEY, "admin");
    localStorage.setItem(TOKEN_KEY, token);
  };

  const enterAsGuest = () => {
    setRole("guest");
    localStorage.setItem(ROLE_KEY, "guest");
    localStorage.removeItem(TOKEN_KEY);
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ role, isAdmin: role === "admin", login, enterAsGuest, logout }}
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
