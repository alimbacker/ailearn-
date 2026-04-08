// api/chat.js — Gemini API backend for Allbee Learn AI
// Place this file at: your-project/api/chat.js
// Set environment variable: GEMINI_API_KEY in Vercel dashboard

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel environment variables" });
  }

  try {
    const { system, message } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    // Gemini 2.0 Flash — fast & free tier available
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // System instruction (like Anthropic's "system" param)
        system_instruction: {
          parts: [{ text: system || "You are a helpful assistant." }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(500).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    // Extract text from Gemini response
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Empty Gemini response:", JSON.stringify(data));
      return res.status(500).json({ error: "No response from Gemini" });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
