import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";
    const shock = Number(searchParams.get("shock") || 0);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const marketUrl = new URL("/api/market", baseUrl);
    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", symbol);

    const [marketResponse, verdictResponse] = await Promise.all([
      fetch(marketUrl.toString(), { cache: "no-store" }),
      fetch(verdictUrl.toString(), { cache: "no-store" }),
    ]);

    const market = await marketResponse.json();
    const verdict = await verdictResponse.json();

    if (!marketResponse.ok || !Array.isArray(market)) {
      throw new Error("Live market data unavailable");
    }

    if (!verdictResponse.ok || !verdict.success) {
      throw new Error("Live verdict unavailable");
    }

    const asset = market.find(
      (item: { symbol?: string }) => item.symbol === symbol
    );

    const currentPrice = Number(asset?.price);

    if (!Number.isFinite(currentPrice)) {
      throw new Error(`No live price found for ${symbol}`);
    }

    const scenarioPrice =
      currentPrice * (1 + shock / 100);

    const levels = verdict.levels || {};

    const scale = scenarioPrice / currentPrice;

    return NextResponse.json({
      success: true,
      mode: "LIVE_SCENARIO_SIMULATOR",
      symbol,
      currentPrice,
      shockPercent: shock,
      scenarioPrice: Number(scenarioPrice.toFixed(2)),
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      currentLevels: levels,
      scenarioLevels: {
        entry:
          levels.entry != null
            ? Number((levels.entry * scale).toFixed(2))
            : null,
        stopLoss:
          levels.stopLoss != null
            ? Number((levels.stopLoss * scale).toFixed(2))
            : null,
        target1:
          levels.target1 != null
            ? Number((levels.target1 * scale).toFixed(2))
            : null,
        target2:
          levels.target2 != null
            ? Number((levels.target2 * scale).toFixed(2))
            : null,
      },
      lanes: verdict.lanes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Scenario simulation failed",
      },
      { status: 500 }
    );
  }
}
