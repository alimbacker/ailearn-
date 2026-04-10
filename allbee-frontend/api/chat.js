// allbee-frontend/api/chat.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY not set in Vercel environment variables",
    });
  }

  const { system, message } = req.body || {};
  if (!message?.trim()) {
    return res.status(400).json({ error: "No message provided" });
  }

  // Try models in order — gemini-1.5-flash is free & reliable
  const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro",
  ];

  let lastError = "";

  for (const model of MODELS) {
    try {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        apiKey;

      const geminiRes = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system || "You are a helpful assistant." }],
          },
          contents: [{ role: "user", parts: [{ text: message.trim() }] }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature:     0.7,
          },
        }),
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        // Save error and try next model
        lastError = "[" + model + "] " + (data?.error?.message || JSON.stringify(data?.error) || "HTTP " + geminiRes.status);
        console.error("Model failed:", lastError);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        lastError = "[" + model + "] Empty response. Finish reason: " + (data?.candidates?.[0]?.finishReason || "none");
        console.error(lastError);
        continue;
      }

      // SUCCESS
      console.log("Success with model:", model, "| Length:", text.length);
      return res.status(200).json({ text, model });

    } catch (err) {
      lastError = "[" + model + "] Exception: " + err.message;
      console.error(lastError);
      continue;
    }
  }

  // All models failed
  return res.status(502).json({
    error: "All Gemini models failed. Last error: " + lastError +
           " | Check your API key at aistudio.google.com",
  });
}
