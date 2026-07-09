import express from "express";
import cors from "cors";
import "dotenv/config";
import keysRoutes from "./routes/keys.js";
import binanceRoutes from "./routes/binance.js";
import botsRoutes from "./routes/bots.js";
import { startScheduler } from "./scheduler/scheduler.js";

const app = express();
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }),
);
app.use(express.json());
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/keys", keysRoutes);
app.use("/api/market", binanceRoutes);
app.use("/api/bots", botsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PixellTrade backend running on port ${PORT}`);
  startScheduler();
});
