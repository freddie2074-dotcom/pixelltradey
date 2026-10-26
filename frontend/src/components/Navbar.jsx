// Navbar.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../vanlogo.png";

export default function Navbar() {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState(Number(profile?.balance || 0));

  // Reseed from the DB-backed profile whenever it changes
  // (login, page refresh, admin balance edit)
  useEffect(() => {
    setBalance(Number(profile?.balance || 0));
  }, [profile?.balance]);

  // Bots dispatch this on every trade and refund — apply the delta instantly
  // so the header reflects new balance without needing a refetch.
  useEffect(() => {
    const onBalanceUpdate = (e) => {
      const delta = Number(e?.detail?.delta || 0);
      if (!delta) return;
      setBalance((b) => Math.max(0, Number(b || 0) + delta));
    };
    window.addEventListener("balance-update", onBalanceUpdate);
    return () => window.removeEventListener("balance-update", onBalanceUpdate);
  }, []);

  return (
    <>
      <style>{`
        .vtx-nav {
          --vtx-blue: #5b6ef5;
          --vtx-blue-hover: #7384f7;
          --vtx-bar-h: 56px;
          --vtx-logo-h: 84px;
          --vtx-logo-top: 4px;

          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: var(--vtx-bar-h);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px 0 12px;
          background: rgba(10, 14, 26, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 0;
        }

        .vtx-nav-logo {
          display: flex;
          align-items: flex-start;
          height: var(--vtx-bar-h);
          text-decoration: none;
          flex-shrink: 0;
          overflow: visible;
        }
        .vtx-nav-logo img {
          display: block;
          height: var(--vtx-logo-h);
          width: auto;
          max-width: 100%;
          flex-shrink: 0;
          margin-top: var(--vtx-logo-top);
          filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='k' color-interpolation-filters='sRGB'%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 3 3 3 0 -0.9'/%3E%3C/filter%3E%3C/svg%3E#k");
        }

        .vtx-nav-actions {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        /* Live balance pill — only rendered for authenticated users */
        .vtx-nav-balance {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 7px 14px;
          border-radius: 999px;
          background: rgba(91, 110, 245, 0.12);
          border: 1px solid rgba(91, 110, 245, 0.45);
          white-space: nowrap;
        }
        .vtx-nav-balance-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8a93b3;
        }
        .vtx-nav-balance-value {
          font-family: "IBM Plex Mono", Menlo, Consolas, monospace;
          font-size: 14px;
          font-weight: 700;
          color: #e7ecfb;
        }

        .vtx-nav-signin {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.15s;
        }
        .vtx-nav-signin:hover {
          color: var(--vtx-blue);
        }

        .vtx-nav-start {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 9px 22px;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.2;
          color: #ffffff;
          text-decoration: none;
          white-space: nowrap;
          border-radius: 7px;
          background: var(--vtx-blue);
          border: 1px solid var(--vtx-blue);
          transition: background 0.15s, border-color 0.15s;
        }
        .vtx-nav-start:hover {
          background: var(--vtx-blue-hover);
          border-color: var(--vtx-blue-hover);
        }

        @media (max-width: 900px) {
          .vtx-nav {
            --vtx-bar-h: 54px;
            padding: 0 14px 0 6px;
          }
          .vtx-nav-actions { gap: 16px; }
        }

        @media (max-width: 600px) {
          .vtx-nav {
            --vtx-logo-h: 70px;
            --vtx-logo-top: 3px;
            padding-top: env(safe-area-inset-top);
            height: calc(var(--vtx-bar-h) + env(safe-area-inset-top));
          }
          .vtx-nav-actions { gap: 12px; }
          .vtx-nav-signin { font-size: 13px; }
          .vtx-nav-start { padding: 8px 14px; font-size: 13px; }
          .vtx-nav-balance { padding: 5px 10px; gap: 8px; }
          .vtx-nav-balance-label { font-size: 10px; }
          .vtx-nav-balance-value { font-size: 13px; }
        }
      `}</style>

      <nav className="vtx-nav">
        <Link to="/" className="vtx-nav-logo" aria-label="VantyxTrade home">
          <img src={logo} alt="VantyxTrade" />
        </Link>

        <div className="vtx-nav-actions">
          {user ? (
            <div className="vtx-nav-balance" aria-label="Account balance">
              <span className="vtx-nav-balance-label">Balance</span>
              <span className="vtx-nav-balance-value">${balance.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <Link to="/login" className="vtx-nav-signin">
                Sign in
              </Link>
              <Link to="/signup" className="vtx-nav-start">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
