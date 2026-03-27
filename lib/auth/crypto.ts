import CryptoJS from "crypto-js";

function getEncryptionKey() {
  const encryptionKey = process.env.NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error("NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY is not configured.");
  }

  return encryptionKey;
}

export function encryptPayload(payload: unknown) {
  return CryptoJS.AES.encrypt(JSON.stringify(payload), getEncryptionKey()).toString();
}

export function decryptPayload<T>(payload: string) {
  const bytes = CryptoJS.AES.decrypt(payload, getEncryptionKey());
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("Failed to decrypt the API payload.");
  }

  return JSON.parse(decrypted) as T;
}
