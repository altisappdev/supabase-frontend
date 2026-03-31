import { randomUUID } from "crypto";
import {
  comparePassword,
  createSessionSecret,
  decryptServerData,
  encryptServerData,
  generateRandomId,
  hashPassword,
  hashSha256,
} from "@/lib/server/crypto";
import { sendResetPasswordEmail } from "@/lib/server/mail";
import { HttpError } from "@/lib/server/errors";
import { getClientIp, getRequestBaseUrl, getUserAgent } from "@/lib/server/request-utils";
import {
  assertNoSupabaseError,
  attachRole,
  findRoleByTitle,
  findUserByEmail,
  findUserWithRoleByCredential,
  findUserWithRoleByEmail,
  findUserWithRoleById,
  findUserWithRoleByPhone,
  getSupabaseAdmin,
  getSupabasePublic,
} from "@/lib/server/supabase/client";
import type {
  AuthType,
  RoleName,
  UserRow,
  UserSessionRow,
  UserWithRole,
} from "@/lib/server/supabase/types";
import { verifyOneTimePassword } from "@/lib/server/otp/service";
import { signAccessToken } from "@/lib/server/auth/session";

const MAX_ATTEMPTS = 5;
const PENALTY_STEPS = [60, 180, 300, 600];

type ResolvedUserWithRole = UserWithRole & {
  role: NonNullable<UserWithRole["role"]>;
};

interface LoginInput {
  auth_method?: AuthType;
  email?: string | null;
  phone_no?: string | null;
  otp?: string | null;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  provider_id?: string | null;
}

function normalizeEmail(email?: string | null) {
  return email ? email.trim().toLowerCase() : null;
}

function normalizePhone(phone?: string | null) {
  return phone ? phone.trim() : null;
}

function getIdentifier(authMethod: AuthType, email?: string | null, phoneNo?: string | null) {
  if (authMethod === "PHONE_OTP") {
    return normalizePhone(phoneNo);
  }

  return normalizeEmail(email);
}

type AuthFailureRpcClient = ReturnType<typeof getSupabaseAdmin> & {
  rpc(
    fn: "handle_auth_login_failure",
    args: {
      p_identifier: string;
      p_ip_address: string;
      p_max_attempts: number;
      p_penalty_steps: number[];
    },
  ): Promise<{ error: { message: string } | null }>;
};

async function handleAuthFailure(identifier: string, ip: string) {
  const adminClient = getSupabaseAdmin() as AuthFailureRpcClient;
  const { error } = await adminClient.rpc("handle_auth_login_failure", {
    p_identifier: identifier,
    p_ip_address: ip,
    p_max_attempts: MAX_ATTEMPTS,
    p_penalty_steps: PENALTY_STEPS,
  });

  if (error) {
    throw new Error(`Failed to register login failure: ${error.message}`);
  }
}

async function resetAuthLimits(identifier: string, ip: string) {
  const { error } = await getSupabaseAdmin()
    .from("tbl_auth_login_attempt")
    .delete()
    .eq("identifier", identifier)
    .eq("ip_address", ip);

  assertNoSupabaseError(error, "Failed to reset login attempts");
}

async function getActiveBlockTtl(identifier: string, ip: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_auth_login_attempt")
    .select("blocked_until")
    .eq("identifier", identifier)
    .eq("ip_address", ip)
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to fetch login attempt state");

  const blockedUntil = (data as { blocked_until: string | null } | null)?.blocked_until;

  if (!blockedUntil) {
    return 0;
  }

  const ttlSeconds = Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 1000);
  return ttlSeconds > 0 ? ttlSeconds : 0;
}

async function getUserForAuthMethod(
  authMethod: AuthType,
  email?: string | null,
  phoneNo?: string | null,
) {
  if (authMethod === "PHONE_OTP" && phoneNo) {
    return findUserWithRoleByPhone(phoneNo);
  }

  if (email) {
    return findUserWithRoleByEmail(email);
  }

  return null;
}

function ensureRole(user: UserWithRole | null): asserts user is ResolvedUserWithRole {
  if (!user?.role) {
    throw new Error("Role not found for user");
  }
}

