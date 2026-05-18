import type { SeriesMarker, Time } from "lightweight-charts";

export type TradeSide = "buy" | "sell";

export type Trade = {
  id: string;
  side: TradeSide;
  date: string;
  price: number;
  quantity: number;
};

const STORAGE_KEY = "study-stock-chart-trades";

export function createTradeId(): string {
  return crypto.randomUUID();
}

export function createTrade(
  partial: Pick<Trade, "side" | "date" | "price" | "quantity">,
): Trade {
  return { id: createTradeId(), ...partial };
}

export function tradeSideLabel(side: TradeSide): string {
  return side === "buy" ? "매수" : "매도";
}

export function formatTradeTooltip(t: Trade): string {
  const amount = t.price * t.quantity;
  return [
    `일자: ${t.date}`,
    `구분: ${tradeSideLabel(t.side)}`,
    `단가: ${t.price.toLocaleString("ko-KR")}원`,
    `수량: ${t.quantity.toLocaleString("ko-KR")}주`,
    `금액: ${amount.toLocaleString("ko-KR")}원`,
  ].join("\n");
}

export function tradesToMarkers(trades: Trade[]): SeriesMarker<Time>[] {
  return [...trades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      time: t.date as Time,
      position: t.side === "buy" ? "belowBar" : "aboveBar",
      shape: t.side === "buy" ? "arrowUp" : "arrowDown",
      color: t.side === "buy" ? "#22c55e" : "#f97316",
      text: t.side === "buy" ? "매수" : "매도",
    }));
}

function normalizeTrade(raw: Trade): Trade {
  const qty = Number(raw.quantity);
  return {
    ...raw,
    quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
  };
}

export function loadTradesBySymbol(): Record<string, Trade[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Trade[]>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, Trade[]> = {};
    for (const [sym, list] of Object.entries(parsed)) {
      out[sym] = Array.isArray(list) ? list.map(normalizeTrade) : [];
    }
    return out;
  } catch {
    return {};
  }
}

export function saveTradesBySymbol(data: Record<string, Trade[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function sortTradesDesc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}

/** 거래일 목록에서 target에 가장 가까운 인덱스 */
export function nearestTradingIndex(
  candleDates: string[],
  target: string,
): number {
  if (candleDates.length === 0) return -1;
  if (candleDates.includes(target)) return candleDates.indexOf(target);

  let lo = 0;
  let hi = candleDates.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (candleDates[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return 0;
  if (lo >= candleDates.length) return candleDates.length - 1;
  const before = candleDates[lo - 1];
  const after = candleDates[lo];
  return target.localeCompare(after) - target.localeCompare(before) >= 0
    ? lo
    : lo - 1;
}

export function snapToTradingDay(
  candleDates: string[],
  date: string,
): string {
  if (candleDates.length === 0) return date;
  const idx = nearestTradingIndex(candleDates, date);
  return idx >= 0 ? candleDates[idx] : date;
}
