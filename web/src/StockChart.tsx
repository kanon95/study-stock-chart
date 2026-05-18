import {
  createChart,
  CrosshairMode,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { limitCandles } from "./chartConfig";
import {
  formatTradeTooltip,
  tradesToMarkers,
  type Trade,
} from "./trades";

export type ChartStatus = { text: string; error: boolean };

type ApiOk = { symbol?: string; candles: CandlestickData<Time>[] };
type ApiErr = { error: string };
type ApiPayload = ApiOk | ApiErr;

type BarOhlc = { high: number; low: number };

type ChartBundle = {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  barByDate: Map<string, BarOhlc>;
};

type Props = {
  symbol: string;
  trades: Trade[];
  onStatusChange: (s: ChartStatus) => void;
  onCandleDates: (dates: string[]) => void;
};

const MARKER_HIT_X = 22;
const MARKER_HIT_Y = 48;

function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function markerAnchorPrice(trade: Trade, bar?: BarOhlc): number {
  if (bar) return trade.side === "sell" ? bar.high : bar.low;
  return trade.price;
}

function findTradeNearMarker(
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">,
  barByDate: Map<string, BarOhlc>,
  trades: Trade[],
  mouseX: number,
  mouseY: number,
): Trade | null {
  let hit: Trade | null = null;
  let best = MARKER_HIT_X + MARKER_HIT_Y + 1;

  for (const t of trades) {
    const x = chart.timeScale().timeToCoordinate(t.date as Time);
    if (x === null) continue;

    const dx = Math.abs(mouseX - x);
    if (dx > MARKER_HIT_X) continue;

    const bar = barByDate.get(t.date);
    const py = series.priceToCoordinate(markerAnchorPrice(t, bar));
    if (py === null) continue;

    const dy = Math.abs(mouseY - py);
    if (dy > MARKER_HIT_Y) continue;

    const score = dx + dy;
    if (score < best) {
      best = score;
      hit = t;
    }
  }
  return hit;
}

function buildBarMap(candles: CandlestickData<Time>[]): Map<string, BarOhlc> {
  const map = new Map<string, BarOhlc>();
  for (const c of candles) {
    map.set(String(c.time), { high: c.high, low: c.low });
  }
  return map;
}

export function StockChart({
  symbol,
  trades,
  onStatusChange,
  onCandleDates,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const bundleRef = useRef<ChartBundle | null>(null);
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  useEffect(() => {
    let disposed = false;
    let chart: IChartApi | null = null;
    let ro: ResizeObserver | null = null;
    const ac = new AbortController();

    const hideTooltip = () => {
      const tip = tooltipRef.current;
      if (tip) tip.style.display = "none";
    };

    const showTooltip = (trade: Trade, x: number, y: number) => {
      const tip = tooltipRef.current;
      const wrap = wrapRef.current;
      if (!tip || !wrap) return;

      tip.textContent = formatTradeTooltip(trade);
      tip.style.whiteSpace = "pre-line";

      const pad = 8;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      tip.style.display = "block";
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let left = x + pad;
      let top = y - th - pad;
      if (left + tw > w - pad) left = x - tw - pad;
      if (top < pad) top = y + pad;
      if (top + th > h - pad) top = h - th - pad;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };

    const run = async () => {
      bundleRef.current = null;
      hideTooltip();
      onStatusChange({ text: "불러오는 중…", error: false });
      onCandleDates([]);

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

        const raw = payload.candles;
        if (!Array.isArray(raw) || raw.length === 0) {
          onStatusChange({
            text: "표시할 캔들 데이터가 없습니다.",
            error: true,
          });
          return;
        }

        const candles = limitCandles(raw);
        onStatusChange({ text: `캔들 ${candles.length}개`, error: false });
        onCandleDates(candles.map((c) => String(c.time)));

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

        const barByDate = buildBarMap(candles);
        bundleRef.current = { chart, series, barByDate };
        series.setMarkers(tradesToMarkers(tradesRef.current));

        chart.subscribeCrosshairMove((param) => {
          if (disposed || !param.point) {
            hideTooltip();
            return;
          }
          const bundle = bundleRef.current;
          if (!bundle) return;

          const hit = findTradeNearMarker(
            bundle.chart,
            bundle.series,
            bundle.barByDate,
            tradesRef.current,
            param.point.x,
            param.point.y,
          );
          if (!hit) {
            hideTooltip();
            return;
          }
          const bar = bundle.barByDate.get(hit.date);
          const anchorY = bundle.series.priceToCoordinate(
            markerAnchorPrice(hit, bar),
          );
          showTooltip(hit, param.point.x, anchorY ?? param.point.y);
        });

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
      bundleRef.current = null;
      hideTooltip();
    };
  }, [symbol, onStatusChange, onCandleDates]);

  useEffect(() => {
    const series = bundleRef.current?.series;
    if (!series) return;
    series.setMarkers(tradesToMarkers(trades));
  }, [trades]);

  return (
    <div className="chart-host">
      <div ref={wrapRef} className="chart-wrap" />
      <div ref={tooltipRef} className="chart-marker-tooltip" role="tooltip" />
    </div>
  );
}
