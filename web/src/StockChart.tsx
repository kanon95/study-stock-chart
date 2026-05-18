import {
  createChart,
  CrosshairMode,
  type CandlestickData,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export type ChartStatus = { text: string; error: boolean };

type ApiOk = { symbol?: string; candles: CandlestickData<Time>[] };
type ApiErr = { error: string };
type ApiPayload = ApiOk | ApiErr;

type Props = {
  symbol: string;
  onStatusChange: (s: ChartStatus) => void;
};

function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function StockChart({ symbol, onStatusChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart: IChartApi | null = null;
    let ro: ResizeObserver | null = null;
    const ac = new AbortController();

    const run = async () => {
      onStatusChange({ text: "불러오는 중…", error: false });
      try {
        const q = new URLSearchParams({ symbol });
        const res = await fetch(`/api/daily-chart?${q}`, {
          signal: ac.signal,
        });
        const payload = (await res.json()) as ApiPayload;

        if (disposed) return;

        if (!res.ok || "error" in payload) {
          onStatusChange({
            text: "error" in payload ? payload.error : `요청 실패 (${res.status})`,
            error: true,
          });
          return;
        }

        const { candles } = payload;
        if (!Array.isArray(candles) || candles.length === 0) {
          onStatusChange({
            text: "표시할 캔들 데이터가 없습니다.",
            error: true,
          });
          return;
        }

        onStatusChange({ text: `캔들 ${candles.length}개`, error: false });

        await waitNextPaint();

        if (disposed) return;

        const el = wrapRef.current;
        if (!el || disposed) return;

        const rect = el.getBoundingClientRect();
        const width = Math.max(Math.floor(rect.width), 200);
        const height = Math.max(Math.floor(rect.height), 200);

        chart = createChart(el, {
          layout: {
            background: { color: "#0f1115" },
            textColor: "#c9d1d9",
          },
          grid: {
            vertLines: { color: "#252a33" },
            horzLines: { color: "#252a33" },
          },
          rightPriceScale: { borderColor: "#2a2f3a" },
          timeScale: { borderColor: "#2a2f3a" },
          crosshair: { mode: CrosshairMode.Normal },
          width,
          height,
        });

        const series = chart.addCandlestickSeries({
          upColor: "#ef4444",
          downColor: "#3b82f6",
          borderVisible: false,
          wickUpColor: "#ef4444",
          wickDownColor: "#3b82f6",
        });
        series.setData(candles);
        chart.timeScale().fitContent();

        const resize = () => {
          if (!chart) return;
          const r = el.getBoundingClientRect();
          chart.applyOptions({
            width: Math.max(Math.floor(r.width), 200),
            height: Math.max(Math.floor(r.height), 200),
          });
        };
        ro = new ResizeObserver(resize);
        ro.observe(el);
        resize();
      } catch (e) {
        if (disposed) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        onStatusChange({
          text: e instanceof Error ? e.message : String(e),
          error: true,
        });
      }
    };

    void run();

    return () => {
      disposed = true;
      ac.abort();
      ro?.disconnect();
      chart?.remove();
    };
  }, [symbol, onStatusChange]);

  return <div ref={wrapRef} className="chart-wrap" />;
}
