import { NextResponse } from "next/server";

function numberAfter(text: string, patterns: RegExp[], fallback: number) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return fallback;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "FREE_STRATEGY_BUILDER",
    supportedIndicators: [
      "RSI",
      "EMA20",
      "EMA50",
      "SMA20",
      "SMA50",
      "MACD",
      "ATR",
    ],
    examples: [
      "Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R.",
      "Short BTC when EMA20 is below EMA50 and RSI below 45.",
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Strategy prompt is required" },
        { status: 400 }
      );
    }

    const text = prompt.toLowerCase();

    const longOnly =
      text.includes("long only") ||
      text.includes("buy only");

    const shortOnly =
      text.includes("short only") ||
      text.includes("sell only");

    const allowedSides =
      longOnly
        ? ["LONG"]
        : shortOnly
          ? ["SHORT"]
          : ["LONG", "SHORT"];

    const indicators: string[] = [];
    const entryRules: string[] = [];
    const exitRules: string[] = [];

    if (text.includes("ema20")) {
      indicators.push("EMA20");

      if (
        text.includes("above ema20") ||
        text.includes("price above ema20")
      ) {
        entryRules.push("Price above EMA20");
      }

      if (
        text.includes("below ema20") ||
        text.includes("price below ema20")
      ) {
        entryRules.push("Price below EMA20");
      }
    }

    if (text.includes("ema50")) {
      indicators.push("EMA50");

      if (text.includes("above ema50")) {
        entryRules.push("Price above EMA50");
      }

      if (text.includes("below ema50")) {
        entryRules.push("Price below EMA50");
      }
    }

    if (text.includes("ema20") && text.includes("ema50")) {
      if (
        text.includes("ema20 above ema50") ||
        text.includes("ema20 > ema50")
      ) {
        entryRules.push("EMA20 above EMA50");
      }

      if (
        text.includes("ema20 below ema50") ||
        text.includes("ema20 < ema50")
      ) {
        entryRules.push("EMA20 below EMA50");
      }
    }

    const rsiAbove = numberAfter(
      text,
      [
        /rsi\s*(?:above|over|greater than)\s*(\d+(?:\.\d+)?)/,
      ],
      0
    );

    const rsiBelow = numberAfter(
      text,
      [
        /rsi\s*(?:below|under|less than)\s*(\d+(?:\.\d+)?)/,
      ],
      0
    );

    if (rsiAbove > 0) {
      indicators.push("RSI");
      entryRules.push(`RSI above ${rsiAbove}`);
    }

    if (rsiBelow > 0) {
      indicators.push("RSI");
      entryRules.push(`RSI below ${rsiBelow}`);
    }

    if (text.includes("macd")) {
      indicators.push("MACD");

      if (
        text.includes("bullish macd") ||
        text.includes("macd positive")
      ) {
        entryRules.push("MACD bullish");
      }

      if (
        text.includes("bearish macd") ||
        text.includes("macd negative")
      ) {
        entryRules.push("MACD bearish");
      }
    }

    const riskPercent = numberAfter(
      text,
      [
        /risk\s*(?:of)?\s*(\d+(?:\.\d+)?)\s*%/,
        /(\d+(?:\.\d+)?)\s*%\s*risk/,
      ],
      1
    );

    const rewardRisk = numberAfter(
      text,
      [
        /(\d+(?:\.\d+)?)\s*r/,
        /risk\s*reward\s*(\d+(?:\.\d+)?)/,
        /reward\s*(\d+(?:\.\d+)?)r/,
      ],
      2
    );

    exitRules.push(`Risk ${riskPercent}%`);
    exitRules.push(`Take profit at ${rewardRisk}R`);

    const name =
      prompt.length > 60
        ? `${prompt.slice(0, 57)}...`
        : prompt;

    return NextResponse.json({
      success: true,
      mode: "FREE_STRATEGY_BUILDER",
      source: "NEXORA deterministic parser",
      strategy: {
        name,
        market: text.includes("forex")
          ? "FOREX"
          : "CRYPTO",
        timeframe:
          text.match(/\b(5m|15m|30m|1h|4h|1d)\b/)?.[1] ||
          "1h",
        entryRules,
        exitRules,
        indicators: [...new Set(indicators)],
        riskPercent,
        rewardRisk,
        allowedSides,
        notes:
          entryRules.length > 0
            ? "Strategy parsed successfully."
            : "Add indicator conditions such as EMA20, EMA50, RSI or MACD.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Strategy parsing failed",
      },
      { status: 500 }
    );
  }
}
