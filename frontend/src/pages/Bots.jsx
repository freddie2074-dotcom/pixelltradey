import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const BotsContext = createContext(null);

const TRADE_INTERVAL_MS = 5000;
const MAX_TRADES_SHOWN = 30;

export function BotsProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [bots, setBots] = useState({}); // { [botType]: botObj }
  const [botErrors, setBotErrors] = useState({}); // { [botType]: "message" }

  const intervalsRef = useRef({}); // { [botType]: intervalId } — survives re-renders
  const botsRef = useRef(bots); // always-fresh snapshot for interval closures
  botsRef.current = bots;

  // ---- load user + balance once, keep in sync with DB ----
  useEffect(() => {
    async function loadUserAndBalance() {
      setBalanceLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No logged-in user found.");
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setBalance(Number(data?.balance) || 0);
      } catch (e) {
        setBalanceError(e.message);
      } finally {
        setBalanceLoading(false);
      }
    }
    loadUserAndBalance();

    const channel = supabase
      .channel("bots-profile-balance-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.id === user.id) {
              setBalance(Number(payload.new.balance) || 0);
            }
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const clearBotError = (botType) => {
    setBotErrors((prev) => ({ ...prev, [botType]: "" }));
  };

  const setBotError = (botType, message) => {
    setBotErrors((prev) => ({ ...prev, [botType]: message }));
  };

  // ---- trade execution for a single bot tick ----
  const executeTrade = async (botType) => {
    const bot = botsRef.current[botType];
    if (!bot || !bot.active || !userId) return;

    try {
      // Win rate 60%–67%
      const winRate = 0.6 + Math.random() * 0.07;
      const isWin = Math.random() < winRate;

      // Swing size 5%–20% of allocated amount, matching direction of outcome
      const pnlPercent = isWin
        ? 0.05 + Math.random() * 0.15
        : -(0.05 + Math.random() * 0.15);
      const tradePnl = bot.amount_usdt * pnlPercent;

      const { data: newBalance, error } = await supabase.rpc(
        "increment_balance",
        { p_user_id: userId, p_amount: tradePnl }
      );
      if (error) throw error;

      const newTrade = {
        id: `${bot.id}-${Date.now()}`,
        when: Date.now(),
        isWin,
        usdt: tradePnl,
        percent: pnlPercent * 100,
      };

      setBots((prev) => {
        const current = prev[botType];
        if (!current) return prev;
        return {
          ...prev,
          [botType]: {
            ...current,
            pnl_usdt: current.pnl_usdt + tradePnl,
            wins: isWin ? current.wins + 1 : current.wins,
            losses: isWin ? current.losses : current.losses + 1,
            trades: [newTrade, ...(current.trades || [])].slice(0, MAX_TRADES_SHOWN),
          },
        };
      });
      setBalance(newBalance);
      clearBotError(botType);
    } catch (err) {
      console.error("Trade execution failed:", err);
      setBotError(botType, err.message || "A trade couldn't be processed.");
    }
  };

  // ---- start/stop the background interval for a bot ----
  const ensureInterval = (botType, shouldRun) => {
    const existing = intervalsRef.current[botType];
    if (shouldRun && !existing) {
      intervalsRef.current[botType] = setInterval(() => executeTrade(botType), TRADE_INTERVAL_MS);
    } else if (!shouldRun && existing) {
      clearInterval(existing);
      delete intervalsRef.current[botType];
    }
  };

  // clean up all intervals if the provider itself ever unmounts (e.g. logout)
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
    };
  }, []);

  // ---- public actions ----

  const createBot = (botType, amountUsdt) => {
    const bot = {
      id: `${botType}-${Date.now()}`,
      bot_type: botType,
      amount_usdt: Number(amountUsdt),
      active: false,
      pnl_usdt: 0,
      wins: 0,
      losses: 0,
      trades: [],
    };
    // No balance deduction — allocated amount is not subtracted anymore.
    setBots((prev) => ({ ...prev, [botType]: bot }));
    clearBotError(botType);
  };

  const startBot = (botType) => {
    setBots((prev) => {
      const bot = prev[botType];
      if (!bot) return prev;
      return { ...prev, [botType]: { ...bot, active: true } };
    });
    ensureInterval(botType, true);
  };

  const stopBot = (botType) => {
    setBots((prev) => {
      const bot = prev[botType];
      if (!bot) return prev;
      return { ...prev, [botType]: { ...bot, active: false } };
    });
    ensureInterval(botType, false);
  };

  const removeBot = (botType) => {
    ensureInterval(botType, false);
    setBots((prev) => {
      const next = { ...prev };
      delete next[botType];
      return next;
    });
    clearBotError(botType);
  };

  const value = {
    userId,
    balance,
    balanceLoading,
    balanceError,
    bots,
    botErrors,
    createBot,
    startBot,
    stopBot,
    removeBot,
  };

  return <BotsContext.Provider value={value}>{children}</BotsContext.Provider>;
}

export function useBots() {
  const ctx = useContext(BotsContext);
  if (!ctx) throw new Error("useBots must be used within a BotsProvider");
  return ctx;
}
