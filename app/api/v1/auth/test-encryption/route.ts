import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { encryptServerData } from "@/lib/server/crypto";
import { parseJsonBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody<unknown>(request);
    return jsonResponse(encryptServerData(payload), "Encrypted data.");
  } catch (error) {
    return errorResponse(error);
  }
}
