import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

const generateId = () => Math.random().toString(36).substr(2, 9);

// ฟังก์ชันใหม่สำหรับการคำนวณวันที่ โดยให้วันใหม่เริ่มตอน 04:00 น.
const getEffectiveDateString = () => {
  const now = new Date();
  // ลบออก 4 ชั่วโมง (4 * 60 * 60 * 1000 มิลลิวินาที)
  // ถ้าตอนนี้ 03:00 น. จะถูกตีความเป็น 23:00 น. ของเมื่อวาน
  const effectiveDate = new Date(now.getTime() - (4 * 60 * 60 * 1000));
  
  const year = effectiveDate.getFullYear();
  const month = String(effectiveDate.getMonth() + 1).padStart(2, '0');
  const day = String(effectiveDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('th-TH', options);
};

const INITIAL_USERS = [
  { id: 'admin1', name: 'Admin (ผู้ดูแลระบบ)', role: 'admin', password: 'admin' }
];

const appId = 'pastelfit-my-app'; 

const firebaseConfig = {
  apiKey: "AIzaSyBQl9xUuXyZGpJAX8PyByImmRYQ9mH0L9Q",
  authDomain: "fitandferm.firebaseapp.com",
  projectId: "fitandferm",
  storageBucket: "fitandferm.firebasestorage.app",
  messagingSenderId: "443086319784",
  appId: "1:443086319784:web:7a02893627fc0df853929d",
  measurementId: "G-ZD25V8THQH"
};

const isLocalMode = firebaseConfig.apiKey.includes("รหัสของคุณ");

let app, db, auth;
if (!isLocalMode) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export default function PastelFitApp() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingUserId, setViewingUserId] = useState(null); 
  const [loginError, setLoginError] = useState(''); 
  const [isOfflineMode, setIsOfflineMode] = useState(isLocalMode);
  const isLocal = isOfflineMode;

  const [users, setUsers] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]); 
  const [measurements, setMeasurements] = useState([]);
  const [tdeeData, setTdeeData] = useState({});
  const [coachNotes, setCoachNotes] = useState({});
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (isLocalMode) {
      setFirebaseUser({ uid: 'local-mode' });
      setIsOfflineMode(true);
      return;
    }
    const initAuth = async () => {
      try { 
        await signInAnonymously(auth); 
      } catch (error) { 
        console.warn("Firebase Auth Error:", error.message);
        setIsOfflineMode(true);
        setFirebaseUser({ uid: 'local-mode' });
      }
    };
    initAuth();
    return onAuthStateChanged(auth, user => {
      if (user) setFirebaseUser(user);
    });
  }, []);

  useEffect(() => {
    if (isOfflineMode) {
      setUsers(INITIAL_USERS);
      setTdeeData({});
      setCoachNotes({});
      setChatMessages([
        { id: 'msg1', senderName: 'Admin', text: 'ยินดีต้อนรับสู่ Fit for Health สอบถามพูดคุยได้เลยค่ะ 🌸', timestamp: new Date().toISOString() }
      ]);
      return;
    }

    if (!firebaseUser) return;

    const refs = ['users', 'foodLogs', 'exerciseLogs', 'measurements', 'tdeeData', 'coachNotes', 'chatMessages'].map(
      col => collection(db, 'artifacts', appId, 'public', 'data', col)
    );

    const unsubUsers = onSnapshot(refs[0], (snap) => {
      if (snap.empty) {
        INITIAL_USERS.forEach(u => setDoc(doc(refs[0], u.id), u));
        setDoc(doc(refs[4], 'u1'), { targetCalories: 1505, profile: { weight: 55, height: 160, age: 25, gender: 'female', activityLevel: '1.2' } });
      } else {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, console.error);

    const unsubFood = onSnapshot(refs[1], (snap) => setFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))));
    const unsubEx = onSnapshot(refs[2], (snap) => setExerciseLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))));
    const unsubMeas = onSnapshot(refs[3], (snap) => setMeasurements(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))));
    
    const unsubTdee = onSnapshot(refs[4], (snap) => {
      const obj = {}; snap.docs.forEach(d => obj[d.id] = d.data()); setTdeeData(obj);
    });
    const unsubNotes = onSnapshot(refs[5], (snap) => {
      const obj = {}; snap.docs.forEach(d => obj[d.id] = d.data().text); setCoachNotes(obj);
    });
    const unsubChat = onSnapshot(refs[6], (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(a.timestamp) - new Date(b.timestamp)));
    }, console.error);

    return () => { unsubUsers(); unsubFood(); unsubEx(); unsubMeas(); unsubTdee(); unsubNotes(); unsubChat(); };
  }, [firebaseUser, isOfflineMode]);

  useEffect(() => {
    // ลบข้อความที่เก่ากว่า 5 นาที ออกจากระบบอัตโนมัติ
    const cleanupInterval = setInterval(() => {
      const cutoffTime = new Date().getTime() - (5 * 60 * 1000); // 5 นาทีที่แล้ว
      
      if (isOfflineMode) {
        setChatMessages(prev => prev.filter(msg => new Date(msg.timestamp).getTime() >= cutoffTime));
      } else if (db) {
        chatMessages.forEach(msg => {
          if (new Date(msg.timestamp).getTime() < cutoffTime) {
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatMessages', msg.id)).catch(() => {});
          }
        });
      }
    }, 60000); // ตรวจสอบเคลียร์ข้อมูลทุกๆ 1 นาที

    return () => clearInterval(cleanupInterval);
  }, [chatMessages, isOfflineMode]);

  const handleLogin = (e) => {
    e.preventDefault();
    const inputId = e.target.userId.value.trim();
    const user = users.find(u => u.id === inputId || u.name === inputId);
    if (user && user.password === e.target.password.value) {
      setCurrentUser(user); setActiveTab('dashboard'); setLoginError('');
    } else {
      setLoginError(user ? 'รหัสผ่านไม่ถูกต้อง' : 'ไม่พบชื่อผู้ใช้งานนี้');
    }
  };

  if (!currentUser) {
    const handleSendChat = (e) => {
      e.preventDefault();
      const name = e.target.chatName.value.trim();
      const text = e.target.chatText.value.trim();
      if (!name || !text) return;
      
      const newMsg = {
        id: generateId(),
        senderName: name,
        text: text,
        timestamp: new Date().toISOString()
      };
      
      if (isOfflineMode) {
        setChatMessages(prev => [...prev, newMsg]);
      } else {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatMessages', newMsg.id), newMsg);
      }
      e.target.chatText.value = '';
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 py-10 font-sans flex flex-col items-center px-4 overflow-y-auto">
           <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-pink-100 mb-8 shrink-0">
             <div className="text-5xl mb-4">🌸</div>
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Fit for Health</h2>
             <p className="text-gray-500 mb-6">เข้าสู่ระบบเพื่อใช้งาน</p>
             {loginError && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-semibold border border-red-100">{loginError}</div>}
             <form onSubmit={handleLogin} className="space-y-4">
               <input type="text" name="userId" placeholder="ชื่อผู้ใช้ หรือ ID" className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200" required />
               <input type="password" name="password" placeholder="รหัสผ่าน" className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200" required />
               <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl shadow-md transition transform hover:-translate-y-1">เข้าสู่ระบบ</button>
             </form>
           </div>

           <div className="bg-white p-6 rounded-3xl shadow-lg w-full max-w-md border border-blue-100 flex flex-col shrink-0">
             <div className="flex items-center gap-2 mb-4 justify-center">
               <span className="text-2xl">💬</span>
               <h3 className="text-xl font-bold text-gray-800">กระดานพูดคุย (Public)</h3>
             </div>
             
             {}
             <div className="bg-slate-50 flex-1 rounded-2xl p-4 mb-4 h-64 overflow-y-auto border border-gray-100 flex flex-col gap-3">
               {chatMessages.length === 0 ? (
                 <p className="text-center text-gray-400 text-sm mt-10 font-medium">ยังไม่มีข้อความ... เริ่มพูดคุยเลย!</p>
               ) : (
                 chatMessages.slice(-5).map(msg => (
                   <div key={msg.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-left animate-fade-in">
                     <div className="flex justify-between items-baseline mb-1">
                       <span className="font-bold text-sm text-blue-600">{msg.senderName}</span>
                       <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                     <p className="text-sm text-gray-700 break-words">{msg.text}</p>
                   </div>
                 ))
               )}
             </div>
             
             <form onSubmit={handleSendChat} className="flex flex-col gap-2">
               <input type="text" name="chatName" placeholder="ชื่อของคุณ" required className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-200 text-sm font-medium" />
               <div className="flex gap-2">
                 <input type="text" name="chatText" placeholder="พิมพ์ข้อความ..." required className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-200 text-sm flex-1 font-medium" />
                 <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl shadow-md transition">ส่ง</button>
               </div>
             </form>
           </div>
      </div>
    );
  }

  const Layout = ({ children }) => (
    <div className="min-h-screen bg-slate-50 pt-16 pb-20 md:pb-0">
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">🌸 Fit for Health</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm font-medium">{currentUser.name}</span>
            <button onClick={() => setCurrentUser(null)} className="text-sm text-pink-500 hover:text-pink-600 font-medium bg-pink-50 px-3 py-1 rounded-full">ออก</button>
          </div>
        </div>
      </nav>
      
      {currentUser.role === 'user' && (
        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around py-2 z-50 px-1 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] text-[10px]">
          <NavBtn id="dashboard" icon="📊" label="สรุป" />
          <NavBtn id="ai" icon="📸" label="สแกน" />
          <NavBtn id="exercise" icon="🏃" label="กิจกรรม" />
          <NavBtn id="measure" icon="📏" label="สัดส่วน" />
          <NavBtn id="tdee" icon="⚙️" label="เป้าหมาย" />
          <NavBtn id="rank" icon="🏆" label="อันดับ" />
        </div>
      )}

      <div className="max-w-7xl mx-auto flex">
        {currentUser.role === 'user' && (
          <div className="hidden md:block w-64 bg-white border-r border-gray-100 p-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="space-y-2">
              <SideNavBtn id="dashboard" icon="📊" label="สรุปรายวัน" />
              <SideNavBtn id="ai" icon="📸" label="AI สแกนอาหาร" />
              <SideNavBtn id="exercise" icon="🏃" label="ออกกำลังกาย" />
              <SideNavBtn id="measure" icon="📏" label="บันทึกสัดส่วน" />
              <SideNavBtn id="tdee" icon="⚙️" label="เป้าหมาย TDEE" />
              <SideNavBtn id="rank" icon="🏆" label="จัดอันดับ (Ranking)" />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden">{children}</main>
      </div>
    </div>
  );

  const NavBtn = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex flex-col items-center flex-1 min-w-0 ${activeTab === id ? 'text-pink-500' : 'text-gray-400'}`}>
      <span className="text-xl mb-1">{icon}</span><span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center">{label}</span>
    </button>
  );
  
  const SideNavBtn = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === id ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-500 hover:bg-gray-50 font-medium'}`}>
      <span className="text-xl">{icon}</span><span>{label}</span>
    </button>
  );

  const AIFoodScanner = () => {
    const [image, setImage] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [result, setResult] = useState(null); 
    const [editForm, setEditForm] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [baseNutrition, setBaseNutrition] = useState(null);
    const [activePortion, setActivePortion] = useState(1);
    const [mealType, setMealType] = useState('lunch');
    const [errorMsg, setErrorMsg] = useState('');
    
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('pastel_gemini_key') || '');
    const [showKeySettings, setShowKeySettings] = useState(false);

    const saveGeminiKey = (key) => {
      setGeminiKey(key);
      localStorage.setItem('pastel_gemini_key', key);
      setShowKeySettings(false);
    };

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { setImage(e.target.result); setResult(null); setPredictions(null); setErrorMsg(''); };
        reader.readAsDataURL(file);
      }
    };

    const runCustomAI = async (mode = 'image') => {
      if (!geminiKey) { setShowKeySettings(true); return; }
      if (mode === 'image' && !image) return;
      if (mode === 'text' && !textInput.trim()) return;
      
      setIsScanning(true); setErrorMsg('');
      if (mode === 'text') setImage(null);
      
      try {
        let parts = [];
        if (mode === 'image') {
          const base64Data = image.split(',')[1];
          const mimeType = image.split(';')[0].split(':')[1] || "image/jpeg";
          const prompt = `Analyze this image of food. Respond ONLY with a valid JSON array of up to 3 objects in this exact format: [{"name": "ชื่ออาหารภาษาไทย", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}]`;
          parts = [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }];
        } else {
          const prompt = `Analyze the nutritional value of this food item: "${textInput}". Respond ONLY with a valid JSON array of up to 3 objects (different variations or portion sizes if applicable) in this exact format: [{"name": "ชื่ออาหารภาษาไทย", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}]`;
          parts = [{ text: prompt }];
        }

        const requestBody = { contents: [{ role: "user", parts: parts }], generationConfig: { responseMimeType: "application/json" } };
        const modelsToTry = ['gemini-3.6-flash', 'gemini-3.1-pro', 'gemini-2.5-flash', 'gemini-1.5-flash'];
        let response = null;
        let lastErrorMsg = '';

        for (const model of modelsToTry) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
            });
            if (res.ok) { response = res; break; } 
            else {
              lastErrorMsg = await res.json().then(d => d?.error?.message).catch(()=>`Error ${res.status}`);
              if (res.status === 400 || res.status === 403 || res.status === 429) break;
            }
          } catch (err) { lastErrorMsg = err.message; }
        }

        if (!response) throw new Error(`AI เชื่อมต่อล้มเหลว: ${lastErrorMsg}`);
        
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text.includes("```")) text = text.replace(/```json/gi, '').replace(/```/g, '');
        
        let preds = JSON.parse(text.trim());
        if (!Array.isArray(preds)) preds = [preds];

        setPredictions(preds); 
        setResult(preds[0]); 
        setEditForm(preds[0]);
        setBaseNutrition(preds[0]);
        setActivePortion(1);
      } catch (error) {
        setErrorMsg(error.message || "วิเคราะห์ล้มเหลว ลองใหม่อีกครั้ง");
      } finally {
        setIsScanning(false);
      }
    };

    const adjustPortion = (multiplier) => {
      if(!baseNutrition) return;
      setActivePortion(multiplier);
      setEditForm(prev => ({
        ...prev,
        calories: Math.round(baseNutrition.calories * multiplier),
        protein: Math.round(baseNutrition.protein * multiplier),
        carbs: Math.round(baseNutrition.carbs * multiplier),
        fat: Math.round(baseNutrition.fat * multiplier)
      }));
    };

    const handleManualEdit = (field, value) => {
       const numVal = Number(value);
       setEditForm(prev => ({...prev, [field]: numVal}));
       if(baseNutrition) {
          setBaseNutrition(prev => ({...prev, [field]: activePortion > 0 ? numVal / activePortion : numVal}));
       }
    };

    const saveFoodLog = () => {
      const newLog = {
        id: generateId(), 
        userId: currentUser.id, 
        // ใช้วันที่ที่ปรับ 04:00 น. แล้ว
        date: getEffectiveDateString(), 
        timestamp: new Date().toISOString(),
        meal: mealType, 
        ...editForm
      };
      if (isLocal) setFoodLogs(prev => [newLog, ...prev]);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'foodLogs', newLog.id), newLog);
      
      setImage(null); setTextInput(''); setPredictions(null);
      setActiveTab('dashboard');
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-pink-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex justify-center items-center gap-2"><span>📸</span> AI สแกนอาหาร & แคลอรี่</h2>
        </div>

        {showKeySettings && (
          <div className="bg-yellow-50 p-4 rounded-2xl mb-6 border border-yellow-200">
            <div className="flex justify-between items-center mb-2">
               <h3 className="font-bold text-yellow-800 text-sm">🔑 ตั้งค่า Gemini API Key</h3>
               {geminiKey && <button onClick={() => setShowKeySettings(false)} className="text-xs text-yellow-600 underline">ปิด</button>}
            </div>
            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full p-3 rounded-xl border border-yellow-300 mb-2 text-sm" />
            <button onClick={() => saveGeminiKey(geminiKey)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-lg">บันทึก</button>
          </div>
        )}

        {!showKeySettings && (
           <div className="text-right mb-2">
             <button onClick={() => setShowKeySettings(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">⚙️ ตั้งค่า API</button>
           </div>
        )}

        {!image && !predictions && !isScanning && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-pink-300 border-dashed rounded-3xl cursor-pointer bg-pink-50 hover:bg-pink-100 transition-colors">
              <span className="text-4xl mb-3">📸</span>
              <p className="text-sm text-pink-600 font-bold">อัปโหลดภาพอาหาร หรือ ถ่ายรูป</p>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            
            <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">หรือ พิมพ์ชื่อ</span>
                <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
                <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="เช่น ข้าวกะเพรา, ชาเขียว" className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-pink-400 focus:bg-white transition" onKeyDown={e => e.key === 'Enter' && runCustomAI('text')} />
                <button onClick={() => runCustomAI('text')} className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-sm transition whitespace-nowrap">ค้นหา 🔍</button>
            </div>
          </div>
        )}

        {image && !predictions && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative rounded-3xl overflow-hidden shadow-md bg-black">
              <img src={image} className="w-full h-64 object-cover opacity-90" alt="Food" />
              {isScanning && <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center"><span className="text-white px-4 py-2 rounded-full text-sm font-bold bg-black/50 animate-pulse">✨ AI กำลังวิเคราะห์...</span></div>}
              {!isScanning && <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm hover:bg-red-50 hover:text-red-500">✕ ยกเลิกภาพ</button>}
            </div>
            {!isScanning && (
              <button onClick={() => runCustomAI('image')} className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02]">✨ ให้ AI วิเคราะห์โภชนาการ</button>
            )}
          </div>
        )}

        {!image && !predictions && isScanning && (
          <div className="bg-pink-50 p-10 rounded-3xl border border-pink-100 flex flex-col items-center justify-center animate-pulse mt-4">
            <span className="text-4xl mb-4 block">🤖</span>
            <p className="text-pink-600 font-bold">AI กำลังค้นหาข้อมูล...</p>
          </div>
        )}

        {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-200 mt-4">{errorMsg}</div>}

        {predictions && (
          <div className="space-y-4 animate-fade-in mt-4">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-bold text-gray-800">ผลการวิเคราะห์</h3>
               <button onClick={() => {setImage(null); setPredictions(null); setTextInput('');}} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold shadow-sm">← สแกนใหม่</button>
            </div>

            <div className="bg-blue-50 p-5 rounded-3xl shadow-sm border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-3 text-sm">💡 AI ประเมินว่าอาจจะเป็น:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
                  {predictions.map((p, idx) => (
                    <button key={idx} onClick={() => { setResult(p); setEditForm({...p}); setBaseNutrition({...p}); setActivePortion(1); }} className={`p-3 rounded-2xl text-left border-2 transition-all ${result?.name === p.name ? 'border-pink-400 bg-pink-500 text-white shadow-md' : 'border-transparent bg-white text-gray-700 hover:border-pink-200'}`}>
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className={`text-[10px] mt-1 ${result?.name === p.name ? 'text-pink-100' : 'text-gray-500'}`}>{p.calories} kcal • โปรตีน {p.protein}g</div>
                    </button>
                  ))}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <label className="text-xs font-bold text-gray-700 block mb-1">ชื่ออาหาร</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mb-4 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none" />

                  <div className="mb-4">
                    <label className="text-xs font-bold text-blue-800 block mb-2">🍽️ ปริมาณที่ทาน (Portion)</label>
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => adjustPortion(1)} className={`px-3 py-1.5 font-semibold text-xs rounded-xl transition ${activePortion === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>100%</button>
                       <button onClick={() => adjustPortion(0.5)} className={`px-3 py-1.5 font-semibold text-xs rounded-xl transition ${activePortion === 0.5 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>ครึ่งเดียว 50%</button>
                       <button onClick={() => adjustPortion(0.25)} className={`px-3 py-1.5 font-semibold text-xs rounded-xl transition ${activePortion === 0.25 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>ชิมนิดหน่อย 25%</button>
                       <button onClick={() => adjustPortion(2)} className={`px-3 py-1.5 font-semibold text-xs rounded-xl transition ${activePortion === 2 ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>เบิ้ล 2 จาน</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">แคลอรี่</label>
                      <input type="number" value={editForm.calories} onChange={e => handleManualEdit('calories', e.target.value)} className="w-full bg-transparent font-bold text-pink-600 text-lg outline-none" />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <label className="text-[10px] font-bold text-blue-500 uppercase">โปรตีน (g)</label>
                      <input type="number" value={editForm.protein} onChange={e => handleManualEdit('protein', e.target.value)} className="w-full bg-transparent font-bold text-blue-700 text-lg outline-none" />
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                      <label className="text-[10px] font-bold text-yellow-600 uppercase">คาร์บ (g)</label>
                      <input type="number" value={editForm.carbs} onChange={e => handleManualEdit('carbs', e.target.value)} className="w-full bg-transparent font-bold text-yellow-700 text-lg outline-none" />
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <label className="text-[10px] font-bold text-red-500 uppercase">ไขมัน (g)</label>
                      <input type="number" value={editForm.fat} onChange={e => handleManualEdit('fat', e.target.value)} className="w-full bg-transparent font-bold text-red-700 text-lg outline-none" />
                    </div>
                  </div>

                  <label className="text-xs font-bold text-gray-700 block mb-2">มื้ออาหาร</label>
                  <div className="flex gap-2 mb-6">
                    {[{id:'breakfast',l:'เช้า'}, {id:'lunch',l:'เที่ยง'}, {id:'dinner',l:'เย็น'}, {id:'snack',l:'ว่าง'}].map(m => (
                      <button key={m.id} onClick={() => setMealType(m.id)} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${mealType === m.id ? 'bg-pink-500 border-pink-500 text-white shadow-sm' : 'bg-white text-gray-500 border-gray-200'}`}>
                        {m.l}
                      </button>
                    ))}
                  </div>

                  <button onClick={saveFoodLog} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl shadow-md transition-transform transform hover:scale-[1.02]">💾 บันทึกลงไดอารี่</button>
                </div>
              </div>
            </div>
        )}
      </div>
    );
  };

  const MeasurementTracker = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const [form, setForm] = useState({ weight: '', chest: '', waist: '', arm: '', leg: '', neck: '' });
    const [msg, setMsg] = useState('');
    
    const userMeasurements = measurements.filter(m => m.userId === uid);
    
    const handleSave = () => {
       if(!form.weight) {
           setMsg("กรุณากรอกน้ำหนักอย่างน้อย 1 อย่าง");
           setTimeout(() => setMsg(''), 3000);
           return;
       }
       
       const newRecord = {
         id: generateId(),
         userId: uid,
         date: getEffectiveDateString(),
         timestamp: new Date().toISOString(),
         weight: Number(form.weight) || 0,
         chest: Number(form.chest) || 0,
         waist: Number(form.waist) || 0,
         arm: Number(form.arm) || 0,
         leg: Number(form.leg) || 0,
         neck: Number(form.neck) || 0
       };

       const currentProfile = tdeeData[uid]?.profile || { weight: 60, height: 170, age: 30, gender: 'male', activityLevel: '1.2' };
       const currentTarget = tdeeData[uid]?.targetCalories || 2000;

       if(isLocal) {
         setMeasurements(prev => [newRecord, ...prev]);
         setTdeeData(prev => ({ ...prev, [uid]: { targetCalories: currentTarget, profile: { ...currentProfile, weight: Number(form.weight) } } }));
       } else {
         setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'measurements', newRecord.id), newRecord);
         setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', uid), { targetCalories: currentTarget, profile: { ...currentProfile, weight: Number(form.weight) } }, { merge: true });
       }
       setForm({ weight: '', chest: '', waist: '', arm: '', leg: '', neck: '' });
       setMsg("บันทึกสัดส่วนสำเร็จ!");
       setTimeout(() => setMsg(''), 3000);
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 block">📏</span>
            <h2 className="text-2xl font-bold text-gray-800">บันทึกสัดส่วนร่างกาย</h2>
            {msg && <span className="text-xs font-bold text-white bg-purple-500 px-3 py-1 rounded-full shadow-sm">{msg}</span>}
          </div>

          {!isReadOnly && (
            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {['weight', 'chest', 'waist', 'arm', 'leg', 'neck'].map((field) => (
                   <div key={field}>
                     <label className="text-xs font-bold text-purple-800 block mb-1">{field === 'weight' ? 'น้ำหนัก (กก.) *' : `รอบ${field==='chest'?'อก':field==='waist'?'เอว':field==='arm'?'แขน':field==='leg'?'ขา':'คอ'} (ซม.)`}</label>
                     <input type="number" step="0.1" value={form[field]} onChange={e=>setForm({...form, [field]: e.target.value})} className="w-full p-3 rounded-xl border border-purple-200 outline-none focus:border-purple-400 font-bold text-purple-900" placeholder="0.0" />
                   </div>
                ))}
              </div>
              <button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition">บันทึกสัดส่วนวันนี้</button>
            </div>
          )}

          <h3 className="font-bold text-gray-800 mb-4">ประวัติการบันทึก</h3>
          <div className="space-y-4">
              {userMeasurements.map((m) => (
                <div key={m.id} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl relative">
                  <div className="flex justify-between items-center mb-3">
                     <p className="font-bold text-gray-800 text-sm bg-purple-50 px-3 py-1 rounded-full text-purple-800">{formatDate(m.timestamp)}</p>
                     {!isReadOnly && <button onClick={() => { if(isLocal) setMeasurements(prev => prev.filter(x => x.id !== m.id)); else deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'measurements', m.id)); }} className="text-xs text-red-400 hover:text-red-600">ลบข้อมูล</button>}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center bg-gray-50 p-3 rounded-xl">
                     {[{l:'น้ำหนัก',v:m.weight,u:'กก.'}, {l:'รอบอก',v:m.chest,u:'ซม.'}, {l:'รอบเอว',v:m.waist,u:'ซม.'}, {l:'รอบแขน',v:m.arm,u:'ซม.'}, {l:'รอบขา',v:m.leg,u:'ซม.'}, {l:'รอบคอ',v:m.neck,u:'ซม.'}].map((item, i) => (
                       <div key={i} className="bg-white p-2 rounded-lg shadow-sm">
                         <p className="text-[10px] font-bold text-gray-500 uppercase">{item.l}</p>
                         <p className="font-bold text-purple-600 text-sm">{item.v || '-'} <span className="text-[10px] font-normal text-gray-400">{item.u}</span></p>
                       </div>
                     ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const ExerciseTracker = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const userWeight = tdeeData[uid]?.profile?.weight || 60; 
    const [form, setForm] = useState({ activity: 'run', minutes: 30 });

    const activities = [
      { id: 'walk', name: 'เดิน (ชิลๆ)', met: 3.5, icon: '🚶' },
      { id: 'run', name: 'วิ่ง', met: 8.0, icon: '🏃' },
      { id: 'cycle', name: 'ปั่นจักรยาน', met: 6.0, icon: '🚴' },
      { id: 'swim', name: 'ว่ายน้ำ', met: 7.0, icon: '🏊' },
      { id: 'weight', name: 'เวท', met: 3.5, icon: '🏋️' },
      { id: 'yoga', name: 'โยคะ', met: 3.0, icon: '🧘' },
      { id: 'aerobic', name: 'แอโรบิค', met: 6.5, icon: '💃' },
    ];

    const currentActivity = activities.find(a => a.id === form.activity);
    const calculatedBurn = Math.round(currentActivity.met * userWeight * (form.minutes / 60));

    const saveExercise = () => {
      if(isReadOnly) return;
      const newLog = {
        id: generateId(), userId: uid, date: getEffectiveDateString(), timestamp: new Date().toISOString(),
        activityName: currentActivity.name, icon: currentActivity.icon, minutes: form.minutes, calories: calculatedBurn
      };
      if (isLocal) setExerciseLogs(prev => [newLog, ...prev]);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exerciseLogs', newLog.id), newLog);
      setActiveTab('dashboard');
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-green-100">
        <div className="text-center mb-6">
          <span className="text-4xl mb-2 block">🏃‍♀️</span>
          <h2 className="text-2xl font-bold text-gray-800">บันทึกการออกกำลังกาย</h2>
        </div>
        {!isReadOnly && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {activities.map(act => (
                <button key={act.id} onClick={() => setForm({...form, activity: act.id})} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition ${form.activity === act.id ? 'bg-green-50 border-green-400 text-green-800 shadow-sm' : 'bg-white border-gray-100 text-gray-500'}`}>
                  <span className="text-2xl">{act.icon}</span><span className="text-[10px] font-bold">{act.name}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">เวลา (นาที)</label>
              <input type="number" value={form.minutes} onChange={e => setForm({...form, minutes: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-green-200 outline-none text-2xl font-bold text-center bg-green-50 text-green-800" />
            </div>
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white p-5 rounded-3xl text-center shadow-md">
              <p className="text-sm font-bold opacity-90 mb-1">🔥 เผาผลาญไป</p>
              <p className="text-5xl font-extrabold">{calculatedBurn} <span className="text-lg font-normal">kcal</span></p>
            </div>
            <button onClick={saveExercise} className="w-full bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-md hover:bg-black transition">บันทึกกิจกรรม</button>
          </div>
        )}
      </div>
    );
  };

  const Dashboard = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const todayDate = getEffectiveDateString(); // ใช้วันที่ที่อิงเวลา 04:00 น.
    
    const todayFood = foodLogs.filter(log => log.userId === uid && log.date === todayDate);
    const todayEx = exerciseLogs.filter(log => log.userId === uid && log.date === todayDate);
    const uTdee = tdeeData[uid] || { targetCalories: 2000, profile: { weight: 60 } };
    const myCoachNote = coachNotes[uid];
    
    const consumed = Math.round(todayFood.reduce((acc, curr) => acc + (Number(curr.calories)||0), 0));
    const burned = Math.round(todayEx.reduce((acc, curr) => acc + (Number(curr.calories)||0), 0));
    
    const dailyBudget = uTdee.targetCalories + burned;
    const remaining = dailyBudget - consumed;
    const percent = Math.min((consumed / dailyBudget) * 100, 100);

    // Leaderboard (ยึดตามวันปัจจุบันเท่านั้น และปัดเศษทศนิยมทิ้ง)
    const topRankings = users
      .filter(u => u.role === 'user')
      .map(u => {
        const uFoods = foodLogs.filter(log => log.userId === u.id && log.date === todayDate);
        const protein = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.protein) || 0), 0));
        const calories = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.calories) || 0), 0));
        const carbs = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.carbs) || 0), 0));
        const fat = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.fat) || 0), 0));
        return { ...u, protein, calories, carbs, fat };
      })
      .sort((a,b) => b.protein - a.protein)
      .slice(0, 3);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {isReadOnly && <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl text-sm font-bold text-center flex justify-between items-center border border-blue-200">
          <span>👀 กำลังดูข้อมูลของ: {users.find(u=>u.id===uid)?.name || uid}</span>
          <button onClick={() => setViewingUserId(null)} className="underline bg-white px-3 py-1 rounded-lg">กลับ</button>
        </div>}

        {!isReadOnly && myCoachNote && (
           <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 shadow-sm flex gap-4 items-start">
              <div className="text-3xl">💬</div>
              <div><h4 className="text-blue-800 font-bold mb-1 text-sm">ข้อความแนะนำจากโค้ช</h4><p className="text-blue-900 text-sm leading-relaxed">{myCoachNote}</p></div>
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <h3 className="text-gray-500 font-bold mb-4">แคลอรี่คงเหลือวันนี้</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={`${consumed > dailyBudget ? 'text-red-400' : 'text-blue-500'}`} strokeDasharray={`${percent}, 100`} strokeWidth="3.5" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-4xl font-extrabold ${consumed > dailyBudget ? 'text-red-500' : 'text-gray-800'}`}>{Math.abs(remaining)}</span>
                <span className="text-xs font-bold text-gray-400 mt-1">{remaining < 0 ? 'kcal เกินโควต้า' : 'kcal ทานได้อีก'}</span>
              </div>
            </div>
            
            <div className="w-full flex justify-between px-2 text-center text-xs mt-6 bg-slate-50 p-3 rounded-2xl border border-gray-100 items-center">
              <div className="flex-1"><p className="text-gray-400 mb-1 font-bold text-[10px]">เป้าหมาย</p><p className="font-bold text-gray-700 text-sm">{uTdee.targetCalories}</p></div>
              <div className="text-gray-300 font-extrabold">+</div>
              <div className="flex-1"><p className="text-gray-400 mb-1 font-bold text-[10px]">เบิร์น</p><p className="font-bold text-green-500 text-sm">{burned}</p></div>
              <div className="text-gray-300 font-extrabold">-</div>
              <div className="flex-1"><p className="text-gray-400 mb-1 font-bold text-[10px]">ทานแล้ว</p><p className="font-bold text-pink-500 text-sm">{consumed}</p></div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-3xl shadow-sm border border-yellow-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2"><span>🏆</span> Top 3 สายโปรตีนวันนี้</h3>
                {!isReadOnly && <button onClick={() => setActiveTab('rank')} className="text-xs bg-white px-3 py-1 rounded-lg text-yellow-600 font-bold">ดูทั้งหมด</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topRankings.map((u, idx) => (
                  <div key={u.id} className="bg-white/90 p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-yellow-200/50">
                    <div className="text-2xl drop-shadow-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                    <div className="overflow-hidden flex-1">
                      <p className="font-bold text-sm text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-blue-600 font-extrabold">🥩 {u.protein}g</p>
                      <p className="text-[10px] text-gray-400 font-bold truncate">🔥 {u.calories} kcal</p>
                    </div>
                  </div>
                ))}
                {topRankings.length === 0 && <p className="text-sm font-bold text-yellow-600/50 col-span-3 text-center py-2">ยังไม่มีข้อมูล</p>}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><span>🍽️</span> อาหารที่ทานวันนี้</h3>
              {todayFood.length === 0 ? <div className="text-center text-sm font-bold text-gray-300 py-6 bg-gray-50 rounded-2xl border border-dashed">ยังไม่ได้บันทึกอาหาร</div> : (
                <div className="space-y-3">
                  {todayFood.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-gray-100 hover:border-pink-200 transition">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{log.name}</p>
                        <p className="text-xs text-pink-500 font-bold mt-1">P:{Math.round(log.protein)}g C:{Math.round(log.carbs)}g F:{Math.round(log.fat)}g</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-pink-600 text-lg">{Math.round(log.calories)} <span className="text-[10px] font-normal">kcal</span></p>
                        {!isReadOnly && <button onClick={() => {if(isLocal) setFoodLogs(p=>p.filter(x=>x.id!==log.id)); else deleteDoc(doc(db,'artifacts',appId,'public','data','foodLogs',log.id))}} className="text-[10px] text-gray-400 hover:text-red-500 font-bold mt-1 bg-white px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">ลบ</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><span>🏃‍♀️</span> กิจกรรมวันนี้</h3>
              {todayEx.length === 0 ? <div className="text-center text-sm font-bold text-gray-300 py-6 bg-gray-50 rounded-2xl border border-dashed">ยังไม่มีกิจกรรม</div> : (
                <div className="space-y-3">
                  {todayEx.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100 hover:border-green-300 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl bg-white p-2 rounded-xl shadow-sm">{log.icon}</span>
                        <div>
                          <p className="font-bold text-sm text-green-900">{log.activityName}</p>
                          <p className="text-xs font-bold text-green-600/70 mt-1">{log.minutes} นาที</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-green-600 text-lg">🔥 {log.calories} <span className="text-[10px] font-normal">kcal</span></p>
                        {!isReadOnly && <button onClick={() => {if(isLocal) setExerciseLogs(p=>p.filter(x=>x.id!==log.id)); else deleteDoc(doc(db,'artifacts',appId,'public','data','exerciseLogs',log.id))}} className="text-[10px] text-gray-400 hover:text-red-500 font-bold mt-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-green-100">ลบ</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TDEECalculator = () => {
    const uid = currentUser.id;
    const uTdee = tdeeData[uid] || { targetCalories: 2000, profile: {} };
    
    const [form, setForm] = useState({ 
      gender: uTdee.profile?.gender || 'male', age: uTdee.profile?.age || 30,
      height: uTdee.profile?.height || 170, weight: uTdee.profile?.weight || 60,
      activityLevel: uTdee.profile?.activityLevel || '1.2' 
    });
    
    const [calculatedTdee, setCalculatedTdee] = useState(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
       if (uTdee && uTdee.profile && Object.keys(uTdee.profile).length > 0) {
           setForm(prev => ({...prev, ...uTdee.profile}));
       }
    }, [uTdee?.profile]);

    const activityLevels = [
      { value: '1.2', label: 'ไม่ออกกำลังกาย' }, { value: '1.375', label: 'เล็กน้อย (1-3 วัน/สัปดาห์)' },
      { value: '1.55', label: 'ปานกลาง (3-5 วัน/สัปดาห์)' }, { value: '1.725', label: 'หนัก (6-7 วัน/สัปดาห์)' },
      { value: '1.9', label: 'หนักมาก (ทุกวัน)' }
    ];

    const calculateTDEE = () => {
      let bmr = form.gender === 'male' ? 
        (10 * form.weight) + (6.25 * form.height) - (5 * form.age) + 5 :
        (10 * form.weight) + (6.25 * form.height) - (5 * form.age) - 161;
      
      const tdee = Math.round(bmr * parseFloat(form.activityLevel));
      setCalculatedTdee(tdee);

      const dataToSave = { targetCalories: uTdee.targetCalories || 2000, profile: { ...form } };
      if(isLocal) setTdeeData(p => ({...p, [uid]: dataToSave}));
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', uid), dataToSave, {merge: true});
    };
    
    useEffect(() => { if(form.weight) calculateTDEE(); }, []);

    const handleSaveGoal = (targetCal) => {
      const data = { targetCalories: targetCal, profile: { ...form } };
      if(isLocal) setTdeeData(p => ({...p, [uid]: data}));
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', uid), data, {merge: true});
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    };

    const getGoalOptions = (baseTdee) => [
        { label: 'ลด 1 กก./สัปดาห์', rate: '-1000 kcal', cal: baseTdee - 1000, color: 'bg-red-100 text-red-800' },
        { label: 'ลด 0.5 กก./สัปดาห์', rate: '-500 kcal', cal: baseTdee - 500, color: 'bg-orange-100 text-orange-800' },
        { label: 'รักษาน้ำหนัก', rate: 'คงที่', cal: baseTdee, color: 'bg-green-100 text-green-800' },
        { label: 'เพิ่ม 0.5 กก./สัปดาห์', rate: '+500 kcal', cal: baseTdee + 500, color: 'bg-blue-100 text-blue-800' }
    ];

    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                 <h2 className="text-xl font-bold text-gray-800 mb-6">ตั้งค่าข้อมูลส่วนตัว</h2>
                 <div className="space-y-4">
                    <div className="flex gap-4">
                        <button onClick={() => setForm({...form, gender: 'male'})} className={`flex-1 py-3 rounded-xl border-2 font-bold ${form.gender === 'male' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>♂️ ชาย</button>
                        <button onClick={() => setForm({...form, gender: 'female'})} className={`flex-1 py-3 rounded-xl border-2 font-bold ${form.gender === 'female' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>♀️ หญิง</button>
                    </div>
                    <input type="number" value={form.age} onChange={e=>setForm({...form, age: Number(e.target.value)})} placeholder="อายุ" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold" />
                    <div className="flex gap-4">
                        <input type="number" value={form.height} onChange={e=>setForm({...form, height: Number(e.target.value)})} placeholder="ส่วนสูง" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold" />
                        <input type="number" value={form.weight} onChange={e=>setForm({...form, weight: Number(e.target.value)})} placeholder="น้ำหนัก" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold" />
                    </div>
                    <select value={form.activityLevel} onChange={e=>setForm({...form, activityLevel: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold text-gray-700">
                        {activityLevels.map(lvl => <option key={lvl.value} value={lvl.value}>{lvl.label}</option>)}
                    </select>
                    <button onClick={calculateTDEE} className="w-full bg-green-700 text-white font-bold py-4 rounded-xl shadow-md">คำนวณ TDEE</button>
                 </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                 <h3 className="font-bold text-green-800 mb-2">TDEE ของคุณ</h3>
                 <div className="text-4xl font-extrabold text-gray-800 mb-6">{calculatedTdee || '-'} <span className="text-sm text-gray-500 font-medium">kcal/วัน</span></div>
                 
                 {calculatedTdee && (
                    <div className="space-y-2">
                        {getGoalOptions(calculatedTdee).map((opt, idx) => (
                            <button key={idx} onClick={() => handleSaveGoal(opt.cal)} className={`w-full text-left flex justify-between items-center p-3 rounded-2xl border ${uTdee.targetCalories === opt.cal ? 'border-green-500 bg-white shadow-md ring-2 ring-green-100' : 'border-gray-200 hover:bg-white'}`}>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${opt.color}`}>{opt.label}</span>
                                <span className="font-extrabold text-gray-800">{opt.cal.toLocaleString()} kcal</span>
                            </button>
                        ))}
                    </div>
                 )}
                 {saved && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-xl text-center font-bold text-sm">✅ บันทึกเป้าหมายแล้ว</div>}
             </div>
      </div>
    );
  };

  const RankingBoard = () => {
    const todayDate = getEffectiveDateString(); // ฟิลเตอร์เฉพาะข้อมูลของวันนี้

    const rankedUsers = users.filter(u => u.role === 'user').map(u => {
      const uFoods = foodLogs.filter(log => log.userId === u.id && log.date === todayDate);
      // ใช้ Math.round เพื่อตัดทศนิยมออกให้ตัวเลขสวยงาม
      const protein = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.protein) || 0), 0));
      const calories = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.calories) || 0), 0));
      const carbs = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.carbs) || 0), 0));
      const fat = Math.round(uFoods.reduce((sum, log) => sum + (Number(log.fat) || 0), 0));
      return { ...u, protein, calories, carbs, fat };
    }).sort((a,b) => b.protein - a.protein);

    return (
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-yellow-100">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3 drop-shadow-md">🏆</span>
          <h2 className="text-2xl font-bold text-gray-800">กระดานผู้นำสายโปรตีนประจำวัน</h2>
          <p className="text-sm text-gray-500 mt-1">รีเซ็ตข้อมูลใหม่ทุกวันเวลา 04:00 น.</p>
        </div>
        <div className="space-y-4">
          {rankedUsers.map((u, i) => (
            <div key={u.id} className={`flex flex-col sm:flex-row items-start sm:items-center p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.01] gap-3 ${i===0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-2 border-yellow-300' : i===1 ? 'bg-slate-50 border-2 border-gray-200' : i===2 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-white border border-gray-100'}`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 font-bold text-2xl text-center flex-shrink-0">{i===0?'🥇':i===1?'🥈':i===2?'🥉':<span className="text-gray-400 text-lg">{i+1}</span>}</div>
                <div className="font-bold text-gray-800 text-lg flex-1 sm:w-36 truncate">{u.name}</div>
              </div>
              
              <div className="flex-1 w-full flex flex-wrap sm:flex-nowrap justify-between items-center bg-white/80 p-3 rounded-xl border border-gray-100/80 gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">โปรตีนวันนี้</span>
                  <span className="font-extrabold text-blue-600 text-xl flex items-center gap-1">🥩 {u.protein} <span className="text-xs font-bold text-blue-400">g</span></span>
                </div>
                
                <div className="flex gap-3 text-right">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">แคลอรี่</p>
                    <p className="font-bold text-pink-500 text-xs">{u.calories} <span className="text-[9px]">kcal</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">คาร์บ</p>
                    <p className="font-bold text-yellow-600 text-xs">{u.carbs} <span className="text-[9px]">g</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">ไขมัน</p>
                    <p className="font-bold text-red-500 text-xs">{u.fat} <span className="text-[9px]">g</span></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {rankedUsers.length === 0 && <p className="text-center font-bold text-gray-300 py-6">ยังไม่มีข้อมูลในวันนี้</p>}
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const [newAccount, setNewAccount] = useState({ name: '', password: '', role: 'user' });
    const [editingUser, setEditingUser] = useState(null);
    const [noteInput, setNoteInput] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    const handleCreateAccount = (e) => {
      e.preventDefault();
      const id = 'u' + Date.now();
      const acc = { id, ...newAccount };
      const defaultProfile = { weight: 60, height: 170, age: 30, gender: 'female', activityLevel: '1.2' };
      
      if (isLocal) {
          setUsers(prev => [...prev, acc]);
          if(newAccount.role === 'user') setTdeeData(prev => ({...prev, [id]: { targetCalories: 2000, profile: defaultProfile }}));
      } else {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), acc);
          if(newAccount.role === 'user') setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', id), { targetCalories: 2000, profile: defaultProfile });
      }
      setNewAccount({ name: '', password: '', role: 'user' });
    };

    const handleUpdateAccount = (e) => {
      e.preventDefault();
      if (isLocal) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      } else {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser.id), editingUser, { merge: true });
      }
      setEditingUser(null);
    };

    const saveCoachNote = () => {
       if(isLocal) setCoachNotes(prev => ({...prev, [viewingUserId]: noteInput}));
       else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coachNotes', viewingUserId), {text: noteInput});
       setSaveStatus('ส่งคำแนะนำสำเร็จ!');
       setTimeout(() => setSaveStatus(''), 3000);
    };

    if (viewingUserId) {
       const vUser = users.find(u => u.id === viewingUserId);
       return (
         <div className="space-y-6 max-w-4xl mx-auto">
           <div className="flex justify-between items-center bg-blue-50 p-4 rounded-3xl border border-blue-200 shadow-sm">
             <div className="pl-2">
               <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">โหมดตรวจสอบและให้คำแนะนำ</p>
               <h2 className="text-2xl font-bold text-blue-900">{vUser?.name}</h2>
             </div>
             <button onClick={() => setViewingUserId(null)} className="bg-white text-blue-700 px-4 py-3 rounded-2xl font-bold shadow-sm hover:bg-blue-100 transition border border-blue-100">← กลับ</button>
           </div>
           
           <div className="bg-white p-5 rounded-3xl shadow-sm border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><span>💬</span> ฝากข้อความถึง {vUser?.name}</h3>
              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="พิมพ์คำแนะนำ โภชนาการ หรือการออกกำลังกายที่นี่..." className="w-full p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 outline-none focus:bg-white focus:border-indigo-400 h-24 text-sm"></textarea>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={saveCoachNote} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl shadow-sm transition">ส่งคำแนะนำ</button>
                {saveStatus && <span className="text-sm font-bold text-green-600">{saveStatus}</span>}
              </div>
           </div>
           <Dashboard targetUserId={viewingUserId} />
           <MeasurementTracker targetUserId={viewingUserId} />
         </div>
       )
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2rem] text-white shadow-lg flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-extrabold mb-2">ยินดีต้อนรับ, {currentUser.name}</h1>
             <p className="opacity-90 text-sm font-medium">จัดการบัญชีผู้ใช้งาน และตรวจสอบข้อมูลสมาชิก</p>
           </div>
           <div className="text-6xl opacity-80 hidden md:block">🛡️</div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
           <form onSubmit={handleCreateAccount} className="flex gap-3 mb-8 flex-wrap bg-slate-50 p-5 rounded-2xl border border-gray-100">
             <input placeholder="ชื่อผู้ใช้" required value={newAccount.name} onChange={e=>setNewAccount({...newAccount, name: e.target.value})} className="flex-1 min-w-[150px] p-3 border rounded-xl font-bold" />
             <input placeholder="รหัสผ่าน" required value={newAccount.password} onChange={e=>setNewAccount({...newAccount, password: e.target.value})} className="w-[120px] p-3 border rounded-xl font-bold" />
             <select value={newAccount.role} onChange={e=>setNewAccount({...newAccount, role: e.target.value})} className="w-[100px] p-3 border rounded-xl font-bold bg-white">
                 <option value="user">สมาชิก</option><option value="coach">โค้ช</option>{currentUser.role === 'admin' && <option value="admin">แอดมิน</option>}
             </select>
             <button type="submit" className="bg-blue-600 text-white px-6 rounded-xl font-bold">สร้าง</button>
           </form>

           {}
           <div className="space-y-3">
             {users.filter(u => u.id !== currentUser.id).map(u => (
               <div key={u.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl flex-wrap gap-2">
                 <div>
                     <p className="font-bold">{u.name}</p>
                     <p className="text-[10px] text-gray-500">{u.role}</p>
                 </div>
                 <div className="flex gap-2">
                   {u.role === 'user' && <button onClick={() => { setViewingUserId(u.id); setNoteInput(coachNotes[u.id] || ''); }} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold shadow-sm">ดูข้อมูล</button>}
                   <button onClick={() => setEditingUser(u)} className="text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-xl font-bold shadow-sm">แก้ไข</button>
                   <button onClick={() => { if(isLocal) setUsers(prev => prev.filter(x => x.id !== u.id)); else deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id)); }} className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl font-bold shadow-sm">ลบ</button>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {}
        {editingUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-xl animate-fade-in">
              <h3 className="text-xl font-bold mb-4 text-gray-800">แก้ไขผู้ใช้งาน</h3>
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">ชื่อผู้ใช้</label>
                  <input value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:border-blue-400 font-medium" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">รหัสผ่าน</label>
                  <input value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:border-blue-400 font-medium" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">สิทธิ์การใช้งาน</label>
                  <select value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-white font-medium outline-none focus:border-blue-400">
                    <option value="user">สมาชิก (User)</option>
                    <option value="coach">โค้ช (Coach)</option>
                    {currentUser.role === 'admin' && <option value="admin">ผู้ดูแลระบบ (Admin)</option>}
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-sm transition">บันทึก</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition">ยกเลิก</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      {currentUser.role === 'coach' || currentUser.role === 'admin' ? <AdminDashboard /> : (
        <div className="pb-10">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'ai' && <AIFoodScanner />}
          {activeTab === 'exercise' && <ExerciseTracker />}
          {activeTab === 'measure' && <MeasurementTracker />}
          {activeTab === 'tdee' && <TDEECalculator />}
          {activeTab === 'rank' && <RankingBoard />}
        </div>
      )}
    </Layout>
  );
}
