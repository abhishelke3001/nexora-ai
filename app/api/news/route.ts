import { NextResponse } from "next/server";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function sentimentFor(text: string) {
  const bullish = [
    "surge",
    "rally",
    "bullish",
    "gain",
    "gains",
    "rise",
    "rises",
    "record",
    "approval",
    "adoption",
    "breakout",
    "inflow",
    "positive",
  ];

  const bearish = [
    "crash",
    "drop",
    "drops",
    "bearish",
    "loss",
    "losses",
    "fall",
    "falls",
    "hack",
    "lawsuit",
    "outflow",
    "liquidation",
    "negative",
    "ban",
  ];

  const normalized = text.toLowerCase();

  const bullScore = bullish.reduce(
    (sum, word) => sum + (normalized.includes(word) ? 1 : 0),
    0
  );

  const bearScore = bearish.reduce(
    (sum, word) => sum + (normalized.includes(word) ? 1 : 0),
    0
  );

  if (bullScore > bearScore) return 1;
  if (bearScore > bullScore) return -1;
  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC/USD";
  const asset = symbol.split("/")[0];

  try {
    const query =
      asset === "BTC"
        ? "Bitcoin crypto"
        : asset === "ETH"
          ? "Ethereum crypto"
          : `${asset} crypto`;

    const rssUrl = new URL(
      "https://news.google.com/rss/search"
    );

    rssUrl.searchParams.set("q", query);
    rssUrl.searchParams.set("hl", "en-US");
    rssUrl.searchParams.set("gl", "US");
    rssUrl.searchParams.set("ceid", "US:en");

    const response = await fetch(rssUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Live news feed unavailable",
        },
        { status: 502 }
      );
    }

    const xml = await response.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 8)
      .map((match) => {
        const item = match[1];

        const title =
          decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");

        const link =
          item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";

        const pubDate =
          item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";

        const score = sentimentFor(title);

        return {
          title,
          link,
          datetime: pubDate,
          sentiment:
            score > 0 ? "BULLISH" : score < 0 ? "BEARISH" : "NEUTRAL",
        };
      });

    const totalScore = items.reduce((sum, item) => {
      if (item.sentiment === "BULLISH") return sum + 1;
      if (item.sentiment === "BEARISH") return sum - 1;
      return sum;
    }, 0);

    const sentiment =
      totalScore > 0
        ? "BULLISH"
        : totalScore < 0
          ? "BEARISH"
          : "NEUTRAL";

    return NextResponse.json({
      success: true,
      mode: "LIVE_NEWS",
      symbol,
      asset,
      sentiment,
      score: totalScore,
      headlineCount: items.length,
      headlines: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "News lane failed",
      },
      { status: 500 }
    );
  }
}
