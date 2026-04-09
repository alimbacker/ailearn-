// ─────────────────────────────────────────────────────────────
//  FILE: allbee-frontend/api/chat.js
//  Vercel turns this into a serverless function at /api/chat
//
//  REQUIRED: Add GEMINI_API_KEY in Vercel Dashboard
//  → vercel.com → your project → Settings → Environment Variables
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY missing — add it in Vercel → Settings → Environment Variables",
    });
  }

  const { system, message } = req.body || {};
  if (!message?.trim()) {
    return res.status(400).json({ error: "No message provided." });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system || "You are a helpful assistant." }],
        },
        contents: [{ role: "user", parts: [{ text: message.trim() }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(502).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return res.status(502).json({ error: "Gemini returned empty response" });

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