async function updateUserRecord(userId: string, payload: Partial<UserRow>) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .single();

  assertNoSupabaseError(error, `Failed to update user ${userId}`);
  return data as UserRow;
}

async function createUserRecord(payload: Partial<UserRow>) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .insert(payload)
    .select("*")
    .single();

  assertNoSupabaseError(error, "Failed to create user");

  const user = await attachRole(data as UserRow);
  ensureRole(user);
  return user;
}

function buildAuthMetadata(user: UserRow | UserWithRole) {
  return {
    app_user_id: user.id,
    auth_method: user.auth_method,
    first_name: user.first_name,
    last_name: user.last_name,
    phone_no: user.phone_no,
  };
}

async function ensureSupabaseAuthUser(
  user: UserRow | UserWithRole,
  options: { plainPassword?: string | null } = {},
) {
  if (!user.email && !user.phone_no) {
    return user.auth_user_id;
  }

  const adminClient = getSupabaseAdmin();
  const metadata = buildAuthMetadata(user);

  if (user.auth_user_id) {
    const updatePayload: Record<string, unknown> = {
      user_metadata: metadata,
    };

    if (user.email) {
      updatePayload.email = user.email;
      updatePayload.email_confirm = true;
    }

    if (user.phone_no) {
      updatePayload.phone = user.phone_no;
      updatePayload.phone_confirm = true;
    }

    if (options.plainPassword) {
      updatePayload.password = options.plainPassword;
    }

    const { error } = await adminClient.auth.admin.updateUserById(user.auth_user_id, updatePayload);
    assertNoSupabaseError(error, `Failed to update auth user ${user.id}`);
    return user.auth_user_id;
  }

  const createPayload: Record<string, unknown> = {
    user_metadata: metadata,
    password: options.plainPassword || createSessionSecret(),
  };

  if (user.email) {
    createPayload.email = user.email;
    createPayload.email_confirm = true;
  }

  if (user.phone_no) {
    createPayload.phone = user.phone_no;
    createPayload.phone_confirm = true;
  }

  const { data, error } = await adminClient.auth.admin.createUser(createPayload);
  assertNoSupabaseError(error, `Failed to create auth user for ${user.id}`);

  const authUserId = data.user?.id ?? null;

  if (authUserId) {
    await updateUserRecord(user.id, { auth_user_id: authUserId });
  }

  return authUserId;
}

async function verifyEmailPassword(user: UserRow, email: string, password: string) {
  if (user.auth_user_id) {
    const { error } = await getSupabasePublic().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new HttpError(400, "Invalid credentials");
    }

    return;
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    throw new HttpError(400, "Invalid credentials");
  }

  await ensureSupabaseAuthUser(user, { plainPassword: password });
}

async function verifyAuth(payload: LoginInput, ip: string) {
  const authMethod = payload.auth_method as AuthType;
  const email = normalizeEmail(payload.email);
  const phoneNo = normalizePhone(payload.phone_no);
  const password = payload.password?.trim();
  const otp = payload.otp?.trim();
  const identifier = getIdentifier(authMethod, email, phoneNo);

  try {
    if (authMethod === "EMAIL_PW") {
      if (!email || !password) {
        throw new HttpError(400, "Email and password required");
      }

      const user = await findUserByEmail(email);

      if (!user || user.auth_method !== "EMAIL_PW") {
        throw new HttpError(400, "Invalid credentials");
      }

      await verifyEmailPassword(user, email, password);
      await resetAuthLimits(identifier || email, ip);
      return true;
    }

    if (authMethod === "EMAIL_OTP") {
      if (!email || !otp) {
        throw new HttpError(400, "Email and OTP required");
      }

      await verifyOneTimePassword({
        credential: email,
        is_email: true,
        otp,
      });
      await resetAuthLimits(identifier || email, ip);
      return true;
    }

    if (authMethod === "PHONE_OTP") {
      if (!phoneNo || !otp) {
        throw new HttpError(400, "Phone number and OTP required");
      }

      await verifyOneTimePassword({
        credential: phoneNo,
        is_email: false,
        otp,
      });
      await resetAuthLimits(identifier || phoneNo, ip);
      return true;
    }

    throw new HttpError(400, "Invalid authentication method");
  } catch (error) {
    if (identifier) {
      await handleAuthFailure(identifier, ip);
    }

    throw error;
  }
}

