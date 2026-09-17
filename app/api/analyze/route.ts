import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  RSI,
  EMA,
  SMA,
  MACD,
  ATR,
} from "technicalindicators";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}

const cryptoSymbols = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
];

const forexSymbols = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
];

const commoditySymbols = [
  "XAU/USD",
  "XAG/USD",
  "WTI/USD",
];

function getCryptoSymbol(symbol: string) {
  if (!cryptoSymbols.includes(symbol)) {
    throw new Error(`Unsupported crypto symbol: ${symbol}`);
  }

  return symbol;
}

function getForexSymbol(symbol: string) {
  if (!forexSymbols.includes(symbol)) {
    throw new Error(`Unsupported forex symbol: ${symbol}`);
  }

  return symbol;
}

function structureAnalysis(ohlcv: number[][]) {
  const highs = ohlcv.map((c) => c[2]);
  const lows = ohlcv.map((c) => c[3]);
  const closes = ohlcv.map((c) => c[4]);

  const recentHighs = highs.slice(-21, -1);
  const recentLows = lows.slice(-21, -1);

  const highest = Math.max(...recentHighs);
  const lowest = Math.min(...recentLows);
  const price = closes[closes.length - 1];

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

  const displacement =
    Math.abs(closes[closes.length - 1] - closes[closes.length - 2]) /
    closes[closes.length - 2];

  const liquiditySweep =
    lows[lows.length - 1] < lowest ||
    highs[highs.length - 1] > highest;

  return {
    marketStructure,
    bos,
    displacement,
    liquiditySweep,
    rangeHigh: highest,
    rangeLow: lowest,
  };
}

