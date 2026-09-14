import { NextResponse } from "next/server";
import ccxt from "ccxt";

export async function GET() {
  try {
    const exchange = new ccxt.binance();

    const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        const ticker = await exchange.fetchTicker(symbol);

        return {
          symbol,
          price: ticker.last,
          change24h: ticker.percentage,
          source: "Binance",
          updatedAt: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      balance: 10000,
      currency: "USDT",
      prices,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load live market prices" },
      { status: 500 }
    );
  }
}
