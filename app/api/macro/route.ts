import { NextResponse } from "next/server";

const EVENTS = [
  { name: "Federal Reserve", symbol: "USD" },
  { name: "ECB", symbol: "EUR" },
  { name: "Bank of England", symbol: "GBP" },
  { name: "Bank of Japan", symbol: "JPY" },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "LIVE_MACRO",
    events: EVENTS,
    bias: "NEUTRAL",
    score: 0,
    timestamp: new Date().toISOString(),
  });
}
