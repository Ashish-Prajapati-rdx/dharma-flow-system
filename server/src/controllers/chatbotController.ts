import type { RequestHandler } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION =
  "You are AyurSutra AI, a highly knowledgeable and compassionate Ayurvedic & Panchakarma medical assistant. Your absolute core purpose is to guide users regarding Ayurvedic principles, daily routines (Dinacharya), details about Panchakarma procedures, herbs, precautions, and holistic health. You must NOT answer questions outside of medicine, health, and Ayurveda. If a user asks general programming, tech, general knowledge, or random off-topic queries, respond with: 'I am sorry, but as the AyurSutra Assistant, I can only help you with Ayurvedic wellness and health-related questions.'";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_MESSAGE_LENGTH = 3000;

export const handleChat: RequestHandler = async (req, res) => {
  try {
    const { message } = req.body as { message?: unknown };

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ message: "A non-empty message is required." });
      return;
    }

    const userMessage = message.trim();
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      res.status(413).json({
        message: `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "AyurSutra chatbot configuration error: GEMINI_API_KEY is missing.",
      );
      res.status(500).json({ message: "Chatbot service is not configured." });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 700,
        temperature: 0.35,
      },
    });

    const result = await model.generateContent(userMessage);
    const responseText = result.response.text().trim();

    res.json({
      response:
        responseText ||
        "I am sorry, but I could not generate a helpful Ayurvedic response right now.",
    });
  } catch (error) {
    console.error("AyurSutra chatbot generation error:", error);
    res.status(500).json({
      message: "Unable to process the chatbot request right now.",
    });
  }
};
