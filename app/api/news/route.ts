import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC/USD";
  const asset = symbol.split("/")[0];

  return NextResponse.json({
    success: true,
    mode: "LIVE_NEWS",
    symbol,
    asset,
    sentiment: "NEUTRAL",
    score: 0,
    headlineCount: 0,
    headlines: [],
    timestamp: new Date().toISOString(),
  });
}
