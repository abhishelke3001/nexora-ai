import { NextResponse } from "next/server";
import ccxt from "ccxt";
import { RSI, EMA, SMA, MACD, ATR } from "technicalindicators";

export async function GET() {
  try {
    const exchange = new ccxt.binance();

    const candles = await exchange.fetchOHLCV(
      "BTC/USDT",
      "1h",
      undefined,
      250
    );

    const opens = candles.map((c) => Number(c[1]));
    const highs = candles.map((c) => Number(c[2]));
    const lows = candles.map((c) => Number(c[3]));
    const closes = candles.map((c) => Number(c[4]));
    const volumes = candles.map((c) => Number(c[5]));

    const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1);
    const ema20 = EMA.calculate({ values: closes, period: 20 }).at(-1);
    const ema50 = EMA.calculate({ values: closes, period: 50 }).at(-1);
    const sma20 = SMA.calculate({ values: closes, period: 20 }).at(-1);

    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    }).at(-1);

    const atr = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    }).at(-1);

    const currentVolume = volumes.at(-1) ?? 0;
    const recentVolumes = volumes.slice(-20);
    const averageVolume =
      recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    const price = closes.at(-1) ?? 0;
    const previousClose = closes.at(-2) ?? price;

    const trend =
      price > (ema20 ?? price) && (ema20 ?? price) > (ema50 ?? price)
        ? "BULLISH"
        : price < (ema20 ?? price) && (ema20 ?? price) < (ema50 ?? price)
        ? "BEARISH"
        : "MIXED";

    const momentum =
      (rsi ?? 50) >= 60
        ? "POSITIVE"
        : (rsi ?? 50) <= 40
        ? "NEGATIVE"
        : "NEUTRAL";

    return NextResponse.json({
      symbol: "BTC/USDT",
      timeframe: "1h",
      source: "Binance",
      candles: candles.length,
      price: Number(price.toFixed(2)),
      changePercent: Number(
        (((price - previousClose) / previousClose) * 100).toFixed(3)
      ),
      indicators: {
        rsi: Number((rsi ?? 0).toFixed(2)),
        ema20: Number((ema20 ?? 0).toFixed(2)),
        ema50: Number((ema50 ?? 0).toFixed(2)),
        sma20: Number((sma20 ?? 0).toFixed(2)),
        macd: macd
          ? {
              value: Number((macd.MACD ?? 0).toFixed(4)),
              signal: Number((macd.signal ?? 0).toFixed(4)),
              histogram: Number((macd.histogram ?? 0).toFixed(4)),
            }
          : null,
        atr: Number((atr ?? 0).toFixed(2)),
      },
      volume: {
        current: currentVolume,
        average20: Number(averageVolume.toFixed(4)),
        ratio: Number(
          (averageVolume ? currentVolume / averageVolume : 0).toFixed(2)
        ),
      },
      structure: {
        trend,
        momentum,
      },
      candle: {
        open: opens.at(-1),
        high: highs.at(-1),
        low: lows.at(-1),
        close: closes.at(-1),
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Technical analysis failed" },
      { status: 500 }
    );
  }
}
