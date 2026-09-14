"use client";

import { useEffect, useRef } from "react";
import { createSeriesMarkers } from "lightweight-charts";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

type Props = {
  symbol?: string;
  timeframe?: string;
  signal?: {
    verdict?: string;
    entry?: number;
    stopLoss?: number;
    target1?: number;
    target2?: number;
  };
};

const timeframeMap: Record<string, string> = {
  "15M": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
};

const timeframeSeconds: Record<string, number> = {
  "15M": 15 * 60,
  "1H": 60 * 60,
  "4H": 4 * 60 * 60,
  "1D": 24 * 60 * 60,
};

type Candle = CandlestickData<Time>;

export default function BtcChart({
  symbol = "BTC/USD",
  timeframe = "1H",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const priceLinesRef = useRef<any[]>([]);

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

    chartRef.current = chart;
    seriesRef.current = candleSeries;

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

        const candles: Candle[] = result.candles.map(
          (c: {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
          }) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })
        );

        candlesRef.current = candles;

        candleSeries.setData(candles);
        chart.timeScale().fitContent();

        // NEXORA live signal levels
        // These are derived from the latest market price and ATR.
        const latest = candles[candles.length - 1];
        const entry = signal?.entry ?? latest.close;
        const range = Math.max(latest.high - latest.low, entry * 0.004);
        const isShort = signal?.verdict === "SHORT";

        const stopLoss =
          signal?.stopLoss ??
          (isShort ? entry + range * 1.5 : entry - range * 1.5);

        const target1 =
          signal?.target1 ??
          (isShort ? entry - range : entry + range);

        const target2 =
          signal?.target2 ??
          (isShort ? entry - range * 2 : entry + range * 2);

        for (const line of priceLinesRef.current) {
          try {
            candleSeries.removePriceLine(line);
          } catch {}
        }

        priceLinesRef.current = [
          candleSeries.createPriceLine({
            price: entry,
            color: "#60a5fa",
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: "ENTRY",
          }),
          candleSeries.createPriceLine({
            price: stopLoss,
            color: "#ef4444",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "SL",
          }),
          candleSeries.createPriceLine({
            price: target1,
            color: "#22c55e",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP1",
          }),
          candleSeries.createPriceLine({
            price: target2,
            color: "#16a34a",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP2",
          }),
        ];
      } catch (error) {
        console.error("Failed to load candles:", error);
      }
    }

    loadCandles();

    const source = new EventSource("/api/stream");

    source.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);

        if (
          cancelled ||
          tick.symbol !== symbol ||
          typeof tick.price !== "number"
        ) {
          return;
        }

        const price = tick.price;
        const now = Math.floor(Date.now() / 1000);
        const bucketSize = timeframeSeconds[timeframe] || 3600;
        const candleTime =
          Math.floor(now / bucketSize) * bucketSize;

        const candles = candlesRef.current;

        if (candles.length === 0) return;

        const last = candles[candles.length - 1];

        if (Number(last.time) === candleTime) {
          const updated: Candle = {
            time: last.time,
            open: last.open,
            high: Math.max(last.high, price),
            low: Math.min(last.low, price),
            close: price,
          };

          candles[candles.length - 1] = updated;
          candleSeries.update(updated);
        } else if (candleTime > Number(last.time)) {
          const newCandle: Candle = {
            time: candleTime as Time,
            open: last.close,
            high: price,
            low: price,
            close: price,
          };

          candles.push(newCandle);
          candleSeries.update(newCandle);
        }
      } catch {}
    };

    source.onerror = () => {
      console.warn("Live market stream disconnected");
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;

      chart.applyOptions({
        width: container.clientWidth,
      });
    });

    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      source.close();
      resizeObserver.disconnect();
      chart.remove();

      chartRef.current = null;
      seriesRef.current = null;
      candlesRef.current = [];
    };
  }, [symbol, timeframe]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full overflow-hidden rounded-xl"
    />
  );
}
