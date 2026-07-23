import { useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTicker } from "../tickerData";

// ---------- Coin colors (only coins present in useTicker's PAIRS) ----------
const COIN_COLORS = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  XRP: "#00AAE4",
  BNB: "#F3BA2F",
  SOL: "#9945FF",
  DOGE: "#C2A633",
  ADA: "#0033AD",
  TRX: "#EF0027",
  AVAX: "#E84142",
  LINK: "#2A5ADA",
  SHIB: "#FFA409",
  SUI: "#4DA2FF",
  XLM: "#7D00FF",
  DOT: "#E6007A",
  HBAR: "#00BABC",
  BCH: "#8DC351",
  UNI: "#FF007A",
  LTC: "#A8A9AD",
  PEPE: "#00A550",
  NEAR: "#00C1DE",
  ICP: "#29ABE2",
  FET: "#1D2B55",
  MATIC: "#8247E5",
  RNDR: "#CC3000",
  ARB: "#28A0F0",
  ATOM: "#6F7390",
  SEI: "#CC3333",
  RUNE: "#2ECC71",
  MKR: "#1AAB9B",
  QNT: "#272D5A",
  LDO: "#00A3FF",
  GALA: "#0033FF",
  JASMY: "#2B4EFF",
  SAND: "#04ADEF",
  FLOW: "#00EF8B",
  MANA: "#FF2D55",
  AXS: "#0055D5",
  APE: "#0054F9",
  OP: "#FF0420",
  INJ: "#00BFFF",
  GRT: "#6F4CFF",
  AAVE: "#B6509E",
  SNX: "#00D1FF",
  CRV: "#D63636",
  ENS: "#5284FF",
  BLUR: "#FF8700",
  IMX: "#17B5CB",
  CAKE: "#FE8C00",
  COMP: "#00D395",
  YFI: "#006AE3",
  BAL: "#1E1E1E",
  ZRX: "#555",
  CHZ: "#CD0124",
  ENJ: "#7866D5",
  BAT: "#FF5000",
  ZIL: "#29CCC4",
  ONE: "#00AEE9",
  KAVA: "#FF564F",
  ALGO: "#3A3A3A",
  VET: "#15BDFF",
  THETA: "#2AB8E6",
  FIL: "#0090FF",
  EOS: "#454545",
  XTZ: "#2C7DF7",
  IOTA: "#131F37",
  NEO: "#58BF00",
  WAVES: "#0155FF",
  DASH: "#008DE4",
  XMR: "#FF6600",
  ZEC: "#ECB244",
  EGLD: "#1A4FE0",
  ROSE: "#4E8DFF",
  KSM: "#E6007A",
  CELO: "#FBCC5C",
  ANKR: "#0066FF",
  SKL: "#444",
  STORJ: "#2683FF",
  BAND: "#4520E6",
  WLD: "#555",
  STX: "#5546FF",
  CFX: "#E15F1A",
  MAGIC: "#E2175F",
  TIA: "#7B2FBE",
  PYTH: "#8B5CF6",
  JTO: "#9945FF",
  JUP: "#7AC231",
  WIF: "#B08850",
  ZK: "#1B53FF",
  EIGEN: "#5A67D8",
};

// Coins with no reliable real-logo source — excluded from Markets entirely
const EXCLUDED_COINS = new Set([
  "NEIRO",
  "BOME",
  "IO",
  "LISTA",
  "HMSTR",
  "CATI",
  "DOGS",
  "MAJOR",
]);

const EXTRA_DATA = {
  BTC: { vol: "$42.50B", mcap: "$1920.00B" },
  ETH: { vol: "$18.20B", mcap: "$415.00B" },
  XRP: { vol: "$5.20B", mcap: "$135.00B" },
  BNB: { vol: "$1.80B", mcap: "$98.00B" },
  SOL: { vol: "$4.80B", mcap: "$82.00B" },
  DOGE: { vol: "$2.80B", mcap: "$47.00B" },
  ADA: { vol: "$980.00M", mcap: "$33.50B" },
  TRX: { vol: "$620.00M", mcap: "$21.00B" },
  AVAX: { vol: "$780.00M", mcap: "$17.20B" },
  LINK: { vol: "$920.00M", mcap: "$14.50B" },
  // add more as needed – falls back to '—'
};

// Price formatter
const fmt = (p) => {
  if (p >= 1000)
    return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
};

