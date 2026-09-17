"use client";

import { useEffect, useRef } from "react";

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
  signal,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candlesRef = useRef<Candle[]>([]);
  const priceLinesRef = useRef<
    ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[]
  >([]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let stream: EventSource | null = null;
    let chart: IChartApi | null = null;
    let candleSeries: ISeriesApi<"Candlestick"> | null = null;

    const setupChart = () => {
      if (cancelled || chart || !container) {
        return;
      }

      const width = Math.max(container.clientWidth || 0, 320);

      chart = createChart(container, {
        width,
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

      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      seriesRef.current = candleSeries;

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry || !chart || cancelled) {
          return;
        }

        const width = Math.floor(entry.contentRect.width);

        if (width > 0) {
          chart.applyOptions({
            width,
          });
        }
      });

      resizeObserver.observe(container);

      return {
        chart,
        candleSeries,
      };
    };

    const loadCandles = async () => {
      const result = setupChart();

      if (!result || cancelled) {
        return;
      }

      const { chart: activeChart, candleSeries: activeSeries } = result;

      try {
        const apiTimeframe = timeframeMap[timeframe] ?? "1h";

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

        const data: unknown = await response.json();

        if (cancelled) {
          return;
        }

        if (
          !data ||
          typeof data !== "object" ||
          !("candles" in data)
        ) {
          throw new Error("Invalid candle response");
        }

        const rawCandles = (data as {
          candles?: unknown;
        }).candles;

        if (!Array.isArray(rawCandles) || rawCandles.length === 0) {
          throw new Error("No candle data returned");
        }

        const candles: Candle[] = rawCandles
          .map((item): Candle | null => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const candle = item as Record<string, unknown>;

            const time = Number(candle.time);
            const open = Number(candle.open);
            const high = Number(candle.high);
            const low = Number(candle.low);
            const close = Number(candle.close);

            if (
              !Number.isFinite(time) ||
              !Number.isFinite(open) ||
              !Number.isFinite(high) ||
              !Number.isFinite(low) ||
              !Number.isFinite(close)
            ) {
              return null;
            }

            return {
              time: time as Time,
              open,
              high,
              low,
              close,
            };
          })
          .filter((candle): candle is Candle => candle !== null)
          .sort(
            (a, b) =>
              Number(a.time) - Number(b.time)
          );

        if (candles.length === 0) {
          throw new Error("No valid candles returned");
        }

        candlesRef.current = candles;

        activeSeries.setData(candles);
        activeChart.timeScale().fitContent();

        for (const line of priceLinesRef.current) {
          try {
            activeSeries.removePriceLine(line);
          } catch {
            // Ignore already removed lines.
          }
        }

        priceLinesRef.current = [];

        const hasTradeSetup =
          (signal?.verdict === "LONG" ||
            signal?.verdict === "SHORT") &&
          typeof signal.entry === "number" &&
          Number.isFinite(signal.entry) &&
          typeof signal.stopLoss === "number" &&
          Number.isFinite(signal.stopLoss) &&
          typeof signal.target1 === "number" &&
          Number.isFinite(signal.target1) &&
          typeof signal.target2 === "number" &&
          Number.isFinite(signal.target2);

        if (hasTradeSetup) {
          priceLinesRef.current = [
            activeSeries.createPriceLine({
              price: signal.entry!,
              color: "#60a5fa",
              lineWidth: 2,
              lineStyle: 0,
              axisLabelVisible: true,
              title: "ENTRY",
            }),

            activeSeries.createPriceLine({
              price: signal.stopLoss!,
              color: "#ef4444",
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: "SL",
            }),

            activeSeries.createPriceLine({
              price: signal.target1!,
              color: "#22c55e",
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: "TP1",
            }),

            activeSeries.createPriceLine({
              price: signal.target2!,
              color: "#16a34a",
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: "TP2",
            }),
          ];
        }

        stream = new EventSource("/api/stream");

        stream.onmessage = (event) => {
          if (cancelled) {
            return;
          }

          try {
            const tick = JSON.parse(event.data);

            if (
              !tick ||
              tick.symbol !== symbol ||
              typeof tick.price !== "number"
            ) {
              return;
            }

            const price = Number(tick.price);

            if (!Number.isFinite(price)) {
              return;
            }

            const candlesRefValue = candlesRef.current;

            if (candlesRefValue.length === 0) {
              return;
            }

            const now = Math.floor(
              Date.now() / 1000
            );

            const bucketSize =
              timeframeSeconds[timeframe] ?? 3600;

            const candleTime =
              Math.floor(now / bucketSize) *
              bucketSize;

            const last =
              candlesRefValue[
                candlesRefValue.length - 1
              ];

            if (!last) {
              return;
            }

            if (Number(last.time) === candleTime) {
              const updated: Candle = {
                time: last.time,
                open: last.open,
                high: Math.max(last.high, price),
                low: Math.min(last.low, price),
                close: price,
              };

              candlesRefValue[
                candlesRefValue.length - 1
              ] = updated;

              activeSeries.update(updated);
            } else if (
              candleTime > Number(last.time)
            ) {
              const newCandle: Candle = {
                time: candleTime as Time,
                open: last.close,
                high: price,
                low: price,
                close: price,
              };

              candlesRefValue.push(newCandle);
              activeSeries.update(newCandle);
            }
          } catch {
            // Ignore malformed stream messages.
          }
        };

        stream.onerror = () => {
          // EventSource automatically attempts reconnects.
        };
      } catch (error) {
        console.error(
          "Failed to load candles:",
          error
        );
      }
    };

    // Wait one frame so the container has measurable dimensions.
    const frame = window.requestAnimationFrame(() => {
      void loadCandles();
    });

    return () => {
      cancelled = true;

      window.cancelAnimationFrame(frame);

      if (stream) {
        stream.close();
        stream = null;
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      if (seriesRef.current) {
        for (const line of priceLinesRef.current) {
          try {
            seriesRef.current.removePriceLine(line);
          } catch {
            // Ignore cleanup errors.
          }
        }
      }

      priceLinesRef.current = [];
      candlesRef.current = [];

      if (chart) {
        try {
          chart.remove();
        } catch {
          // Ignore cleanup errors.
        }
      }

      chart = null;
      candleSeries = null;
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [
    symbol,
    timeframe,
    signal?.verdict,
    signal?.entry,
    signal?.stopLoss,
    signal?.target1,
    signal?.target2,
  ]);

  return (
    <div className="w-full min-w-0">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl"
        style={{
          minHeight: 500,
        }}
      />
    </div>
  );
}
