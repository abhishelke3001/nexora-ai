import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RSI, EMA, SMA, MACD, ATR } from "technicalindicators";

const timeframe = "1h";

const supportedSymbols = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "XAU/USD",
  "XAG/USD",
  "WTI/USD",
] as const;

const xausSymbols: Record<string, string> = {
  "XAU/USD": "xau",
  "XAG/USD": "silver",
  "WTI/USD": "oil",
};

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function structureAnalysis(ohlcv: number[][]) {
  const highs = ohlcv.map((c) => c[2]);
  const lows = ohlcv.map((c) => c[3]);
  const closes = ohlcv.map((c) => c[4]);

  const recentHighs = highs.slice(-21, -1);
  const recentLows = lows.slice(-21, -1);
  const highest = Math.max(...recentHighs);
  const lowest = Math.min(...recentLows);
  const price = closes.at(-1) ?? 0;

  const previousHigh = Math.max(...highs.slice(-40, -20));
  const previousLow = Math.min(...lows.slice(-40, -20));

  let marketStructure = "RANGE";
  let bos = "NONE";

  if (price > previousHigh) {
    marketStructure = "BULLISH";
    bos = "BULLISH BOS";
  } else if (price < previousLow) {
    marketStructure = "BEARISH";
    bos = "BEARISH BOS";
  }

  const previousClose = closes.at(-2) ?? price;
  const displacement =
    previousClose !== 0
      ? Math.abs(price - previousClose) / Math.abs(previousClose)
      : 0;

  const lastLow = lows.at(-1) ?? 0;
  const lastHigh = highs.at(-1) ?? 0;

  const liquiditySweep = lastLow < lowest || lastHigh > highest;

  return {
    marketStructure,
    bos,
    displacement,
    liquiditySweep,
    rangeHigh: highest,
    rangeLow: lowest,
  };
}

type AiAnalysis = {
  verdict: "LONG" | "SHORT" | "WAIT";
  confidence: number;
  trend: string;
  momentum: string;
  reason: string;
  risk: string;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  signals: string[];
  reasoning?: string;
  source?: string;
  cacheHit?: boolean;
  candleTime?: string;
};

function normalizeAi(raw: any): AiAnalysis {
  const verdict =
    raw?.verdict === "LONG" || raw?.verdict === "SHORT" || raw?.verdict === "WAIT"
      ? raw.verdict
      : "WAIT";

  const confidence = Number(raw?.confidence);
  const finiteConfidence = Number.isFinite(confidence)
    ? Math.max(0, Math.min(100, confidence))
    : 50;

  const result: AiAnalysis = {
    verdict,
    confidence: finiteConfidence,
    trend: typeof raw?.trend === "string" ? raw.trend : "UNKNOWN",
    momentum:
      typeof raw?.momentum === "string" ? raw.momentum : "UNKNOWN",
    reason:
      typeof raw?.reason === "string"
        ? raw.reason
        : typeof raw?.reasoning === "string"
          ? raw.reasoning
          : "No model reasoning returned.",
    risk: typeof raw?.risk === "string" ? raw.risk : "MEDIUM",
    entry: Number(raw?.entry),
    stopLoss: Number(raw?.stopLoss),
    target1: Number(raw?.target1),
    target2: Number(raw?.target2),
    signals: Array.isArray(raw?.signals)
      ? raw.signals.filter((v: unknown) => typeof v === "string").slice(0, 12)
      : [],
  };

  result.reasoning = result.reason;

  return result;
}

