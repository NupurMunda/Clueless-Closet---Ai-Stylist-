import React, { useState, useRef, useEffect } from 'react';
import { RetroButton, RetroWindow, RetroInput, FashionLoader } from './components/RetroComponents';
import { AppView, ClothingItem, UserProfile, ShoppingAdvice, OutfitSuggestion } from './types';
import { analyzeUserProfile, categorizeClothingItem, generateOutfitSuggestions, evaluatePurchase, cleanClothingImage, generateSingleItemTryOn } from './services/geminiService';
import { Camera, Shirt, ShoppingBag, User, Sparkles, Upload, ArrowRight, X, Wand2, Trash2, Edit2, Info, GripVertical, Plus, Image as ImageIcon, ChevronLeft, Loader2, CheckCircle2, Star, AlertTriangle } from 'lucide-react';

// --- Helper for File Reading ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.PROFILE);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    photo: null,
    preferences: "I love plaid, mini skirts, and vintage 90s vibes.",
    analysis: null
  });
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const [showNameModal, setShowNameModal] = useState(false);
  
  // Edit State
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);

  // Shop State
  const [shopImage, setShopImage] = useState<string | null>(null);
  const [shopAdvice, setShopAdvice] = useState<ShoppingAdvice | null>(null);

  // Stylist State
  const [occasion, setOccasion] = useState<string>("Casual/Everyday");
  const [outfitOptions, setOutfitOptions] = useState<OutfitSuggestion[]>([]);
  const [selectedLook, setSelectedLook] = useState<OutfitSuggestion | null>(null);

  // Refs
  const profileInputRef = useRef<HTMLInputElement>(null);
  const wardrobeInputRef = useRef<HTMLInputElement>(null);
  const shopInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('chers_closet_username');
    if (savedName) {
      setProfile(prev => ({ ...prev, name: savedName }));
    } else {
      setShowNameModal(true);
    }
  }, []);

  // --- Logic for Wardrobe Completeness ---
  const checkWardrobeCompleteness = (items: ClothingItem[]) => {
    const hasTop = items.some(i => ['top', 'outerwear'].includes(i.category));
    const hasBottom = items.some(i => i.category === 'bottom');
    const hasShoes = items.some(i => i.category === 'shoes');
    const hasDress = items.some(i => i.category === 'one-piece');
    
    const isComplete = (hasTop && hasBottom && hasShoes) || (hasDress && hasShoes);
    return { isComplete, hasTop, hasBottom, hasShoes, hasDress };
  };

  // --- Background Job Trigger ---
  const triggerBackgroundProcessing = async (currentWardrobe: ClothingItem[]) => {
      // 1. Check if we meet the minimum criteria to start generating
      const { isComplete } = checkWardrobeCompleteness(currentWardrobe);
      
      if (!isComplete) {
          console.log("Wardrobe incomplete. Skipping AI generation to save resources.");
          return;
      }

      if (!profile.photo) {
          console.log("No user photo available for try-on generation.");
          return;
      }

      // 2. Find items that don't have a try-on image yet
      const itemsNeedingGen = currentWardrobe.filter(item => !item.tryOnImage);

      if (itemsNeedingGen.length === 0) return;

      console.log(`Starting background generation for ${itemsNeedingGen.length} items...`);

      // 3. Process each item (Sequential to avoid rate limits, or parallel if few)
      // Using a simple loop here
      for (const item of itemsNeedingGen) {
          try {
              // Generate silently
              const tryOnUrl = await generateSingleItemTryOn(profile.photo, item.image, item.category);
              
              // Update state functionally to ensure we don't overwrite other updates
              setWardrobe(prev => prev.map(i => i.id === item.id ? { ...i, tryOnImage: tryOnUrl } : i));
          } catch (error) {
              console.error(`Failed to generate background image for ${item.name}`, error);
          }
      }
  };

  // --- Handlers ---

  const handleNameSubmit = () => {
    if (profile.name.trim()) {
       localStorage.setItem('chers_closet_username', profile.name);
       setShowNameModal(false);
    }
  };

  const handleAnalyzeProfile = async () => {
    if (!profile.photo) return alert("Take a selfie first, duh!");
    setLoading(true);
    setLoadingMessage("Reading Your Aura...");
    try {
      const result = await analyzeUserProfile(profile.photo, profile.preferences);
      setProfile(prev => ({ ...prev, analysis: result }));
      // If we have wardrobe items waiting, maybe trigger generation now that we have a photo?
      // triggerBackgroundProcessing(wardrobe); 
    } catch (e) {
      alert("Ugh, the oracle is confused. Try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClothing = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      setLoadingMessage("Scanning Item Tags..."); // Only blocking part
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        
        // 1. Categorize (Fast, Text only)
        const info = await categorizeClothingItem(base64);
        
        const newItem: ClothingItem = {
          id: Date.now().toString(),
          image: base64,
          category: info.category as any,
          subCategory: info.subCategory,
          name: info.name,
          description: info.description,
          occasions: info.occasions,
          // tryOnImage is undefined initially
        };
        
        // 2. Update State
        const newWardrobe = [newItem, ...wardrobe];
        setWardrobe(newWardrobe);
        
        // 3. Trigger Background Jobs (Silent)
        // We pass the new list so it can check completeness including the new item
        triggerBackgroundProcessing(newWardrobe);

      } catch (err) {
        alert("Couldn't scan that item.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShopAnalysis = async () => {
    if (!shopImage) return;
    setLoading(true);
    setLoadingMessage("Consulting the Stars...");
    try {
      const advice = await evaluatePurchase(shopImage, profile.analysis, wardrobe);
      setShopAdvice(advice);
    } catch (e) {
      console.error(e);
      alert("Computer says no.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetLooks = async () => {
    setLoading(true);
    setLoadingMessage("Curating from your closet...");
    setOutfitOptions([]);
    setSelectedLook(null);
    
    try {
      const suggestions = await generateOutfitSuggestions(wardrobe, profile.analysis, occasion);
      setOutfitOptions(suggestions);
    } catch (e) {
      console.error(e);
      alert("Could not generate looks.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLook = (look: OutfitSuggestion) => {
      setSelectedLook(look);
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    setWardrobe(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    setWardrobe(prev => prev.filter(item => item.id !== editingItem.id));
    setEditingItem(null);
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, item: ClothingItem) => e.dataTransfer.setData('itemId', item.id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, targetCategory: ClothingItem['category']) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = wardrobe.find(i => i.id === itemId);
    if (item && item.category !== targetCategory) {
        const updatedWardrobe = wardrobe.map(i => i.id === itemId ? { ...i, category: targetCategory } : i);
        setWardrobe(updatedWardrobe);
        triggerBackgroundProcessing(updatedWardrobe); // Re-check if moving categories enabled completeness
    }
  };

  // --- Views ---

  const renderNav = () => (
    <div className="fixed bottom-0 left-0 w-full bg-gray-200 border-t-2 border-white p-2 flex justify-around z-50 shadow-inner">
        {[
            { id: AppView.PROFILE, icon: User, label: "Me" },
            { id: AppView.WARDROBE, icon: Shirt, label: "Closet" },
            { id: AppView.STYLIST, icon: Sparkles, label: "Stylist" },
            { id: AppView.SHOP, icon: ShoppingBag, label: "Shop" },
        ].map(item => (
            <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center p-2 w-20 border-2 active:border-t-gray-800 active:border-l-gray-800 active:border-b-white active:border-r-white ${currentView === item.id ? 'bg-white border-t-gray-800 border-l-gray-800 border-b-white border-r-white shadow-inner' : 'border-t-white border-l-white border-b-gray-800 border-r-gray-800'}`}
            >
                <item.icon size={24} className={currentView === item.id ? "text-clueless-pink" : "text-gray-600"} />
                <span className="text-xs font-mono font-bold mt-1 uppercase">{item.label}</span>
            </button>
        ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 pb-20">
      <RetroWindow title="USER_IDENTITY.EXE" className="w-full">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-48 h-48 bg-gray-300 border-4 border-double border-gray-500 relative flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition"
            onClick={() => profileInputRef.current?.click()}
          >
            {profile.photo ? (
              <img src={profile.photo} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-500 text-center p-2">
                <Camera className="mx-auto mb-2" />
                <span className="block font-bold text-black">Upload Photo</span>
              </div>
            )}
            <input 
                type="file" 
                ref={profileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={async (e) => {
                    if (e.target.files?.[0]) {
                        const b64 = await fileToBase64(e.target.files[0]);
                        setProfile({...profile, photo: b64});
                    }
                }} 
            />
          </div>
          
          <div className="w-full">
            <label className="font-bold block mb-1 font-serif text-black">Preferences:</label>
            <RetroInput 
                value={profile.preferences}
                onChange={(e) => setProfile({...profile, preferences: e.target.value})}
                className="w-full"
            />
          </div>

          <RetroButton onClick={handleAnalyzeProfile} disabled={loading} className="w-full text-lg">
            {loading ? "Scanning Aura..." : "Analyze My Essence"}
          </RetroButton>
        </div>
      </RetroWindow>

      {profile.analysis && (
        <div className="space-y-4">
            <RetroWindow title="ANALYSIS_RESULT.TXT" className="w-full bg-white text-black">
                <div className="space-y-3 font-mono text-lg text-black">
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                        <span className="font-bold">BODY TYPE:</span>
                        <span className="text-right">{profile.analysis.bodyType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                        <span className="font-bold">SEASON:</span>
                        <span className="text-right">{profile.analysis.colorSeason}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                        <span className="font-bold">ESSENCE:</span>
                        <span className="text-right">{profile.analysis.essence}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                        <span className="font-bold">ROOTS:</span>
                        <span className="text-right">{profile.analysis.styleRoots.join(', ')}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                        <span className="font-bold">CELEB TWIN:</span>
                        <span className="text-right">{profile.analysis.celebrityMatch}</span>
                    </div>
                </div>
            </RetroWindow>

            <RetroWindow title="STYLING_TIPS.DOC" className="w-full bg-yellow-50 text-black">
                <div className="space-y-2">
                    <h4 className="font-mono font-bold underline text-lg">CHEAT SHEET:</h4>
                    <ul className="list-disc pl-5 font-serif text-sm italic space-y-1">
                        {profile.analysis.stylingTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                        ))}
                    </ul>
                </div>
            </RetroWindow>
        </div>
      )}
    </div>
  );

  const renderShelf = (title: string, category: ClothingItem['category'], items: ClothingItem[]) => {
    return (
      <div 
        className="mb-6"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, category)}
      >
        <div className="bg-[#8B4513] text-white font-serif px-2 py-1 inline-block rounded-t-lg min-w-[150px]">
            {title}
        </div>
        <div className="bg-[#DEB887] border-4 border-[#8B4513] p-4 flex gap-4 overflow-x-auto retro-scroll shadow-inner min-h-[140px] items-end relative">
             <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
             {items.length === 0 ? (
                 <div className="text-[#8B4513] font-mono opacity-50 text-sm w-full text-center py-4">Drag items here</div>
             ) : (
                 items.map(item => (
                    <div 
                        key={item.id} 
                        className="flex-shrink-0 flex flex-col items-center cursor-pointer hover:-translate-y-2 transition-transform z-10"
                        onClick={() => setEditingItem(item)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                    >
                        <div className="w-24 h-24 relative filter drop-shadow-md bg-white/50 border border-white p-1">
                            {/* CLOSET VIEW: Always show the original clothing image */}
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                            {item.tryOnImage && (
                                <div className="absolute top-0 right-0 text-yellow-400 drop-shadow-md">
                                    <Sparkles size={12} fill="currentColor" />
                                </div>
                            )}
                        </div>
                        <div className="mt-1 bg-white px-2 text-[10px] font-mono border border-black truncate max-w-[100px] text-center text-black">
                            {item.name}
                        </div>
                    </div>
                 ))
             )}
        </div>
      </div>
    );
  };

  const renderWardrobe = () => {
    const shelves: {title: string, cat: ClothingItem['category'], items: ClothingItem[]}[] = [
        { title: "TOPS & JACKETS", cat: 'top', items: wardrobe.filter(i => ['top', 'outerwear'].includes(i.category)) },
        { title: "BOTTOMS", cat: 'bottom', items: wardrobe.filter(i => i.category === 'bottom') },
        { title: "DRESSES", cat: 'one-piece', items: wardrobe.filter(i => i.category === 'one-piece') },
        { title: "SHOES", cat: 'shoes', items: wardrobe.filter(i => i.category === 'shoes') },
        { title: "ACCESSORIES", cat: 'accessory', items: wardrobe.filter(i => i.category === 'accessory') },
    ];

    return (
        <div className="pb-20 h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4 sticky top-0 z-20 bg-[#f3e03b] pb-2 border-b-2 border-black/10">
                <h2 className="text-2xl font-serif bg-white text-black px-2 border-2 border-black">MY CLOSET</h2>
                <RetroButton onClick={() => wardrobeInputRef.current?.click()}>
                    <Plus size={16} className="inline mr-1"/> Add Item
                </RetroButton>
                <input type="file" ref={wardrobeInputRef} className="hidden" accept="image/*" onChange={handleUploadClothing} />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 retro-scroll">
                {shelves.map(s => renderShelf(s.title, s.cat, s.items))}
            </div>

            {editingItem && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <RetroWindow title="ITEM_PROPERTIES.EXE" onClose={() => setEditingItem(null)} className="w-full max-w-sm">
                        <div className="flex flex-col gap-4 text-black">
                            <div className="w-32 h-32 mx-auto border-2 border-gray-500 flex items-center justify-center bg-white">
                                <img src={editingItem.image} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                            <div className="text-center text-xs font-mono text-gray-500">
                                {editingItem.occasions?.join(', ')}
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">NAME:</label>
                                <RetroInput 
                                    value={editingItem.name} 
                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <RetroButton onClick={handleSaveItem} variant="primary" className="flex-1">SAVE</RetroButton>
                                <RetroButton onClick={handleDeleteItem} className="bg-red-600 text-white"><Trash2 size={16}/></RetroButton>
                            </div>
                        </div>
                    </RetroWindow>
                </div>
            )}
        </div>
    );
  };

  const renderStylist = () => {
    const completeness = checkWardrobeCompleteness(wardrobe);
    
    // Gated View for Stylist
    if (!profile.analysis) {
        return (
             <div className="pb-20 h-full flex flex-col items-center justify-center p-6">
                <div className="bg-white border-4 border-double border-red-500 p-6 text-center shadow-lg">
                    <h3 className="font-bold text-xl mb-2 text-black">Who are you?</h3>
                    <p className="text-black mb-4">I can't style you if I don't know your essence!</p>
                    <RetroButton onClick={() => setCurrentView(AppView.PROFILE)}>Go to Profile</RetroButton>
                </div>
             </div>
        );
    }

    if (!completeness.isComplete) {
        return (
            <div className="pb-20 h-full flex flex-col items-center justify-center p-6">
                <RetroWindow title="SHOPPING_LIST.TXT" className="w-full max-w-xs bg-yellow-100 text-black">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-red-600 font-bold border-b border-red-400 pb-2">
                            <AlertTriangle />
                            <span>CLOSET INCOMPLETE</span>
                        </div>
                        <p className="font-mono text-sm">I can't make a full outfit yet! I need at least:</p>
                        
                        <div className="bg-white border-2 border-gray-400 p-3 font-mono text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span>[ {completeness.hasTop ? 'x' : ' '} ] Tops</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span>[ {completeness.hasBottom ? 'x' : ' '} ] Bottoms</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span>[ {completeness.hasShoes ? 'x' : ' '} ] Shoes</span>
                            </div>
                            <div className="border-t border-dashed border-gray-400 my-1 pt-1 text-center italic text-gray-500">OR</div>
                            <div className="flex justify-between items-center">
                                <span>[ {completeness.hasDress ? 'x' : ' '} ] Dress + Shoes</span>
                            </div>
                        </div>

                        <RetroButton onClick={() => setCurrentView(AppView.WARDROBE)}>Go Add Clothes</RetroButton>
                    </div>
                </RetroWindow>
            </div>
        );
    }

    return (
        <div className="pb-20 h-full flex flex-col items-center">
            <div className="w-full flex-1 flex flex-col overflow-hidden">
                <div className="p-2 border-b-2 border-gray-600 bg-gray-200">
                     <div className="flex gap-2 items-center">
                        {selectedLook && (
                            <button onClick={() => setSelectedLook(null)} className="p-1 border-2 border-black bg-white">
                                <ChevronLeft size={20} className="text-black"/>
                            </button>
                        )}
                        <select 
                                value={occasion}
                                onChange={(e) => setOccasion(e.target.value)}
                                className="flex-1 p-2 border-2 border-gray-800 font-serif text-lg bg-white text-black"
                                disabled={!!selectedLook}
                        >
                                <option value="Casual">Casual / Everyday</option>
                                <option value="Work">Office / Work</option>
                                <option value="Date">Date Night</option>
                                <option value="Party">Party / Clubbing</option>
                        </select>
                        {!selectedLook && (
                            <RetroButton onClick={handleGetLooks} disabled={loading}>
                                {loading ? "Mixing..." : "STYLE ME"}
                            </RetroButton>
                        )}
                     </div>
                </div>

                <div className="flex-1 overflow-y-auto relative bg-gray-300 p-2">
                    {!selectedLook && outfitOptions.length > 0 && (
                        <div className="space-y-4">
                            {outfitOptions.map((look, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handleSelectLook(look)}
                                    className="bg-white border-2 border-gray-600 p-2 cursor-pointer hover:border-clueless-pink hover:shadow-lg transition-all group"
                                >
                                    <div className="bg-clueless-pink text-white font-bold px-2 py-1 mb-2 flex justify-between">
                                        <span>{look.lookName}</span>
                                        <span className="font-mono opacity-80">LOOK {idx + 1}</span>
                                    </div>
                                    
                                    {/* Paper Doll / Try-On Collage */}
                                    <div className="h-40 bg-gray-100 relative mb-2 overflow-hidden border border-gray-300 flex items-end justify-center">
                                        {/* Background hint */}
                                        <div className="absolute inset-0 bg-gray-200 opacity-50" style={{backgroundImage: 'radial-gradient(circle, #000000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                                        
                                        <div className="flex items-end -space-x-4 relative z-10 h-full">
                                            {wardrobe
                                                .filter(item => look.selectedItemIds.includes(item.id))
                                                .map((item, i) => (
                                                    <div key={item.id} className="relative transition-transform hover:scale-110 hover:z-20">
                                                        {/* STYLIST VIEW: Use Pre-generated Try-On if available */}
                                                        <img 
                                                            src={item.tryOnImage || item.image} 
                                                            className="h-32 w-auto object-contain drop-shadow-xl" 
                                                            style={{
                                                                maxHeight: item.category === 'one-piece' || item.category === 'bottom' ? '140px' : '100px'
                                                            }}
                                                        />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                    <p className="text-xs font-serif italic text-gray-600">{look.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedLook && (
                        <div className="h-full flex flex-col">
                             <div className="flex-1 bg-white border-2 border-black p-4 flex flex-col items-center justify-center relative overflow-hidden">
                                 {/* Full Screen Collage View */}
                                 <h2 className="absolute top-4 left-4 font-serif text-2xl font-bold z-20 text-black bg-white/80 px-2">{selectedLook.lookName}</h2>
                                 
                                 <div className="flex flex-wrap items-center justify-center gap-4 z-10">
                                     {wardrobe
                                         .filter(item => selectedLook.selectedItemIds.includes(item.id))
                                         .map((item) => (
                                             <div key={item.id} className="relative group">
                                                 <img 
                                                    src={item.tryOnImage || item.image} 
                                                    className="max-h-[250px] object-contain drop-shadow-2xl" 
                                                 />
                                                 {item.tryOnImage && <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] px-1">AI GENERATED</span>}
                                             </div>
                                         ))
                                     }
                                 </div>
                                 
                                 <div className="absolute bottom-0 w-full bg-white/90 p-4 border-t-2 border-gray-200">
                                    <p className="font-mono text-black">{selectedLook.reasoning}</p>
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderShop = () => (
    <div className="pb-20 h-full flex flex-col">
        <RetroWindow title="SHOULD_I_BUY_THIS?.EXE" className="w-full flex-1 flex flex-col overflow-hidden text-black">
            <div className="flex-1 overflow-y-auto p-2 retro-scroll">
                {!shopImage ? (
                    <div 
                        className="h-64 border-2 border-dashed border-gray-500 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => shopInputRef.current?.click()}
                    >
                        <Upload size={40} className="text-gray-400 mb-2"/>
                        <span className="font-mono text-gray-600">Upload screenshot of item</span>
                        <input type="file" ref={shopInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                                if (e.target.files?.[0]) {
                                    const b64 = await fileToBase64(e.target.files[0]);
                                    setShopImage(b64);
                                    setShopAdvice(null);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="relative w-full max-h-64 mb-4 border-2 border-black bg-white p-2">
                             <img src={shopImage} alt="Shop Item" className="w-full h-full object-contain max-h-60" />
                             <button 
                                onClick={() => { setShopImage(null); setShopAdvice(null); }}
                                className="absolute top-2 right-2 bg-white border border-black p-1 hover:bg-red-100"
                             >
                                <X size={16}/>
                             </button>
                        </div>
                        
                        {!shopAdvice && (
                            <RetroButton onClick={handleShopAnalysis} disabled={loading} className="w-full mb-4">
                                {loading ? "Consulting the fashion gods..." : "Judge It!"}
                            </RetroButton>
                        )}
                    </div>
                )}

                {shopAdvice && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-black">
                        <div className={`border-4 p-4 text-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                            shopAdvice.verdict === 'BUY IT!' ? 'bg-green-200 border-green-800 text-green-900' :
                            shopAdvice.verdict === 'AS IF!' ? 'bg-red-200 border-red-800 text-red-900' :
                            'bg-yellow-200 border-yellow-800 text-yellow-900'
                        }`}>
                            <h2 className="text-4xl font-black font-serif uppercase tracking-widest">{shopAdvice.verdict}</h2>
                        </div>
                        <div className="bg-white p-4 border-2 border-gray-400 mb-4 text-black">
                            <h4 className="font-bold underline mb-2 font-mono text-black">WHY THO?</h4>
                            <p className="font-serif italic text-lg leading-relaxed text-black">{shopAdvice.reasoning}</p>
                        </div>
                    </div>
                )}
            </div>
        </RetroWindow>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[85vh] bg-gray-200 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-gray-600 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="bg-clueless-pink h-8 flex items-center justify-between px-2 border-b-2 border-gray-600">
            <span className="text-white font-bold font-serif tracking-widest uppercase truncate max-w-[200px]">
                {profile.name ? `${profile.name}'S CLOSET` : "MY CLOSET"} v1.0
            </span>
            <div className="flex gap-1">
                <div className="w-4 h-4 bg-gray-300 border border-gray-500"></div>
                <div className="w-4 h-4 bg-gray-300 border border-gray-500"></div>
            </div>
        </div>
        <div className="flex-1 overflow-hidden p-4 relative bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]">
            {currentView === AppView.PROFILE && renderProfile()}
            {currentView === AppView.WARDROBE && renderWardrobe()}
            {currentView === AppView.STYLIST && renderStylist()}
            {currentView === AppView.SHOP && renderShop()}
        </div>
        {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[100]">
                <RetroWindow title="PLEASE WAIT...">
                    <div className="flex flex-col items-center p-6 bg-white min-w-[200px]">
                        <FashionLoader />
                        <p className="mt-4 font-mono font-bold text-lg text-clueless-pink animate-pulse text-center">{loadingMessage}</p>
                    </div>
                </RetroWindow>
            </div>
        )}
        {showNameModal && (
            <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                <RetroWindow title="LOGIN.EXE" className="w-full max-w-sm">
                    <div className="flex flex-col gap-4 text-black">
                        <p className="font-serif text-lg leading-snug">Hi! I'm your digital stylist. What should I call you?</p>
                        <RetroInput
                            value={profile.name}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                            placeholder="Type your name..."
                            autoFocus
                        />
                        <RetroButton onClick={handleNameSubmit} disabled={!profile.name.trim()}>ENTER CLOSET</RetroButton>
                    </div>
                </RetroWindow>
            </div>
        )}
        {renderNav()}
      </div>
    </div>
  );
}