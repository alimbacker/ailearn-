// ─────────────────────────────────────────────────────────────
//  allbee-frontend/api/chat.js
//  Vercel Serverless Function → calls Google Gemini API
//
//  ✅ Add GEMINI_API_KEY in:
//     Vercel Dashboard → Settings → Environment Variables
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── API Key check ─────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set!");
    return res.status(500).json({
      error: "GEMINI_API_KEY not set — go to Vercel → Settings → Environment Variables and add it, then Redeploy",
    });
  }

  // ── Parse body ────────────────────────────────────────────
  const { system, message } = req.body || {};
  if (!message?.trim()) {
    return res.status(400).json({ error: "No message provided" });
  }

  // ── Call Gemini ───────────────────────────────────────────
  try {
    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

    const geminiRes = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system || "You are a helpful assistant." }],
        },
        contents: [
          { role: "user", parts: [{ text: message.trim() }] },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature:     0.7,
        },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || "Gemini API error";
      console.error("Gemini error:", geminiRes.status, errMsg);
      return res.status(502).json({ error: errMsg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || "unknown";
      return res.status(502).json({
        error: "Gemini returned empty response (reason: " + reason + "). Check your API key quota.",
      });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
