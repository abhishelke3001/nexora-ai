import { NextResponse } from "next/server";

export async function GET() {
  try {
    

    const symbols = ["BTC/USD", "ETH/USD", "SOL/USD"];

    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        const ticker = await (async () => {
          const key = process.env.TWELVE_DATA_API_KEY;
          const r = await fetch(
            `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key || "")}`,
            { cache: "no-store" }
          );
          return r.json();
        })();

        return {
          symbol,
          price: ticker.last,
          change24h: ticker.percentage,
          source: "Twelve Data",
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
