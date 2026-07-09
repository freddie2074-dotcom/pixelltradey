import crypto from 'crypto';
import axios from 'axios';
import 'dotenv/config';

const BASE = process.env.BINANCE_API_BASE || 'https://api.binance.com';

function sign(queryString, apiSecret) {
  return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

function buildSignedQuery(params, apiSecret) {
  const query = new URLSearchParams({ ...params, timestamp: Date.now(), recvWindow: 5000 });
  const signature = sign(query.toString(), apiSecret);
  query.append('signature', signature);
  return query.toString();
}

/** Public — no auth needed. Used for the Markets page. */
export async function getTickerPrices(symbols) {
  const { data } = await axios.get(`${BASE}/api/v3/ticker/24hr`);
  if (!symbols) return data;
  const set = new Set(symbols);
  return data.filter((d) => set.has(d.symbol));
}

/** Public — candlestick data, used for the dip/RSI indicator logic and Spot chart. */
export async function getKlines(symbol, interval = '1h', limit = 100) {
  const { data } = await axios.get(`${BASE}/api/v3/klines`, {
    params: { symbol, interval, limit },
  });
  // Each row: [openTime, open, high, low, close, volume, closeTime, ...]
  return data.map((row) => ({
    openTime: row[0],
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
    volume: parseFloat(row[5]),
  }));
}

/** Private — requires the user's own API key/secret. */
export async function getAccountBalances(apiKey, apiSecret) {
  const query = buildSignedQuery({}, apiSecret);
  const { data } = await axios.get(`${BASE}/api/v3/account?${query}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  return data.balances.filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
}

/** Private — places a real market order on the user's own Binance account. */
export async function placeMarketBuy({ apiKey, apiSecret, symbol, quoteOrderQty }) {
  const query = buildSignedQuery(
    { symbol, side: 'BUY', type: 'MARKET', quoteOrderQty },
    apiSecret
  );
  const { data } = await axios.post(`${BASE}/api/v3/order?${query}`, null, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  return data;
}

/** Validate that a key works and (ideally) only has trade permission, not withdrawal. */
export async function checkApiKeyPermissions(apiKey, apiSecret) {
  const query = buildSignedQuery({}, apiSecret);
  const { data } = await axios.get(`${BASE}/sapi/v1/account/apiRestrictions?${query}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  return data; // { enableWithdrawals, enableSpotAndMarginTrading, ... }
}
