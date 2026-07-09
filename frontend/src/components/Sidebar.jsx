import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../logo - Copy.jpeg";

const links = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: "/markets",
    label: "Markets",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-4 4" />
      </svg>
    ),
  },
  {
    to: "/spot",
    label: "Spot",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 3 21 7l-4 4" />
        <path d="M3 11V9a2 2 0 0 1 2-2h16" />
        <path d="M7 21 3 17l4-4" />
        <path d="M21 13v2a2 2 0 0 1-2 2H3" />
      </svg>
    ),
  },
  {
    to: "/bots",
    label: "Bots",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="8" width="16" height="12" rx="2" />
        <path d="M12 8V4" />
        <circle cx="12" cy="4" r="1" />
        <path d="M9 13v2" />
        <path d="M15 13v2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div className="app-header-actions">
          <span className="app-header-user" aria-label="Account">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <button
            className="btn btn-ghost desktop-signout"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="logo">
          <img
            src={logo}
            alt="PixellTrade"
            style={{ height: 28, width: "auto", borderRadius: 6 }}
          />
          PixellTrade
        </div>

        <nav className="app-header-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
          <button
            className="btn btn-ghost mobile-signout"
            onClick={() => {
              closeMenu();
              handleSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
