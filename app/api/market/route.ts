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

    const data = await Promise.all(
      symbols.map(async (symbol) => {
        const url =
          `https://api.twelvedata.com/quote` +
          `?symbol=${encodeURIComponent(symbol)}` +
          `&apikey=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, { cache: "no-store" });
        const quote = await response.json();

        if (!response.ok || quote.status === "error") {
          throw new Error(
            quote.message || `Failed to fetch ${symbol}`
          );
        }

        return {
          symbol,
          price: Number(quote.close),
          change24h: Number(quote.percent_change),
        };
      })
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error?.message || "Market data request failed." },
      { status: 502 }
    );
  }
}
