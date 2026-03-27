import { decryptPayload, encryptPayload } from "@/lib/auth/crypto";
import { apiClient } from "@/lib/api/client";
import type { ApiResponseEnvelope, AuthCheckResult, AuthTokens, LoginPayload } from "@/lib/types";

export async function checkUserCredential(credential: string) {
  const response = await apiClient.post<{ data: string }>("/auth/check", {
    data: encryptPayload({ credential }),
  });

  const decrypted = decryptPayload<ApiResponseEnvelope<AuthCheckResult>>(response.data.data);
  return decrypted.data;
}

export async function sendEmailOtp(email: string) {
  const response = await apiClient.post<ApiResponseEnvelope<null>>("/otp/send", {
    data: encryptPayload({
      credential: email,
      is_email: true,
    }),
  });

  return response.data;
}

export async function loginWithEmailOtp(payload: LoginPayload) {
  const response = await apiClient.post<{ data: string }>("/auth/login", {
    data: encryptPayload({
      auth_method: "EMAIL_OTP",
      email: payload.email,
      otp: payload.otp,
      first_name: payload.first_name?.trim() || undefined,
      last_name: payload.last_name?.trim() || undefined,
    }),
  });

  const decrypted = decryptPayload<ApiResponseEnvelope<AuthTokens>>(response.data.data);
  return decrypted.data;
}

export async function logoutCurrentSession() {
  await apiClient.post("/auth/logout");
}
