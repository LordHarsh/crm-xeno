import { GoogleGenAI } from "@google/genai";
import config from "../config";

// Initialize Gemini API with API key
const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });


// Generate text with Gemini
export async function generateText(prompt) {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return result.text;
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw error;
  }
}

// Generate structured data with Gemini
export async function generateStructuredData(prompt) {
  try {

    // Add instruction to return JSON
    const enhancedPrompt = `${prompt}\n\nPlease respond in JSON format only.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: enhancedPrompt
    });
    const text = result.text;

    // Try to parse JSON from response
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }
      // Otherwise try to parse the whole response
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini response:', parseError);
      throw new Error('Failed to parse structured data from AI response');
    }
  } catch (error) {
    console.error('Error generating structured data with Gemini:', error);
    throw error;
  }
}
