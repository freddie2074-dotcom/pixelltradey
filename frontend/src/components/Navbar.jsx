// Navbar.jsx
import { Link } from "react-router-dom";
import logo from "../vanlogo.png";

export default function Navbar() {
  return (
    <>
      <style>{`
        .vtx-nav {
          --vtx-blue: #5b6ef5;
          --vtx-blue-hover: #7384f7;
          --vtx-bar-h: 56px;
          /* logo height: width follows the image. It overflows the bar downward
             instead of making the bar taller (same approach as the landing header). */
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

        /* logo box: bar height, aligned to the top, so a taller logo overflows downward only */
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
          /* makes the near-black background of the logo transparent
             (alpha = 3 * (r + g + b) - 0.9). Raise 0.9 if a faint box remains,
             lower it if dark edges of the logo fade. */
          filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='k' color-interpolation-filters='sRGB'%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 3 3 3 0 -0.9'/%3E%3C/filter%3E%3C/svg%3E#k");
        }

        .vtx-nav-actions {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        /* Sign in: plain text link, turns blue on hover */
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

        /* Get started: solid blue button */
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

        /* Tablet / phone */
        @media (max-width: 900px) {
          .vtx-nav {
            --vtx-bar-h: 54px;
            padding: 0 14px 0 6px;
          }
          .vtx-nav-actions { gap: 16px; }
        }

        /* Phone */
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
        }
      `}</style>

      <nav className="vtx-nav">
        <Link to="/" className="vtx-nav-logo" aria-label="VantyxTrade home">
          <img src={logo} alt="VantyxTrade" />
        </Link>

        <div className="vtx-nav-actions">
          <Link to="/login" className="vtx-nav-signin">
            Sign in
          </Link>
          <Link to="/signup" className="vtx-nav-start">
            Get started
          </Link>
        </div>
      </nav>
    </>
  );
}
