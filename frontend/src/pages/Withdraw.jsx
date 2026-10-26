import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

const COINS = [
  {
    id: "USDT",
    name: "Tether",
    color: "#26a17b",
    glyph: "T",
    min: 20,
    networks: [{ id: "TRC20", label: "Tron (TRC20)", fee: 1 }],
  },
  {
    id: "BTC",
    name: "Bitcoin",
    color: "#f7931a",
    glyph: "₿",
    min: 50,
    networks: [{ id: "Bitcoin", label: "Bitcoin", fee: 5 }],
  },
  {
    id: "ETH",
    name: "Ethereum",
    color: "#627eea",
    glyph: "Ξ",
    min: 30,
    networks: [{ id: "ERC20", label: "Ethereum (ERC20)", fee: 3 }],
  },
];

const css = `
.wd {
  --bg: #0a0e1a;
  --surface: #121a2e;
  --panel: #0f1629;
  --border: #1f2842;
  --text: #8a93b3;
  --strong: #f2f4ff;
  --blue: var(--accent, #5b6ef5);
  --blue-bg: color-mix(in srgb, var(--blue) 12%, transparent);
  --blue-border: color-mix(in srgb, var(--blue) 28%, transparent);
  --green: #1fd18b;
  --red: #ff3b4e;
  --amber: #f5b13d;
  max-width: 1080px;
  margin: 0 auto;
  padding: 31px 24px 48px;
  color: var(--strong);
  box-sizing: border-box;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.wd *, .wd *::before, .wd *::after { box-sizing: border-box; }

/* ---------- header ---------- */
.wd__head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.wd__head-icon {
  width: 48px; height: 48px; flex-shrink: 0; display: grid; place-items: center;
  border-radius: 12px; color: var(--blue); background: var(--blue-bg);
  border: 1px solid var(--blue-border);
}
.wd__head-icon svg { width: 20px; height: 20px; }
.wd__title { margin: 0; font-size: 26px; line-height: 1.15; font-weight: 700; letter-spacing: -0.02em; color: var(--strong); }
.wd__sub { margin: 2px 0 0; font-size: 14px; color: var(--text); }

.wd__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }

/* ---------- cards ---------- */
.wd-card { padding: 28px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); }
.wd-card__title {
  display: flex; align-items: center; gap: 10px; margin: 0 0 20px;
  font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--strong);
}
.wd-card__title svg { flex-shrink: 0; width: 20px; height: 20px; color: var(--blue); }

.wd-balance {
  display: flex; align-items: center; justify-content: space-between;
  min-height: 62px; padding: 0 16px; border-radius: 12px; background: var(--panel);
  margin-bottom: 22px; color: var(--text); font-size: 15px;
}
.wd-balance strong { color: var(--strong); font-size: 22px; font-weight: 700; }
.wd-held { margin: -12px 0 22px; font-size: 13px; color: var(--text); }
.wd-held b { color: var(--amber); font-weight: 600; }

/* ---------- form ---------- */
.wd-form { display: flex; flex-direction: column; }
.wd-label { margin: 0 0 10px; font-size: 15px; font-weight: 600; color: var(--strong); }
.wd-form > * + .wd-label { margin-top: 20px; }

.wd-input {
  width: 100%; height: 46px; padding: 0 14px; border-radius: 10px; outline: 0;
  font: inherit; font-size: 16px; color: var(--strong);
  background: var(--bg); border: 1px solid var(--border); transition: border-color .15s;
}
.wd-input::placeholder { color: #566086; }
.wd-input:focus { border-color: var(--blue); }
.wd-input--amount { padding-left: 34px; padding-right: 72px; font-size: 18px; }
.wd-input--amount::-webkit-outer-spin-button,
.wd-input--amount::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.wd-input--amount { -moz-appearance: textfield; }

.wd-amount { position: relative; }
.wd-amount__sign {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 20px; color: var(--text); pointer-events: none;
}
.wd-max {
  position: absolute; top: 7px; right: 7px; height: 32px; padding: 0 12px;
  font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-border); border-radius: 6px;
}
.wd-hint { margin: 10px 0 0; font-size: 13px; color: var(--text); }

/* ---------- dropdowns ---------- */
.wd-select { position: relative; }
.wd-select__btn {
  width: 100%; height: 58px; display: flex; align-items: center; padding: 0 16px; gap: 10px;
  border-radius: 12px; cursor: pointer; text-align: left; font: inherit; color: var(--strong);
  background: var(--bg); border: 1px solid var(--border); transition: border-color .15s;
}
.wd-select__btn:hover { border-color: #2f3a5c; }
.wd-select__btn.is-open { border-color: var(--blue-border); }
.wd-select__placeholder { font-size: 16px; color: var(--text); }
.wd-select__chev { margin-left: auto; display: grid; place-items: center; color: var(--strong); transition: transform .15s; }
.wd-select__chev svg { width: 16px; height: 16px; }
.wd-select__btn.is-open .wd-select__chev { transform: rotate(180deg); }

.wd-select__menu {
  position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; right: 0; margin: 0; padding: 6px;
  list-style: none; border-radius: 12px; background: #0e1424; border: 1px solid var(--border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
}
.wd-select__item {
  width: 100%; height: 48px; display: flex; align-items: center; padding: 0 10px;
  border: 0; border-radius: 8px; cursor: pointer; font: inherit; color: var(--strong);
  background: transparent; text-align: left;
}
.wd-select__item:hover { background: #18213a; }
.wd-select__item.is-on { background: var(--blue-bg); }

.wd-opt { display: flex; align-items: center; gap: 10px; min-width: 0; }
.wd-opt__main { font-size: 16px; font-weight: 600; }
.wd-opt__muted { font-size: 14px; color: var(--text); }

.wd-coin {
  width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center;
  border-radius: 50%; color: #fff; font-size: 15px; font-weight: 700;
}
.wd-net {
  width: 26px; height: 26px; flex-shrink: 0; display: grid; place-items: center;
  border-radius: 50%; color: var(--blue); background: var(--blue-bg);
}
.wd-net svg { width: 14px; height: 14px; }

/* ---------- fee summary ---------- */
.wd-summary { margin-top: 20px; padding: 16px; border-radius: 12px; background: var(--panel); }
.wd-summary__row { display: flex; align-items: center; justify-content: space-between; font-size: 16px; color: var(--text); }
.wd-summary__row b { color: var(--strong); font-weight: 600; }
.wd-summary__row--total { margin-top: 10px; color: var(--strong); font-weight: 600; }
.wd-summary__row--total b { color: var(--blue); font-size: 17px; font-weight: 700; }

.wd-note {
  margin: 16px 0 0; padding: 10px 12px; font-size: 12px; line-height: 1.5; color: var(--text);
  border-radius: 8px; background: var(--blue-bg); border: 1px solid var(--blue-border);
}

/* ---------- submit + messages ---------- */
.wd-submit {
  margin-top: 22px; width: 100%; height: 46px; border: 0; border-radius: 8px; cursor: pointer;
  font: inherit; font-size: 16px; font-weight: 600; color: #fff; background: var(--blue);
  transition: filter .15s;
}
.wd-submit:hover:not(:disabled) { filter: brightness(1.1); }
.wd-submit:disabled { opacity: .55; cursor: not-allowed; }

.wd-msg { margin-top: 14px; padding: 10px 12px; font-size: 13px; border-radius: 8px; border: 1px solid; }
.wd-msg--ok { color: var(--green); border-color: color-mix(in srgb, var(--green) 35%, transparent); background: color-mix(in srgb, var(--green) 10%, transparent); }
.wd-msg--err { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 10%, transparent); }

/* ---------- history ---------- */
.wd-empty { display: flex; flex-direction: column; align-items: center; padding: 44px 0 30px; color: var(--text); }
.wd-empty__icon { color: #3a4468; margin-bottom: 16px; }
.wd-empty__icon svg { width: 40px; height: 40px; }
.wd-empty p { margin: 0; font-size: 14px; text-align: center; }

.wd-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.wd-history__item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px; border-radius: 12px; background: var(--panel);
}
.wd-history__amt { font-size: 18px; font-weight: 700; color: var(--strong); }
.wd-history__amt span { margin-left: 8px; font-size: 14px; font-weight: 500; color: var(--text); }
.wd-history__meta { margin-top: 3px; font-size: 13px; color: var(--text); overflow-wrap: anywhere; }

.wd-status {
  padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; text-transform: capitalize;
  color: var(--amber); background: color-mix(in srgb, var(--amber) 14%, transparent);
}
.wd-status--approved, .wd-status--completed, .wd-status--confirmed {
  color: var(--green); background: color-mix(in srgb, var(--green) 14%, transparent);
}
.wd-status--rejected, .wd-status--failed {
  color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent);
}

/* ---------- responsive ---------- */
@media (max-width: 860px) {
  .wd { padding: 19px 14px 32px; }
  .wd__grid { grid-template-columns: 1fr; gap: 20px; }
}
@media (max-width: 560px) {
  .wd__head { margin-bottom: 20px; }
  .wd__head-icon { width: 42px; height: 42px; }
  .wd-card { padding: 20px; }
}
`;

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/* ---------- icons ---------- */
const WalletIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H5a2 2 0 0 1 0-4h13v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15V7" />
    <path d="M16 14h4" />
  </svg>
);
const ClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const ArrowDownLeft = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 7 7 17" />
    <path d="M17 17H7V7" />
  </svg>
);
const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4l9 17L21 4z" />
    <path d="M8 8l4 5 4-5" />
  </svg>
);

