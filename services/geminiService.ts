import { GoogleGenAI } from "@google/genai";

// Initialize AI safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not defined. AI features will be limited.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCaption = async (imageUrl: string, prompt: string = ""): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "Just another day in paradise! ✨ #lifestyle";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a creative, engaging social media caption for a post. User context/keywords: ${prompt}. Keep it short, include 2-3 relevant hashtags and emojis.`,
    });
    return response.text || "Just another day in paradise! ✨ #lifestyle";
  } catch (error) {
    console.error("Caption generation failed:", error);
    return "Exploring new horizons! 🌍 #travel #adventure";
  }
};

export const generateMagicImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Create a high-quality, artistic photo for a social media feed: ${prompt}` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};