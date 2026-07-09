import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseAdmin.js';

const router = Router();

const DEFAULTS = {
  btc_accumulation: { symbol: 'BTCUSDT' },
  eth_dca_pro: { symbol: 'ETHUSDT' },
};

// GET /api/bots — list the user's bots
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bots')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/bots — create a bot
router.post('/', requireAuth, async (req, res) => {
  const { bot_type, amount_usdt, interval_hours, dip_threshold_pct, use_rsi_filter, rsi_buy_below } = req.body;

  if (!DEFAULTS[bot_type]) {
    return res.status(400).json({ error: 'bot_type must be btc_accumulation or eth_dca_pro' });
  }
  if (!amount_usdt || amount_usdt <= 0) {
    return res.status(400).json({ error: 'amount_usdt must be greater than 0' });
  }
  if (!interval_hours || interval_hours <= 0) {
    return res.status(400).json({ error: 'interval_hours must be greater than 0' });
  }

  const { data, error } = await supabaseAdmin
    .from('bots')
    .insert({
      user_id: req.user.id,
      bot_type,
      symbol: DEFAULTS[bot_type].symbol,
      amount_usdt,
      interval_hours,
      dip_threshold_pct: dip_threshold_pct ?? 0,
      use_rsi_filter: !!use_rsi_filter,
      rsi_buy_below: rsi_buy_below ?? 35,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/bots/:id — update / toggle active
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['amount_usdt', 'interval_hours', 'dip_threshold_pct', 'use_rsi_filter', 'rsi_buy_below', 'active'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await supabaseAdmin
    .from('bots')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/bots/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('bots')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/bots/:id/trades — trade history for one bot
router.get('/:id/trades', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('trades')
    .select('*')
    .eq('bot_id', req.params.id)
    .eq('user_id', req.user.id)
    .order('executed_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
