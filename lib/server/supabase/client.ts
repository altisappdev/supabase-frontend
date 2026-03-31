import {
  createClient,
  type AuthError,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { getOptionalEnv, getRequiredEnv } from "@/lib/server/env";
import type {
  RoleName,
  RoleRow,
  UserRow,
  UserWithRole,
} from "@/lib/server/supabase/types";

const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]),
      authOptions,
    );
  }

  return adminClient;
}

export function getSupabasePublic() {
  if (!publicClient) {
    publicClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_ANON_KEY"),
      authOptions,
    );
  }

  return publicClient;
}

export function getProfileBucket(): string {
  return getOptionalEnv("SUPABASE_PROFILE_BUCKET", "profile-images") || "profile-images";
}

export function assertNoSupabaseError(
  error: PostgrestError | AuthError | null,
  context: string,
): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function findRoleByTitle(title: RoleName) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_role")
    .select("*")
    .eq("title", title)
    .maybeSingle();

  assertNoSupabaseError(error, `Failed to fetch role ${title}`);
  return (data as RoleRow | null) ?? null;
}

export async function findRoleById(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_role")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoSupabaseError(error, `Failed to fetch role ${id}`);
  return (data as RoleRow | null) ?? null;
}

export async function findUserById(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoSupabaseError(error, `Failed to fetch user ${id}`);
  return (data as UserRow | null) ?? null;
}

export async function findUserByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .select("*")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();

  assertNoSupabaseError(error, `Failed to fetch user by email ${email}`);
  return (data as UserRow | null) ?? null;
}

export async function findUserByPhone(phone: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_users")
    .select("*")
    .eq("phone_no", phone.trim())
    .maybeSingle();

  assertNoSupabaseError(error, `Failed to fetch user by phone ${phone}`);
  return (data as UserRow | null) ?? null;
}

export async function findUserByCredential(credential: string) {
  const normalized = credential.trim();
  const byEmail = await findUserByEmail(normalized);

  if (byEmail) {
    return byEmail;
  }

  return findUserByPhone(normalized);
}

export async function attachRole(user: UserRow | null) {
  if (!user) {
    return null;
  }

  const role = await findRoleById(user.role_id);

  return {
    ...user,
    role,
  } as UserWithRole;
}

export async function findUserWithRoleById(id: string) {
  return attachRole(await findUserById(id));
}

export async function findUserWithRoleByEmail(email: string) {
  return attachRole(await findUserByEmail(email));
}

export async function findUserWithRoleByPhone(phone: string) {
  return attachRole(await findUserByPhone(phone));
}

export async function findUserWithRoleByCredential(credential: string) {
  return attachRole(await findUserByCredential(credential));
}