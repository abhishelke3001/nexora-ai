import { NextResponse } from "next/server";
import ccxt from "ccxt";

export async function GET() {
  const exchange = new ccxt.binance();
  const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

  const data = await Promise.all(
    symbols.map(async (symbol) => {
      const t = await exchange.fetchTicker(symbol);
      return {
        symbol,
        price: t.last,
        change24h: t.percentage,
      };
    })
  );

  return NextResponse.json(data);
}
