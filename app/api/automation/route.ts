import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedSymbol =
      searchParams.get("symbol") || "BTC/USD";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Supabase server credentials are missing" },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", requestedSymbol);

    const verdictResponse = await fetch(verdictUrl.toString(), {
      cache: "no-store",
    });

    const verdict = await verdictResponse.json();
    const setup = verdict.setup ?? {};

    if (!verdictResponse.ok || !verdict.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Four-lane verdict failed",
          details: verdict,
        },
        { status: 500 }
      );
    }

    const signal = {
      symbol: verdict.symbol,
      verdict: verdict.verdict,
      confidence: Number(verdict.confidence || 0),
      entry: verdict.levels?.entry ?? null,
      stop_loss: verdict.levels?.stopLoss ?? null,
      target1: verdict.levels?.target1 ?? null,
      target2: verdict.levels?.target2 ?? null,
      technical_verdict: verdict.lanes?.technical?.verdict ?? null,
      technical_confidence:
        verdict.lanes?.technical?.confidence ?? null,
      flow_verdict: verdict.lanes?.flow?.verdict ?? null,
      flow_confidence:
        verdict.lanes?.flow?.confidence ?? null,
      news_sentiment:
        verdict.lanes?.news?.sentiment ?? "NEUTRAL",
      news_score:
        verdict.lanes?.news?.score ?? 0,
      macro_bias:
        verdict.lanes?.macro?.bias ?? "NEUTRAL",
      macro_score:
        verdict.lanes?.macro?.score ?? 0,
      reasoning: verdict.reasoning ?? "",
      setup_quality: setup.quality ?? "C",
      risk_reward: setup.riskReward ?? null,
      confirmation_count: setup.confirmationCount ?? 0,
      telegram_sent: false,
    };

    const { data: previousSignals, error: previousError } =
      await supabase
        .from("signal_history")
        .select(
          "id,verdict,confidence,entry,stop_loss,target1,target2,telegram_sent,created_at"
        )
        .eq("symbol", signal.symbol)
        .order("created_at", { ascending: false })
        .limit(1);

    if (previousError) {
      return NextResponse.json(
        {
          success: false,
          error: previousError.message,
        },
        { status: 500 }
      );
    }

    const previous = previousSignals?.[0] ?? null;

    const riskReward = Number(setup.riskReward);

    const actionable =
      setup.tradeable === true &&
      setup.quality === "A" &&
      (signal.verdict === "LONG" || signal.verdict === "SHORT") &&
      Number.isFinite(Number(signal.entry)) &&
      Number.isFinite(Number(signal.stop_loss)) &&
      Number.isFinite(Number(signal.target1)) &&
      Number.isFinite(Number(signal.target2)) &&
      Number.isFinite(riskReward) &&
      riskReward >= 2 &&
      Number.isFinite(Number(setup.riskPerUnit)) &&
      Number(setup.riskPerUnit) > 0;

    const sameAsPrevious =
      Boolean(previous) &&
      previous.verdict === signal.verdict &&
      Number(previous.entry ?? 0) === Number(signal.entry ?? 0) &&
      Number(previous.stop_loss ?? 0) === Number(signal.stop_loss ?? 0) &&
      Number(previous.target1 ?? 0) === Number(signal.target1 ?? 0) &&
      Number(previous.target2 ?? 0) === Number(signal.target2 ?? 0);

    let telegramSent = false;

    if (actionable && !sameAsPrevious) {
      const telegramUrl = new URL("/api/telegram", baseUrl);

      const message = [
        "🚨 NEXORA AI — NEW SIGNAL",
        "",
        `Asset: ${signal.symbol}`,
        `Verdict: ${signal.verdict}`,
        `Confidence: ${signal.confidence}%`,
        `Setup Quality: ${setup.quality ?? "—"}`,
        `R:R: ${setup.riskReward ?? "—"}`,
        `Confirmations: ${setup.confirmationCount ?? 0}/4`,
        "",
        `Technical: ${signal.technical_verdict} (${signal.technical_confidence}%)`,
        `Flow: ${signal.flow_verdict} (${signal.flow_confidence}%)`,
        `News: ${signal.news_sentiment}`,
        `Macro: ${signal.macro_bias}`,
        "",
        `Entry: ${signal.entry ?? "—"}`,
        `Stop Loss: ${signal.stop_loss ?? "—"}`,
        `Target 1: ${signal.target1 ?? "—"}`,
        `Target 2: ${signal.target2 ?? "—"}`,
        "",
        `Reason: ${signal.reasoning || "—"}`,
        "",
        "Source: NEXORA AI",
      ].join("\n");

      const telegramResponse = await fetch(
        telegramUrl.toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      telegramSent = telegramResponse.ok;
      signal.telegram_sent = telegramSent;
    }

    if (sameAsPrevious) {
      return NextResponse.json({
        success: true,
        mode: "LIVE_FOUR_LANE_AUTOMATION",
        symbol: signal.symbol,
        verdict: signal.verdict,
        confidence: signal.confidence,
        actionable,
        duplicate: true,
        telegramSent: false,
        signalId: previous?.id ?? null,
        lanes: verdict.lanes,
        levels: verdict.levels,
        setup,
        timestamp: new Date().toISOString(),
      });
    }

    const { data: insertedSignal, error: insertError } =
      await supabase
        .from("signal_history")
        .insert(signal)
        .select()
        .single();

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "LIVE_FOUR_LANE_AUTOMATION",
      symbol: signal.symbol,
      verdict: signal.verdict,
      confidence: signal.confidence,
      actionable,
      duplicate: false,
      telegramSent,
      signalId: insertedSignal.id,
      lanes: verdict.lanes,
      levels: verdict.levels,
      setup,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation failed",
      },
      { status: 500 }
    );
  }
}
