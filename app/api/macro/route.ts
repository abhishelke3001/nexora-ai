import { NextResponse } from "next/server";

const SERIES = {
  fedFunds: "DFF",
  inflation: "CPIAUCSL",
  unemployment: "UNRATE",
};

async function fredLatest(series: string) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`;

  const response = await fetch(url, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`FRED request failed for ${series}`);
  }

  const csv = await response.text();
  const rows = csv.trim().split("\n");

  for (let i = rows.length - 1; i >= 1; i--) {
    const parts = rows[i].split(",");

    if (parts.length >= 2 && parts[1] !== ".") {
      return {
        date: parts[0],
        value: Number(parts[1]),
      };
    }
  }

  return null;
}

export async function GET() {
  try {
    const [fedFunds, inflation, unemployment] =
      await Promise.all([
        fredLatest(SERIES.fedFunds),
        fredLatest(SERIES.inflation),
        fredLatest(SERIES.unemployment),
      ]);

    let score = 0;

    if (fedFunds && fedFunds.value >= 4) score -= 1;
    if (fedFunds && fedFunds.value < 3) score += 1;

    return NextResponse.json({
      success: true,
      mode: "LIVE_MACRO",
      bias:
        score > 0
          ? "BULLISH"
          : score < 0
            ? "BEARISH"
            : "NEUTRAL",
      score,
      indicators: {
        federalFundsRate: fedFunds,
        cpiIndex: inflation,
        unemploymentRate: unemployment,
      },
      sources: {
        federalFunds: "FRED / Federal Reserve",
        cpi: "FRED / U.S. Bureau of Labor Statistics",
        unemployment: "FRED / U.S. Bureau of Labor Statistics",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Macro lane failed",
      },
      { status: 500 }
    );
  }
}
