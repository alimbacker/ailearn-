// ───────────────────────────────────────────────────────────────────────────
//  api/chat.js  —  Reliable AI backend for Allbee Learn AI
// ───────────────────────────────────────────────────────────────────────────
//  This serverless function makes the "Ask AI / Ask a Doubt" assistant answer
//  EVERY TIME, by calling a real AI provider with a key kept SECRET on the
//  server (never exposed in the browser). The free Pollinations service the app
//  used before is heavily rate-limited and fails often — this replaces it as the
//  main engine.
//
//  ✅ RECOMMENDED PROVIDER: Groq — free, fast, NO credit card needed.
//
//  ── ONE-TIME SETUP (about 3 minutes) ──────────────────────────────────────
//  1. Put this file in your project at:   api/chat.js
//  2. Get a FREE key:  https://console.groq.com  → sign in → "API Keys"
//        → "Create API Key" → copy it (starts with gsk_...).
//  3. In Vercel → your project → Settings → Environment Variables, add:
//            Name:  GROQ_API_KEY
//            Value: gsk_your_key_here
//        (apply to Production + Preview + Development), then SAVE.
//  4. Redeploy the project (Deployments → ⋯ → Redeploy).
//     Done. The assistant now answers reliably.
//
//  ── ALTERNATIVES (optional) ───────────────────────────────────────────────
//  Instead of Groq you may set ONE of these env vars instead:
//     OPENAI_API_KEY      (uses gpt-4o-mini)
//     OPENROUTER_API_KEY  (uses a free Llama model)
//  You can also override models with GROQ_MODEL / OPENAI_MODEL / OPENROUTER_MODEL.
//
//  Not on Vercel? The logic is identical for Netlify/Cloudflare — only the file
//  location and handler signature differ. Ask and it can be adapted.
// ───────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Allow the browser to call this route.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed." }); return; }

  // Parse the request body (Vercel usually parses JSON; handle a raw string too).
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const system  = (body.system || "You are a helpful, friendly teaching assistant for students.").toString();
  const message = (body.message || "").toString();
  if (!message.trim()) { res.status(400).json({ error: "No question was provided." }); return; }

  const groqKey = process.env.GROQ_API_KEY;
  const oaiKey  = process.env.OPENAI_API_KEY;
  const orKey   = process.env.OPENROUTER_API_KEY;

  // Build an ordered list of attempts (best/most-reliable first).
  const attempts = [];
  if (groqKey) {
    const primary = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    attempts.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: primary });
    // Lighter Groq model has far higher daily limits — great automatic backup.
    if (primary !== "llama-3.1-8b-instant") {
      attempts.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.1-8b-instant" });
    }
  }
  if (oaiKey) {
    attempts.push({ url: "https://api.openai.com/v1/chat/completions", key: oaiKey, model: process.env.OPENAI_MODEL || "gpt-4o-mini" });
  }
  if (orKey) {
    attempts.push({
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: orKey,
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      extraHeaders: { "X-Title": "Allbee Learn AI" },
    });
  }

  if (attempts.length === 0) {
    res.status(500).json({
      error: "AI is not configured yet. Add a free GROQ_API_KEY in your hosting environment variables and redeploy.",
    });
    return;
  }

  let lastErr = "Unknown error";
  for (const a of attempts) {
    try {
      const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + a.key };
      if (a.extraHeaders) Object.assign(headers, a.extraHeaders);

      const r = await fetch(a.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: a.model,
          messages: [
            { role: "system", content: system },
            { role: "user",   content: message },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        lastErr = (data && data.error && (data.error.message || data.error)) || ("HTTP " + r.status);
        continue; // try the next model/provider
      }
      const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (text && text.trim()) { res.status(200).json({ text: text.trim() }); return; }
      lastErr = "Empty response from provider";
    } catch (e) {
      lastErr = (e && e.message) || "Request failed";
    }
  }

  res.status(502).json({ error: "AI provider error: " + lastErr });
}
