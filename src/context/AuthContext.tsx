import { onAuthStateChanged } from "@react-native-firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { auth } from "../lib/firebase";
import {
  loadUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateActiveRole,
  type AuthResult,
  type RegisterInput,
} from "../services/authService";
import type { Role, SafeUser } from "../types";

interface AuthContextValue {
  user: SafeUser | null;
  activeRole: Role | null;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  selectRole: (role: Role) => void;
  changeRole: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveActiveRole(user: SafeUser): Role | null {
  if (user.activeRole && user.roles.includes(user.activeRole)) {
    return user.activeRole;
  }
  if (user.roles.length === 1) return user.roles[0];
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Saat registrasi, listener auth bisa terpanggil sebelum profil Firestore
  // selesai dibuat. Alur register menangani state-nya sendiri.
  const signingUpRef = useRef(false);
  const profileRequestRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setActiveRole(null);
        setIsRestoring(false);
        return;
      }

      if (signingUpRef.current) return;

      const requestId = ++profileRequestRef.current;

      try {
        const result = await loadUserProfile(firebaseUser.uid);
        if (requestId !== profileRequestRef.current) return;

        if (result.status !== "ok") {
          await logoutUser().catch(() => undefined);
          setUser(null);
          setActiveRole(null);
        } else {
          setUser(result.user);
          setActiveRole(resolveActiveRole(result.user));
        }
      } catch {
        if (requestId !== profileRequestRef.current) return;
        await logoutUser().catch(() => undefined);
        setUser(null);
        setActiveRole(null);
      } finally {
        if (requestId === profileRequestRef.current) setIsRestoring(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);

    if (result.ok) {
      setUser(result.user);
      setActiveRole(resolveActiveRole(result.user));
      setIsRestoring(false);
    }

    return result;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    signingUpRef.current = true;

    try {
      const result = await registerUser(input);

      if (result.ok) {
        setUser(result.user);
        setActiveRole(resolveActiveRole(result.user));
        setIsRestoring(false);
      }

      return result;
    } finally {
      signingUpRef.current = false;
    }
  }, []);

  const selectRole = useCallback(
    (role: Role) => {
      if (!user || !user.roles.includes(role)) return;

      setActiveRole(role);
      setUser((prev) => (prev ? { ...prev, activeRole: role } : prev));
      void updateActiveRole(user.id, role).catch(() => undefined);
    },
    [user],
  );

  const changeRole = useCallback(() => {
    if (!user || user.roles.length < 2) return;

    setActiveRole(null);
    setUser((prev) => (prev ? { ...prev, activeRole: null } : prev));
    void updateActiveRole(user.id, null).catch(() => undefined);
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setActiveRole(null);
    void logoutUser().catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      user,
      activeRole,
      isRestoring,
      login,
      register,
      selectRole,
      changeRole,
      logout,
    }),
    [
      user,
      activeRole,
      isRestoring,
      login,
      register,
      selectRole,
      changeRole,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
