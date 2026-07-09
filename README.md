# PixellTrade

A non-custodial crypto accumulation platform. PixellTrade never holds user funds —
each user connects their own Binance API key (trade-only, no withdrawal permission),
and two bots place real recurring orders directly on that user's own Binance account:

- **Bitcoin Accumulation** — scheduled BTC buys, with an optional extra buy triggered
  by a dip from the recent high.
- **ETH DCA Pro** — scheduled ETH buys, with an optional RSI(14) oversold filter.

Deposits and withdrawals are never handled inside the app — the Dashboard links out
to Binance's own deposit/withdrawal pages, since funds always live on Binance.

## Structure

```
pixell-trade/
  frontend/     React + Vite app (landing, auth, dashboard, markets, spot, bots)
  backend/      Node.js/Express API + cron scheduler that executes bot orders
  supabase/     schema.sql — run this in the Supabase SQL editor
```

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Grab your Project URL, anon key, and **service role key** from Settings → API.

### 2. Backend
```bash
cd backend
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and generate ENCRYPTION_MASTER_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npm run dev
```
Runs on `http://localhost:4000`. The scheduler starts automatically and checks
every 5 minutes whether any active bot is due to run (each bot has its own
`interval_hours`).

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the anon key, not service role)
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Security notes

- The Supabase **service role key** must only ever live in the backend `.env` —
  never ship it to the frontend. The frontend only uses the anon key, and RLS
  policies in `schema.sql` restrict every table to its owner.
- `api_keys` (encrypted Binance credentials) has RLS enabled with **no** policies
  granted to `authenticated`/`anon` — only the backend's service-role client can
  read or write it.
- Binance API secrets are encrypted with AES-256-GCM using `ENCRYPTION_MASTER_KEY`
  before being stored, and only decrypted in-memory in the backend when placing
  an order.
- Users should create their Binance API key with **Spot Trading only** —
  withdrawal permission should stay disabled on Binance's side. Settings page
  warns them if a connected key has withdrawals enabled.

## What's intentionally out of scope

This is a working scaffold, not a finished production app. Before handling real
users' money, you'd still want: rate-limit handling / backoff on Binance API
errors, order retry logic, email confirmations for bot activation, a proper
logging/monitoring setup for the scheduler process, and legal review (terms of
service, risk disclosures) appropriate for a trading tool in your jurisdiction.
