// Navbar.jsx
import { Link } from "react-router-dom";
import logo from "../logo - Copy.jpeg";

export default function Navbar() {
  return (
    <div className="navbar navbar-landing">
      <div className="container navbar-landing-inner">
        <Link to="/" className="logo">
          <img src={logo} alt="PixellTrade" className="navbar-logo-img" />
          <span className="navbar-logo-text">PixellTrade</span>
        </Link>
        <nav className="navbar-landing-actions">
          <Link to="/login" className="navbar-signin-link">
            Sign in
          </Link>
          <Link to="/signup" className="btn btn-primary navbar-get-started">
            Get started
          </Link>
        </nav>
      </div>
    </div>
  );
}
