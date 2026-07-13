import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const BOT_META = {
  btc_accumulation: {
    label: "Bitcoin Accumulation",
    symbol: "BTCUSDT",
    icon: "₿",
    cadence: "Weekly • DCA",
    description: "Dollar-cost averaging into Bitcoin on a weekly basis.",
    risk: "Low",
    basePrice: 65000,
  },
  eth_dca_pro: {
    label: "ETH DCA Pro",
    symbol: "ETHUSDT",
    icon: "Ξ",
    cadence: "Daily • DCA",
    description: "Dynamic DCA based on RSI and volume indicators.",
    risk: "Medium",
    basePrice: 3400,
  },
};

const RISK_CLASS = {
  Low: "risk-low",
  Medium: "risk-medium",
  High: "risk-high",
};

// Minimum balance required before a bot can be configured
const MIN_CONFIGURE_BALANCE = 5;
const MAX_TRADES_SHOWN = 20;

function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---------- Config form: just the buy amount ----------
function CreateBotForm({ botType, meta, onCreate, onCancel, busy }) {
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
      trades: [],
    };
    onCreate(bot);
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
          autoFocus
        />
        <p
          className="bot-min-balance-note"
          style={{ textAlign: "left", marginTop: 6 }}
        >
          Min amount: $50
        </p>
      </div>

      <div className="bot-card-buttons">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          style={{ flex: 1, justifyContent: "center" }}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}

// ---------- Bot Card ----------
function BotCard({ botType, bot, balance, userId, onCreated, onUpdated }) {
  const meta = BOT_META[botType];

  // --- hooks first, unconditionally, fixed order ---
  const [configuring, setConfiguring] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef(null);

  const isActive = !!bot?.active;

  const executeTrade = async () => {
    if (!bot || !isActive || !userId) return;
    try {
      // Win rate 60%–67%
      const winRate = 0.6 + Math.random() * 0.07;
      const isWin = Math.random() < winRate;

      // P&L direction matches win/loss outcome
      const pnlPercent = isWin
        ? 0.005 + Math.random() * 0.025 // +0.5% to +3%
        : -(0.005 + Math.random() * 0.025); // -0.5% to -3%
      const tradePnl = bot.amount_usdt * pnlPercent;

      // Simulated fill price around the asset's base price
      const price = meta.basePrice * (1 + (Math.random() * 0.02 - 0.01));

      const { data: newBalance, error } = await supabase.rpc(
        "increment_balance",
        { p_user_id: userId, p_amount: tradePnl }
      );
      if (error) throw error;

      const newTrade = {
        id: `${bot.id}-${Date.now()}`,
        when: Date.now(),
        reason: isWin ? "Win" : "Loss",
        usdt: tradePnl,
        price,
      };

      const updatedBot = {
        ...bot,
        pnl_usdt: bot.pnl_usdt + tradePnl,
        wins: isWin ? bot.wins + 1 : bot.wins,
        losses: isWin ? bot.losses : bot.losses + 1,
        trades: [newTrade, ...(bot.trades || [])].slice(0, MAX_TRADES_SHOWN),
      };
      onUpdated(updatedBot, null, newBalance);
    } catch (err) {
      console.error("Trade execution failed:", err);
    }
  };

  useEffect(() => {
    if (isActive && bot) {
      intervalRef.current = setInterval(executeTrade, 10000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, bot]);

  // --- now safe to branch on what to render ---

  if (!bot && configuring) {
    return (
      <CreateBotForm
        botType={botType}
        meta={meta}
        busy={busy}
        onCreate={async (newBot) => {
          setBusy(true);
          try {
            // Move the allocated amount out of available balance
            const { data: newBalance, error } = await supabase.rpc(
              "increment_balance",
              { p_user_id: userId, p_amount: -newBot.amount_usdt }
            );
            if (error) throw error;
            onCreated(newBot, newBalance);
            setConfiguring(false);
          } catch (err) {
            alert(err.message || "Could not allocate funds to this bot.");
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setConfiguring(false)}
      />
    );
  }

  const badgeText = !bot ? "Not Configured" : isActive ? "active" : "Not Started";
  const badgeClass = !bot ? "off" : isActive ? "on" : "off";
  const meetsMinBalance =
    balance !== null && Number(balance) >= MIN_CONFIGURE_BALANCE;
  const canConfigure = !!bot || meetsMinBalance;

  const pnl = bot?.pnl_usdt ?? 0;
  const wins = bot?.wins ?? 0;
  const losses = bot?.losses ?? 0;
  const trades = bot?.trades ?? [];

  const toggleActive = () => {
    onUpdated({ ...bot, active: !bot.active });
  };

  const cancelOrRemove = async (confirmMsg) => {
    if (!confirm(confirmMsg)) return;
    try {
      // Return the original allocated principal to available balance.
      // Realized trade P&L was already applied to balance as trades happened.
      const { data: newBalance, error } = await supabase.rpc(
        "increment_balance",
        { p_user_id: userId, p_amount: bot.amount_usdt }
      );
      if (error) throw error;
      onUpdated(null, bot.id, newBalance);
    } catch (err) {
      console.error("Failed to return funds:", err);
      alert("Couldn't return funds — please try again.");
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
          <div className="bot-stat-label">P&amp;L</div>
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

      {!bot ? (
        // Never configured yet
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
              disabled
            >
              ▶ Start Bot
            </button>
          </div>
          {!canConfigure && (
            <p className="bot-min-balance-note">
              Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to
              configure.
            </p>
          )}
        </>
      ) : !isActive ? (
        // Configured, saved, but not started yet
        <div className="bot-card-buttons">
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={toggleActive}
          >
            ▶ Start Bot
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() =>
              cancelOrRemove(`Cancel ${meta.label} configuration? Your allocated funds will be returned.`)
            }
          >
            Cancel
          </button>
        </div>
      ) : (
        // Running
        <div className="bot-card-buttons">
          <button
            className="btn btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={toggleActive}
          >
            ■ Stop
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
            onClick={() =>
              cancelOrRemove(`Delete ${meta.label}? This stops the bot and returns your allocated funds.`)
            }
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
            {trades.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No trades yet.
                </td>
              </tr>
            ) : (
              trades.map((t) => (
                <tr key={t.id}>
                  <td>{fmtTime(t.when)}</td>
                  <td className={t.reason === "Win" ? "up" : "down"}>
                    {t.reason}
                  </td>
                  <td className={t.usdt >= 0 ? "up" : "down"}>
                    {fmtUsd(t.usdt)}
                  </td>
                  <td>${t.price.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Bots() {
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

    // Keep in sync with admin panel / dashboard edits
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

  const handleCreated = (bot, newBalance) => {
    setBots((prev) => [bot, ...prev]);
    if (newBalance !== undefined) setBalance(newBalance);
  };

  const handleUpdated = (bot, deletedId, newBalance) => {
    if (deletedId) {
      setBots((prev) => prev.filter((b) => b.id !== deletedId));
    } else if (bot) {
      setBots((prev) => prev.map((b) => (b.id === bot.id ? bot : b)));
    }
    if (newBalance !== undefined) setBalance(newBalance);
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
          userId={userId}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
        <BotCard
          botType="eth_dca_pro"
          bot={byType("eth_dca_pro")}
          balance={balance}
          userId={userId}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      </div>
    </>
  );
}
