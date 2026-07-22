import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import heroTradeImage from "../tradex.png";
import phoneImage from "../phone.jpg";

const FEATURE_CARDS = [
  {
    icon: "₿",
    title: "Bitcoin Accumulation",
    desc: "Recurring BTC buys on your schedule, with an optional extra buy triggered when price dips below your set threshold from its recent high.",
    img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  },
  {
    icon: "Ξ",
    title: "ETH DCA Pro",
    desc: "Dollar-cost averages into ETH on a custom interval, with an optional RSI filter so buys lean into oversold conditions instead of ignoring them.",
    img: "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=600&q=80",
  },
  {
    icon: "⇄",
    title: "Full custody stays with you",
    desc: "Orders execute on your own Binance account via a trade-only API key. Deposits, withdrawals, and balances are always managed directly on Binance.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  },
];

export default function Landing() {
  return (
    <div>
      <div className="container">
        <Navbar />
        <section className="hero" id="platform">
          <div className="hero-content">
            <h1 className="hero-headline-lg">
              Accumulate crypto on autopilot without handing over your funds.
            </h1>
            <p className="lede">
              PixellTrade runs disciplined, rule-based buying strategies
              directly on your own Binance account. We never hold your money you
              connect a trade-only API key, set your schedule, and the bot does
              the rest.
            </p>
            <div className="cta-row">
              <Link to="/signup" className="btn btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
            </div>
          </div>
          <div className="hero-image-col">
            <img
              src={heroTradeImage}
              alt="PixellTrade trading dashboard preview"
              className="hero-photo hero-photo-bg"
            />
          </div>
        </section>

        {/* ── STRATEGY SECTION ── */}
        <section className="section" id="bots">
          <img
            src={heroTradeImage}
            alt="PixellTrade trading dashboard preview"
            className="bots-photo-mobile"
          />
          <div className="kicker">Strategy</div>
          <h2>Two focused strategies. No noise, no guesswork.</h2>
          <p className="section-lede">
            Rather than a wall of preset bots, PixellTrade ships two strategies
            we actually stand behind — each with dip and RSI-aware buying
            layered on top of a fixed schedule.
          </p>
          <div className="strategy-grid">
            {FEATURE_CARDS.map((c) => (
              <div key={c.title} className="strategy-card">
                <div className="strategy-card-image-wrap">
                  <img src={c.img} alt={c.title} />
                  <div className="icon strategy-card-badge">{c.icon}</div>
                </div>
                <div className="strategy-card-body">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── LIVE TRADING VIEW CHART ── */}
        <section className="section" id="live-chart">
          <div className="kicker">Live Market Data</div>
          <h2>Watch the market in real time.</h2>
          <p className="section-lede" style={{ marginBottom: 32 }}>
            No need to leave the page — track live BTC/USDT price action right
            here before you connect your account.
          </p>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--panel)",
              padding: 4,
              overflow: "hidden",
            }}
          >
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_live_chart&symbol=BINANCE%3ABTCUSDT&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=121A2E&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies=[]&studies_overrides={}&overrides={%22paneProperties.background%22%3A%22%230A0E1A%22%2C%22paneProperties.vertGridProperties.color%22%3A%22%23262F4A%22%2C%22paneProperties.horzGridProperties.color%22%3A%22%23262F4A%22%2C%22scalesProperties.textColor%22%3A%22%238A93B3%22}&enabled_features=[]&disabled_features=[]&locale=en"
              style={{
                width: "100%",
                height: 500,
                border: "none",
                display: "block",
                borderRadius: "var(--radius-sm)",
              }}
              allowTransparency
              allowFullScreen
              title="Live BTC/USDT Chart"
            />
          </div>
        </section>

        {/* ── TRANSPARENCY SECTION ── */}
        <section className="section" id="markets">
          <div className="transparency-grid">
            <div>
              <div className="kicker">Transparency</div>
              <h2>Every order is logged, every trigger is explained.</h2>
              <p className="section-lede">
                Your dashboard shows exactly why each buy happened scheduled
                interval, dip trigger, or RSI trigger pulled straight from your
                real Binance order history.
              </p>
            </div>
            <div
              style={{
                backgroundImage: `url(${phoneImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: 0,
                minHeight: 400,
                border: "1px solid var(--border)",
              }}
            />
          </div>
        </section>

        <section className="section" style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 auto 18px" }}>
            Ready to automate your accumulation?
          </h2>
          <Link to="/signup" className="btn btn-primary">
            Get started free
          </Link>
        </section>
      </div>

      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 0",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <div className="container">
          © {new Date().getFullYear()} PixellTrade. Not financial advice.
          Trading involves risk.
        </div>
      </footer>
    </div>
  );
}
