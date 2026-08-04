// src/pages/Dashboard.jsx

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTicker, CRYPTO_DATA } from "../tickerData";
import { supabase } from "../supabaseClient";

// ---------- Helpers & Constants ----------
const WATCHLIST_BASES = ["BTC", "ETH", "XRP"];

const COIN_META = {
  BTC: { color: "#f7931a" },
  ETH: { color: "#8fa5c9" },
  SOL: { color: "#14f195" },
  BNB: { color: "#f3ba2f" },
  XRP: { color: "#ffffff" },
  ADA: { color: "#3468d1" },
  DOGE: { color: "#c9a227" },
  AVAX: { color: "#e84142" },
  USDT: { color: "#26a17b" },
};

// Mock wallet addresses – replace with real generation from backend
const WALLETS = {
  BTC: "1CUiUjKiH6paR13YdHSzWQJ7XjEGRXeEeu",
  USDT_TRC20: "TPuff85NhMAfMoALCuqkVtdgmuJb7McG6D",
};

// Withdrawal method options (icon + display label)
const WITHDRAW_METHODS = [
  { key: "Bitcoin", base: "BTC" },
  { key: "USDT", base: "USDT" },
  { key: "Ethereum", base: "ETH" },
];

// ---------- Subcomponents ----------
function CoinIcon({ base }) {
  const [imgError, setImgError] = useState(false);
  const color = COIN_META[base]?.color || "#5b6ef5";

  if (imgError) {
    return (
      <span className="coin-icon" style={{ background: color }}>
        {base.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      className="coin-icon-img"
      src={`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${base.toLowerCase()}.svg`}
      alt={base}
      onError={() => setImgError(true)}
    />
  );
}

function Sparkline({ up }) {
  const color = up ? "var(--gain)" : "var(--loss)";
  const points = up
    ? "0,16 25,15 50,12 75,9 100,4"
    : "0,4 25,7 50,9 75,13 100,16";
  return (
    <svg
      className="crypto-sparkline"
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// ---------- Main Dashboard ----------
export default function Dashboard() {
  const pairs = useTicker();
  const [lastUpdated] = useState(new Date());
  const location = useLocation();

  // Real balance, pulled from Supabase (profiles.balance) — same field the admin panel edits
  const [totalValue, setTotalValue] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [userId, setUserId] = useState(null);

  // TODO: portfolio % change still needs real P&L calculation once Binance API is wired in
  const portfolioChange = 0;
  const portfolioUp = true;

  // Deposit state
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("Bitcoin");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  // Withdraw state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] =
    useState("Bitcoin");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // ---------- Reset to the main dashboard whenever the Dashboard link ----------
  // ---------- is clicked in the sidebar, even if we're already on /dashboard ----------
  useEffect(() => {
    setShowDeposit(false);
    setShowWithdraw(false);
  }, [location.key]);

  // ---------- Fetch real balance from Supabase ----------
  useEffect(() => {
    async function loadBalance() {
      setBalanceLoading(true);
      setBalanceError("");
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No logged-in user found.");

        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .single();
        if (error) throw error;

        setTotalValue(Number(data?.balance) || 0);
      } catch (e) {
        setBalanceError(e.message);
      } finally {
        setBalanceLoading(false);
      }
    }

    loadBalance();

    // Keep the dashboard in sync if the admin panel updates this user's balance
    // while they're on the page.
    const channel = supabase
      .channel("profile-balance-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.id === user.id) {
              setTotalValue(Number(payload.new.balance) || 0);
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- Load this user's real withdrawals + keep status in sync ----------
  useEffect(() => {
    if (!userId) return;

    async function loadWithdrawals() {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load withdrawals:", error.message);
        return;
      }
      setPendingWithdrawals(data || []);
    }

    loadWithdrawals();

    // Realtime: reflect admin approve/reject instantly, and pick up
    // any new request inserted from elsewhere.
    const channel = supabase
      .channel(`withdrawals:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPendingWithdrawals((prev) => {
              if (prev.some((w) => w.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setPendingWithdrawals((prev) =>
              prev.map((w) => (w.id === payload.new.id ? payload.new : w)),
            );
          } else if (payload.eventType === "DELETE") {
            setPendingWithdrawals((prev) =>
              prev.filter((w) => w.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const watchlist = WATCHLIST_BASES.map((base) => {
    const p = pairs.find((pair) => pair.symbol === `${base}/USDT`);
    return {
      base,
      price: p?.price ?? null,
      change: p?.change ?? null,
    };
  });

  const updatedLabel = lastUpdated.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // ---------- Deposit logic ----------
  const getWalletAddress = () => {
    return selectedMethod === "Bitcoin" ? WALLETS.BTC : WALLETS.USDT_TRC20;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getWalletAddress());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleMethodChange = (method) => {
    setSelectedMethod(method);
    setCopied(false);
  };

  // ---------- Withdraw logic ----------
  const handleWithdrawMethodChange = (method) => {
    setSelectedWithdrawMethod(method);
  };

  const canSubmitWithdrawal =
    withdrawAmount.trim() !== "" &&
    Number(withdrawAmount) > 0 &&
    Number(withdrawAmount) <= totalValue &&
    withdrawAddress.trim() !== "" &&
    !withdrawSubmitting;

  const handleWithdrawSubmit = async () => {
    if (!canSubmitWithdrawal || !userId) return;

    setWithdrawSubmitting(true);
    setWithdrawError("");

    const { data, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: userId,
        method: selectedWithdrawMethod,
        amount: Number(withdrawAmount),
        address: withdrawAddress.trim(),
        status: "pending",
      })
      .select()
      .single();

    setWithdrawSubmitting(false);

    if (error) {
      console.error("Failed to submit withdrawal:", error.message);
      setWithdrawError(error.message);
      return;
    }

    // Realtime subscription above will also deliver this INSERT — the
    // de-dupe check there prevents it from being added twice.
    setPendingWithdrawals((prev) => [data, ...prev]);
    setWithdrawAmount("");
    setWithdrawAddress("");
  };

  // ---------- Deposit View Renderer ----------
  const renderDeposit = () => (
    <div className="deposit-container">
      <div className="page-header">
        <div>
          <h1>Fund Your Account</h1>
          <p>Choose your preferred deposit method below.</p>
        </div>
      </div>

      <div className="panel deposit-panel">
        {/* Method Selection: "Crypto" banner + side-by-side cards */}
        <div className="method-selector">
          <div className="method-banner">
            <span className="method-banner-icon">🪙</span>
            Crypto
          </div>
          <div className="method-options">
            <button
              className={`method-card ${selectedMethod === "Bitcoin" ? "active" : ""}`}
              onClick={() => handleMethodChange("Bitcoin")}
            >
              <CoinIcon base="BTC" />
              <span>Bitcoin</span>
            </button>
            <button
              className={`method-card ${selectedMethod === "USDT" ? "active" : ""}`}
              onClick={() => handleMethodChange("USDT")}
            >
              <CoinIcon base="USDT" />
              <span>USDT</span>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="amount-section">
          <label>Amount (USD)</label>
          <input
            type="number"
            className="amount-input mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        {/* Wallet Section – address always shown, no generate step */}
        <div className="wallet-section">
          <div className="wallet-label">
            {selectedMethod === "Bitcoin"
              ? "Bitcoin Wallet Address"
              : "USDT (TRC20) Wallet Address"}
          </div>
          <div className="wallet-address mono">{getWalletAddress()}</div>
          <button onClick={copyToClipboard} className="btn copy-btn">
            {copied ? "✅ Copied!" : "Copy Address"}
          </button>
          <p className="wallet-hint">
            Send the exact amount to this address and your account will be
            credited automatically.
          </p>
        </div>
      </div>
    </div>
  );

  // ---------- Withdraw View Renderer ----------
  const renderWithdraw = () => (
    <div className="deposit-container">
      <div className="page-header">
        <div>
          <h1>Withdraw Funds</h1>
          <p>Choose your preferred withdrawal method below</p>
        </div>
      </div>

      {/* Available Balance — now matches Dashboard portfolio value */}
      <div className="withdraw-balance-panel">
        <div className="withdraw-balance-value mono">
          ${totalValue.toFixed(2)}
        </div>
        <div className="withdraw-balance-label">Available Balance</div>
      </div>

      <div className="panel withdraw-panel">
        {/* Method Selection: "Crypto" banner + 3 cards */}
        <div className="method-selector">
          <div className="method-banner">
            <span className="method-banner-icon">🪙</span>
            Crypto
          </div>
          <div className="method-options method-options-3">
            {WITHDRAW_METHODS.map(({ key, base }) => (
              <button
                key={key}
                className={`method-card ${selectedWithdrawMethod === key ? "active" : ""}`}
                onClick={() => handleWithdrawMethodChange(key)}
              >
                <CoinIcon base={base} />
                <span>{key}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="amount-section">
          <label>Amount (USD)</label>
          <input
            type="number"
            className="amount-input mono"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        {/* Wallet Address Input */}
        <div className="amount-section">
          <label>Your Wallet Address</label>
          <input
            type="text"
            className="amount-input mono wallet-input"
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            placeholder="Enter your wallet address"
          />
        </div>

        {/* Withdraw Button */}
        <button
          className="withdraw-btn"
          onClick={handleWithdrawSubmit}
          disabled={!canSubmitWithdrawal}
        >
          {withdrawSubmitting ? "Submitting…" : "Withdraw"}
        </button>
        {withdrawError && (
          <p className="error-text" style={{ marginTop: 8 }}>
            {withdrawError}
          </p>
        )}
        {Number(withdrawAmount) > totalValue &&
          withdrawAmount.trim() !== "" && (
            <p className="error-text" style={{ marginTop: 8 }}>
              Amount exceeds your available balance.
            </p>
          )}
      </div>

      {/* Pending Withdrawals */}
      <h2 className="pending-withdrawals-title">Pending Withdrawals</h2>
      <div className="panel pending-withdrawals-panel">
        {pendingWithdrawals.length === 0 ? (
          <>
            <div className="pending-empty-icon">📪</div>
            <p className="pending-empty-text">No pending withdrawals found.</p>
          </>
        ) : (
          <div className="pending-withdrawals-list">
            {pendingWithdrawals.map((w) => {
              const base = WITHDRAW_METHODS.find(
                (m) => m.key === w.method,
              )?.base;
              return (
                <div className="pending-withdrawal-item" key={w.id}>
                  <div className="pending-withdrawal-left">
                    <CoinIcon base={base} />
                    <div>
                      <div className="pending-withdrawal-amount mono">
                        ${Number(w.amount).toFixed(2)} · {w.method}
                      </div>
                      <div className="pending-withdrawal-address">
                        {w.address}
                      </div>
                    </div>
                  </div>
                  <span className={`pending-status-pill ${w.status}`}>
                    {w.status === "pending"
                      ? "Pending"
                      : w.status === "approved"
                        ? "Approved"
                        : "Rejected"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ---------- Main render ----------
  if (showDeposit) {
    return <div className="dashboard-wrapper">{renderDeposit()}</div>;
  }

  if (showWithdraw) {
    return <div className="dashboard-wrapper">{renderWithdraw()}</div>;
  }

  // Normal Dashboard
  return (
    <>
      {balanceError && <p className="error-text">{balanceError}</p>}

      <div className="panel hero-portfolio">
        <div className="eyebrow-label">Portfolio Value</div>
        <div className="portfolio-value mono">
          {balanceLoading ? "…" : `$${totalValue.toFixed(2)}`}
        </div>
        <div className={`portfolio-change mono ${portfolioUp ? "up" : "down"}`}>
          <span>{portfolioUp ? "↑" : "↓"}</span>
          {portfolioUp ? "+" : ""}
          {portfolioChange.toFixed(2)}%
        </div>
        <div className="hero-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowDeposit(true)}
          >
            Deposit
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowWithdraw(true)}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="markets-layout">
        <div className="panel watchlist-panel">
          <div className="panel-header-row">
            <h3>Watchlist</h3>
            <Link to="/markets" className="see-all-link">
              See All
            </Link>
          </div>
          <div className="watchlist-list">
            {watchlist.map(({ base, price, change }) => {
              const up = change !== null ? change >= 0 : true;
              return (
                <div className="watchlist-item" key={base}>
                  <div className="watchlist-item-left">
                    <CoinIcon base={base} />
                    <div>
                      <div className="coin-name">{base}</div>
                      <div className="coin-ticker mono">{base}</div>
                    </div>
                  </div>
                  <div className="watchlist-item-right">
                    <div className="coin-price mono">
                      {price !== null ? `$${price.toLocaleString()}` : "—"}
                    </div>
                    <div className={`coin-change mono ${up ? "up" : "down"}`}>
                      {change !== null
                        ? `${up ? "+" : ""}${change.toFixed(2)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="watchlist-footer">
            <p className="using-exchange">Using: Binance</p>
            <Link to="/markets" className="btn btn-outline full-width">
              View Markets
            </Link>
          </div>
        </div>

        <div className="your-crypto-col">
          <div className="panel-header-row">
            <h3>Your Crypto</h3>
            <Link to="/markets" className="see-all-link">
              See All
            </Link>
          </div>
          <div className="crypto-grid">
            {CRYPTO_DATA.map((h) => {
              const up = h.change >= 0;
              const value = h.amount * h.price;
              return (
                <div className="crypto-card" key={h.id}>
                  <div className="crypto-card-head">
                    <div className="crypto-card-title">
                      <CoinIcon base={h.symbol} />
                      <span>{h.symbol}</span>
                    </div>
                    <span className={`change-pill ${up ? "up" : "down"}`}>
                      {up ? "+" : ""}
                      {h.change.toFixed(2)}%
                    </span>
                  </div>

                  <div className="crypto-price mono">
                    ${h.price.toLocaleString()}
                  </div>

                  <div className="crypto-meta mono">
                    <div>
                      Amount:{" "}
                      <b>
                        {h.amount} {h.symbol}
                      </b>
                    </div>
                    <div>
                      Value: <b>${value.toFixed(2)}</b>
                    </div>
                  </div>

                  <Sparkline up={up} />

                  <div className="crypto-card-footer">
                    <Link to="/spot" className="btn btn-primary trade-btn">
                      Trade
                    </Link>
                    <span className="last-updated mono">
                      Last updated: {updatedLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
