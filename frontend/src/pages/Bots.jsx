import { useState } from "react";
import { useBots } from "../context/BotsContext";

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

const RISK_CLASS = { Low: "risk-low", Medium: "risk-medium", High: "risk-high" };
const MIN_CONFIGURE_BALANCE = 5;

function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// Matches the "$-0.66" / "+$1.73" style used in the activity log
function fmtTradeUsd(v) {
  return v >= 0 ? `+$${v.toFixed(2)}` : `$-${Math.abs(v).toFixed(2)}`;
}

function fmtPercent(p) {
  return p >= 0 ? `+${p.toFixed(2)}%` : `-${Math.abs(p).toFixed(2)}%`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ---------- Config form ----------
function CreateBotForm({ meta, onCreate, onCancel }) {
  const [amount, setAmount] = useState(100);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(Number(amount));
  };

  return (
    <form className="bot-card" onSubmit={handleSubmit}>
      <div className="bot-head">
        <h3>{meta.icon} {meta.label}</h3>
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
        <p className="bot-min-balance-note" style={{ textAlign: "left", marginTop: 6 }}>
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
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
          Save Configuration
        </button>
      </div>
    </form>
  );
}

// ---------- Activity log (matches the dark inline-log look) ----------
function ActivityLog({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="activity-log">
        <p style={{ color: "var(--text-muted)", margin: 0 }}>No trades yet.</p>
      </div>
    );
  }
  return (
    <div className="activity-log">
      {trades.map((t) => (
        <div className="activity-log-row" key={t.id}>
          <span className="activity-log-time">{fmtTime(t.when)}</span>
          <span className={`activity-log-arrow ${t.isWin ? "up" : "down"}`}>
            {t.isWin ? "↑" : "↓"}
          </span>
          <span className="activity-log-label">Trade</span>
          <span className={`activity-log-amount ${t.isWin ? "up" : "down"}`}>
            {fmtTradeUsd(t.usdt)}
          </span>
          <span className={`activity-log-percent ${t.isWin ? "up" : "down"}`}>
            ({fmtPercent(t.percent)})
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- Bot Card ----------
function BotCard({ botType, bot, balance, error, onCreated, onStart, onStop, onRemove }) {
  const meta = BOT_META[botType];
  const [configuring, setConfiguring] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  if (!bot && configuring) {
    return (
      <CreateBotForm
        meta={meta}
        onCreate={(amount) => {
          onCreated(botType, amount);
          setConfiguring(false);
        }}
        onCancel={() => setConfiguring(false)}
      />
    );
  }

  const isActive = !!bot?.active;
  const badgeText = !bot ? "Not Configured" : isActive ? "active" : "Not Started";
  const badgeClass = !bot ? "off" : isActive ? "on" : "off";
  const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;
  const canConfigure = !!bot || meetsMinBalance;

  const pnl = bot?.pnl_usdt ?? 0;
  const wins = bot?.wins ?? 0;
  const losses = bot?.losses ?? 0;
  const trades = bot?.trades ?? [];

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
          <div className={`bot-stat-value ${RISK_CLASS[meta.risk] || ""}`}>{meta.risk}</div>
        </div>
        <div className="bot-stat-col">
          <div className="bot-stat-label">P&amp;L</div>
          <div className={`bot-stat-value ${pnl >= 0 ? "up" : "down"}`}>{fmtUsd(pnl)}</div>
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

      {error && (
        <p className="error-text" style={{ marginTop: 0 }}>
          {error}
        </p>
      )}

      {!bot ? (
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
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} disabled>
              ▶ Start Bot
            </button>
          </div>
          {!canConfigure && (
            <p className="bot-min-balance-note">
              Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to configure.
            </p>
          )}
        </>
      ) : !isActive ? (
        <div className="bot-card-buttons">
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onStart(botType)}
          >
            ▶ Start Bot
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onRemove(botType)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="bot-card-buttons">
          <button
            className="btn btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onStop(botType)}
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
            onClick={() => onRemove(botType)}
          >
            Delete
          </button>
        </div>
      )}

      {showTrades && <ActivityLog trades={trades} />}
    </div>
  );
}

export default function Bots() {
  const { balance, balanceLoading, balanceError, bots, botErrors, createBot, startBot, stopBot, removeBot } =
    useBots();

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
              <div className={`bots-hero-stat-value ${meetsMinBalance ? "up" : "down"}`}>
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
          bot={bots.btc_accumulation}
          balance={balance}
          error={botErrors.btc_accumulation}
          onCreated={createBot}
          onStart={startBot}
          onStop={stopBot}
          onRemove={removeBot}
        />
        <BotCard
          botType="eth_dca_pro"
          bot={bots.eth_dca_pro}
          balance={balance}
          error={botErrors.eth_dca_pro}
          onCreated={createBot}
          onStart={startBot}
          onStop={stopBot}
          onRemove={removeBot}
        />
      </div>
    </>
  );
}
