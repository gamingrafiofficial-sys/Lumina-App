
import { GoogleGenAI } from "@google/genai";

// Fix: Correctly initialize GoogleGenAI with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateCaption = async (imageUrl: string, prompt: string = ""): Promise<string> => {
  try {
    // Fix: Using correct generateContent call with gemini-3-flash-preview for text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a creative, engaging social media caption for a post. User context/keywords: ${prompt}. Keep it short, include 2-3 relevant hashtags and emojis.`,
    });
    // Fix: Accessing .text property directly instead of calling it as a method
    return response.text || "Just another day in paradise! ✨ #lifestyle";
  } catch (error) {
    console.error("Caption generation failed:", error);
    return "Exploring new horizons! 🌍 #travel #adventure";
  }
};

export const generateMagicImage = async (prompt: string): Promise<string | null> => {
  try {
    // Fix: Using correct model gemini-2.5-flash-image for image generation tasks
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

    // Fix: Iterate through parts to find the generated image (inlineData)
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
