import { NextResponse } from "next/server";

type Candle = [
  number,
  number,
  number,
  number,
  number,
  number
];

type Trade = {
  side: "LONG" | "SHORT";
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

function rsi(values: number[], period: number, index: number) {
  if (index < period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = index - period + 1; i <= index; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  if (losses === 0) return 100;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export async function POST() {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", "BTC/USD");
    url.searchParams.set("interval", "1h");
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
          error:
            result.message ||
            "Crypto backtest data request failed",
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

    let balance = 10000;
    const initialBalance = balance;

    let position:
      | {
          side: "LONG" | "SHORT";
          entry: number;
          stopLoss: number;
          takeProfit: number;
          entryTime: number;
        }
      | null = null;

    const trades: Trade[] = [];

    for (let i = 50; i < candles.length; i++) {
      const candle = candles[i];
      const high = candle[2];
      const low = candle[3];
      const close = candle[4];

      const sma20 = sma(closes, 20, i);
      const sma50 = sma(closes, 50, i);
      const currentRsi = rsi(closes, 14, i);

      if (sma20 == null || sma50 == null || currentRsi == null) {
        continue;
      }

      // Manage open trade first.
      if (position) {
        let exit: number | null = null;
        let result: "WIN" | "LOSS" | null = null;

        if (position.side === "LONG") {
          if (low <= position.stopLoss) {
            exit = position.stopLoss;
            result = "LOSS";
          } else if (high >= position.takeProfit) {
            exit = position.takeProfit;
            result = "WIN";
          }
        } else {
          if (high >= position.stopLoss) {
            exit = position.stopLoss;
            result = "LOSS";
          } else if (low <= position.takeProfit) {
            exit = position.takeProfit;
            result = "WIN";
          }
        }

        if (exit !== null && result !== null) {
          const pnlPercent =
            position.side === "LONG"
              ? (exit - position.entry) / position.entry
              : (position.entry - exit) / position.entry;

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
            result,
          });

          position = null;
        }

        continue;
      }

      // NEXORA-style technical setup.
      const bullish =
        close > sma20 &&
        sma20 > sma50 &&
        currentRsi >= 55;

      const bearish =
        close < sma20 &&
        sma20 < sma50 &&
        currentRsi <= 45;

      // Conservative fixed risk model.
      const riskPercent = 0.01;
      const rewardMultiple = 2;

      if (bullish) {
        const entry = close;
        const risk = entry * riskPercent;

        position = {
          side: "LONG",
          entry,
          stopLoss: entry - risk,
          takeProfit: entry + risk * rewardMultiple,
          entryTime: candle[0],
        };
      } else if (bearish) {
        const entry = close;
        const risk = entry * riskPercent;

        position = {
          side: "SHORT",
          entry,
          stopLoss: entry + risk,
          takeProfit: entry - risk * rewardMultiple,
          entryTime: candle[0],
        };
      }
    }

    const wins = trades.filter(
      (trade) => trade.result === "WIN"
    ).length;

    const losses = trades.filter(
      (trade) => trade.result === "LOSS"
    ).length;

    const grossProfit = trades
      .filter((trade) => trade.pnl > 0)
      .reduce((sum, trade) => sum + trade.pnl, 0);

    const grossLoss = Math.abs(
      trades
        .filter((trade) => trade.pnl < 0)
        .reduce((sum, trade) => sum + trade.pnl, 0)
    );

    let equity = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      peak = Math.max(peak, equity);

      const drawdown =
        peak === 0 ? 0 : ((peak - equity) / peak) * 100;

      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    const returnPercent =
      ((balance - initialBalance) /
        initialBalance) *
      100;

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
      symbol: "BTC/USD",
      timeframe: "1h",
      candles: candles.length,
      initialBalance,
      finalBalance: Number(balance.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
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
        error:
          error instanceof Error
            ? error.message
            : "Backtest failed",
      },
      { status: 500 }
    );
  }
}
