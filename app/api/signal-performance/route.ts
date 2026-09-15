import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: "Supabase server credentials are missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("signal_history")
      .select(
        "id,symbol,verdict,confidence,outcome,pnl_percent,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const signals = data ?? [];
    const actionable = signals.filter(
      (s) => s.verdict === "LONG" || s.verdict === "SHORT"
    );
    const closed = actionable.filter((s) => s.outcome);

    const wins = closed.filter(
      (s) => s.outcome === "TP1" || s.outcome === "TP2"
    ).length;

    const losses = closed.filter(
      (s) => s.outcome === "SL"
    ).length;

    const expired = closed.filter(
      (s) => s.outcome === "EXPIRED"
    ).length;

    const pnl = closed.reduce(
      (sum, s) => sum + Number(s.pnl_percent || 0),
      0
    );

    const winRate =
      closed.length > 0
        ? (wins / closed.length) * 100
        : 0;

    const averagePnl =
      closed.length > 0
        ? pnl / closed.length
        : 0;

    return NextResponse.json({
      success: true,
      totalSignals: signals.length,
      actionableSignals: actionable.length,
      openSignals: actionable.length - closed.length,
      closedSignals: closed.length,
      wins,
      losses,
      expired,
      winRate: Number(winRate.toFixed(2)),
      totalPnlPercent: Number(pnl.toFixed(2)),
      averagePnlPercent: Number(averagePnl.toFixed(2)),
      outcomes: {
        TP1: signals.filter((s) => s.outcome === "TP1").length,
        TP2: signals.filter((s) => s.outcome === "TP2").length,
        SL: signals.filter((s) => s.outcome === "SL").length,
        EXPIRED: expired,
      },
      recentSignals: signals.slice(0, 50),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Signal performance failed",
      },
      { status: 500 }
    );
  }
}
