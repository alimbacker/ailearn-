// ─────────────────────────────────────────────────────────────
//  Allbee Learn AI — Express Backend Server
//  Powered by Google Gemini API
// ─────────────────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ Allbee Learn AI Backend is running",
    model: "gemini-2.0-flash",
    endpoints: {
      chat: "POST /api/chat",
      health: "GET /api/health"
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

// ── AI Chat Endpoint ──────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY not set"
    });
  }

  const { message, system } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      error: "Message is empty"
    });
  }

  try {
    const GEMINI_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: system || "You are a helpful assistant."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", data);

      return res.status(502).json({
        error: data?.error?.message || "Gemini API error"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({
        error: "Empty AI response"
      });
    }

    console.log("AI response:", text.substring(0, 80));

    // ✅ IMPORTANT FIX FOR FRONTEND
    return res.json({
      reply: text
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   🐝 Allbee Learn AI Backend Running   │
  │   Port: ${PORT}
  │   Gemini API connected
  └─────────────────────────────────────────┘
  `);
});

module.exports = app;
