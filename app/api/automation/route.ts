import { NextResponse } from "next/server";

const SYMBOLS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
];

const CRYPTO = new Set([
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
]);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");

    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Twelve Data API key is not configured" },
      { status: 500 }
    );
  }

  const results = [];

  for (const symbol of SYMBOLS) {
    try {
      const url = new URL("https://api.twelvedata.com/quote");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        results.push({
          symbol,
          status: "ERROR",
          error: data.message || "Market data unavailable",
        });
        continue;
      }

      results.push({
        symbol,
        market: CRYPTO.has(symbol) ? "CRYPTO" : "FOREX",
        price: Number(data.close),
        change24h: Number(data.percent_change),
        status: "LIVE",
      });
    } catch (error) {
      results.push({
        symbol,
        status: "ERROR",
        error:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    mode: "LIVE",
    timestamp: new Date().toISOString(),
    results,
  });
}
