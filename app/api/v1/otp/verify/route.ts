import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { parseJsonBody } from "@/lib/server/request-utils";
import { verifyOneTimePassword } from "@/lib/server/otp/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody<{
      credential?: string;
      otp?: string;
      is_email?: boolean;
    }>(request);

    await verifyOneTimePassword(payload);
    return jsonResponse(null, "OTP verified");
  } catch (error) {
    return errorResponse(error);
  }
}