export async function checkUserByCredential(payload: { credential?: string | null }) {
  const credential = payload.credential?.trim();

  if (!credential) {
    return {
      is_exists: false,
      is_admin: false,
    };
  }

  const user = await findUserWithRoleByCredential(credential);

  if (!user || user.is_deleted) {
    return {
      is_exists: false,
      is_admin: false,
    };
  }

  return {
    is_exists: true,
    is_admin: user.role?.title === ("SUPERADMIN" as RoleName),
  };
}

export async function createSession(user: ResolvedUserWithRole, request?: Request) {
  const sessionId = randomUUID();
  const refreshPlain = createSessionSecret();
  const refreshHash = hashSha256(refreshPlain);
  const refreshEncrypted = encryptServerData(refreshPlain);

  const { data, error } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      ip_address: request ? getClientIp(request) : null,
      device_info: request ? getUserAgent(request) || null : null,
      refresh_token_hash: refreshHash,
      refresh_token_encrypted: refreshEncrypted,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  assertNoSupabaseError(error, "Failed to create session");

  return {
    session: data as UserSessionRow,
    refreshPlain,
  };
}

export async function loginUser(payload: LoginInput, request: Request) {
  const authMethod = payload.auth_method as AuthType | undefined;
  const email = normalizeEmail(payload.email);
  const phoneNo = normalizePhone(payload.phone_no);
  const identifier = authMethod ? getIdentifier(authMethod, email, phoneNo) : null;
  const ip = getClientIp(request);

  if (!authMethod) {
    throw new HttpError(400, "Auth method required");
  }

  if (["EMAIL_PW", "EMAIL_OTP", "PHONE_OTP"].includes(authMethod)) {
    const activeBlockTtl = identifier ? await getActiveBlockTtl(identifier, ip) : 0;

    if (activeBlockTtl > 0) {
      throw new HttpError(
        400,
        `Too many failed login attempts. Try again in ${activeBlockTtl} seconds.`,
      );
    }

    await verifyAuth(
      {
        ...payload,
        auth_method: authMethod,
        email,
        phone_no: phoneNo,
      },
      ip,
    );
  }

  let user = await getUserForAuthMethod(authMethod, email, phoneNo);

  if (user?.status === "INACTIVE") {
    throw new HttpError(400, "Sorry, your account is Suspended.");
  }

  if (authMethod === "GOOGLE" || authMethod === "APPLE") {
    if (!payload.provider_id) {
      throw new HttpError(400, "Provider ID required");
    }

    if (user?.auth_method === "EMAIL_OTP") {
      throw new HttpError(400, "Invalid login method. Please log in using Email & OTP.");
    }

    if (user?.auth_method === "EMAIL_PW") {
      throw new HttpError(400, "Invalid login method. Please log in using Email & Password.");
    }

    if (user) {
      const isValid = await comparePassword(payload.provider_id, user.provider_id);

      if (!isValid) {
        if (identifier) {
          await handleAuthFailure(identifier, ip);
        }

        throw new HttpError(400, "Invalid credentials");
      }

      if (identifier) {
        await resetAuthLimits(identifier, ip);
      }

      await ensureSupabaseAuthUser(user);
    }
  }

  const editorRole = await findRoleByTitle("EDITOR");

  if (!editorRole) {
    throw new Error("Role not found");
  }

  if (!user) {
    user = await createUserRecord({
      first_name: payload.first_name?.trim() || null,
      last_name: payload.last_name?.trim() || null,
      email,
      phone_no: phoneNo,
      auth_method: authMethod,
      provider_id:
        authMethod === "GOOGLE" || authMethod === "APPLE"
          ? await hashPassword(payload.provider_id || "")
          : null,
      role_id: editorRole.id,
    });

    await ensureSupabaseAuthUser(user);
    user = await findUserWithRoleById(user.id);
  }

  ensureRole(user);

  const { session, refreshPlain } = await createSession(user, request);
  const accessToken = signAccessToken({
    userId: user.id,
    sessionId: session.session_id,
    role: {
      id: user.role.id.toString(),
      title: user.role.title,
    },
    status: user.status,
  });

  return {
    accessToken,
    refreshToken: encryptServerData(refreshPlain),
  };
}

