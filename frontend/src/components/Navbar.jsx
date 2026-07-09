import { Link } from "react-router-dom";
import logo from "../logo - Copy.jpeg";

export default function Navbar() {
  return (
    <div className="navbar navbar-landing">
      <div className="container navbar-landing-inner">
        <Link to="/" className="logo">
          <img src={logo} alt="PixellTrade" className="navbar-logo-img" />
          PixellTrade
        </Link>
        <nav className="navbar-landing-actions">
          <Link to="/login" aria-label="Sign in" className="navbar-signin-icon">
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
          <Link to="/signup" className="btn btn-primary navbar-get-started">
            Get started
          </Link>
        </nav>
      </div>
    </div>
  );
}
