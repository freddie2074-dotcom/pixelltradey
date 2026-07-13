import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// ---------- Error Boundary (kept for global safety) ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: "#f8d7da", color: "#721c24" }}>
          <h3>Something went wrong</h3>
          <p><strong>{this.state.error?.message}</strong></p>
          <details>
            <summary>Stack trace</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Bot Metadata ----------
const BOT_META = {
  btc_accumulation: {
    label: "Bitcoin Accumulation",
    symbol: "BTCUSDT",
    icon: "₿",
    cadence: "Weekly • DCA",
    description: "Dollar-cost averaging into Bitcoin on a weekly basis.",
    risk: "Low",
  },
  eth_dca_pro: {
    label: "ETH DCA Pro",
    symbol: "ETHUSDT",
    icon: "Ξ",
    cadence: "Daily • DCA",
    description: "Dynamic DCA based on RSI and volume indicators.",
    risk: "Medium",
  },
};

const RISK_CLASS = {
  Low: "risk-low",
  Medium: "risk-medium",
  High: "risk-high",
};

const MIN_CONFIGURE_BALANCE = 5;

function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ---------- ULTRA‑SAFE CONFIG FORM (no CSS classes, all inline) ----------
function SafeConfigForm({ meta, onSave, onCancel }) {
  console.log("SafeConfigForm received meta:", meta);
  const [amount, setAmount] = useState(100);

  // If meta is invalid, show a simple message
  if (!meta || typeof meta !== "object") {
    return (
      <div style={{ border: "1px solid red", padding: 10, color: "red" }}>
        ❌ Missing metadata
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const bot = {
      id: `${meta.symbol}-${Date.now()}`,
      bot_type: meta.symbol,
      amount_usdt: Number(amount),
      active: false,
      pnl_usdt: 0,
      wins: 0,
      losses: 0,
    };
    if (typeof onSave === "function") onSave(bot);
    else console.error("onSave is not a function");
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, margin: "10px 0" }}>
      <h3>{meta.icon} {meta.label}</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginTop: 8 }}>
          <label>Buy amount (USDT): </label>
          <input
            type="number"
            min="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p style={{ fontSize: "0.8rem", color: "#666" }}>Min amount: $50</p>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={onCancel} style={{ marginRight: 10 }}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Bot Card (with full try/catch around render) ----------
