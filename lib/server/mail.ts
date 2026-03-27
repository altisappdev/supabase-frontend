import nodemailer, { type Transporter } from "nodemailer";
import { getNumberEnv, getOptionalEnv } from "@/lib/server/env";

let transporter: Transporter | null = null;

function isMailConfigured() {
  return Boolean(
    getOptionalEnv("MAIL_HOST") &&
      getOptionalEnv("MAIL_PORT") &&
      getOptionalEnv("MAIL_USER") &&
      getOptionalEnv("MAIL_PASS"),
  );
}

function getTransporter() {
  if (!isMailConfigured()) {
    return null;
  }

  if (!transporter) {
    const port = getNumberEnv("MAIL_PORT", 587) ?? 587;

    transporter = nodemailer.createTransport({
      host: getOptionalEnv("MAIL_HOST"),
      port,
      secure: port === 465,
      auth: {
        user: getOptionalEnv("MAIL_USER"),
        pass: getOptionalEnv("MAIL_PASS"),
      },
    });
  }

  return transporter;
}

function getFromAddress() {
  return getOptionalEnv("MAIL_FROM") || getOptionalEnv("MAIL_USER") || "no-reply@example.com";
}

export async function sendOtpEmail(email: string, otp: string) {
  const mailer = getTransporter();

  if (!mailer) {
    return;
  }

  await mailer.sendMail({
    from: getFromAddress(),
    to: email,
    subject: "Your verification code",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin-bottom:12px">Your verification code</h2>
        <p>Use the code below to continue. This code expires in 1 minute.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;display:inline-block">
          ${otp}
        </div>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail(
  email: string,
  resetLink: string,
  token: string,
  expiryMinutes: number,
) {
  const mailer = getTransporter();

  if (!mailer) {
    return;
  }

  await mailer.sendMail({
    from: getFromAddress(),
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin-bottom:12px">Reset your password</h2>
        <p>We received a request to reset your password. Use the verification code below.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;display:inline-block">
          ${token}
        </div>
        <p style="margin-top:16px">This code will expire in ${expiryMinutes} minutes.</p>
        <p><a href="${resetLink}">Open reset link</a></p>
      </div>
    `,
  });
}
