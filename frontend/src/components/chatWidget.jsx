import { useState } from "react";

const QUICK_REPLIES = ["I have a question", "Tell me more"];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hi! How can we help?" },
  ]);
  const [input, setInput] = useState("");

  function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    // Placeholder bot reply — wire this up to a real support backend later
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Thanks for reaching out! Our team will get back to you shortly.",
        },
      ]);
    }, 600);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage(input);
  }

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
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-bubble-row ${m.from === "user" ? "user" : "bot"}`}
              >
                {m.from === "bot" && <div className="chat-avatar">🎧</div>}
                <div className={`chat-bubble ${m.from}`}>{m.text}</div>
              </div>
            ))}

            {messages.length === 1 && (
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
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage(input)}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
