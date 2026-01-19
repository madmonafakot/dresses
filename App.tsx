
import React, { useState, useEffect, useCallback } from 'react';
import { TEAM_MEMBERS, STORAGE_KEY } from './constants';
import { DressEntry, SyncData } from './types';
import CountdownTimer from './components/CountdownTimer';

const App: React.FC = () => {
  const [entries, setEntries] = useState<DressEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Initialize data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: SyncData = JSON.parse(saved);
      setEntries(parsed.entries);
      setLastSyncTime(parsed.lastUpdated);
    } else {
      // Create initial empty row
      const initialEntry: DressEntry = {
        id: crypto.randomUUID(),
        location: '',
        price: '',
        image: null,
        teamNotes: TEAM_MEMBERS.reduce((acc, name) => ({
          ...acc,
          [name]: { name, note: '', vote: null }
        }), {})
      };
      setEntries([initialEntry]);
    }
  }, []);

  // Sync Listener (Simulated Real-time with LocalStorage)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed: SyncData = JSON.parse(e.newValue);
        setEntries(parsed.entries);
        setLastSyncTime(parsed.lastUpdated);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveToCloud = useCallback(() => {
    setIsSyncing(true);
    const syncData: SyncData = {
      entries,
      lastUpdated: Date.now()
    };
    
    // In a real world app, this would be an API call
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syncData));
      setLastSyncTime(syncData.lastUpdated);
      setIsSyncing(false);
      
      // Dispatch event for other tabs in same browser
      window.dispatchEvent(new Event('storage'));
      
      alert('הנתונים סונכרנו בהצלחה לכל הצוות!');
    }, 800);
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
      reader.onloadend = () => {
        updateEntry(id, { image: reader.result as string });
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
    setEntries(prev => [...prev, newEntry]);
  };

  const removeDress = (id: string) => {
    if (confirm('בטוח שברצונך למחוק את השמלה?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 flex flex-col items-center">
      {/* Header Section */}
      <div className="w-full max-w-[1400px] mt-12 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-pink-700 drop-shadow-md mb-4 leading-tight">
          השכרת השמלות המיוחלות לחתונה של בתיה המדהימה!!!
        </h1>
        <div className="flex items-center justify-center gap-4 text-3xl">
          <span className="animate-hourglass">⏳</span>
          <span className="text-gray-600 font-medium">סופרים את הימים לאירוע הגדול</span>
          <span className="animate-hourglass">⏳</span>
        </div>
      </div>

      {/* Timer Component */}
      <CountdownTimer />

      {/* Main Table Container */}
      <div className="w-full max-w-[1400px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-pink-100 mb-10">
        <div className="bg-pink-600 text-white p-6 flex justify-between items-center">
          <div className="flex flex-col">
             <h2 className="text-2xl font-bold">רשימת השמלות המועמדות</h2>
             {lastSyncTime && (
               <span className="text-sm opacity-80">סנכרון אחרון: {new Date(lastSyncTime).toLocaleTimeString('he-IL')}</span>
             )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={addNewDress}
              className="bg-white text-pink-600 font-bold px-6 py-2 rounded-full hover:bg-pink-50 transition-colors shadow-sm"
            >
              + שמלה חדשה
            </button>
            <button 
              onClick={saveToCloud}
              disabled={isSyncing}
              className={`${isSyncing ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'} text-white font-bold px-8 py-2 rounded-full transition-all shadow-md flex items-center gap-2`}
            >
              {isSyncing ? 'מסנכרן...' : 'שמור סנכרון לכולן ☁️'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-12 p-8 bg-gray-50">
          {entries.map((entry, index) => (
            <div key={entry.id} className="flex flex-col lg:flex-row gap-0 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative group">
              <button 
                onClick={() => removeDress(entry.id)}
                className="absolute top-4 left-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                🗑️ מחק שמלה
              </button>

              {/* Right Column (60%) - Core Details */}
              <div className="lg:w-[60%] p-8 border-l border-gray-100 bg-gradient-to-br from-white to-pink-50/30">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-600">מקום</label>
                    <input 
                      type="text"
                      placeholder="שם החנות / המעצב"
                      value={entry.location}
                      onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-pink-400 outline-none text-lg transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-600">מחיר</label>
                    <input 
                      type="text"
                      placeholder="₪00.00"
                      value={entry.price}
                      onChange={(e) => updateEntry(entry.id, { price: e.target.value })}
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-pink-400 outline-none text-lg transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">תמונת השמלה</label>
                    <div className="h-[1px] flex-1 bg-gray-200"></div>
                  </div>
                  
                  {!entry.image ? (
                    <label className="border-4 border-dashed border-gray-200 rounded-3xl h-[400px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                      <div className="bg-pink-100 text-pink-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform">
                        📸
                      </div>
                      <span className="text-gray-400 font-medium">לחצי להעלאת תמונה</span>
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(entry.id, e)}
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden shadow-inner group/img">
                      <img 
                        src={entry.image} 
                        alt="Wedding dress preview" 
                        className="w-full max-h-[650px] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity gap-4">
                         <button 
                           onClick={() => updateEntry(entry.id, { image: null })}
                           className="bg-white text-red-600 px-6 py-2 rounded-full font-bold hover:bg-red-50"
                         >
                           מחיקת תמונה
                         </button>
                         <label className="bg-white text-pink-600 px-6 py-2 rounded-full font-bold cursor-pointer hover:bg-pink-50">
                           החלפת תמונה
                           <input 
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(entry.id, e)}
                           />
                         </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Left Column (40%) - Team Feedback */}
              <div className="lg:w-[40%] bg-white p-8 overflow-y-auto max-h-[850px]">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-pink-500">📝</span> הערות הצוות
                </h3>
                <div className="space-y-6">
                  {TEAM_MEMBERS.map(name => {
                    const data = entry.teamNotes[name];
                    return (
                      <div key={name} className="border-b border-gray-100 pb-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-gray-700">{name}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateMemberNote(entry.id, name, { vote: data.vote === 'up' ? null : 'up' })}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${data.vote === 'up' ? 'bg-green-500 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-green-100'}`}
                            >
                              👍
                            </button>
                            <button 
                              onClick={() => updateMemberNote(entry.id, name, { vote: data.vote === 'down' ? null : 'down' })}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${data.vote === 'down' ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-red-100'}`}
                            >
                              👎
                            </button>
                          </div>
                        </div>
                        <textarea 
                          placeholder={`מה דעתך, ${name}?`}
                          value={data.note}
                          onChange={(e) => updateMemberNote(entry.id, name, { note: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:border-pink-300 outline-none min-h-[80px] transition-all resize-none"
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

      {/* Floating Action Button for Sync */}
      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={saveToCloud}
          className="bg-pink-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
        >
          <span className="text-2xl">💾</span>
          <span className="font-bold pr-2">שמירה מהירה</span>
        </button>
      </div>
    </div>
  );
};

export default App;