async function fetchXausMarketData(symbol: string): Promise<number[][]> {
  const xausSymbol = xausSymbols[symbol];

  if (!xausSymbol) {
    throw new Error(`XAUS does not support ${symbol}`);
  }

  const url = new URL("https://xaus.com/api/v1/chart");
  url.searchParams.set("symbol", xausSymbol);
  url.searchParams.set("range", "3mo");
  url.searchParams.set("interval", "1h");

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  const data = await response.json();
  const points = Array.isArray(data?.points) ? data.points : [];

  if (
    !response.ok ||
    points.length < 60 ||
    data?.data_state?.status === "unavailable"
  ) {
    throw new Error(
      data?.error ||
        `XAUS market data unavailable for ${symbol}`
    );
  }

  const candles = points
    .map((c: any) => [
      Number(c.t) * 1000,
      Number(c.o),
      Number(c.h),
      Number(c.l),
      Number(c.c),
      Number(c.v ?? 0),
    ])
    .filter((c: number[]) =>
      c.every((value) => Number.isFinite(value))
    );

  if (candles.length < 60) {
    throw new Error(`Insufficient XAUS candles for ${symbol}`);
  }

  return candles;
}

async function fetchMarketData(symbol: string): Promise<number[][]> {
  const xausSupported = Boolean(xausSymbols[symbol]);

  if (xausSupported) {
    try {
      return await fetchXausMarketData(symbol);
    } catch (error) {
      console.warn(`[NEXORA DATA] XAUS fallback failed for ${symbol}:`, error);
    }
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", timeframe);
  url.searchParams.set("outputsize", "250");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 30 },
  });

  const data = await response.json();

  if (!response.ok || data.status === "error" || !Array.isArray(data.values)) {
    throw new Error(data.message || "Failed to fetch market data");
  }

  return data.values
    .slice()
    .reverse()
    .map((c: any) => [
      new Date(c.datetime).getTime(),
      Number(c.open),
      Number(c.high),
      Number(c.low),
      Number(c.close),
      Number(c.volume || 0),
    ]);
}

function buildPrompt(args: {
  symbol: string;
  mode: string;
  price: number;
  rsi: number;
  ema20: number;
  ema50: number;
  sma20: number;
  macd: any;
  atr: number;
  volumeRatio: number;
  structure: ReturnType<typeof structureAnalysis>;
}) {
  return `
You are NEXORA AI, a professional market-analysis engine.

Asset: ${args.symbol}
Timeframe: 1H
Analysis mode: ${args.mode}

Use ONLY the supplied market data.
Do not invent prices, indicators, news, events, session information, order blocks, or fair-value gaps.

Technical:
Price: ${args.price}
RSI14: ${args.rsi}
EMA20: ${args.ema20}
EMA50: ${args.ema50}
SMA20: ${args.sma20}
MACD: ${JSON.stringify(args.macd)}
ATR14: ${args.atr}
Volume ratio: ${args.volumeRatio}

Market structure:
${JSON.stringify(args.structure)}

For this analysis, evaluate the requested mode using the supplied evidence.
Technical: trend, momentum, RSI, EMA/SMA, MACD, ATR and volume.
Price Action: swing highs/lows, break of structure, rejection and candle behavior.
SMC: BOS, CHoCH, liquidity, order-block concepts and fair-value-gap concepts.
ICT: liquidity sweeps, displacement, fair-value gaps, dealing range and premium/discount concepts.

Only claim an order block or FVG if the supplied structure directly supports it.
Only claim liquidity sweeps when liquiditySweep is true.
Do not invent session information.

Return ONLY valid JSON with exactly these fields:
{
  "verdict": "LONG" | "SHORT" | "WAIT",
  "confidence": number,
  "trend": string,
  "momentum": string,
  "reason": string,
  "risk": string,
  "entry": number,
  "stopLoss": number,
  "target1": number,
  "target2": number,
  "signals": string[]
}

Be conservative.
If evidence conflicts, return WAIT.
No guaranteed-profit language.
`;
}

