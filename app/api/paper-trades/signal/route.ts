import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are missing");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedSymbol =
      typeof body.symbol === "string" && body.symbol.trim()
        ? body.symbol.trim().toUpperCase()
        : "BTC/USD";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://nexora-ai-two-delta.vercel.app";

    const verdictUrl = new URL("/api/verdict", baseUrl);
    verdictUrl.searchParams.set("symbol", requestedSymbol);

    const response = await fetch(verdictUrl.toString(), {
      cache: "no-store",
    });

    const verdict = await response.json();

    if (!response.ok || !verdict.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to generate NEXORA signal",
          verdict,
        },
        { status: 500 }
      );
    }

    if (
      verdict.verdict !== "LONG" &&
      verdict.verdict !== "SHORT"
    ) {
      return NextResponse.json({
        success: true,
        opened: false,
        reason: "NEXORA returned WAIT",
        verdict,
      });
    }

    const entry = Number(verdict.levels?.entry);
    const stopLoss = Number(verdict.levels?.stopLoss);
    const target = Number(
      verdict.levels?.target1 ?? verdict.levels?.target2
    );

    if (
      !Number.isFinite(entry) ||
      !Number.isFinite(stopLoss) ||
      !Number.isFinite(target)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Signal does not contain complete trade levels",
        },
        { status: 422 }
      );
    }

    const supabase = db();

    const { data: existing, error: existingError } =
      await supabase
        .from("paper_positions")
        .select("id")
        .eq("symbol", verdict.symbol)
        .eq("status", "OPEN")
        .limit(1);

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.length) {
      return NextResponse.json({
        success: true,
        opened: false,
        reason: "An open paper position already exists",
        verdict,
      });
    }

    const { data: position, error } = await supabase
      .from("paper_positions")
      .insert({
        symbol: verdict.symbol,
        side: verdict.verdict,
        status: "OPEN",
        entry_price: entry,
        current_price: entry,
        stop_loss: stopLoss,
        take_profit: target,
        quantity: 0.001,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      opened: true,
      source: "NEXORA FOUR-LANE VERDICT",
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      position,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Paper signal execution failed",
      },
      { status: 500 }
    );
  }
}
