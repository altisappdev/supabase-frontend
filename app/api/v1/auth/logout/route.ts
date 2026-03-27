import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { logoutCurrentSession } from "@/lib/server/auth/service";
import { authenticateRequest } from "@/lib/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    await logoutCurrentSession(auth.userId, auth.sid);

    return jsonResponse(null, "Logout successful.");
  } catch (error) {
    return errorResponse(error);
  }
}
