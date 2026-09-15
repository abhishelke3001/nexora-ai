import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD"];

function supabaseServer() {
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

async function getPrice(symbol: string) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || data.status === "error") {
    throw new Error(data.message || `Price unavailable for ${symbol}`);
  }

  return Number(data.close ?? data.last);
}

async function syncOpenPositions() {
  const supabase = supabaseServer();

  const { data: positions, error } = await supabase
    .from("paper_positions")
    .select("*")
    .eq("status", "OPEN")
    .order("opened_at", { ascending: true });

  if (error) throw new Error(error.message);

  const updated = [];

  for (const position of positions ?? []) {
    const price = await getPrice(position.symbol);

    const entry = Number(position.entry_price);

    const pnlPercent =
      position.side === "LONG"
        ? ((price - entry) / entry) * 100
        : ((entry - price) / entry) * 100;

    const pnl =
      position.quantity *
      (position.side === "LONG"
        ? price - entry
        : entry - price);

    let closeReason: string | null = null;

    if (position.side === "LONG") {
      if (position.stop_loss != null && price <= Number(position.stop_loss)) {
        closeReason = "SL";
      } else if (
        position.take_profit != null &&
        price >= Number(position.take_profit)
      ) {
        closeReason = "TP";
      }
    } else {
      if (position.stop_loss != null && price >= Number(position.stop_loss)) {
        closeReason = "SL";
      } else if (
        position.take_profit != null &&
        price <= Number(position.take_profit)
      ) {
        closeReason = "TP";
      }
    }

    if (closeReason) {
      const { data, error: closeError } = await supabase
        .from("paper_positions")
        .update({
          status: "CLOSED",
          current_price: price,
          close_price: price,
          close_reason: closeReason,
          pnl,
          pnl_percent: Number(pnlPercent.toFixed(4)),
          closed_at: new Date().toISOString(),
        })
        .eq("id", position.id)
        .select()
        .single();

      if (closeError) throw new Error(closeError.message);

      updated.push(data);
    } else {
      const { data, error: updateError } = await supabase
        .from("paper_positions")
        .update({
          current_price: price,
          pnl,
          pnl_percent: Number(pnlPercent.toFixed(4)),
        })
        .eq("id", position.id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      updated.push(data);
    }
  }

  return updated;
}

export async function GET() {
  try {
    const supabase = supabaseServer();

    await syncOpenPositions();

    const { data: open, error: openError } = await supabase
      .from("paper_positions")
      .select("*")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false });

    const { data: history, error: historyError } = await supabase
      .from("paper_positions")
      .select("*")
      .eq("status", "CLOSED")
      .order("closed_at", { ascending: false })
      .limit(100);

    if (openError) throw new Error(openError.message);
    if (historyError) throw new Error(historyError.message);

    const realizedPnl =
      (history ?? []).reduce(
        (sum, trade) => sum + Number(trade.pnl || 0),
        0
      );

    const unrealizedPnl =
      (open ?? []).reduce(
        (sum, trade) => sum + Number(trade.pnl || 0),
        0
      );

    return NextResponse.json({
      success: true,
      mode: "LIVE_PAPER_TRADING",
      balance: 10000 + realizedPnl + unrealizedPnl,
      realizedPnl,
      unrealizedPnl,
      openPositions: open ?? [],
      history: history ?? [],
      symbols: SYMBOLS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Paper trading request failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const symbol = String(body.symbol || "BTC/USD");
    const side =
      body.side === "SHORT" ? "SHORT" : "LONG";

    const entryPrice = Number(body.entryPrice);
    const stopLoss = Number(body.stopLoss);
    const takeProfit = Number(body.takeProfit);
    const quantity = Number(body.quantity || 0.001);

    if (
      !SYMBOLS.includes(symbol) ||
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(stopLoss) ||
      !Number.isFinite(takeProfit) ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid paper trade parameters",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    const { data: existing, error: existingError } =
      await supabase
        .from("paper_positions")
        .select("id")
        .eq("symbol", symbol)
        .eq("status", "OPEN")
        .limit(1);

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.length) {
      return NextResponse.json(
        {
          success: false,
          error: `An open ${symbol} paper position already exists`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("paper_positions")
      .insert({
        symbol,
        side,
        status: "OPEN",
        entry_price: entryPrice,
        current_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        quantity,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      mode: "LIVE_PAPER_TRADING",
      position: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to open paper trade",
      },
      { status: 500 }
    );
  }
}
