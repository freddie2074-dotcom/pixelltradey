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
/* Palette — blue-navy, pulled from root.css                          */
/*   --bg        #0a0e1a  page background                             */
/*   --panel     #121a2e  card background                             */
/*   --panel-alt #171f38  item / secondary background                 */
/*   --border    #262f4a  border                                      */
/*   --accent    #5b6ef5  blue accent                                 */
/*   --gain      #35d0ba  data: gain  (teal, sits in the blue family) */
/*   --loss      #ff6b6b  data: loss                                  */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0a0e1a",
  panel: "#121a2e",
  panelAlt: "#171f38",
  field: "#0a0e1a",
  border: "#262f4a",
  borderSoft: "#2f3a5a",
  accent: "#5b6ef5",
  accentSoft: "rgba(91, 110, 245, 0.14)",
  accentRing: "rgba(91, 110, 245, 0.5)",
  blueBright: "#60a5fa",
  gain: "#35d0ba",
  loss: "#ff6b6b",
  text: "#e7ecfb",
  textMuted: "#8a93b3",
  logBg: "#060a14",
  iconBg: "#1e2740",
  iconBorder: "#2f3a5a",
};

const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";

const MIN_CONFIGURE_BALANCE = 5;
const MIN_AMOUNT = 50;
const LOG_LINES_SHOWN = 8;
const COMMENT_INTERVAL_MS = 3000;
const COMMENT_COLOR = "#3b82f6";
const BASE_PRICES = { BTC: 97500, ETH: 3400 };
const RISK_TONE = { Low: "green", Medium: "amber", High: "red" };

/* ------------------------------------------------------------------ */
/* Inline icons                                                       */
/* ------------------------------------------------------------------ */
const svgBase = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function BotIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase}>
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
function ActivityIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function PlayIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function SquareIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  );
}
function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Container tokens — layout mirrors .bots/*, colors are blue-navy    */
/* ------------------------------------------------------------------ */
const cardBase = {
  background: C.panel,               /* #121a2e — was #111 */
  border: `1px solid ${C.border}`,    /* #262f4a — was #1f1f1f */
  borderRadius: 16,
  overflow: "hidden",
};

const cheadStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 20,
  borderBottom: `1px solid ${C.border}`,
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  textTransform: "uppercase",
  color: C.text,
};

const itemStyle = {
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) auto",
  columnGap: 14,
  rowGap: 14,
  alignItems: "start",
  padding: 16,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  background: C.panelAlt,            /* #171f38 — was #0f0f0f */
};

const icoStyle = {
  display: "grid",
  placeItems: "center",
  width: 48,
  height: 48,
  borderRadius: 10,
  border: `1px solid ${C.iconBorder}`,  /* #2f3a5a — was #202020 */
  background: C.iconBg,                /* #1e2740 — was #181818 */
  color: "#cfd3d1",
};

const badgeBase = {
  padding: "4px 11px",
  borderRadius: 6,
  border: "1px solid",
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};
const badgeTones = {
  blue: { color: C.blueBright, background: C.accentSoft, borderColor: C.accentRing },
  green: { color: C.gain, background: "rgba(53, 208, 186, 0.12)", borderColor: "rgba(53, 208, 186, 0.5)" },
  red: { color: C.loss, background: "rgba(255, 107, 107, 0.12)", borderColor: "rgba(255, 107, 107, 0.5)" },
  amber: { color: "#eab308", background: "rgba(234, 179, 8, 0.12)", borderColor: "rgba(234, 179, 8, 0.5)" },
};
const badge = (tone) => ({ ...badgeBase, ...(badgeTones[tone] || badgeTones.blue) });

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 38,
  padding: "0 18px",
  borderRadius: 8,
  border: "1px solid transparent",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "opacity 0.15s",
};
const btnVariants = {
  primary: { background: C.accent, color: "#fff", border: `1px solid ${C.accent}` },
  outline: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
  danger: { background: C.panelAlt, color: "#d4d8d6", border: `1px solid ${C.border}` },
};
const btn = (variant, extra = {}) => ({ ...btnBase, ...btnVariants[variant], ...extra });

const hoverIn = (e) => { e.currentTarget.style.opacity = "0.9"; };
const hoverOut = (e) => { e.currentTarget.style.opacity = "1"; };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
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

