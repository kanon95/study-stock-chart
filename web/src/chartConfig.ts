/** 차트에 표시할 일봉 개수 */
export const CANDLE_LIMIT = 100;

export function limitCandles<T>(candles: T[]): T[] {
  if (candles.length <= CANDLE_LIMIT) return candles;
  return candles.slice(-CANDLE_LIMIT);
}
