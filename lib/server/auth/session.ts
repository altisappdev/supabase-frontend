import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { getOptionalEnv, getRequiredEnv } from "@/lib/server/env";
import { HttpError } from "@/lib/server/errors";
import {
  assertNoSupabaseError,
  findUserById,
  getSupabaseAdmin,
} from "@/lib/server/supabase/client";
import type { UserRow } from "@/lib/server/supabase/types";

interface TokenRole {
  id: string;
  title: string;
}

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  sid: string;
  role: TokenRole;
  status: string;
}

function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

export function signAccessToken(input: {
  userId: string;
  sessionId: string;
  role: TokenRole;
  status: string;
}) {
  const expiresIn = (getOptionalEnv("JWT_EXPIRATION", "1h") || "1h") as SignOptions["expiresIn"];

  return jwt.sign(
    {
      sub: input.userId,
      role: input.role,
      sid: input.sessionId,
      status: input.status,
    },
    getJwtSecret(),
    { expiresIn },
  );
}

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization token is required.");
  }

  return authorization.slice("Bearer ".length).trim();
}

function ensurePayload(value: string | JwtPayload): AccessTokenPayload {
  if (typeof value === "string") {
    throw new HttpError(401, "Invalid token payload.");
  }

  if (!value.sub || typeof value.sub !== "string" || !value.sid || typeof value.sid !== "string") {
    throw new HttpError(401, "Invalid token payload.");
  }

  return value as AccessTokenPayload;
}

export async function authenticateRequest(request: Request) {
  const token = extractBearerToken(request);

  let payload: AccessTokenPayload;

  try {
    payload = ensurePayload(jwt.verify(token, getJwtSecret()));
  } catch {
    throw new HttpError(401, "Invalid or expired token.");
  }

  const { data: session, error } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .select("id")
    .eq("session_id", payload.sid)
    .eq("user_id", payload.sub)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to validate session");

  if (!session) {
    throw new HttpError(401, "Session expired");
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw new HttpError(401, "Invalid token");
  }

  return {
    payload,
    user,
    userId: user.id,
    sid: payload.sid,
  } as {
    payload: AccessTokenPayload;
    user: UserRow;
    userId: string;
    sid: string;
  };
}
