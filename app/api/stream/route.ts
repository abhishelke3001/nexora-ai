import { NextResponse } from "next/server";
import WebSocket from "ws";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TWELVE_DATA_API_KEY is missing" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket(
        `wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(apiKey)}`
      );

      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            action: "subscribe",
            params: {
              symbols: "BTC/USD,ETH/USD,SOL/USD,BNB/USD,XRP/USD,XAU/USD,XAG/USD,WTI/USD,EUR/USD,GBP/USD,USD/JPY,USD/CHF,AUD/USD,USD/CAD,NZD/USD",
            },
          })
        );
      });

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.event === "price") {
            send({
              symbol: data.symbol,
              price: Number(data.price),
              timestamp: Number(data.timestamp),
            });
          }
        } catch {}
      });

      ws.on("error", () => {
        try {
          send({ error: "Twelve Data WebSocket connection failed" });
          controller.close();
        } catch {}
      });

      ws.on("close", () => {
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
