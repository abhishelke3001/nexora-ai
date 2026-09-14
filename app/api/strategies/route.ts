import { NextResponse } from "next/server";
import ccxt from "ccxt";
import { SMA } from "technicalindicators";

export async function GET() {
  try {
    const exchange = new ccxt.binance();
    const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

    const strategies = await Promise.all(
      symbols.map(async (symbol) => {
        const candles = await exchange.fetchOHLCV(symbol, "1h", undefined, 200);
        const closes = candles.map((c) => Number(c[4]));

        const sma20 = SMA.calculate({ period: 20, values: closes }).at(-1)!;
        const sma50 = SMA.calculate({ period: 50, values: closes }).at(-1)!;
        const price = closes.at(-1)!;

        const trend =
          price > sma20 && sma20 > sma50
            ? "BULLISH"
            : price < sma20 && sma20 < sma50
              ? "BEARISH"
              : "NEUTRAL";

        return { symbol, price, sma20, sma50, trend, source: "Binance" };
      })
    );

    return NextResponse.json({ strategies });
  } catch {
    return NextResponse.json({ error: "Market data unavailable" }, { status: 500 });
  }
}
