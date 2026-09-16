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

    const baseUrl = new URL(request.url).origin;

    const technicalUrl = new URL("/api/analyze", baseUrl);
    technicalUrl.searchParams.set("symbol", symbol);
    technicalUrl.searchParams.set("mode", "Technical");

    const flowUrl = new URL("/api/flow", baseUrl);
    flowUrl.searchParams.set("symbol", symbol);

    const newsUrl = new URL("/api/news", baseUrl);
    newsUrl.searchParams.set("symbol", symbol);

    const macroUrl = new URL("/api/macro", baseUrl);

    async function safeJson(
      url: URL,
      init?: RequestInit
    ) {
      try {
        const response = await fetch(url.toString(), {
          ...init,
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        return {
          ok: response.ok,
          data,
        };
      } catch (error) {
        return {
          ok: false,
          data: {
            error:
              error instanceof Error
                ? error.message
                : "Lane request failed",
          },
        };
      }
    }

    const [
      technicalResult,
      flowResult,
      newsResult,
      macroResult,
    ] = await Promise.all([
      safeJson(technicalUrl, { method: "POST" }),
      safeJson(flowUrl),
      safeJson(newsUrl),
      safeJson(macroUrl),
    ]);

    const technical = technicalResult.data;
    const flow = flowResult.data;
    const news = newsResult.data;
    const macro = macroResult.data;

    const laneAvailability = {
      technical: technicalResult.ok,
      flow: flowResult.ok,
      news: newsResult.ok,
      macro: macroResult.ok,
    };

    /*
     * A missing lane is never interpreted as bullish, bearish, or neutral.
     * The safest behavior is WAIT and no trade.
     */
    const allCoreLanesAvailable =
      laneAvailability.technical &&
      laneAvailability.flow &&
      laneAvailability.news &&
      laneAvailability.macro;

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

    if (!allCoreLanesAvailable) {
      return NextResponse.json({
        success: true,
        mode: "LIVE_FOUR_LANE_VERDICT",
        symbol,
        verdict: "WAIT",
        confidence: 50,
        lanes: {
          technical: {
            verdict:
              technical.ai?.verdict === "LONG"
                ? "LONG"
                : technical.ai?.verdict === "SHORT"
                  ? "SHORT"
                  : "WAIT",
            confidence: technicalConfidence,
            available: laneAvailability.technical,
          },
          flow: {
            verdict:
              flow.verdict === "LONG"
                ? "LONG"
                : flow.verdict === "SHORT"
                  ? "SHORT"
                  : "WAIT",
            confidence: Number(flow.confidence || 0),
            available: laneAvailability.flow,
          },
          news: {
            sentiment: news.sentiment ?? "NEUTRAL",
            score: news.score ?? 0,
            available: laneAvailability.news,
            error: laneAvailability.news ? null : news.error ?? "News unavailable",
          },
          macro: {
            bias: macro.bias ?? "NEUTRAL",
            score: macro.score ?? 0,
            available: laneAvailability.macro,
            error: laneAvailability.macro ? null : macro.error ?? "Macro unavailable",
          },
        },
        levels: {
          entry: null,
          stopLoss: null,
          target1: null,
          target2: null,
        },
        setup: {
          tradeable: false,
          quality: "C",
          confirmationCount: 0,
          confirmations: [],
          riskReward: null,
          invalidation: "No active trade. Required market data is unavailable.",
          reason: "WAIT: one or more required analysis lanes are unavailable.",
          accountSize: 10000,
          riskPercent: 1,
          riskCapital: 100,
          riskPerUnit: null,
          positionSize: null,
          positionNotional: null,
          dataAvailable: laneAvailability,
        },
        reasoning: "NEXORA requires all four analysis lanes before activating a trade.",
        timestamp: new Date().toISOString(),
      });
    }


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

    const entry =
      technical.ai?.entry != null
        ? Number(technical.ai.entry)
        : null;

    const stopLoss =
      technical.ai?.stopLoss != null
        ? Number(technical.ai.stopLoss)
        : null;

    const target1 =
      technical.ai?.target1 != null
        ? Number(technical.ai.target1)
        : null;

    const target2 =
      technical.ai?.target2 != null
        ? Number(technical.ai.target2)
        : null;

    let riskReward: number | null = null;

    if (
      verdict !== "WAIT" &&
      entry != null &&
      stopLoss != null &&
      target1 != null
    ) {
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(target1 - entry);

      if (risk > 0) {
        riskReward = Number((reward / risk).toFixed(2));
      }
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
    } else if (
      verdict !== "WAIT" &&
      laneAgreement >= 2 &&
      confidence >= 65
    ) {
      setupQuality = "B";
    }

    const riskPerUnit =
      entry != null &&
      stopLoss != null &&
      Number.isFinite(entry) &&
      Number.isFinite(stopLoss)
        ? Math.abs(entry - stopLoss)
        : null;

    const validRiskPerUnit =
      riskPerUnit != null &&
      Number.isFinite(riskPerUnit) &&
      riskPerUnit > 0;

    const validTradeLevels =
      entry != null &&
      stopLoss != null &&
      target1 != null &&
      target2 != null &&
      Number.isFinite(entry) &&
      Number.isFinite(stopLoss) &&
      Number.isFinite(target1) &&
      Number.isFinite(target2);

    const tradeable =
      verdict !== "WAIT" &&
      setupQuality === "A" &&
      validTradeLevels &&
      validRiskPerUnit &&
      riskReward != null &&
      Number.isFinite(riskReward) &&
      riskReward >= 2.0;

    const confirmationLabels = [
      technicalScore === (verdict === "LONG" ? 1 : -1)
        ? "Technical"
        : null,
      flowScore === (verdict === "LONG" ? 1 : -1)
        ? "Flow"
        : null,
      newsScore === (verdict === "LONG" ? 1 : -1)
        ? "News"
        : null,
      macroScore === (verdict === "LONG" ? 1 : -1)
        ? "Macro"
        : null,
    ].filter(Boolean) as string[];

    const accountSize = 10000;
    const riskPercent = 1;

    const riskCapital = accountSize * (riskPercent / 100);

    const positionSize =
      validRiskPerUnit && validTradeLevels
        ? Number((riskCapital / riskPerUnit).toFixed(8))
        : null;

    const positionNotional =
      positionSize != null &&
      entry != null &&
      Number.isFinite(entry)
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

    const setupReason =
      verdict === "WAIT"
        ? "Lane alignment is not strong enough for a high-quality setup."
        : tradeable
          ? `${confirmationLabels.length}/4 confirmation lanes aligned.`
          : "Directional bias exists, but the setup does not meet quality criteria.";

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
        riskPerUnit:
          riskPerUnit != null
            ? Number(riskPerUnit.toFixed(2))
            : null,
        positionSize,
        positionNotional,
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
