import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { dirname, extname, resolve } from "path";
import { getOptionalEnv } from "@/lib/server/env";
import { HttpError } from "@/lib/server/errors";
import {
  assertNoSupabaseError,
  attachRole,
  findUserWithRoleById,
  getProfileBucket,
  getSupabaseAdmin,
} from "@/lib/server/supabase/client";
import type { UserWithRole } from "@/lib/server/supabase/types";

type ResolvedUserWithRole = UserWithRole & {
  role: NonNullable<UserWithRole["role"]>;
};

interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_no?: string;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

function normalizeStoredPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isLocalUploadPath(imagePath: string) {
  return normalizeStoredPath(imagePath).startsWith("uploads/");
}

function getUploadsRoot() {
  return resolve(process.cwd(), "uploads");
}

function resolveLocalUploadPath(filePath: string) {
  return resolve(process.cwd(), ...normalizeStoredPath(filePath).split("/"));
}

function resolveImageExtension(fileNameSource: string, mimeType?: string) {
  const extension =
    extname(fileNameSource) || `.${String(mimeType || "image/jpeg").split("/")[1] || "jpg"}`;

  return extension.toLowerCase();
}

function shouldFallbackToLocalStorage(message?: string) {
  return (message || "").toLowerCase().includes("bucket not found");
}

function getLocalStoragePath(userId: string, fileName: string) {
  const baseImagePath = getOptionalEnv("BASE_IMAGE_PATH", "uploads") || "uploads";
  const profileImagePath = getOptionalEnv("USER_PROFILE_IMAGE_PATH", "user-profile") || "user-profile";

  return [baseImagePath, profileImagePath, userId, fileName].join("/");
}

async function requireCurrentUser(userId: string): Promise<ResolvedUserWithRole> {
  const user = await findUserWithRoleById(userId);

  if (!user?.role) {
    throw new HttpError(404, "User not found.");
  }

  return user as ResolvedUserWithRole;
}

async function syncAuthUser(user: ResolvedUserWithRole) {
  if (!user.auth_user_id) {
    return;
  }

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.auth_user_id, {
    user_metadata: {
      app_user_id: user.id,
      auth_method: user.auth_method,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_no: user.phone_no,
    },
    ...(user.email
      ? {
          email: user.email,
          email_confirm: true,
        }
      : {}),
    ...(user.phone_no
      ? {
          phone: user.phone_no,
          phone_confirm: true,
        }
      : {}),
  });

  if (error) {
    throw new HttpError(400, `Failed to sync auth user: ${error.message}`);
  }
}

async function getProfileImageUrl(imagePath: string | null, requestBaseUrl: string) {
  if (!imagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  if (isLocalUploadPath(imagePath)) {
    const normalizedPath = normalizeStoredPath(imagePath).replace(/^uploads\//, "");
    return `${requestBaseUrl}/api/uploads/${normalizedPath}`;
  }

  const { data, error } = await getSupabaseAdmin().storage
    .from(getProfileBucket())
    .createSignedUrl(imagePath, 3600);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

async function formatUser(user: ResolvedUserWithRole, requestBaseUrl: string) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone_no: user.phone_no,
    status: user.status,
    auth_method: user.auth_method,
    image: user.image,
    image_url: await getProfileImageUrl(user.image, requestBaseUrl),
    role: {
      id: user.role.id,
      title: user.role.title,
      description: user.role.description,
    },
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function storeProfileImageLocally(
  userId: string,
  fileBuffer: Buffer,
  fileNameSource: string,
  mimeType?: string,
) {
  const extension = resolveImageExtension(fileNameSource, mimeType);
  const fileName = `profile-${Date.now()}-${randomUUID()}${extension}`;
  const relativePath = getLocalStoragePath(userId, fileName);
  const absolutePath = resolveLocalUploadPath(relativePath);

  await fs.mkdir(dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, fileBuffer);

  return relativePath;
}

async function uploadProfileImage(userId: string, file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new HttpError(400, "Only image files are allowed");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new HttpError(400, "Image size must be 5MB or less.");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const extension = resolveImageExtension(file.name || "profile.jpg", file.type);
  const filePath = `users/${userId}/profile-${Date.now()}-${randomUUID()}${extension}`;
  const bucketName = getProfileBucket();

  const { data, error } = await getSupabaseAdmin().storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (!error && data?.path) {
    return data.path;
  }

  throw new HttpError(
    400,
    error?.message
      ? `Failed to upload profile image to bucket \"${bucketName}\": ${error.message}`
      : "Failed to upload profile image.",
  );
}

async function removeLocalStoredImage(imagePath: string) {
  const uploadsRoot = getUploadsRoot();
  const absolutePath = resolveLocalUploadPath(imagePath);

  if (!absolutePath.startsWith(uploadsRoot)) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch {
    return;
  }
}

async function removeStoredImage(imagePath: string) {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) {
    return;
  }

  if (isLocalUploadPath(imagePath)) {
    await removeLocalStoredImage(imagePath);
    return;
  }

  await getSupabaseAdmin().storage.from(getProfileBucket()).remove([imagePath]);
}

export async function getCurrentUserProfile(userId: string, requestBaseUrl: string) {
  const user = await requireCurrentUser(userId);
  return formatUser(user, requestBaseUrl);
}

export async function updateCurrentUserProfile(
  userId: string,
  input: UpdateProfileInput,
  requestBaseUrl: string,
  file?: File | null,
) {
  const currentUser = await requireCurrentUser(userId);
  const payload: Record<string, unknown> = {};
  let uploadedImagePath: string | null = null;

  try {
    if (input.first_name !== undefined) {
      payload.first_name = input.first_name || null;
    }

    if (input.last_name !== undefined) {
      payload.last_name = input.last_name || null;
    }

    if (input.email !== undefined) {
      payload.email = input.email || null;
    }

    if (input.phone_no !== undefined) {
      payload.phone_no = input.phone_no || null;
    }

    if (file) {
      uploadedImagePath = await uploadProfileImage(userId, file);
      payload.image = uploadedImagePath;
    }

    if (Object.keys(payload).length === 0) {
      return formatUser(currentUser, requestBaseUrl);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("tbl_users")
      .update(payload)
      .eq("id", userId)
      .select("*")
      .single();

    assertNoSupabaseError(error, "Failed to update user profile");

    const attachedUser = await attachRole(data);

    if (!attachedUser?.role) {
      throw new HttpError(404, "User not found.");
    }

    const updatedUser = attachedUser as ResolvedUserWithRole;

    await syncAuthUser(updatedUser);

    if (uploadedImagePath && currentUser.image && currentUser.image !== uploadedImagePath) {
      await removeStoredImage(currentUser.image);
    }

    return formatUser(updatedUser, requestBaseUrl);
  } catch (error) {
    if (uploadedImagePath) {
      await removeStoredImage(uploadedImagePath);
    }

    throw error;
  }
}
