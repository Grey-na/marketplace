"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { User } from "@/types/api";
import type { LoginValues, RegisterValues } from "@/lib/validation/auth";

type AuthState = {
  user: User | null;
  loading: boolean;            // true until we know whether someone is logged in
  login: (values: LoginValues) => Promise<User>;
  register: (values: RegisterValues) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // when the website opens: is someone logged in? (the cookie answers, renewed automatically if needed)
  useEffect(() => {
    let cancelled = false;
    apiFetch<User>("/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.result);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (values: LoginValues) => {
    await apiFetch("/auth/login", { method: "POST", body: values });
    const me = await apiFetch<User>("/auth/me");
    setUser(me.result);
    return me.result;
  }, []);

  // after registering, the person is logged in straight away
  const register = useCallback(
    async (values: RegisterValues) => {
      await apiFetch("/auth/register", { method: "POST", body: values });
      return login({ username: values.username, password: values.password });
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}