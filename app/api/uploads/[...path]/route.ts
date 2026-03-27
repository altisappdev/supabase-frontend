import { promises as fs } from "fs";
import { extname, resolve } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const contentTypeMap: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const uploadsRoot = resolve(process.cwd(), "uploads");
  const filePath = resolve(uploadsRoot, ...params.path);

  if (!filePath.startsWith(uploadsRoot)) {
    return NextResponse.json({ message: "File not found." }, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    const extension = extname(filePath).toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ message: "File not found." }, { status: 404 });
  }
}
