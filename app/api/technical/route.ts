import { NextResponse } from "next/server";
import {
  RSI,
  EMA,
  SMA,
  MACD,
  ATR,
} from "technicalindicators";

const xausSymbols: Record<string, string> = {
  "XAU/USD": "xau",
  "XAG/USD": "silver",
  "WTI/USD": "oil",
};

async function fetchXaus(symbol: string) {
  const xausSymbol = xausSymbols[symbol];
  if (!xausSymbol) return null;

  const url = new URL("https://xaus.com/api/v1/chart");
  url.searchParams.set("symbol", xausSymbol);
  url.searchParams.set("range", "3mo");
  url.searchParams.set("interval", "1h");

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });
  const data = await response.json();
  const points = Array.isArray(data?.points) ? data.points : [];

  if (
    !response.ok ||
    points.length < 60 ||
    data?.data_state?.status === "unavailable"
  ) {
    throw new Error(data?.error || `XAUS market data unavailable for ${symbol}`);
  }

  return points
    .map((c: any) => ({
      open: Number(c.o),
      high: Number(c.h),
      low: Number(c.l),
      close: Number(c.c),
      volume: Number(c.v ?? 0),
    }))
    .filter((c: any) =>
      [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite)
    );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";

    let values: Array<{
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> | null = null;

    if (xausSymbols[symbol]) {
      values = await fetchXaus(symbol);
    }

    if (!values) {
      const apiKey = process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: "TWELVE_DATA_API_KEY is not configured." },
          { status: 500 }
        );
      }

      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=200&timezone=UTC&apikey=${encodeURIComponent(apiKey)}`,
        { next: { revalidate: 60 } }
      );

      const result = await response.json();

      if (
        !response.ok ||
        result.status === "error" ||
        !Array.isArray(result.values)
      ) {
        throw new Error(result.message || "Technical market data request failed.");
      }

      if (
        result.symbol &&
        typeof result.symbol === "string" &&
        result.symbol.toUpperCase() !== symbol.toUpperCase()
      ) {
        throw new Error(
          `Market data symbol mismatch: requested ${symbol}, received ${result.symbol}`
        );
      }

      const twelveValues = result.values.slice().reverse();
      values = twelveValues.map((c: any) => ({
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
      }));
    }

    if (!values || values.length < 60) {
      throw new Error(`Insufficient technical market data for ${symbol}`);
    }

    const highs = values.map((c) => c.high);
    const lows = values.map((c) => c.low);
    const closes = values.map((c) => c.close);

    const rsi = RSI.calculate({
      values: closes,
      period: 14,
    });

    const ema20 = EMA.calculate({
      values: closes,
      period: 20,
    });

    const ema50 = EMA.calculate({
      values: closes,
      period: 50,
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
      ema50: ema50[ema50.length - 1],
      sma20: sma20[sma20.length - 1],
      macd: macd[macd.length - 1],
      atr: atr[atr.length - 1],
      source: xausSymbols[symbol] ? "XAUS" : "Twelve Data",
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Technical data request failed." },
      { status: 502 }
    );
  }
}
