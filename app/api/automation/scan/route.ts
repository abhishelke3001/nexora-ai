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

// One symbol per scheduled run keeps Twelve Data usage and potential OpenAI
// calls below the current free-tier daily limits while still rotating through
// every supported symbol continuously.
const BATCH_SIZE = 1;
const SCAN_INTERVAL_MINUTES = 30;
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
  screened?: boolean;
  aiCalled?: boolean;
};

type TechnicalData = {
  price?: number;
  rsi?: number;
  ema20?: number;
  ema50?: number;
  macd?: {
    histogram?: number;
  };
};

function isStrongTechnicalCandidate(data: TechnicalData) {
  const price = Number(data.price);
  const rsi = Number(data.rsi);
  const ema20 = Number(data.ema20);
  const ema50 = Number(data.ema50);
  const histogram = Number(data.macd?.histogram);

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(rsi) ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(histogram)
  ) {
    return false;
  }

  const longCandidate =
    price > ema20 &&
    ema20 >= ema50 &&
    histogram > 0 &&
    rsi >= 52 &&
    rsi <= 72;

  const shortCandidate =
    price < ema20 &&
    ema20 <= ema50 &&
    histogram < 0 &&
    rsi >= 28 &&
    rsi <= 48;

  return longCandidate || shortCandidate;
}

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      data: {
        error:
          error instanceof Error
            ? error.name === "AbortError"
              ? "Request timed out"
              : error.message
            : "Request failed",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function scanOne(origin: string, symbol: string): Promise<Result> {
  try {
    // Cheap technical pre-screen.
    const technicalUrl = new URL(
      "/api/technical",
      origin
    );

    technicalUrl.searchParams.set("symbol", symbol);

    const technical = await fetchJson(technicalUrl.toString());

    if (!technical.ok) {
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
          technical.data?.error ||
          "Technical screening failed",
        screened: false,
        aiCalled: false,
      };
    }

    const candidate = isStrongTechnicalCandidate(
      technical.data as TechnicalData
    );

    // Weak setup: stop here and do not consume an OpenAI request.
    if (!candidate) {
      return {
        symbol,
        success: true,
        verdict: "WAIT",
        confidence: 50,
        actionable: false,
        duplicate: false,
        telegramSent: false,
        signalId: null,
        error: null,
        screened: true,
        aiCalled: false,
      };
    }

    // Strong technical candidate: allow the full AI/four-lane pipeline.
    const automationUrl = new URL(
      "/api/automation",
      origin
    );

    automationUrl.searchParams.set("symbol", symbol);

    const automation = await fetchJson(
      automationUrl.toString()
    );

    return {
      symbol,
      success:
        automation.ok &&
        automation.data?.success === true,
      verdict: automation.data?.verdict ?? null,
      confidence: automation.data?.confidence ?? null,
      actionable: automation.data?.actionable === true,
      duplicate: automation.data?.duplicate === true,
      telegramSent: automation.data?.telegramSent === true,
      signalId: automation.data?.signalId ?? null,
      error: automation.data?.error ?? null,
      screened: true,
      aiCalled: true,
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
          ? error.message
          : "Scan failed",
      screened: false,
      aiCalled: false,
    };
  }
}

export async function GET(request: Request) {
  const started = Date.now();

  try {
    const requestUrl = new URL(request.url);

    const isLocalRequest =
      requestUrl.hostname === "localhost" ||
      requestUrl.hostname === "127.0.0.1";

    const expectedSecret =
      process.env.NEXORA_CRON_SECRET?.trim();

    const providedSecret =
      request.headers
        .get("authorization")
        ?.replace(/^Bearer\s+/i, "")
        .trim() ||
      requestUrl.searchParams.get("secret")?.trim();

    if (
      !isLocalRequest &&
      (!expectedSecret ||
        providedSecret !== expectedSecret)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const origin = requestUrl.origin;

    const slot = Math.floor(
      Date.now() /
        (SCAN_INTERVAL_MINUTES * 60 * 1000)
    );

    const batchStart =
      (slot % symbols.length) * BATCH_SIZE;

    const batch = symbols.slice(
      batchStart,
      batchStart + BATCH_SIZE
    );

    const results = await Promise.all(
      batch.map((symbol) =>
        scanOne(origin, symbol)
      )
    );

    const actionable = results.filter(
      (result) => result.actionable
    );

    const aiCalls = results.filter(
      (result) => result.aiCalled
    ).length;

    return NextResponse.json({
      success: true,
      scanned: results.length,
      batch,
      batchStart,
      totalSupported: symbols.length,
      unsupported: unsupportedSymbols,
      actionableCount: actionable.length,
      actionable,
      aiCalls,
      screenedCount: results.filter(
        (result) => result.screened
      ).length,
      results,
      durationMs: Date.now() - started,
      batchSize: BATCH_SIZE,
      cycleMinutes:
        Math.ceil(symbols.length / BATCH_SIZE) *
        SCAN_INTERVAL_MINUTES,
      scanIntervalMinutes: SCAN_INTERVAL_MINUTES,
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
