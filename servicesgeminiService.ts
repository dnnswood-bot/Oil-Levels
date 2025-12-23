import { GoogleGenAI } from "@google/genai";
import { OilEntry } from "../types";

export const getOilInsights = async (entries: OilEntry[]) => {
  if (entries.length < 2) return "Add more data points to unlock AI consumption insights.";
  
  // Strict rule: Initialize with named parameter using process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Insights are currently being generated based on your usage patterns.";
  }
};
