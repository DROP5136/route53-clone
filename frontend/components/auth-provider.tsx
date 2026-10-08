"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError, clearToken, getToken, setToken } from "@/lib/api";

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  username: string | null;
  login: (accessToken: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stored = getToken();
    const pending = stored
      ? api<{ username: string }>("/auth/me")
          .then((user) => {
            if (cancelled) {
              return;
            }
            setTokenState(stored);
            setUsername(user.username);
          })
          .catch((error: unknown) => {
            if (cancelled) {
              return;
            }
            if (error instanceof ApiError && error.status === 401) {
              clearToken();
              return;
            }
            setTokenState(stored);
          })
      : Promise.resolve();

    pending.finally(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (accessToken: string) => {
    setToken(accessToken);
    setTokenState(accessToken);
    const user = await api<{ username: string }>("/auth/me");
    setUsername(user.username);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ ready, token, username, login, logout }),
    [ready, token, username, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready && !auth.token) {
      router.replace("/login");
    }
  }, [auth.ready, auth.token, router]);

  return auth;
}
