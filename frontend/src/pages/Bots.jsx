import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// ---------- Error Boundary (same as before) ----------
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

const MIN_CONFIGURE_BALANCE = 5;

function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ---------- Simplified Configuration Form (inline styles, no classes) ----------
function CreateBotForm({ meta, onCreated, onCancel }) {
  console.log("CreateBotForm received meta:", meta);

  // If meta is invalid, show an error message
  if (!meta || typeof meta !== "object") {
    return (
      <div style={{ border: "1px solid red", padding: 20, color: "red" }}>
        <strong>Error:</strong> Missing bot metadata
      </div>
    );
  }

  const [amount, setAmount] = useState(100);

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
    if (typeof onCreated === "function") {
      onCreated(bot);
    } else {
      console.error("onCreated is not a function", onCreated);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #ccc", padding: 20, margin: 10 }}>
      <h3>{meta.icon} {meta.label}</h3>
      <div>Symbol: {meta.symbol}</div>
      <div style={{ marginTop: 10 }}>
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
        <button type="submit">Save Configuration</button>
      </div>
    </form>
  );
}

// ---------- Bot Card (stripped down) ----------
function BotCard({ botType, bot, balance, onCreated, onUpdated, userId }) {
  const meta = BOT_META[botType];
  const [configuring, setConfiguring] = useState(false);
  const intervalRef = useRef(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // If no bot and configuring, show the form
  if (!bot && configuring) {
    if (!meta) {
      return <div style={{ color: "red" }}>Metadata missing for {botType}</div>;
    }
    return (
      <CreateBotForm
        meta={meta}
        onCreated={(newBot) => {
          if (typeof onCreated === "function") onCreated(newBot);
          setConfiguring(false);
        }}
        onCancel={() => setConfiguring(false)}
      />
    );
  }

  if (!meta) {
    return <div style={{ color: "red" }}>Metadata missing for {botType}</div>;
  }

  const isActive = bot?.active || false;
  const badgeText = !bot ? "Not Configured" : isActive ? "active" : "Not Started";
  const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;

  // ---------- Trade Simulation ----------
  const executeTrade = async () => {
    if (!bot || !isActive) return;
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
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (error) throw error;
      if (typeof onUpdated === "function") onUpdated(updatedBot, null, newBalance);
    } catch (err) {
      console.error("Balance update failed:", err);
      if (typeof onUpdated === "function") onUpdated(updatedBot, null, balance);
    }
  };

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

  return (
    <div style={{ border: "1px solid #ddd", padding: 15, margin: 10 }}>
      <h3>{meta.label} ({badgeText})</h3>
      <div>Risk: {meta.risk} | P&L: {fmtUsd(bot?.pnl_usdt || 0)} | Wins: {bot?.wins || 0} | Losses: {bot?.losses || 0}</div>

      {!isActive ? (
        <div>
          <button
            disabled={!meetsMinBalance && !bot}
            onClick={() => setConfiguring(true)}
            style={{ marginRight: 10 }}
          >
            ⚙️ Configure
          </button>
          <button
            disabled={!bot}
            onClick={toggleActive}
          >
            ▶ Start Bot
          </button>
          {!meetsMinBalance && !bot && (
            <p style={{ color: "#666" }}>Requires balance ≥ ${MIN_CONFIGURE_BALANCE}</p>
          )}
        </div>
      ) : (
        <div>
          <button onClick={toggleActive} style={{ marginRight: 10 }}>Pause</button>
          <button onClick={remove}>Delete</button>
        </div>
      )}
    </div>
  );
}

// ---------- Parent Component (BotsContent) ----------
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

  return (
    <>
      <h2>Automated Trading</h2>
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div>Total Bots: {totalBots}</div>
        <div>Balance: {balanceLoading ? "…" : `$${Number(balance).toFixed(2)}`}</div>
        <div>Status: {meetsMinBalance ? "Ready" : "Locked"}</div>
      </div>
      {balanceError && <p style={{ color: "red" }}>{balanceError}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
