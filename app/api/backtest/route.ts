import { NextResponse } from "next/server";

export async function POST() {
  try {
    
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) throw new Error("TWELVE_DATA_API_KEY is not configured.");
    const response = await fetch(
      `https://api.twelvedata.com/time_series?symbol=BTC%2FUSD&interval=1h&outputsize=500&timezone=UTC&apikey=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" }
    );
    const result = await response.json();
    if (!response.ok || result.status === "error" || !Array.isArray(result.values)) {
      throw new Error(result.message || "Crypto backtest data request failed.");
    }
    const candles = result.values.slice().reverse().map((c: any) => [
      new Date(c.datetime).getTime(),
      Number(c.open),
      Number(c.high),
      Number(c.low),
      Number(c.close),
      Number(c.volume || 0),
    ]);
    const closes = candles.map((c: number[]) => Number(c[4]));

    const sma = (values: number[], period: number, index: number) => {
      let total = 0;
      for (let i = index - period + 1; i <= index; i++) total += values[i];
      return total / period;
    };

    let balance = 10000;
    let position = false;
    let entry = 0;
    let wins = 0;
    let losses = 0;
    let trades = 0;

    for (let i = 50; i < closes.length; i++) {
      const price = closes[i];
      const sma20 = sma(closes, 20, i);
      const sma50 = sma(closes, 50, i);

      if (!position && price > sma20 && sma20 > sma50) {
        position = true;
        entry = price;
        trades++;
      }

      if (position && price < sma20) {
        const pnl = ((price - entry) / entry) * balance;
        balance += pnl;
        pnl >= 0 ? wins++ : losses++;
        position = false;
      }
    }

    if (position) {
      const price = closes[closes.length - 1];
      const pnl = ((price - entry) / entry) * balance;
      balance += pnl;
      pnl >= 0 ? wins++ : losses++;
    }

    const completedTrades = wins + losses;
    const returnPercent = ((balance - 10000) / 10000) * 100;
    const winRate = completedTrades
      ? (wins / completedTrades) * 100
      : 0;

    return NextResponse.json({
      symbol: "BTC/USD",
      timeframe: "1h",
      candles: candles.length,
      initialBalance: 10000,
      finalBalance: Number(balance.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
      trades,
      wins,
      losses,
      winRate: Number(winRate.toFixed(2)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Backtest failed" },
      { status: 500 }
    );
  }
}
