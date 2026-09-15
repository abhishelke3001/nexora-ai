import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const analyzeUrl = new URL("/api/analyze", baseUrl);
    analyzeUrl.searchParams.set("symbol", "BTC/USD");
    analyzeUrl.searchParams.set("mode", "Technical");

    const analysisResponse = await fetch(analyzeUrl.toString(), {
      method: "POST",
      cache: "no-store",
    });

    const analysis = await analysisResponse.json();

    if (!analysisResponse.ok) {
      return NextResponse.json(
        { success: false, error: "AI analysis failed", details: analysis },
        { status: 500 }
      );
    }

    const ai = analysis.ai || {};
    const verdict = ai.verdict || "WAIT";
    const confidence = Number(ai.confidence || 0);

    let telegramSent = false;

    if (
      (verdict === "LONG" || verdict === "SHORT") &&
      confidence >= 65
    ) {
      const telegramUrl =
        new URL("/api/telegram", baseUrl);

      const message = [
        "🚨 NEXORA AI SIGNAL",
        "",
        `Asset: BTC/USD`,
        `Verdict: ${verdict}`,
        `Confidence: ${confidence}%`,
        `Risk: ${ai.risk || "MEDIUM"}`,
        "",
        `Entry: ${ai.entry ?? "—"}`,
        `Stop Loss: ${ai.stopLoss ?? "—"}`,
        `Target 1: ${ai.target1 ?? "—"}`,
        `Target 2: ${ai.target2 ?? "—"}`,
        "",
        `Reason: ${ai.reasoning || ai.reason || "—"}`,
        "",
        "Source: NEXORA AI",
      ].join("\n");

      const telegramResponse = await fetch(telegramUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      telegramSent = telegramResponse.ok;
    }

    return NextResponse.json({
      success: true,
      mode: "LIVE_AI",
      timestamp: new Date().toISOString(),
      signal: {
        symbol: "BTC/USD",
        verdict,
        confidence,
        risk: ai.risk ?? "MEDIUM",
        entry: ai.entry ?? null,
        stopLoss: ai.stopLoss ?? null,
        target1: ai.target1 ?? null,
        target2: ai.target2 ?? null,
      },
      telegramSent,
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
