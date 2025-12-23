import { GoogleGenAI } from "@google/genai";
import { OilEntry } from "./types";

export const getOilInsights = async (entries: OilEntry[]) => {
  if (entries.length < 2) return "Insufficient history for analysis.";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const history = entries.map(e => 
    `${e.date}: ${e.type} - ${e.liters}L${e.cost ? ` (£${e.cost})` : ''} ${e.note ? `[${e.note}]` : ''}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a heating efficiency bot. Analyze this UK oil usage history and provide exactly 3 concise bullet points. 
      Estimate when they will run out of oil based on current consumption.
      Suggest if current prices (if provided) are good or bad compared to typical UK averages.
      Conversion: 1cm height = 21 Liters.
      
      History:
      ${history}`,
      config: {
        temperature: 0.5,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Insight error:", error);
    return "Predictions will update as you add more readings.";
  }
};
