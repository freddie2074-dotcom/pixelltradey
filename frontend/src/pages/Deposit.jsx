import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

/* ------------------------------------------------------------------
   EDIT THIS: your real receiving addresses.
   USDT is accepted on Tron (TRC20). BTC on the Bitcoin network.
------------------------------------------------------------------- */
const DEPOSIT_ADDRESS_USDT = "ТPJjgnPuhg3GzQdGhJUwFYsAKg6W8pkTdk";
const DEPOSIT_ADDRESS_BTC = "121HaiJWC24Na5kSgcUrYFhGTKqAvSvx2U";

const MIN = 50;
const CHIPS = [50, 100, 250, 500];
const HOLD_MIN = 60;

/* `priceUsd` = how many USD 1 unit of the coin is worth.
   USDT is pegged 1:1. BTC rate is a placeholder — replace with a live
   price feed if you want accurate conversions. */
const COINS = [
  { s: "USDT", n: "Tether", dec: 2, nets: ["TRC20"], priceUsd: 1 },
  { s: "BTC", n: "Bitcoin", dec: 8, nets: ["BTC"], priceUsd: 65000 },
];

const NETS = {
  TRC20: {
    label: "Tron (TRC20) - Low Fee",
    shortLabel: "Tron (TRC20)",
    icon: "TRX",
    address: DEPOSIT_ADDRESS_USDT,
  },
  BTC: {
    label: "Bitcoin (BTC)",
    shortLabel: "Bitcoin",
    icon: "BTC",
    address: DEPOSIT_ADDRESS_BTC,
  },
};

/* ------------------------------------------------------------------
   Icons
------------------------------------------------------------------- */
function Svg({ size = 18, className, children }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const I = {
  arrowUpRight: (<><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>),
  wallet: (<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  down: <path d="m6 9 6 6 6-6" />,
  up: <path d="m18 15-6-6-6 6" />,
  network: (<><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></>),
  back: (<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>),
  qr: (<><rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" /><rect x="3" y="16" width="5" height="5" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></>),
  copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  check: <path d="M20 6 9 17l-5-5" />,
  xCircle: (<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>),
  okCircle: (<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>),
  alert: (<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>),
  refresh: (<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>),
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
};

/* Real brand logos for the crypto icons (inline, no dependency). */
function BitcoinLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" role="img">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#fff"
        d="M22.55 14.02c.3-2.02-1.24-3.11-3.35-3.83l.68-2.74-1.67-.42-.67 2.67c-.44-.11-.89-.21-1.34-.31l.67-2.69-1.67-.42-.68 2.74c-.36-.08-.72-.17-1.07-.25l-2.3-.58-.44 1.79s1.24.28 1.21.3c.67.17.8.61.78.97l-.78 3.13.19.05-.19-.05-1.09 4.38c-.08.21-.29.52-.76.4.02.03-1.21-.3-1.21-.3l-.83 1.91 2.17.54c.4.1.8.21 1.19.31l-.69 2.77 1.67.42.68-2.74c.45.12.89.23 1.32.34l-.68 2.72 1.67.42.69-2.77c2.85.54 4.99.32 5.89-2.26.72-2.07-.04-3.27-1.54-4.05 1.09-.25 1.91-1 2.13-2.42zm-3.85 5.36c-.52 2.07-4.02.95-5.16.67l.92-3.69c1.14.28 4.79.85 4.24 3.02zm.52-5.39c-.47 1.88-3.38.93-4.33.69l.83-3.35c.95.24 4.01.68 3.5 2.66z"
      />
    </svg>
  );
}

function TetherLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" role="img">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M22.36 10.63v-2.4H9.62v2.4h4.87v9.1c.06 1.37 1.46 2.45 3.5 2.45s3.44-1.08 3.5-2.45v-9.1h4.87zm-4.87 9.13c-.04.75-.93 1.34-2 1.34s-1.96-.59-2-1.34v-9.13h4v9.13zm0-9.13v-2.4h-4v2.4h4z"
      />
    </svg>
  );
}

function TronLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" role="img">
      <circle cx="16" cy="16" r="16" fill="#EF0027" />
      <path fill="#fff" d="M8.8 8.8 24 11.2 11.6 23.6z" />
      <path fill="#fff" d="M8.8 8.8 6.4 13.1 10 16.6z" />
    </svg>
  );
}

