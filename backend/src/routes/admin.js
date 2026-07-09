const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Service role client — full access, bypasses RLS. NEVER expose this key to the frontend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Middleware: verify the requester is an authenticated admin
// Replace 'admin_user_ids' with however you flag admins (e.g. a role column)
const ADMIN_EMAILS = ["odirasteve287    @gmail.com"]; // TODO: move to DB-based role check

async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  if (!ADMIN_EMAILS.includes(userData.user.email)) {
    return res.status(403).json({ error: "Forbidden: not an admin" });
  }

  req.adminUser = userData.user;
  next();
}

router.use(requireAdmin);

// ---------- Users ----------
router.get("/users", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch("/users/:id", async (req, res) => {
  const { active, balance } = req.body;
  const updates = {};
  if (typeof active === "boolean") updates.active = active;
  if (typeof balance === "number") updates.balance = balance;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Optional: also ban/unban at the auth level so deactivated users truly can't log in
  if (typeof active === "boolean") {
    await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
      ban_duration: active ? "none" : "876000h", // ~100 years = effectively permanent
    });
  }

  res.json(data);
});

// ---------- Withdrawals ----------
router.get("/withdrawals", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("withdrawals")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch("/withdrawals/:id", async (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const { data, error } = await supabaseAdmin
    .from("withdrawals")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // If approved, deduct from the user's balance
  if (status === "approved") {
    const { data: withdrawal } = await supabaseAdmin
      .from("withdrawals")
      .select("user_id, amount")
      .eq("id", req.params.id)
      .single();

    if (withdrawal) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("id", withdrawal.user_id)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({ balance: profile.balance - withdrawal.amount })
          .eq("id", withdrawal.user_id);
      }
    }
  }

  res.json(data);
});

// ---------- Messages / Conversations ----------
router.get("/conversations", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*, profiles(email), messages(*)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/conversations/:id/reply", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Text required" });

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: req.params.id,
      sender: "admin",
      text: text.trim(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