async function runAnalysis(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const symbol =
    (typeof body.symbol === "string" && body.symbol.trim()
      ? body.symbol.trim().toUpperCase()
      : searchParams.get("symbol")) || "BTC/USD";

  const mode =
    (typeof body.mode === "string" && body.mode.trim()
      ? body.mode.trim()
      : searchParams.get("mode")) || "Technical";

  if (!supportedSymbols.includes(symbol as (typeof supportedSymbols)[number])) {
    return NextResponse.json(
      { error: `Unsupported symbol: ${symbol}` },
      { status: 400 }
    );
  }

  const ohlcv = await fetchMarketData(symbol);

  if (ohlcv.length < 60) {
    return NextResponse.json(
      { error: "Insufficient market candles for analysis" },
      { status: 502 }
    );
  }

  const closes = ohlcv.map((c) => c[4]);
  const highs = ohlcv.map((c) => c[2]);
  const lows = ohlcv.map((c) => c[3]);
  const volumes = ohlcv.map((c) => c[5]);
  const price = closes.at(-1) ?? 0;

  const rsi = RSI.calculate({ period: 14, values: closes }).at(-1) ?? 50;
  const ema20 = EMA.calculate({ period: 20, values: closes }).at(-1) ?? price;
  const ema50 = EMA.calculate({ period: 50, values: closes }).at(-1) ?? price;
  const sma20 = SMA.calculate({ period: 20, values: closes }).at(-1) ?? price;
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).at(-1);
  const atr = ATR.calculate({
    period: 14,
    high: highs,
    low: lows,
    close: closes,
  }).at(-1) ?? 0;

  const recentVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes.at(-1) ?? 0;
  const volumeRatio = recentVolume > 0 ? currentVolume / recentVolume : 1;
  const structure = structureAnalysis(ohlcv);

  const latestCandleMs = ohlcv.at(-1)?.[0];
  if (!latestCandleMs) {
    return NextResponse.json(
      { error: "Latest candle timestamp unavailable" },
      { status: 502 }
    );
  }

  const latestCandleTime = new Date(latestCandleMs).toISOString();
  const supabase = getSupabase();

  let ai: AiAnalysis | null = null;
  let cacheHit = false;

  const { data: cached, error: cacheReadError } = await supabase
    .from("ai_analysis_cache")
    .select("analysis,candle_time,expires_at")
    .eq("symbol", symbol)
    .eq("timeframe", timeframe)
    .maybeSingle();

  if (cacheReadError) {
    console.warn("[NEXORA AI] cache read failed:", cacheReadError.message);
  }

  if (
    cached?.analysis &&
    cached.candle_time === latestCandleTime &&
    cached.expires_at &&
    new Date(cached.expires_at).getTime() > Date.now()
  ) {
    ai = normalizeAi(cached.analysis);
    cacheHit = true;
    console.log(`[NEXORA AI] cache hit ${symbol} ${timeframe} ${latestCandleTime}`);
  }

  if (!ai) {
    try {
      console.log(`[NEXORA AI] real model call ${symbol} ${timeframe} ${latestCandleTime}`);

      const response = await getOpenAI().responses.create({
        model: "gpt-5.6-luna",
        input: [
          {
            role: "system",
            content:
              "You are a financial market analysis engine. Produce conservative, probabilistic analysis only. Never claim certainty or guaranteed profit.",
          },
          {
            role: "user",
            content: buildPrompt({
              symbol,
              mode,
              price,
              rsi,
              ema20,
              ema50,
              sma20,
              macd,
              atr,
              volumeRatio,
              structure,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "nexora_market_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                verdict: { type: "string", enum: ["LONG", "SHORT", "WAIT"] },
                confidence: { type: "number" },
                trend: { type: "string" },
                momentum: { type: "string" },
                reason: { type: "string" },
                risk: { type: "string" },
                entry: { type: "number" },
                stopLoss: { type: "number" },
                target1: { type: "number" },
                target2: { type: "number" },
                signals: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "verdict",
                "confidence",
                "trend",
                "momentum",
                "reason",
                "risk",
                "entry",
                "stopLoss",
                "target1",
                "target2",
                "signals",
              ],
            },
          },
        },
      });

      ai = normalizeAi(JSON.parse(response.output_text || "{}"));

      const expiresAt = new Date(Date.now() + 75 * 60 * 1000).toISOString();

      const { error: cacheWriteError } = await supabase
        .from("ai_analysis_cache")
        .upsert(
          {
            symbol,
            timeframe,
            candle_time: latestCandleTime,
            analysis: ai,
            expires_at: expiresAt,
          },
          { onConflict: "symbol,timeframe" }
        );

      if (cacheWriteError) {
        console.warn("[NEXORA AI] cache write failed:", cacheWriteError.message);
      } else {
        console.log(`[NEXORA AI] cached real AI result ${symbol} ${timeframe}`);
      }
    } catch (aiError) {
      console.warn("[NEXORA AI] model error; using deterministic safety fallback:", aiError);

      const bullish =
        price > ema20 &&
        ema20 > ema50 &&
        rsi >= 50 &&
        rsi < 75 &&
        (macd?.histogram ?? 0) > 0;

      const bearish =
        price < ema20 &&
        ema20 < ema50 &&
        rsi <= 50 &&
        rsi > 25 &&
        (macd?.histogram ?? 0) < 0;

      const verdict = bullish ? "LONG" : bearish ? "SHORT" : "WAIT";
      const fallbackReason =
        verdict === "LONG"
          ? "Price is above EMA20/EMA50 with bullish momentum confirmation."
          : verdict === "SHORT"
            ? "Price is below EMA20/EMA50 with bearish momentum confirmation."
            : "Technical evidence is mixed, so NEXORA AI recommends waiting.";

      ai = {
        verdict,
        confidence: verdict === "WAIT" ? 55 : 68,
        trend: structure.marketStructure,
        momentum: verdict === "LONG" ? "Bullish" : verdict === "SHORT" ? "Bearish" : "Mixed",
        reason: fallbackReason,
        reasoning: fallbackReason,
        risk: verdict === "WAIT" ? "HIGH" : "MEDIUM",
        entry: price,
        stopLoss: price,
        target1: price,
        target2: price,
        signals: [
          `RSI: ${rsi.toFixed(2)}`,
          `EMA20: ${ema20.toFixed(2)}`,
          `EMA50: ${ema50.toFixed(2)}`,
          `MACD histogram: ${(macd?.histogram ?? 0).toFixed(2)}`,
          `Structure: ${structure.marketStructure}`,
        ],
        source: "NEXORA deterministic fallback",
      };
    }
  }

  ai.candleTime = latestCandleTime;
  ai.cacheHit = cacheHit;
  ai.reasoning = ai.reasoning || ai.reason;

  const riskMultiplier = 1.5;
  const target1Multiplier = 2.25;
  const target2Multiplier = 3.0;

  const longStop = price - atr * riskMultiplier;
  const shortStop = price + atr * riskMultiplier;
  const longTarget1 = price + atr * target1Multiplier;
  const longTarget2 = price + atr * target2Multiplier;
  const shortTarget1 = price - atr * target1Multiplier;
  const shortTarget2 = price - atr * target2Multiplier;

  if (ai.verdict === "LONG") {
    ai.entry = price;
    ai.stopLoss = longStop;
    ai.target1 = longTarget1;
    ai.target2 = longTarget2;
  } else if (ai.verdict === "SHORT") {
    ai.entry = price;
    ai.stopLoss = shortStop;
    ai.target1 = shortTarget1;
    ai.target2 = shortTarget2;
  } else {
    ai.entry = price;
    ai.stopLoss = Number.NaN;
    ai.target1 = Number.NaN;
    ai.target2 = Number.NaN;
  }

  return NextResponse.json({
    symbol,
    timeframe,
    mode,
    price,
    indicators: {
      rsi,
      ema20,
      ema50,
      sma20,
      macd,
      atr,
      volumeRatio,
    },
    structure,
    ai,
    aiCache: {
      hit: cacheHit,
      candleTime: latestCandleTime,
      expiresAfterMinutes: 75,
    },
  });
}

export async function POST(request: Request) {
  try {
    return await runAnalysis(request);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    return await runAnalysis(request);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
