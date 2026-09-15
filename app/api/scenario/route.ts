import { NextResponse } from "next/server";

function sma(values: number[], period: number) {
  if (values.length < period) return null;

  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number) {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let current =
    values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    current =
      (values[i] - current) * multiplier + current;
  }

  return current;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;

  const rs = gains / losses;

  return 100 - 100 / (1 + rs);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") || "BTC/USD";
    const shock = Number(searchParams.get("shock") || 0);

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not configured");
    }

    const marketUrl = new URL(
      "https://api.twelvedata.com/time_series"
    );

    marketUrl.searchParams.set("symbol", symbol);
    marketUrl.searchParams.set("interval", "1h");
    marketUrl.searchParams.set("outputsize", "100");
    marketUrl.searchParams.set("timezone", "UTC");
    marketUrl.searchParams.set("apikey", apiKey);

    const response = await fetch(marketUrl.toString(), {
      cache: "no-store",
    });

    const result = await response.json();

    if (
      !response.ok ||
      result.status === "error" ||
      !Array.isArray(result.values)
    ) {
      throw new Error(
        result.message || "Historical market data unavailable"
      );
    }

    const closes = result.values
      .slice()
      .reverse()
      .map((c: any) => Number(c.close))
      .filter(Number.isFinite);

    if (closes.length < 50) {
      throw new Error("Not enough historical candles for scenario analysis");
    }

    const currentPrice = closes[closes.length - 1];

    const scenarioPrice =
      currentPrice * (1 + shock / 100);

    // Replace the latest close with the hypothetical scenario price.
    const scenarioCloses = [...closes];
    scenarioCloses[scenarioCloses.length - 1] = scenarioPrice;

    const ema20 = ema(scenarioCloses, 20);
    const ema50 = ema(scenarioCloses, 50);
    const scenarioRsi = rsi(scenarioCloses, 14);

    const ema12 = ema(scenarioCloses, 12);
    const ema26 = ema(scenarioCloses, 26);

    const macd =
      ema12 != null && ema26 != null
        ? ema12 - ema26
        : 0;

    let technicalVerdict = "WAIT";

    if (
      ema20 != null &&
      ema50 != null &&
      scenarioRsi != null
    ) {
      if (
        scenarioPrice > ema20 &&
        ema20 > ema50 &&
        scenarioRsi >= 55
      ) {
        technicalVerdict = "LONG";
      } else if (
        scenarioPrice < ema20 &&
        ema20 < ema50 &&
        scenarioRsi <= 45
      ) {
        technicalVerdict = "SHORT";
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", symbol);

    const verdictResponse = await fetch(
      verdictUrl.toString(),
      { cache: "no-store" }
    );

    const liveVerdict = await verdictResponse.json();

    const liveFlowScore =
      Number(liveVerdict?.lanes?.flow?.score || 0);

    const newsScore =
      Number(liveVerdict?.lanes?.news?.score || 0);

    const macroScore =
      Number(liveVerdict?.lanes?.macro?.score || 0);

    const technicalScore =
      technicalVerdict === "LONG"
        ? 1
        : technicalVerdict === "SHORT"
          ? -1
          : 0;

    const weightedScore =
      technicalScore * 0.4 +
      (liveFlowScore > 0 ? 1 : liveFlowScore < 0 ? -1 : 0) * 0.3 +
      (newsScore > 0 ? 1 : newsScore < 0 ? -1 : 0) * 0.15 +
      (macroScore > 0 ? 1 : macroScore < 0 ? -1 : 0) * 0.15;

    let scenarioVerdict = "WAIT";

    if (weightedScore >= 0.6) {
      scenarioVerdict = "LONG";
    } else if (weightedScore <= -0.6) {
      scenarioVerdict = "SHORT";
    }

    const riskPercent = 0.01;
    const rewardRisk = 2;

    const risk = scenarioPrice * riskPercent;

    const referenceRisk = scenarioPrice * 0.01;

    const referenceSide =
      scenarioVerdict === "SHORT"
        ? "SHORT"
        : scenarioVerdict === "LONG"
          ? "LONG"
          : technicalVerdict === "SHORT"
            ? "SHORT"
            : "LONG";

    const confidence = Math.round(
      55 + Math.min(35, Math.abs(weightedScore) * 30)
    );

    const scenarioLevels = {
      entry: Number(scenarioPrice.toFixed(2)),
      stopLoss:
        referenceSide === "LONG"
          ? Number((scenarioPrice - referenceRisk).toFixed(2))
          : Number((scenarioPrice + referenceRisk).toFixed(2)),
      target1:
        referenceSide === "LONG"
          ? Number((scenarioPrice + referenceRisk * 2).toFixed(2))
          : Number((scenarioPrice - referenceRisk * 2).toFixed(2)),
      target2:
        referenceSide === "LONG"
          ? Number((scenarioPrice + referenceRisk * 3).toFixed(2))
          : Number((scenarioPrice - referenceRisk * 3).toFixed(2)),
      side: referenceSide,
      active:
        scenarioVerdict === "LONG" ||
        scenarioVerdict === "SHORT",
    };

    return NextResponse.json({
      success: true,
      mode: "LIVE_SCENARIO_SIMULATOR",
      symbol,
      currentPrice: Number(currentPrice.toFixed(2)),
      shockPercent: shock,
      scenarioPrice: Number(scenarioPrice.toFixed(2)),

      liveVerdict: liveVerdict.verdict,
      scenarioVerdict,
      confidence,

      technical: {
        verdict: technicalVerdict,
        ema20:
          ema20 != null ? Number(ema20.toFixed(2)) : null,
        ema50:
          ema50 != null ? Number(ema50.toFixed(2)) : null,
        rsi:
          scenarioRsi != null
            ? Number(scenarioRsi.toFixed(2))
            : null,
        macd: Number(macd.toFixed(4)),
      },

      lanes: {
        technical: technicalVerdict,
        flow: liveVerdict?.lanes?.flow?.verdict || "NEUTRAL",
        news: liveVerdict?.lanes?.news?.sentiment || "NEUTRAL",
        macro: liveVerdict?.lanes?.macro?.bias || "NEUTRAL",
      },

      scenarioLevels,

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
