import { NextResponse } from "next/server";

type Signal = {
  symbol: string;
  verdict: "LONG" | "SHORT" | "WAIT";
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  timestamp: string;
};

let lastSignal: Signal | null = null;

export async function GET() {
  return NextResponse.json({
    success: true,
    signal: lastSignal,
  });
}

export async function POST(request: Request) {
  try {
    const signal = (await request.json()) as Signal;

    const changed =
      !lastSignal ||
      lastSignal.symbol !== signal.symbol ||
      lastSignal.verdict !== signal.verdict ||
      lastSignal.entry !== signal.entry;

    lastSignal = signal;

    return NextResponse.json({
      success: true,
      changed,
      signal: lastSignal,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid signal payload" },
      { status: 400 }
    );
  }
}
