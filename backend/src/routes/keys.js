import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseAdmin.js';
import { encrypt } from '../services/encryption.js';
import { checkApiKeyPermissions, getAccountBalances } from '../services/binanceService.js';

const router = Router();

// POST /api/keys — save (or replace) the user's Binance API key/secret, encrypted.
router.post('/', requireAuth, async (req, res) => {
  const { apiKey, apiSecret } = req.body;
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'apiKey and apiSecret are required' });
  }

  try {
    // Verify the key works and warn (don't block) if withdrawals are enabled —
    // users should disable withdrawal permission on Binance's side for safety.
    const permissions = await checkApiKeyPermissions(apiKey, apiSecret);

    const encKey = encrypt(apiKey);
    const encSecret = encrypt(apiSecret);

    const { error } = await supabaseAdmin.from('api_keys').upsert({
      user_id: req.user.id,
      encrypted_api_key: encKey.encrypted,
      encrypted_api_secret: encSecret.encrypted,
      // Store secret's iv/authTag; key uses its own — pack both, delimited.
      iv: `${encKey.iv}:${encSecret.iv}`,
      auth_tag: `${encKey.authTag}:${encSecret.authTag}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) throw error;

    res.json({
      success: true,
      warning: permissions.enableWithdrawals
        ? 'This API key has withdrawal permission enabled. For safety, disable it in your Binance API settings — PixellTrade only needs trade permission.'
        : null,
    });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(400).json({ error: 'Could not validate this API key against Binance. Double-check it and try again.' });
  }
});

// DELETE /api/keys — disconnect Binance account
router.delete('/', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('api_keys').delete().eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/keys/status — is a key connected? (never returns the key itself)
router.get('/status', requireAuth, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('created_at')
    .eq('user_id', req.user.id)
    .maybeSingle();
  res.json({ connected: !!data, connectedAt: data?.created_at ?? null });
});

export default router;
