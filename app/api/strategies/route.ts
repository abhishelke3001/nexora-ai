import { NextResponse } from "next/server";

const symbols = ["BTC/USD", "ETH/USD", "SOL/USD"];

export async function GET() {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=100&timezone=UTC&apikey=${encodeURIComponent(apiKey)}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (
          !response.ok ||
          result.status === "error" ||
          !Array.isArray(result.values)
        ) {
          throw new Error(result.message || `Failed to fetch ${symbol}`);
        }

        const closes = result.values
          .slice()
          .reverse()
          .map((c: any) => Number(c.close));

        const price = closes[closes.length - 1];
        const sma20 =
          closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
        const sma50 =
          closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;

        const trend =
          price > sma20 && sma20 > sma50
            ? "BULLISH"
            : price < sma20 && sma20 < sma50
              ? "BEARISH"
              : "NEUTRAL";

        return {
          symbol,
          price,
          sma20,
          sma50,
          trend,
          source: "Twelve Data",
        };
      })
    );

    return NextResponse.json(results);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Strategy market data request failed." },
      { status: 502 }
    );
  }
}
