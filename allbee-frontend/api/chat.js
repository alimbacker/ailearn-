// allbee-frontend/api/chat.js
// ─────────────────────────────────────────────────────────────
//  Supports TWO modes — set in Vercel Environment Variables:
//
//  MODE 1: Ollama (free, runs on your PC/server)
//    OLLAMA_URL   = http://your-server-ip:11434
//    OLLAMA_MODEL = llama3.2  (or mistral, gemma2, phi3, etc.)
//
//  MODE 2: Gemini fallback (if OLLAMA_URL not set)
//    GEMINI_API_KEY = your key from aistudio.google.com
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { system, message } = req.body || {};
  if (!message?.trim())
    return res.status(400).json({ error: "No message provided" });

  const ollamaUrl   = process.env.OLLAMA_URL;
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

  // ── MODE 1: Ollama ───────────────────────────────────────
  if (ollamaUrl) {
    try {
      console.log("Using Ollama:", ollamaUrl, "model:", ollamaModel);

      const ollamaRes = await fetch(ollamaUrl + "/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:  ollamaModel,
          stream: false,
          messages: [
            { role: "system", content: system || "You are a helpful assistant." },
            { role: "user",   content: message.trim() },
          ],
          options: { num_predict: 2000, temperature: 0.7 },
        }),
      });

      const data = await ollamaRes.json();

      if (!ollamaRes.ok) {
        const err = data?.error || "Ollama HTTP " + ollamaRes.status;
        return res.status(502).json({ error: "Ollama error: " + err });
      }

      const text = data?.message?.content || "";
      if (!text) return res.status(502).json({ error: "Ollama returned empty response" });

      return res.status(200).json({ text, source: "ollama:" + ollamaModel });

    } catch (err) {
      return res.status(500).json({
        error: "Cannot reach Ollama at " + ollamaUrl + " — " + err.message,
      });
    }
  }

  // ── MODE 2: Gemini fallback ──────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error: "No AI configured. Set OLLAMA_URL or GEMINI_API_KEY in Vercel Environment Variables",
    });
  }

  const MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
  let lastError = "";

  for (const model of MODELS) {
    try {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model + ":generateContent?key=" + geminiKey;

      const gRes  = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || "You are a helpful assistant." }] },
          contents: [{ role: "user", parts: [{ text: message.trim() }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      });

      const data = await gRes.json();
      if (!gRes.ok) {
        lastError = "[" + model + "] " + (data?.error?.message || "HTTP " + gRes.status);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) { lastError = "[" + model + "] empty"; continue; }

      return res.status(200).json({ text, source: "gemini:" + model });

    } catch (e) {
      lastError = "[" + model + "] " + e.message;
    }
  }

  return res.status(502).json({ error: "All models failed. Last error: " + lastError });
}
