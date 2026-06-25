import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  // Keep the module-level _authToken always in sync with React state
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

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

          // Background refresh to pick up any server-side role changes (e.g. isAdmin toggled)
          try {
            const customerId = parsed.customerId ?? parsed.id;
            const res = await fetch(
              new URL(`/api/customers/${customerId}`, getApiUrl()).toString(),
              { headers: { Authorization: `Bearer ${storedToken}` } }
            );
            if (res.status === 401) {
              // Session no longer valid — wipe it silently
              setUserState(null);
              setTokenState(null);
              setAuthToken(null);
              deleteItem(USER_STORE_KEY).catch(() => {});
              deleteItem(TOKEN_STORE_KEY).catch(() => {});
            } else if (res.ok) {
              const body = await res.json();
              const fresh = body.customer ?? body;
              const updated: UserData = {
                ...parsed,
                name: fresh.full_name ?? fresh.fullName ?? parsed.name,
                email: fresh.email ?? parsed.email,
                cityId: fresh.city_id ?? fresh.cityId ?? parsed.cityId,
                isAdmin: fresh.is_admin ?? fresh.isAdmin ?? false,
              };
              setUserState(updated);
              storeItem(USER_STORE_KEY, JSON.stringify(updated)).catch(() => {});
            }
          } catch {
            // Network error — keep the cached session as-is
          }
        }
      } catch {}
      setIsHydrated(true);
    })();
  }, []);

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
