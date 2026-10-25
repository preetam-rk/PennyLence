
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3001;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.post("/api/assistant", async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Please enter a message." });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const result = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are PennyLens AI, a helpful personal finance assistant.
Use only the supplied financial context for claims about the user's finances.
If information is missing, say so. Never invent transactions, income, or bills.
Give practical, concise explanations. Do not claim to be a licensed financial advisor.

Financial context:
${JSON.stringify(context ?? {})}

User question:
${message}`,
            },
          ],
        },
      ],
    });

    res.json({ reply: result.text || "I couldn't generate a response. Please try again." });
} catch (error) {
  console.error("Gemini request failed:", error);
  res.status(500).json({
    error: error.message || "Unknown Gemini error",
  });
}
});

app.listen(PORT, () => {
  console.log(`PennyLens AI backend running at http://localhost:${PORT}`);
});
