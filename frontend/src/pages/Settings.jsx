import { useEffect, useState } from 'react';
import { apiFetch } from '../supabaseClient';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/keys/status').then(setStatus).catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setWarning('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ apiKey, apiSecret }),
      });
      if (res.warning) setWarning(res.warning);
      setStatus({ connected: true, connectedAt: new Date().toISOString() });
      setApiKey('');
      setApiSecret('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect your Binance API key? Active bots will stop trading until you reconnect.')) return;
    await apiFetch('/api/keys', { method: 'DELETE' });
    setStatus({ connected: false, connectedAt: null });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>API Connection</h1>
          <p>PixellTrade trades on your own Binance account using a key you control.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Before you connect</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
          On Binance, create an API key with <strong>Spot Trading</strong> permission only.
          Leave <strong>Withdrawals</strong> disabled — PixellTrade never needs it, and disabling it
          means this key can never move funds off your account, even if it were ever compromised.
          Your key is encrypted before it's stored and is only decrypted in memory when placing an order.
        </p>
      </div>

      <div className="panel">
        {status?.connected ? (
          <>
            <h3>Binance connected</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              Connected on {new Date(status.connectedAt).toLocaleDateString()}.
            </p>
            <button className="btn btn-outline" style={{ color: 'var(--loss)' }} onClick={handleDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Binance API key</label>
              <input required value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <div className="field">
              <label>Binance API secret</label>
              <input required type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            {warning && <p style={{ color: '#E8B84B', fontSize: 13 }}>{warning}</p>}
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Connecting…' : 'Connect Binance'}</button>
          </form>
        )}
      </div>
    </>
  );
}
