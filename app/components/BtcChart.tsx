"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
} from "lightweight-charts";

type Props = {
  symbol?: string;
  timeframe?: string;
};

const timeframeMap: Record<string, string> = {
  "15M": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
};

export default function BtcChart({
  symbol = "BTC/USD",
  timeframe = "1H",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#070b12",
        },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: {
          color: "rgba(255,255,255,0.05)",
        },
        horzLines: {
          color: "rgba(255,255,255,0.05)",
        },
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.2)",
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    let cancelled = false;

    async function loadCandles() {
      try {
        const apiTimeframe = timeframeMap[timeframe] || "1h";

        const response = await fetch(
          `/api/candles?symbol=${encodeURIComponent(
            symbol
          )}&timeframe=${apiTimeframe}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (cancelled) return;

        if (!Array.isArray(result.candles) || result.candles.length === 0) {
          throw new Error("No candle data returned");
        }

        const candles = result.candles.map(
          (c: {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
          }) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })
        );

        candleSeries.setData(candles);
        chart.timeScale().fitContent();
      } catch (error) {
        console.error("Failed to load candles:", error);
      }
    }

    loadCandles();

    const interval = setInterval(loadCandles, 10000);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;

      chart.applyOptions({
        width: container.clientWidth,
      });
    });

    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      clearInterval(interval);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol, timeframe]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full overflow-hidden rounded-xl"
    />
  );
}
