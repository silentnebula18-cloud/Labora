import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  authenticate,
  getUserById,
  type AuthResult,
} from "../services/authService";
import type { AuthSession, Role, SafeUser } from "../types";

const STORAGE_KEY = "labora.session";

interface AuthContextValue {
  user: SafeUser | null;
  activeRole: Role | null;
  isRestoring: boolean;
  login: (nim: string, password: string) => Promise<AuthResult>;
  selectRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveSession(session: AuthSession | null) {
  try {
    if (session) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Penyimpanan gagal tidak boleh menggagalkan alur login.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Pulihkan sesi saat aplikasi dibuka.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const session = JSON.parse(raw) as AuthSession;
        const found = getUserById(session.userId);
        if (!found) return;

        setUser(found);

        if (session.activeRole && found.roles.includes(session.activeRole)) {
          setActiveRole(session.activeRole);
        } else if (found.roles.length === 1) {
          setActiveRole(found.roles[0]);
        }
      } catch {
        // Data sesi rusak: anggap belum login.
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const login = useCallback(async (nim: string, password: string) => {
    const result = await authenticate(nim, password);

    if (result.ok) {
      // Satu peran: langsung aktif. Dua peran: tunggu pengguna memilih.
      const role = result.user.roles.length === 1 ? result.user.roles[0] : null;
      setUser(result.user);
      setActiveRole(role);
      void saveSession({ userId: result.user.id, activeRole: role });
    }

    return result;
  }, []);

  const selectRole = useCallback(
    (role: Role) => {
      if (!user || !user.roles.includes(role)) return;
      setActiveRole(role);
      void saveSession({ userId: user.id, activeRole: role });
    },
    [user],
  );

  const logout = useCallback(() => {
    setUser(null);
    setActiveRole(null);
    void saveSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, activeRole, isRestoring, login, selectRole, logout }),
    [user, activeRole, isRestoring, login, selectRole, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
