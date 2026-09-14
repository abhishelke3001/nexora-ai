import { NextResponse } from "next/server";
import ccxt from "ccxt";

export async function POST(request: Request) {
  try {
    const { symbol = "BTC/USDT" } = await request.json();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json(
        { error: "Telegram credentials are not configured" },
        { status: 500 }
      );
    }

    const exchange = new ccxt.binance();
    const ticker = await exchange.fetchTicker(symbol);

    const price = Number(ticker.last);
    const change = Number(ticker.percentage);

    const direction =
      change > 0.5 ? "🟢 BULLISH" :
      change < -0.5 ? "🔴 BEARISH" :
      "🟡 WAIT";

    const message = [
      "🤖 NEXORA AI MARKET ALERT",
      "",
      `Asset: ${symbol}`,
      `Price: $${price.toLocaleString()}`,
      `24H Change: ${change.toFixed(2)}%`,
      "",
      `Signal: ${direction}`,
      "",
      "Source: Binance Live Market Data",
      "",
      "Market Intelligence. One Clear Decision."
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return NextResponse.json(
        { error: result.description || "Telegram send failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      price,
      change,
      signal: direction,
    });
  } catch (error) {
    console.error("Telegram alert error:", error);

    return NextResponse.json(
      { error: "Failed to create market alert" },
      { status: 500 }
    );
  }
}
