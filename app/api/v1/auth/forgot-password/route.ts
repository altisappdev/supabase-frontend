import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { requestPasswordReset } from "@/lib/server/auth/service";
import { parseEncryptedBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { payload } = await parseEncryptedBody<{ email?: string | null }>(request);
    await requestPasswordReset(payload, request);

    return jsonResponse(
      null,
      "Password reset request accepted. An email will be sent if the email exists.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
