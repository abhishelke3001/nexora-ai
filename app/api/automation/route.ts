import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Twelve Data API key is not configured" },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://nexora-ai-two-delta.vercel.app";

  try {
    const analyzeUrl = new URL("/api/analyze", baseUrl);
    analyzeUrl.searchParams.set("symbol", "BTC/USD");
    analyzeUrl.searchParams.set("timeframe", "1h");

    const response = await fetch(analyzeUrl.toString(), {
      method: "POST",
      cache: "no-store",
    });

    const analysis = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Analysis failed",
          details: analysis,
        },
        { status: 500 }
      );
    }

    const ai = analysis.ai || {};

    const result = {
      symbol: "BTC/USD",
      price: analysis.price ?? ai.entry ?? null,
      verdict: ai.verdict ?? "WAIT",
      confidence: ai.confidence ?? 0,
      risk: ai.risk ?? "MEDIUM",
      reasoning: ai.reasoning ?? ai.reason ?? "",
      entry: ai.entry ?? null,
      stopLoss: ai.stopLoss ?? null,
      target1: ai.target1 ?? null,
      target2: ai.target2 ?? null,
      source: ai.source ?? "NEXORA AI",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      mode: "LIVE_AI",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Automation failed",
      },
      { status: 500 }
    );
  }
}
