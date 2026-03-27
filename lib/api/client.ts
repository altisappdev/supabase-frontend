import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { decryptPayload, encryptPayload } from "@/lib/auth/crypto";
import { clearStoredTokens, getStoredTokens, setStoredTokens } from "@/lib/auth/storage";
import type { ApiResponseEnvelope, AuthTokens } from "@/lib/types";

export const apiBaseUrl = "/api/v1";

const defaultApiHeaders = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultApiHeaders,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultApiHeaders,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function flushPendingRequests(error?: unknown, accessToken?: string) {
  pendingRequests.forEach((request) => {
    if (error) {
      request.reject(error);
      return;
    }

    if (accessToken) {
      request.resolve(accessToken);
    }
  });

  pendingRequests = [];
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function requestNewTokens() {
  const tokens = getStoredTokens();

  if (!tokens?.refreshToken) {
    throw new Error("Refresh token not found.");
  }

  const response = await refreshClient.post<{ data: string }>("/auth/refresh", {
    data: encryptPayload({
      refreshToken: tokens.refreshToken,
    }),
  });

  const decrypted = decryptPayload<ApiResponseEnvelope<AuthTokens>>(response.data.data);
  return decrypted.data;
}

apiClient.interceptors.request.use((config) => {
  const tokens = getStoredTokens();

  if (tokens?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (requestUrl.includes("/auth/refresh") && (status === 400 || status === 401)) {
      clearStoredTokens();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (
      status !== 401 ||
      originalRequest._retry ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/check") ||
      requestUrl.includes("/otp/send")
    ) {
      return Promise.reject(error);
    }

    if (!getStoredTokens()?.refreshToken) {
      clearStoredTokens();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (accessToken) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newTokens = await requestNewTokens();
      setStoredTokens(newTokens);
      flushPendingRequests(undefined, newTokens.accessToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(refreshError);

      if (
        axios.isAxiosError(refreshError) &&
        (refreshError.response?.status === 400 || refreshError.response?.status === 401)
      ) {
        clearStoredTokens();
        redirectToLogin();
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
