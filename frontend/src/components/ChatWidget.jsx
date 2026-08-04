import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const QUICK_REPLIES = ["I have a question", "Tell me more"];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ready, setReady] = useState(false);
  const channelRef = useRef(null);

  // Bootstrap: get the logged-in user, find-or-create their conversation,
  // load message history, then subscribe to new inserts (admin replies).
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // No logged-in user — widget still opens but can't persist chat.
        if (!cancelled) setReady(true);
        return;
      }
      if (cancelled) return;
      setUserId(user.id);

      // Find an existing conversation for this user, or create one.
      let convoId = null;
      const { data: existing, error: findErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) {
        console.error("Failed to look up conversation:", findErr.message);
      }

      if (existing) {
        convoId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({ user_id: user.id })
          .select()
          .single();
        if (createErr) {
          console.error("Failed to create conversation:", createErr.message);
        } else {
          convoId = created.id;
        }
      }

      if (cancelled || !convoId) {
        if (!cancelled) setReady(true);
        return;
      }
      setConversationId(convoId);

      // Load message history for this conversation.
      const { data: history, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true });

      if (msgErr) {
        console.error("Failed to load messages:", msgErr.message);
      } else if (!cancelled) {
        setMessages(
          (history || []).map((m) => ({
            id: m.id,
            from: m.sender === "admin" ? "bot" : "user",
            text: m.text,
          })),
        );
      }

      // Realtime: pick up new messages (admin replies) as they arrive.
      const channel = supabase
        .channel(`messages:${convoId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${convoId}`,
          },
          (payload) => {
            const m = payload.new;
            setMessages((prev) => {
              if (prev.some((existingMsg) => existingMsg.id === m.id)) return prev;
              return [
                ...prev,
                { id: m.id, from: m.sender === "admin" ? "bot" : "user", text: m.text },
              ];
            });
          },
        )
        .subscribe();

      channelRef.current = channel;
      if (!cancelled) setReady(true);
    }

    bootstrap();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;

    setInput("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "user",
        text: trimmed,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to send message:", error.message);
      return;
    }

    // Add immediately (realtime echo is de-duped by id in the handler above).
    setMessages((prev) => [...prev, { id: data.id, from: "user", text: data.text }]);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage(input);
  }

  const showGreeting = messages.length === 0;

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          className="chat-launcher"
          onClick={() => setOpen(true)}
          aria-label="Open customer support chat"
        >
          💬
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <button
              className="chat-back-btn"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ‹
            </button>
            <span>Customer Support</span>
            <div className="chat-menu-wrap">
              <button
                className="chat-menu-btn"
                onClick={() => setMenuOpen((m) => !m)}
                aria-label="Menu"
              >
                ☰
              </button>
              {menuOpen && (
                <>
                  <div
                    className="chat-menu-overlay"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="chat-dropdown-menu">
                    <button className="chat-dropdown-item" disabled>
                      <span className="chat-dropdown-icon">✏️</span>
                      <span className="chat-dropdown-text">
                        Change Name
                        <span className="chat-dropdown-soon">Coming soon</span>
                      </span>
                    </button>
                    <button className="chat-dropdown-item" disabled>
                      <span className="chat-dropdown-icon">✉️</span>
                      <span className="chat-dropdown-text">
                        Email transcript
                        <span className="chat-dropdown-soon">Coming soon</span>
                      </span>
                    </button>
                    <button
                      className="chat-dropdown-item"
                      onClick={() => setSoundOn((s) => !s)}
                    >
                      <span className="chat-dropdown-icon">
                        {soundOn ? "🔊" : "🔇"}
                      </span>
                      <span className="chat-dropdown-text">
                        Sound {soundOn ? "On" : "Off"}
                      </span>
                    </button>
                    <button className="chat-dropdown-item" disabled>
                      <span className="chat-dropdown-icon">⬡</span>
                      <span className="chat-dropdown-text">
                        Pop out widget
                        <span className="chat-dropdown-soon">Coming soon</span>
                      </span>
                    </button>
                    <button className="chat-dropdown-item" disabled>
                      <span className="chat-dropdown-icon">+</span>
                      <span className="chat-dropdown-text">
                        Add Chat to your website
                        <span className="chat-dropdown-soon">Coming soon</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="chat-widget-body">
            {!ready && (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
            )}

            {ready && showGreeting && (
              <div className="chat-bubble-row bot">
                <div className="chat-avatar">🎧</div>
                <div className="chat-bubble bot">👋 Hi! How can we help?</div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble-row ${m.from === "user" ? "user" : "bot"}`}
              >
                {m.from === "bot" && <div className="chat-avatar">🎧</div>}
                <div className={`chat-bubble ${m.from}`}>{m.text}</div>
              </div>
            ))}

            {ready && showGreeting && (
              <div className="chat-quick-replies">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    className="chat-quick-reply-btn"
                    onClick={() => sendMessage(qr)}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-widget-input-row">
            <input
              type="text"
              placeholder="Type here and press enter..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!userId}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage(input)}
              aria-label="Send message"
              disabled={!userId}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
