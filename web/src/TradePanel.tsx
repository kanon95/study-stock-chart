import { useMemo, useState, type FormEvent } from "react";
import { DateSelect } from "./DateSelect";
import { sortTradesDesc, type Trade, type TradeSide } from "./trades";

type Props = {
  trades: Trade[];
  candleDates: string[];
  onAdd: (
    side: TradeSide,
    date: string,
    price: number,
    quantity: number,
  ) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Trade, "side" | "date" | "price" | "quantity">>,
  ) => void;
  onRemove: (id: string) => void;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePrice(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseQty(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function TradePanel({
  trades,
  candleDates,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const sorted = useMemo(() => sortTradesDesc(trades), [trades]);
  const [addSide, setAddSide] = useState<TradeSide>("buy");
  const [addDate, setAddDate] = useState(todayYmd);
  const [addPrice, setAddPrice] = useState("");
  const [addQty, setAddQty] = useState("1");

  const dateMin = candleDates[0] ?? "";
  const dateMax = candleDates[candleDates.length - 1] ?? "";

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const price = parsePrice(addPrice);
    const quantity = parseQty(addQty) ?? 1;
    if (!price || !addDate) return;
    onAdd(addSide, addDate, price, quantity);
    setAddPrice("");
    setAddQty("1");
  };

  return (
    <aside className="trade-panel">
      <div className="trade-panel-head">
        <h2>매매 기록</h2>
        <span className="trade-count">{trades.length}건</span>
      </div>

      <form className="trade-add" onSubmit={handleAdd}>
        <div className="trade-add-row">
          <label className="field-label">
            구분
            <select
              value={addSide}
              onChange={(e) => setAddSide(e.target.value as TradeSide)}
            >
              <option value="buy">매수</option>
              <option value="sell">매도</option>
            </select>
          </label>
        </div>
        <label className="field-label">
          일자
          <DateSelect
            value={addDate}
            candleDates={candleDates}
            min={dateMin}
            max={dateMax}
            onChange={setAddDate}
          />
        </label>
        <div className="trade-add-row">
          <label className="field-label">
            가격
            <input
              type="text"
              inputMode="numeric"
              placeholder="72000"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              required
            />
          </label>
          <label className="field-label">
            수량
            <input
              type="number"
              min={1}
              step={1}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-add">
            추가
          </button>
        </div>
      </form>

      <ul className="trade-list">
        {sorted.length === 0 ? (
          <li className="trade-empty">기록이 없습니다. 위에서 추가하세요.</li>
        ) : (
          sorted.map((t) => (
            <li key={t.id} className={`trade-item trade-item-${t.side}`}>
              <select
                className="trade-side"
                value={t.side}
                aria-label="매수 매도"
                onChange={(e) =>
                  onUpdate(t.id, { side: e.target.value as TradeSide })
                }
              >
                <option value="buy">매수</option>
                <option value="sell">매도</option>
              </select>
              <DateSelect
                className="trade-date-wrap"
                value={t.date}
                candleDates={candleDates}
                min={dateMin}
                max={dateMax}
                onChange={(date) => onUpdate(t.id, { date })}
              />
              <input
                type="number"
                className="trade-price"
                min={1}
                step={1}
                value={t.price}
                aria-label="가격"
                onChange={(e) => {
                  const price = Number(e.target.value);
                  if (Number.isFinite(price) && price > 0) {
                    onUpdate(t.id, { price });
                  }
                }}
              />
              <input
                type="number"
                className="trade-qty"
                min={1}
                step={1}
                value={t.quantity}
                aria-label="수량"
                onChange={(e) => {
                  const quantity = Number(e.target.value);
                  if (Number.isFinite(quantity) && quantity > 0) {
                    onUpdate(t.id, { quantity: Math.floor(quantity) });
                  }
                }}
              />
              <button
                type="button"
                className="btn-remove"
                aria-label="삭제"
                onClick={() => onRemove(t.id)}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
