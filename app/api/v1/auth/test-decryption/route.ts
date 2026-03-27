import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { decryptServerData } from "@/lib/server/crypto";
import { createValidationError } from "@/lib/server/errors";
import { parseJsonBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ data?: string }>(request);

    if (typeof body.data !== "string" || !body.data.trim()) {
      throw createValidationError([{ field: "data", errors: ["data is required"] }]);
    }

    return jsonResponse(decryptServerData(body.data), "Decrypted data.");
  } catch (error) {
    return errorResponse(error);
  }
}
