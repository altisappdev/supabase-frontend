import type { AuthTokens } from "@/lib/types";
import { dispatchAuthEvent } from "@/lib/auth/events";

const ACCESS_TOKEN_KEY = "todo.accessToken";
const REFRESH_TOKEN_KEY = "todo.refreshToken";

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function setStoredTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  dispatchAuthEvent("tokens-updated");
}

export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthEvent("logged-out");
}

export function hasStoredTokens() {
  return Boolean(getStoredTokens());
}