const CoinBadge = ({ coin }) => (
  <span className="wd-coin" style={{ background: coin.color }}>{coin.glyph}</span>
);

/* ---------- custom dropdown ---------- */
function Dropdown({ value, options, placeholder, onChange, renderOption }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="wd-select" ref={ref}>
      <button
        type="button"
        className={`wd-select__btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          renderOption(selected)
        ) : (
          <span className="wd-select__placeholder">{placeholder}</span>
        )}
        <span className="wd-select__chev"><Chevron /></span>
      </button>
      {open && (
        <ul className="wd-select__menu">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={`wd-select__item ${o.id === value ? "is-on" : ""}`}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {renderOption(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- page ---------- */
export default function Withdraw() {
  const [coinId, setCoinId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, { data: list, error }] = await Promise.all([
        supabase.from("profiles").select("balance").eq("id", user.id).single(),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (error) throw error;
      setBalance(Number(prof?.balance) || 0);
      setHistory(list || []);
    } catch (e) {
      console.error("Failed to load withdrawals:", e.message);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + live updates:
  //   - a status flip on any of this user's withdrawals (pending → completed/rejected)
  //   - a balance change on the user's profile (admin deducts on approval)
  // Both re-run load(), so the available balance and the pill update without a refresh.
  useEffect(() => {
    let cancelled = false;
    let channel = null;

    async function init() {
      await load();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`withdrawals-realtime-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "withdrawals",
            filter: `user_id=eq.${user.id}`,
          },
          () => { if (!cancelled) load(); }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => { if (!cancelled) load(); }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const coin = COINS.find((c) => c.id === coinId);
  const networkList = coin ? coin.networks : [];
  const network = networkList.find((n) => n.id === networkId);
  const fee = network ? network.fee : 0;
  const min = coin ? coin.min : 0;

  // pending requests are held against the balance so they can't be requested twice
  const pending = history
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  const available = Math.max((balance || 0) - pending, 0);
  const value = Number(amount) || 0;
  const receive = Math.max(value - fee, 0);

  const changeCoin = (id) => {
    const c = COINS.find((x) => x.id === id);
    setCoinId(id);
    setNetworkId(c.networks[0].id);
    setMsg(null);
  };

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!coin || !network) {
      setMsg({ type: "err", text: "Select a currency and network." });
      return;
    }
    if (address.trim().length < 20) {
      setMsg({ type: "err", text: "Enter a valid wallet address." });
      return;
    }
    if (value < min) {
      setMsg({ type: "err", text: `The minimum withdrawal is ${money(min)}.` });
      return;
    }
    if (value > available) {
      setMsg({ type: "err", text: `You can withdraw up to ${money(available)}.` });
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        method: `${coin.id} (${network.id})`, // keeps the Admin table working
        asset: coin.id,
        network: network.id,
        address: address.trim(),
        amount: value,
        fee,
        status: "pending",
      });
      if (error) throw error;
      setAmount("");
      setAddress("");
      setMsg({ type: "ok", text: "Withdrawal requested. We'll notify you when it's processed." });
      load();
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Could not submit the withdrawal." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="wd">
        <header className="wd__head">
          <span className="wd__head-icon"><ArrowDownLeft /></span>
          <div>
            <h1 className="wd__title">Withdraw Crypto</h1>
            <p className="wd__sub">Withdraw your cryptocurrency to an external wallet</p>
          </div>
        </header>

        <div className="wd__grid">
          {/* New withdrawal */}
          <section className="wd-card">
            <h2 className="wd-card__title"><WalletIcon /> New Withdrawal</h2>

            <div className="wd-balance">
              <span>Available Balance</span>
              <strong>{balance === null ? "…" : money(available)}</strong>
            </div>
            {pending > 0 && (
              <p className="wd-held">
                <b>{money(pending)}</b> is held in pending requests.
              </p>
            )}

            <form className="wd-form" onSubmit={submit}>
              <label className="wd-label">Select Currency</label>
              <Dropdown
                value={coinId}
                options={COINS}
                placeholder="Select a cryptocurrency"
                onChange={changeCoin}
                renderOption={(c) => (
                  <span className="wd-opt">
                    <CoinBadge coin={c} />
                    <span className="wd-opt__main">{c.id}</span>
                    <span className="wd-opt__muted">{c.name}</span>
                  </span>
                )}
              />

              {coin && (
                <>
                  <label className="wd-label">Select Network</label>
                  <Dropdown
                    value={networkId}
                    options={networkList}
                    placeholder="Select a network"
                    onChange={setNetworkId}
                    renderOption={(n) => (
                      <span className="wd-opt">
                        <span className="wd-net"><NetworkIcon /></span>
                        <span className="wd-opt__main">{n.label}</span>
                        <span className="wd-opt__muted">Fee: ${n.fee}</span>
                      </span>
                    )}
                  />

                  <label className="wd-label" htmlFor="wd-address">Withdrawal Address</label>
                  <input
                    id="wd-address"
                    className="wd-input"
                    type="text"
                    placeholder={`Your ${coin.id} address`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />

                  <label className="wd-label" htmlFor="wd-amount">Amount (USD)</label>
                  <div className="wd-amount">
                    <span className="wd-amount__sign">$</span>
                    <input
                      id="wd-amount"
                      className="wd-input wd-input--amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="wd-max"
                      onClick={() => setAmount(available ? available.toFixed(2) : "")}
                    >
                      Max
                    </button>
                  </div>
                  <p className="wd-hint">Minimum withdrawal: {money(min).replace(".00", "")}</p>

                  <div className="wd-summary">
                    <div className="wd-summary__row">
                      <span>Network Fee</span>
                      <b>${fee}</b>
                    </div>
                    <div className="wd-summary__row wd-summary__row--total">
                      <span>You will receive</span>
                      <b>{money(receive)}</b>
                    </div>
                  </div>

                  <p className="wd-note">
                    Double-check the address and network. Withdrawals to the wrong network can't be
                    reversed.
                  </p>

                  <button className="wd-submit" type="submit" disabled={busy || loading}>
                    {busy ? "Submitting…" : "Submit Withdrawal"}
                  </button>
                  {msg && <div className={`wd-msg wd-msg--${msg.type}`}>{msg.text}</div>}
                </>
              )}
            </form>
          </section>

          {/* History */}
          <section className="wd-card">
            <h2 className="wd-card__title"><ClockIcon /> Withdrawal History</h2>

            {loading ? (
              <div className="wd-empty"><p>Loading...</p></div>
            ) : history.length === 0 ? (
              <div className="wd-empty">
                <span className="wd-empty__icon"><ArrowDownLeft /></span>
                <p>No withdrawal history</p>
              </div>
            ) : (
              <ul className="wd-history">
                {history.map((w) => (
                  <li key={w.id} className="wd-history__item">
                    <div>
                      <div className="wd-history__amt">
                        {money(w.amount)}{" "}
                        <span>
                          {w.asset || w.method}
                          {w.network ? ` · ${w.network}` : ""}
                        </span>
                      </div>
                      <div className="wd-history__meta">
                        {fmtDate(w.created_at)}
                        {w.address ? ` · ${w.address.slice(0, 8)}…${w.address.slice(-6)}` : ""}
                      </div>
                    </div>
                    <span className={`wd-status wd-status--${w.status}`}>{w.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
