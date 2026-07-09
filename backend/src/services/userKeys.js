import { supabaseAdmin } from '../supabaseAdmin.js';
import { decrypt } from './encryption.js';

/**
 * Loads and decrypts a user's Binance API key/secret.
 * Returns null if the user hasn't connected a key.
 */
export async function getDecryptedKey(userId) {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const [keyIv, secretIv] = data.iv.split(':');
  const [keyTag, secretTag] = data.auth_tag.split(':');

  const apiKey = decrypt({ encrypted: data.encrypted_api_key, iv: keyIv, authTag: keyTag });
  const apiSecret = decrypt({ encrypted: data.encrypted_api_secret, iv: secretIv, authTag: secretTag });

  return { apiKey, apiSecret };
}
