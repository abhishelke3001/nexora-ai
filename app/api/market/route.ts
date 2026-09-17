import { NextResponse } from "next/server";

const dashboardSymbols = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
];

export async function GET() {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "TWELVE_DATA_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const url =
      "https://api.twelvedata.com/quote" +
      `?symbol=${encodeURIComponent(
        dashboardSymbols.join(",")
      )}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      next: {
        revalidate: 60,
      },
    });

    const quote = await response.json();

    if (!response.ok) {
      throw new Error(
        quote?.message || "Failed to fetch market data"
      );
    }

    if (
      quote?.status === "error" &&
      quote?.message
    ) {
      throw new Error(quote.message);
    }

    const data = dashboardSymbols
      .map((symbol) => {
        const q = quote?.[symbol];

        const price = Number(q?.close);
        const change24h = Number(q?.percent_change);

        return {
          symbol,
          price,
          change24h,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.price)
      );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Market API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Market data request failed.",
      },
      { status: 502 }
    );
  }
}