function BotCard({ botType, bot, balance, onCreated, onUpdated, userId }) {
  const meta = BOT_META[botType];
  const [configuring, setConfiguring] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const intervalRef = useRef(null);

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ----- The entire render is inside try/catch -----
  try {
    // If we are configuring and no bot exists, show the safe form
    if (!bot && configuring) {
      if (!meta) {
        return <div style={{ color: "red" }}>❌ Meta missing</div>;
      }
      return (
        <SafeConfigForm
          meta={meta}
          onSave={(newBot) => {
            if (typeof onCreated === "function") onCreated(newBot);
            setConfiguring(false);
          }}
          onCancel={() => setConfiguring(false)}
        />
      );
    }

    // If meta is missing, show error
    if (!meta) {
      return <div style={{ color: "red" }}>❌ Meta missing for {botType}</div>;
    }

    const isActive = bot?.active || false;
    const badgeText = !bot ? "Not Configured" : isActive ? "active" : "Not Started";
    const badgeClass = !bot ? "off" : isActive ? "on" : "off";
    const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;
    const canConfigure = !!bot || meetsMinBalance;
    const pnl = bot?.pnl_usdt ?? 0;
    const wins = bot?.wins ?? 0;
    const losses = bot?.losses ?? 0;

    // ---------- Trade Simulation ----------
    const executeTrade = async () => {
      if (!bot || !isActive) return;
      try {
        const winRate = 0.57 + Math.random() * 0.07;
        const isWin = Math.random() < winRate;
        const pnlPercent = (Math.random() * 10 - 5) / 100;
        const tradePnl = bot.amount_usdt * pnlPercent;

        const updatedBot = {
          ...bot,
          pnl_usdt: bot.pnl_usdt + tradePnl,
          wins: isWin ? bot.wins + 1 : bot.wins,
          losses: isWin ? bot.losses : bot.losses + 1,
        };

        const newBalance = Number(balance) + tradePnl;
        const { error } = await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);
        if (error) throw error;
        if (typeof onUpdated === "function") onUpdated(updatedBot, null, newBalance);
      } catch (err) {
        console.error("Trade execution failed:", err);
        if (typeof onUpdated === "function") onUpdated(bot, null, balance);
      }
    };

    useEffect(() => {
      if (isActive && bot) {
        intervalRef.current = setInterval(executeTrade, 10000);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [isActive, bot]);

    const toggleActive = () => {
      if (bot && typeof onUpdated === "function") {
        onUpdated({ ...bot, active: !bot.active });
      }
    };

    const remove = () => {
      if (!confirm(`Delete ${meta.label}?`)) return;
      if (typeof onUpdated === "function") onUpdated(null, bot?.id);
    };

    // ---------- Render the main bot card (original layout) ----------
    return (
      <div className="bot-card">
        <div className="bot-head">
          <h3>{meta.label}</h3>
          <span className={`status-pill ${badgeClass}`}>{badgeText}</span>
        </div>
        <div className="bot-symbol">{meta.cadence}</div>
        <p className="bot-card-desc">{meta.description}</p>

        <div className="bot-stats-row">
          <div className="bot-stat-col">
            <div className="bot-stat-label">Risk</div>
            <div className={`bot-stat-value ${RISK_CLASS[meta.risk] || ""}`}>
              {meta.risk}
            </div>
          </div>
          <div className="bot-stat-col">
            <div className="bot-stat-label">P&L</div>
            <div className={`bot-stat-value ${pnl >= 0 ? "up" : "down"}`}>
              {fmtUsd(pnl)}
            </div>
          </div>
          <div className="bot-stat-col">
            <div className="bot-stat-label">Wins</div>
            <div className="bot-stat-value up">{wins}</div>
          </div>
          <div className="bot-stat-col">
            <div className="bot-stat-label">Losses</div>
            <div className="bot-stat-value down">{losses}</div>
          </div>
        </div>

        {!isActive ? (
          <>
            <div className="bot-card-buttons">
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                disabled={!canConfigure}
                onClick={() => setConfiguring(true)}
              >
                ⚙️ Configure
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
                disabled={!bot}
                onClick={toggleActive}
              >
                ▶ Start Bot
              </button>
            </div>
            {!canConfigure && (
              <p className="bot-min-balance-note">
                Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to configure.
              </p>
            )}
          </>
        ) : (
          <div className="bot-card-buttons">
            <button
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={toggleActive}
            >
              Pause
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setShowTrades((s) => !s)}
            >
              View trades
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: "var(--loss)" }}
              onClick={remove}
            >
              Delete
            </button>
          </div>
        )}

        {showTrades && (
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Reason</th>
                <th>USDT</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  Trade history is simulated – not stored.
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  } catch (err) {
    console.error("BotCard render error:", err);
    // Return a fallback card with the error message
    return (
      <div style={{ border: "1px solid red", padding: 16, margin: 10 }}>
        <h4>⚠️ Error rendering bot</h4>
        <p>{err.message}</p>
        <button onClick={() => setConfiguring(false)}>Close</button>
      </div>
    );
  }
}

// ---------- BotsContent (parent) ----------
function BotsContent() {
  const [bots, setBots] = useState([]);
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadUserAndBalance() {
      setBalanceLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No logged-in user");
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setBalance(Number(data?.balance) || 0);
      } catch (e) {
        setBalanceError(e.message);
      } finally {
        setBalanceLoading(false);
      }
    }
    loadUserAndBalance();

    const channel = supabase
      .channel("bots-profile-balance-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.id === user.id) {
              setBalance(Number(payload.new.balance) || 0);
            }
          });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleCreated = (bot) => setBots(prev => [bot, ...prev]);
  const handleUpdated = (bot, deletedId, newBalance) => {
    if (deletedId) {
      setBots(prev => prev.filter(b => b.id !== deletedId));
      return;
    }
    if (bot) setBots(prev => prev.map(b => b.id === bot.id ? bot : b));
    if (newBalance !== undefined) setBalance(newBalance);
  };

  const byType = (type) => bots.find(b => b.bot_type === type);
  const totalBots = Object.keys(BOT_META).length;
  const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;
  const statusLabel = meetsMinBalance ? "Ready" : "Locked";

  return (
    <>
      <div className="bots-hero">
        <div className="bots-hero-content">
          <h2>Automated Trading</h2>
          <p>Create and manage algorithmic trading strategies</p>
          <div className="bots-hero-stats">
            <div className="bots-hero-stat">
              <div className="bots-hero-stat-value">{totalBots}</div>
              <div className="bots-hero-stat-label">Total Bots</div>
            </div>
            <div className="bots-hero-stat">
              <div className="bots-hero-stat-value">
                {balanceLoading ? "…" : `$${Number(balance).toFixed(2)}`}
              </div>
              <div className="bots-hero-stat-label">Available Balance</div>
            </div>
            <div className="bots-hero-stat">
              <div
                className={`bots-hero-stat-value ${meetsMinBalance ? "up" : "down"}`}
              >
                {statusLabel}
              </div>
              <div className="bots-hero-stat-label">Bot Status</div>
            </div>
          </div>
        </div>
        <button className="btn bots-hero-cta">Create New Bot →</button>
      </div>

      {balanceError && <p className="error-text">{balanceError}</p>}

      <div className="dca-section-header">
        <div>
          <h3>Dollar-Cost Averaging Bots</h3>
          <p>Regular purchases of assets regardless of price</p>
        </div>
        <button className="btn btn-primary">Create DCA Bot</button>
      </div>

      <div className="bot-grid">
        <BotCard
          botType="btc_accumulation"
          bot={byType("btc_accumulation")}
          balance={balance}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          userId={userId}
        />
        <BotCard
          botType="eth_dca_pro"
          bot={byType("eth_dca_pro")}
          balance={balance}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          userId={userId}
        />
      </div>
    </>
  );
}

// ---------- Export with ErrorBoundary ----------
export default function Bots() {
  return (
    <ErrorBoundary>
      <BotsContent />
    </ErrorBoundary>
  );
}
