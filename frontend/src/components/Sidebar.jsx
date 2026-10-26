import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../vanlogo.png";

/* ------------------------------------------------------------------
   Icons (inline SVG, so no extra package is needed)
------------------------------------------------------------------- */
function Svg({ size = 16, children }) {
  return (
    <svg
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

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  markets: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-4-4-4 4" />
    </>
  ),
  spot: (
    <>
      <path d="M17 3 21 7l-4 4" />
      <path d="M3 11V9a2 2 0 0 1 2-2h16" />
      <path d="M7 21 3 17l4-4" />
      <path d="M21 13v2a2 2 0 0 1-2 2H3" />
    </>
  ),
  deposit: (
    <>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </>
  ),
  withdraw: (
    <>
      <path d="M17 7 7 17" />
      <path d="M17 17H7V7" />
    </>
  ),
  bots: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4" />
      <circle cx="12" cy="4" r="1" />
      <path d="M9 13v2" />
      <path d="M15 13v2" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/spot", label: "Trade", icon: "spot" },
  { to: "/markets", label: "Markets", icon: "markets" },
  { to: "/deposit", label: "Deposit", icon: "deposit" },
  { to: "/withdraw", label: "Withdraw", icon: "withdraw" },
  { to: "/bots", label: "Bots", icon: "bots" },
];

/* ------------------------------------------------------------------
   Styles
------------------------------------------------------------------- */
const LOGO_KEY_FILTER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='k' color-interpolation-filters='sRGB'%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 3 3 3 0 -0.9'/%3E%3C/filter%3E%3C/svg%3E#k\")";

