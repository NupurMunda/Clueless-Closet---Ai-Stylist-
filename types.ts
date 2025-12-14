export interface ClothingItem {
  id: string;
  image: string; // Base64 of the original item
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'one-piece';
  subCategory?: string; // e.g., 'skirt', 'jeans'
  name: string;
  description?: string;
  occasions?: string[]; // e.g., ['Casual', 'Date Night']
  tryOnImage?: string; // Base64 of User wearing this specific item
}

export interface UserAnalysis {
  bodyType: string;
  colorSeason: string;
  essence: string;
  styleRoots: string[];
  notes: string;
  stylingTips: string[]; // New: Fabrics, cuts, etc.
  celebrityMatch: string; // New: Celebrity lookalike
}

export interface UserProfile {
  name: string;
  photo: string | null; // Base64
  preferences: string;
  analysis: UserAnalysis | null;
}

export enum AppView {
  PROFILE = 'PROFILE',
  WARDROBE = 'WARDROBE',
  STYLIST = 'STYLIST',
  SHOP = 'SHOP'
}

export interface ShoppingAdvice {
  verdict: 'BUY IT!' | 'AS IF!' | 'MAYBE';
  reasoning: string;
  pairingSuggestions: string[];
}

export interface OutfitSuggestion {
  lookName: string;
  selectedItemIds: string[];
  reasoning: string;
}