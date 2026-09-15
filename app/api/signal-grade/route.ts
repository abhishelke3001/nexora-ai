import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_HOURS = 24;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const twelveKey = process.env.TWELVE_DATA_API_KEY;

    if (!supabaseUrl || !supabaseKey || !twelveKey) {
      return NextResponse.json(
        { success: false, error: "Required server credentials are missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cutoff = new Date(
      Date.now() - MAX_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: openSignals, error: signalError } = await supabase
      .from("signal_history")
      .select(
        "id,symbol,verdict,entry,stop_loss,target1,target2,created_at,outcome"
      )
      .in("verdict", ["LONG", "SHORT"])
      .is("outcome", null)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(50);

    if (signalError) {
      return NextResponse.json(
        { success: false, error: signalError.message },
        { status: 500 }
      );
    }

    if (!openSignals?.length) {
      return NextResponse.json({
        success: true,
        checked: 0,
        message: "No open signals to grade",
      });
    }

    const results = [];

    for (const signal of openSignals) {
      if (
        signal.entry == null ||
        signal.stop_loss == null ||
        signal.target1 == null
      ) {
        continue;
      }

      const created = new Date(signal.created_at).getTime();
      const start = new Date(created).toISOString();

      const url = new URL("https://api.twelvedata.com/time_series");
      url.searchParams.set("symbol", signal.symbol);
      url.searchParams.set("interval", "1h");
      url.searchParams.set("start_date", start);
      url.searchParams.set("outputsize", "30");
      url.searchParams.set("timezone", "UTC");
      url.searchParams.set("apikey", twelveKey);

      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      const data = await response.json();

      if (
        !response.ok ||
        data.status === "error" ||
        !Array.isArray(data.values)
      ) {
        continue;
      }

      const candles = data.values
        .slice()
        .reverse()
        .map((c: any) => ({
          time: new Date(c.datetime).getTime(),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));

      let outcome: "TP1" | "TP2" | "SL" | "EXPIRED" | null = null;
      let exitPrice: number | null = null;

      for (const candle of candles) {
        if (signal.verdict === "LONG") {
          if (candle.low <= Number(signal.stop_loss)) {
            outcome = "SL";
            exitPrice = Number(signal.stop_loss);
            break;
          }

          if (
            signal.target2 != null &&
            candle.high >= Number(signal.target2)
          ) {
            outcome = "TP2";
            exitPrice = Number(signal.target2);
            break;
          }

          if (candle.high >= Number(signal.target1)) {
            outcome = "TP1";
            exitPrice = Number(signal.target1);
            break;
          }
        }

        if (signal.verdict === "SHORT") {
          if (candle.high >= Number(signal.stop_loss)) {
            outcome = "SL";
            exitPrice = Number(signal.stop_loss);
            break;
          }

          if (
            signal.target2 != null &&
            candle.low <= Number(signal.target2)
          ) {
            outcome = "TP2";
            exitPrice = Number(signal.target2);
            break;
          }

          if (candle.low <= Number(signal.target1)) {
            outcome = "TP1";
            exitPrice = Number(signal.target1);
            break;
          }
        }
      }

      if (!outcome && candles.length >= 24) {
        outcome = "EXPIRED";
        exitPrice = candles[candles.length - 1]?.close ?? null;
      }

      if (!outcome || exitPrice == null) {
        results.push({
          id: signal.id,
          outcome: "OPEN",
        });
        continue;
      }

      const entry = Number(signal.entry);
      const pnlPercent =
        signal.verdict === "LONG"
          ? ((exitPrice - entry) / entry) * 100
          : ((entry - exitPrice) / entry) * 100;

      const { error: updateError } = await supabase
        .from("signal_history")
        .update({
          outcome,
          exit_price: exitPrice,
          closed_at: new Date().toISOString(),
          pnl_percent: Number(pnlPercent.toFixed(4)),
        })
        .eq("id", signal.id);

      results.push({
        id: signal.id,
        outcome,
        exitPrice,
        pnlPercent: Number(pnlPercent.toFixed(4)),
        updateError: updateError?.message ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      checked: openSignals.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Signal grading failed",
      },
      { status: 500 }
    );
  }
}
