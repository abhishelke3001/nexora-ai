import { NextResponse } from "next/server";
import {
  RSI,
  EMA,
  SMA,
  MACD,
  ATR,
} from "technicalindicators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.twelvedata.com/time_series?symbol=BTC%2FUSD&interval=1h&outputsize=200&timezone=UTC&apikey=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (
      !response.ok ||
      result.status === "error" ||
      !Array.isArray(result.values)
    ) {
      throw new Error(result.message || "Technical market data request failed.");
    }

    const values = result.values.slice().reverse();

    const opens = values.map((c: any) => Number(c.open));
    const highs = values.map((c: any) => Number(c.high));
    const lows = values.map((c: any) => Number(c.low));
    const closes = values.map((c: any) => Number(c.close));

    const rsi = RSI.calculate({
      values: closes,
      period: 14,
    });

    const ema20 = EMA.calculate({
      values: closes,
      period: 20,
    });

    const sma20 = SMA.calculate({
      values: closes,
      period: 20,
    });

    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const atr = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });

    const price = closes[closes.length - 1];

    return NextResponse.json({
      symbol,
      price,
      rsi: rsi[rsi.length - 1],
      ema20: ema20[ema20.length - 1],
      sma20: sma20[sma20.length - 1],
      macd: macd[macd.length - 1],
      atr: atr[atr.length - 1],
      source: "Twelve Data",
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Technical data request failed." },
      { status: 502 }
    );
  }
}
