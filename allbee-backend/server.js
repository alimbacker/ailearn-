// ─────────────────────────────────────────────────────────────
//  Allbee Learn AI — Express Backend Server
//  Powered by Google Gemini API
// ─────────────────────────────────────────────────────────────

const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: "*",           // Allow all origins (restrict in production if needed)
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ Allbee Learn AI Backend is running",
    model:  "gemini-2.0-flash",
    endpoints: {
      chat:   "POST /api/chat",
      health: "GET  /api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── /api/chat — Main AI endpoint ─────────────────────────────
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it to your .env file.",
    });
  }

  const { system, message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "No message provided." });
  }

  try {
    const GEMINI_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system || "You are a helpful assistant." }],
        },
        contents: [
          {
            role:  "user",
            parts: [{ text: message.trim() }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature:     0.7,
        },
      }),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("❌ Gemini error:", JSON.stringify(data));
      return res.status(502).json({
        error: data?.error?.message || "Gemini API returned an error.",
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("❌ Empty Gemini response:", JSON.stringify(data));
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    console.log(`✅ Gemini replied (${text.length} chars)`);
    return res.status(200).json({ text });

  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  🐝  Allbee Learn AI — Backend Server   │
  │     Running on http://localhost:${PORT}     │
  │     Gemini 2.0 Flash API connected      │
  └─────────────────────────────────────────┘
  `);
});

module.exports = app;
