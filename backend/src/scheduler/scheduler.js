import cron from 'node-cron';
import { supabaseAdmin } from '../supabaseAdmin.js';
import { getDecryptedKey } from '../services/userKeys.js';
import { getKlines, placeMarketBuy } from '../services/binanceService.js';
import { shouldTriggerDipBuy } from '../services/indicators.js';

const HOUR_MS = 60 * 60 * 1000;

async function isDueToRun(bot) {
  if (!bot.last_run_at) return true;
  const elapsed = Date.now() - new Date(bot.last_run_at).getTime();
  return elapsed >= bot.interval_hours * HOUR_MS;
}

async function runBot(bot) {
  const creds = await getDecryptedKey(bot.user_id);
  if (!creds) {
    console.warn(`[bot ${bot.id}] skipped — user has no Binance key connected`);
    return;
  }

  const klines = await getKlines(bot.symbol, '1h', 100);
  const due = await isDueToRun(bot);
  const { dip, dipTriggered } = shouldTriggerDipBuy(bot, klines);

  // Scheduled buy fires when the interval has elapsed.
  // Dip trigger can fire an *extra* buy independent of the schedule.
  if (!due && !dipTriggered) return;

  const reason = dipTriggered ? 'dip_trigger' : 'scheduled';

  try {
    const order = await placeMarketBuy({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      symbol: bot.symbol,
      quoteOrderQty: bot.amount_usdt,
    });

    const fillPrice = order.fills?.length
      ? order.fills.reduce((sum, f) => sum + parseFloat(f.price) * parseFloat(f.qty), 0) /
        order.fills.reduce((sum, f) => sum + parseFloat(f.qty), 0)
      : parseFloat(order.cummulativeQuoteQty) / parseFloat(order.executedQty);

    await supabaseAdmin.from('trades').insert({
      bot_id: bot.id,
      user_id: bot.user_id,
      symbol: bot.symbol,
      side: 'BUY',
      quantity: parseFloat(order.executedQty),
      price: fillPrice,
      usdt_amount: parseFloat(order.cummulativeQuoteQty),
      binance_order_id: String(order.orderId),
      reason,
    });

    await supabaseAdmin
      .from('bots')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', bot.id);

    console.log(`[bot ${bot.id}] executed ${reason} buy: ${bot.amount_usdt} USDT of ${bot.symbol} (dip=${dip.toFixed(2)}%)`);
  } catch (err) {
    console.error(`[bot ${bot.id}] order failed:`, err?.response?.data || err.message);
  }
}

async function tick() {
  const { data: bots, error } = await supabaseAdmin.from('bots').select('*').eq('active', true);
  if (error) {
    console.error('Failed to load active bots:', error.message);
    return;
  }
  // Run sequentially to stay comfortably within Binance rate limits.
  for (const bot of bots) {
    await runBot(bot);
  }
}

/**
 * Checks every 5 minutes. Each bot's own interval_hours (and optional
 * dip trigger) decides whether *this* tick actually places an order.
 */
export function startScheduler() {
  cron.schedule('*/5 * * * *', () => {
    tick().catch((err) => console.error('Scheduler tick failed:', err));
  });
  console.log('Bot scheduler started — checking every 5 minutes.');
}
