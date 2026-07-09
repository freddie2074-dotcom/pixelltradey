import { useState, useMemo, useEffect, useRef } from "react";
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

// Mock available balance – keep in sync with Dashboard's portfolio value
const AVAILABLE_USDT = 0;

// ---------- Mock order book generator ----------
function generateOrderBook(midPrice) {
  const asks = [];
  const bids = [];
  for (let i = 8; i >= 1; i--) {
    const price = midPrice + i * (midPrice * 0.0009);
    asks.push({
      price,
      amount: +(Math.random() * 2).toFixed(4),
      total: 0,
    });
  }
  for (let i = 1; i <= 8; i++) {
    const price = midPrice - i * (midPrice * 0.0009);
    bids.push({
      price,
      amount: +(Math.random() * 2).toFixed(4),
      total: 0,
    });
  }
  asks.forEach((a) => (a.total = +(a.price * a.amount).toFixed(3)));
  bids.forEach((b) => (b.total = +(b.price * b.amount).toFixed(3)));
  return { asks, bids };
}

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
      // Clear any previous widget before mounting a new one
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
  const pairs = useTicker(); // ticks every 2s — drives price/orderbook mock data
  const [pairIndex, setPairIndex] = useState(0);
  const [timeframe, setTimeframe] = useState("D");
  const [orderBookView, setOrderBookView] = useState("both"); // both | bids | asks

  const [side, setSide] = useState("buy"); // buy | sell
  const [orderType, setOrderType] = useState("limit"); // limit | market
  const [priceInput, setPriceInput] = useState(null);
  const [amountInput, setAmountInput] = useState("");

  const activePair = PAIRS[pairIndex];
  const liveData = pairs.find((p) => p.symbol === `${activePair.base}/USDT`);
  const currentPrice = liveData?.price ?? 0;
  const currentChange = liveData?.change ?? 0;
  const isUp = currentChange >= 0;

  const orderBook = useMemo(
    () => generateOrderBook(currentPrice || 100),
    [activePair.symbol, Math.round(currentPrice / 5)],
  );

  const effectivePrice =
    orderType === "market" ? currentPrice : (priceInput ?? currentPrice);
  const amountNum = Number(amountInput) || 0;
  const totalUsdt = amountNum * effectivePrice;
  const fee = totalUsdt * 0.001;
  const totalWithFee = totalUsdt + fee;

  const hasAmount = amountNum > 0;
  const insufficientFunds = hasAmount && totalWithFee > AVAILABLE_USDT;
  const canSubmit = hasAmount && !insufficientFunds;

  const setPercent = (pct) => {
    if (effectivePrice <= 0) return;
    const usdtToUse = AVAILABLE_USDT * (pct / 100);
    const amt = usdtToUse / effectivePrice;
    setAmountInput(amt ? amt.toFixed(6) : "0");
  };

  return (
    <>
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

      {/* Timeframes (TradingView widget has its own internal toolbar too) */}
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

      {/* Main layout: chart / order book / buy-sell panel */}
      <div className="spot-layout">
        {/* Real TradingView chart */}
        <div className="panel spot-chart-panel">
          <TradingViewChart
            symbol={activePair.tv}
            interval={TF_TO_TV_INTERVAL[timeframe]}
          />
        </div>

        {/* Order Book */}
        <div className="panel orderbook-panel">
          <div className="orderbook-header-row">
            <h3>Order Book</h3>
            <div className="orderbook-toggle">
              {["both", "bids", "asks"].map((v) => (
                <button
                  key={v}
                  className={`ob-toggle-btn ${orderBookView === v ? "active" : ""}`}
                  onClick={() => setOrderBookView(v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="orderbook-columns mono">
            <span>Price</span>
            <span>Amount</span>
            <span>Total</span>
          </div>

          {(orderBookView === "both" || orderBookView === "asks") && (
            <div className="orderbook-rows">
              {orderBook.asks.map((a, i) => (
                <div className="ob-row" key={`ask-${i}`}>
                  <span className="ob-price down mono">
                    {a.price.toFixed(2)}
                  </span>
                  <span className="ob-amount mono">{a.amount}</span>
                  <span className="ob-total mono">{a.total}</span>
                </div>
              ))}
            </div>
          )}

          <div className={`orderbook-mid-price mono ${isUp ? "up" : "down"}`}>
            $
            {currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>

          {(orderBookView === "both" || orderBookView === "bids") && (
            <div className="orderbook-rows">
              {orderBook.bids.map((b, i) => (
                <div className="ob-row" key={`bid-${i}`}>
                  <span className="ob-price up mono">{b.price.toFixed(2)}</span>
                  <span className="ob-amount mono">{b.amount}</span>
                  <span className="ob-total mono">{b.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buy / Sell panel */}
        <div className="panel buy-sell-panel">
          <div className="buy-sell-tabs">
            <button
              className={`bs-tab buy ${side === "buy" ? "active" : ""}`}
              onClick={() => setSide("buy")}
            >
              Buy
            </button>
            <button
              className={`bs-tab sell ${side === "sell" ? "active" : ""}`}
              onClick={() => setSide("sell")}
            >
              Sell
            </button>
          </div>

          <div className="order-type-tabs">
            <button
              className={`ot-tab ${orderType === "limit" ? "active" : ""}`}
              onClick={() => setOrderType("limit")}
            >
              Limit
            </button>
            <button
              className={`ot-tab ${orderType === "market" ? "active" : ""}`}
              onClick={() => setOrderType("market")}
            >
              Market
            </button>
          </div>

          <div className="field">
            <label>Price (USDT)</label>
            <input
              type="number"
              className="amount-input mono"
              value={
                orderType === "market"
                  ? currentPrice.toFixed(2)
                  : (priceInput ?? currentPrice).toFixed(2)
              }
              disabled={orderType === "market"}
              onChange={(e) => setPriceInput(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Amount ({activePair.base})</label>
            <input
              type="number"
              className="amount-input mono"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>

          <div className="percent-btns">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                className="percent-btn"
                onClick={() => setPercent(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="field">
            <label>Total (USDT)</label>
            <input
              type="number"
              className="amount-input mono"
              value={totalUsdt ? totalUsdt.toFixed(2) : "0.00"}
              disabled
            />
          </div>

          <div className="fee-row">
            <span>Fee (0.1%)</span>
            <span className="mono">${fee.toFixed(4)}</span>
          </div>

          <div className="available-row">
            <span>📄 Available (USDT)</span>
            <span className={`mono ${insufficientFunds ? "down" : ""}`}>
              {AVAILABLE_USDT.toFixed(2)} USDT
            </span>
          </div>

          <button className={`bs-submit-btn ${side}`} disabled={!canSubmit}>
            {insufficientFunds
              ? "Insufficient Funds"
              : `${side === "buy" ? "Buy" : "Sell"} ${activePair.base}`}
          </button>
        </div>
      </div>
    </>
  );
}
