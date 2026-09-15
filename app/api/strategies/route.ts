import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const schema = {
  name: "strategy",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      market: { type: "string" },
      timeframe: { type: "string" },
      entryRules: {
        type: "array",
        items: { type: "string" },
      },
      exitRules: {
        type: "array",
        items: { type: "string" },
      },
      indicators: {
        type: "array",
        items: { type: "string" },
      },
      riskPercent: { type: "number" },
      rewardRisk: { type: "number" },
      allowedSides: {
        type: "array",
        items: {
          type: "string",
          enum: ["LONG", "SHORT"],
        },
      },
      notes: { type: "string" },
    },
    required: [
      "name",
      "market",
      "timeframe",
      "entryRules",
      "exitRules",
      "indicators",
      "riskPercent",
      "rewardRisk",
      "allowedSides",
      "notes",
    ],
  },
};

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "STRATEGY_BUILDER",
    examples: [
      "Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R.",
      "Short ETH when EMA20 is below EMA50 and RSI below 45.",
    ],
    supportedIndicators: [
      "RSI",
      "EMA20",
      "EMA50",
      "SMA20",
      "SMA50",
      "MACD",
      "ATR",
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages: [
        {
          role: "system",
          content:
            "You are the NEXORA strategy builder. Convert a trader's natural-language strategy into precise, testable rules. Do not invent indicators the user did not request unless required for clarity. Risk percent and reward/risk must be numeric. Keep rules concise and executable by a backtest engine.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Strategy generation returned no content");
    }

    const strategy = JSON.parse(content);

    return NextResponse.json({
      success: true,
      mode: "AI_STRATEGY_BUILDER",
      strategy,
      source: "OpenAI",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Strategy generation failed",
      },
      { status: 500 }
    );
  }
}
