import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC/USD";

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Twelve Data API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://api.twelvedata.com/press_releases");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("outputsize", "5");
    url.searchParams.set("language", "en,en-US");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      return NextResponse.json(
        {
          success: false,
          error: data.message || "News request failed",
        },
        { status: 502 }
      );
    }

    const releases = Array.isArray(data.press_releases)
      ? data.press_releases
      : [];

    return NextResponse.json({
      success: true,
      mode: "LIVE_NEWS",
      symbol,
      sentiment: "NEUTRAL",
      score: 0,
      headlineCount: releases.length,
      headlines: releases.map((item: {
        id?: string;
        datetime?: string;
        title?: string;
        body?: string;
      }) => ({
        id: item.id ?? null,
        datetime: item.datetime ?? null,
        title: item.title ?? "",
        body: item.body ?? "",
      })),
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
