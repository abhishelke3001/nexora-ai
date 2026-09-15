import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const secret = process.env.CRON_SECRET || "";

  const fingerprint = crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex")
    .slice(0, 12);

  return NextResponse.json({
    configured: Boolean(secret),
    fingerprint,
  });
}
