import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

const generateId = () => Math.random().toString(36).substr(2, 9);
const getTodayString = () => new Date().toISOString().split('T')[0];

const INITIAL_USERS = [
  { id: 'u1', name: 'น้องพาสเทล', role: 'user', password: '123' },
  { id: 'u2', name: 'คุณสมชาย', role: 'user', password: '123' },
  { id: 'u3', name: 'พี่สมศรี', role: 'user', password: '123' },
  { id: 'admin1', name: 'Admin (ผู้ดูแลระบบ)', role: 'admin', password: 'admin' }
];

// --- Firebase Initialization ---
const appId = 'pastelfit-my-app'; 

// 🚨 นำ firebaseConfig ของคุณมาใส่ตรงนี้ 🚨
const firebaseConfig = {
  apiKey: "AIzaSyBQl9xUuXyZGpJAX8PyByImmRYQ9mH0L9Q",
  authDomain: "fitandferm.firebaseapp.com",
  projectId: "fitandferm",
  storageBucket: "fitandferm.firebasestorage.app",
  messagingSenderId: "443086319784",
  appId: "1:443086319784:web:7a02893627fc0df853929d"
};

const isLocalMode = firebaseConfig.apiKey.includes("รหัสของคุณ");

let app, db, auth;
if (!isLocalMode) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}
// -------------------------------

