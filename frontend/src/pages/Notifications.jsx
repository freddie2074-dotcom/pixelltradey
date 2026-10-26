import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const css = `
.nt {
  --bg: #0a0e1a;
  --surface: #121a2e;
  --border: #1f2842;
  --text: #8a93b3;
  --strong: #f2f4ff;
  --blue: var(--accent, #5b6ef5);
  --blue-bg: color-mix(in srgb, var(--blue) 12%, transparent);
  --blue-border: color-mix(in srgb, var(--blue) 28%, transparent);
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 24px 48px;
  color: var(--text);
  box-sizing: border-box;
}
.nt *, .nt *::before, .nt *::after { box-sizing: border-box; }
.nt__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.nt h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: var(--strong); }
.nt__sub { margin: 0; font-size: 14px; }
.nt__btn {
  height: 36px; padding: 0 14px; font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--strong); background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; cursor: pointer; transition: border-color .15s;
}
.nt__btn:hover { border-color: #2f3a5c; }
.nt__btn:disabled { opacity: .5; cursor: not-allowed; }
.nt__tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.nt__tab {
  height: 32px; padding: 0 14px; font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--text); background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer;
}
.nt__tab:hover { color: var(--strong); }
.nt__tab.is-on { color: var(--blue); background: var(--blue-bg); border-color: var(--blue-border); }
.nt__list { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.nt__item {
  display: flex; gap: 14px; width: 100%; padding: 16px 18px; text-align: left; font-family: inherit;
  color: var(--text); background: transparent; border: 0; border-top: 1px solid var(--border);
  cursor: pointer; transition: background .15s;
}
.nt__item:first-child { border-top: 0; }
.nt__item:hover { background: rgba(255,255,255,.02); }
.nt__dot { flex-shrink: 0; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: transparent; }
.nt__item.is-unread .nt__dot { background: var(--blue); }
.nt__body { flex: 1; min-width: 0; }
.nt__title { margin: 0 0 3px; font-size: 14px; font-weight: 500; color: var(--text); }
.nt__item.is-unread .nt__title { font-weight: 700; color: var(--strong); }
.nt__text { margin: 0; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
.nt__time { flex-shrink: 0; font-size: 11px; white-space: nowrap; }
.nt__empty { padding: 48px 20px; text-align: center; font-size: 14px; }
.nt__empty b { display: block; margin-bottom: 4px; color: var(--strong); font-size: 15px; }
@media (max-width: 600px) {
  .nt { padding: 0 14px 32px; }
  .nt__item { flex-wrap: wrap; }
  .nt__time { order: 3; width: 100%; padding-left: 22px; }
}
`;

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let channel = null;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setItems(data || []);

        channel = supabase
          .channel("notifications-page")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
            (payload) => setItems((prev) => [payload.new, ...prev]),
          )
          .subscribe();
      } catch (e) {
        console.error("Failed to load notifications:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((n) => !n.read).length;
  const shown = filter === "unread" ? items.filter((n) => !n.read) : items;

  async function markRead(n) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    if (error) {
      console.error(error.message);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
    }
  }

  async function markAllRead() {
    if (!userId || !unread) return;
    const before = items;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) {
      console.error(error.message);
      setItems(before);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="nt">
        <div className="nt__head">
          <div>
            <h1>Notifications</h1>
            <p className="nt__sub">
              {unread ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <button className="nt__btn" onClick={markAllRead} disabled={!unread} type="button">
            Mark all as read
          </button>
        </div>

        <div className="nt__tabs">
          <button
            type="button"
            className={`nt__tab ${filter === "all" ? "is-on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`nt__tab ${filter === "unread" ? "is-on" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
        </div>

        <div className="nt__list">
          {loading ? (
            <div className="nt__empty">Loading...</div>
          ) : shown.length === 0 ? (
            <div className="nt__empty">
              <b>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</b>
              Deposit, withdrawal and account updates will appear here.
            </div>
          ) : (
            shown.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`nt__item ${n.read ? "" : "is-unread"}`}
                onClick={() => markRead(n)}
              >
                <span className="nt__dot" />
                <span className="nt__body">
                  <p className="nt__title">{n.title || "Notification"}</p>
                  {n.message && <p className="nt__text">{n.message}</p>}
                </span>
                <span className="nt__time">{timeAgo(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
