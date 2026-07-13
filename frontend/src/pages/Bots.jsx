
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

// Minimum balance required before a bot can be configured
const MIN_CONFIGURE_BALANCE = 5;

function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function BotProgress({ step }) {
  // step: 1 = needs configuring, 2 = configured / ready to start or running
  return (
    <div className="bot-progress">
      <div className="bot-progress-step">
        <span className={`bot-progress-dot ${step >= 1 ? "done" : ""}`}>1</span>
        <span
          className={
            step >= 1 ? "bot-progress-label active" : "bot-progress-label"
          }
        >
          Configure
        </span>
      </div>
      <div className={`bot-progress-line ${step >= 2 ? "done" : ""}`} />
      <div className="bot-progress-step">
        <span className={`bot-progress-dot ${step >= 2 ? "done" : ""}`}>2</span>
        <span
          className={
            step >= 2 ? "bot-progress-label active" : "bot-progress-label"
          }
        >
          Start Bot
        </span>
      </div>
    </div>
  );
}

function CreateBotForm({ botType, onCreated, onCancel }) {
  const meta = BOT_META[botType];
  const [amount, setAmount] = useState(25);
  const [interval, setInterval_] = useState(24);
  const [dip, setDip] = useState(3);
  const [useRsi, setUseRsi] = useState(false);
  const [rsiLevel, setRsiLevel] = useState(35);

  function handleSubmit(e) {
    e.preventDefault();
    const bot = {
      id: `${botType}-${Date.now()}`,
      bot_type: botType,
      amount_usdt: Number(amount),
      interval_hours: Number(interval),
      dip_threshold_pct: Number(dip),
      use_rsi_filter: useRsi,
      rsi_buy_below: Number(rsiLevel),
      active: false,
      pnl_usdt: 0,
      wins: 0,
      losses: 0,
    };
    onCreated(bot);
  }

  return (
    <form className="bot-card" onSubmit={handleSubmit}>
      <div className="bot-head">
        <h3>
          {meta.icon} {meta.label}
        </h3>
        <span className="status-pill off">not active</span>
      </div>
      <div className="bot-symbol">{meta.symbol}</div>

      <div className="form-row">
        <div className="field">
          <label>Buy amount (USDT)</label>
          <input
            type="number"
            min="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Interval (hours)</label>
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval_(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>Extra buy on dip from recent high (%) — 0 to disable</label>
        <input
          type="number"
          min="0"
          value={dip}
          onChange={(e) => setDip(e.target.value)}
        />
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={useRsi}
            onChange={(e) => setUseRsi(e.target.checked)}
            style={{ width: "auto" }}
          />
          Require RSI oversold confirmation for dip buys
        </label>
      </div>

      {useRsi && (
        <div className="field">
          <label>Buy when RSI(14) is below</label>
          <input
            type="number"
            min="1"
            max="100"
            value={rsiLevel}
            onChange={(e) => setRsiLevel(e.target.value)}
          />
        </div>
      )}

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
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
}

function BotCard({ botType, bot, balance, onCreated, onUpdated }) {
  const meta = BOT_META[botType];
  const [configuring, setConfiguring] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  if (!bot && configuring) {
    return (
      <CreateBotForm
        botType={botType}
        onCreated={(newBot) => {
          onCreated(newBot);
          setConfiguring(false);
        }}
        onCancel={() => setConfiguring(false)}
      />
    );
  }

  const isActive = !!bot?.active;
  const step = bot ? 2 : 1;
  const badgeText = !bot
    ? "Not Configured"
    : isActive
      ? "active"
      : "Not Started";
  const badgeClass = !bot ? "off" : isActive ? "on" : "off";
  const meetsMinBalance =
    balance !== null && Number(balance) >= MIN_CONFIGURE_BALANCE;
  const canConfigure = !!bot || meetsMinBalance;

  // Real performance figures only — these start at 0 for a new bot with no trade history.
  // These should only ever be updated from actual executed trades once the
  // Binance API integration is wired in — never simulated or randomized.
  const pnl = bot?.pnl_usdt ?? 0;
  const wins = bot?.wins ?? 0;
  const losses = bot?.losses ?? 0;

  function toggleActive() {
    onUpdated({ ...bot, active: !bot.active });
  }

  function remove() {
    if (!confirm(`Delete ${meta.label}? This stops the bot permanently.`))
      return;
    onUpdated(null, bot.id);
  }

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

      <BotProgress step={step} />

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
              Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to
              configure.
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
                No trades yet.
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Bots() {
  const [bots, setBots] = useState([]);

  // Real balance, pulled from Supabase (profiles.balance) — same field
  // the admin panel edits and the Dashboard reads.
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");

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

    loadBalance();

    // Keep this page in sync if the admin panel updates the balance
    // while the user is on it.
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleCreated(bot) {
    setBots((prev) => [bot, ...prev]);
  }

  function handleUpdated(bot, deletedId) {
    if (deletedId)
      return setBots((prev) => prev.filter((b) => b.id !== deletedId));
    setBots((prev) => prev.map((b) => (b.id === bot.id ? bot : b)));
  }

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
        />
        <BotCard
          botType="eth_dca_pro"
          bot={byType("eth_dca_pro")}
          balance={balance}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      </div>
    </>
  );
}
