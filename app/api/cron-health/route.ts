import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.NEXORA_CRON_SECRET),
    status: "operational",
    scanner: {
      schedule: "5m",
      batchSize: 3,
      cycleMinutes: 5,
      supportedMarkets: 13,
      telegram: Boolean(
        process.env.TELEGRAM_BOT_TOKEN &&
        process.env.TELEGRAM_CHAT_ID
      ),
      twelveData: Boolean(process.env.TWELVE_DATA_API_KEY),
      openAI: Boolean(process.env.OPENAI_API_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
