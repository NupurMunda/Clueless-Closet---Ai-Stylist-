==================================================
PROJECT README
==================================================

Project Name: Clueless Closet (Cher’s Closet)
Tagline: A 90s-inspired AI-powered personal stylist ✨

--------------------------------------------------
1. OVERVIEW
--------------------------------------------------

Clueless Closet is a client-side, AI-native styling web application inspired by 
Cher Horowitz’s iconic digital wardrobe from the movie *Clueless*.

The app functions as a digital closet where users can:
- Upload their own photos
- Analyze personal style attributes using AI
- Store clothing items digitally
- Generate outfit combinations
- Preview playful AI-based "paper doll" try-ons
- Decide whether new purchases suit their existing wardrobe

The application is intentionally built without a traditional backend to remain
lightweight, fast, and easy to deploy.

--------------------------------------------------
2. DESIGN PHILOSOPHY
--------------------------------------------------

• AI-first, not AI-assisted  
• Browser-native, serverless architecture  
• Playful, nostalgic UX to encourage exploration  
• Soft, non-judgmental styling language  
• Fashion logic over rigid classification  

The app prioritizes *experience and creativity* over technical heaviness.

--------------------------------------------------
3. ARCHITECTURE SUMMARY
--------------------------------------------------

Application Type:
- Single Page Application (SPA)

Frontend:
- React + TypeScript
- Tailwind CSS for layout
- Custom retro CSS for Windows 95 / Clueless UI

AI Layer:
- Google Gemini API
  - gemini-2.5-flash (analysis, reasoning, categorization)
  - gemini-2.5-flash-image (image generation / try-ons)

Data Persistence:
- Browser LocalStorage only

There is currently NO backend server or database.

--------------------------------------------------
4. HIGH LEVEL SYSTEM FLOW
--------------------------------------------------

[ User Browser ]
      |
      |-- React UI (Views & Components)
      |-- State Management (Profile, Wardrobe)
      |-- LocalStorage (Persistence)
      |
      |-- geminiService.ts
               |
               v
        Google Gemini API

--------------------------------------------------
5. CORE MODULES
--------------------------------------------------

5.1 User Identity Module
------------------------
- Handles simple onboarding (name input)
- Stores username and settings in localStorage
- No authentication or account system

5.2 Profile & Analysis Engine
-----------------------------
- Takes a user selfie
- Uses Gemini to analyze:
  - Body type (styling-oriented)
  - Color season
  - Style essence
  - Style roots
  - Celebrity style reference
- Stores results as structured JSON

5.3 Digital Wardrobe Module
---------------------------
- Users upload clothing images
- AI categorizes each item automatically
- Items are stored in categorized "shelves"
- Manual drag-and-drop recategorization supported

5.4 Stylist Engine
------------------
- Acts as the reasoning brain of the app
- Generates outfit combinations using:
  - User profile analysis
  - Available wardrobe items
  - Selected occasion
- Prevents outfit generation if wardrobe is incomplete

5.5 Try-On Generator (Background Process)
-----------------------------------------
- Generates AI-based visual previews of the user wearing items
- Runs silently in the background
- Only triggers when wardrobe is viable
- Updates wardrobe state without blocking UI

--------------------------------------------------
6. DATA MODELS
--------------------------------------------------

UserProfile
-----------
- name
- base64 selfie image
- style preferences
- AI-generated analysis object

UserAnalysis
------------
- bodyType
- colorSeason
- essence
- styleRoots[]
- celebrityMatch

ClothingItem
------------
- id
- original image (base64)
- tryOnImage (AI-generated)
- category
- subCategory
- occasions[]

OutfitSuggestion
----------------
- outfit name
- list of clothing item IDs
- explanation (why the outfit works)

--------------------------------------------------
7. UI / UX DESIGN SYSTEM
--------------------------------------------------

Theme:
- Windows 95 / 90s Clueless aesthetic

Core Components:
- RetroWindow (bevel borders + title bar)
- RetroButton (3D clickable style)
- RetroInput (monospace inputs)

Styling:
- Tailwind CSS for structure
- Custom CSS for scrollbars, borders, backgrounds

UX Notes:
- "Try-ons" are framed as playful previews
- Soft copy is used to reduce body-image pressure
- AI imperfections are intentionally normalized

--------------------------------------------------
8. SERVICE LAYER (geminiService.ts)
--------------------------------------------------

analyzeUserProfile(photo)
-------------------------
- Uses gemini-2.5-flash
- Returns structured JSON analysis

categorizeClothingItem(image)
-----------------------------
- Identifies category, subcategory, and occasions

generateSingleItemTryOn(userPhoto, clothingPhoto)
-------------------------------------------------
- Uses gemini-2.5-flash-image
- Generates a composite preview image

generateOutfitSuggestions(profile, wardrobe, occasion)
-------------------------------------------------------
- Selects compatible clothing IDs
- Explains styling logic in text form

--------------------------------------------------
9. BACKGROUND PROCESSING LOGIC
--------------------------------------------------

Triggered when:
- A new clothing item is uploaded

Steps:
1. Check wardrobe completeness
2. Identify items missing try-on previews
3. Generate previews sequentially
4. Update wardrobe state dynamically

This ensures a smooth and responsive UI.

--------------------------------------------------
10. CURRENT LIMITATIONS
--------------------------------------------------

• All data stored locally in browser
• No cross-device sync
• No user authentication
• API key handling not yet implemented
• AI output depends on model consistency

--------------------------------------------------
11. FUTURE / TODO
--------------------------------------------------

Planned Improvements:

1. Backend Integration
----------------------
- Introduce a lightweight backend (Node / Firebase / Supabase)
- Move heavy logic off the client
- Enable secure API handling

2. Cloud Database Migration
---------------------------
- Migrate from localStorage to cloud DB
- Enable multi-device wardrobe sync
- User accounts & persistence

3. Bring Your Own API Key (BYOK)
--------------------------------
- Allow users to use their own Gemini API key
- Reduce operational cost
- Improve privacy and control

4. Monetization (Ads)
---------------------
- Integrate non-intrusive ad placements
- Sponsored fashion recommendations
- Optional premium mode (ad-free)


# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16o9JbpwvYrnIhgUO3tXtuN_AhER29JZm

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


--------------------------------------------------
12. DISCLAIMER
--------------------------------------------------

This application is designed for styling inspiration and entertainment.
AI-generated results are approximations and not guaranteed to be accurate.

--------------------------------------------------
END OF README
--------------------------------------------------
