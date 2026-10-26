import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// Only this Supabase user can open the admin panel
const ADMIN_UID = "935b6c78-7da2-4111-bdd5-f4d4a4826699";

const NAV_ITEMS = [
  { key: "Users", label: "Users", icon: "👥" },
  { key: "Chats", label: "Chats", icon: "💬" },
  { key: "Deposits", label: "Deposits", icon: "💰" },
  { key: "Withdrawals", label: "Withdrawals", icon: "🏦" },
];

/* ------------------------------------------------------------------
   Styles (same palette and components as the Deposit page)
------------------------------------------------------------------- */
const css = `
.adm {
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
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg);
  color: var(--strong);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}
.adm *, .adm *::before, .adm *::after { box-sizing: border-box; }
.adm button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.adm input { font: inherit; color: inherit; }
.adm h1, .adm h3 { margin: 0; }

/* ---------- sidebar ---------- */
.adm__side {
  position: sticky; top: 0; align-self: start; height: 100vh;
  padding: 24px 16px; background: var(--surface); border-right: 1px solid var(--border);
}
.adm__logo {
  display: flex; align-items: center; gap: 10px; margin: 0 8px 26px;
  font-size: 18px; font-weight: 700; letter-spacing: -0.03em;
}
.adm__dot { width: 12px; height: 12px; border-radius: 50%; background: var(--blue); box-shadow: 0 0 0 4px var(--blue-bg); }
.adm__nav { display: flex; flex-direction: column; gap: 6px; }
.adm .adm__navbtn {
  display: flex; align-items: center; gap: 12px; width: 100%; height: 48px; padding: 0 14px;
  border-radius: 12px; color: var(--text); font-size: 15px; font-weight: 600; text-align: left; white-space: nowrap;
}
.adm .adm__navbtn:hover { background: var(--surface-2); color: var(--strong); }
.adm .adm__navbtn.on { background: var(--blue-bg); color: var(--strong); box-shadow: inset 0 0 0 1px var(--blue-border); }
.adm__navic { font-size: 18px; line-height: 1; }
.adm__badge {
  margin-left: auto; display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px;
  border-radius: 999px; background: var(--red); color: #fff; font-size: 12px; font-weight: 700;
}

/* ---------- main ---------- */
.adm__main { min-width: 0; padding: 32px 28px 48px; }
.adm__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
.adm__head h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; }
.adm__count {
  display: inline-flex; align-items: center; height: 32px; padding: 0 14px; border-radius: 999px;
  background: var(--blue-bg); border: 1px solid var(--blue-border); color: var(--blue); font-size: 14px; font-weight: 600;
}
.adm__card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 20px; min-width: 0; }
.adm__err {
  margin: 0 0 18px; padding: 10px 12px; border-radius: 8px; font-size: 14px;
  color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
}
.adm__empty { margin: 0; padding: 30px 10px; text-align: center; color: var(--text); font-size: 14px; }
.adm__muted { color: var(--text); }
.adm__center { min-height: 100vh; display: grid; place-items: center; background: #0a0e1a; color: #8a93b3; font-family: system-ui, sans-serif; }
.adm__denied { max-width: 420px; padding: 24px; text-align: center; }
.adm__denied h1 { color: #f2f4ff; font-size: 24px; margin-bottom: 8px; }

.adm__search {
  width: 100%; height: 52px; margin-bottom: 18px; padding: 0 18px; border-radius: 12px;
  background: var(--field); border: 1px solid var(--border); outline: 0; font-size: 15px; color: var(--strong);
}
.adm__search::placeholder { color: #5d6685; }
.adm__search:focus { border-color: var(--blue); }

/* ---------- tables ---------- */
.adm__scroll { overflow-x: auto; }
.adm table { width: 100%; border-collapse: collapse; }
.adm th {
  padding: 0 14px 12px; text-align: left; color: var(--text); font-size: 13px; font-weight: 600; white-space: nowrap;
  border-bottom: 1px solid var(--border);
}
.adm td { padding: 14px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
.adm tbody tr:last-child td { border-bottom: 0; }
.adm tbody tr:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
.adm .mono { font-family: var(--mono); font-size: 13px; }
.adm td.mono { overflow-wrap: anywhere; }
.adm__addr { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---------- pills & buttons ---------- */
.adm__pill {
  display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap;
}
.adm__pill.active { color: var(--green); background: color-mix(in srgb, var(--green) 14%, transparent); }
.adm__pill.inactive { color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent); }
.adm__pill.pending { color: var(--amber); background: color-mix(in srgb, var(--amber) 14%, transparent); }

.adm .adm__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 38px; padding: 0 16px;
  border-radius: 10px; font-size: 14px; font-weight: 600; white-space: nowrap; border: 1px solid transparent;
}
.adm .adm__btn--ok { color: var(--green); background: color-mix(in srgb, var(--green) 12%, transparent); border-color: color-mix(in srgb, var(--green) 30%, transparent); }
.adm .adm__btn--no { color: var(--red); background: color-mix(in srgb, var(--red) 12%, transparent); border-color: color-mix(in srgb, var(--red) 30%, transparent); }
.adm .adm__btn--primary { height: 52px; padding: 0 24px; background: var(--blue); color: #fff; }
.adm .adm__btn--ghost { background: var(--bg); border-color: var(--border); color: var(--strong); }
.adm .adm__btn:hover { filter: brightness(1.12); }
.adm__actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ---------- chats ---------- */
.adm__chat { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; align-items: start; }
.adm__convos { display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 140px); overflow-y: auto; }
.adm .adm__convo {
  display: block; width: 100%; padding: 14px 16px; border-radius: 12px; text-align: left;
  background: var(--surface-2); border: 1px solid transparent;
}
.adm .adm__convo:hover { border-color: var(--blue-border); }
.adm .adm__convo.on { background: var(--blue-bg); border-color: var(--blue-border); }
.adm__convo-email { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 14px; font-weight: 600; color: var(--strong); }
.adm__convo-email span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.adm__live { flex: none; font-size: 11px; font-weight: 600; color: var(--amber); }
.adm__preview { margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--text); }

.adm__thread { display: flex; flex-direction: column; height: calc(100vh - 140px); min-height: 420px; padding: 0; overflow: hidden; }
.adm__thread-head { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.adm__thread-head h3 { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; font-weight: 700; }
.adm__back { display: none !important; }
.adm__msgs { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 18px; }
.adm__row { display: flex; flex-direction: column; max-width: 78%; }
.adm__row.user { align-self: flex-start; align-items: flex-start; }
.adm__row.admin { align-self: flex-end; align-items: flex-end; }
.adm__bubble { padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; white-space: pre-wrap; }
.adm__bubble.user { background: var(--surface-2); color: var(--strong); border-bottom-left-radius: 4px; }
.adm__bubble.ai { background: color-mix(in srgb, var(--green) 12%, transparent); color: var(--strong); border-bottom-right-radius: 4px; }
.adm__bubble.admin { background: var(--blue); color: #fff; border-bottom-right-radius: 4px; }
.adm__time { margin-top: 4px; font-size: 11px; color: var(--text); }
.adm__reply { display: flex; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.adm__reply input {
  flex: 1; min-width: 0; height: 48px; padding: 0 16px; border-radius: 12px; outline: 0;
  background: var(--field); border: 1px solid var(--border); color: var(--strong); font-size: 15px;
}
.adm__reply input:focus { border-color: var(--blue); }
.adm__reply .adm__btn--primary { height: 48px; }
.adm__pick { margin: auto; padding: 30px; text-align: center; color: var(--text); font-size: 14px; }

/* ---------- tablet ---------- */
@media (max-width: 1000px) {
  .adm__chat { grid-template-columns: 260px minmax(0, 1fr); }
}

/* ---------- phone / small tablet ---------- */
@media (max-width: 800px) {
  .adm { grid-template-columns: 1fr; }
  .adm__side {
    position: sticky; top: 0; z-index: 20; height: auto; padding: 10px 12px;
    border-right: 0; border-bottom: 1px solid var(--border);
  }
  .adm__logo { margin: 0 4px 10px; font-size: 16px; }
  .adm__nav { flex-direction: row; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .adm__nav::-webkit-scrollbar { display: none; }
  .adm .adm__navbtn { width: auto; flex: none; height: 42px; padding: 0 14px; gap: 8px; font-size: 14px; background: var(--surface-2); }
  .adm__main { padding: 18px 14px 32px; }
  .adm__head h1 { font-size: 22px; }
  .adm__card { padding: 14px; }

  /* tables become stacked cards */
  .adm__scroll { overflow: visible; }
  .adm table, .adm tbody, .adm tr, .adm td { display: block; width: 100%; }
  .adm thead { display: none; }
  .adm tbody { display: grid; gap: 12px; }
  .adm tbody tr { padding: 6px 16px; border-radius: 12px; background: var(--surface-2); }
  .adm tbody tr:hover { background: var(--surface-2); }
  .adm td {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0;
    text-align: right; border-bottom: 1px solid var(--border);
  }
  .adm tbody tr td:last-child { border-bottom: 0; }
  .adm td::before {
    content: attr(data-label); flex: none; color: var(--text); font-family: inherit; font-size: 13px; font-weight: 600; text-align: left;
  }
  .adm td.mono { overflow-wrap: anywhere; }
  .adm__addr { max-width: 60%; }

  /* chats: list OR thread, with a back button */
  .adm__chat { grid-template-columns: 1fr; }
  .adm__convos { max-height: none; }
  .adm__chat.has-thread .adm__convos { display: none; }
  .adm__chat:not(.has-thread) .adm__thread { display: none; }
  .adm__thread { height: calc(100dvh - 170px); min-height: 360px; }
  .adm__back { display: inline-flex !important; }
  .adm__row { max-width: 88%; }
  .adm__ai-label { display: none; }
}

@media (max-width: 420px) {
  .adm__main { padding: 14px 10px 28px; }
  .adm__thread-head { flex-wrap: wrap; }
  .adm__reply { padding: 12px; }
  .adm .adm__btn--primary { padding: 0 18px; }
}
`;

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
function formatLastLogin(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// AI is "on" unless switched off or a live agent has taken the chat
const isAiOn = (c) => c.ai_enabled !== false && c.mode !== "human";

// A pending deposit past its expiry time counts as expired
const depositStatus = (d) =>
  d.status === "pending" &&
  d.expires_at &&
  new Date(d.expires_at).getTime() < Date.now()
    ? "expired"
    : d.status;

const pillTone = (status) =>
  status === "completed" || status === "approved"
    ? "active"
    : status === "expired" || status === "failed" || status === "rejected"
      ? "inactive"
      : "pending";

export default function Admin() {
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("Users");
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Lets the realtime handler see the latest conversations without re-subscribing
  const convosRef = useRef([]);
  convosRef.current = conversations;

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setUsers(data || []);
  }

  async function loadWithdrawals() {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setWithdrawals(data || []);
  }

  async function loadDeposits() {
    const { data, error } = await supabase
      .from("deposits")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setDeposits(data || []);
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("*, profiles(email), messages(*)")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "messages", ascending: true });
    if (error) throw error;
    setConversations(data || []);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      // Block everyone except the admin user before loading any data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user || user.id !== ADMIN_UID) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);

      await Promise.all([
        loadUsers(),
        loadWithdrawals(),
        loadDeposits(),
        loadConversations(),
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Match the dark background of the other pages
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#0a0e1a";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  // Live updates: user messages, AI replies and hand-offs show up without a refresh
  useEffect(() => {
    if (!authorized) return;
    const channel = supabase
      .channel("admin-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new;
          // Brand-new conversation we haven't loaded yet
          if (!convosRef.current.some((c) => c.id === m.conversation_id)) {
            loadConversations().catch((e) => setError(e.message));
            return;
          }
          const nextMode =
            m.sender === "admin"
              ? "human"
              : { handoff: "human", mode_ai: "ai" }[m.kind];
          setConversations((prev) =>
            prev.map((c) =>
              c.id === m.conversation_id
                ? c.messages.some((x) => x.id === m.id)
                  ? c
                  : {
                      ...c,
                      messages: [...c.messages, m],
                      ...(nextMode ? { mode: nextMode } : {}),
                    }
                : c,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  // Live updates: new deposit requests appear without a refresh
  useEffect(() => {
    if (!authorized) return;
    const channel = supabase
      .channel("admin-deposits")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deposits" },
        () => {
          loadDeposits().catch((e) => setError(e.message));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  // Move stale pending deposits to "expired" and tell the user
  useEffect(() => {
    if (!authorized) return;
    async function sweep() {
      const stale = deposits.filter(
        (d) => d.status === "pending" && depositStatus(d) === "expired",
      );
      for (const d of stale) {
        await expireDeposit(d, true);
      }
    }
    sweep();
    const id = setInterval(sweep, 30000);
    return () => clearInterval(id);
  }, [authorized, deposits]);

  // ---------- Users ----------
  async function toggleUserActive(user) {
    const { error } = await supabase
      .from("profiles")
      .update({ active: !user.active })
      .eq("id", user.id);
    if (error) return setError(error.message);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)),
    );
  }

  // ---------- Deposits ----------
  async function notify(userId, type, title, message) {
    const { error } = await supabase
      .from("notifications")
      .insert({ user_id: userId, type, title, message, read: false });
    if (error) setError(error.message);
  }

  async function confirmDeposit(d) {
    setError("");
    // Only flips if it's still pending, so it can't be credited twice
    const { data: changed, error } = await supabase
      .from("deposits")
      .update({ status: "completed" })
      .eq("id", d.id)
      .eq("status", "pending")
      .select();
    if (error) return setError(error.message);
    if (!changed || changed.length === 0) {
      return setError("This deposit was already handled.");
    }

    // Read the latest balance so the credit isn't based on stale data
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", d.user_id)
      .single();
    if (profError) return setError(profError.message);

    const newBalance = Number(prof?.balance || 0) + Number(d.usd);
    const { error: balError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", d.user_id);
    if (balError) return setError(balError.message);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === d.user_id ? { ...u, balance: newBalance } : u,
      ),
    );
    setDeposits((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, status: "completed" } : x)),
    );

    await notify(
      d.user_id,
      "deposit_confirmed",
      "Deposit confirmed",
      `Your deposit of $${Number(d.usd).toFixed(2)} (${d.amount} ${d.symbol}) has been confirmed and added to your balance.`,
    );
  }

  async function expireDeposit(d, silent = false) {
    const { data: changed, error } = await supabase
      .from("deposits")
      .update({ status: "expired" })
      .eq("id", d.id)
      .eq("status", "pending")
      .select();
    if (error) return silent ? null : setError(error.message);
    if (!changed || changed.length === 0) return;

    setDeposits((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, status: "expired" } : x)),
    );
    await notify(
      d.user_id,
      "deposit_expired",
      "Deposit expired",
      `Your deposit of $${Number(d.usd).toFixed(2)} (${d.amount} ${d.symbol}) expired before payment was received. Start a new deposit to get a fresh address.`,
    );
  }

  // ---------- Withdrawals ----------
  async function updateWithdrawalStatus(w, status) {
    const { error } = await supabase
      .from("withdrawals")
      .update({ status })
      .eq("id", w.id);
    if (error) return setError(error.message);

    if (status === "completed") {
      const profile = users.find((u) => u.id === w.user_id);
      if (profile) {
        const newBalance = Number(profile.balance) - Number(w.amount);
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", w.user_id);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === w.user_id ? { ...u, balance: newBalance } : u,
          ),
        );
      }
    }

    setWithdrawals((prev) =>
      prev.map((x) => (x.id === w.id ? { ...x, status } : x)),
    );
  }

  // ---------- Messages ----------
  async function sendReply() {
    if (!selectedConvo || !replyText.trim()) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConvo,
        sender: "admin",
        text: replyText.trim(),
      })
      .select()
      .single();
    if (error) return setError(error.message);

    // Replying puts the chat in live-agent mode (the DB trigger does the same).
    // Realtime may deliver the same row, so de-dupe by id.
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvo
          ? c.messages.some((x) => x.id === data.id)
            ? { ...c, mode: "human" }
            : { ...c, messages: [...c.messages, data], mode: "human" }
          : c,
      ),
    );
    setReplyText("");
  }

  // Give the chat back to the AI, or take it over from the AI
  async function toggleAi(convo) {
    const patch = isAiOn(convo)
      ? { mode: "human" }
      : { mode: "ai", ai_enabled: true };
    const { error } = await supabase
      .from("conversations")
      .update(patch)
      .eq("id", convo.id);
    if (error) return setError(error.message);
    setConversations((prev) =>
      prev.map((c) => (c.id === convo.id ? { ...c, ...patch } : c)),
    );
  }

  const activeConvo = conversations.find((c) => c.id === selectedConvo);
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const pendingDeposits = deposits.filter(
    (d) => depositStatus(d) === "pending",
  ).length;

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="adm__center">
        <style>{css}</style>
        <p>Loading…</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="adm__center">
        <style>{css}</style>
        <div className="adm__denied">
          <h1>Access denied</h1>
          <p>You don't have permission to view the admin panel.</p>
          {error && <p style={{ color: "#ff4d5e" }}>{error}</p>}
        </div>
      </div>
    );
  }

  const titles = {
    Users: "All Users",
    Chats: "Support Chats",
    Deposits: "Deposits",
    Withdrawals: "Withdrawal Requests",
  };

  return (
    <>
      <style>{css}</style>
      <div className="adm">
        {/* Sidebar (top bar on phones) */}
        <aside className="adm__side">
          <div className="adm__logo">
            <span className="adm__dot" />
            Admin Panel
          </div>
          <nav className="adm__nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`adm__navbtn ${activeTab === item.key ? "on" : ""}`}
                onClick={() => setActiveTab(item.key)}
              >
                <span className="adm__navic">{item.icon}</span>
                {item.label}
                {item.key === "Deposits" && pendingDeposits > 0 && (
                  <span className="adm__badge">{pendingDeposits}</span>
                )}
                {item.key === "Withdrawals" && pendingCount > 0 && (
                  <span className="adm__badge">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="adm__main">
          {error && <p className="adm__err">{error}</p>}

          <div className="adm__head">
            <h1>{titles[activeTab]}</h1>
            {activeTab === "Users" && (
              <span className="adm__count">{users.length} registered</span>
            )}
          </div>

          {activeTab === "Users" && (
            <>
              <input
                type="text"
                className="adm__search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="adm__card">
                {filteredUsers.length === 0 ? (
                  <p className="adm__empty">No users found.</p>
                ) : (
                  <div className="adm__scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Registered</th>
                          <th>Last Login</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u.id}>
                            <td data-label="#">{i + 1}</td>
                            <td data-label="Name">{u.name || "—"}</td>
                            <td data-label="Email" className="mono">
                              {u.email}
                            </td>
                            <td data-label="Registered" className="mono">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td data-label="Last Login" className="mono">
                              {formatLastLogin(u.last_login)}
                            </td>
                            <td data-label="Status">
                              <span
                                className={`adm__pill ${u.active ? "active" : "inactive"}`}
                              >
                                {u.active ? "ACTIVE" : "DEACTIVATED"}
                              </span>
                            </td>
                            <td data-label="Action">
                              <button
                                type="button"
                                className={`adm__btn ${u.active ? "adm__btn--no" : "adm__btn--ok"}`}
                                onClick={() => toggleUserActive(u)}
                              >
                                {u.active ? "Deactivate" : "Reactivate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "Deposits" && (
            <div className="adm__card">
              {deposits.length === 0 ? (
                <p className="adm__empty">No deposits yet.</p>
              ) : (
                <div className="adm__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Coin</th>
                        <th>Amount (USD)</th>
                        <th>Crypto Amount</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((d) => {
                        const status = depositStatus(d);
                        return (
                          <tr key={d.id}>
                            <td data-label="User" className="mono">
                              {d.profiles?.email}
                            </td>
                            <td data-label="Coin" className="mono">
                              {d.symbol} · {d.network}
                            </td>
                            <td data-label="Amount (USD)" className="mono">
                              ${Number(d.usd).toFixed(2)}
                            </td>
                            <td data-label="Crypto Amount" className="mono">
                              {d.amount} {d.symbol}
                            </td>
                            <td data-label="Created" className="mono">
                              {formatLastLogin(d.created_at)}
                            </td>
                            <td data-label="Status">
                              <span className={`adm__pill ${pillTone(status)}`}>
                                {status.toUpperCase()}
                              </span>
                            </td>
                            <td data-label="Action">
                              {status === "pending" ? (
                                <div className="adm__actions">
                                  <button
                                    type="button"
                                    className="adm__btn adm__btn--ok"
                                    onClick={() => confirmDeposit(d)}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    className="adm__btn adm__btn--no"
                                    onClick={() => expireDeposit(d)}
                                  >
                                    Expire
                                  </button>
                                </div>
                              ) : (
                                <span className="adm__muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "Withdrawals" && (
            <div className="adm__card">
              {withdrawals.length === 0 ? (
                <p className="adm__empty">No withdrawal requests.</p>
              ) : (
                <div className="adm__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td data-label="User" className="mono">
                            {w.profiles?.email}
                          </td>
                          <td data-label="Method" className="mono">
                            {w.method}
                          </td>
                          <td data-label="Amount" className="mono">
                            ${Number(w.amount).toFixed(2)}
                          </td>
                          <td
                            data-label="Address"
                            className="mono adm__addr"
                            title={w.address}
                          >
                            {w.address}
                          </td>
                          <td data-label="Status">
                            <span className={`adm__pill ${pillTone(w.status)}`}>
                              {w.status.toUpperCase()}
                            </span>
                          </td>
                          <td data-label="Action">
                            {w.status === "pending" ? (
                              <div className="adm__actions">
                                <button
                                  type="button"
                                  className="adm__btn adm__btn--ok"
                                  onClick={() =>
                                    updateWithdrawalStatus(w, "completed")
                                  }
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="adm__btn adm__btn--no"
                                  onClick={() =>
                                    updateWithdrawalStatus(w, "rejected")
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="adm__muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "Chats" && (
            <div className={`adm__chat ${activeConvo ? "has-thread" : ""}`}>
              <div className="adm__convos">
                {conversations.length === 0 && (
                  <p className="adm__empty">No conversations yet.</p>
                )}
                {conversations.map((c) => {
                  const lastMsg = c.messages[c.messages.length - 1];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`adm__convo ${selectedConvo === c.id ? "on" : ""}`}
                      onClick={() => setSelectedConvo(c.id)}
                    >
                      <div className="adm__convo-email">
                        <span>{c.profiles?.email}</span>
                        {c.mode === "human" && (
                          <span className="adm__live">🙋 Live agent</span>
                        )}
                      </div>
                      <div className="adm__preview">
                        {lastMsg
                          ? `${lastMsg.sender === "ai" ? "🤖 " : ""}${lastMsg.text}`
                          : "No messages yet"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="adm__card adm__thread">
                {!activeConvo ? (
                  <p className="adm__pick">
                    Select a conversation to view messages.
                  </p>
                ) : (
                  <>
                    <div className="adm__thread-head">
                      <button
                        type="button"
                        className="adm__btn adm__btn--ghost adm__back"
                        onClick={() => setSelectedConvo(null)}
                      >
                        ← Back
                      </button>
                      <h3>{activeConvo.profiles?.email}</h3>
                      <button
                        type="button"
                        className={`adm__btn ${isAiOn(activeConvo) ? "adm__btn--ok" : "adm__btn--no"}`}
                        onClick={() => toggleAi(activeConvo)}
                        title="Replying switches the chat to live agent. Click to hand it back to the AI."
                      >
                        🤖 <span className="adm__ai-label">AI auto-reply:</span>{" "}
                        {isAiOn(activeConvo) ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="adm__msgs">
                      {activeConvo.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`adm__row ${m.sender === "user" ? "user" : "admin"}`}
                        >
                          <div className={`adm__bubble ${m.sender}`}>
                            {m.text}
                          </div>
                          <div className="adm__time">
                            {m.sender === "ai"
                              ? "🤖 AI · "
                              : m.sender === "admin"
                                ? "You · "
                                : ""}
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="adm__reply">
                      <input
                        type="text"
                        placeholder="Type a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      />
                      <button
                        type="button"
                        className="adm__btn adm__btn--primary"
                        onClick={sendReply}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
