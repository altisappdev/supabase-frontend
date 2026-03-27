import { encryptedJsonResponse, errorResponse } from "@/lib/server/api-response";
import { loginUser } from "@/lib/server/auth/service";
import { parseEncryptedBody } from "@/lib/server/request-utils";
import type { AuthType } from "@/lib/server/supabase/types";

export const runtime = "nodejs";

interface LoginPayload {
  auth_method?: AuthType;
  email?: string | null;
  phone_no?: string | null;
  otp?: string | null;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  provider_id?: string | null;
}

export async function POST(request: Request) {
  try {
    const { payload } = await parseEncryptedBody<LoginPayload>(request);
    const result = await loginUser(payload, request);

    return encryptedJsonResponse(result, "Login successful.");
  } catch (error) {
    return errorResponse(error);
  }
}
