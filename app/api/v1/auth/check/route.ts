import { encryptedJsonResponse, errorResponse } from "@/lib/server/api-response";
import { checkUserByCredential } from "@/lib/server/auth/service";
import { parseEncryptedBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { payload } = await parseEncryptedBody<{ credential?: string }>(request);
    const result = await checkUserByCredential(payload);

    return encryptedJsonResponse(result, "User checked.");
  } catch (error) {
    return errorResponse(error);
  }
}
