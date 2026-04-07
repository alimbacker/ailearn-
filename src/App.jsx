import React, { useState } from "react";

export default function AllbeeLearnAI() {
  const [userInput, setUserInput] = useState("");
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      setErrorMessage("Please type something!");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResponseText("");

    try {
      const system = "You are Allbee Learn AI. Respond clearly.";

      const response = await fetch("https://ailearn-pi.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, message: userInput }),
      });

      const data = await response.json();

      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setResponseText(data.text || "⚠️ No response received.");
      }
    } catch (err) {
      console.error("Frontend error:", err);
      setErrorMessage("Something went wrong. Please try again!");
    }

    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-6 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-700 mb-4">Code Explainer</h1>
      <p className="text-gray-500 mb-6">Paste code → Get simple explanation</p>

      <textarea
        className="w-full max-w-2xl h-56 p-4 border rounded-lg shadow bg-white"
        placeholder="Type or paste your code here..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />

      {errorMessage && (
        <div className="w-full max-w-2xl mt-4 text-red-600 bg-red-100 p-3 rounded">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => {
            setUserInput("");
            setResponseText("");
            setErrorMessage("");
          }}
          className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
        >
          Clear
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Thinking..." : "Ask Allbee AI"}
        </button>
      </div>

      {responseText && (
        <div className="w-full max-w-2xl mt-6 p-4 bg-white shadow rounded-lg whitespace-pre-wrap">
          {responseText}
        </div>
      )}
    </div>
  );
}
