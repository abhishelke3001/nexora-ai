import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", "BTC/USD");

    const verdictResponse = await fetch(verdictUrl.toString(), {
      cache: "no-store",
    });

    const verdict = await verdictResponse.json();

    if (!verdictResponse.ok || !verdict.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Four-lane verdict failed",
          details: verdict,
        },
        { status: 500 }
      );
    }

    const shouldAlert =
      (verdict.verdict === "LONG" ||
        verdict.verdict === "SHORT") &&
      Number(verdict.confidence || 0) >= 65;

    let telegramSent = false;

    if (shouldAlert) {
      const telegramUrl = new URL("/api/telegram", baseUrl);

      const message = [
        "🚨 NEXORA AI — FOUR-LANE SIGNAL",
        "",
        `Asset: ${verdict.symbol}`,
        `Verdict: ${verdict.verdict}`,
        `Confidence: ${verdict.confidence}%`,
        "",
        `Technical: ${verdict.lanes.technical.verdict} (${verdict.lanes.technical.confidence}%)`,
        `Flow: ${verdict.lanes.flow.verdict} (${verdict.lanes.flow.confidence}%)`,
        `News: ${verdict.lanes.news.sentiment}`,
        `Macro: ${verdict.lanes.macro.bias}`,
        "",
        `Entry: ${verdict.levels.entry ?? "—"}`,
        `Stop Loss: ${verdict.levels.stopLoss ?? "—"}`,
        `Target 1: ${verdict.levels.target1 ?? "—"}`,
        `Target 2: ${verdict.levels.target2 ?? "—"}`,
        "",
        `Reason: ${verdict.reasoning || "—"}`,
        "",
        "Source: NEXORA AI",
      ].join("\n");

      const telegramResponse = await fetch(
        telegramUrl.toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      telegramSent = telegramResponse.ok;
    }

    return NextResponse.json({
      success: true,
      mode: "LIVE_FOUR_LANE_AUTOMATION",
      symbol: verdict.symbol,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      telegramSent,
      lanes: verdict.lanes,
      levels: verdict.levels,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation failed",
      },
      { status: 500 }
    );
  }
}
