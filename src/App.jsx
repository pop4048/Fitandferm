import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Utensils, Award, LogOut, Plus, 
  Camera, Settings, Search, Trash2, Eye 
} from 'lucide-react';

// --- 1. Firebase Initialization ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQl9xUuXyZGpJAX8PyByImmRYQ9mH0L9Q",
  authDomain: "fitandferm.firebaseapp.com",
  projectId: "fitandferm",
  storageBucket: "fitandferm.firebasestorage.app",
  messagingSenderId: "443086319784",
  appId: "1:443086319784:web:7a02893627fc0df853929d",
  measurementId: "G-ZD25V8THQH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. Main Application Component ---
export default function App() {
  // State สำหรับเก็บข้อมูลจาก Firebase
  const [users, setUsers] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  
  // State สำหรับการทำงานในแอป
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // สำหรับ Admin/Coach ดูข้อมูลสมาชิก
  const [activeTab, setActiveTab] = useState('dashboard');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('geminiApiKey') || '');

  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user', weight: 60, targetTDEE: 2000 });
  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', portion: 1 });
  const [newExercise, setNewExercise] = useState({ type: 'running', minutes: '' });
  const [aiImageText, setAiImageText] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // --- 3. Firebase Real-time Sync (useEffect) ---
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // สร้าง Admin เริ่มต้นถ้ายังไม่มี
      if (usersData.length === 0) {
        const adminData = { id: 'admin-1', name: 'Admin', username: 'admin', password: 'admin', role: 'admin' };
        setDoc(doc(db, "users", "admin-1"), adminData);
      } else {
        setUsers(usersData);
      }
    });

    const unsubFood = onSnapshot(collection(db, "foodLogs"), (snapshot) => {
      setFoodLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubExercise = onSnapshot(collection(db, "exerciseLogs"), (snapshot) => {
      setExerciseLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUsers(); unsubFood(); unsubExercise(); };
  }, []);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayStr();

  // --- 4. Logic Functions ---
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setViewingUser(user);
    } else {
      alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const newId = `user-${Date.now()}`;
    await setDoc(doc(db, "users", newId), {
      ...newUser,
      weight: Number(newUser.weight),
      targetTDEE: Number(newUser.targetTDEE)
    });
    setNewUser({ name: '', username: '', password: '', role: 'user', weight: 60, targetTDEE: 2000 });
    alert('เพิ่มบัญชีเรียบร้อยแล้ว');
  };

  const handleDeleteUser = async (id) => {
    if(window.confirm('คุณต้องการลบบัญชีนี้ใช่หรือไม่?')) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.calories) return;
    
    // คำนวณสัดส่วนอาหาร (1 = เต็ม, 0.5 = ครึ่ง, 2 = เบิ้ล)
    const portionMultiplier = Number(newFood.portion);
    const finalCalories = Math.round(Number(newFood.calories) * portionMultiplier);
    const finalProtein = Math.round((Number(newFood.protein) || 0) * portionMultiplier);

    await setDoc(doc(db, "foodLogs", `food-${Date.now()}`), {
      userId: viewingUser.id,
      date: todayStr,
      name: newFood.name,
      calories: finalCalories,
      protein: finalProtein,
      portionLabel: portionMultiplier === 0.5 ? 'ครึ่งเดียว' : portionMultiplier === 2 ? 'เบิ้ล 2 เท่า' : 'ทานหมด',
      timestamp: Date.now()
    });
    setNewFood({ name: '', calories: '', protein: '', portion: 1 });
  };

  const handleDeleteFood = async (id) => {
    await deleteDoc(doc(db, "foodLogs", id));
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExercise.minutes) return;

    // ระบบคำนวณแคลอรี่ (METs อ้างอิงคร่าวๆ * น้ำหนัก * ระยะเวลา / 60)
    // สมมติน้ำหนัก 60 กก. หากไม่มีข้อมูล
    const weight = viewingUser.weight || 60; 
    let met = 5; // Default (เช่น เดินเร็ว)
    let typeName = 'ออกกำลังกายทั่วไป';

    if (newExercise.type === 'running') { met = 9.8; typeName = 'วิ่ง'; }
    if (newExercise.type === 'cycling') { met = 7.5; typeName = 'ปั่นจักรยาน'; }
    if (newExercise.type === 'swimming') { met = 8.0; typeName = 'ว่ายน้ำ'; }
    if (newExercise.type === 'weight') { met = 3.5; typeName = 'เวทเทรนนิ่ง'; }

    const minutes = Number(newExercise.minutes);
    const burnedCalories = Math.round(met * weight * (minutes / 60));

    await setDoc(doc(db, "exerciseLogs", `ex-${Date.now()}`), {
      userId: viewingUser.id,
      date: todayStr,
      type: typeName,
      minutes: minutes,
      caloriesBurned: burnedCalories,
      timestamp: Date.now()
    });
    setNewExercise({ type: 'running', minutes: '' });
  };

  const handleDeleteExercise = async (id) => {
    await deleteDoc(doc(db, "exerciseLogs", id));
  };

  const saveGeminiKey = () => {
    const key = prompt("กรุณากรอก Gemini API Key ของคุณ (ได้จาก Google AI Studio):", geminiKey);
    if (key !== null) {
      localStorage.setItem('geminiApiKey', key);
      setGeminiKey(key);
    }
  };

  // Mock function สำหรับ AI Scan (ถ้ามี API Key จริงสามารถเขียน fetch ส่งไป Google API ได้ตรงนี้)
  const handleAIScan = () => {
    if (!geminiKey) {
      alert("กรุณาตั้งค่า Gemini API Key ก่อนใช้งาน (ปุ่มเฟืองมุมขวาบน)");
      saveGeminiKey();
      return;
    }
    setIsScanning(true);
    // จำลองการสแกน (คุณสามารถเปลี่ยนเป็น fetch เรียก Gemini จริงได้)
    setTimeout(() => {
      setNewFood({ ...newFood, name: 'ข้าวกะเพราไก่ไข่ดาว (AI วิเคราะห์)', calories: 550, protein: 30, portion: 1 });
      setIsScanning(false);
      setAiImageText('');
    }, 1500);
  };

  // --- 5. Data Calculations ---
  const activeUserFood = foodLogs.filter(log => log.userId === viewingUser?.id && log.date === todayStr);
  const activeUserExercise = exerciseLogs.filter(log => log.userId === viewingUser?.id && log.date === todayStr);
  
  const totalEaten = activeUserFood.reduce((sum, item) => sum + item.calories, 0);
  const totalBurned = activeUserExercise.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const netCalories = totalEaten - totalBurned;
  const target = viewingUser?.targetTDEE || 2000;

  // สำหรับ Ranking (Top 3 เผาผลาญสูงสุดวันนี้)
  const getTopRankings = () => {
    const usersBurnMap = {};
    exerciseLogs.filter(log => log.date === todayStr).forEach(log => {
      usersBurnMap[log.userId] = (usersBurnMap[log.userId] || 0) + log.caloriesBurned;
    });
    
    return Object.keys(usersBurnMap)
      .map(userId => ({
        user: users.find(u => u.id === userId),
        burned: usersBurnMap[userId]
      }))
      .filter(item => item.user && item.user.role === 'user')
      .sort((a, b) => b.burned - a.burned)
      .slice(0, 3);
  };

  // --- 6. Renders ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center text-pink-600 mb-6">PastelFit 💖</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้ (Username)</label>
              <input type="text" required className="w-full mt-1 p-3 border rounded-lg"
                value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">รหัสผ่าน (Password)</label>
              <input type="password" required className="w-full mt-1 p-3 border rounded-lg"
                value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-pink-500 text-white p-3 rounded-lg font-bold hover:bg-pink-600">
              เข้าสู่ระบบ
            </button>
          </form>
          <p className="text-sm text-center text-gray-500 mt-4">
            เข้าสู่ระบบด้วย Admin (username: admin, password: admin)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-pink-600">PastelFit</h1>
          <p className="text-xs text-gray-500">
            ใช้งานโดย: {currentUser.name} [{currentUser.role}] 
            {viewingUser.id !== currentUser.id && <span className="text-pink-500 ml-2">(กำลังดู: {viewingUser.name})</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={saveGeminiKey} className="text-gray-500 hover:text-pink-600" title="ตั้งค่า Gemini API">
            <Settings size={20} />
          </button>
          <button onClick={() => { setCurrentUser(null); setViewingUser(null); }} className="text-red-500" title="ออกจากระบบ">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">เป้าหมาย (TDEE)</p>
                <p className="text-xl font-bold">{target} kcal</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                <p className="text-sm text-gray-500">ทานไปแล้ว</p>
                <p className="text-xl font-bold text-orange-500">{totalEaten} kcal</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                <p className="text-sm text-gray-500">เผาผลาญ (ออกกำลัง)</p>
                <p className="text-xl font-bold text-green-500">{totalBurned} kcal</p>
              </div>
              <div className={`bg-white p-4 rounded-xl shadow-sm border ${netCalories > target ? 'border-red-200' : 'border-blue-100'}`}>
                <p className="text-sm text-gray-500">คงเหลือสุทธิ (ทาน-เบิร์น)</p>
                <p className={`text-xl font-bold ${netCalories > target ? 'text-red-500' : 'text-blue-500'}`}>
                  {target - netCalories} kcal
                </p>
              </div>
            </div>

            {/* Top 3 Ranking */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Award className="text-yellow-500" /> จัดอันดับสายเบิร์นประจำวัน (Top 3)
              </h2>
              <div className="space-y-3">
                {getTopRankings().map((rank, idx) => (
                  <div key={rank.user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-400'}`}>
                        #{idx + 1}
                      </span>
                      <span>{rank.user.name}</span>
                    </div>
                    <span className="font-bold text-green-500">{rank.burned} kcal</span>
                  </div>
                ))}
                {getTopRankings().length === 0 && <p className="text-gray-400 text-sm">ยังไม่มีข้อมูลการออกกำลังกายวันนี้</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIET (สแกน & บันทึกอาหาร) */}
        {activeTab === 'diet' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Camera className="text-pink-500" /> AI สแกนอาหาร (Gemini)</h2>
              <textarea 
                placeholder="พิมพ์ส่วนผสม หรือสิ่งที่คุณกิน เช่น ข้าวมันไก่ 1 จาน..." 
                className="w-full p-3 border rounded-lg text-sm mb-3"
                rows="3"
                value={aiImageText}
                onChange={e => setAiImageText(e.target.value)}
              />
              <button onClick={handleAIScan} disabled={isScanning} className="w-full bg-indigo-500 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
                {isScanning ? 'กำลังวิเคราะห์...' : <><Search size={18} /> วิเคราะห์แคลอรี่</>}
              </button>
            </div>

            <form onSubmit={handleAddFood} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold mb-4">เพิ่มข้อมูลอาหาร</h2>
              <input type="text" placeholder="ชื่ออาหาร" required className="w-full p-3 border rounded-lg"
                value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="แคลอรี่ (kcal)" required className="w-full p-3 border rounded-lg"
                  value={newFood.calories} onChange={e => setNewFood({...newFood, calories: e.target.value})} />
                <input type="number" placeholder="โปรตีน (g)" className="w-full p-3 border rounded-lg"
                  value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})} />
              </div>
              
              {/* Portion Selector */}
              <div>
                <label className="block text-sm text-gray-500 mb-2">สัดส่วนที่ทานจริง:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setNewFood({...newFood, portion: 0.5})} className={`p-2 text-sm rounded-lg border ${newFood.portion === 0.5 ? 'bg-pink-100 border-pink-500 text-pink-700' : 'bg-white'}`}>ครึ่งเดียว</button>
                  <button type="button" onClick={() => setNewFood({...newFood, portion: 1})} className={`p-2 text-sm rounded-lg border ${newFood.portion === 1 ? 'bg-pink-100 border-pink-500 text-pink-700' : 'bg-white'}`}>ทานหมด</button>
                  <button type="button" onClick={() => setNewFood({...newFood, portion: 2})} className={`p-2 text-sm rounded-lg border ${newFood.portion === 2 ? 'bg-pink-100 border-pink-500 text-pink-700' : 'bg-white'}`}>เบิ้ล 2 เท่า</button>
                </div>
              </div>

              <button type="submit" className="w-full bg-pink-500 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
                <Plus size={18} /> บันทึกอาหาร
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <h3 className="font-bold mb-3">รายการอาหารวันนี้</h3>
              <div className="space-y-2">
                {activeUserFood.map(log => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-bold">{log.name}</p>
                      <p className="text-xs text-gray-500">โปรตีน {log.protein}g | ปริมาณ: {log.portionLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-orange-500">{log.calories} kcal</span>
                      <button onClick={() => handleDeleteFood(log.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXERCISE (ออกกำลังกาย & คำนวณแคล) */}
        {activeTab === 'exercise' && (
          <div className="space-y-6">
            <form onSubmit={handleAddExercise} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Activity className="text-green-500" /> บันทึกการออกกำลังกาย</h2>
              <select className="w-full p-3 border rounded-lg bg-white" value={newExercise.type} onChange={e => setNewExercise({...newExercise, type: e.target.value})}>
                <option value="running">วิ่ง / วิ่งเหยาะๆ (Running)</option>
                <option value="cycling">ปั่นจักรยาน (Cycling)</option>
                <option value="swimming">ว่ายน้ำ (Swimming)</option>
                <option value="weight">เวทเทรนนิ่ง (Weight Training)</option>
              </select>
              <input type="number" placeholder="ระยะเวลา (นาที)" required className="w-full p-3 border rounded-lg"
                  value={newExercise.minutes} onChange={e => setNewExercise({...newExercise, minutes: e.target.value})} />
              
              <button type="submit" className="w-full bg-green-500 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
                <Plus size={18} /> คำนวณ & บันทึก
              </button>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <h3 className="font-bold mb-3">กิจกรรมวันนี้</h3>
              <div className="space-y-2">
                {activeUserExercise.map(log => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 border-green-400">
                    <div>
                      <p className="font-bold">{log.type}</p>
                      <p className="text-xs text-gray-500">{log.minutes} นาที</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-500">เผาผลาญ {log.caloriesBurned} kcal</span>
                      <button onClick={() => handleDeleteExercise(log.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {activeUserExercise.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีกิจกรรม</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN / COACH (จัดการผู้ใช้) */}
        {activeTab === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'coach') && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">เพิ่มบัญชีผู้ใช้งาน / โค้ช</h2>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="ชื่อแสดงผล" required className="p-3 border rounded-lg w-full"
                    value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                  <select className="p-3 border rounded-lg w-full bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="user">สมาชิก (User)</option>
                    {currentUser.role === 'admin' && <option value="coach">โค้ช (Coach)</option>}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Username สำหรับเข้าสู่ระบบ" required className="p-3 border rounded-lg w-full"
                    value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  <input type="text" placeholder="Password" required className="p-3 border rounded-lg w-full"
                    value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                {newUser.role === 'user' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="น้ำหนัก (kg) (ใช้คำนวณแคล)" required className="p-3 border rounded-lg w-full"
                      value={newUser.weight} onChange={e => setNewUser({...newUser, weight: e.target.value})} />
                    <input type="number" placeholder="เป้าหมาย TDEE (kcal)" required className="p-3 border rounded-lg w-full"
                      value={newUser.targetTDEE} onChange={e => setNewUser({...newUser, targetTDEE: e.target.value})} />
                  </div>
                )}
                <button type="submit" className="w-full bg-purple-500 text-white p-3 rounded-lg font-bold">สร้างบัญชี</button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <h3 className="font-bold mb-4">รายชื่อผู้ใช้งานในระบบ</h3>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-bold flex items-center gap-2">
                        {u.name} 
                        <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'coach' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">User: {u.username} | Pass: {u.password}</p>
                    </div>
                    <div className="flex gap-2">
                      {u.role === 'user' && (
                        <button onClick={() => { setViewingUser(u); setActiveTab('dashboard'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 text-sm">
                          <Eye size={16}/> ดูข้อมูล
                        </button>
                      )}
                      {u.id !== currentUser.id && (
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 pb-safe z-20">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 ${activeTab === 'dashboard' ? 'text-pink-600' : 'text-gray-400'}`}>
          <Activity size={24} />
          <span className="text-[10px] mt-1">ภาพรวม</span>
        </button>
        <button onClick={() => setActiveTab('diet')} className={`flex flex-col items-center p-2 ${activeTab === 'diet' ? 'text-pink-600' : 'text-gray-400'}`}>
          <Utensils size={24} />
          <span className="text-[10px] mt-1">อาหาร</span>
        </button>
        <button onClick={() => setActiveTab('exercise')} className={`flex flex-col items-center p-2 ${activeTab === 'exercise' ? 'text-pink-600' : 'text-gray-400'}`}>
          <Activity size={24} />
          <span className="text-[10px] mt-1">ออกกำลัง</span>
        </button>
        {(currentUser.role === 'admin' || currentUser.role === 'coach') && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center p-2 ${activeTab === 'admin' ? 'text-pink-600' : 'text-gray-400'}`}>
            <Users size={24} />
            <span className="text-[10px] mt-1">จัดการ</span>
          </button>
        )}
      </nav>
    </div>
  );
}
