import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDecryptedKey } from '../services/userKeys.js';
import { getTickerPrices, getKlines, getAccountBalances, placeMarketBuy } from '../services/binanceService.js';
import { supabaseAdmin } from '../supabaseAdmin.js';

const router = Router();

// GET /api/market/tickers?symbols=BTCUSDT,ETHUSDT — public, powers Markets page
router.get('/tickers', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : undefined;
    const data = await getTickerPrices(symbols);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Binance' });
  }
});

// GET /api/market/klines?symbol=BTCUSDT&interval=1h — public, powers Spot chart
router.get('/klines', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 100 } = req.query;
    const data = await getKlines(symbol, interval, Number(limit));
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Binance' });
  }
});

// GET /api/market/balance — private, requires the user's connected key
router.get('/balance', requireAuth, async (req, res) => {
  const creds = await getDecryptedKey(req.user.id);
  if (!creds) return res.status(400).json({ error: 'No Binance API key connected yet' });

  try {
    const balances = await getAccountBalances(creds.apiKey, creds.apiSecret);
    res.json(balances);
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(400).json({ error: 'Could not fetch balance. Your API key may be invalid or restricted.' });
  }
});

// POST /api/market/order — manual market buy on the Spot page (user's own account/keys)
router.post('/order', requireAuth, async (req, res) => {
  const { symbol, usdtAmount } = req.body;
  if (!symbol || !usdtAmount || usdtAmount <= 0) {
    return res.status(400).json({ error: 'symbol and a positive usdtAmount are required' });
  }

  const creds = await getDecryptedKey(req.user.id);
  if (!creds) return res.status(400).json({ error: 'No Binance API key connected yet' });

  try {
    const order = await placeMarketBuy({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      symbol,
      quoteOrderQty: usdtAmount,
    });

    await supabaseAdmin.from('trades').insert({
      user_id: req.user.id,
      symbol,
      side: 'BUY',
      quantity: parseFloat(order.executedQty),
      price: parseFloat(order.cummulativeQuoteQty) / parseFloat(order.executedQty),
      usdt_amount: parseFloat(order.cummulativeQuoteQty),
      binance_order_id: String(order.orderId),
      reason: 'manual',
    });

    res.json(order);
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(400).json({ error: 'Order failed. Check your balance and API key permissions.' });
  }
});

export default router;
