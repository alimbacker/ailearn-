// allbee-frontend/api/chat.js
// ─────────────────────────────────────────────────────────────
//  Works with NO API KEY by default (uses free Pollinations.ai).
//
//  Optional MODE 1: Ollama (free, runs on your own PC/server)
//    OLLAMA_URL   = http://your-server-ip:11434
//    OLLAMA_MODEL = llama3.2  (or mistral, gemma2, phi3, etc.)
//
//  Default MODE 2: Pollinations.ai — free, no key, no signup.
//    POLLINATIONS_MODEL = openai  (optional; e.g. openai, gemini, mistral)
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

  // ── OPTIONAL MODE 1: Ollama (only if OLLAMA_URL is set) ───
  if (ollamaUrl) {
    try {
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

  // ── DEFAULT MODE 2: Pollinations.ai (free, no key) ───────
  const pModel = process.env.POLLINATIONS_MODEL || "openai";

  try {
    const pRes = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: pModel,
        messages: [
          { role: "system", content: system || "You are a helpful assistant." },
          { role: "user",   content: message.trim() },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    // Read as text first so we can show a useful error if it's not JSON.
    const raw = await pRes.text();

    if (!pRes.ok) {
      // Common case: anonymous tier was rate-limited or temporarily blocked.
      if (pRes.status === 429)
        return res.status(429).json({ error: "Free AI is busy right now (rate limit). Wait a few seconds and try again." });
      let msg = "HTTP " + pRes.status;
      try { msg = JSON.parse(raw)?.error?.message || msg; } catch {}
      return res.status(502).json({ error: "Pollinations error: " + msg });
    }

    let text = "";
    try {
      const data = JSON.parse(raw);
      text = data?.choices?.[0]?.message?.content || "";
    } catch {
      // Some endpoints return plain text instead of JSON.
      text = raw;
    }

    if (!text.trim())
      return res.status(502).json({ error: "Free AI returned an empty response. Try again." });

    return res.status(200).json({ text: text.trim(), source: "pollinations:" + pModel });

  } catch (err) {
    return res.status(500).json({ error: "Cannot reach free AI service — " + err.message });
  }
}
