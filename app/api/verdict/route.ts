import { NextResponse } from "next/server";

type Verdict = "LONG" | "SHORT" | "WAIT";

function directionToScore(value: string): number {
  if (value === "LONG" || value === "BULLISH") return 1;
  if (value === "SHORT" || value === "BEARISH") return -1;
  return 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const technicalUrl = new URL("/api/analyze", baseUrl);
    technicalUrl.searchParams.set("symbol", symbol);
    technicalUrl.searchParams.set("mode", "Technical");

    const flowUrl = new URL("/api/flow", baseUrl);
    flowUrl.searchParams.set("symbol", symbol);

    const newsUrl = new URL("/api/news", baseUrl);
    newsUrl.searchParams.set("symbol", symbol);

    const macroUrl = new URL("/api/macro", baseUrl);

    const [technicalResponse, flowResponse, newsResponse, macroResponse] =
      await Promise.all([
        fetch(technicalUrl.toString(), {
          method: "POST",
          cache: "no-store",
        }),
        fetch(flowUrl.toString(), {
          cache: "no-store",
        }),
        fetch(newsUrl.toString(), {
          cache: "no-store",
        }),
        fetch(macroUrl.toString(), {
          cache: "no-store",
        }),
      ]);

    const [technical, flow, news, macro] = await Promise.all([
      technicalResponse.json(),
      flowResponse.json(),
      newsResponse.json(),
      macroResponse.json(),
    ]);

    if (!technicalResponse.ok || !flowResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Core analysis lanes failed",
          technical,
          flow,
          news,
          macro,
        },
        { status: 500 }
      );
    }

    const technicalVerdict: Verdict =
      technical.ai?.verdict === "LONG"
        ? "LONG"
        : technical.ai?.verdict === "SHORT"
          ? "SHORT"
          : "WAIT";

    const flowVerdict: Verdict =
      flow.verdict === "LONG"
        ? "LONG"
        : flow.verdict === "SHORT"
          ? "SHORT"
          : "WAIT";

    const newsScore = directionToScore(news.sentiment || "NEUTRAL");
    const macroScore = directionToScore(macro.bias || "NEUTRAL");

    const technicalScore = directionToScore(technicalVerdict);
    const flowScore = directionToScore(flowVerdict);

    const weightedScore =
      technicalScore * 0.4 +
      flowScore * 0.3 +
      newsScore * 0.15 +
      macroScore * 0.15;

    const directionalVotes =
      (technicalScore !== 0 ? 1 : 0) +
      (flowScore !== 0 ? 1 : 0) +
      (newsScore !== 0 ? 1 : 0) +
      (macroScore !== 0 ? 1 : 0);

    let verdict: Verdict = "WAIT";

    if (
      directionalVotes >= 2 &&
      weightedScore >= 0.6
    ) {
      verdict = "LONG";
    } else if (
      directionalVotes >= 2 &&
      weightedScore <= -0.6
    ) {
      verdict = "SHORT";
    }

    const technicalConfidence = Number(
      technical.ai?.confidence || 0
    );

    const flowConfidence = Number(
      flow.confidence || 0
    );

    const laneAgreement =
      [
        technicalScore,
        flowScore,
        newsScore,
        macroScore,
      ].filter((score) => score !== 0).length;

    const confidenceBase = Math.round(
      technicalConfidence * 0.4 +
      flowConfidence * 0.3 +
      Math.abs(newsScore) * 15 +
      Math.abs(macroScore) * 15
    );

    const confidence =
      verdict === "WAIT"
        ? Math.min(79, Math.max(50, confidenceBase))
        : Math.min(
            95,
            Math.max(
              55,
              confidenceBase + laneAgreement * 3
            )
          );

    return NextResponse.json({
      success: true,
      mode: "LIVE_FOUR_LANE_VERDICT",
      symbol,
      verdict,
      confidence,
      lanes: {
        technical: {
          verdict: technicalVerdict,
          confidence: technicalConfidence,
          source: technical.ai?.source || "NEXORA",
        },
        flow: {
          verdict: flowVerdict,
          confidence: flowConfidence,
          score: flow.score ?? 0,
          signals: flow.signals ?? [],
        },
        news: {
          sentiment: news.sentiment ?? "NEUTRAL",
          score: news.score ?? 0,
          headlineCount: news.headlineCount ?? 0,
        },
        macro: {
          bias: macro.bias ?? "NEUTRAL",
          score: macro.score ?? 0,
          indicators: macro.indicators ?? {},
        },
      },
      levels: {
        entry: technical.ai?.entry ?? null,
        stopLoss: technical.ai?.stopLoss ?? null,
        target1: technical.ai?.target1 ?? null,
        target2: technical.ai?.target2 ?? null,
      },
      reasoning:
        technical.ai?.reasoning ||
        "NEXORA evaluated Technical, Flow, News and Macro lanes.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Four-lane verdict engine failed",
      },
      { status: 500 }
    );
  }
}
