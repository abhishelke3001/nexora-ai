import { NextResponse } from "next/server";
import ccxt from "ccxt";

const cryptoSymbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

const forexSymbols = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
];

const allowedTimeframes = ["15m", "1h", "4h", "1d"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") || "BTC/USDT";
    const timeframe = searchParams.get("timeframe") || "1h";

    if (!allowedTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: "Unsupported timeframe" },
        { status: 400 }
      );
    }

    if (cryptoSymbols.includes(symbol)) {
      const exchange = new ccxt.binance();

      const candles = await exchange.fetchOHLCV(
        symbol,
        timeframe,
        undefined,
        200
      );

      const data = candles.map((c) => ({
        time: Number(c[0]),
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
      }));

      return NextResponse.json({
        symbol,
        timeframe,
        source: "Binance",
        data,
      });
    }

    if (forexSymbols.includes(symbol)) {
      const apiKey = process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: "Twelve Data API key is not configured" },
          { status: 500 }
        );
      }

      const intervalMap: Record<string, string> = {
        "15m": "15min",
        "1h": "1h",
        "4h": "4h",
        "1d": "1day",
      };

      const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${intervalMap[timeframe]}` +
        `&outputsize=200` +
        `&apikey=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || result.status === "error" || !result.values) {
        console.error("Twelve Data error:", result);

        return NextResponse.json(
          { error: result.message || "Failed to fetch Forex candles" },
          { status: 500 }
        );
      }

      const data = result.values
        .reverse()
        .map(
          (c: {
            datetime: string;
            open: string;
            high: string;
            low: string;
            close: string;
          }) => ({
            time: Math.floor(new Date(c.datetime).getTime() / 1000),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          })
        );

      return NextResponse.json({
        symbol,
        timeframe,
        source: "Twelve Data",
        data,
      });
    }

    return NextResponse.json(
      { error: "Unsupported symbol" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Candles API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch market candles" },
      { status: 500 }
    );
  }
}
