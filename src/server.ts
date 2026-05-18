import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/** Yahoo Finance 심볼 — 허용 목록만 조회 */
const ALLOWED_SYMBOLS = new Set([
  "005930.KS",
  "000660.KS",
  "005380.KS",
]);

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: Array<number | null>;
          high: Array<number | null>;
          low: Array<number | null>;
          close: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toYmd(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchDailyCandles(yahooSymbol: string): Promise<Candle[]> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "2y");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "study-stock-chart/1.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status}`);
  }

  const body = (await res.json()) as YahooChartResponse;
  const err = body.chart?.error;
  if (err?.description) {
    throw new Error(err.description);
  }

  const result = body.chart?.result?.[0];
  if (!result) {
    throw new Error("차트 데이터가 비어 있습니다.");
  }

  const ts = result.timestamp;
  const q = result.indicators.quote[0];
  if (!ts?.length || !q) {
    throw new Error("OHLC 시계열이 없습니다.");
  }

  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const open = q.open[i];
    const high = q.high[i];
    const low = q.low[i];
    const close = q.close[i];
    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open + high + low + close)
    ) {
      continue;
    }
    candles.push({
      time: toYmd(ts[i]),
      open,
      high,
      low,
      close,
    });
  }

  return candles;
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60",
  });
  res.end(body);
}

async function serveFile(
  res: http.ServerResponse,
  filePath: string,
  contentType: string,
): Promise<void> {
  const buf = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(buf);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

function isInsidePublic(resolvedFile: string): boolean {
  const root = path.resolve(PUBLIC_DIR) + path.sep;
  const file = path.resolve(resolvedFile);
  return file === path.resolve(PUBLIC_DIR) || file.startsWith(root);
}

async function tryServeStatic(
  res: http.ServerResponse,
  pathname: string,
): Promise<boolean> {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!rel || rel.includes("..")) {
    return false;
  }
  const normalized = path.normalize(rel);
  if (normalized.startsWith(".." + path.sep) || normalized === "..") {
    return false;
  }
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!isInsidePublic(filePath)) {
    return false;
  }
  try {
    const st = await fs.stat(filePath);
    if (st.isFile()) {
      await serveFile(res, filePath, mimeFor(filePath));
      return true;
    }
  } catch {
    /* missing */
  }
  return false;
}

async function serveSpaIndex(res: http.ServerResponse): Promise<void> {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  try {
    await fs.access(indexPath);
    await serveFile(res, indexPath, "text/html; charset=utf-8");
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const pathname = url.split("?")[0] ?? "/";

  try {
    if (pathname === "/api/daily-chart" && req.method === "GET") {
      const host = req.headers.host ?? "localhost";
      const full = new URL(req.url ?? "/", `http://${host}`);
      const sym = full.searchParams.get("symbol")?.trim() ?? "";
      if (!sym || !ALLOWED_SYMBOLS.has(sym)) {
        json(res, 400, { error: "지원하지 않는 종목입니다." });
        return;
      }
      const candles = await fetchDailyCandles(sym);
      json(res, 200, { symbol: sym, candles });
      return;
    }

    if (await tryServeStatic(res, pathname)) {
      return;
    }

    await serveSpaIndex(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    json(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT} — 코스피 일봉 차트`);
});
