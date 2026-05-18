import { useCallback, useEffect, useState } from "react";
import {
  createTrade,
  loadTradesBySymbol,
  saveTradesBySymbol,
  type Trade,
  type TradeSide,
} from "./trades";

export function useTrades(symbol: string) {
  const [bySymbol, setBySymbol] = useState<Record<string, Trade[]>>(() =>
    loadTradesBySymbol(),
  );

  useEffect(() => {
    saveTradesBySymbol(bySymbol);
  }, [bySymbol]);

  const trades = bySymbol[symbol] ?? [];

  const setTrades = useCallback(
    (next: Trade[] | ((prev: Trade[]) => Trade[])) => {
      setBySymbol((all) => {
        const prev = all[symbol] ?? [];
        const updated = typeof next === "function" ? next(prev) : next;
        return { ...all, [symbol]: updated };
      });
    },
    [symbol],
  );

  const addTrade = useCallback(
    (
      side: TradeSide,
      date: string,
      price: number,
      quantity: number,
    ) => {
      setTrades((prev) => [
        ...prev,
        createTrade({ side, date, price, quantity }),
      ]);
    },
    [setTrades],
  );

  const updateTrade = useCallback(
    (
      id: string,
      patch: Partial<Pick<Trade, "side" | "date" | "price" | "quantity">>,
    ) => {
      setTrades((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    [setTrades],
  );

  const removeTrade = useCallback(
    (id: string) => {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    },
    [setTrades],
  );

  return { trades, addTrade, updateTrade, removeTrade };
}
