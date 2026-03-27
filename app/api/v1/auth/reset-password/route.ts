import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { resetPassword } from "@/lib/server/auth/service";
import { HttpError } from "@/lib/server/errors";
import { parseEncryptedBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { payload } = await parseEncryptedBody<{
      token?: string | null;
      new_password?: string | null;
    }>(request);
    const result = await resetPassword(payload);

    if (!result) {
      throw new HttpError(400, "Invalid or expired token");
    }

    return jsonResponse(null, "Your password has been reset successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}
