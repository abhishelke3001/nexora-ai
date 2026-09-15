import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const analysisUrl = new URL("/api/analyze", baseUrl);
    analysisUrl.searchParams.set("symbol", symbol);
    analysisUrl.searchParams.set("mode", "Technical");

    const response = await fetch(analysisUrl.toString(), {
      method: "POST",
      cache: "no-store",
    });

    const analysis = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Unable to build flow lane", details: analysis },
        { status: 500 }
      );
    }

    const indicators = analysis.indicators || {};
    const structure = analysis.structure || {};

    const rsi = Number(indicators.rsi ?? 50);
    const macdHistogram = Number(indicators.macd?.histogram ?? 0);
    const volumeRatio = Number(indicators.volumeRatio ?? 1);
    const displacement = Number(structure.displacement ?? 0);
    const liquiditySweep = Boolean(structure.liquiditySweep);

    let score = 0;
    const signals: string[] = [];

    if (macdHistogram > 0) {
      score += 2;
      signals.push("Positive MACD flow");
    } else if (macdHistogram < 0) {
      score -= 2;
      signals.push("Negative MACD flow");
    }

    if (volumeRatio > 1.2) {
      signals.push("Above-average volume");
      score += macdHistogram >= 0 ? 1 : -1;
    }

    if (rsi > 55) {
      score += 1;
      signals.push("Bullish momentum");
    } else if (rsi < 45) {
      score -= 1;
      signals.push("Bearish momentum");
    }

    if (liquiditySweep) {
      signals.push("Liquidity sweep detected");
    }

    if (displacement > 0.01) {
      signals.push("Strong price displacement");
    }

    let verdict: "LONG" | "SHORT" | "WAIT" = "WAIT";

    if (score >= 3) verdict = "LONG";
    if (score <= -3) verdict = "SHORT";

    const confidence = Math.min(
      90,
      Math.max(50, 50 + Math.abs(score) * 8)
    );

    return NextResponse.json({
      success: true,
      mode: "LIVE_FLOW",
      symbol,
      verdict,
      confidence,
      score,
      signals,
      metrics: {
        rsi,
        macdHistogram,
        volumeRatio,
        displacement,
        liquiditySweep,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Flow lane failed",
      },
      { status: 500 }
    );
  }
}
