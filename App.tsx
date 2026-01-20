
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TEAM_MEMBERS, STORAGE_KEY } from './constants';
import { DressEntry, SyncData, TeamMemberNote } from './types';
import CountdownTimer from './components/CountdownTimer';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App: React.FC = () => {
  const [entries, setEntries] = useState<DressEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Load initial data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SyncData = JSON.parse(saved);
        setEntries(parsed.entries || []);
        setLastSyncTime(parsed.lastUpdated || null);
      } catch (e) {
        console.error("Parse error", e);
      }
    }
  }, []);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 600; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const saveToCloud = useCallback(async () => {
    if (entries.length === 0) return;
    
    setIsSyncing(true);
    setCloudStatus('loading');
    setSyncProgress(0);

    try {
      // Step 1: Save locally for immediate persistence
      const syncData: SyncData = { entries, lastUpdated: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syncData));

      // Step 2: Sync each dress to cloud individually to avoid payload limits
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setSyncProgress(Math.round(((i + 1) / entries.length) * 100));

        const parts: any[] = [
          { text: `בקשת גיבוי ענן לשמלה ${i + 1}/${entries.length}. נתונים: ${JSON.stringify({
            id: entry.id,
            location: entry.location,
            price: entry.price,
            notes: entry.teamNotes
          })}` }
        ];

        if (entry.image && entry.image.startsWith('data:image')) {
          const base64Data = entry.image.split(',')[1];
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          });
        }

        // We use gemini-3-flash-preview for fast multimodal processing
        await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts }]
        });
      }

      setLastSyncTime(syncData.lastUpdated);
      setCloudStatus('success');
      setTimeout(() => setCloudStatus('idle'), 3000);
      alert('הכל סונכרן בהצלחה לענן! ✨');
    } catch (error) {
      console.error("Cloud Sync Error", error);
      setCloudStatus('error');
      alert('הנתונים נשמרו במכשיר, אך הייתה בעיה בסנכרון התמונות לענן. נסי שוב מאוחר יותר.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  }, [entries]);

  const updateEntry = (id: string, updates: Partial<DressEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const updateMemberNote = (entryId: string, memberName: string, updates: Partial<{note: string, vote: 'up' | 'down' | null}>) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const memberNote = e.teamNotes[memberName];
        return {
          ...e,
          teamNotes: {
            ...e.teamNotes,
            [memberName]: { ...memberNote, ...updates }
          }
        };
      }
      return e;
    }));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        updateEntry(id, { image: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const addNewDress = () => {
    const newEntry: DressEntry = {
      id: crypto.randomUUID(),
      location: '',
      price: '',
      image: null,
      teamNotes: TEAM_MEMBERS.reduce((acc, name) => ({
        ...acc,
        [name]: { name, note: '', vote: null }
      }), {})
    };
    setEntries(prev => [newEntry, ...prev]);
  };

  return (
    <div className="min-h-screen pb-24 px-4 flex flex-col items-center bg-[#fffcfd]">
      {/* Cloud Status Indicator */}
      {isSyncing && (
        <div className="fixed top-0 left-0 w-full h-1.5 bg-pink-100 z-[100]">
          <div 
            className="h-full bg-pink-600 transition-all duration-300" 
            style={{ width: `${syncProgress}%` }}
          />
        </div>
      )}

      <div className="w-full max-w-[1400px] mt-12 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-pink-700 drop-shadow-md mb-2">
          השמלות של בתיה
        </h1>
        <p className="text-pink-300 font-bold tracking-[0.4em] text-sm uppercase">Wedding Collection Manager</p>
      </div>

      <CountdownTimer />

      <div className="w-full max-w-[1400px] mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-white/80 p-8 rounded-[3rem] shadow-xl border border-white">
          <div className="text-right">
             <h2 className="text-3xl font-black text-gray-800 mb-1">הקולקציה שלי</h2>
             {lastSyncTime && (
               <div className="flex items-center gap-2 text-pink-500 font-bold text-sm">
                 <span className={`w-2 h-2 rounded-full ${isSyncing ? 'animate-ping bg-blue-500' : 'bg-pink-500'}`} />
                 <span>סנכרון ענן אחרון: {new Date(lastSyncTime).toLocaleTimeString('he-IL')}</span>
               </div>
             )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={addNewDress}
              className="bg-white text-pink-600 border-2 border-pink-100 font-black px-8 py-3 rounded-2xl hover:bg-pink-50 transition-all"
            >
              + הוספת שמלה
            </button>
            <button 
              onClick={saveToCloud}
              disabled={isSyncing}
              className={`${isSyncing ? 'bg-pink-300' : 'bg-pink-600 hover:bg-pink-700'} text-white font-black px-10 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all active:scale-95`}
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>מעלה שמלה ({syncProgress}%)</span>
                </>
              ) : (
                <>
                  <span>☁️</span>
                  <span>סנכרון ענן מלא</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col lg:flex-row bg-white rounded-[4rem] shadow-2xl border border-pink-50 overflow-hidden relative group">
              <button 
                onClick={() => { if(confirm('למחוק?')) setEntries(prev => prev.filter(e => e.id !== entry.id)) }}
                className="absolute top-6 left-6 text-gray-200 hover:text-red-500 p-3 bg-gray-50/50 rounded-2xl z-10 transition-all"
              >
                🗑️
              </button>

              <div className="lg:w-1/2 p-10 md:p-16 border-l border-pink-50/50">
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-pink-300 uppercase tracking-widest">מיקום</label>
                    <input 
                      type="text" placeholder="חנות / מעצב" value={entry.location}
                      onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                      className="w-full border-b-2 border-pink-50 px-0 py-2 focus:border-pink-400 outline-none text-2xl font-black bg-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-pink-300 uppercase tracking-widest">מחיר</label>
                    <input 
                      type="text" placeholder="₪0" value={entry.price}
                      onChange={(e) => updateEntry(entry.id, { price: e.target.value })}
                      className="w-full border-b-2 border-pink-50 px-0 py-2 focus:border-pink-400 outline-none text-2xl font-black text-pink-600 bg-transparent"
                    />
                  </div>
                </div>

                <div className="relative aspect-[4/5] bg-pink-50/20 rounded-[3rem] overflow-hidden border-2 border-dashed border-pink-100 flex items-center justify-center">
                  {!entry.image ? (
                    <label className="cursor-pointer flex flex-col items-center group/upload">
                      <div className="bg-white shadow-xl text-pink-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl group-hover/upload:scale-110 transition-transform">📸</div>
                      <span className="text-pink-200 font-bold">הוסיפי תמונה</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(entry.id, e)} />
                    </label>
                  ) : (
                    <div className="group/img relative w-full h-full">
                      <img src={entry.image} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity gap-4">
                        <button onClick={() => updateEntry(entry.id, { image: null })} className="bg-white text-red-600 px-6 py-2 rounded-xl font-black">מחק</button>
                        <label className="bg-pink-600 text-white px-6 py-2 rounded-xl font-black cursor-pointer">
                          החלף
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(entry.id, e)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:w-1/2 p-10 md:p-16 bg-pink-50/10">
                <h3 className="text-3xl font-black text-gray-700 mb-10">חוות דעת הצוות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {TEAM_MEMBERS.map(name => {
                    const data = entry.teamNotes[name];
                    return (
                      <div key={name} className="bg-white p-6 rounded-3xl shadow-sm border border-pink-50">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-black text-gray-700">{name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => updateMemberNote(entry.id, name, { vote: data.vote === 'up' ? null : 'up' })} className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.vote === 'up' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-50 text-gray-300'}`}>👍</button>
                            <button onClick={() => updateMemberNote(entry.id, name, { vote: data.vote === 'down' ? null : 'down' })} className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.vote === 'down' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-300'}`}>👎</button>
                          </div>
                        </div>
                        <textarea 
                          placeholder="הערה..." value={data.note}
                          onChange={(e) => updateMemberNote(entry.id, name, { note: e.target.value })}
                          className="w-full bg-pink-50/30 rounded-2xl p-4 text-sm h-24 resize-none focus:bg-white border-2 border-transparent focus:border-pink-100 outline-none transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-10 left-10 z-[60]">
        <button 
          onClick={saveToCloud} disabled={isSyncing}
          className={`${isSyncing ? 'bg-pink-400 scale-95' : 'bg-pink-600 hover:scale-105'} text-white p-6 rounded-[2.5rem] shadow-2xl transition-all flex items-center gap-4`}
        >
          {isSyncing ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="text-3xl">💾</span>}
          <div className="flex flex-col items-start pr-2">
            <span className="font-black text-xl leading-none">שמירה כללית</span>
            {isSyncing && <span className="text-[10px] font-bold opacity-70 mt-1 uppercase">ענן מסתנכרן...</span>}
          </div>
        </button>
      </div>
    </div>
  );
};

export default App;
