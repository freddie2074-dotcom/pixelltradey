import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const BotsContext = createContext(null);

const TRADE_INTERVAL_MS = 2500;
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

  const userIdRef = useRef(null); // always-fresh snapshot for the auth listener closure

  const stopAllIntervals = () => {
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};
  };

  const fetchBalanceFor = async (uid) => {
    setBalanceLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", uid)
        .single();
      if (error) throw error;
      setBalance(Number(data?.balance) || 0);
      setBalanceError("");
    } catch (e) {
      setBalanceError(e.message);
    } finally {
      setBalanceLoading(false);
    }
  };

  // ---- load user + balance once, and re-sync whenever the logged-in user changes ----
  useEffect(() => {
    async function loadInitialUser() {
      setBalanceLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No logged-in user found.");
        userIdRef.current = user.id;
        setUserId(user.id);
        await fetchBalanceFor(user.id);
      } catch (e) {
        setBalanceError(e.message);
        setBalanceLoading(false);
      }
    }
    loadInitialUser();

    // Reset bot state and reload balance whenever the actual logged-in user changes
    // (covers logout -> different user login -> login without a full page refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null;
      if (newUserId === userIdRef.current) return;

      stopAllIntervals();
      setBots({});
      setBotErrors({});
      userIdRef.current = newUserId;
      setUserId(newUserId);

      if (newUserId) {
        fetchBalanceFor(newUserId);
      } else {
        setBalance(0);
        setBalanceLoading(false);
      }
    });

    const channel = supabase
      .channel("bots-profile-balance-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (userIdRef.current && payload.new.id === userIdRef.current) {
            setBalance(Number(payload.new.balance) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      authListener?.subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
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
      // Win rate 55%–62%
      const winRate = 0.55 + Math.random() * 0.07;
      const isWin = Math.random() < winRate;

      // Flat swing of $0.75–$1.50 per trade, independent of allocated amount
      const swing = 0.75 + Math.random() * 0.75;
      const tradePnl = isWin ? swing : -swing;
      const pnlPercent = bot.amount_usdt > 0 ? (tradePnl / bot.amount_usdt) * 100 : 0;

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
        percent: pnlPercent,
      };

      setBots((prev) => {
        const current = prev[botType];
        if (!current) return prev;
        const updated = {
          ...current,
          pnl_usdt: current.pnl_usdt + tradePnl,
          wins: isWin ? current.wins + 1 : current.wins,
          losses: isWin ? current.losses : current.losses + 1,
          trades: [newTrade, ...(current.trades || [])].slice(0, MAX_TRADES_SHOWN),
        };
        botsRef.current = { ...prev, [botType]: updated };
        return { ...prev, [botType]: updated };
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
    return () => stopAllIntervals();
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
    // No balance deduction — allocated amount is not subtracted.
    botsRef.current = { ...botsRef.current, [botType]: bot };
    setBots((prev) => ({ ...prev, [botType]: bot }));
    clearBotError(botType);
  };

  const startBot = (botType) => {
    setBots((prev) => {
      const bot = prev[botType];
      if (!bot) return prev;
      const updated = { ...bot, active: true };
      botsRef.current = { ...prev, [botType]: updated }; // sync ref immediately so the trade below sees it as active
      return { ...prev, [botType]: updated };
    });

    // fire the first trade right away instead of waiting a full interval
    executeTrade(botType);
    ensureInterval(botType, true);
  };

  const stopBot = (botType) => {
    setBots((prev) => {
      const bot = prev[botType];
      if (!bot) return prev;
      const updated = { ...bot, active: false };
      botsRef.current = { ...prev, [botType]: updated };
      return { ...prev, [botType]: updated };
    });
    ensureInterval(botType, false);
  };

  const removeBot = (botType) => {
    ensureInterval(botType, false);
    setBots((prev) => {
      const next = { ...prev };
      delete next[botType];
      botsRef.current = next;
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
