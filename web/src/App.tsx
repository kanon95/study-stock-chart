import { useCallback, useMemo, useState } from "react";
import { StockChart, type ChartStatus } from "./StockChart";
import { DEFAULT_STOCK, STOCKS } from "./stocks";

export function App() {
  const [symbol, setSymbol] = useState(DEFAULT_STOCK.symbol);
  const [status, setStatus] = useState<ChartStatus>({
    text: "불러오는 중…",
    error: false,
  });

  const active = useMemo(
    () => STOCKS.find((s) => s.symbol === symbol) ?? DEFAULT_STOCK,
    [symbol],
  );

  const onStatusChange = useCallback((s: ChartStatus) => {
    setStatus(s);
  }, []);

  return (
    <div className="layout">
      <header>
        <div className="header-row">
          <h1>
            {active.name} ({active.code})
          </h1>
          <span className="meta">Yahoo Finance · 일봉 · 최근 약 2년</span>
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
      <main className="app-main">
        <StockChart symbol={symbol} onStatusChange={onStatusChange} />
      </main>
    </div>
  );
}
