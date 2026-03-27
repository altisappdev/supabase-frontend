import { encryptedJsonResponse, errorResponse } from "@/lib/server/api-response";
import { refreshUserTokens } from "@/lib/server/auth/service";
import { parseJsonBody } from "@/lib/server/request-utils";
import { createValidationError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ data?: string }>(request);

    if (typeof body.data !== "string" || !body.data.trim()) {
      throw createValidationError([{ field: "data", errors: ["data is required"] }]);
    }

    const result = await refreshUserTokens(body.data);
    return encryptedJsonResponse(result, "Tokens refreshed successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