// ---------- CoinIcon (tries 3 real-logo sources, falls back to colored circle) ----------
const CoinIcon = memo(function CoinIcon({ base, size = 36 }) {
  const [stage, setStage] = useState(0); // 0,1,2 = CDN attempts, 3 = fallback circle
  const color = COIN_COLORS[base] || "#555";
  const label = base.length <= 2 ? base : base.slice(0, 2);
  const fontSize = size <= 20 ? 8 : size <= 32 ? 11 : 13;

  const sym = base.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym}.png`,
    `https://cryptoicons.org/api/icon/${sym}/128`,
    `https://assets.coincap.io/assets/icons/${sym}@2x.png`,
  ];

  if (stage >= urls.length) {
    return (
      <div
        className="coin-circle"
        style={{
          width: size,
          height: size,
          minWidth: size,
          backgroundColor: color,
          fontSize,
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <img
      src={urls[stage]}
      alt={base}
      width={size}
      height={size}
      style={{
        minWidth: size,
        borderRadius: "50%",
        objectFit: "cover",
        backgroundColor: "#11141c",
      }}
      onError={() => setStage((s) => s + 1)}
    />
  );
});

// ---------- Main Component ----------
export default function Markets() {
  const navigate = useNavigate();
  const rawPairs = useTicker(); // from your mock data file
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(["BTC", "ETH"]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const pairs = useMemo(() => {
    return rawPairs
      .map((p) => {
        const base = p.symbol.split("/")[0];
        return {
          symbol: p.symbol,
          base,
          price: p.price,
          change: p.change,
        };
      })
      .filter((p) => !EXCLUDED_COINS.has(p.base));
  }, [rawPairs]);

  const topGainers = useMemo(
    () => [...pairs].sort((a, b) => b.change - a.change).slice(0, 3),
    [pairs],
  );
  const topLosers = useMemo(
    () => [...pairs].sort((a, b) => a.change - b.change).slice(0, 3),
    [pairs],
  );

  const filtered = useMemo(() => {
    let list = [...pairs];
    if (filter === "gainers") list = list.filter((p) => p.change >= 0);
    if (filter === "losers") list = list.filter((p) => p.change < 0);
    if (filter === "favorites")
      list = list.filter((p) => favorites.includes(p.base));
    if (search)
      list = list.filter((p) =>
        p.symbol.toLowerCase().includes(search.toLowerCase()),
      );
    if (sortKey === "name")
      list.sort((a, b) =>
        sortDir === "asc"
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol),
      );
    if (sortKey === "price")
      list.sort((a, b) =>
        sortDir === "asc" ? a.price - b.price : b.price - a.price,
      );
    if (sortKey === "change")
      list.sort((a, b) =>
        sortDir === "asc" ? a.change - b.change : b.change - a.change,
      );
    return list;
  }, [pairs, filter, search, favorites, sortKey, sortDir]);

  const toggleFav = (base) =>
    setFavorites((prev) =>
      prev.includes(base) ? prev.filter((s) => s !== base) : [...prev, base],
    );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }) => (
    <span className={`sort-icon ${sortKey === k ? "active" : ""}`}>
      {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
    </span>
  );

  return (
    <div className="markets-page">
      {/* Top Gainers & Losers */}
      <div className="movers-grid">
        {[
          { label: "Top Gainers", list: topGainers, isGain: true },
          { label: "Top Losers", list: topLosers, isGain: false },
        ].map(({ label, list, isGain }) => (
          <div key={label} className="movers-card panel">
            <div className="movers-title">{label}</div>
            {list.map((p) => (
              <div key={p.symbol} className="mover-row">
                <div className="mover-left">
                  <CoinIcon base={p.base} size={32} />
                  <div className="mover-sym">{p.base}</div>
                </div>
                <div className="mover-right">
                  <span className="mover-price mono">{fmt(p.price)}</span>
                  <span className={`mover-badge ${isGain ? "up" : "down"}`}>
                    {isGain
                      ? `↗ +${p.change.toFixed(2)}%`
                      : `↘ ${p.change.toFixed(2)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="markets-toolbar">
        <div className="markets-filters">
          {["all", "favorites", "gainers", "losers"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "favorites" ? "★" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="markets-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="panel markets-table-card">
        <div className="markets-table-scroll">
          <table className="markets-table">
            <thead>
              <tr>
                <th></th>
                <th className="th-sort" onClick={() => handleSort("name")}>
                  Name <SortIcon k="name" />
                </th>
                <th className="th-sort" onClick={() => handleSort("price")}>
                  Price <SortIcon k="price" />
                </th>
                <th className="th-sort" onClick={() => handleSort("change")}>
                  24h <SortIcon k="change" />
                </th>
                <th>Volume</th>
                <th>Market Cap</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isUp = p.change >= 0;
                const isFav = favorites.includes(p.base);
                const extra = EXTRA_DATA[p.base] || { vol: "—", mcap: "—" };
                return (
                  <tr key={p.symbol}>
                    <td className="td-star">
                      <button
                        className={`star-btn ${isFav ? "active" : ""}`}
                        onClick={() => toggleFav(p.base)}
                      >
                        ★
                      </button>
                    </td>
                    <td>
                      <div className="td-pair">
                        <CoinIcon base={p.base} size={36} />
                        <div>
                          <div className="pair-name">{p.base}</div>
                          <div className="pair-sub">{p.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-price mono">{fmt(p.price)}</td>
                    <td className={`td-change ${isUp ? "up" : "down"}`}>
                      {isUp ? "↗" : "↘"} {isUp ? "+" : ""}
                      {p.change.toFixed(2)}%
                    </td>
                    <td className="td-vol">{extra.vol}</td>
                    <td className="td-mcap">{extra.mcap}</td>
                    <td>
                      <button className="trade-btn" onClick={() => navigate("/bots")}>
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
