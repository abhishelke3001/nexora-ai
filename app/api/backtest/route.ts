import { NextResponse } from "next/server";

type Candle = [
  number,
  number,
  number,
  number,
  number,
  number
];

type Side = "LONG" | "SHORT";

type Strategy = {
  timeframe: string;
  riskPercent: number;
  rewardRisk: number;
  allowedSides: Side[];
  entryRules: string[];
};

type Position = {
  side: Side;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
};

type Trade = {
  side: Side;
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  result: "WIN" | "LOSS";
};

function sma(values: number[], period: number, index: number) {
  if (index < period - 1) return null;

  let total = 0;
  for (let i = index - period + 1; i <= index; i++) {
    total += values[i];
  }

  return total / period;
}

function ema(values: number[], period: number, index: number) {
  if (index < period - 1) return null;

  const multiplier = 2 / (period + 1);

  let current = values
    .slice(0, period)
    .reduce((a, b) => a + b, 0) / period;

  for (let i = period; i <= index; i++) {
    current =
      (values[i] - current) * multiplier + current;
  }

  return current;
}

function rsi(values: number[], period: number, index: number) {
  if (index < period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = index - period + 1; i <= index; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function parseStrategy(prompt: string): Strategy {
  const text = prompt.toLowerCase();

  const allowedSides: Side[] =
    text.includes("long only") || text.includes("buy only")
      ? ["LONG"]
      : text.includes("short only") || text.includes("sell only")
        ? ["SHORT"]
        : ["LONG", "SHORT"];

  const riskMatch = text.match(
    /risk\s*(?:of)?\s*(\d+(?:\.\d+)?)\s*%/
  );

  const rrMatch =
    text.match(/(\d+(?:\.\d+)?)\s*r\b/) ||
    text.match(/risk[\s-]*reward\s*(\d+(?:\.\d+)?)/i);

  const riskPercent =
    Number(riskMatch?.[1] ?? 1) / 100;

  const rewardRisk =
    Number(rrMatch?.[1] ?? 2);

  const entryRules: string[] = [];

  if (
    text.includes("price is above ema20") ||
    text.includes("price above ema20") ||
    text.includes("above ema20")
  ) {
    entryRules.push("PRICE_ABOVE_EMA20");
  }

  if (text.includes("price below ema20")) {
    entryRules.push("PRICE_BELOW_EMA20");
  }

  if (
    text.includes("price is above ema50") ||
    text.includes("price above ema50") ||
    text.includes("above ema50")
  ) {
    entryRules.push("PRICE_ABOVE_EMA50");
  }

  if (text.includes("price below ema50")) {
    entryRules.push("PRICE_BELOW_EMA50");
  }

  if (
    text.includes("ema20 above ema50") ||
    text.includes("ema20 > ema50") ||
    text.includes("ema20 is above ema50")
  ) {
    entryRules.push("EMA20_ABOVE_EMA50");
  }

  if (
    text.includes("ema20 below ema50") ||
    text.includes("ema20 < ema50") ||
    text.includes("ema20 is below ema50")
  ) {
    entryRules.push("EMA20_BELOW_EMA50");
  }

  const rsiAbove = text.match(
    /rsi\s*(?:above|over|greater than)\s*(\d+(?:\.\d+)?)/
  );

  if (rsiAbove) {
    entryRules.push(`RSI_ABOVE:${rsiAbove[1]}`);
  }

  const rsiBelow = text.match(
    /rsi\s*(?:below|under|less than)\s*(\d+(?:\.\d+)?)/
  );

  if (rsiBelow) {
    entryRules.push(`RSI_BELOW:${rsiBelow[1]}`);
  }

  if (
    text.includes("bullish macd") ||
    text.includes("macd positive")
  ) {
    entryRules.push("MACD_BULLISH");
  }

  if (
    text.includes("bearish macd") ||
    text.includes("macd negative")
  ) {
    entryRules.push("MACD_BEARISH");
  }

  return {
    timeframe:
      text.match(/\b(5m|15m|30m|1h|4h|1d)\b/)?.[1] ||
      "1h",
    riskPercent,
    rewardRisk,
    allowedSides,
    entryRules,
  };
}

function rulesPass(
  strategy: Strategy,
  side: Side,
  price: number,
  ema20Value: number,
  ema50Value: number,
  rsiValue: number,
  macdValue: number
) {
  if (!strategy.allowedSides.includes(side)) {
    return false;
  }

  for (const rule of strategy.entryRules) {
    if (
      rule === "PRICE_ABOVE_EMA20" &&
      !(price > ema20Value)
    ) {
      return false;
    }

    if (
      rule === "PRICE_BELOW_EMA20" &&
      !(price < ema20Value)
    ) {
      return false;
    }

    if (
      rule === "PRICE_ABOVE_EMA50" &&
      !(price > ema50Value)
    ) {
      return false;
    }

    if (
      rule === "PRICE_BELOW_EMA50" &&
      !(price < ema50Value)
    ) {
      return false;
    }

    if (
      rule === "EMA20_ABOVE_EMA50" &&
      !(ema20Value > ema50Value)
    ) {
      return false;
    }

    if (
      rule === "EMA20_BELOW_EMA50" &&
      !(ema20Value < ema50Value)
    ) {
      return false;
    }

    if (rule.startsWith("RSI_ABOVE:")) {
      const threshold = Number(rule.split(":")[1]);

      if (!(rsiValue > threshold)) {
        return false;
      }
    }

    if (rule.startsWith("RSI_BELOW:")) {
      const threshold = Number(rule.split(":")[1]);

      if (!(rsiValue < threshold)) {
        return false;
      }
    }

    if (
      rule === "MACD_BULLISH" &&
      !(macdValue > 0)
    ) {
      return false;
    }

    if (
      rule === "MACD_BEARISH" &&
      !(macdValue < 0)
    ) {
      return false;
    }
  }

  return true;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "STRATEGY_BACKTEST",
    example:
      "POST { prompt: 'Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R' }",
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "TWELVE_DATA_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const prompt = String(
      body.prompt ||
      "Buy BTC when price is above EMA20 and EMA50, RSI above 55, risk 1%, target 2R"
    );

    const strategy = parseStrategy(prompt);

    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", "BTC/USD");
    url.searchParams.set("interval", strategy.timeframe);
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const result = await response.json();

    if (
      !response.ok ||
      result.status === "error" ||
      !Array.isArray(result.values)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.message ||
            "Backtest market data request failed",
        },
        { status: 502 }
      );
    }

    const candles: Candle[] = result.values
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

    const closes = candles.map((c) => c[4]);

    const initialBalance = 10000;
    let balance = initialBalance;

    let position: Position | null = null;

    const trades: Trade[] = [];

    for (let i = 50; i < candles.length; i++) {
      const candle = candles[i];

      const high = candle[2];
      const low = candle[3];
      const close = candle[4];

      const ema20Value = ema(closes, 20, i);
      const ema50Value = ema(closes, 50, i);
      const rsiValue = rsi(closes, 14, i);

      if (
        ema20Value == null ||
        ema50Value == null ||
        rsiValue == null
      ) {
        continue;
      }

      // Approximation of MACD using EMA12 - EMA26.
      const ema12Value = ema(closes, 12, i);
      const ema26Value = ema(closes, 26, i);

      const macdValue =
        ema12Value != null && ema26Value != null
          ? ema12Value - ema26Value
          : 0;

      if (position) {
        let exit: number | null = null;
        let resultType: "WIN" | "LOSS" | null = null;

        if (position.side === "LONG") {
          if (low <= position.stopLoss) {
            exit = position.stopLoss;
            resultType = "LOSS";
          } else if (high >= position.takeProfit) {
            exit = position.takeProfit;
            resultType = "WIN";
          }
        } else {
          if (high >= position.stopLoss) {
            exit = position.stopLoss;
            resultType = "LOSS";
          } else if (low <= position.takeProfit) {
            exit = position.takeProfit;
            resultType = "WIN";
          }
        }

        if (
          exit !== null &&
          resultType !== null
        ) {
          const pnlPercent =
            position.side === "LONG"
              ? (exit - position.entry) /
                position.entry
              : (position.entry - exit) /
                position.entry;

          const pnl = balance * pnlPercent;

          balance += pnl;

          trades.push({
            side: position.side,
            entryTime: position.entryTime,
            exitTime: candle[0],
            entry: position.entry,
            exit,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            pnl: Number(pnl.toFixed(2)),
            result: resultType,
          });

          position = null;
        }

        continue;
      }

      const longSignal = rulesPass(
        strategy,
        "LONG",
        close,
        ema20Value,
        ema50Value,
        rsiValue,
        macdValue
      );

      const shortSignal = rulesPass(
        strategy,
        "SHORT",
        close,
        ema20Value,
        ema50Value,
        rsiValue,
        macdValue
      );

      const side =
        longSignal && !shortSignal
          ? "LONG"
          : shortSignal && !longSignal
            ? "SHORT"
            : null;

      if (!side) continue;

      const risk =
        close * strategy.riskPercent;

      position = {
        side,
        entry: close,
        stopLoss:
          side === "LONG"
            ? close - risk
            : close + risk,
        takeProfit:
          side === "LONG"
            ? close + risk * strategy.rewardRisk
            : close - risk * strategy.rewardRisk,
        entryTime: candle[0],
      };
    }

    const wins = trades.filter(
      (trade) => trade.result === "WIN"
    ).length;

    const losses = trades.filter(
      (trade) => trade.result === "LOSS"
    ).length;

    const grossProfit = trades
      .filter((trade) => trade.pnl > 0)
      .reduce(
        (sum, trade) => sum + trade.pnl,
        0
      );

    const grossLoss = Math.abs(
      trades
        .filter((trade) => trade.pnl < 0)
        .reduce(
          (sum, trade) => sum + trade.pnl,
          0
        )
    );

    let equity = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      peak = Math.max(peak, equity);

      if (peak > 0) {
        maxDrawdown = Math.max(
          maxDrawdown,
          ((peak - equity) / peak) * 100
        );
      }
    }

    const winRate =
      trades.length > 0
        ? (wins / trades.length) * 100
        : 0;

    const profitFactor =
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
          ? Infinity
          : 0;

    return NextResponse.json({
      success: true,
      mode: "REAL_STRATEGY_BACKTEST",
      symbol: "BTC/USD",
      strategy: {
        prompt,
        timeframe: strategy.timeframe,
        riskPercent: strategy.riskPercent * 100,
        rewardRisk: strategy.rewardRisk,
        allowedSides: strategy.allowedSides,
        entryRules: strategy.entryRules,
      },
      candles: candles.length,
      initialBalance,
      finalBalance: Number(balance.toFixed(2)),
      returnPercent: Number(
        (((balance - initialBalance) /
          initialBalance) *
          100).toFixed(2)
      ),
      trades: trades.length,
      wins,
      losses,
      winRate: Number(winRate.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      profitFactor:
        profitFactor === Infinity
          ? "INF"
          : Number(profitFactor.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      tradeHistory: trades,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Strategy backtest failed",
      },
      { status: 500 }
    );
  }
}
