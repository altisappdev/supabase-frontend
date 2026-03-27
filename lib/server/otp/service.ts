import { ensureString } from "@/lib/server/request-utils";
import { HttpError } from "@/lib/server/errors";
import { generateOtp } from "@/lib/server/crypto";
import { sendOtpEmail } from "@/lib/server/mail";
import { assertNoSupabaseError, getSupabaseAdmin } from "@/lib/server/supabase/client";

interface SendOtpInput {
  credential?: string;
  is_email?: boolean;
}

interface VerifyOtpInput {
  credential?: string;
  otp?: string;
  is_email?: boolean;
}

export async function sendOneTimePassword(input: SendOtpInput) {
  const credential = ensureString(input.credential, "credential", "credential");
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
  const otp = generateOtp();

  const { error } = await getSupabaseAdmin()
    .from("tbl_otp")
    .upsert(
      {
        credential,
        otp,
        limit: 0,
        restricted_time: null,
        is_email: Boolean(input.is_email),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "credential",
      },
    );

  assertNoSupabaseError(error, "Failed to upsert OTP");

  if (input.is_email) {
    void sendOtpEmail(credential, otp).catch((error) => {
      console.error("Failed to send OTP email", error);
    });
  }

  return true;
}

export async function verifyOneTimePassword(input: VerifyOtpInput) {
  const credential = ensureString(input.credential, "credential", "credential");
  const otp = ensureString(input.otp, "otp", "OTP");

  const { data: otpRecord, error } = await getSupabaseAdmin()
    .from("tbl_otp")
    .select("id, otp, limit, expires_at, updated_at")
    .eq("credential", credential)
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to fetch OTP");

  if (!otpRecord) {
    throw new HttpError(400, "Invalid credential.");
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, "OTP has expired.");
  }

  if (otpRecord.otp !== otp) {
    const { error: updateError } = await getSupabaseAdmin()
      .from("tbl_otp")
      .update({
        limit: otpRecord.limit + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", otpRecord.id);

    assertNoSupabaseError(updateError, "Failed to increment OTP attempt count");
    throw new HttpError(400, "Invalid OTP.");
  }

  const { error: deleteError } = await getSupabaseAdmin()
    .from("tbl_otp")
    .delete()
    .eq("id", otpRecord.id);

  assertNoSupabaseError(deleteError, "Failed to delete verified OTP");
  return true;
}