function CryptoIcon({ symbol, size = 30 }) {
  if (symbol === "BTC") return <BitcoinLogo size={size} />;
  if (symbol === "USDT") return <TetherLogo size={size} />;
  if (symbol === "TRX") return <TronLogo size={size} />;
  return (
    <span className="dep__coin" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {String(symbol).slice(0, 3)}
    </span>
  );
}

const BADGE = {
  expired: ["Expired", "red", I.xCircle],
  pending: ["Waiting", "amber", I.loader, true],
  completed: ["Completed", "green", I.okCircle],
  failed: ["Failed", "red", I.xCircle],
};

/* ------------------------------------------------------------------
   Styles
------------------------------------------------------------------- */
const css = `
.dep {
  --bg: #0a0e1a;
  --surface: #0f1526;
  --surface-2: #121a2e;
  --field: #0d1426;
  --border: #1f2842;
  --text: #8a93b3;
  --strong: #f2f4ff;
  --blue: var(--accent, #5b6ef5);
  --blue-bg: color-mix(in srgb, var(--blue) 12%, transparent);
  --blue-border: color-mix(in srgb, var(--blue) 30%, transparent);
  --green: #1fd18b;
  --red: #ff4d5e;
  --amber: #f5b50a;
  --mono: 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  color: var(--strong);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}
.dep *, .dep *::before, .dep *::after { box-sizing: border-box; }
.dep button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.dep input { font: inherit; color: inherit; }
.dep__spin { animation: dep-spin 1s linear infinite; }
@keyframes dep-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dep__spin { animation-duration: 3s; } }

.dep__head { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; }
.dep__tile {
  display: grid; place-items: center; width: 48px; height: 48px; flex: none;
  border-radius: 12px; color: var(--blue); background: var(--blue-bg);
}
.dep__head h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.03em; color: var(--strong); }
.dep__head p { margin: 2px 0 0; color: var(--text); font-size: 14px; }

.dep__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }
.dep__card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 28px; min-width: 0; }
.dep__h2 { display: flex; align-items: center; gap: 12px; margin: 0 0 26px; font-size: 24px; font-weight: 700; letter-spacing: -0.04em; color: var(--strong); }
.dep__h2 svg { color: var(--blue); }

.dep__bal {
  display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 18px;
  border-radius: 12px; background: var(--surface-2); color: var(--text); font-size: 16px;
}
.dep__bal b { color: var(--strong); font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.dep__steps { display: flex; align-items: center; justify-content: center; margin: 26px 0; }
.dep__steps span {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%;
  background: var(--surface-2); color: var(--text); font-size: 15px; font-weight: 700;
}
.dep__steps span.on { background: var(--blue); color: #fff; }
.dep__steps i { width: 38px; height: 2px; background: var(--border); }
.dep__steps i.on { background: var(--blue); }

.dep__body { display: flex; flex-direction: column; }
.dep__intro { text-align: center; margin-bottom: 26px; }
.dep__intro h3 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: var(--strong); }
.dep__intro p { margin: 4px 0 0; color: var(--text); font-size: 15px; }
.dep__lbl { margin-bottom: 10px; font-size: 15px; font-weight: 600; color: var(--strong); }
.dep__lbl--ic { display: flex; align-items: center; gap: 10px; margin-top: 24px; }
.dep__amt {
  display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 18px; border-radius: 12px;
  background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 20px;
}
.dep__amt:focus-within { border: 2px solid var(--blue); padding: 0 17px; }
.dep__amt input { flex: 1; min-width: 0; height: 100%; background: none; border: 0; outline: 0; font-size: 18px; color: var(--strong); }
.dep__amt input::placeholder { color: #5d6685; }
.dep__hint { margin: 10px 0 14px; color: var(--text); font-size: 13px; }
.dep__hint--err { color: var(--red); }
.dep__chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.dep__chips button {
  height: 44px; border-radius: 9px; border: 1px solid var(--border); background: var(--bg);
  font-size: 16px; font-weight: 700; color: var(--strong);
}
.dep__chips button:hover { border-color: var(--blue-border); color: var(--blue); }

.dep__bonus {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin-bottom: 24px;
  border-radius: 8px; background: color-mix(in srgb, var(--green) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--green) 30%, transparent); color: var(--green); font-size: 14px;
}
.dep__bonus b { color: var(--strong); font-weight: 700; }

.dep__err { margin: 0 0 14px; color: var(--red); font-size: 14px; }
.dep__note { margin-bottom: 18px; padding: 10px 12px; font-size: 13px; border-radius: 8px; border: 1px solid; }
.dep__note--ok { color: var(--green); background: color-mix(in srgb, var(--green) 10%, transparent); border-color: color-mix(in srgb, var(--green) 30%, transparent); }
.dep__note--err { color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); border-color: color-mix(in srgb, var(--red) 30%, transparent); }
.dep__note--info { color: var(--strong); background: var(--blue-bg); border-color: var(--blue-border); }

.dep .dep__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 12px; height: 54px; padding: 0 22px;
  border-radius: 10px; font-size: 16px; font-weight: 600;
}
.dep .dep__btn--full { width: 100%; }
.dep .dep__btn--primary { background: var(--blue); color: #fff; border: 0; }
.dep .dep__btn--primary:disabled { background: var(--surface-2); color: #5d6685; cursor: not-allowed; opacity: 1; }
.dep .dep__btn--primary:not(:disabled):hover { filter: brightness(1.08); }
.dep .dep__btn--ghost { background: var(--bg); border: 1px solid var(--border); color: var(--strong); }
.dep .dep__btn--ghost:hover { border-color: #2f3a5c; }
.dep__pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 34px; }
.dep__pay + .dep__imp { margin-top: 18px; }
.dep__imp + .dep__pair, .dep__pay + .dep__pair { margin-top: 18px; }

.dep__coin {
  display: inline-grid; place-items: center; flex: none; border-radius: 50%;
  font-weight: 700; color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-border);
}
.dep__dd { position: relative; }
.dep .dep__trigger {
  display: flex; align-items: center; justify-content: space-between; width: 100%; height: 54px; padding: 0 18px;
  border-radius: 12px; border: 1px solid var(--border); background: var(--field); text-align: left;
}
.dep .dep__trigger:hover, .dep .dep__trigger[aria-expanded="true"] { border-color: var(--blue-border); }
.dep__trigger > svg { color: var(--strong); flex: none; }
.dep__ph { color: var(--text); font-size: 16px; }
.dep__opt { display: flex; align-items: center; gap: 14px; }
.dep__opt b { font-size: 16px; font-weight: 600; color: var(--strong); }
.dep__opt small { color: var(--text); font-size: 14px; }
.dep__menu {
  position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; right: 0; max-height: 276px; overflow-y: auto;
  border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2); box-shadow: 0 14px 34px rgba(0, 0, 0, .6);
}
.dep__menu .dep__opt { width: 100%; height: 52px; padding: 0 18px; text-align: left; }
.dep__menu .dep__opt:hover { background: var(--bg); }
.dep__menu .dep__opt.is-on { background: var(--blue-bg); }

.dep__pay { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2); }
.dep__time { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: var(--text); font-size: 15px; }
.dep__time b { color: var(--amber); font-family: var(--mono); font-size: 20px; font-weight: 700; }
.dep__time--status { margin-bottom: 4px; }
.dep__done { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--green); font-size: 15px; font-weight: 600; }
.dep__gone { margin: 0; color: var(--text); font-size: 15px; line-height: 1.45; }
.dep__sm { color: var(--text); font-size: 14px; }
.dep__box {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 0 16px;
  border-radius: 10px; background: var(--bg); border: 1px solid var(--border);
}
.dep__box button { flex: none; color: var(--strong); }
.dep__big { color: var(--blue); font-family: var(--mono); font-size: 22px; font-weight: 700; overflow-wrap: anywhere; }
.dep__box code { font-family: var(--mono); font-size: 13px; word-break: break-all; padding: 14px 0; color: var(--strong); }
.dep__amber { margin: 0 0 8px; color: var(--amber); font-size: 14px; line-height: 1.4; }
.dep__imp {
  display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; color: var(--amber);
  border: 1px solid color-mix(in srgb, var(--amber) 30%, transparent); background: color-mix(in srgb, var(--amber) 8%, transparent);
}
.dep__imp svg { flex: none; margin-top: 1px; }
.dep__imp b { display: block; font-size: 16px; font-weight: 600; }
.dep__imp p { margin: 2px 0 0; color: var(--text); font-size: 14px; line-height: 1.45; }

.dep__badge { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border-radius: 999px; font-size: 14px; white-space: nowrap; }
.dep__badge.red { color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent); }
.dep__badge.amber { color: var(--amber); background: color-mix(in srgb, var(--amber) 14%, transparent); }
.dep__badge.green { color: var(--green); background: color-mix(in srgb, var(--green) 14%, transparent); }
.dep__empty { margin: 0; padding: 30px 10px; text-align: center; color: var(--text); font-size: 14px; }
.dep__list { display: grid; gap: 14px; }
.dep__item { padding: 16px 18px; border-radius: 12px; background: var(--surface-2); }
.dep__r1, .dep__r2 { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dep__r1 > span:first-child { display: inline-flex; align-items: center; gap: 10px; }
.dep__r1 b { font-size: 18px; font-weight: 700; color: var(--strong); }
.dep__r2 { margin-top: 10px; color: #c3c9e0; font-size: 14px; }
.dep__r2 span { display: inline-flex; align-items: center; gap: 8px; }
.dep__r2 button { display: inline-grid; color: var(--text); }
.dep__r2 button:hover { color: var(--strong); }
.dep__r3 { margin-top: 10px; color: #c3c9e0; font-size: 14px; display: flex; justify-content: space-between; }

@media (max-width: 900px) {
  .dep { padding: 16px 14px 32px; }
  .dep__cols { grid-template-columns: 1fr; }
  .dep__card { padding: 22px; }
}
@media (max-width: 480px) {
  .dep__head { margin-bottom: 18px; }
  .dep__card { padding: 16px; }
  .dep__steps i { width: 24px; }
  .dep__pair { grid-template-columns: 1fr; }
  .dep__chips { grid-template-columns: repeat(2, 1fr); }
}
`;

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
const shortAddr = (a = "") => (a.length > 20 ? `${a.slice(0, 18)}...` : a);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US");
const fmtUsd = (n) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Database row -> the shape the UI uses
const fromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  usd: Number(r.usd),
  symbol: r.symbol,
  network: r.network,
  address: r.address,
  amount: r.amount,
  airNetwork: Number(r.air_network || 0).toFixed(2),
  status: r.status,
  expires: r.expires_at,
  created: r.created_at,
});

