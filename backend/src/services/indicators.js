/**
 * Percentage drop from the recent high (over the given candles) to the latest close.
 * Used to decide whether a bot's "dip trigger" should fire an extra buy.
 */
export function percentDipFromRecentHigh(klines) {
  if (!klines.length) return 0;
  const recentHigh = Math.max(...klines.map((k) => k.high));
  const lastClose = klines[klines.length - 1].close;
  return ((recentHigh - lastClose) / recentHigh) * 100;
}

/**
 * Classic Wilder RSI over closing prices. Returns a number 0-100.
 * period defaults to 14, the standard setting.
 */
export function calculateRSI(klines, period = 14) {
  const closes = klines.map((k) => k.close);
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Decides whether a bot configured with dip / RSI filters should buy right now,
 * on top of its normal scheduled interval buy.
 */
export function shouldTriggerDipBuy(bot, klines) {
  const dip = percentDipFromRecentHigh(klines);
  const dipTriggered = bot.dip_threshold_pct > 0 && dip >= bot.dip_threshold_pct;

  let rsiOk = true;
  if (bot.use_rsi_filter) {
    const rsi = calculateRSI(klines);
    rsiOk = rsi !== null && rsi <= (bot.rsi_buy_below ?? 35);
  }

  return { dip, dipTriggered: dipTriggered && rsiOk };
}