export async function POST(request: Request) {
  try {
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

    const isForex = forexSymbols.includes(symbol);
    const isCommodity = commoditySymbols.includes(symbol);

    let ohlcv: number[][];

    if (!isForex && !isCommodity) {
      const apiKey = process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: "TWELVE_DATA_API_KEY is not configured" },
          { status: 500 }
        );
      }

      const cryptoSymbol = getCryptoSymbol(symbol);

      const url = new URL("https://api.twelvedata.com/time_series");
      url.searchParams.set("symbol", cryptoSymbol);
      url.searchParams.set("interval", "1h");
      url.searchParams.set("outputsize", "250");
      url.searchParams.set("timezone", "UTC");
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url.toString(), {
        next: { revalidate: 30 },
      });

      const data = await response.json();

      if (!response.ok || data.status === "error" || !data.values) {
        return NextResponse.json(
          { error: data.message || "Failed to fetch crypto market data" },
          { status: 502 }
        );
      }

      ohlcv = data.values.reverse().map((c: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }) => [
        new Date(c.datetime).getTime(),
        Number(c.open),
        Number(c.high),
        Number(c.low),
        Number(c.close),
        Number(c.volume || 0),
      ]);
    } else if (isCommodity) {
      const apiKey = process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: "TWELVE_DATA_API_KEY is not configured." },
          { status: 500 }
        );
      }

      const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=1h` +
        `&outputsize=250` +
        `&timezone=UTC` +
        `&apikey=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        next: { revalidate: 30 },
      });

      const commodity = await response.json();

      if (
        !response.ok ||
        commodity.status === "error" ||
        !Array.isArray(commodity.values)
      ) {
        return NextResponse.json(
          {
            error:
              commodity.message ||
              "Commodity market data request failed.",
          },
          { status: 502 }
        );
      }

      ohlcv = commodity.values
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
    } else {
      const apiKey = process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: "TWELVE_DATA_API_KEY is not configured." },
          { status: 500 }
        );
      }

      const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=1h` +
        `&outputsize=250` +
        `&timezone=UTC` +
        `&apikey=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        next: { revalidate: 30 },
      });

      const fx = await response.json();

      if (!response.ok || fx.status === "error" || !Array.isArray(fx.values)) {
        return NextResponse.json(
          {
            error: fx.message || "Forex market data request failed.",
          },
          { status: 502 }
        );
      }

      ohlcv = fx.values
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

    const closes = ohlcv.map((c) => c[4]);
    const highs = ohlcv.map((c) => c[2]);
    const lows = ohlcv.map((c) => c[3]);
    const volumes = ohlcv.map((c) => c[5]);

    const price = closes[closes.length - 1];

    const rsiValues = RSI.calculate({
      period: 14,
      values: closes,
    });

    const ema20Values = EMA.calculate({
      period: 20,
      values: closes,
    });

    const ema50Values = EMA.calculate({
      period: 50,
      values: closes,
    });

    const sma20Values = SMA.calculate({
      period: 20,
      values: closes,
    });

    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const atrValues = ATR.calculate({
      period: 14,
      high: highs,
      low: lows,
      close: closes,
    });

    const rsi = rsiValues.at(-1) ?? 50;
    const ema20 = ema20Values.at(-1) ?? price;
    const ema50 = ema50Values.at(-1) ?? price;
    const sma20 = sma20Values.at(-1) ?? price;
    const macd = macdValues.at(-1);
    const atr = atrValues.at(-1) ?? 0;

    const recentVolume =
      volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    const currentVolume = volumes.at(-1) ?? 0;

    const volumeRatio =
      recentVolume > 0 ? currentVolume / recentVolume : 1;

    const structure = structureAnalysis(ohlcv);

    const prompt = `
You are NEXORA AI, a professional market-analysis engine.

Asset: ${symbol}
Analysis mode: ${mode}

Use ONLY the supplied market data.
Do not invent prices, indicators, news, or events.

Technical:
Price: ${price}
RSI14: ${rsi}
EMA20: ${ema20}
EMA50: ${ema50}
SMA20: ${sma20}
MACD: ${JSON.stringify(macd)}
ATR14: ${atr}
Volume ratio: ${volumeRatio}

Market structure:
${JSON.stringify(structure)}

For ${mode}, analyze the market appropriately.

Technical:
Focus on trend, momentum, RSI, EMA/SMA, MACD, ATR and volume.

Price Action:
Focus on swing highs/lows, break of structure, rejection and candle behavior.

SMC:
Focus on BOS, CHoCH, liquidity, order-block concepts and fair-value-gap concepts.
Do not claim an order block or FVG exists unless the supplied price structure supports it.

ICT:
Focus on liquidity sweeps, displacement, fair-value gaps, dealing range and premium/discount concepts.
Do not invent session information.

Return ONLY valid JSON:

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

    let ai: any;

    try {
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
            content: prompt,
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
                verdict: {
                  type: "string",
                  enum: ["LONG", "SHORT", "WAIT"],
                },
                confidence: {
                  type: "number",
                },
                trend: {
                  type: "string",
                },
                momentum: {
                  type: "string",
                },
                reason: {
                  type: "string",
                },
                risk: {
                  type: "string",
                },
                entry: {
                  type: "number",
                },
                stopLoss: {
                  type: "number",
                },
                target1: {
                  type: "number",
                },
                target2: {
                  type: "number",
                },
                signals: {
                  type: "array",
                  items: {
                    type: "string",
                  },
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

      ai = JSON.parse(response.output_text || "{}");

      if (!ai || typeof ai !== "object") {
        throw new Error("OpenAI returned invalid analysis JSON");
      }
    } catch (aiError) {
      console.warn("AI quota/error, using deterministic fallback:", aiError);

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

      ai = {
        verdict,
        confidence: verdict === "WAIT" ? 55 : 68,
        risk: verdict === "WAIT" ? "HIGH" : "MEDIUM",
        reasoning:
          verdict === "LONG"
            ? "Price is above EMA20/EMA50 with bullish momentum confirmation."
            : verdict === "SHORT"
            ? "Price is below EMA20/EMA50 with bearish momentum confirmation."
            : "Technical evidence is mixed, so NEXORA AI recommends waiting.",
        signals: [
          `RSI: ${rsi}`,
          `EMA20: ${ema20.toFixed(2)}`,
          `EMA50: ${ema50.toFixed(2)}`,
          `MACD histogram: ${(macd?.histogram ?? 0).toFixed(2)}`,
          `Structure: ${structure.marketStructure}`,
        ],
        source: "NEXORA deterministic fallback",
      };
    }

    // NEXORA deterministic risk engine.
    // Trade levels are calculated from real market price + ATR,
    // never invented by the AI model.
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
      ai.stopLoss = null;
      ai.target1 = null;
      ai.target2 = null;
    }

    return NextResponse.json({
      symbol,
      timeframe: "1h",
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
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}
