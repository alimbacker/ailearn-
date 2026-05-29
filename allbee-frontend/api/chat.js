// allbee-frontend/api/chat.js
// ─────────────────────────────────────────────────────────────
//  Works with NO API KEY by default (free, anonymous Pollinations).
//
//  Optional MODE 1: Ollama (free, runs on your own PC/server)
//    OLLAMA_URL   = http://your-server-ip:11434   <-- MUST start with http:// or https://
//    OLLAMA_MODEL = llama3.2  (or mistral, gemma2, phi3, etc.)
//
//  Default MODE 2: Pollinations.ai (legacy host) — free, no key.
//    POLLINATIONS_MODEL = openai  (optional; e.g. openai, mistral)
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

  // Only treat OLLAMA_URL as valid if it's a real http(s) URL.
  const rawOllama = (process.env.OLLAMA_URL || "").trim();
  const ollamaUrl = /^https?:\/\/.+/i.test(rawOllama) ? rawOllama : null;
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

  // ── OPTIONAL MODE 1: Ollama (only if a valid OLLAMA_URL is set) ──
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
      return res.status(500).json({ error: "Cannot reach Ollama at " + ollamaUrl + " — " + err.message });
    }
  }

  // ── DEFAULT MODE 2: Pollinations legacy host (free, no key) ──
  const pModel  = process.env.POLLINATIONS_MODEL || "openai";
  const sysText = system || "You are a helpful assistant.";

  // Attempt A: OpenAI-compatible POST (no Authorization header — anonymous).
  try {
    const r = await fetch("https://text.pollinations.ai/openai", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: pModel,
        messages: [
          { role: "system", content: sysText },
          { role: "user",   content: message.trim() },
        ],
        temperature: 0.7,
        referrer: "allbee",
      }),
    });
    const raw = await r.text();
    if (r.ok) {
      let text = "";
      try { text = JSON.parse(raw)?.choices?.[0]?.message?.content || ""; }
      catch { text = raw; }
      if (text.trim())
        return res.status(200).json({ text: text.trim(), source: "pollinations:" + pModel });
    }
  } catch (_) { /* fall through to Attempt B */ }

  // Attempt B: simple GET text endpoint (also anonymous).
  try {
    const prompt = encodeURIComponent(sysText + "\n\n" + message.trim());
    const r = await fetch(
      "https://text.pollinations.ai/" + prompt + "?model=" + encodeURIComponent(pModel) + "&referrer=allbee"
    );
    const text = await r.text();
    if (r.ok && text.trim())
      return res.status(200).json({ text: text.trim(), source: "pollinations-get:" + pModel });

    if (r.status === 429)
      return res.status(429).json({ error: "Free AI is busy right now. Wait a few seconds and try again." });

    return res.status(502).json({
      error: "Free AI unavailable (HTTP " + r.status + "). The free service may be rate-limited — try again shortly.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Cannot reach free AI service — " + err.message });
  }
}
