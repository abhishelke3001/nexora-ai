import { NextResponse } from "next/server";
import ccxt from "ccxt";

export async function POST() {
  try {
    const exchange = new ccxt.binance();
    const candles = await exchange.fetchOHLCV("BTC/USDT", "1h", undefined, 500);
    const closes = candles.map((c) => Number(c[4]));

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
      symbol: "BTC/USDT",
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
