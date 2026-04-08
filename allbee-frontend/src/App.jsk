import { useState, useRef, useEffect } from "react";

// Backend URL (Railway)
const API =
  import.meta.env.VITE_BACKEND_URL ||
  "https://ailearn-production-7aee.up.railway.app";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "👋 Hi! I am AllBee Learn AI. Ask me anything."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to backend
  const sendMessageToAI = async (message) => {
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await res.json();

      return data.reply || data.message || "No response from AI";
    } catch (err) {
      console.error(err);
      return "⚠️ Server connection error";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;

    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    const aiReply = await sendMessageToAI(userMessage);

    setMessages((prev) => [...prev, { role: "assistant", text: aiReply }]);

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🐝 AllBee Learn AI</h1>

      <div style={styles.chatBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={
              msg.role === "user" ? styles.userMessage : styles.aiMessage
            }
          >
            {msg.text}
          </div>
        ))}

        {loading && <div style={styles.aiMessage}>AI is typing...</div>}

        <div ref={chatRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask something..."
        />

        <button style={styles.button} onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}

// Simple styles
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#0f172a",
    color: "white",
    fontFamily: "sans-serif"
  },

  title: {
    marginTop: "20px"
  },

  chatBox: {
    width: "80%",
    maxWidth: "700px",
    height: "60vh",
    overflowY: "auto",
    background: "#1e293b",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "20px"
  },

  userMessage: {
    textAlign: "right",
    margin: "10px",
    padding: "10px",
    background: "#2563eb",
    borderRadius: "8px"
  },

  aiMessage: {
    textAlign: "left",
    margin: "10px",
    padding: "10px",
    background: "#334155",
    borderRadius: "8px"
  },

  inputArea: {
    display: "flex",
    width: "80%",
    maxWidth: "700px",
    marginTop: "15px"
  },

  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "none"
  },

  button: {
    marginLeft: "10px",
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    background: "#22c55e",
    color: "white",
    cursor: "pointer"
  }
};