const css = `
.sb,
.sb-drawer,
.sb-overlay {
  --sb-bg: #0a0e1a;
  --sb-surface: #121a2e;
  --sb-border: #1f2842;
  --sb-text: #8a93b3;
  --sb-text-strong: #f2f4ff;
  --sb-blue: var(--accent, #5b6ef5);
  --sb-blue-bg: color-mix(in srgb, var(--sb-blue) 12%, transparent);
  --sb-blue-border: color-mix(in srgb, var(--sb-blue) 28%, transparent);
  --sb-red: #ff3b4e;
  --sb-h: 56px;
  --sb-logo-h: 50px;
}

/* ---------- Header ---------- */
.sb {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: var(--sb-h);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px 0 12px;
  background: var(--sb-bg);
  border-bottom: 1px solid var(--sb-border);
  box-sizing: border-box;
  overflow: hidden;
}

.sb__logo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  height: var(--sb-h);
}
.sb__logo img {
  display: block;
  height: var(--sb-logo-h);
  width: auto;
  max-width: 100%;
  flex-shrink: 0;
  filter: ${LOGO_KEY_FILTER};
}

.sb__links {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sb__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  color: var(--sb-text);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  outline: none;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.sb__link svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.sb__link:hover {
  color: var(--sb-text-strong);
}
.sb__link:focus-visible {
  border-color: var(--sb-blue-border);
}
.sb__link.is-active {
  color: var(--sb-blue);
  background: var(--sb-blue-bg);
  border-color: var(--sb-blue-border);
}

.sb__search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 110px;
  height: 36px;
  padding: 0 14px;
  margin-left: 8px;
  background: var(--sb-surface);
  border: 1px solid var(--sb-border);
  border-radius: 8px;
  color: var(--sb-text);
  transition: border-color 0.15s;
}
.sb__search svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.sb__search:focus-within {
  border-color: var(--sb-blue-border);
}
.sb__search input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--sb-text-strong);
  font-size: 13px;
  font-family: inherit;
}
.sb__search input::placeholder {
  color: var(--sb-text);
}

.sb__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sb__balance {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  background: var(--sb-surface);
  border: 1px solid var(--sb-border);
  border-radius: 8px;
  color: var(--sb-text-strong);
  font-size: 13px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.sb__balance svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--sb-blue);
}
.sb__balance:hover {
  border-color: #2f3a5c;
}

.sb__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--sb-text-strong);
  cursor: pointer;
  text-decoration: none;
  outline: none;
  font-family: inherit;
  transition: background 0.15s;
}
.sb__icon svg {
  width: 18px;
  height: 18px;
}
.sb__icon:hover,
.sb__icon:focus-visible {
  background: var(--sb-surface);
}
.sb__icon--blue {
  color: var(--sb-blue);
}
.sb__icon--red {
  color: var(--sb-red);
}

.sb__badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sb-blue);
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.sb__burger {
  display: none;
}

/* ---------- Drawer ---------- */
.sb-drawer,
.sb-overlay {
  display: none;
}

@media (max-width: 1560px) {
  .sb {
    gap: 16px;
    padding: 0 20px 0 12px;
  }
  .sb__link {
    padding: 0 11px;
  }
}

@media (max-width: 1440px) {
  .sb {
    gap: 12px;
    padding: 0 16px 0 12px;
  }
  .sb__links {
    gap: 4px;
  }
  .sb__link {
    padding: 0 9px;
    gap: 6px;
  }
  .sb__search {
    margin-left: 0;
  }
  .sb__right {
    gap: 6px;
  }
  .sb__balance {
    padding: 0 12px;
  }
}

@media (max-width: 1300px) {
  .sb__link {
    padding: 0 8px;
  }
}

@media (max-width: 1180px) {
  .sb,
  .sb-drawer,
  .sb-overlay {
    --sb-h: 54px;
    --sb-logo-h: 46px;
  }

  .sb {
    padding: 0 12px 0 6px;
    gap: 6px;
  }

  .sb__links,
  .sb__search,
  .sb__balance {
    display: none;
  }

  .sb__right {
    margin-left: auto;
    gap: 2px;
  }
  .sb__icon {
    width: 34px;
    height: 34px;
  }
  .sb__burger {
    display: inline-flex;
  }

  .sb-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s;
  }
  .sb-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .sb-drawer {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1110;
    width: min(78vw, 300px);
    padding: 18px 18px 24px;
    background: var(--sb-bg);
    border-left: 1px solid var(--sb-border);
    overflow-y: auto;
    transform: translateX(100%);
    visibility: hidden;
    transition: transform 0.28s ease, visibility 0.28s;
  }
  .sb-drawer.is-open {
    transform: translateX(0);
    visibility: visible;
  }

  .sb-drawer__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .sb-drawer__head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--sb-text-strong);
  }
  .sb-drawer__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: var(--sb-text);
    cursor: pointer;
  }
  .sb-drawer__close:hover {
    color: var(--sb-text-strong);
    background: var(--sb-surface);
  }

  .sb-drawer__nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sb-drawer__link {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--sb-text);
    font-size: 15px;
    font-weight: 500;
    font-family: inherit;
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
  }
  .sb-drawer__link:hover {
    color: var(--sb-text-strong);
  }
  .sb-drawer__link.is-active {
    color: var(--sb-blue);
    background: var(--sb-blue-bg);
    border-color: var(--sb-blue-border);
  }
  .sb-drawer__link--accent {
    color: var(--sb-blue);
  }

  .sb-drawer__divider {
    height: 1px;
    margin: 14px 0;
    background: var(--sb-border);
  }

  .sb-drawer__balance {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    margin-bottom: 10px;
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 10px;
    color: var(--sb-text-strong);
    font-size: 15px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-decoration: none;
  }
  .sb-drawer__balance svg {
    color: var(--sb-blue);
  }

  .sb-drawer__search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    margin-bottom: 10px;
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 10px;
    color: var(--sb-text);
  }
  .sb-drawer__search:focus-within {
    border-color: var(--sb-blue-border);
  }
  .sb-drawer__search input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 0;
    outline: 0;
    color: var(--sb-text-strong);
    font-size: 14px;
    font-family: inherit;
  }
  .sb-drawer__search input::placeholder {
    color: var(--sb-text);
  }
}

@media (max-width: 380px) {
  .sb,
  .sb-drawer,
  .sb-overlay {
    --sb-logo-h: 40px;
  }
  .sb__icon {
    width: 32px;
  }
}
`;

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------- */
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Same balance the Dashboard shows (profiles.balance), kept live via realtime
  const [userId, setUserId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel = null;

    async function loadBalance() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("balance, name")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        if (!cancelled) {
          setBalance(Number(data?.balance) || 0);
          setDisplayName(
            data?.name ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "",
          );
        }

        channel = supabase
          .channel("header-balance-changes")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles" },
            (payload) => {
              if (payload.new.id === user.id) {
                setBalance(Number(payload.new.balance) || 0);
                if (payload.new.name) setDisplayName(payload.new.name);
              }
            },
          )
          .subscribe();
      } catch (e) {
        console.error("Failed to load header balance:", e.message);
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Live-update balance whenever a bot trade / start / stop fires.
  // Bots dispatch: new CustomEvent("balance-update", { detail: { delta } })
  // AFTER the corresponding supabase RPC has committed, so refetching
  // profiles.balance returns the authoritative value. Refetching (rather
  // than applying the delta) avoids double-counting against the realtime
  // subscription above.
  useEffect(() => {
    if (!userId) return;

    async function refetchBalance() {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();
      if (!error) setBalance(Number(data?.balance) || 0);
    }

    const handler = () => refetchBalance();
    window.addEventListener("balance-update", handler);
    return () => window.removeEventListener("balance-update", handler);
  }, [userId]);

  // unread notification count for the bell badge (refreshes on page change)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadUnread() {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false);
        if (!error && !cancelled) setUnread(count || 0);
      } catch {
        /* badge simply stays hidden if the table isn't available */
      }
    }

    loadUnread();
    return () => {
      cancelled = true;
    };
  }, [userId, location.pathname]);

  // close the drawer whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // lock page scroll + Escape key while the drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function onSearch(e) {
    e.preventDefault();
    const q = query.trim();
    setMenuOpen(false);
    navigate(q ? `/markets?q=${encodeURIComponent(q)}` : "/markets");
  }

  const balanceText = balance === null ? "…" : `$${balance.toFixed(2)}`;
  const linkClass = ({ isActive }) => `sb__link ${isActive ? "is-active" : ""}`;
  const drawerLinkClass = ({ isActive }) =>
    `sb-drawer__link ${isActive ? "is-active" : ""}`;

  return (
    <>
      <style>{css}</style>

      <header className="sb">
        <Link to="/dashboard" className="sb__logo">
          <img src={logo} alt="VantyxTrade" />
        </Link>

        <nav className="sb__links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              <Svg size={15}>{ICONS[l.icon]}</Svg>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <form className="sb__search" onSubmit={onSearch} role="search">
          <Svg size={16}>{ICONS.search}</Svg>
          <input
            type="text"
            placeholder="Search markets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search markets"
          />
        </form>

        <div className="sb__right">
          <Link to="/deposit" className="sb__balance" title="Available balance">
            <Svg size={16}>{ICONS.wallet}</Svg>
            <span>{balanceText}</span>
          </Link>

          <Link
            to="/verify"
            className="sb__icon sb__icon--blue"
            aria-label="Verify identity"
          >
            <Svg size={18}>{ICONS.shield}</Svg>
          </Link>

          <Link
            to="/notifications"
            className="sb__icon"
            aria-label="Notifications"
          >
            <Svg size={18}>{ICONS.bell}</Svg>
            {unread > 0 && (
              <span className="sb__badge">{unread > 9 ? "9+" : unread}</span>
            )}
          </Link>

          <Link
            to="/profile"
            className="sb__icon"
            aria-label="Profile"
            title={displayName || "Profile"}
          >
            <Svg size={18}>{ICONS.user}</Svg>
          </Link>

          <button
            className="sb__icon sb__icon--red"
            onClick={handleSignOut}
            aria-label="Sign out"
            type="button"
          >
            <Svg size={18}>{ICONS.logout}</Svg>
          </button>

          <button
            className="sb__icon sb__burger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            type="button"
          >
            <Svg size={22}>{ICONS.menu}</Svg>
          </button>
        </div>
      </header>

      <div
        className={`sb-overlay ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sb-drawer ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="sb-drawer__head">
          <h2>Menu</h2>
          <button
            className="sb-drawer__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            <Svg size={20}>{ICONS.close}</Svg>
          </button>
        </div>

        <nav className="sb-drawer__nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={drawerLinkClass}>
              <Svg size={18}>{ICONS[l.icon]}</Svg>
              <span>{l.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/verify"
            className="sb-drawer__link sb-drawer__link--accent"
          >
            <Svg size={18}>{ICONS.shield}</Svg>
            <span>Verify Identity</span>
          </NavLink>
        </nav>

        <div className="sb-drawer__divider" />

        <Link to="/deposit" className="sb-drawer__balance">
          <Svg size={18}>{ICONS.wallet}</Svg>
          <span>{balanceText}</span>
        </Link>

        <form className="sb-drawer__search" onSubmit={onSearch} role="search">
          <Svg size={18}>{ICONS.search}</Svg>
          <input
            type="text"
            placeholder="Search markets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search markets"
          />
        </form>
      </aside>
    </>
  );
}
