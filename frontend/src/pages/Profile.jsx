import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const css = `
.pf {
  --bg: #000;
  --border: #242424;
  --muted: #a1a1aa;
  --strong: #fff;
  --green: #22e58b;
  --green-bg: rgba(34, 229, 139, .14);
  --green-border: rgba(34, 229, 139, .35);
  --blue: #5b9bff;
  --blue-bg: rgba(91, 155, 255, .14);
  --blue-border: rgba(91, 155, 255, .35);
  --red: #ff4d5e;
  max-width: 640px;
  margin: 0 auto;
  padding: 88px 20px 56px;
  color: var(--muted);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  box-sizing: border-box;
}
.pf *, .pf *::before, .pf *::after { box-sizing: border-box; }
.pf h1 { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 700; color: var(--strong); }
.pf__sub { margin: 6px 0 24px; font-size: 14.5px; color: var(--muted); }

.pf__card {
  margin-bottom: 24px; padding: 24px 24px 12px;
  background: transparent; border: 1px solid var(--border); border-radius: 12px;
}
.pf__head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.pf__icon {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 50px; height: 50px; border-radius: 50%; border: 1px solid;
}
.pf__icon--green { color: var(--green); background: var(--green-bg); border-color: var(--green-border); }
.pf__icon--blue { color: var(--blue); background: var(--blue-bg); border-color: var(--blue-border); }
.pf__titles { flex: 1; min-width: 0; padding-top: 2px; }
.pf__titles h2 { margin: 0; font-size: 17px; font-weight: 600; color: var(--strong); }
.pf__titles p { margin: 3px 0 0; font-size: 14px; color: var(--muted); }
.pf__edit {
  display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
  margin-top: 6px; color: var(--muted); background: none; border: 0; border-radius: 8px; cursor: pointer;
  transition: color .15s, background .15s;
}
.pf__edit:hover { color: var(--strong); background: #1c1c1c; }

.pf__row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  min-height: 61px; border-bottom: 1px solid var(--border); font-size: 14.5px;
}
.pf__row:last-child { border-bottom: 0; }
.pf__key { display: flex; align-items: center; gap: 10px; flex-shrink: 0; color: var(--muted); }
.pf__key svg { flex-shrink: 0; }
.pf__val { min-width: 0; text-align: right; font-weight: 600; color: var(--strong); overflow-wrap: anywhere; }
.pf__val--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px;
  font-weight: 400; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pf__badge {
  padding: 5px 10px; font-size: 12.5px; font-weight: 500; color: #b4b4b4;
  background: #181818; border: 1px solid #2a2a2a; border-radius: 4px;
}
.pf__badge--ok { color: var(--green); background: var(--green-bg); border-color: var(--green-border); }

.pf__input {
  width: 100%; max-width: 260px; height: 38px; padding: 0 12px; font-family: inherit; font-size: 14px;
  text-align: right; color: var(--strong); background: #0a0a0a; border: 1px solid var(--border);
  border-radius: 8px; outline: none; transition: border-color .15s;
}
.pf__input:focus { border-color: var(--blue-border); }
.pf__input:disabled { opacity: .55; cursor: not-allowed; }
.pf__input::placeholder { color: #5b5b63; }

.pf__actions { display: flex; gap: 10px; margin-top: 16px; }
.pf__btn {
  flex: 1; height: 42px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  color: #000; background: var(--green); border: 1px solid var(--green); border-radius: 8px;
  transition: opacity .15s;
}
.pf__btn:hover { opacity: .9; }
.pf__btn:disabled { opacity: .5; cursor: not-allowed; }
.pf__btn--ghost { color: var(--strong); background: transparent; border-color: var(--border); }
.pf__btn--ghost:hover { background: #1a1a1a; opacity: 1; }

.pf__msg { margin-top: 14px; padding: 10px 12px; font-size: 13px; border-radius: 8px; border: 1px solid; }
.pf__msg--ok { color: var(--green); border-color: var(--green-border); background: var(--green-bg); }
.pf__msg--err { color: var(--red); border-color: rgba(255, 77, 94, .35); background: rgba(255, 77, 94, .1); }


@media (max-width: 480px) {
  .pf { padding: 76px 14px 40px; }
  .pf__card { padding: 18px; }
  .pf__input { max-width: 180px; }
}
`;

const I = {
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  ),
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  pencil: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
  ),
  userLg: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
  ),
  shieldLg: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

function splitName(full) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

