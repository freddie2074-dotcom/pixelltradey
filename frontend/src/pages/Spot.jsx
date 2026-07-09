import { useState, useEffect, useRef } from "react";
import { useTicker } from "../tickerData";

const PAIRS = [
  { symbol: "BTCUSDT", base: "BTC", name: "Bitcoin", tv: "BINANCE:BTCUSDT" },
  { symbol: "ETHUSDT", base: "ETH", name: "Ethereum", tv: "BINANCE:ETHUSDT" },
  { symbol: "SOLUSDT", base: "SOL", name: "Solana", tv: "BINANCE:SOLUSDT" },
  { symbol: "BNBUSDT", base: "BNB", name: "BNB", tv: "BINANCE:BNBUSDT" },
];

// Maps our UI timeframe buttons to TradingView's interval codes
const TF_TO_TV_INTERVAL = {
  "1m": "1",
  "30m": "30",
  "1h": "60",
  D: "D",
};
const TIMEFRAMES = ["1m", "30m", "1h", "D"];

// ---------- Loads the TradingView embed script once, globally ----------
let tvScriptPromise = null;
function loadTradingViewScript() {
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return tvScriptPromise;
}

// ---------- Real TradingView chart widget ----------
function TradingViewChart({ symbol, interval }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(
    `tv_widget_${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    let cancelled = false;

    loadTradingViewScript().then(() => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const el = document.createElement("div");
      el.id = widgetIdRef.current;
      el.style.height = "100%";
      el.style.width = "100%";
      containerRef.current.appendChild(el);

      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#121a2e",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: false,
        save_image: false,
        container_id: widgetIdRef.current,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  return <div className="tv-chart-container" ref={containerRef} />;
}

export default function Spot() {
  const pairs = useTicker(); // ticks every 2s — drives price display
  const [pairIndex, setPairIndex] = useState(0);
  const [timeframe, setTimeframe] = useState("D");

  const activePair = PAIRS[pairIndex];
  const liveData = pairs.find((p) => p.symbol === `${activePair.base}/USDT`);
  const currentPrice = liveData?.price ?? 0;
  const currentChange = liveData?.change ?? 0;
  const isUp = currentChange >= 0;

  return (
    <div className="spot-page-full">
      {/* Header row: coin + price + 24h stats */}
      <div className="spot-header">
        <div className="spot-header-left">
          <img
            className="spot-coin-icon"
            src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${activePair.base.toLowerCase()}.png`}
            alt={activePair.base}
            onError={(e) => (e.target.style.visibility = "hidden")}
          />
          <span className="spot-pair-name">{activePair.base}/USDT</span>
          <span className={`spot-price mono ${isUp ? "up" : "down"}`}>
            $
            {currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
          <span className={`change-pill ${isUp ? "up" : "down"}`}>
            {isUp ? "+" : ""}
            {currentChange.toFixed(2)}%
          </span>
          <span className="live-dot-label">
            <span className="live-dot" /> Live
          </span>
        </div>
      </div>

      {/* Pair selector */}
      <div className="spot-pair-tabs">
        {PAIRS.map((p, i) => (
          <button
            key={p.symbol}
            className={i === pairIndex ? "btn btn-primary" : "btn btn-outline"}
            onClick={() => setPairIndex(i)}
          >
            {p.symbol}
          </button>
        ))}
      </div>

      {/* Timeframes */}
      <div className="spot-toolbar">
        <div className="spot-timeframes">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`tf-btn ${timeframe === tf ? "active" : ""}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Full-page TradingView chart */}
      <div className="panel spot-chart-panel-full">
        <TradingViewChart
          symbol={activePair.tv}
          interval={TF_TO_TV_INTERVAL[timeframe]}
        />
      </div>
    </div>
  );
}
