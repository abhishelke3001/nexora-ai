import { NextResponse } from "next/server";

const cryptoSymbols = ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"];

const timeframeMap: Record<string, string> = {
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";
    const timeframe = searchParams.get("timeframe") || "1h";

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const interval = timeframeMap[timeframe] || "1h";
    const isCrypto = cryptoSymbols.includes(symbol);

    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "200");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    const data = await response.json();

    if (!response.ok || data.status === "error" || !data.values) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch market candles" },
        { status: 502 }
      );
    }

    const candles = data.values
      .reverse()
      .map((c: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }) => ({
        time: Math.floor(new Date(c.datetime).getTime() / 1000),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ? Number(c.volume) : undefined,
      }));

    return NextResponse.json({
      symbol,
      timeframe,
      source: "Twelve Data",
      marketType: isCrypto ? "crypto" : "forex",
      candles,
    });
  } catch (error) {
    console.error("Candles API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch market candles" },
      { status: 500 }
    );
  }
}
