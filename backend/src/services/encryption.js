import crypto from 'crypto';
import 'dotenv/config';

const ALGO = 'aes-256-gcm';
const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');

if (MASTER_KEY.length !== 32) {
  throw new Error(
    'ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex chars). ' +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

/**
 * Encrypts a plaintext string (e.g. a Binance API secret).
 * Returns { encrypted, iv, authTag } — all hex-encoded, safe to store as text.
 */
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv(ALGO, MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt({ encrypted, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGO, MASTER_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
