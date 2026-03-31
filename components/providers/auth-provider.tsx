"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/user";
import { loginWithEmailOtp, logoutCurrentSession } from "@/lib/api/auth";
import { AUTH_EVENT_NAME } from "@/lib/auth/events";
import { clearStoredTokens, hasStoredTokens, setStoredTokens } from "@/lib/auth/storage";
import type { AuthStatus, LoginPayload, UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  setSessionUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const setSessionUser = useCallback((nextUser: UserProfile | null) => {
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "unauthenticated");
  }, []);

  const bootstrapUser = useCallback(async () => {
    if (!hasStoredTokens()) {
      setSessionUser(null);
      return null;
    }

    try {
      const profile = await getCurrentUser();
      setSessionUser(profile);
      return profile;
    } catch {
      clearStoredTokens();
      setSessionUser(null);
      return null;
    }
  }, [setSessionUser]);

  useEffect(() => {
    function handleAuthEvent() {
      void bootstrapUser();
    }

    void bootstrapUser();
    window.addEventListener(AUTH_EVENT_NAME, handleAuthEvent as EventListener);

    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthEvent as EventListener);
    };
  }, [bootstrapUser]);

  async function login(payload: LoginPayload) {
    const tokens = await loginWithEmailOtp(payload);
    setStoredTokens(tokens);
    const profile = await getCurrentUser();
    setSessionUser(profile);
    return profile;
  }

  async function logout() {
    try {
      if (hasStoredTokens()) {
        await logoutCurrentSession();
      }
    } catch {
      // Logout should still clear the local session if the API call fails.
    } finally {
      clearStoredTokens();
      setSessionUser(null);

      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
  }

  async function refreshUser() {
    return bootstrapUser();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        logout,
        refreshUser,
        setSessionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}