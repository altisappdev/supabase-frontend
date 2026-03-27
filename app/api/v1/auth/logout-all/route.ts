import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { logoutAllSessions } from "@/lib/server/auth/service";
import { authenticateRequest } from "@/lib/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    await logoutAllSessions(auth.userId);

    return jsonResponse(null, "Logout successful from all device.");
  } catch (error) {
    return errorResponse(error);
  }
}
