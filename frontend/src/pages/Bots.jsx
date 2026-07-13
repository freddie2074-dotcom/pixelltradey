import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// ---------- Error Boundary ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ info: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: "#f8d7da", color: "#721c24" }}>
          <h3>Something went wrong</h3>
          <p><strong>Error:</strong> {this.state.error?.message || "Unknown error"}</p>
          <details style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>
            <summary>Stack trace</summary>
            {this.state.error?.stack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: 10 }}>
            Reload page
          </button>
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

// ---------- Configuration Form (with extra checks) ----------
function CreateBotForm({ botType, onCreated, onCancel }) {
  // Guard: ensure meta exists
  const meta = BOT_META[botType];
  if (!meta) {
    return <div className="error-text">❌ Unknown bot type: {botType}</div>;
  }

  const [amount, setAmount] = useState(100);

  const handleSubmit = (e) => {
    e.preventDefault();
    const bot = {
      id: `${botType}-${Date.now()}`,
      bot_type: botType,
      amount_usdt: Number(amount),
      active: false,
      pnl_usdt: 0,
      wins: 0,
      losses: 0,
    };
    // Ensure onCreated is a function
    if (typeof onCreated === "function") {
      onCreated(bot);
    } else {
      console.error("onCreated is not a function", onCreated);
    }
  };

  return (
    <form className="bot-card" onSubmit={handleSubmit}>
      <div className="bot-head">
        <h3>
          {meta.icon} {meta.label}
        </h3>
        <span className="status-pill off">not active</span>
      </div>
      <div className="bot-symbol">{meta.symbol}</div>

      <div className="field">
        <label>Buy amount (USDT)</label>
        <input
          type="number"
          min="50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
          Min amount: $50
        </p>
      </div>

      <div className="bot-card-buttons">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
}

// ---------- Individual Bot Card ----------
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

  // If no bot and we are configuring, show the form
  if (!bot && configuring) {
    return (
      <CreateBotForm
        botType={botType}
        onCreated={(newBot) => {
          if (typeof onCreated === "function") {
            onCreated(newBot);
          }
          setConfiguring(false);
        }}
        onCancel={() => setConfiguring(false)}
      />
    );
  }

  // Guard if meta is missing (should not happen)
  if (!meta) {
    return <div className="error-text">❌ Bot metadata missing for {botType}</div>;
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

    const winRate = 0.57 + Math.random() * 0.07;
    const isWin = Math.random() < winRate;
    const pnlPercent = (Math.random() * 10 - 5) / 100;
    const tradeAmount = bot.amount_usdt;
    const tradePnl = tradeAmount * pnlPercent;

    const updatedBot = {
      ...bot,
      pnl_usdt: bot.pnl_usdt + tradePnl,
      wins: isWin ? bot.wins + 1 : bot.wins,
      losses: isWin ? bot.losses : bot.losses + 1,
    };

    const newBalance = Number(balance) + tradePnl;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (error) throw error;
      if (typeof onUpdated === "function") {
        onUpdated(updatedBot, null, newBalance);
      }
    } catch (err) {
      console.error("Balance update failed:", err);
      if (typeof onUpdated === "function") {
        onUpdated(updatedBot, null, balance);
      }
    }
  };

  // Start/stop interval
  useEffect(() => {
    if (isActive && bot) {
      intervalRef.current = setInterval(executeTrade, 10000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, bot]);

  // Handlers
  const toggleActive = () => {
    if (bot && typeof onUpdated === "function") {
      onUpdated({ ...bot, active: !bot.active });
    }
  };

  const remove = () => {
    if (!confirm(`Delete ${meta.label}? This stops the bot permanently.`)) return;
    if (typeof onUpdated === "function") {
      onUpdated(null, bot?.id);
    }
  };

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
}

// ---------- Parent Component ----------
function BotsContent() {
  const [bots, setBots] = useState([]);
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadUserAndBalance() {
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreated = (bot) => {
    setBots((prev) => [bot, ...prev]);
  };

  const handleUpdated = (bot, deletedId, newBalance) => {
    if (deletedId) {
      setBots((prev) => prev.filter((b) => b.id !== deletedId));
      return;
    }
    if (bot) {
      setBots((prev) => prev.map((b) => (b.id === bot.id ? bot : b)));
    }
    if (newBalance !== undefined) {
      setBalance(newBalance);
    }
  };

  const byType = (type) => bots.find((b) => b.bot_type === type);
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
