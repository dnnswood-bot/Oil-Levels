
import { GoogleGenAI } from "@google/genai";
import { OilEntry } from "../types";

// Handles different environment variable standards
const API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";

export const getOilInsights = async (entries: OilEntry[]) => {
  if (entries.length < 2) return "Add more data points to unlock AI consumption insights.";
  if (!API_KEY) return "AI Insights unavailable: API Key not configured in environment variables.";

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const historyStr = entries.map(e => 
    `${e.date}: ${e.type} - ${e.liters}L${e.cost ? ` (Cost: £${e.cost})` : ''} ${e.note ? `Note: ${e.note}` : ''}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a heating efficiency expert, analyze this oil usage history and provide 3 concise, actionable insights or predictions for the user. Keep it professional and technical.
      
      History:
      ${historyStr}
      
      Conversion rate: 1cm = 21 Liters.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Unable to generate insights at this time. Check your connection or API key.";
  }
};
