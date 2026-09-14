import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { symbol = "BTC/USD" } = await request.json();

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" }
    );

    const ticker = await response.json();

    if (!response.ok || ticker.status === "error") {
      throw new Error(ticker.message || `Failed to fetch ${symbol}`);
    }

    const price = Number(ticker.close);
    const change = Number(ticker.percent_change);

    const direction =
      change > 0.5 ? "BULLISH" : change < -0.5 ? "BEARISH" : "WAIT";

    const message = [
      `NEXORA AI ALERT`,
      ``,
      `Asset: ${symbol}`,
      `Price: $${price.toLocaleString()}`,
      `24H: ${change.toFixed(2)}%`,
      `Signal: ${direction}`,
      ``,
      `Source: Twelve Data Live Market Data`,
    ].join("\n");

    return NextResponse.json({
      success: true,
      message,
      symbol,
      price,
      change,
      direction,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Telegram alert data request failed." },
      { status: 502 }
    );
  }
}
