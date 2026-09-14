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

    const url =
      `https://api.twelvedata.com/quote` +
      `?symbol=${encodeURIComponent(symbols.join(","))}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, { next: { revalidate: 30 } });
    const quote = await response.json();

    if (!response.ok || quote.status === "error") {
      throw new Error(quote.message || "Failed to fetch market data");
    }

    const data = symbols.map((symbol) => {
      const q = quote[symbol] || {};
      return {
        symbol,
        price: Number(q.close),
        change24h: Number(q.percent_change),
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error?.message || "Market data request failed." },
      { status: 502 }
    );
  }
}
