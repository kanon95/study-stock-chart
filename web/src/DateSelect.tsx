import { snapToTradingDay } from "./trades";

type Props = {
  value: string;
  candleDates: string[];
  min?: string;
  max?: string;
  onChange: (date: string) => void;
  className?: string;
};

export function DateSelect({
  value,
  candleDates,
  min,
  max,
  onChange,
  className = "",
}: Props) {
  return (
    <input
      type="date"
      className={`trade-date-input ${className}`.trim()}
      value={value}
      min={min || undefined}
      max={max || undefined}
      onChange={(e) => {
        const next = e.target.value;
        if (next) onChange(snapToTradingDay(candleDates, next));
      }}
    />
  );
}
