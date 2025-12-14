import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ClothingItem, ShoppingAdvice, UserAnalysis, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip base64 prefix
const cleanBase64 = (b64: string) => b64.replace(/^data:image\/\w+;base64,/, "");

export const analyzeUserProfile = async (
  photoBase64: string,
  preferences: string
): Promise<UserAnalysis> => {
  const model = "gemini-2.5-flash";

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      bodyType: { type: Type.STRING, description: "Kibbe body type (e.g., Soft Classic, Flamboyant Gamine)" },
      colorSeason: { type: Type.STRING, description: "Seasonal color analysis (e.g., Deep Autumn, Light Summer)" },
      essence: { type: Type.STRING, description: "Kitchener style essence (e.g., Ingenue, Ethereal)" },
      styleRoots: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "3 style roots based on the roots theory (e.g., Mushroom, Fire, Sun)" 
      },
      notes: { type: Type.STRING, description: "Brief friendly explanation." },
      stylingTips: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of fabrics, cuts, and patterns that suit this user." 
      },
      celebrityMatch: { type: Type.STRING, description: "A famous celebrity or fictional character with similar style/essence." }
    },
    required: ["bodyType", "colorSeason", "essence", "styleRoots", "notes", "stylingTips", "celebrityMatch"]
  };

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(photoBase64) } },
        { text: `Analyze this person's style potential. User preferences/personality: ${preferences}. Determine their probable Body Type, Color Season, Style Essence, Style Roots, Styling Tips, and a Celebrity Match.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  if (!response.text) throw new Error("No response from Oracle");
  return JSON.parse(response.text) as UserAnalysis;
};

export const categorizeClothingItem = async (photoBase64: string): Promise<{category: string, subCategory: string, name: string, description: string, occasions: string[]}> => {
  const model = "gemini-2.5-flash";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(photoBase64) } },
        { text: "Identify this clothing item. Return JSON with details and suitable occasions." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ['top', 'bottom', 'shoes', 'accessory', 'outerwear', 'one-piece'] },
          subCategory: { type: Type.STRING, description: "Specific type (e.g., jeans, skirt)" },
          name: { type: Type.STRING, description: "Short catchy name" },
          description: { type: Type.STRING },
          occasions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "List of suitable occasions (e.g., Casual, Work, Party, Date)" 
          }
        }
      }
    }
  });

  if (!response.text) return { category: 'top', subCategory: 'shirt', name: 'Unknown', description: '', occasions: ['Casual'] };
  return JSON.parse(response.text);
};

// New: Generate a try-on image for a single item immediately upon upload
export const generateSingleItemTryOn = async (
  userPhotoBase64: string,
  itemPhotoBase64: string,
  category: string
): Promise<string> => {
  const model = "gemini-2.5-flash-image";

  const prompt = `
    Generate a photorealistic image of the person in the first image wearing the clothing item in the second image.
    Keep the person's face, hair, and body shape exactly as they are.
    The item is a ${category}. Fit it naturally on the body.
    Background: Neutral, simple studio background.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(userPhotoBase64) } },
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(itemPhotoBase64) } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  // Return original if generation fails (fallback)
  return itemPhotoBase64;
};

export const cleanClothingImage = async (photoBase64: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(photoBase64) } },
        { text: "Generate an image of ONLY the clothing item on a pure white background." }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Could not clean image");
};

export const generateOutfitSuggestions = async (
  wardrobe: ClothingItem[],
  userAnalysis: UserAnalysis | null,
  occasion: string
): Promise<OutfitSuggestion[]> => {
  const model = "gemini-2.5-flash";

  // Filter wardrobe in prompt context if needed, but passing all helps the AI decide better
  const wardrobeDesc = wardrobe.map((item) => `ID: ${item.id} | Name: ${item.name} | Type: ${item.subCategory} | Occasions: ${item.occasions?.join(', ')}`).join('\n');
  
  const prompt = `
    You are a high-end 90s fashion stylist.
    User Profile: ${userAnalysis?.bodyType}, ${userAnalysis?.colorSeason}, ${userAnalysis?.essence}.
    Occasion: ${occasion}

    Available Wardrobe:
    ${wardrobeDesc}

    Task: Select 3 distinct outfits for the occasion.
    IMPORTANT: Prioritize items that are tagged with the occasion, but you can mix and match.
    
    Return JSON Array:
    [
      { "lookName": "...", "selectedItemIds": ["..."], "reasoning": "..." }
    ]
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lookName: { type: Type.STRING },
            selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("Totally clueless right now.");
  return JSON.parse(response.text) as OutfitSuggestion[];
};

export const evaluatePurchase = async (
  itemPhotoBase64: string,
  userAnalysis: UserAnalysis | null,
  wardrobe: ClothingItem[]
): Promise<ShoppingAdvice> => {
  const model = "gemini-2.5-flash";
  const wardrobeContext = wardrobe.slice(0, 20).map(i => i.name).join(', ');

  const prompt = `
    Analyze this potential purchase.
    User Stats: ${userAnalysis?.bodyType}, ${userAnalysis?.colorSeason}.
    Wardrobe: ${wardrobeContext}.
    
    1. Verdict (BUY IT! / AS IF! / MAYBE)
    2. Reasoning
    3. Pairing Suggestions
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(itemPhotoBase64) } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: { type: Type.STRING, enum: ['BUY IT!', 'AS IF!', 'MAYBE'] },
          reasoning: { type: Type.STRING },
          pairingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (!response.text) throw new Error("Silent treatment.");
  return JSON.parse(response.text) as ShoppingAdvice;
};