function Dropdown({ selected, placeholder, items, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const cur = items.find((i) => i.key === selected);
  return (
    <div className="dep__dd" ref={ref} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        className="dep__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {cur ? (
          <span className="dep__opt">
            <CryptoIcon symbol={cur.icon} />
            <b>{cur.title}</b>
            {cur.sub && <small>{cur.sub}</small>}
          </span>
        ) : (
          <span className="dep__ph">{placeholder}</span>
        )}
        <Svg size={18}>{open ? I.up : I.down}</Svg>
      </button>
      {open && (
        <div className="dep__menu" role="listbox">
          {items.map((i) => (
            <button
              type="button"
              key={i.key}
              role="option"
              aria-selected={i.key === selected}
              className={`dep__opt ${i.key === selected ? "is-on" : ""}`}
              onClick={() => {
                onPick(i.key);
                setOpen(false);
              }}
            >
              <CryptoIcon symbol={i.icon} />
              <b>{i.title}</b>
              {i.sub && <small>{i.sub}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------- */
export default function Deposit() {
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState(null);

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState("USDT");
  const [net, setNet] = useState("TRC20");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState(null);
  const [depId, setDepId] = useState(null);
  const [history, setHistory] = useState([]);

  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState("");
  const [checking, setChecking] = useState(false);

  // Deposit currently shown on step 3 (always read from history so admin changes show up)
  const dep = history.find((h) => h.id === depId) || null;

  // Latest history for the timers without re-creating them
  const historyRef = useRef([]);
  historyRef.current = history;

  // Load balance + deposits from the database
  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: prof }, { data: rows, error }] = await Promise.all([
        supabase.from("profiles").select("balance").eq("id", user.id).single(),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (error) throw error;
      setBalance(Number(prof?.balance) || 0);
      setHistory((rows || []).map(fromRow));
    } catch (e) {
      console.error("Failed to load deposits:", e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mark pending deposits past their time as expired and store a notification
  const expireStale = useCallback(async () => {
    const stale = historyRef.current.filter(
      (d) =>
        d.status === "pending" &&
        d.expires &&
        new Date(d.expires).getTime() < Date.now(),
    );
    for (const d of stale) {
      // Only flips if still pending, so the notification is created once
      const { data: changed, error } = await supabase
        .from("deposits")
        .update({ status: "expired" })
        .eq("id", d.id)
        .eq("status", "pending")
        .select();
      if (error || !changed || changed.length === 0) continue;

      setHistory((h) =>
        h.map((x) => (x.id === d.id ? { ...x, status: "expired" } : x)),
      );
      await supabase.from("notifications").insert({
        user_id: d.userId,
        type: "deposit_expired",
        title: "Deposit expired",
        message: `Your deposit of ${fmtUsd(d.usd)} (${d.amount} ${d.symbol}) expired before payment was received. Start a new deposit to get a fresh address.`,
        read: false,
      });
    }
  }, []);

  useEffect(() => {
    const id = setInterval(expireStale, 15000);
    expireStale();
    return () => clearInterval(id);
  }, [expireStale, history.length]);

  // Pick up admin confirmations while the page is open
  useEffect(() => {
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#0a0e1a";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const showNote = (type, text) => {
    setNote({ type, text });
    setTimeout(() => setNote(null), 5000);
  };

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const amountOk = Number(amount) >= MIN;
  const airNetworkBonus = amountOk ? (Number(amount) / 50).toFixed(2) : "0.00";

  const coinInfo = COINS.find((c) => c.s === coin);
  const coinItems = COINS.map((c) => ({ key: c.s, icon: c.s, title: c.s, sub: c.n }));
  const netItems = (coinInfo?.nets || []).map((k) => ({ key: k, icon: NETS[k].icon, title: NETS[k].label }));

  const pickCoin = (s) => {
    setCoin(s);
    const c = COINS.find((x) => x.s === s);
    setNet(c.nets.length === 1 ? c.nets[0] : "");
  };

  const next = () => {
    setErr("");
    if (!amountOk) return setErr(`Minimum deposit is $${MIN}.`);
    setStep(2);
  };

  const generate = async () => {
    setErr("");
    const n = NETS[net];
    if (!coinInfo || !n) return;
    const okPair =
      (coinInfo.s === "USDT" && net === "TRC20") ||
      (coinInfo.s === "BTC" && net === "BTC");
    if (!okPair) return setErr("Selected coin is not supported on this network.");

    setBusy(true);
    try {
      let uid = userId;
      if (!uid) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need to be signed in.");
        uid = user.id;
        setUserId(uid);
      }

      const usd = Number(amount);
      const bonus = usd / 50;

      // Crypto amount is based only on the base USD amount (the bonus is free)
      const coinAmt = (usd / coinInfo.priceUsd).toFixed(coinInfo.dec);
      const expires = new Date(Date.now() + HOLD_MIN * 60000).toISOString();

      const { data, error } = await supabase
        .from("deposits")
        .insert({
          user_id: uid,
          usd,
          symbol: coinInfo.s,
          network: net,
          address: n.address,
          amount: coinAmt,
          air_network: Number(bonus.toFixed(2)),
          status: "pending",
          expires_at: expires,
        })
        .select()
        .single();
      if (error) throw error;

      const rec = fromRow(data);
      setDepId(rec.id);
      setHistory((h) => [rec, ...h]);
      setStep(3);
      showNote("info", "Payment created. Send the exact amount to the address shown.");
    } catch (e) {
      setErr(e.message || "Could not create the deposit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setDepId(null);
    setAmount("");
    setCoin("USDT");
    setNet("TRC20");
    setErr("");
  };

  const statusOf = (d) =>
    d.status === "pending" && d.expires && new Date(d.expires).getTime() < now ? "expired" : d.status;
  const left = dep?.expires ? Math.max(0, Math.floor((new Date(dep.expires).getTime() - now) / 1000)) : 0;
  const depStatus = dep ? statusOf(dep) : "";
  const depLive = depStatus === "pending";

  const checkStatus = async () => {
    if (!dep) return;
    setChecking(true);
    await load();
    await expireStale();
    setChecking(false);

    const fresh = historyRef.current.find((h) => h.id === dep.id) || dep;
    const s = statusOf(fresh);
    if (s === "completed") showNote("ok", "Payment received. Your balance is updated.");
    else if (s === "expired") showNote("err", "This deposit expired. Start a new deposit.");
    else if (s === "failed") showNote("err", "This deposit failed. Start a new deposit.");
    else showNote("info", "No payment yet. Confirmations can take a few minutes.");
  };

  return (
    <>
      <style>{css}</style>
      <div className="dep">
        <header className="dep__head">
          <span className="dep__tile">
            <Svg size={24}>{I.arrowUpRight}</Svg>
          </span>
          <div>
            <h1>Deposit Crypto</h1>
            <p>Deposit USDT (TRC20) or Bitcoin (BTC) to fund your account</p>
          </div>
        </header>

        <div className="dep__cols">
          {/* ---------- wizard ---------- */}
          <section className="dep__card">
            <h2 className="dep__h2">
              <Svg size={22}>{I.wallet}</Svg> {step === 3 ? "Complete Payment" : "New Deposit"}
            </h2>

            {note && <div className={`dep__note dep__note--${note.type}`} role="status">{note.text}</div>}

            <div className="dep__bal">
              <span>Current Balance</span>
              <b>${balance.toFixed(2)}</b>
            </div>

            <div className="dep__steps">
              {[1, 2, 3].map((n) => (
                <Fragment key={n}>
                  {n > 1 && <i className={step >= n ? "on" : ""} />}
                  <span className={step >= n ? "on" : ""}>{n}</span>
                </Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="dep__body">
                <div className="dep__intro">
                  <h3>Enter Amount</h3>
                  <p>How much do you want to deposit?</p>
                </div>
                <label className="dep__lbl" htmlFor="dep-amt">Amount (USD)</label>
                <div className="dep__amt">
                  <span>$</span>
                  <input
                    id="dep-amt"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <small className={`dep__hint ${amount && !amountOk ? "dep__hint--err" : ""}`}>
                  Minimum deposit: ${MIN}
                </small>
                <div className="dep__chips">
                  {CHIPS.map((c) => (
                    <button key={c} type="button" onClick={() => setAmount(String(c))}>${c}</button>
                  ))}
                </div>

                {amountOk && (
                  <div className="dep__bonus">
                    <Svg size={18}>{I.okCircle}</Svg>
                    <span>Earns <b>${airNetworkBonus}</b> Air Network Bonus</span>
                  </div>
                )}

                {err && <p className="dep__err">{err}</p>}
                <button className="dep__btn dep__btn--primary dep__btn--full" disabled={!amountOk} onClick={next}>
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="dep__body">
                <div className="dep__intro">
                  <h3>Select Currency &amp; Network</h3>
                  <p>Depositing ${Number(amount).toFixed(2)}</p>
                </div>
                <span className="dep__lbl">Select Cryptocurrency</span>
                <Dropdown selected={coin} placeholder="Select a cryptocurrency" items={coinItems} onPick={pickCoin} />
                {coinInfo && (
                  <>
                    <span className="dep__lbl dep__lbl--ic">
                      <Svg size={16}>{I.network}</Svg> Select Network
                    </span>
                    <Dropdown key={coin} selected={net} placeholder="Select a network" items={netItems} onPick={setNet} />
                  </>
                )}
                {err && <p className="dep__err" style={{ marginTop: 14 }}>{err}</p>}
                <div className="dep__pair">
                  <button className="dep__btn dep__btn--ghost" onClick={() => { setErr(""); setStep(1); }}>
                    <Svg size={18}>{I.back}</Svg> Back
                  </button>
                  <button className="dep__btn dep__btn--primary" disabled={!coin || !net || busy} onClick={generate}>
                    <Svg size={18}>{I.qr}</Svg> {busy ? "Generating…" : "Generate Address"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && dep && (
              <div className="dep__body">
                <div className="dep__intro">
                  <h3>Complete Payment</h3>
                  <p>Send crypto to the address below</p>
                </div>

                <div className="dep__pay">
                  <div className="dep__time">
                    <span>Time Remaining</span>
                    <b>{depStatus === "completed" ? "Done" : left > 0 ? mmss(left) : "Expired"}</b>
                  </div>

                  {(() => {
                    const [label, tone, ic, spin] = BADGE[depStatus] || BADGE.pending;
                    return (
                      <div className="dep__time dep__time--status">
                        <span>Status</span>
                        <span className={`dep__badge ${tone}`}>
                          <Svg size={16} className={spin ? "dep__spin" : ""}>{ic}</Svg>
                          {depLive ? "Waiting for payment" : label}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="dep__time dep__time--status">
                    <span>You Receive</span>
                    <span style={{ color: "var(--green)", fontSize: "15px", fontWeight: 600 }}>
                      ${Number(dep.usd).toFixed(2)} + ${dep.airNetwork} Air
                    </span>
                  </div>

                  {depStatus === "completed" && (
                    <p className="dep__done"><Svg size={18}>{I.okCircle}</Svg> Payment received</p>
                  )}

                  {(depStatus === "expired" || depStatus === "failed") && (
                    <p className="dep__gone">
                      {depStatus === "expired" ? "This deposit has expired." : "This deposit failed."} Start a new
                      deposit to get a fresh address.
                    </p>
                  )}

                  {depLive && (
                    <>
                      <span className="dep__sm">Send Exactly</span>
                      <div className="dep__box" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <b className="dep__big">{dep.amount} {dep.symbol}</b>
                          <button type="button" onClick={() => copy(dep.amount, "amt")} aria-label="Copy amount">
                            <Svg size={20}>{copied === "amt" ? I.check : I.copy}</Svg>
                          </button>
                        </div>
                      </div>
                      <p className="dep__amber" style={{ marginTop: '8px' }}>
                        Copy and send the exact amount shown above
                      </p>

                      <span className="dep__sm">To This Address</span>
                      <div className="dep__box">
                        <code>{dep.address}</code>
                        <button type="button" onClick={() => copy(dep.address, "addr")} aria-label="Copy address">
                          <Svg size={20}>{copied === "addr" ? I.check : I.copy}</Svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {depLive && (
                  <div className="dep__imp">
                    <Svg size={20}>{I.alert}</Svg>
                    <div>
                      <b>Important</b>
                      <p>
                        Send only {dep.symbol} on the {NETS[dep.network]?.shortLabel || dep.network} network. Sending
                        any other cryptocurrency may result in permanent loss.
                      </p>
                    </div>
                  </div>
                )}

                <div className="dep__pair">
                  <button className="dep__btn dep__btn--ghost" onClick={reset}>New Deposit</button>
                  <button
                    className="dep__btn dep__btn--primary"
                    onClick={() => { if (!checking) checkStatus(); }}
                    aria-busy={checking}
                  >
                    <Svg size={18} className={checking ? "dep__spin" : ""}>{I.refresh}</Svg>
                    {checking ? "Checking…" : "Check Status"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ---------- history ---------- */}
          <section className="dep__card">
            <h2 className="dep__h2">
              <Svg size={22}>{I.clock}</Svg> Deposit History
            </h2>
            {history.length === 0 && <p className="dep__empty">No deposits yet.</p>}
            <div className="dep__list">
              {history.map((d) => {
                const [label, tone, ic, spin] = BADGE[statusOf(d)] || BADGE.pending;
                return (
                  <article className="dep__item" key={d.id}>
                    <div className="dep__r1">
                      <span>
                        <CryptoIcon symbol={d.symbol} size={24} />
                        <b>{fmtUsd(d.usd)}</b>
                      </span>
                      <span className={`dep__badge ${tone}`}>
                        <Svg size={16} className={spin ? "dep__spin" : ""}>{ic}</Svg> {label}
                      </span>
                    </div>
                    <div className="dep__r2">
                      <span>
                        {shortAddr(d.address)}{" "}
                        <button type="button" onClick={() => copy(d.address, d.id)} aria-label="Copy address">
                          <Svg size={14}>{copied === d.id ? I.check : I.copy}</Svg>
                        </button>
                      </span>
                      <span>{fmtDate(d.created)}</span>
                    </div>
                    <div className="dep__r3">
                      <span>{d.amount} {d.symbol}</span>
                      {d.airNetwork && Number(d.airNetwork) > 0 && (
                        <span style={{ color: "var(--green)" }}>+${d.airNetwork} Air</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
