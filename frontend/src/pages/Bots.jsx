import { useState, useEffect, useMemo } from "react";
import { useBots } from "../context/BotsContext";

/* ------------------------------------------------------------------ */
/* Meta                                                               */
/* ------------------------------------------------------------------ */
const BOT_META = {
  btc_accumulation: {
    label: "Bitcoin Accumulation",
    symbol: "BTCUSDT",
    base: "BTC",
    icon: "₿",
    cadence: "Weekly • DCA",
    description: "Dollar-cost averaging into Bitcoin on a weekly basis.",
    risk: "Low",
  },
  eth_dca_pro: {
    label: "ETH DCA Pro",
    symbol: "ETHUSDT",
    base: "ETH",
    icon: "Ξ",
    cadence: "Daily • DCA",
    description: "Dynamic DCA based on RSI and volume indicators.",
    risk: "Medium",
  },
};

/* ------------------------------------------------------------------ */
/* Palette + shared style tokens (blue accent, dark cards)            */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0a0e1a",
  panel: "#121a2e",
  panelAlt: "#171f38",
  card: "#111",
  field: "#151515",
  line: "#1f1f1f",
  border: "#262f4a",
  accent: "#5b6ef5",
  accentSoft: "rgba(91, 110, 245, 0.14)",
  gain: "#35d0ba",
  loss: "#ff6b6b",
  text: "#e7ecfb",
  textMuted: "#8a93b3",
  dim: "#a3a8a6",
};

const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";

const RISK_COLOR = { Low: C.gain, Medium: "#f5c542", High: C.loss };
const RISK_TONE = { Low: "green", Medium: "amber", High: "red" };

const MIN_CONFIGURE_BALANCE = 5;
const MIN_AMOUNT = 50;
const LOG_LINES_SHOWN = 8;
const COMMENT_INTERVAL_MS = 3000;
const COMMENT_COLOR = "#3b82f6";
const BASE_PRICES = { BTC: 97500, ETH: 3400 };

/* ------------------------------------------------------------------ */
/* Style helpers                                                      */
/* ------------------------------------------------------------------ */
const baseBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "opacity 0.15s ease",
};

const btnVariant = {
  primary: { background: C.accent, color: "#fff", border: `1px solid ${C.accent}` },
  outline: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
  ghost: { background: "transparent", color: C.textMuted, border: "1px solid transparent" },
  danger: { background: "transparent", color: C.loss, border: "1px solid transparent" },
};

const btn = (variant, extra = {}) => ({
  ...baseBtn,
  ...(btnVariant[variant] || btnVariant.primary),
  ...extra,
});

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 24,
};

const badgeBase = {
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid",
  whiteSpace: "nowrap",
};
const badgeTones = {
  green: { color: C.gain, background: "rgba(53, 208, 186, 0.12)", borderColor: "rgba(53, 208, 186, 0.5)" },
  red: { color: C.loss, background: "rgba(255, 107, 107, 0.12)", borderColor: "rgba(255, 107, 107, 0.5)" },
  amber: { color: "#eab308", background: "rgba(234, 179, 8, 0.12)", borderColor: "rgba(234, 179, 8, 0.5)" },
  blue: { color: "#60a5fa", background: C.accentSoft, borderColor: "rgba(91, 110, 245, 0.5)" },
};
const badge = (tone) => ({ ...badgeBase, ...(badgeTones[tone] || badgeTones.blue) });

const pill = (state) => ({
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: MONO,
  ...(state === "on"
    ? { background: "rgba(53, 208, 186, 0.14)", color: C.gain }
    : { background: "rgba(138, 147, 179, 0.14)", color: C.textMuted }),
});

const hoverIn = (e) => { e.currentTarget.style.opacity = "0.9"; };
const hoverOut = (e) => { e.currentTarget.style.opacity = "1"; };

