import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const symbols = [
  { symbol: "^NSEI", name: "NIFTY 50", type: "INDEX" },
  { symbol: "^BSESN", name: "SENSEX", type: "INDEX" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries", type: "STOCK" },
  { symbol: "TCS.NS", name: "TCS", type: "STOCK" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", type: "STOCK" },
  { symbol: "INFY.NS", name: "Infosys", type: "STOCK" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      symbols.map(async (item) => {
        const q = await yahooFinance.quote(item.symbol);

        return {
          symbol: item.symbol,
          name: item.name,
          type: item.type,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChangePercent ?? null,
          previousClose: q.regularMarketPreviousClose ?? null,
          marketState: q.marketState ?? null,
          source: "Yahoo Finance",
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Indian markets error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to fetch Indian market data" },
      { status: 500 }
    );
  }
}
