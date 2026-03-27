import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { sendOneTimePassword } from "@/lib/server/otp/service";
import { parseEncryptedBody } from "@/lib/server/request-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { payload } = await parseEncryptedBody<{
      credential?: string;
      is_email?: boolean;
    }>(request);

    await sendOneTimePassword(payload);
    return jsonResponse(null, "OTP sent");
  } catch (error) {
    return errorResponse(error);
  }
}