export default function PastelFitApp() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingUserId, setViewingUserId] = useState(null); 
  const [loginError, setLoginError] = useState(''); 

  // Global States (Firebase Sync)
  const [users, setUsers] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]); // ฟีเจอร์ใหม่: บันทึกออกกำลังกาย
  const [measurements, setMeasurements] = useState([]);
  const [tdeeData, setTdeeData] = useState({});
  const [coachNotes, setCoachNotes] = useState({});

  useEffect(() => {
    if (isLocalMode) {
      setFirebaseUser({ uid: 'local-mode' });
      return;
    }
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (error) { console.error("Firebase Auth Error:", error); }
    };
    initAuth();
    return onAuthStateChanged(auth, user => setFirebaseUser(user));
  }, []);

  useEffect(() => {
    if (isLocalMode) {
      setUsers(INITIAL_USERS);
      setTdeeData({
        'u1': { targetCalories: 1505, profile: { weight: 55 } },
        'u2': { targetCalories: 2279, profile: { weight: 80 } },
        'u3': { targetCalories: 1200, profile: { weight: 65 } }
      });
      return;
    }

    if (!firebaseUser) return;

    const refs = ['users', 'foodLogs', 'exerciseLogs', 'measurements', 'tdeeData', 'coachNotes'].map(
      col => collection(db, 'artifacts', appId, 'public', 'data', col)
    );

    const unsubUsers = onSnapshot(refs[0], (snap) => {
      if (snap.empty) {
        INITIAL_USERS.forEach(u => setDoc(doc(refs[0], u.id), u));
        setDoc(doc(refs[4], 'u1'), { targetCalories: 1505, profile: { weight: 55 } });
      } else {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, console.error);

    const unsubFood = onSnapshot(refs[1], (snap) => setFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))));
    const unsubEx = onSnapshot(refs[2], (snap) => setExerciseLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))));
    const unsubMeas = onSnapshot(refs[3], (snap) => setMeasurements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubTdee = onSnapshot(refs[4], (snap) => {
      const obj = {}; snap.docs.forEach(d => obj[d.id] = d.data()); setTdeeData(obj);
    });
    const unsubNotes = onSnapshot(refs[5], (snap) => {
      const obj = {}; snap.docs.forEach(d => obj[d.id] = d.data().text); setCoachNotes(obj);
    });

    return () => { unsubUsers(); unsubFood(); unsubEx(); unsubMeas(); unsubTdee(); unsubNotes(); };
  }, [firebaseUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.id === e.target.userId.value);
    if (user && user.password === e.target.password.value) {
      setCurrentUser(user); setActiveTab('dashboard'); setLoginError('');
    } else {
      setLoginError(user ? 'รหัสผ่านไม่ถูกต้อง' : 'กรุณาเลือกบัญชีผู้ใช้งาน');
    }
  };

  if (!currentUser) {
    // [UI ล็อกอิน คงเดิม]
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 pb-20 font-sans">
        <div className="max-w-5xl mx-auto px-4 pt-20">
           <div className="mt-10 bg-white p-8 rounded-3xl shadow-xl max-w-md mx-auto text-center border border-pink-100">
             <div className="text-5xl mb-4">🌸</div>
             <h2 className="text-2xl font-bold text-gray-800 mb-2">PastelFit</h2>
             <p className="text-gray-500 mb-6">เข้าสู่ระบบเพื่อใช้งาน</p>
             {loginError && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-semibold border border-red-100">{loginError}</div>}
             <form onSubmit={handleLogin} className="space-y-4">
               <select name="userId" className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200">
                 <option value="">-- เลือกบัญชีผู้ใช้งาน --</option>
                 {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
               </select>
               <input type="password" name="password" placeholder="รหัสผ่าน (User=123, Admin=admin)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200" />
               <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl shadow-md">เข้าสู่ระบบ</button>
             </form>
           </div>
        </div>
      </div>
    );
  }

  const Layout = ({ children }) => (
    <div className="min-h-screen bg-slate-50 pt-16 pb-20 md:pb-0">
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">🌸 PastelFit</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm font-medium">{currentUser.name}</span>
            <button onClick={() => setCurrentUser(null)} className="text-sm text-pink-500 hover:text-pink-600 font-medium">ออก</button>
          </div>
        </div>
      </nav>
      
      {currentUser.role === 'user' && (
        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around py-3 z-50 px-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <NavBtn id="dashboard" icon="📊" label="สรุปวัน" />
          <NavBtn id="ai" icon="📸" label="สแกน" />
          <NavBtn id="exercise" icon="🏃" label="ออกกำลัง" />
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
              <SideNavBtn id="tdee" icon="⚙️" label="เป้าหมาย TDEE" />
              <SideNavBtn id="measure" icon="📏" label="บันทึกสัดส่วน" />
              <SideNavBtn id="rank" icon="🏆" label="จัดอันดับ" />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden">{children}</main>
      </div>
    </div>
  );

  const NavBtn = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex flex-col items-center flex-1 ${activeTab === id ? 'text-pink-500' : 'text-gray-400'}`}>
      <span className="text-xl mb-1">{icon}</span><span className="text-[10px] font-medium">{label}</span>
    </button>
  );
  
  const SideNavBtn = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === id ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
      <span className="text-xl">{icon}</span><span>{label}</span>
    </button>
  );

  // -------------------------------------------------------------
  // ฟีเจอร์ใหม่: AIFoodScanner + ระบบสัดส่วน (Portion) + API Key Settings
  // -------------------------------------------------------------
  const AIFoodScanner = () => {
    const [image, setImage] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [result, setResult] = useState(null); // ข้อมูลตั้งต้นจาก AI
    const [editForm, setEditForm] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [mealType, setMealType] = useState('lunch');
    const [errorMsg, setErrorMsg] = useState('');
    
    // จัดการ Gemini API Key แบบปลอดภัย (เก็บในเครื่องผู้ใช้)
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('pastel_gemini_key') || '');
    const [showKeySettings, setShowKeySettings] = useState(!geminiKey);

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

    const runCustomAI = async () => {
      if (!geminiKey) { setShowKeySettings(true); return; }
      if (!image) return;
      setIsScanning(true); setErrorMsg('');
      
      try {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1] || "image/jpeg";
        const prompt = `Analyze this image of food or nutrition label. Respond ONLY with a JSON array of up to 3 objects: [{ "name": "Food in Thai", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "confidence": 95 }]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) throw new Error("API Key ไม่ถูกต้อง หรือโควต้า AI เต็ม");
        const data = await response.json();
        
        let preds = JSON.parse(data.candidates[0].content.parts[0].text);
        if (!Array.isArray(preds)) preds = [preds];

        setPredictions(preds); setResult(preds[0]); setEditForm(preds[0]);
      } catch (error) {
        setErrorMsg(error.message || "ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาตรวจสอบ API Key");
        setShowKeySettings(true);
      } finally {
        setIsScanning(false);
      }
    };

    // ฟังก์ชันช่วยคำนวณปริมาณอาหารใหม่
    const adjustPortion = (multiplier) => {
      if(!result) return;
      setEditForm({
        ...editForm,
        calories: Math.round(result.calories * multiplier),
        protein: Math.round(result.protein * multiplier),
        carbs: Math.round(result.carbs * multiplier),
        fat: Math.round(result.fat * multiplier)
      });
    };

    const saveFoodLog = () => {
      const newLog = {
        id: generateId(), userId: currentUser.id, date: getTodayString(), timestamp: new Date().toISOString(),
        meal: mealType, imageUrl: image, ...editForm
      };
      if (isLocalMode) setFoodLogs(prev => [newLog, ...prev]);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'foodLogs', newLog.id), newLog);
      setActiveTab('dashboard');
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-pink-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">AI สแกนอาหาร & แคลอรี่</h2>
        </div>

        {/* ระบบตั้งค่า API Key */}
        {showKeySettings && (
          <div className="bg-yellow-50 p-4 rounded-2xl mb-6 border border-yellow-200">
            <h3 className="font-bold text-yellow-800 text-sm mb-2">🔑 ตั้งค่า Gemini API Key (เพื่อใช้งานฟรีบนมือถือ/เว็บ)</h3>
            <p className="text-xs text-yellow-700 mb-3">เนื่องจากความปลอดภัย การใช้บน GitHub/Vercel จำเป็นต้องนำ API Key ของคุณมาใส่เอง (ข้อมูลเก็บไว้เฉพาะในเครื่องนี้เท่านั้น)</p>
            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full p-2 rounded-xl border border-yellow-300 mb-2 text-sm" />
            <button onClick={() => saveGeminiKey(geminiKey)} className="bg-yellow-500 text-white text-xs font-bold px-4 py-2 rounded-lg">บันทึก API Key</button>
          </div>
        )}

        {!image ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-pink-300 border-dashed rounded-3xl cursor-pointer bg-pink-50 hover:bg-pink-100">
            <span className="text-4xl mb-3">📸</span>
            <p className="text-sm text-pink-600 font-semibold">อัปโหลดภาพอาหาร หรือ ถ่ายรูป</p>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden shadow-md bg-black">
              <img src={image} className="w-full h-64 object-cover opacity-90" />
              {isScanning && <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center"><span className="text-white px-3 py-1 rounded-full text-sm bg-black/50">กำลังวิเคราะห์...</span></div>}
              {!isScanning && <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-white/80 p-2 rounded-full text-xs">✕ ลบ</button>}
            </div>

            {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-semibold">{errorMsg}</div>}

            {!predictions && !isScanning && (
              <button onClick={runCustomAI} className="w-full bg-gradient-to-r from-blue-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg">✨ ให้ AI คำนวณโภชนาการ</button>
            )}

            {predictions && (
              <div className="bg-blue-50 p-4 md:p-6 rounded-3xl shadow-sm border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-3">AI ประเมินว่าเป็นเมนูใด?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  {predictions.map((p, idx) => (
                    <button key={idx} onClick={() => { setResult(p); setEditForm({...p}); }} className={`p-3 rounded-xl text-left ${result?.name === p.name ? 'bg-pink-500 text-white' : 'bg-white text-gray-700'}`}>
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className="text-[10px]">{p.calories} kcal • โปรตีน {p.protein}g</div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-blue-200 pt-4">
                  <label className="text-xs font-semibold text-gray-700">ชื่ออาหาร / รายการ</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-blue-200 mt-1 mb-4" />

                  {/* ฟีเจอร์ใหม่: แบ่งปริมาณการทาน */}
                  <div className="mb-4 bg-white p-3 rounded-xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-800 block mb-2">🍽️ ปริมาณที่ทาน (Portion)</label>
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => adjustPortion(1)} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200">ทานหมด 100%</button>
                       <button onClick={() => adjustPortion(0.5)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">ครึ่งเดียว 50%</button>
                       <button onClick={() => adjustPortion(0.25)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">ชิมนิดหน่อย 25%</button>
                       <button onClick={() => adjustPortion(2)} className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs rounded-lg hover:bg-orange-200">เบิ้ล 2 จาน 200%</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">แคลอรี่ (kcal)</label>
                      <input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: Number(e.target.value)})} className="w-full p-2 rounded-xl border bg-white font-bold text-pink-600" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-pink-600">💪 โปรตีน (g)</label>
                      <input type="number" value={editForm.protein} onChange={e => setEditForm({...editForm, protein: Number(e.target.value)})} className="w-full p-2 rounded-xl border border-pink-300 bg-pink-50 font-bold" />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-blue-100">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
                      <button key={m} onClick={() => setMealType(m)} className={`flex-1 py-2 text-xs rounded-xl ${mealType === m ? 'bg-pink-400 text-white' : 'bg-white text-gray-600 border'}`}>
                        {m === 'breakfast' ? 'เช้า' : m === 'lunch' ? 'เที่ยง' : m === 'dinner' ? 'เย็น' : 'ว่าง'}
                      </button>
                    ))}
                  </div>

                  <button onClick={saveFoodLog} className="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl shadow-md">💾 บันทึกลงไดอารี่</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // ฟีเจอร์ใหม่: Exercise Tracker (บันทึกและคำนวณแคลอรี่อัตโนมัติ)
  // -------------------------------------------------------------
  const ExerciseTracker = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const userWeight = tdeeData[uid]?.profile?.weight || 60; // ดึงน้ำหนักมาใช้คำนวณ
    const [form, setForm] = useState({ activity: 'run', minutes: 30 });

    const activities = [
      { id: 'walk', name: 'เดิน (ชิลๆ)', met: 3.5, icon: '🚶' },
      { id: 'run', name: 'วิ่ง / จ็อกกิ้ง', met: 8.0, icon: '🏃' },
      { id: 'cycle', name: 'ปั่นจักรยาน', met: 6.0, icon: '🚴' },
      { id: 'swim', name: 'ว่ายน้ำ', met: 7.0, icon: '🏊' },
      { id: 'weight', name: 'เวทเทรนนิ่ง', met: 3.5, icon: '🏋️' },
      { id: 'yoga', name: 'โยคะ', met: 3.0, icon: '🧘' },
      { id: 'aerobic', name: 'เต้นแอโรบิค', met: 6.5, icon: '💃' },
    ];

    const currentActivity = activities.find(a => a.id === form.activity);
    // สูตรคำนวณแคลอรี่: (MET * น้ำหนัก kg * ชั่วโมง)
    const calculatedBurn = Math.round(currentActivity.met * userWeight * (form.minutes / 60));

    const saveExercise = () => {
      if(isReadOnly) return;
      const newLog = {
        id: generateId(), userId: uid, date: getTodayString(), timestamp: new Date().toISOString(),
        activityName: currentActivity.name, icon: currentActivity.icon, minutes: form.minutes, calories: calculatedBurn
      };
      if (isLocalMode) setExerciseLogs(prev => [newLog, ...prev]);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exerciseLogs', newLog.id), newLog);
      
      setActiveTab('dashboard');
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-green-100">
        <div className="text-center mb-6">
          <span className="text-4xl mb-2 block">🏃‍♀️</span>
          <h2 className="text-2xl font-bold text-gray-800">บันทึกการออกกำลังกาย</h2>
          <p className="text-sm text-gray-500">ระบบคำนวณแคลอรี่ให้อัตโนมัติตามน้ำหนักตัวของคุณ ({userWeight} กก.)</p>
        </div>

        {!isReadOnly && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">เลือกประเภทกีฬา</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {activities.map(act => (
                  <button key={act.id} onClick={() => setForm({...form, activity: act.id})} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${form.activity === act.id ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    <span className="text-2xl">{act.icon}</span>
                    <span className="text-xs font-semibold">{act.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">ระยะเวลา (นาที)</label>
              <input type="number" value={form.minutes} onChange={e => setForm({...form, minutes: Number(e.target.value)})} className="w-full p-3 rounded-xl border border-green-200 outline-none focus:ring-2 focus:ring-green-400 text-xl font-bold text-center bg-green-50 text-green-700" />
            </div>

            <div className="bg-green-500 text-white p-4 rounded-2xl text-center shadow-md">
              <p className="text-sm opacity-90 mb-1">🔥 คาดว่าเผาผลาญไป</p>
              <p className="text-4xl font-bold">{calculatedBurn} <span className="text-lg font-normal">kcal</span></p>
            </div>

            <button onClick={saveExercise} className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl shadow-md hover:bg-black">บันทึกกิจกรรม</button>
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // Dashboard อัปเดต: นำแคลอรี่ออกกำลังกายมาหักล้าง
  // -------------------------------------------------------------
  const Dashboard = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    
    const todayFood = foodLogs.filter(log => log.userId === uid && log.date === getTodayString());
    const todayEx = exerciseLogs.filter(log => log.userId === uid && log.date === getTodayString());
    const uTdee = tdeeData[uid] || { targetCalories: 2000, profile: { weight: 60 } };
    
    const consumed = todayFood.reduce((acc, curr) => acc + curr.calories, 0);
    const burned = todayEx.reduce((acc, curr) => acc + curr.calories, 0);
    
    // โควต้าแคลอรี่ที่ทานได้ = เป้าหมาย TDEE + แคลอรี่ที่เบิร์นออกไป
    const dailyBudget = uTdee.targetCalories + burned;
    const remaining = dailyBudget - consumed;
    const percent = Math.min((consumed / dailyBudget) * 100, 100);

    // คำนวณกระดานผู้นำ (Top 3 เผาผลาญสูงสุด) มาแสดงหน้าแรก
    const topRankings = users
      .filter(u => u.role === 'user')
      .map(u => {
        const uBurned = exerciseLogs.filter(log => log.userId === u.id).reduce((sum, log) => sum + log.calories, 0);
        return { ...u, burned: uBurned };
      })
      .sort((a,b) => b.burned - a.burned)
      .slice(0, 3);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {isReadOnly && <div className="bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-bold text-center flex justify-between items-center border border-blue-200">
          <span>👀 กำลังดูข้อมูลของ User: {users.find(u=>u.id===uid)?.name || uid}</span>
          <button onClick={() => setViewingUserId(null)} className="underline hover:text-blue-800">กลับหน้ารายชื่อ</button>
        </div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <h3 className="text-gray-500 font-medium mb-4">สรุปแคลอรี่คงเหลือ</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={`${consumed > dailyBudget ? 'text-red-400' : 'text-green-400'}`} strokeDasharray={`${percent}, 100`} strokeWidth="3" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-4xl font-bold ${consumed > dailyBudget ? 'text-red-500' : 'text-gray-800'}`}>{Math.abs(remaining)}</span>
                <span className="text-xs text-gray-500">{remaining < 0 ? 'kcal เกินโควต้า' : 'kcal ทานได้อีก'}</span>
              </div>
            </div>
            
            <div className="w-full grid grid-cols-3 gap-2 text-center text-xs mt-6 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div><p className="text-gray-400 mb-1">เป้าหมาย</p><p className="font-bold text-gray-700 text-sm">{uTdee.targetCalories}</p></div>
              <div><p className="text-gray-400 mb-1">ทานแล้ว</p><p className="font-bold text-pink-500 text-sm">{consumed}</p></div>
              <div><p className="text-gray-400 mb-1">ออกกำลัง</p><p className="font-bold text-green-500 text-sm">+{burned}</p></div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* สรุปจัดอันดับ (Mini Ranking) */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-3xl shadow-sm border border-yellow-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2"><span>🏆</span> Top 3 ผู้เผาผลาญสูงสุด</h3>
                {!isReadOnly && <button onClick={() => setActiveTab('rank')} className="text-xs text-yellow-600 font-bold hover:underline">ดูทั้งหมด</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topRankings.map((u, idx) => (
                  <div key={u.id} className="bg-white/80 p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-yellow-200/50">
                    <div className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-800 truncate max-w-[100px]">{u.name}</p>
                      <p className="text-xs text-orange-600 font-semibold">{u.burned} kcal</p>
                    </div>
                  </div>
                ))}
                {topRankings.length === 0 && <p className="text-sm text-gray-500 col-span-3 text-center">ยังไม่มีการจัดอันดับ</p>}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><span>🍽️</span> อาหารที่ทานวันนี้</h3>
              </div>
              {todayFood.length === 0 ? <div className="text-center text-sm text-gray-400 py-4">ยังไม่มีข้อมูล</div> : (
                <div className="space-y-3">
                  {todayFood.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{log.name}</p>
                        <p className="text-xs text-pink-500 font-semibold">P:{log.protein}g C:{log.carbs}g F:{log.fat}g</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-pink-600">{log.calories} <span className="text-[10px]">kcal</span></p>
                        {!isReadOnly && <button onClick={() => {if(isLocalMode) setFoodLogs(p=>p.filter(x=>x.id!==log.id)); else deleteDoc(doc(db,'artifacts',appId,'public','data','foodLogs',log.id))}} className="text-[10px] text-red-400 hover:underline mt-1">ลบ</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><span>🏃‍♀️</span> กิจกรรมวันนี้</h3>
              </div>
              {todayEx.length === 0 ? <div className="text-center text-sm text-gray-400 py-4">ยังไม่มีกิจกรรม ลองออกกำลังกายดูสิ!</div> : (
                <div className="space-y-3">
                  {todayEx.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{log.icon}</span>
                        <div>
                          <p className="font-bold text-sm text-green-800">{log.activityName}</p>
                          <p className="text-xs text-green-600">{log.minutes} นาที</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-green-600">🔥 {log.calories} <span className="text-[10px]">kcal</span></p>
                        {!isReadOnly && <button onClick={() => {if(isLocalMode) setExerciseLogs(p=>p.filter(x=>x.id!==log.id)); else deleteDoc(doc(db,'artifacts',appId,'public','data','exerciseLogs',log.id))}} className="text-[10px] text-red-400 hover:underline mt-1">ลบ</button>}
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

  // -------------------------------------------------------------
  // กู้คืนระบบตั้งค่าเป้าหมาย, จัดอันดับ และ โหมดแอดมิน (Admin Dashboard)
  // -------------------------------------------------------------
  const TDEECalculator = () => {
    const uid = currentUser.id;
    const uTdee = tdeeData[uid] || { targetCalories: 2000, profile: { weight: 60 } };
    const [form, setForm] = useState({ targetCalories: uTdee.targetCalories, weight: uTdee.profile?.weight || 60 });

    const handleSave = () => {
      const data = { targetCalories: form.targetCalories, profile: { weight: form.weight } };
      if(isLocalMode) setTdeeData(p => ({...p, [uid]: data}));
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', uid), data);
      alert('บันทึกเป้าหมายแล้ว! (ระบบจะใช้น้ำหนักใหม่คำนวณแคลอรี่เผาผลาญทันที)');
    };

    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
         <h2 className="text-xl font-bold mb-4 text-gray-800">⚙️ ตั้งค่าเป้าหมาย & น้ำหนัก</h2>
         <div className="space-y-4">
           <div><label className="text-xs font-bold text-gray-600 block mb-1">น้ำหนักปัจจุบัน (กก.) - ใช้คำนวณการเผาผลาญ</label>
           <input type="number" value={form.weight} onChange={e=>setForm({...form, weight: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
           <div><label className="text-xs font-bold text-gray-600 block mb-1">เป้าหมายแคลอรี่ (kcal/วัน)</label>
           <input type="number" value={form.targetCalories} onChange={e=>setForm({...form, targetCalories: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
           <button onClick={handleSave} className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition shadow-sm">💾 บันทึกการตั้งค่า</button>
         </div>
      </div>
    );
  };
  
  const MeasurementTracker = () => (
      <div className="p-6 bg-white rounded-3xl text-center border border-gray-200 max-w-lg mx-auto shadow-sm">
        <span className="text-4xl mb-4 block">📏</span>
        <h2 className="text-xl font-bold text-gray-800">บันทึกสัดส่วน</h2>
        <p className="text-sm text-gray-500 mt-2">ฟีเจอร์นี้กำลังถูกอัปเกรดเพื่อรองรับกราฟในเวอร์ชันถัดไป กรุณาใช้น้ำหนักในหน้า "เป้าหมาย" แทนชั่วคราวครับ</p>
      </div>
  );

  const RankingBoard = () => {
    const rankedUsers = users.filter(u => u.role === 'user').map(u => {
      const burned = exerciseLogs.filter(log => log.userId === u.id).reduce((sum, log) => sum + log.calories, 0);
      return { ...u, burned };
    }).sort((a,b) => b.burned - a.burned);

    return (
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-yellow-100">
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">🏆</span>
          <h2 className="text-2xl font-bold text-gray-800">กระดานผู้นำสายเบิร์น</h2>
          <p className="text-sm text-gray-500">จัดอันดับจากแคลอรี่ที่เผาผลาญทั้งหมดผ่านการออกกำลังกาย</p>
        </div>
        <div className="space-y-3">
          {rankedUsers.map((u, i) => (
            <div key={u.id} className={`flex items-center p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.01] ${i===0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="w-10 font-bold text-xl text-center text-gray-400">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
              <div className="flex-1 font-bold text-gray-800 text-lg">{u.name}</div>
              <div className="font-bold text-orange-600 text-lg">{u.burned} <span className="text-sm text-gray-500">kcal</span></div>
            </div>
          ))}
          {rankedUsers.length === 0 && <p className="text-center text-gray-400 py-4">ยังไม่มีผู้ใช้งานที่มีการเผาผลาญแคลอรี่</p>}
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const [newAccount, setNewAccount] = useState({ name: '', password: '', role: 'user' });

    const handleCreateAccount = (e) => {
      e.preventDefault();
      const id = 'u' + Date.now();
      const acc = { id, ...newAccount };
      if (isLocalMode) {
          setUsers(prev => [...prev, acc]);
          if(newAccount.role === 'user') setTdeeData(prev => ({...prev, [id]: { targetCalories: 2000, profile: { weight: 60 } }}));
      } else {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), acc);
          if(newAccount.role === 'user') setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tdeeData', id), { targetCalories: 2000, profile: { weight: 60 } });
      }
      setNewAccount({ name: '', password: '', role: 'user' });
    };

    if (viewingUserId) {
       const vUser = users.find(u => u.id === viewingUserId);
       return (
         <div className="space-y-6">
           <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-200">
             <div>
               <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">โหมดตรวจสอบผู้ใช้งาน</p>
               <h2 className="text-xl font-bold text-blue-900">{vUser?.name}</h2>
             </div>
             <button onClick={() => setViewingUserId(null)} className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition">← กลับหน้ารายชื่อ</button>
           </div>
           {/* แสดง Dashboard ของ User ที่เลือก */}
           <Dashboard targetUserId={viewingUserId} />
         </div>
       )
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg flex justify-between items-center">
           <div>
             <h1 className="text-2xl font-bold mb-1">ยินดีต้อนรับ, {currentUser.name}</h1>
             <p className="opacity-90 text-sm">จัดการบัญชีผู้ใช้งาน เพิ่มโค้ช และตรวจสอบข้อมูลบันทึกของสมาชิกแต่ละคน</p>
           </div>
           <div className="text-5xl opacity-80 hidden sm:block">🛡️</div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span>👥</span> เพิ่มบัญชีใหม่ (สมาชิก / โค้ช)</h2>
           <form onSubmit={handleCreateAccount} className="flex gap-3 mb-6 flex-wrap bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <div className="flex-1 min-w-[150px]">
               <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อที่แสดง</label>
               <input placeholder="เช่น น้องพาสเทล" required value={newAccount.name} onChange={e=>setNewAccount({...newAccount, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-400" />
             </div>
             <div className="w-[120px] sm:w-[150px]">
               <label className="text-xs font-bold text-gray-500 mb-1 block">รหัสผ่าน</label>
               <input placeholder="ตั้งรหัส" required value={newAccount.password} onChange={e=>setNewAccount({...newAccount, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-400" />
             </div>
             <div className="w-[120px]">
               <label className="text-xs font-bold text-gray-500 mb-1 block">ประเภท</label>
               <select value={newAccount.role} onChange={e=>setNewAccount({...newAccount, role: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white">
                 <option value="user">สมาชิก</option>
                 <option value="coach">โค้ช</option>
                 {currentUser.role === 'admin' && <option value="admin">แอดมิน</option>}
               </select>
             </div>
             <div className="flex items-end w-full sm:w-auto mt-2 sm:mt-0">
               <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition sm:h-[50px]">+ สร้างบัญชี</button>
             </div>
           </form>

           <h3 className="font-bold text-gray-800 mb-3">รายชื่อบัญชีในระบบ ({users.filter(u => u.id !== currentUser.id).length})</h3>
           <div className="space-y-3">
             {users.filter(u => u.id !== currentUser.id).map(u => (
               <div key={u.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 transition shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${u.role === 'admin' ? 'bg-purple-500' : u.role === 'coach' ? 'bg-blue-500' : 'bg-pink-400'}`}>
                     {u.name.charAt(0)}
                   </div>
                   <div>
                     <p className="font-bold text-gray-800">{u.name}</p>
                     <p className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                       {u.role === 'admin' ? 'แอดมิน' : u.role === 'coach' ? 'โค้ชประจำกลุ่ม' : 'สมาชิก'}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {u.role === 'user' && (
                     <button onClick={() => setViewingUserId(u.id)} className="text-sm bg-pink-50 hover:bg-pink-100 text-pink-600 px-4 py-2 rounded-xl font-bold transition">ดูสถิติ</button>
                   )}
                   <button onClick={() => {
                       if(window.confirm(`ยืนยันการลบบัญชี ${u.name}?`)) {
                           if(isLocalMode) setUsers(prev => prev.filter(x => x.id !== u.id));
                           else deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id));
                       }
                   }} className="text-sm text-gray-400 hover:text-red-500 px-3 py-2 bg-gray-50 rounded-xl transition">ลบ</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {currentUser.role === 'coach' || currentUser.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <div className="pb-10">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'ai' && <AIFoodScanner />}
          {activeTab === 'exercise' && <ExerciseTracker />}
          {activeTab === 'tdee' && <TDEECalculator />}
          {activeTab === 'measure' && <MeasurementTracker />}
          {activeTab === 'rank' && <RankingBoard />}
        </div>
      )}
    </Layout>
  );
}
