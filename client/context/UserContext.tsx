import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { AppState, AppStateStatus, Alert } from "react-native";
import { storeItem, loadItem, deleteItem } from "@/lib/secureStorage";
import { setAuthToken, getApiUrl } from "@/lib/query-client";

export interface UserData {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  customerId?: string;
  cityId?: string;
  isAdmin?: boolean;
}

const USER_STORE_KEY = "laqit_user";
const TOKEN_STORE_KEY = "laqit_token";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UserContextType {
  user: UserData | null;
  token: string | null;
  setUser: (user: UserData | null) => void;
  setSession: (user: UserData, token: string) => void;
  clearSession: () => void;
  isLoggedIn: boolean;
  isHydrated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Refs so the refresh helper always sees the latest values without
  // needing to be re-created (avoids stale closures in listeners/intervals).
  const userRef = useRef<UserData | null>(null);
  const tokenRef = useRef<string | null>(null);
  userRef.current = user;
  tokenRef.current = token;

  // Keep the module-level _authToken always in sync with React state
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  /**
   * Fetch the latest profile from the server and merge it into state.
   * - 401 → session expired; clear session and alert the user.
   * - Network error → silent; keep the cached session.
   * - Returns true if the session is still valid after the call.
   */
  const refreshProfile = async (
    currentUser: UserData,
    currentToken: string,
    silent: boolean
  ): Promise<boolean> => {
    try {
      const customerId = currentUser.customerId ?? currentUser.id;
      const res = await fetch(
        new URL(`/api/customers/${customerId}`, getApiUrl()).toString(),
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      if (res.status === 401) {
        setUserState(null);
        setTokenState(null);
        setAuthToken(null);
        deleteItem(USER_STORE_KEY).catch(() => {});
        deleteItem(TOKEN_STORE_KEY).catch(() => {});
        if (!silent) {
          Alert.alert(
            "انتهت الجلسة",
            "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجددًا.",
            [{ text: "حسنًا" }]
          );
        }
        return false;
      }

      if (res.ok) {
        const body = await res.json();
        const fresh = body.customer ?? body;
        const updated: UserData = {
          ...currentUser,
          name: fresh.full_name ?? fresh.fullName ?? currentUser.name,
          email: fresh.email ?? currentUser.email,
          cityId: fresh.city_id ?? fresh.cityId ?? currentUser.cityId,
          isAdmin: fresh.is_admin ?? fresh.isAdmin ?? false,
        };
        setUserState(updated);
        storeItem(USER_STORE_KEY, JSON.stringify(updated)).catch(() => {});
      }

      return true;
    } catch {
      // Network error — keep existing session
      return true;
    }
  };

  // ── Hydration on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await loadItem(USER_STORE_KEY);
        const storedToken = await loadItem(TOKEN_STORE_KEY);
        if (storedUser && storedToken) {
          const parsed: UserData = JSON.parse(storedUser);
          setUserState(parsed);
          setTokenState(storedToken);
          setAuthToken(storedToken);

          // Background refresh at launch (silent — don't alert on startup 401)
          await refreshProfile(parsed, storedToken, true);
        }
      } catch {}
      setIsHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Periodic refresh: AppState listener + interval ─────────────────────────
  useEffect(() => {
    const runRefresh = () => {
      const u = userRef.current;
      const t = tokenRef.current;
      if (u && t) {
        refreshProfile(u, t, false);
      }
    };

    // Trigger refresh whenever the app comes back to the foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          runRefresh();
        }
      }
    );

    // Also refresh on a fixed interval while the app is open
    const interval = setInterval(runRefresh, REFRESH_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session helpers ────────────────────────────────────────────────────────
  const setSession = (newUser: UserData, newToken: string) => {
    setUserState(newUser);
    setTokenState(newToken);
    setAuthToken(newToken);
    storeItem(USER_STORE_KEY, JSON.stringify(newUser)).catch(() => {});
    storeItem(TOKEN_STORE_KEY, newToken).catch(() => {});
  };

  const clearSession = () => {
    setUserState(null);
    setTokenState(null);
    setAuthToken(null);
    deleteItem(USER_STORE_KEY).catch(() => {});
    deleteItem(TOKEN_STORE_KEY).catch(() => {});
  };

  const setUser = (newUser: UserData | null) => {
    if (newUser === null) {
      clearSession();
    } else {
      setUserState(newUser);
      storeItem(USER_STORE_KEY, JSON.stringify(newUser)).catch(() => {});
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        setUser,
        setSession,
        clearSession,
        isLoggedIn: !!user && !!token,
        isHydrated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
