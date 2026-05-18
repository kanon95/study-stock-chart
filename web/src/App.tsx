import { useCallback, useMemo, useState } from "react";
import { StockChart, type ChartStatus } from "./StockChart";
import { TradePanel } from "./TradePanel";
import { DEFAULT_STOCK, STOCKS } from "./stocks";
import { useTrades } from "./useTrades";

export function App() {
  const [symbol, setSymbol] = useState(DEFAULT_STOCK.symbol);
  const [status, setStatus] = useState<ChartStatus>({
    text: "불러오는 중…",
    error: false,
  });
  const [candleDates, setCandleDates] = useState<string[]>([]);

  const { trades, addTrade, updateTrade, removeTrade } = useTrades(symbol);

  const active = useMemo(
    () => STOCKS.find((s) => s.symbol === symbol) ?? DEFAULT_STOCK,
    [symbol],
  );

  const onStatusChange = useCallback((s: ChartStatus) => {
    setStatus(s);
  }, []);

  const onCandleDates = useCallback((dates: string[]) => {
    setCandleDates(dates);
  }, []);

  return (
    <div className="layout">
      <header>
        <div className="header-row">
          <h1>
            {active.name} ({active.code})
          </h1>
          <span className="meta">Yahoo Finance · 일봉 · 최근 100거래일</span>
          <span className={`status ${status.error ? "error" : ""}`}>
            {status.text}
          </span>
        </div>
        <nav className="tabs" role="tablist" aria-label="종목 선택">
          {STOCKS.map((s) => {
            const selected = s.symbol === symbol;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`tab ${selected ? "tab-active" : ""}`}
                onClick={() => setSymbol(s.symbol)}
              >
                {s.name}
              </button>
            );
          })}
        </nav>
      </header>
      <div className="workspace">
        <TradePanel
          trades={trades}
          candleDates={candleDates}
          onAdd={addTrade}
          onUpdate={updateTrade}
          onRemove={removeTrade}
        />
        <main className="app-main">
          <StockChart
            symbol={symbol}
            trades={trades}
            onStatusChange={onStatusChange}
            onCandleDates={onCandleDates}
          />
        </main>
      </div>
    </div>
  );
}
