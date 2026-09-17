import { NextResponse } from "next/server";

type Verdict = "LONG" | "SHORT" | "WAIT";

type LaneAvailability = {
  technical: boolean;
  flow: boolean;
  news: boolean;
  macro: boolean;
};

function directionToScore(value: string): number {
  if (value === "LONG" || value === "BULLISH") return 1;
  if (value === "SHORT" || value === "BEARISH") return -1;
  return 0;
}

function normalizeVerdict(value: unknown): Verdict {
  return value === "LONG" || value === "SHORT" ? value : "WAIT";
}

function hasRealAi(technical: any): boolean {
  const source = typeof technical?.ai?.source === "string" ? technical.ai.source : "";
  if (/fallback/i.test(source) || /deterministic/i.test(source)) return false;

  const cacheHit = technical?.aiCache?.cacheHit === true;
  const explicitReal = technical?.ai?.source === "OPENAI" || technical?.ai?.source === "OpenAI";

  return explicitReal || cacheHit || Boolean(source);
}

async function safeJson(url: URL, init?: RequestInit) {
  try {
    const response = await fetch(url.toString(), {
      ...init,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    return { ok: response.ok, data };
  } catch (error) {
    return {
      ok: false,
      data: {
        error: error instanceof Error ? error.message : "Lane request failed",
      },
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";
    const baseUrl = new URL(request.url).origin;

    const technicalUrl = new URL("/api/analyze", baseUrl);
    technicalUrl.searchParams.set("symbol", symbol);
    technicalUrl.searchParams.set("mode", "Technical");

    const flowUrl = new URL("/api/flow", baseUrl);
    flowUrl.searchParams.set("symbol", symbol);

    const newsUrl = new URL("/api/news", baseUrl);
    newsUrl.searchParams.set("symbol", symbol);

    const macroUrl = new URL("/api/macro", baseUrl);

    const [technicalResult, flowResult, newsResult, macroResult] = await Promise.all([
      safeJson(technicalUrl, { method: "POST" }),
      safeJson(flowUrl),
      safeJson(newsUrl),
      safeJson(macroUrl),
    ]);

    const technical = technicalResult.data;
    const flow = flowResult.data;
    const news = newsResult.data;
    const macro = macroResult.data;

    const laneAvailability: LaneAvailability = {
      technical: technicalResult.ok,
      flow: flowResult.ok,
      news: newsResult.ok,
      macro: macroResult.ok,
    };

    const allCoreLanesAvailable = Object.values(laneAvailability).every(Boolean);
    const realAiAvailable = hasRealAi(technical);

    const technicalVerdict = normalizeVerdict(technical?.ai?.verdict);
    const flowVerdict = normalizeVerdict(flow?.verdict);

    const technicalScore = directionToScore(technicalVerdict);
    const flowScore = directionToScore(flowVerdict);
    const newsScore = directionToScore(news?.sentiment || "NEUTRAL");
    const macroScore = directionToScore(macro?.bias || "NEUTRAL");

    const weightedScore =
      technicalScore * 0.4 +
      flowScore * 0.3 +
      newsScore * 0.15 +
      macroScore * 0.15;

    const directionalVotes = [technicalScore, flowScore, newsScore, macroScore].filter(
      (score) => score !== 0
    ).length;

    let verdict: Verdict = "WAIT";

    if (directionalVotes >= 2 && weightedScore >= 0.6) {
      verdict = "LONG";
    } else if (directionalVotes >= 2 && weightedScore <= -0.6) {
      verdict = "SHORT";
    }

    const technicalConfidence = Number(technical?.ai?.confidence || 0);
    const flowConfidence = Number(flow?.confidence || 0);

    const laneAgreement = [technicalScore, flowScore, newsScore, macroScore].filter(
      (score) => score !== 0
    ).length;

    const confidenceBase = Math.round(
      technicalConfidence * 0.4 +
        flowConfidence * 0.3 +
        Math.abs(newsScore) * 15 +
        Math.abs(macroScore) * 15
    );

    const confidence =
      verdict === "WAIT"
        ? Math.min(79, Math.max(50, confidenceBase))
        : Math.min(95, Math.max(55, confidenceBase + laneAgreement * 3));

    const entry = Number.isFinite(Number(technical?.ai?.entry))
      ? Number(technical.ai.entry)
      : null;
    const stopLoss = Number.isFinite(Number(technical?.ai?.stopLoss))
      ? Number(technical.ai.stopLoss)
      : null;
    const target1 = Number.isFinite(Number(technical?.ai?.target1))
      ? Number(technical.ai.target1)
      : null;
    const target2 = Number.isFinite(Number(technical?.ai?.target2))
      ? Number(technical.ai.target2)
      : null;

    let riskReward: number | null = null;

    if (verdict !== "WAIT" && entry != null && stopLoss != null && target1 != null) {
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(target1 - entry);
      if (risk > 0) riskReward = Number((reward / risk).toFixed(2));
    }

    let setupQuality: "A" | "B" | "C" = "C";

    if (
      verdict !== "WAIT" &&
      laneAgreement >= 3 &&
      confidence >= 75 &&
      riskReward != null &&
      riskReward >= 1.5
    ) {
      setupQuality = "A";
    } else if (verdict !== "WAIT" && laneAgreement >= 2 && confidence >= 65) {
      setupQuality = "B";
    }

    const riskPerUnit =
      entry != null && stopLoss != null && Number.isFinite(entry) && Number.isFinite(stopLoss)
        ? Math.abs(entry - stopLoss)
        : null;

    const validRiskPerUnit = riskPerUnit != null && Number.isFinite(riskPerUnit) && riskPerUnit > 0;

    const validTradeLevels =
      entry != null &&
      stopLoss != null &&
      target1 != null &&
      target2 != null &&
      [entry, stopLoss, target1, target2].every(Number.isFinite);

    // A fallback technical engine may still provide a directional bias, but it must never
    // activate an actionable trade. Real OpenAI analysis is required for trade activation.
    const tradeable =
      allCoreLanesAvailable &&
      realAiAvailable &&
      verdict !== "WAIT" &&
      setupQuality === "A" &&
      validTradeLevels &&
      validRiskPerUnit &&
      riskReward != null &&
      Number.isFinite(riskReward) &&
      riskReward >= 2;

    const confirmationLabels = [
      technicalScore === (verdict === "LONG" ? 1 : -1) ? "Technical" : null,
      flowScore === (verdict === "LONG" ? 1 : -1) ? "Flow" : null,
      newsScore === (verdict === "LONG" ? 1 : -1) ? "News" : null,
      macroScore === (verdict === "LONG" ? 1 : -1) ? "Macro" : null,
    ].filter(Boolean) as string[];

    const accountSize = 10000;
    const riskPercent = 1;
    const riskCapital = accountSize * (riskPercent / 100);

    const positionSize =
      validRiskPerUnit && validTradeLevels ? Number((riskCapital / riskPerUnit).toFixed(8)) : null;

    const positionNotional =
      positionSize != null && entry != null && Number.isFinite(entry)
        ? Number((positionSize * entry).toFixed(2))
        : null;

    const invalidation =
      verdict === "LONG"
        ? stopLoss != null
          ? `1H close below ${stopLoss}`
          : "Technical structure turns bearish"
        : verdict === "SHORT"
          ? stopLoss != null
            ? `1H close above ${stopLoss}`
            : "Technical structure turns bullish"
          : "No active trade. Wait for stronger lane alignment.";

    let setupReason = "Directional bias exists, but the setup does not meet quality criteria.";

    if (verdict === "WAIT") {
      setupReason = "Lane alignment is not strong enough for a high-quality setup.";
    } else if (!realAiAvailable) {
      setupReason = "Real AI analysis is unavailable; deterministic fallback cannot activate trades.";
    } else if (tradeable) {
      setupReason = `${confirmationLabels.length}/4 confirmation lanes aligned with real AI validation.`;
    }

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
          source: technical?.ai?.source || "NEXORA",
          realAi: realAiAvailable,
          cacheHit: technical?.aiCache?.cacheHit === true,
        },
        flow: {
          verdict: flowVerdict,
          confidence: flowConfidence,
          score: flow?.score ?? 0,
          signals: flow?.signals ?? [],
        },
        news: {
          sentiment: news?.sentiment ?? "NEUTRAL",
          score: news?.score ?? 0,
          headlineCount: news?.headlineCount ?? 0,
        },
        macro: {
          bias: macro?.bias ?? "NEUTRAL",
          score: macro?.score ?? 0,
          indicators: macro?.indicators ?? {},
        },
      },
      levels: {
        entry: tradeable ? entry : null,
        stopLoss: tradeable ? stopLoss : null,
        target1: tradeable ? target1 : null,
        target2: tradeable ? target2 : null,
      },
      setup: {
        tradeable,
        quality: setupQuality,
        confirmationCount: confirmationLabels.length,
        confirmations: confirmationLabels,
        riskReward,
        invalidation,
        reason: setupReason,
        accountSize,
        riskPercent,
        riskCapital: Number(riskCapital.toFixed(2)),
        riskPerUnit: riskPerUnit != null ? Number(riskPerUnit.toFixed(2)) : null,
        positionSize,
        positionNotional,
        dataAvailable: laneAvailability,
        realAiRequired: true,
      },
      reasoning:
        technical?.ai?.reasoning ||
        technical?.ai?.reason ||
        "NEXORA evaluated Technical, Flow, News and Macro lanes.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Four-lane verdict engine failed",
      },
      { status: 500 }
    );
  }
}
