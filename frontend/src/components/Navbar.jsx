import { Link } from "react-router-dom";
import logo from "../logo - Copy.jpeg";

export default function Navbar() {
  return (
    <div className="navbar" style={{ borderBottom: "none", boxShadow: "none" }}>
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
        }}
      >
        <Link to="/" className="logo">
          <img
            src={logo}
            alt="PixellTrade"
            style={{ height: "32px", width: "auto" }}
          />
          PixellTrade
        </Link>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginLeft: "auto",
          }}
        >
          <Link
            to="/login"
            aria-label="Sign in"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              color: "inherit",
            }}
          >
            <svg
              width="20"
              height="20"
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
          </Link>
          <Link
            to="/signup"
            className="btn btn-primary"
            style={{
              padding: "8px 28px",
              borderRadius: "6px",
              lineHeight: "1",
            }}
          >
            Get started
          </Link>
        </nav>
      </div>
    </div>
  );
}
