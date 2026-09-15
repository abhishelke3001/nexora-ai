import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC/USD";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const technicalUrl = new URL("/api/analyze", baseUrl);
    technicalUrl.searchParams.set("symbol", symbol);
    technicalUrl.searchParams.set("mode", "Technical");

    const flowUrl = new URL("/api/flow", baseUrl);
    flowUrl.searchParams.set("symbol", symbol);

    const [technicalResponse, flowResponse] = await Promise.all([
      fetch(technicalUrl.toString(), {
        method: "POST",
        cache: "no-store",
      }),
      fetch(flowUrl.toString(), {
        cache: "no-store",
      }),
    ]);

    const technical = await technicalResponse.json();
    const flow = await flowResponse.json();

    if (!technicalResponse.ok || !flowResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to build unified verdict",
          technical,
          flow,
        },
        { status: 500 }
      );
    }

    const technicalVerdict = technical.ai?.verdict || "WAIT";
    const flowVerdict = flow.verdict || "WAIT";

    let verdict: "LONG" | "SHORT" | "WAIT" = "WAIT";

    if (
      technicalVerdict === "LONG" &&
      flowVerdict === "LONG"
    ) {
      verdict = "LONG";
    }

    if (
      technicalVerdict === "SHORT" &&
      flowVerdict === "SHORT"
    ) {
      verdict = "SHORT";
    }

    const technicalConfidence = Number(
      technical.ai?.confidence || 0
    );
    const flowConfidence = Number(flow.confidence || 0);

    const confidence = Math.round(
      technicalConfidence * 0.6 +
      flowConfidence * 0.4
    );

    return NextResponse.json({
      success: true,
      mode: "LIVE_UNIFIED_VERDICT",
      symbol,
      verdict,
      confidence,
      lanes: {
        technical: {
          verdict: technicalVerdict,
          confidence: technicalConfidence,
        },
        flow: {
          verdict: flowVerdict,
          confidence: flowConfidence,
        },
      },
      levels: {
        entry: technical.ai?.entry ?? null,
        stopLoss: technical.ai?.stopLoss ?? null,
        target1: technical.ai?.target1 ?? null,
        target2: technical.ai?.target2 ?? null,
      },
      reasoning: technical.ai?.reasoning || "",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Verdict engine failed",
      },
      { status: 500 }
    );
  }
}
