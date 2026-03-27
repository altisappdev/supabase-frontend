import { getOptionalEnv } from "@/lib/server/env";
import { decryptServerData } from "@/lib/server/crypto";
import { createValidationError, HttpError } from "@/lib/server/errors";

export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

export async function parseEncryptedBody<T>(request: Request) {
  const body = await parseJsonBody<{ data?: string }>(request);

  if (typeof body?.data !== "string" || !body.data.trim()) {
    throw createValidationError([{ field: "data", errors: ["data is required"] }]);
  }

  return {
    raw: body.data,
    payload: decryptServerData<T>(body.data),
  };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  }

  return request.headers.get("x-real-ip") || "unknown-ip";
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent");
}

export function getRequestBaseUrl(request: Request) {
  const configuredBaseUrl = getOptionalEnv("WEB_BASE_PATH");

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin;
}

export function ensureString(value: unknown, field: string, label = field) {
  if (typeof value !== "string" || !value.trim()) {
    throw createValidationError([{ field, errors: [`${label} is required`] }]);
  }

  return value.trim();
}

export function ensureOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

export function ensureAllowedString<T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[],
) {
  const normalized = ensureString(value, field);

  if (!allowedValues.includes(normalized as T)) {
    throw createValidationError([
      { field, errors: [`${field} must be one of ${allowedValues.join(", ")}`] },
    ]);
  }

  return normalized as T;
}
