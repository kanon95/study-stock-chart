export type StockTab = {
  id: string;
  symbol: string;
  name: string;
  code: string;
};

export const STOCKS: readonly StockTab[] = [
  { id: "samsung", symbol: "005930.KS", name: "삼성전자", code: "005930" },
  { id: "skhynix", symbol: "000660.KS", name: "SK하이닉스", code: "000660" },
  { id: "hyundai", symbol: "005380.KS", name: "현대차", code: "005380" },
] as const;

export const DEFAULT_STOCK = STOCKS[0];
