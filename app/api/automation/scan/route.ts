import { NextResponse } from "next/server";

const symbols = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
];

const unsupportedSymbols = ["XAG/USD", "WTI/USD"];

const BATCH_SIZE = 3;
const REQUEST_TIMEOUT_MS = 20000;

type Result = {
  symbol: string;
  success: boolean;
  verdict: string | null;
  confidence: number | null;
  actionable: boolean;
  duplicate: boolean;
  telegramSent: boolean;
  signalId: string | null;
  error: string | null;
};

async function scanOne(
  origin: string,
  symbol: string
): Promise<Result> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${origin}/api/automation?symbol=${encodeURIComponent(symbol)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const data = await response.json().catch(() => ({}));

    return {
      symbol,
      success: response.ok && data.success === true,
      verdict: data.verdict ?? null,
      confidence: data.confidence ?? null,
      actionable: data.actionable === true,
      duplicate: data.duplicate === true,
      telegramSent: data.telegramSent === true,
      signalId: data.signalId ?? null,
      error: data.error ?? null,
    };
  } catch (error) {
    return {
      symbol,
      success: false,
      verdict: null,
      confidence: null,
      actionable: false,
      duplicate: false,
      telegramSent: false,
      signalId: null,
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Scan timed out"
            : error.message
          : "Scan failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const started = Date.now();

  try {
    const origin = new URL(request.url).origin;

    /*
     * Rotate 3 instruments per minute.
     * 13 supported instruments therefore complete a full cycle
     * in 5 minutes while staying within the free Twelve Data limit.
     */
    const minute = Math.floor(Date.now() / 60000);

    const batchStart =
      (minute % Math.ceil(symbols.length / BATCH_SIZE)) *
      BATCH_SIZE;

    const batch = symbols.slice(
      batchStart,
      batchStart + BATCH_SIZE
    );

    const results = await Promise.all(
      batch.map((symbol) => scanOne(origin, symbol))
    );

    const unavailable: Result[] =
      batch.length === 0
        ? []
        : unsupportedSymbols
            .filter(() => false)
            .map((symbol) => ({
              symbol,
              success: true,
              verdict: "WAIT",
              confidence: 0,
              actionable: false,
              duplicate: false,
              telegramSent: false,
              signalId: null,
              error:
                "Market data unavailable on current Twelve Data plan",
            }));

    const allResults = [...results, ...unavailable];

    const actionable = allResults.filter(
      (result) => result.actionable
    );

    return NextResponse.json({
      success: true,
      scanned: allResults.length,
      batch,
      batchStart,
      totalSupported: symbols.length,
      unsupported: unsupportedSymbols,
      actionableCount: actionable.length,
      actionable,
      results: allResults,
      durationMs: Date.now() - started,
      batchSize: BATCH_SIZE,
      cycleMinutes: Math.ceil(
        symbols.length / BATCH_SIZE
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation scan failed",
      },
      { status: 500 }
    );
  }
}