export async function refreshUserTokens(data: string) {
  const decrypted = decryptServerData<{ refreshToken?: string }>(data);

  if (!decrypted?.refreshToken || typeof decrypted.refreshToken !== "string") {
    throw new HttpError(400, "Refresh token not found.");
  }

  const refreshHash = hashSha256(decryptServerData<string>(decrypted.refreshToken));

  const { data: session, error } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .select("*")
    .eq("refresh_token_hash", refreshHash)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to fetch session");

  if (!session) {
    throw new HttpError(400, "Session expired");
  }

  const user = await findUserWithRoleById(session.user_id);
  ensureRole(user);

  const newPlain = createSessionSecret();
  const newHash = hashSha256(newPlain);
  const newEncrypted = encryptServerData(newPlain);

  const { error: updateError } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .update({
      refresh_token_hash: newHash,
      refresh_token_encrypted: newEncrypted,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  assertNoSupabaseError(updateError, "Failed to rotate refresh token");

  return {
    accessToken: signAccessToken({
      userId: user.id,
      sessionId: session.session_id,
      role: {
        id: user.role.id.toString(),
        title: user.role.title,
      },
      status: user.status,
    }),
    refreshToken: encryptServerData(newPlain),
  };
}

export async function logoutCurrentSession(userId: string, sid: string) {
  const { error } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .update({
      revoked: true,
      last_used_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("session_id", sid)
    .eq("revoked", false);

  assertNoSupabaseError(error, "Failed to revoke session");
  return true;
}

export async function logoutAllSessions(userId: string) {
  const { error } = await getSupabaseAdmin()
    .from("tbl_user_session")
    .update({
      revoked: true,
      last_used_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("revoked", false);

  assertNoSupabaseError(error, "Failed to revoke all sessions");
  return true;
}

export async function requestPasswordReset(payload: { email?: string | null }, request: Request) {
  const email = normalizeEmail(payload.email);

  if (!email) {
    throw new HttpError(400, "Email address not found.");
  }

  const user = await findUserByEmail(email);

  if (!user?.email) {
    throw new HttpError(400, "Email address not found.");
  }

  if (user.auth_method !== "EMAIL_OTP" && user.auth_method !== "EMAIL_PW") {
    if (user.auth_method === "APPLE") {
      throw new HttpError(400, "Account created with 'Continue with Apple'");
    }

    if (user.auth_method === "GOOGLE") {
      throw new HttpError(400, "Account created with 'Continue with Google'");
    }
  }

  const token = generateRandomId(12);
  const expiryMinutes = 5;
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  await updateUserRecord(user.id, {
    reset_token: token,
    reset_token_exp: expiry,
  });

  const resetLink = `${getRequestBaseUrl(request)}/admin/forgot-password?token=${token}`;

  void sendResetPasswordEmail(user.email, resetLink, token, expiryMinutes).catch((error) => {
    console.error("Failed to send reset password email", error);
  });

  return true;
}

export async function resetPassword(payload: { token?: string | null; new_password?: string | null }) {
  const token = payload.token?.trim();
  const newPassword = payload.new_password?.trim();

  if (!token || !newPassword) {
    throw new HttpError(400, "Token and new password are required.");
  }

  const { data: user, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .select("*")
    .eq("reset_token", token)
    .gt("reset_token_exp", new Date().toISOString())
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to fetch reset token");

  if (!user) {
    return false;
  }

  const hashedPassword = await hashPassword(newPassword);
  const updatedUser = await updateUserRecord(user.id, {
    password: hashedPassword,
    reset_token: null,
    reset_token_exp: null,
  });

  await ensureSupabaseAuthUser(updatedUser, { plainPassword: newPassword });
  return true;
}
