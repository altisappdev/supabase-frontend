import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth/session";
import { getRequestBaseUrl } from "@/lib/server/request-utils";
import { updateCurrentUserProfile } from "@/lib/server/user/service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const formData = await request.formData();
    const image = formData.get("image");
    const file = image instanceof File ? image : null;

    const user = await updateCurrentUserProfile(
      auth.userId,
      {
        first_name: typeof formData.get("first_name") === "string" ? String(formData.get("first_name")).trim() : undefined,
        last_name: typeof formData.get("last_name") === "string" ? String(formData.get("last_name")).trim() : undefined,
        email:
          typeof formData.get("email") === "string"
            ? String(formData.get("email")).trim().toLowerCase()
            : undefined,
        phone_no: typeof formData.get("phone_no") === "string" ? String(formData.get("phone_no")).trim() : undefined,
      },
      getRequestBaseUrl(request),
      file,
    );

    return jsonResponse(user, "User profile updated successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}
