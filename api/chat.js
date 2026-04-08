export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: message }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Anthropic response:", data);

    if (!data?.content?.[0]?.text) {
      return res.status(500).json({
        error: "Invalid response from AI",
        debug: data
      });
    }

    return res.status(200).json({
      reply: data.content[0].text
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
