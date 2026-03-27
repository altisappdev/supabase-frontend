import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth/session";
import { getRequestBaseUrl } from "@/lib/server/request-utils";
import { getCurrentUserProfile } from "@/lib/server/user/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const user = await getCurrentUserProfile(auth.userId, getRequestBaseUrl(request));

    return jsonResponse(user, "Fetched user data");
  } catch (error) {
    return errorResponse(error);
  }
}
