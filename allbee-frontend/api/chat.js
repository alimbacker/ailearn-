// ═══════════════════════════════════════════════════════════════
//  FILE LOCATION:  your-frontend-repo/api/chat.js
//  (Vercel automatically turns this into a serverless endpoint)
//
//  ✅ No separate backend server needed
//  ✅ Same domain as frontend → no CORS issues
//  ✅ GEMINI_API_KEY stays secret on Vercel servers
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // ── CORS headers ────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── Check API key ────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "❌ GEMINI_API_KEY not set. Go to Vercel → Project Settings → Environment Variables → add GEMINI_API_KEY",
    });
  }

  // ── Parse request ────────────────────────────────────────────
  const { system, message } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "No message provided." });
  }

  // ── Call Gemini API ──────────────────────────────────────────
  try {
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system || "You are a helpful assistant." }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message.trim() }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }),
    });

    const data = await geminiRes.json();

    // ── Handle Gemini errors ─────────────────────────────────
    if (!geminiRes.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(502).json({
        error:
          data?.error?.message ||
          "Gemini API error. Check your API key and quota.",
      });
    }

    // ── Extract text ─────────────────────────────────────────
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res
        .status(502)
        .json({ error: "Gemini returned an empty response." });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