function Row({ icon, label, children }) {
  return (
    <div className="pf__row">
      <span className="pf__key">{icon}{label}</span>
      {children}
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  function fillFrom(data, u) {
    const n = splitName(data?.name || u?.user_metadata?.full_name || "");
    setFirst(data?.first_name || n.first);
    setLast(data?.last_name || n.last);
    setPhone(data?.phone || "");
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u || cancelled) return;
        setUser(u);
        const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).single();
        if (error) throw error;
        if (cancelled) return;
        setProfile(data);
        fillFrom(data, u);
      } catch (e) {
        console.error("Failed to load profile:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function cancelEdit() {
    fillFrom(profile, user);
    setInfoMsg(null);
    setEditing(false);
  }

  async function saveInfo(e) {
    e.preventDefault();
    if (!user) return;
    setInfoMsg(null);
    setSavingInfo(true);
    try {
      const fullName = [first.trim(), last.trim()].filter(Boolean).join(" ");
      const { error } = await supabase
        .from("profiles")
        .update({ name: fullName, phone: phone.trim() })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p) => ({ ...p, name: fullName, phone: phone.trim() }));
      setInfoMsg({ type: "ok", text: "Profile saved." });
      setEditing(false);
    } catch (err) {
      setInfoMsg({ type: "err", text: err.message || "Could not save your profile." });
    } finally {
      setSavingInfo(false);
    }
  }

  // Adjust these field names if your profiles table uses a different column for verification.
  const verified = Boolean(profile?.verified ?? profile?.is_verified ?? profile?.kyc_verified);
  const dash = loading ? "…" : "—";

  return (
    <>
      <style>{css}</style>
      <div className="pf">
        <h1>Profile</h1>
        <p className="pf__sub">Manage your account information</p>

        {/* Personal information */}
        <form className="pf__card" onSubmit={saveInfo}>
          <div className="pf__head">
            <div className="pf__icon pf__icon--green">{I.userLg}</div>
            <div className="pf__titles">
              <h2>Personal Information</h2>
              <p>Your basic profile details</p>
            </div>
            {!editing && (
              <button className="pf__edit" type="button" aria-label="Edit profile" onClick={() => { setInfoMsg(null); setEditing(true); }}>
                {I.pencil}
              </button>
            )}
          </div>

          <Row icon={I.user} label="First Name">
            {editing ? (
              <input className="pf__input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" aria-label="First name" />
            ) : (
              <span className="pf__val">{first || dash}</span>
            )}
          </Row>
          <Row icon={I.user} label="Last Name">
            {editing ? (
              <input className="pf__input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" aria-label="Last name" />
            ) : (
              <span className="pf__val">{last || dash}</span>
            )}
          </Row>
          <Row icon={I.mail} label="Email">
            {editing ? (
              <input className="pf__input" value={user?.email || ""} disabled readOnly aria-label="Email" />
            ) : (
              <span className="pf__val">{user?.email || dash}</span>
            )}
          </Row>
          <Row icon={I.phone} label="Phone">
            {editing ? (
              <input className="pf__input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" aria-label="Phone" />
            ) : (
              <span className="pf__val">{phone || dash}</span>
            )}
          </Row>

          {editing && (
            <div className="pf__actions">
              <button className="pf__btn pf__btn--ghost" type="button" onClick={cancelEdit} disabled={savingInfo}>Cancel</button>
              <button className="pf__btn" type="submit" disabled={savingInfo || loading}>
                {savingInfo ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
          {infoMsg && <div className={`pf__msg pf__msg--${infoMsg.type}`}>{infoMsg.text}</div>}
        </form>

        {/* Account information */}
        <div className="pf__card">
          <div className="pf__head">
            <div className="pf__icon pf__icon--blue">{I.shieldLg}</div>
            <div className="pf__titles">
              <h2>Account Information</h2>
              <p>Your account details</p>
            </div>
          </div>

          <Row icon={I.calendar} label="Member Since">
            <span className="pf__val">{fmtDate(user?.created_at)}</span>
          </Row>
          <Row icon={I.shield} label="Account Status">
            <span className={`pf__badge${verified ? " pf__badge--ok" : ""}`}>{verified ? "Verified" : "Not Verified"}</span>
          </Row>
          <Row icon={I.user} label="User ID">
            <span className="pf__val pf__val--mono" title={user?.id}>{user?.id || dash}</span>
          </Row>
        </div>
      </div>
    </>
  );
}
