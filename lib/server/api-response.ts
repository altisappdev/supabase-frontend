import { NextResponse } from "next/server";
import { encryptServerData } from "@/lib/server/crypto";
import { isHttpError } from "@/lib/server/errors";

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;

  constructor(data: T, message = "OK", success = true) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}

export function jsonResponse<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json(new ApiResponse(data, message), { status });
}

export function encryptedJsonResponse<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json(
    {
      data: encryptServerData(new ApiResponse(data, message)),
    },
    { status },
  );
}

export function errorResponse(error: unknown) {
  if (isHttpError(error)) {
    return NextResponse.json(
      {
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      },
      { status: error.status },
    );
  }

  const fallbackMessage =
    error instanceof Error && error.message ? error.message : "Internal server error.";

  return NextResponse.json(
    {
      message: fallbackMessage,
    },
    { status: 500 },
  );
}