/* ------------------------------------------------------------------ */
/* Formatters & helpers                                               */
/* ------------------------------------------------------------------ */
function fmtUsd(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}
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
function calcWinRate(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  return total > 0 ? Math.round((wins / total) * 100) : null;
}
function getAllocation(bot) {
  if (!bot) return 0;
  return Number(bot.amount ?? bot.amount_usdt ?? bot.allocation ?? bot.buy_amount ?? 0) || 0;
}
function randomComment(base, price) {
  const p = price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const templates = [
    `Buy ${base} @ $${p}`,
    `Sell ${base} @ $${p}`,
    `Scanning ${base}/USDT order book`,
    `RSI signal confirmed on ${base}`,
    `Rebalancing ${base} allocation`,
    `Volume spike detected on ${base}`,
    `Executing DCA order for ${base}`,
    `Market trend: ${base} consolidating`,
    `Spread tightening on ${base}/USDT`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/* Mobile breakpoint hook (inline styles can't do media queries) */
function useIsNarrow(breakpoint = 640) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isNarrow;
}

/* ------------------------------------------------------------------ */
/* Bot picker                                                         */
/* ------------------------------------------------------------------ */
function BotPicker({ bots, onSelect, onClose }) {
  const isNarrow = useIsNarrow();
  return (
    <div style={{ ...cardStyle, marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: C.text }}>Choose a Bot</h3>
        <button style={btn("ghost")} onClick={onClose}>
          Cancel
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          gap: 16,
        }}
      >
        {Object.entries(BOT_META).map(([botType, meta]) => {
          const alreadyExists = !!bots[botType];
          return (
            <button
              key={botType}
              type="button"
              disabled={alreadyExists}
              onClick={() => onSelect(botType)}
              onMouseEnter={(e) => {
                if (!alreadyExists) e.currentTarget.style.borderColor = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.line;
              }}
              style={{
                background: C.field,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                padding: 20,
                textAlign: "left",
                cursor: alreadyExists ? "not-allowed" : "pointer",
                opacity: alreadyExists ? 0.55 : 1,
                fontFamily: "inherit",
                color: "inherit",
                transition: "border-color 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>
                  {meta.icon} {meta.label}
                </h3>
                {alreadyExists && <span style={badge("amber")}>configured</span>}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, fontFamily: MONO, marginBottom: 8 }}>
                {meta.cadence}
              </div>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create-bot config form                                             */
/* ------------------------------------------------------------------ */
function CreateBotForm({ meta, balance, onCreate, onCancel }) {
  const [amount, setAmount] = useState(100);
  const numAmount = Number(amount);
  const tooLow = !numAmount || numAmount < MIN_AMOUNT;
  const tooHigh = numAmount > Number(balance || 0);
  const invalid = tooLow || tooHigh;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (invalid) return;
    onCreate(numAmount);
  };

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: C.text }}>
          {meta.icon} {meta.label}
        </h3>
        <span style={pill("off")}>not active</span>
      </div>
      <div style={{ color: C.textMuted, fontSize: 13, fontFamily: MONO, marginBottom: 18 }}>
        {meta.symbol}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
          Allocation size (USDT)
        </label>
        <input
          type="number"
          min={MIN_AMOUNT}
          max={Number(balance || 0)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            color: C.text,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <p style={{ color: C.textMuted, fontSize: 12, margin: "6px 0 0", textAlign: "left" }}>
          Min amount: ${MIN_AMOUNT} · Available balance: ${Number(balance || 0).toFixed(2)}
        </p>
        {tooHigh && (
          <p style={{ color: C.loss, fontSize: 13, margin: "6px 0 0" }}>
            Allocation exceeds your available balance.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" style={btn("outline", { flex: 1 })} onClick={onCancel}>
          Cancel
        </button>
        <button
          style={btn("primary", {
            flex: 1,
            opacity: invalid ? 0.5 : 1,
            cursor: invalid ? "not-allowed" : "pointer",
          })}
          disabled={invalid}
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Activity log (real trades + blue commentary)                       */
/* ------------------------------------------------------------------ */
function ActivityLog({ trades, active, base }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!active) return;
    let price = BASE_PRICES[base] || 100;
    const iv = setInterval(() => {
      price = price * (1 + (Math.random() - 0.5) * 0.004);
      setComments((prev) =>
        [{ id: `c-${Date.now()}`, ts: Date.now(), msg: randomComment(base, price) }, ...prev].slice(
          0,
          LOG_LINES_SHOWN
        )
      );
    }, COMMENT_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [active, base]);

  const lines = useMemo(() => {
    const tradeLines = (trades || []).slice(0, LOG_LINES_SHOWN).map((t) => ({
      kind: "trade",
      id: `t-${t.id}`,
      ts: new Date(t.when).getTime(),
      trade: t,
    }));
    const commentLines = comments.map((c) => ({ kind: "comment", ...c }));
    return [...tradeLines, ...commentLines].sort((a, b) => b.ts - a.ts).slice(0, LOG_LINES_SHOWN);
  }, [trades, comments]);

  return (
    <div
      style={{
        marginTop: 16,
        background: "#080808",
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${C.line}`,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: C.textMuted,
        }}
      >
        Activity Log
      </div>
      <div
        style={{
          padding: "10px 14px",
          maxHeight: 200,
          overflowY: "auto",
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {lines.length === 0 ? (
          <p style={{ color: C.textMuted, margin: 0, fontSize: 13 }}>
            {active
              ? "Bot is running — activity will appear here."
              : "No trades yet — start the bot to see activity."}
          </p>
        ) : (
          lines.map((line) =>
            line.kind === "comment" ? (
              <div
                key={line.id}
                style={{
                  display: "flex",
                  gap: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "#4a4a4a", minWidth: 74, display: "inline-block" }}>
                  {fmtTime(line.ts)}
                </span>
                <span style={{ color: COMMENT_COLOR }}>{line.msg}</span>
              </div>
            ) : (
              <div
                key={line.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "#4a4a4a", minWidth: 74, display: "inline-block" }}>
                  {fmtTime(line.trade.when)}
                </span>
                <span style={{ color: line.trade.isWin ? C.gain : C.loss }}>
                  {line.trade.isWin ? "↑" : "↓"}
                </span>
                <span style={{ color: C.text, fontWeight: 500 }}>Trade</span>
                <span style={{ color: line.trade.isWin ? C.gain : C.loss }}>
                  {fmtTradeUsd(line.trade.usdt)}
                </span>
                <span style={{ color: line.trade.isWin ? C.gain : C.loss }}>
                  ({fmtPercent(line.trade.percent)})
                </span>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bot card                                                           */
/* ------------------------------------------------------------------ */
function BotCard({
  botType,
  bot,
  balance,
  error,
  configuring,
  onConfigureStart,
  onConfigureCancel,
  onCreated,
  onStart,
  onStop,
  onRemove,
}) {
  const meta = BOT_META[botType];
  const isNarrow = useIsNarrow();

  if (!bot && configuring) {
    return (
      <CreateBotForm
        meta={meta}
        balance={balance}
        onCreate={(amount) => {
          onCreated(botType, amount);
          onConfigureCancel();
        }}
        onCancel={onConfigureCancel}
      />
    );
  }

  const isActive = !!bot?.active;
  const badgeText = !bot ? "Not Configured" : isActive ? "running" : "stopped";
  const badgeTone = !bot ? "blue" : isActive ? "green" : "amber";
  const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;
  const canConfigure = !!bot || meetsMinBalance;

  const pnl = bot?.pnl_usdt ?? 0;
  const wins = bot?.wins ?? 0;
  const losses = bot?.losses ?? 0;
  const trades = bot?.trades ?? [];
  const winRate = calcWinRate(wins, losses);
  const allocation = getAllocation(bot);

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
          {meta.icon} {meta.label}
        </h3>
        <span style={badge(badgeTone)}>{badgeText}</span>
      </div>
      <div style={{ color: C.textMuted, fontSize: 13, fontFamily: MONO, marginBottom: 8 }}>
        {meta.cadence}
      </div>
      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, margin: "0 0 18px" }}>
        {meta.description}
      </p>

      {/* Stats row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {[
          { label: "Risk", value: meta.risk, color: RISK_COLOR[meta.risk], mono: false },
          { label: "P&L", value: fmtUsd(pnl), color: pnl >= 0 ? C.gain : C.loss, mono: true },
          { label: "Wins", value: wins, color: C.gain, mono: true },
          { label: "Losses", value: losses, color: C.loss, mono: true },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>{s.label}</div>
            <div
              style={{
                fontFamily: s.mono ? MONO : "inherit",
                fontSize: 15,
                fontWeight: 700,
                color: s.color,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Stats row 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>Win Rate</div>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.text }}>
            {winRate !== null ? `${winRate}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>Allocated</div>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.text }}>
            {bot ? `$${allocation.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      {error && <p style={{ color: C.loss, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

      {!bot ? (
        <>
          <div style={{ display: "flex", gap: 10, flexDirection: isNarrow ? "column" : "row" }}>
            <button
              style={btn("primary", {
                flex: 1,
                opacity: canConfigure ? 1 : 0.5,
                cursor: canConfigure ? "pointer" : "not-allowed",
              })}
              disabled={!canConfigure}
              onClick={onConfigureStart}
              onMouseEnter={canConfigure ? hoverIn : undefined}
              onMouseLeave={canConfigure ? hoverOut : undefined}
            >
              Configure
            </button>
            <button
              style={btn("outline", { flex: 1, opacity: 0.5, cursor: "not-allowed" })}
              disabled
            >
              Start Bot
            </button>
          </div>
          {!canConfigure && (
            <p style={{ color: C.textMuted, fontSize: 12, margin: "8px 0 0", textAlign: "center" }}>
              Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to configure.
            </p>
          )}
        </>
      ) : !isActive ? (
        <div style={{ display: "flex", gap: 10, flexDirection: isNarrow ? "column" : "row" }}>
          <button
            style={btn("primary", { flex: 1 })}
            onClick={() => onStart(botType)}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
          >
            Start Bot
          </button>
          <button style={btn("outline", { flex: 1 })} onClick={() => onRemove(botType)}>
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexDirection: isNarrow ? "column" : "row" }}>
          <button style={btn("outline", { flex: 1 })} onClick={() => onStop(botType)}>
            Stop
          </button>
          <button style={btn("danger")} onClick={() => onRemove(botType)}>
            Delete
          </button>
        </div>
      )}

      {bot && <ActivityLog trades={trades} active={isActive} base={meta.base} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function Bots() {
  const {
    balance,
    balanceLoading,
    balanceError,
    bots,
    botErrors,
    createBot,
    startBot,
    stopBot,
    removeBot,
  } = useBots();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [configuringType, setConfiguringType] = useState(null);
  const isNarrow = useIsNarrow();

  const totalBots = Object.keys(BOT_META).length;
  const meetsMinBalance = Number(balance) >= MIN_CONFIGURE_BALANCE;
  const statusLabel = meetsMinBalance ? "Ready" : "Locked";

  const totals = useMemo(() => {
    const all = Object.values(bots || {}).filter(Boolean);
    const pnl = all.reduce((s, b) => s + (b.pnl_usdt || 0), 0);
    const wins = all.reduce((s, b) => s + (b.wins || 0), 0);
    const losses = all.reduce((s, b) => s + (b.losses || 0), 0);
    const allocated = all.reduce((s, b) => s + getAllocation(b), 0);
    return { pnl, trades: wins + losses, winRate: calcWinRate(wins, losses), allocated };
  }, [bots]);

  const handlePickBot = (botType) => {
    setConfiguringType(botType);
    setPickerOpen(false);
  };

  const heroStats = [
    { value: totalBots, label: "Total Bots", color: "#fff" },
    {
      value: balanceLoading ? "…" : `$${Number(balance).toFixed(2)}`,
      label: "Available Balance",
      color: "#fff",
    },
    { value: fmtUsd(totals.pnl), label: "P&L", color: totals.pnl >= 0 ? C.gain : C.loss },
    {
      value: totals.winRate !== null ? `${totals.winRate}%` : "—",
      label: "Win Rate",
      color: "#fff",
    },
    { value: totals.trades, label: "Trades", color: "#fff" },
    { value: `$${totals.allocated.toFixed(0)}`, label: "Allocated", color: "#fff" },
    { value: statusLabel, label: "Bot Status", color: meetsMinBalance ? C.gain : C.loss },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 0 32px", color: C.text }}>
      {/* Hero banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.accent}, #3a4bc4)`,
          borderRadius: 20,
          padding: isNarrow ? 20 : "32px 36px",
          marginBottom: 28,
        }}
      >
        <h2 style={{ fontSize: isNarrow ? 22 : 28, margin: "0 0 6px", color: "#fff" }}>
          Automated Trading
        </h2>
        <p style={{ color: "rgba(255,255,255,0.85)", margin: "0 0 20px", fontSize: 14 }}>
          Create and manage algorithmic trading strategies
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: isNarrow ? 16 : 36 }}>
          {heroStats.map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: isNarrow ? 18 : 22,
                  fontWeight: 700,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {balanceError && <p style={{ color: C.loss, fontSize: 13, margin: "0 0 12px" }}>{balanceError}</p>}

      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: isNarrow ? "stretch" : "flex-start",
          justifyContent: "space-between",
          flexDirection: isNarrow ? "column" : "row",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 20, color: C.text }}>
            Dollar-Cost Averaging Bots
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
            Regular purchases of assets regardless of price
          </p>
        </div>
        <button
          style={btn("primary", { width: isNarrow ? "100%" : undefined })}
          onClick={() => setPickerOpen(true)}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          Create New Bot
        </button>
      </div>

      {pickerOpen && (
        <BotPicker bots={bots} onSelect={handlePickBot} onClose={() => setPickerOpen(false)} />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          gap: 20,
        }}
      >
        <BotCard
          botType="btc_accumulation"
          bot={bots.btc_accumulation}
          balance={balance}
          error={botErrors.btc_accumulation}
          configuring={configuringType === "btc_accumulation"}
          onConfigureStart={() => setConfiguringType("btc_accumulation")}
          onConfigureCancel={() => setConfiguringType(null)}
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
          configuring={configuringType === "eth_dca_pro"}
          onConfigureStart={() => setConfiguringType("eth_dca_pro")}
          onConfigureCancel={() => setConfiguringType(null)}
          onCreated={createBot}
          onStart={startBot}
          onStop={stopBot}
          onRemove={removeBot}
        />
      </div>

      <p style={{ color: C.textMuted, fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
        Automated bots trade based on your configuration and market conditions. Past performance
        does not guarantee future results. Only allocate funds you can afford to have at risk.
      </p>
    </div>
  );
}
