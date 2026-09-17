import { NextResponse } from "next/server";

const cryptoSymbols = ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"];
const forexSymbols = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"];
const commoditySymbols = ["XAU/USD", "XAG/USD", "WTI/USD"];

const timeframeMap: Record<string, string> = {
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

const xausSymbols: Record<string, string> = {
  "XAU/USD": "xau",
  "XAG/USD": "silver",
  "WTI/USD": "oil",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";
    const timeframe = searchParams.get("timeframe") || "1h";

    const isCrypto = cryptoSymbols.includes(symbol);
    const isForex = forexSymbols.includes(symbol);
    const isCommodity = commoditySymbols.includes(symbol);

    if (xausSymbols[symbol]) {
      const url = new URL("https://xaus.com/api/v1/chart");
      url.searchParams.set("symbol", xausSymbols[symbol]);
      url.searchParams.set("range", "3mo");
      url.searchParams.set("interval", timeframe === "1d" ? "1d" : "1h");

      const response = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });

      const data = await response.json();

      if (
        !response.ok ||
        !Array.isArray(data?.points) ||
        data?.data_state?.status === "unavailable"
      ) {
        return NextResponse.json(
          { error: data?.error || "Failed to fetch XAUS market candles" },
          { status: 502 }
        );
      }

      const candles = data.points
        .map((c: any) => ({
          time: Number(c.t),
          open: Number(c.o),
          high: Number(c.h),
          low: Number(c.l),
          close: Number(c.c),
          volume: Number(c.v ?? 0),
        }))
        .filter((c: any) =>
          [c.time, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite)
        );

      return NextResponse.json({
        symbol,
        timeframe,
        source: "XAUS",
        marketType: "commodity",
        candles,
        dataState: data.data_state ?? null,
      });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const interval = timeframeMap[timeframe] || "1h";

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
      marketType: isCrypto ? "crypto" : isCommodity ? "commodity" : isForex ? "forex" : "unknown",
      candles,
    });
  } catch (error) {
    console.error("Candles API error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market candles" },
      { status: 500 }
    );
  }
}
