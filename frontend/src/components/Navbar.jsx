// Navbar.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../vanlogo.png";

const BALANCE_KEY = "vt_balance";
const USER_KEY = "vt_user";

export default function Navbar() {
  const [balance, setBalance] = useState(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(BALANCE_KEY) : null;
    return raw ? Number(raw) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(USER_KEY);
  });

  // Listen for balance-update events (dispatched by bots on each trade/refund)
  useEffect(() => {
    const onBalanceUpdate = (e) => {
      const delta = Number(e?.detail?.delta || 0);
      if (!delta) return;
      setBalance((b) => {
        const next = Math.max(0, Number(b ?? 0) + delta);
        localStorage.setItem(BALANCE_KEY, String(next));
        return next;
      });
    };
    window.addEventListener("balance-update", onBalanceUpdate);
    return () => window.removeEventListener("balance-update", onBalanceUpdate);
  }, []);

  // Listen for a "user-logged-in" / "user-logged-out" event to toggle
  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem(BALANCE_KEY);
      setIsLoggedIn(!!localStorage.getItem(USER_KEY));
      if (raw !== null) setBalance(Number(raw));
    };
    // Also listen for storage events (from other tabs)
    window.addEventListener("storage", check);
    // And a custom event if the app dispatches one
    window.addEventListener("user-changed", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("user-changed", check);
    };
  }, []);

  const showBalance = isLoggedIn && balance !== null;

  return (
    <>
      <style>{/* ... same as before ... */}</style>
      <nav className="vtx-nav">
        <Link to="/" className="vtx-nav-logo" aria-label="VantyxTrade home">
          <img src={logo} alt="VantyxTrade" />
        </Link>

        <div className="vtx-nav-actions">
          {showBalance ? (
            <div className="vtx-nav-balance" aria-label="Account balance">
              <span className="vtx-nav-balance-label">Balance</span>
              <span className="vtx-nav-balance-value">${balance.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <Link to="/login" className="vtx-nav-signin">Sign in</Link>
              <Link to="/signup" className="vtx-nav-start">Get started</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