function useIsNarrow(breakpoint = 800) {
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
/* Stat cell                                                          */
/* ------------------------------------------------------------------ */
function Stat({ label, value, color }) {
  return (
    <div>
      <div
        style={{
          color: C.textMuted,
          fontSize: 11,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: color || C.text }}>
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bot picker                                                         */
/* ------------------------------------------------------------------ */
function BotPicker({ bots, onSelect, onClose }) {
  const isNarrow = useIsNarrow();
  return (
    <div
      style={{
        marginBottom: 18,
        padding: 16,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.panelAlt,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Choose a Bot
        </h4>
        <button
          style={btn("outline", { height: 32, padding: "0 14px", fontSize: 13 })}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 12 }}>
        {Object.entries(BOT_META).map(([botType, meta]) => {
          const exists = !!bots[botType];
          return (
            <button
              key={botType}
              type="button"
              disabled={exists}
              onClick={() => onSelect(botType)}
              onMouseEnter={(e) => { if (!exists) e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              style={{
                background: C.field,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
                textAlign: "left",
                cursor: exists ? "not-allowed" : "pointer",
                opacity: exists ? 0.55 : 1,
                fontFamily: "inherit",
                color: "inherit",
                transition: "border-color 0.15s",
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
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  {meta.icon} {meta.label}
                </span>
                {exists && <span style={badge("amber")}>configured</span>}
              </div>
              <div style={{ color: C.textMuted, fontSize: 12, fontFamily: MONO, marginBottom: 8 }}>
                {meta.cadence}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                {meta.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create-bot form                                                    */
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
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 20,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.panelAlt,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
          {meta.icon} {meta.label}
        </h4>
        <span style={badge("amber")}>not active</span>
      </div>
      <div style={{ color: C.textMuted, fontSize: 13, fontFamily: MONO }}>{meta.symbol}</div>

      <div>
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
            height: 46,
            padding: "0 14px",
            borderRadius: 9,
            border: `1px solid ${C.border}`,
            background: C.field,
            color: C.text,
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <p style={{ color: C.textMuted, fontSize: 12, margin: "8px 0 0" }}>
          Min amount: ${MIN_AMOUNT} · Available: ${Number(balance || 0).toFixed(2)}
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
/* Activity log                                                       */
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
        gridColumn: "1 / -1",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        background: C.logBg,
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${C.border}`,
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
          maxHeight: 160,
          overflowY: "auto",
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 13 }}>
            {active
              ? "Bot is running — activity will appear here."
              : "No trades yet — start the bot to see activity."}
          </div>
        ) : (
          lines.map((line) =>
            line.kind === "comment" ? (
              <div
                key={line.id}
                style={{
                  display: "flex",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span
                  style={{ color: "#4a4a4a", display: "inline-block", width: 74, marginRight: 8 }}
                >
                  {fmtTime(line.ts)}
                </span>
                <span style={{ color: COMMENT_COLOR }}>{line.msg}</span>
              </div>
            ) : (
              <div
                key={line.id}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span
                  style={{ color: "#4a4a4a", display: "inline-block", width: 74, marginRight: 8 }}
                >
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
/* Bot row                                                            */
/* ------------------------------------------------------------------ */
function BotRow({
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
    <article style={itemStyle}>
      <span style={icoStyle}>
        <BotIcon />
      </span>

      <div style={{ minWidth: 0, alignSelf: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
          {meta.icon} {meta.label}
        </h3>
        <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
          {meta.description}
        </p>
        <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 12, fontFamily: MONO }}>
          {meta.cadence}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={badge(RISK_TONE[meta.risk] || "blue")}>{meta.risk} risk</span>
        <span style={badge(badgeTone)}>{badgeText}</span>
        {isActive && (
          <span style={badge(pnl >= 0 ? "green" : "red")}>
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </span>
        )}
      </div>

      {bot && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: isNarrow ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
            gap: 14,
            paddingTop: 14,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <Stat label="P&L" value={fmtUsd(pnl)} color={pnl >= 0 ? C.gain : C.loss} />
          <Stat label="Wins" value={wins} color={C.gain} />
          <Stat label="Losses" value={losses} color={C.loss} />
          <Stat label="Win Rate" value={winRate !== null ? `${winRate}%` : "—"} />
          <Stat label="Allocated" value={`$${allocation.toFixed(2)}`} />
        </div>
      )}

      {error && (
        <p style={{ gridColumn: "1 / -1", color: C.loss, fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          gap: 10,
          flexDirection: isNarrow ? "column" : "row",
        }}
      >
        {!bot ? (
          <>
            <button
              style={btn("primary", {
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
            <button style={btn("outline", { opacity: 0.5, cursor: "not-allowed" })} disabled>
              Start Bot
            </button>
          </>
        ) : !isActive ? (
          <>
            <button
              style={btn("primary")}
              onClick={() => onStart(botType)}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <PlayIcon /> Start Bot
            </button>
            <button style={btn("outline")} onClick={() => onRemove(botType)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button style={btn("outline")} onClick={() => onStop(botType)}>
              <SquareIcon /> Stop
            </button>
            <button
              style={btn("danger")}
              onClick={() => onRemove(botType)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 107, 107, 0.5)";
                e.currentTarget.style.color = C.loss;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = "#d4d8d6";
              }}
            >
              <TrashIcon /> Delete
            </button>
          </>
        )}
      </div>

      {!canConfigure && !bot && (
        <p style={{ gridColumn: "1 / -1", color: C.textMuted, fontSize: 12, margin: 0 }}>
          Requires a balance of at least ${MIN_CONFIGURE_BALANCE} to configure.
        </p>
      )}

      {bot && <ActivityLog trades={trades} active={isActive} base={meta.base} />}
    </article>
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

  return (
    /* Full-bleed blue-navy page background */
    <div
      style={{
        background: C.bg,             /* #0a0e1a */
        color: C.text,
        minHeight: "100vh",
        margin: "0 -24px",            /* bleed out of main-content padding */
        padding: "0 24px 32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Trading overview card */}
        <div style={cardBase}>
          <div style={cheadStyle}>
            <span style={{ color: C.accent, display: "inline-flex" }}>
              <ActivityIcon />
            </span>
            Trading Overview
          </div>
          <div style={{ padding: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "repeat(2, 1fr)" : "repeat(7, 1fr)",
                gap: isNarrow ? 16 : 24,
              }}
            >
              <Stat label="Total Bots" value={totalBots} />
              <Stat
                label="Available"
                value={balanceLoading ? "…" : `$${Number(balance).toFixed(2)}`}
              />
              <Stat
                label="P&L"
                value={fmtUsd(totals.pnl)}
                color={totals.pnl >= 0 ? C.gain : C.loss}
              />
              <Stat
                label="Win Rate"
                value={totals.winRate !== null ? `${totals.winRate}%` : "—"}
              />
              <Stat label="Trades" value={totals.trades} />
              <Stat label="Allocated" value={`$${totals.allocated.toFixed(0)}`} />
              <Stat
                label="Status"
                value={statusLabel}
                color={meetsMinBalance ? C.gain : C.loss}
              />
            </div>
          </div>
        </div>

        {/* DCA Bots card */}
        <div style={cardBase}>
          <div style={cheadStyle}>
            <span style={{ color: C.accent, display: "inline-flex" }}>
              <BotIcon />
            </span>
            DCA Bots ({totalBots})
          </div>

          <div style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: isNarrow ? "stretch" : "flex-start",
                justifyContent: "space-between",
                flexDirection: isNarrow ? "column" : "row",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, color: C.text }}>
                  Dollar-Cost Averaging Bots
                </h3>
                <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
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

            {balanceError && (
              <p style={{ color: C.loss, fontSize: 13, margin: "0 0 12px" }}>{balanceError}</p>
            )}

            {pickerOpen && (
              <BotPicker
                bots={bots}
                onSelect={handlePickBot}
                onClose={() => setPickerOpen(false)}
              />
            )}

            <div style={{ display: "grid", gap: 14 }}>
              <BotRow
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
              <BotRow
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
          </div>
        </div>

        <p style={{ color: C.textMuted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Automated bots trade based on your configuration and market conditions. Past performance
          does not guarantee future results. Only allocate funds you can afford to have at risk.
        </p>
      </div>
    </div>
  );
}
