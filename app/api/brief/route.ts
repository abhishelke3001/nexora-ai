import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC/USD";

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", symbol);

    const sessionsUrl = new URL("/api/sessions", baseUrl);

    const newsUrl = new URL("/api/news", baseUrl);
    newsUrl.searchParams.set("symbol", symbol);

    const [verdictResponse, sessionsResponse, newsResponse] =
      await Promise.all([
        fetch(verdictUrl.toString(), { cache: "no-store" }),
        fetch(sessionsUrl.toString(), { cache: "no-store" }),
        fetch(newsUrl.toString(), { cache: "no-store" }),
      ]);

    const verdict = await verdictResponse.json();
    const sessions = await sessionsResponse.json();
    const news = await newsResponse.json();

    if (!verdictResponse.ok || !verdict.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to build daily brief",
        },
        { status: 500 }
      );
    }

    const technical = verdict.lanes?.technical;
    const flow = verdict.lanes?.flow;
    const macro = verdict.lanes?.macro;

    const summary =
      verdict.verdict === "LONG"
        ? "NEXORA currently sees a bullish setup across the four-lane market model."
        : verdict.verdict === "SHORT"
          ? "NEXORA currently sees a bearish setup across the four-lane market model."
          : "NEXORA currently sees mixed conditions, so the safest model state is WAIT.";

    const risks: string[] = [];

    if (
      technical?.verdict &&
      flow?.verdict &&
      technical.verdict !== flow.verdict
    ) {
      risks.push("Technical and Flow are disagreeing.");
    }

    if (
      news?.sentiment &&
      news.sentiment !== "NEUTRAL" &&
      news.sentiment !== verdict.verdict
    ) {
      risks.push("News direction is not aligned with the final trade bias.");
    }

    if (macro?.bias === "NEUTRAL") {
      risks.push("Macro conditions are currently neutral.");
    }

    return NextResponse.json({
      success: true,
      mode: "LIVE_DAILY_BRIEF",
      symbol,
      generatedAt: new Date().toISOString(),
      headline: summary,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      market: {
        technical: technical,
        flow: flow,
        news: {
          sentiment: news?.sentiment ?? "NEUTRAL",
          score: news?.score ?? 0,
          headlineCount: news?.headlineCount ?? 0,
        },
        macro,
      },
      levels: verdict.levels,
      activeSessions: sessions?.activeSessions ?? [],
      sessionOverlap: sessions?.overlap ?? "Unknown",
      risks,
      reasoning: verdict.reasoning,
      recentHeadlines: (news?.headlines ?? []).slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Daily brief failed",
      },
      { status: 500 }
    );
  }
}
