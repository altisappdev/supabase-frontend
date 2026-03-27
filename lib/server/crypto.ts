import { createHash, randomUUID } from "crypto";
import CryptoJS from "crypto-js";
import { compare, hash } from "bcryptjs";
import { getBooleanEnv, getRequiredEnv } from "@/lib/server/env";
import { HttpError } from "@/lib/server/errors";

function getEncryptionKey() {
  return getRequiredEnv(["PRIVATE_ENCRYPTION_KEY", "NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY"]);
}

export function encryptServerData(data: unknown) {
  const payload = JSON.stringify(data, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  return CryptoJS.AES.encrypt(payload, getEncryptionKey()).toString();
}

export function decryptServerData<T>(data: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(data, getEncryptionKey());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new HttpError(400, "Invalid encrypted payload.");
    }

    return JSON.parse(decrypted) as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "Invalid encrypted payload.");
  }
}

export function generateOtp() {
  if (!getBooleanEnv("OTP_SMS_SEND", false)) {
    return "111111";
  }

  let otp = `${Math.floor(Math.random() * 9) + 1}`;

  for (let index = 1; index < 6; index += 1) {
    otp += Math.floor(Math.random() * 10);
  }

  return otp;
}

export async function hashPassword(value: string) {
  return hash(value, 10);
}

export async function comparePassword(value: string, hashedValue?: string | null) {
  if (!hashedValue) {
    return false;
  }

  return compare(value, hashedValue);
}

export function generateRandomId(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%!&";
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export function hashSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionSecret() {
  return `${randomUUID()}${randomUUID()}`;
}
