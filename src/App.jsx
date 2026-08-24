import React, { useState, useEffect } from 'react';

const generateId = () => Math.random().toString(36).substr(2, 9);
const getTodayString = () => new Date().toISOString().split('T')[0];

const INITIAL_USERS = [
  { id: 'u1', name: 'น้องพาสเทล', role: 'user', password: '123' },
  { id: 'u2', name: 'คุณสมชาย', role: 'user', password: '123' },
  { id: 'u3', name: 'พี่สมศรี', role: 'user', password: '123' },
  { id: 'admin1', name: 'Admin (ผู้ดูแลระบบ)', role: 'admin', password: 'admin' }
];

export default function PastelFitApp() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingUserId, setViewingUserId] = useState(null); 
  const [loginError, setLoginError] = useState(''); 

  // App States (Global)
  const [users, setUsers] = useState(INITIAL_USERS);
  const [foodLogs, setFoodLogs] = useState([
    { id: 'fl1', userId: 'u2', date: getTodayString(), timestamp: new Date().toISOString(), name: 'ข้าวกะเพราหมูกรอบ', calories: 850, protein: 25, carbs: 60, fat: 45, meal: 'lunch' },
    { id: 'fl2', userId: 'u3', date: getTodayString(), timestamp: new Date().toISOString(), name: 'สลัดอกไก่', calories: 350, protein: 35, carbs: 15, fat: 10, meal: 'dinner' },
  ]);
  const [measurements, setMeasurements] = useState([
    { id: 'm1', userId: 'u2', date: getTodayString(), weight: 79, waist: 34, height: 175, chest: 40, arm: 13, leg: 22, neck: 15 }
  ]);
  const [tdeeData, setTdeeData] = useState({
    'u1': { bmr: 1254, tdee: 1505, targetCalories: 1505, profile: { gender: 'female', age: 25, height: 160, weight: 55, activity: '1.2', goal: 'maintain' } },
    'u2': { bmr: 1793, tdee: 2779, targetCalories: 2279, profile: { gender: 'male', age: 30, height: 175, weight: 80, activity: '1.55', goal: 'lose' } },
    'u3': { bmr: 1289, tdee: 1772, targetCalories: 1200, profile: { gender: 'female', age: 40, height: 155, weight: 65, activity: '1.375', goal: 'lose_fast' } }
  });

  useEffect(() => {
    const cleanOldImages = () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      
      setFoodLogs(prev => prev.map(log => {
        const logDate = new Date(log.timestamp);
        if (log.imageUrl && logDate < sevenDaysAgo) {
          return { ...log, imageUrl: null, note: '(รูปภาพถูกลบอัตโนมัติตามกำหนด 7 วัน)' };
        }
        return log;
      }));
    };
    cleanOldImages();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const userId = e.target.userId.value;
    const password = e.target.password.value;
    
    const user = users.find(u => u.id === userId);
    if (user) {
      if (user.password === password) {
        setCurrentUser(user);
        setActiveTab('dashboard');
        setViewingUserId(null);
        setLoginError('');
      } else {
        setLoginError('รหัสผ่านไม่ถูกต้อง');
      }
    } else {
      setLoginError('กรุณาเลือกบัญชีผู้ใช้งาน');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 pb-20 font-sans">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌸</span>
              <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">
                PastelFit
              </span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="text-sm bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-full transition-all shadow-md">
                 เข้าสู่ระบบ
               </button>
            </div>
          </div>
        </nav>

        <div className="text-center py-12 px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            เริ่มต้นดูแลสุขภาพกับ <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">PastelFit</span>
          </h1>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
             ติดตามแคลอรี่, สแกนอาหารด้วย AI, และบรรลุเป้าหมายสุขภาพไปพร้อมกับเพื่อนๆ ในคอมมูนิตี้
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4">
           <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">🎯 สถานะเพื่อนๆ วันนี้</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {users.filter(u => u.role === 'user').map(user => {
                 const uTdee = tdeeData[user.id] || { targetCalories: 2000 };
                 const uLogs = foodLogs.filter(log => log.userId === user.id && log.date === getTodayString());
                 const consumed = uLogs.reduce((acc, curr) => acc + curr.calories, 0);
                 const target = uTdee.targetCalories;
                 const remaining = target - consumed;
                 const percent = Math.min((consumed / target) * 100, 100);
                 const isOver = consumed > target;

                 return (
                   <div key={user.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/50 border border-white relative overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">🏃‍♀️</div>
                      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-blue-200 flex items-center justify-center text-sm">👤</span>
                        {user.name}
                      </h3>
                      
                      <div className="space-y-4">
                         <div>
                            <div className="flex justify-between text-sm mb-1">
                               <span className="text-gray-500">เป้าหมาย</span>
                               <span className="font-semibold text-gray-700">{target.toLocaleString()} kcal</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                               <span className="text-gray-500">ทานแล้ว</span>
                               <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-pink-500'}`}>{consumed.toLocaleString()} kcal</span>
                            </div>
                         </div>

                         <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-400' : 'bg-gradient-to-r from-green-400 to-blue-400'}`} style={{width: `${percent}%`}}></div>
                         </div>

                         <div className="text-center pt-2">
                            {isOver ? (
                               <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full inline-block">⚠️ เกินเป้าหมาย {Math.abs(remaining).toLocaleString()} kcal</span>
                            ) : (
                               <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">✨ เหลืออีก {remaining.toLocaleString()} kcal</span>
                            )}
                         </div>
                      </div>
                   </div>
                 )
              })}
           </div>

           <div className="mt-20 bg-white p-8 rounded-3xl shadow-xl max-w-md mx-auto text-center border border-pink-100">
             <div className="text-5xl mb-4">🌸</div>
             <h2 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบ</h2>
             <p className="text-gray-500 mb-6">กรุณาเลือกบัญชีและใส่รหัสผ่าน</p>
             
             {loginError && (
               <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-semibold border border-red-100">
                 {loginError}
               </div>
             )}
             
             <form onSubmit={handleLogin} className="space-y-4">
               <select name="userId" className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200 text-gray-700 font-medium">
                 <option value="">-- เลือกบัญชีผู้ใช้งาน --</option>
                 {users.map(u => (
                   <option key={u.id} value={u.id}>
                     {u.name} ({u.role === 'admin' ? 'แอดมิน' : u.role === 'coach' ? 'โค้ช' : 'สมาชิก'})
                   </option>
                 ))}
               </select>
               <input 
                 type="password" 
                 name="password" 
                 placeholder="รหัสผ่าน (User = 123, Admin/Coach = admin)" 
                 className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200 text-gray-700"
               />
               <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  เข้าสู่ระบบ
               </button>
             </form>
           </div>
        </div>
      </div>
    );
  }

  const NavBar = () => (
    <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">
            PastelFit
          </span>
        </div>
        <div className="flex items-center gap-4">
          {currentUser.role !== 'user' && activeTab === 'coach-user-detail' && (
            <button onClick={() => setActiveTab('dashboard')} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-full font-medium flex items-center gap-1">
              <span>◀</span> กลับ
            </button>
          )}
          <span className="text-gray-600 font-medium text-sm md:text-base">{currentUser.name}</span>
          <button onClick={() => setCurrentUser(null)} className="text-sm text-pink-500 hover:text-pink-600 font-medium">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );

  const Layout = ({ children }) => (
    <div className="min-h-screen bg-slate-50 pt-16 pb-20 md:pb-0">
      <NavBar />
      
      {currentUser.role === 'user' && (
        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around py-3 z-50 px-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <NavBtn id="dashboard" icon="📊" label="สรุปวัน" active={activeTab} onClick={setActiveTab} />
          <NavBtn id="ai" icon="📸" label="AI สแกน" active={activeTab} onClick={setActiveTab} />
          <NavBtn id="tdee" icon="⚙️" label="เป้าหมาย" active={activeTab} onClick={setActiveTab} />
          <NavBtn id="measure" icon="📏" label="สัดส่วน" active={activeTab} onClick={setActiveTab} />
          <NavBtn id="rank" icon="🏆" label="จัดอันดับ" active={activeTab} onClick={setActiveTab} />
        </div>
      )}

      <div className="max-w-7xl mx-auto flex">
        {currentUser.role === 'user' && (
          <div className="hidden md:block w-64 min-h-[calc(100vh-64px)] bg-white border-r border-gray-100 p-6 sticky top-16">
            <div className="space-y-4">
              <SideNavBtn id="dashboard" icon="📊" label="สรุปรายวัน" active={activeTab} onClick={setActiveTab} />
              <SideNavBtn id="ai" icon="📸" label="AI สแกนอาหาร" active={activeTab} onClick={setActiveTab} />
              <SideNavBtn id="tdee" icon="⚙️" label="เป้าหมาย & TDEE" active={activeTab} onClick={setActiveTab} />
              <SideNavBtn id="measure" icon="📏" label="บันทึกสัดส่วน" active={activeTab} onClick={setActiveTab} />
              <SideNavBtn id="rank" icon="🏆" label="กระดานจัดอันดับ" active={activeTab} onClick={setActiveTab} />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );

  const NavBtn = ({ id, icon, label, active, onClick }) => (
    <button onClick={() => onClick(id)} className={`flex flex-col items-center flex-1 ${active === id ? 'text-pink-500' : 'text-gray-400'}`}>
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  const SideNavBtn = ({ id, icon, label, active, onClick }) => (
    <button 
      onClick={() => onClick(id)} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${active === id ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const TDEECalculator = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const defaultProfile = { gender: 'female', age: 25, height: 160, weight: 55, activity: '1.2', goal: 'maintain' };
    const currentData = tdeeData[uid] || { bmr: 0, tdee: 0, targetCalories: 0, profile: defaultProfile };
    
    const safeTdee = currentData.tdee || 0;
    const [localProfile, setLocalProfile] = useState(currentData.profile || defaultProfile);

    const calculateTDEE = () => {
      if (isReadOnly) return;
      let bmr = 0;
      if (localProfile.gender === 'male') {
        bmr = (10 * localProfile.weight) + (6.25 * localProfile.height) - (5 * localProfile.age) + 5;
      } else {
        bmr = (10 * localProfile.weight) + (6.25 * localProfile.height) - (5 * localProfile.age) - 161;
      }
      
      const tdee = Math.round(bmr * parseFloat(localProfile.activity));
      
      let target = tdee;
      if (localProfile.goal === 'lose_fast') target -= 1000;
      else if (localProfile.goal === 'lose') target -= 500;
      else if (localProfile.goal === 'gain') target += 500;
      else if (localProfile.goal === 'gain_fast') target += 1000;
      
      if (localProfile.gender === 'female' && target < 1200) target = 1200;
      if (localProfile.gender === 'male' && target < 1500) target = 1500;

      const results = { bmr: Math.round(bmr), tdee, targetCalories: target, profile: localProfile };
      setTdeeData(prev => ({ ...prev, [uid]: results }));
      
      const btn = document.getElementById('calc-btn');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = 'บันทึกสำเร็จ! ✨';
        btn.classList.add('bg-green-400');
        setTimeout(() => {
          btn.innerText = originalText;
          btn.classList.remove('bg-green-400');
        }, 2000);
      }
    };

    useEffect(() => {
      if (currentData.tdee === 0 && !isReadOnly) calculateTDEE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">โปรแกรมคำนวณ TDEE & เป้าหมาย</h2>
        {isReadOnly && <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-sm mb-4">👀 โหมดดูข้อมูลเท่านั้น (Read-only)</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
            <h3 className="text-lg font-semibold text-pink-600 mb-4">ข้อมูลส่วนบุคคล</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">เพศ</label>
                <div className="flex gap-4">
                  <button disabled={isReadOnly} onClick={() => setLocalProfile({...localProfile, gender: 'male'})} className={`flex-1 py-2 rounded-xl border ${localProfile.gender === 'male' ? 'bg-blue-50 border-blue-400 text-blue-600' : 'border-gray-200 text-gray-500'} ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}>♂ ชาย</button>
                  <button disabled={isReadOnly} onClick={() => setLocalProfile({...localProfile, gender: 'female'})} className={`flex-1 py-2 rounded-xl border ${localProfile.gender === 'female' ? 'bg-pink-50 border-pink-400 text-pink-600' : 'border-gray-200 text-gray-500'} ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}>♀ หญิง</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">อายุ (ปี)</label>
                  <input disabled={isReadOnly} type="number" value={localProfile.age} onChange={e => setLocalProfile({...localProfile, age: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-70" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">น้ำหนัก (กก.)</label>
                  <input disabled={isReadOnly} type="number" value={localProfile.weight} onChange={e => setLocalProfile({...localProfile, weight: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-70" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">ส่วนสูง (ซม.)</label>
                  <input disabled={isReadOnly} type="number" value={localProfile.height} onChange={e => setLocalProfile({...localProfile, height: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-70" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">ระดับกิจกรรม</label>
                <select disabled={isReadOnly} value={localProfile.activity} onChange={e => setLocalProfile({...localProfile, activity: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-pink-300 text-gray-700 disabled:opacity-70">
                  <option value="1.2">ไม่ออกกำลังกายเลย หรือน้อยมาก</option>
                  <option value="1.375">ออกกำลังกายเบาๆ 1-3 วัน/สัปดาห์</option>
                  <option value="1.55">ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์</option>
                  <option value="1.725">ออกกำลังกายหนัก 6-7 วัน/สัปดาห์</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">เป้าหมาย (Goal)</label>
                <select disabled={isReadOnly} value={localProfile.goal} onChange={e => setLocalProfile({...localProfile, goal: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-pink-300 text-gray-700 disabled:opacity-70">
                  <option value="lose_fast">ลดน้ำหนักอย่างมาก (-1 กก./สัปดาห์)</option>
                  <option value="lose">ลดน้ำหนักปกติ (-0.5 กก./สัปดาห์)</option>
                  <option value="maintain">รักษาน้ำหนัก</option>
                  <option value="gain">เพิ่มกล้ามเนื้อ/น้ำหนัก (+0.5 กก./สัปดาห์)</option>
                </select>
              </div>

              {!isReadOnly && (
                <button id="calc-btn" onClick={calculateTDEE} className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
                  คำนวณและบันทึกเป้าหมาย
                </button>
              )}
            </div>
          </div>

          <div className="bg-pink-50 p-6 rounded-3xl border border-pink-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">พลังงานที่ต้องการในแต่ละวัน (TDEE)</h3>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-pink-600">{safeTdee}</span>
              <span className="text-gray-600">แคลอรี่/วัน</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 text-sm font-semibold text-gray-500 pb-2 border-b border-pink-200">
                <div>เป้าหมาย</div>
                <div className="text-center">น้ำหนัก/สัปดาห์</div>
                <div className="text-right">แคลอรี่/วัน</div>
              </div>
              
              <ResultRow label="ลดอย่างมาก" color="bg-red-100 text-red-700" weight="-1 กก." cals={safeTdee > 0 ? safeTdee - 1000 : 0} active={localProfile.goal === 'lose_fast'} />
              <ResultRow label="ลดน้ำหนัก" color="bg-orange-100 text-orange-700" weight="-0.5 กก." cals={safeTdee > 0 ? safeTdee - 500 : 0} active={localProfile.goal === 'lose'} />
              <ResultRow label="รักษาน้ำหนัก" color="bg-gray-200 text-gray-700" weight="0 กก." cals={safeTdee} active={localProfile.goal === 'maintain'} />
              <ResultRow label="เพิ่มน้ำหนัก" color="bg-green-100 text-green-700" weight="+0.5 กก." cals={safeTdee > 0 ? safeTdee + 500 : 0} active={localProfile.goal === 'gain'} />
            </div>

            <div className="mt-8 p-4 bg-white rounded-2xl shadow-sm text-center">
              <p className="text-sm text-gray-500">เป้าหมายปัจจุบัน:</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">{currentData.targetCalories || 0} kcal/วัน</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResultRow = ({ label, color, weight, cals, active }) => (
    <div className={`grid grid-cols-3 items-center py-2 px-3 rounded-xl transition-all ${active ? 'bg-white shadow-sm ring-2 ring-pink-400' : ''}`}>
      <div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>{label}</span></div>
      <div className="text-center text-sm text-gray-600">{weight}</div>
      <div className="text-right text-sm font-semibold text-gray-800">{cals > 0 ? Math.max(cals, 1200) : 0}</div>
    </div>
  );

  const AIFoodScanner = () => {
    const [image, setImage] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [result, setResult] = useState(null);
    const [mealType, setMealType] = useState('lunch');
    const [errorMsg, setErrorMsg] = useState('');
    const [editForm, setEditForm] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImage(e.target.result);
          setResult(null);
          setPredictions(null);
          setErrorMsg('');
        };
        reader.readAsDataURL(file);
      }
    };

    const runCustomAI = async () => {
      if (!image) return;
      setIsScanning(true);
      setErrorMsg('');
      
      try {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1] || "image/jpeg";

        const prompt = `Analyze this image of food or nutrition label. Identify the food and estimate its nutritional value per typical serving. Protein is highly important, please estimate it as accurately as possible.
Respond ONLY with a valid JSON array of up to 3 objects representing your best guesses.
Format each object EXACTLY like this:
[
  {
    "name": "Food Name (in Thai)",
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "confidence": "95.0"
  }
]
Ensure the response is a pure JSON string.`;

        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType, data: base64Data } }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
          }
        };

        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

        const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const response = await fetch(url, options);
              if (!response.ok) {
                  if (response.status === 429) {
                       await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
                       continue;
                  }
                  throw new Error('HTTP error! status: ' + response.status);
              }
              return await response.json();
            } catch (e) {
              if (i === retries - 1) throw e;
              await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            }
          }
        };

        const resultData = await fetchWithRetry(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (resultData.candidates && resultData.candidates.length > 0 &&
            resultData.candidates[0].content && resultData.candidates[0].content.parts &&
            resultData.candidates[0].content.parts.length > 0) {
          
          let jsonText = resultData.candidates[0].content.parts[0].text;
          let preds = JSON.parse(jsonText);
          
          if (!Array.isArray(preds)) {
             preds = [preds];
          }

          setPredictions(preds);
          setResult(preds[0]);
          setEditForm(preds[0]);
        } else {
           throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("AI Error:", error);
        setErrorMsg("ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsScanning(false);
      }
    };

    const saveFoodLog = () => {
      const newLog = {
        id: generateId(),
        userId: currentUser.id,
        date: getTodayString(),
        timestamp: new Date().toISOString(),
        meal: mealType,
        imageUrl: image,
        ...editForm
      };
      setFoodLogs(prev => [newLog, ...prev]);
      setActiveTab('dashboard');
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-blue-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Custom AI สแกนอาหาร & ฉลาก</h2>
          <p className="text-gray-500 text-sm">โมเดล AI เฉพาะสำหรับแอปนี้ ช่วยคำนวณแคลอรี่จากภาพได้อย่างแม่นยำ</p>
        </div>

        {!image ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-pink-300 border-dashed rounded-3xl cursor-pointer bg-pink-50 hover:bg-pink-100 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-4xl mb-3">📸</span>
              <p className="mb-2 text-sm text-pink-600 font-semibold"><span className="underline">คลิกเพื่ออัปโหลด</span> หรือลากรูปภาพมาวาง</p>
              <p className="text-xs text-gray-500">รองรับภาพถ่ายอาหารหรือฉลากโภชนาการ (ภาพจะถูกลบใน 7 วัน)</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden shadow-md bg-black">
              <img src={image} alt="Food" className="w-full h-64 object-cover opacity-90" />
              
              {isScanning && (
                <div className="absolute inset-0 bg-blue-900/40 flex flex-col items-center justify-center z-10">
                  <div className="w-full h-1 bg-green-400 animate-pulse absolute top-1/2 shadow-[0_0_15px_#4ade80]"></div>
                  <span className="text-white font-mono mt-8 bg-black/50 px-3 py-1 rounded-full text-sm">กำลังวิเคราะห์ด้วย Gemini AI...</span>
                </div>
              )}
              
              {!isScanning && !predictions && (
                <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-white/80 p-2 rounded-full text-gray-700 hover:bg-white text-xs">
                  ✕ เปลี่ยนรูป
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-200 text-center font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {!predictions && !isScanning && (
              <button onClick={runCustomAI} className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-bold py-4 px-4 rounded-2xl shadow-lg transform transition hover:-translate-y-1">
                ✨ ให้ AI วิเคราะห์โภชนาการ
              </button>
            )}

            {predictions && (
              <div className="bg-blue-50 p-4 md:p-6 rounded-3xl animate-fadeIn shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-blue-800">AI ประเมินว่าเป็นเมนูใด?</h3>
                  <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-1 rounded-full">พบ {predictions.length} รายการ</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  {predictions.map((p, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setResult(p); setEditForm({...p}); }}
                      className={`p-3 rounded-xl text-left transition-all ${result?.name === p.name ? 'bg-pink-500 text-white shadow-md transform scale-[1.02]' : 'bg-white text-gray-700 hover:bg-pink-50 border border-gray-200'}`}
                    >
                      <div className="font-bold text-sm truncate mb-1">{p.name}</div>
                      <div className={`text-[10px] ${result?.name === p.name ? 'text-pink-100' : 'text-gray-400'}`}>
                        มั่นใจ {p.confidence}% • {p.calories} kcal • โปรตีน {p.protein}g
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="border-t border-blue-200 pt-4 mt-2">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">ตรวจสอบและแก้ไขโภชนาการ</h4>
                      <p className="text-xs text-gray-500 mt-1">หาก AI คาดเดาผิดพลาด คุณสามารถพิมพ์แก้ไขค่าต่างๆ ได้เอง</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">ชื่ออาหาร / รายการ</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-blue-200 mt-1 focus:outline-pink-400 text-sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">แคลอรี่ (kcal)</label>
                        <input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: Number(e.target.value)})} className="w-full p-2 rounded-xl border border-blue-200 mt-1 bg-white font-bold text-pink-600" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-pink-600">💪 โปรตีน (g)</label>
                        <input type="number" value={editForm.protein} onChange={e => setEditForm({...editForm, protein: Number(e.target.value)})} className="w-full p-2 rounded-xl border-2 border-pink-300 mt-1 bg-pink-50 font-bold text-pink-700 focus:outline-pink-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">คาร์บ (g)</label>
                        <input type="number" value={editForm.carbs} onChange={e => setEditForm({...editForm, carbs: Number(e.target.value)})} className="w-full p-2 rounded-xl border border-blue-200 mt-1 bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">ไขมัน (g)</label>
                        <input type="number" value={editForm.fat} onChange={e => setEditForm({...editForm, fat: Number(e.target.value)})} className="w-full p-2 rounded-xl border border-blue-200 mt-1 bg-white" />
                      </div>
                    </div>

                    <div>
                       <label className="text-sm font-semibold text-gray-700 block mb-2 mt-4">บันทึกเป็นมื้อ</label>
                       <div className="flex gap-2">
                          {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
                            <button key={m} onClick={() => setMealType(m)} className={`flex-1 py-2 text-xs md:text-sm rounded-xl font-medium transition ${mealType === m ? 'bg-pink-400 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
                              {m === 'breakfast' ? 'เช้า' : m === 'lunch' ? 'กลางวัน' : m === 'dinner' ? 'เย็น' : 'ของว่าง'}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-blue-100 mt-4">
                      <button onClick={() => {setImage(null); setResult(null); setPredictions(null);}} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl text-sm">ยกเลิก</button>
                      <button onClick={saveFoodLog} className="flex-[2] bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl shadow-md text-sm">💾 บันทึกลงไดอารี่</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const Dashboard = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const todayLogs = foodLogs.filter(log => log.userId === uid && log.date === getTodayString());
    const userTdeeData = tdeeData[uid] || { targetCalories: 2000 };
    
    const consumed = todayLogs.reduce((acc, curr) => acc + curr.calories, 0);
    const target = userTdeeData.targetCalories;
    const remaining = target - consumed;
    const percent = Math.min((consumed / target) * 100, 100);

    const macros = todayLogs.reduce((acc, curr) => {
      acc.protein += curr.protein || 0;
      acc.carbs += curr.carbs || 0;
      acc.fat += curr.fat || 0;
      return acc;
    }, { protein: 0, carbs: 0, fat: 0 });

    const deleteLog = (id) => {
      if(isReadOnly) return;
      setFoodLogs(prev => prev.filter(l => l.id !== id));
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {isReadOnly && <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-sm text-center font-bold">👀 กำลังดูข้อมูลของ: {users.find(u=>u.id === uid)?.name}</div>}

        {!isReadOnly && new Date().getDay() === 0 && measurements.filter(m => m.userId === uid && m.date === getTodayString()).length === 0 && (
          <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-orange-200 transition" onClick={() => setActiveTab('measure')}>
            <div>
              <p className="font-bold">⚠️ วันอาทิตย์แล้ว!</p>
              <p className="text-sm">ถึงเวลาอัพเดทสัดส่วนประจำสัปดาห์ของคุณแล้ว (บังคับอัพเดท)</p>
            </div>
            <span className="text-xl">👉</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-pink-100 flex flex-col justify-center items-center">
            <h3 className="text-gray-500 font-medium mb-4">สรุปแคลอรี่วันนี้</h3>
            
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={`${percent > 100 ? 'text-red-400' : 'text-pink-400'}`} strokeDasharray={`${percent}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-gray-800">{remaining}</span>
                <span className="text-xs text-gray-500">kcal คงเหลือ</span>
              </div>
            </div>
            
            <div className="w-full flex justify-between text-sm mt-6 px-4">
              <div className="text-center"><p className="text-gray-400">เป้าหมาย</p><p className="font-bold text-gray-700">{target}</p></div>
              <div className="text-center"><p className="text-gray-400">ทานแล้ว</p><p className="font-bold text-pink-500">{consumed}</p></div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 grid grid-cols-3 gap-4 text-center items-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">คาร์บ</p>
                <p className="text-xl font-bold text-blue-500">{macros.carbs}g</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2"><div className="bg-blue-400 h-1.5 rounded-full" style={{width: '50%'}}></div></div>
              </div>
              <div className="transform scale-110 bg-pink-50 p-3 rounded-2xl shadow-sm border border-pink-200">
                <p className="text-xs font-bold text-pink-600 mb-1">💪 โปรตีน</p>
                <p className="text-2xl font-bold text-pink-600">{macros.protein}g</p>
                <div className="w-full bg-pink-100 h-1.5 rounded-full mt-2"><div className="bg-pink-500 h-1.5 rounded-full" style={{width: '60%'}}></div></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">ไขมัน</p>
                <p className="text-xl font-bold text-orange-400">{macros.fat}g</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2"><div className="bg-orange-400 h-1.5 rounded-full" style={{width: '40%'}}></div></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">รายการอาหารวันนี้</h3>
                {!isReadOnly && <button onClick={() => setActiveTab('ai')} className="text-sm bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-medium hover:bg-pink-200">+ เพิ่ม</button>}
              </div>

              {todayLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีรายการอาหาร วันนี้ทานอะไรดี?</div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {todayLogs.map(log => (
                    <div key={log.id} className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl">
                      {log.imageUrl ? (
                        <img src={log.imageUrl} alt={log.name} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center text-2xl">🍽️</div>
                      )}
                      
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{log.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold text-pink-600">💪 P:{log.protein}g</span> · C:{log.carbs}g · F:{log.fat}g</p>
                        <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-full mt-1 inline-block text-gray-500 uppercase">{log.meal}</span>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="font-bold text-pink-600">{log.calories} <span className="text-xs font-normal">kcal</span></span>
                        {!isReadOnly && <button onClick={() => deleteLog(log.id)} className="text-xs text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded">ลบ / แก้ไข</button>}
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

  const MeasurementTracker = ({ targetUserId }) => {
    const uid = targetUserId || currentUser.id;
    const isReadOnly = uid !== currentUser.id;
    const [form, setForm] = useState({ weight: '', height: '', waist: '', chest: '', arm: '', leg: '', neck: '' });
    
    const userMeasurements = measurements.filter(m => m.userId === uid).sort((a,b) => new Date(b.date) - new Date(a.date));

    const saveMeasurement = () => {
      if(!form.weight || !form.waist || isReadOnly) return;
      const newRecord = { id: generateId(), userId: uid, date: getTodayString(), ...form };
      setMeasurements(prev => [newRecord, ...prev]);
      setForm({ weight: '', height: '', waist: '', chest: '', arm: '', leg: '', neck: '' });
      
      const btn = document.getElementById('measure-btn');
      if (btn) {
        btn.innerText = 'บันทึกเรียบร้อย!';
        setTimeout(() => btn.innerText = 'บันทึกสัดส่วนประจำสัปดาห์', 2000);
      }
    };

    return (
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isReadOnly && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">บันทึกสัดส่วนรายสัปดาห์</h2>
            <p className="text-sm text-gray-500 mb-6">กรุณาอัพเดทข้อมูลทุกวันอาทิตย์เพื่อติดตามผลลัพธ์</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="น้ำหนัก (กก.)" val={form.weight} onChange={v => setForm({...form, weight: v})} />
                <Input label="ส่วนสูง (ซม.)" val={form.height} onChange={v => setForm({...form, height: v})} />
                <Input label="รอบเอว (นิ้ว)" val={form.waist} onChange={v => setForm({...form, waist: v})} />
                <Input label="รอบอก (นิ้ว)" val={form.chest} onChange={v => setForm({...form, chest: v})} />
                <Input label="รอบแขน (นิ้ว)" val={form.arm} onChange={v => setForm({...form, arm: v})} />
                <Input label="รอบขา (นิ้ว)" val={form.leg} onChange={v => setForm({...form, leg: v})} />
                <Input label="รอบคอ (นิ้ว)" val={form.neck} onChange={v => setForm({...form, neck: v})} className="col-span-2" />
              </div>
              
              <button id="measure-btn" onClick={saveMeasurement} className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all">
                บันทึกสัดส่วนประจำสัปดาห์
              </button>
            </div>
          </div>
        )}

        <div className={`bg-blue-50 p-6 rounded-3xl border border-blue-200 ${isReadOnly ? 'col-span-1 md:col-span-2' : ''}`}>
          <h3 className="font-bold text-blue-800 mb-4">ประวัติการเปลี่ยนแปลง {isReadOnly && `ของ ${users.find(u=>u.id===uid)?.name}`}</h3>
          {userMeasurements.length === 0 ? (
            <div className="text-center text-blue-400 py-10">ยังไม่มีประวัติการบันทึก</div>
          ) : (
            <div className="space-y-4">
              {userMeasurements.map((m, idx) => (
                <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
                  {idx === 0 && <span className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-bl-lg">ล่าสุด</span>}
                  <p className="font-bold text-gray-700 text-sm mb-2">📅 วันที่: {m.date}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">น้ำหนัก: <span className="font-bold text-pink-500">{m.weight}</span></div>
                    <div className="bg-gray-50 p-2 rounded">เอว: <span className="font-bold text-blue-500">{m.waist}</span></div>
                    <div className="bg-gray-50 p-2 rounded">อก: <span className="font-bold text-green-500">{m.chest}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Input = ({ label, val, onChange, className="" }) => (
    <div className={className}>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <input type="number" value={val} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300" />
    </div>
  );

  const RankingBoard = () => {
    const allUsersScores = users.filter(u => u.role === 'user').map(u => {
      const uTdee = tdeeData[u.id] || { targetCalories: 2000 };
      const uLogs = foodLogs.filter(log => log.userId === u.id && log.date === getTodayString());
      const consumed = uLogs.reduce((acc, curr) => acc + curr.calories, 0);
      
      let score = 100 - Math.abs((uTdee.targetCalories - consumed) / 20);
      if(consumed === 0) score = 0; 

      return {
        id: u.id,
        name: u.name,
        caloriesScore: Math.round(score > 100 ? 100 : Math.max(0, score))
      };
    }).sort((a, b) => b.caloriesScore - a.caloriesScore);

    return (
      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-yellow-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">🏆 Leaderboard สุขภาพดี</h2>
          <p className="text-gray-500 text-sm">จัดอันดับความมีวินัยการคุมแคลอรี่ประจำวัน</p>
        </div>

        <div className="space-y-4">
          {allUsersScores.map((u, index) => (
            <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl ${u.id === currentUser.id ? 'bg-pink-50 border border-pink-200 shadow-sm transform scale-[1.02] transition-transform' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold w-8 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300'}`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`}
                </span>
                <div>
                  <p className={`font-bold ${u.id === currentUser.id ? 'text-pink-600' : 'text-gray-700'}`}>{u.name} {u.id === currentUser.id && '(คุณ)'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-500">{u.caloriesScore}</p>
                <p className="text-[10px] text-gray-400">คะแนนวินัย</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CoachDashboard = () => {
    const [newUserForm, setNewUserForm] = useState({ name: '', password: '', role: 'user' });
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [coachTab, setCoachTab] = useState('daily-summary'); 
    const [summaryDate, setSummaryDate] = useState(getTodayString());
    const [filterStatus, setFilterStatus] = useState('all'); 
    const [coachNotes, setCoachNotes] = useState({}); 
    const [editingNoteUserId, setEditingNoteUserId] = useState(null);
    const [tempNoteText, setTempNoteText] = useState('');

    const handleViewUser = (userId) => {
      setViewingUserId(userId);
      setActiveTab('coach-user-detail');
    };

    const handleAddUser = (e) => {
      e.preventDefault();
      if (!newUserForm.name || !newUserForm.password) return;
      
      const newId = generateId();
      const newUser = {
        id: newId,
        name: newUserForm.name,
        role: newUserForm.role || 'user',
        password: newUserForm.password
      };
      
      setUsers([...users, newUser]);
      setNewUserForm({ name: '', password: '', role: 'user' });
      
      if (newUser.role === 'user') {
        setTdeeData(prev => ({
          ...prev,
          [newId]: { bmr: 0, tdee: 0, targetCalories: 2000, profile: { gender: 'female', age: 25, height: 160, weight: 55, activity: '1.2', goal: 'maintain' } }
        }));
      }
    };

    const handleDeleteUser = (userId) => {
      setUsers(users.filter(u => u.id !== userId));
      setConfirmDeleteId(null);
    };

    const saveCoachNote = (userId) => {
      const key = `${userId}_${summaryDate}`;
      setCoachNotes(prev => ({ ...prev, [key]: tempNoteText }));
      setEditingNoteUserId(null);
      setTempNoteText('');
    };

    const memberUsers = users.filter(u => u.role === 'user');
    const managedAccounts = users.filter(u => u.id !== currentUser.id);

    const dailyUserData = memberUsers.map(user => {
      const uTdee = tdeeData[user.id] || { targetCalories: 2000 };
      const uLogs = foodLogs.filter(log => log.userId === user.id && log.date === summaryDate);
      const consumedCals = uLogs.reduce((acc, curr) => acc + curr.calories, 0);
      const totalProtein = uLogs.reduce((acc, curr) => acc + (curr.protein || 0), 0);
      const totalCarbs = uLogs.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
      const totalFat = uLogs.reduce((acc, curr) => acc + (curr.fat || 0), 0);
      const target = uTdee.targetCalories || 2000;
      
      let status = 'ontrack';
      if (uLogs.length === 0) status = 'nolog';
      else if (consumedCals > target) status = 'over';

      return {
        user,
        target,
        consumedCals,
        totalProtein,
        totalCarbs,
        totalFat,
        mealCount: uLogs.length,
        status,
        percent: Math.min(Math.round((consumedCals / target) * 100), 100),
        isOver: consumedCals > target,
        noteKey: `${user.id}_${summaryDate}`
      };
    });

    const totalMembersCount = memberUsers.length;
    const loggedCount = dailyUserData.filter(d => d.mealCount > 0).length;
    const onTrackCount = dailyUserData.filter(d => d.status === 'ontrack').length;
    const overCount = dailyUserData.filter(d => d.status === 'over').length;
    const noLogCount = dailyUserData.filter(d => d.status === 'nolog').length;
    const aggregateConsumedCals = dailyUserData.reduce((acc, curr) => acc + curr.consumedCals, 0);
    const aggregateTargetCals = dailyUserData.reduce((acc, curr) => acc + curr.target, 0);
    const aggregateProtein = dailyUserData.reduce((acc, curr) => acc + curr.totalProtein, 0);

    const filteredUserData = dailyUserData.filter(item => {
      if (filterStatus === 'all') return true;
      return item.status === filterStatus;
    });

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-400/30 text-blue-100 text-xs px-3 py-1 rounded-full font-semibold border border-blue-300/30">
                🔒 สิทธิ์ผู้ดูแลระบบ & โค้ช
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">แผงควบคุมและสรุปภาพรวมรายวัน</h2>
            <p className="text-blue-100 text-sm mt-1">ติดตามโภชนาการ วิเคราะห์แคลอรี่ และดูแลสมาชิกทุกคนได้อย่างง่ายดาย</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 self-stretch md:self-auto">
            <button 
              onClick={() => setCoachTab('daily-summary')} 
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${coachTab === 'daily-summary' ? 'bg-white text-blue-700 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              📊 สรุปภาพรวมรายวัน
            </button>
            <button 
              onClick={() => setCoachTab('members')} 
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${coachTab === 'members' ? 'bg-white text-blue-700 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              👥 จัดการสมาชิก & โค้ช ({managedAccounts.length})
            </button>
          </div>
        </div>

        {coachTab === 'daily-summary' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-2xl">📅</span>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold">เลือกวันที่ดูสรุปภาพรวม</label>
                  <input 
                    type="date" 
                    value={summaryDate}
                    onChange={(e) => setSummaryDate(e.target.value)}
                    className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                </div>
                {summaryDate === getTodayString() && (
                  <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">วันนี้</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto text-xs font-semibold">
                <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>ทั้งหมด ({totalMembersCount})</button>
                <button onClick={() => setFilterStatus('ontrack')} className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'ontrack' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600'}`}>🟢 ปกติ ({onTrackCount})</button>
                <button onClick={() => setFilterStatus('over')} className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'over' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600'}`}>⚠️ เกินเป้า ({overCount})</button>
                <button onClick={() => setFilterStatus('nolog')} className={`px-3 py-1.5 rounded-xl transition ${filterStatus === 'nolog' ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-600'}`}>⏳ ยังไม่บันทึก ({noLogCount})</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-semibold">สมาชิกที่บันทึกแล้ว</span>
                  <span className="text-xl">📝</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{loggedCount} <span className="text-sm font-normal text-gray-400">/ {totalMembersCount} คน</span></div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(loggedCount / Math.max(totalMembersCount, 1)) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-semibold">แคลอรี่รวมทุกคน</span>
                  <span className="text-xl">🔥</span>
                </div>
                <div className="text-2xl font-bold text-pink-600">{aggregateConsumedCals.toLocaleString()} <span className="text-xs font-normal text-gray-400">kcal</span></div>
                <p className="text-[11px] text-gray-400 mt-1">เป้าหมายรวม: {aggregateTargetCals.toLocaleString()} kcal</p>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-semibold">คุมในเป้าหมาย</span>
                  <span className="text-xl">🎯</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{onTrackCount} <span className="text-sm font-normal text-gray-400">คน</span></div>
                <p className="text-[11px] text-red-500 font-semibold mt-1">เกินเป้าหมาย: {overCount} คน</p>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-semibold">โปรตีนรวมวันนี้</span>
                  <span className="text-xl">💪</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{aggregateProtein} <span className="text-xs font-normal text-gray-400">g</span></div>
                <p className="text-[11px] text-gray-400 mt-1">เฉลี่ย: {loggedCount > 0 ? Math.round(aggregateProtein / loggedCount) : 0}g / คน</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span>📋</span> รายงานรายบุคคล ประจำวันที่ {summaryDate}
                </h3>
                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-semibold">
                  แสดงผล {filteredUserData.length} รายการ
                </span>
              </div>

              {filteredUserData.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  ไม่พบข้อมูลสมาชิกในสถานะนี้ของวันที่เลือก
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUserData.map(item => {
                    const savedNote = coachNotes[item.noteKey];
                    const isEditingNote = editingNoteUserId === item.user.id;

                    return (
                      <div 
                        key={item.user.id} 
                        className={`p-5 rounded-3xl border transition-all ${
                          item.status === 'over' 
                            ? 'bg-red-50/40 border-red-200' 
                            : item.status === 'nolog'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-200 hover:border-blue-200 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-blue-200 flex items-center justify-center font-bold text-gray-700">
                              👤
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-base">{item.user.name}</h4>
                              <p className="text-xs text-gray-400">บันทึกอาหาร {item.mealCount} มื้อ</p>
                            </div>
                          </div>

                          <div>
                            {item.status === 'over' && (
                              <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-full font-bold">⚠️ เกินเป้า</span>
                            )}
                            {item.status === 'ontrack' && (
                              <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">🟢 ปกติ</span>
                            )}
                            {item.status === 'nolog' && (
                              <span className="bg-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold">⏳ ยังไม่บันทึก</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 bg-white/80 p-3.5 rounded-2xl border border-gray-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">พลังงานที่ทาน:</span>
                            <span className={`font-bold ${item.isOver ? 'text-red-600' : 'text-pink-600'}`}>
                              {item.consumedCals.toLocaleString()} / {item.target.toLocaleString()} kcal
                            </span>
                          </div>

                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${item.isOver ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-green-400'}`}
                              style={{ width: `${item.percent}%` }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-gray-100">
                            <div><span className="text-gray-400">💪 P:</span> <span className="font-bold text-pink-600">{item.totalProtein}g</span></div>
                            <div><span className="text-gray-400">🍞 C:</span> <span className="font-bold text-blue-500">{item.totalCarbs}g</span></div>
                            <div><span className="text-gray-400">🥑 F:</span> <span className="font-bold text-amber-500">{item.totalFat}g</span></div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100">
                          {isEditingNote ? (
                            <div className="space-y-2">
                              <textarea
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                placeholder="พิมพ์ข้อความแนะนำสำหรับสมาชิกท่านนี้..."
                                className="w-full p-2.5 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none h-16"
                              ></textarea>
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEditingNoteUserId(null)} 
                                  className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300"
                                >
                                  ยกเลิก
                                </button>
                                <button 
                                  onClick={() => saveCoachNote(item.user.id)} 
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-bold hover:bg-blue-700 shadow-sm"
                                >
                                  บันทึกข้อความ
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex-1 pr-2">
                                {savedNote ? (
                                  <p className="text-blue-800 bg-blue-50 p-2 rounded-xl border border-blue-100 font-medium">
                                    💬 <b>คำแนะนำโค้ช:</b> {savedNote}
                                  </p>
                                ) : (
                                  <span className="text-gray-400 italic">ยังไม่มีข้อความส่งถึงสมาชิก</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingNoteUserId(item.user.id);
                                    setTempNoteText(savedNote || '');
                                  }}
                                  className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                                >
                                  {savedNote ? '✏️ แก้ไขคำแนะนำ' : '💬 ให้คำแนะนำ'}
                                </button>
                                <button 
                                  onClick={() => handleViewUser(item.user.id)} 
                                  className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                                >
                                  🔍 ดูเชิงลึก
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {coachTab === 'members' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">✨ เพิ่มผู้ใช้งานใหม่ (สมาชิก / โค้ช)</h3>
              <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-600 mb-1">ชื่อผู้ใช้งาน</label>
                  <input 
                    type="text" 
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                    placeholder="เช่น โค้ชต้นไม้ หรือ น้องแจน"
                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 border border-gray-200 text-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-600 mb-1">ประเภทบัญชี</label>
                  <select 
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 border border-gray-200 text-sm font-semibold text-gray-700"
                  >
                    <option value="user">👤 สมาชิก (User)</option>
                    <option value="coach">🧢 โค้ช (Coach)</option>
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-600 mb-1">ตั้งรหัสผ่าน</label>
                  <input 
                    type="text" 
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                    placeholder="เช่น pass1234"
                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 border border-gray-200 text-sm"
                  />
                </div>
                <button type="submit" disabled={!newUserForm.name || !newUserForm.password} className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm">
                  + เพิ่มบัญชี
                </button>
              </form>
            </div>

            <h3 className="text-xl font-bold text-gray-800 pt-2">👥 รายชื่อผู้ใช้งานทั้งหมด ({managedAccounts.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {managedAccounts.map(user => {
                const isCoachRole = user.role === 'coach';
                const uTdee = tdeeData[user.id] || { targetCalories: 2000, profile: { goal: 'maintain' } };
                const uLogs = foodLogs.filter(log => log.userId === user.id && log.date === getTodayString());
                const consumed = uLogs.reduce((acc, curr) => acc + curr.calories, 0);
                const percent = Math.min((consumed / uTdee.targetCalories) * 100, 100);
                
                const goalText = uTdee.profile.goal === 'lose' ? 'ลดน้ำหนัก' : 
                                 uTdee.profile.goal === 'lose_fast' ? 'ลดน้ำหนักเร่งด่วน' :
                                 uTdee.profile.goal === 'gain' ? 'เพิ่มน้ำหนัก' : 'รักษาน้ำหนัก';

                return (
                  <div key={user.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 ${isCoachRole ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-500'} rounded-full flex items-center justify-center text-xl font-bold`}>
                        {isCoachRole ? '🧢' : '👤'}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isCoachRole ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                        {isCoachRole ? '🧢 โค้ช' : '👤 สมาชิก'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                    
                    {!isCoachRole ? (
                      <>
                        <p className="text-sm text-gray-500 mb-4">เป้าหมาย: {goalText} ({uTdee.targetCalories} kcal)</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm"><span className="text-gray-500">ทานวันนี้:</span><span className={`font-semibold ${consumed > uTdee.targetCalories ? 'text-red-500' : 'text-gray-700'}`}>{consumed} kcal</span></div>
                          <div className="w-full bg-gray-100 h-2 rounded-full"><div className={`h-2 rounded-full ${consumed > uTdee.targetCalories ? 'bg-red-400' : 'bg-blue-400'}`} style={{width: `${percent}%`}}></div></div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 my-4 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                        🛡️ สิทธิ์ผู้ดูแล/โค้ช สามารถเข้าถึงแผงควบคุมและแนะนำสมาชิกได้
                      </p>
                    )}

                    {confirmDeleteId === user.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteUser(user.id)} className="w-full bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition">ยืนยันลบ</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-300 transition">ยกเลิก</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!isCoachRole && (
                          <button onClick={() => handleViewUser(user.id)} className="flex-[2] bg-blue-50 text-blue-600 py-2 rounded-xl text-sm font-medium hover:bg-blue-100 transition">รายละเอียดเชิงลึก</button>
                        )}
                        <button onClick={() => setConfirmDeleteId(user.id)} className={`py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition ${isCoachRole ? 'w-full bg-red-50 text-red-500' : 'flex-1 bg-red-50 text-red-500'}`}>ลบ</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const CoachUserDetail = () => {
    return (
      <div className="space-y-8 animate-fadeIn">
         <div className="flex gap-4 border-b border-gray-200 pb-4">
            <div className="text-xl font-bold text-gray-800">ข้อมูลของ: {users.find(u=>u.id===viewingUserId)?.name}</div>
         </div>
         <Dashboard targetUserId={viewingUserId} />
         <TDEECalculator targetUserId={viewingUserId} />
         <MeasurementTracker targetUserId={viewingUserId} />
      </div>
    )
  }

  return (
    <Layout>
      {currentUser.role !== 'user' ? (
        activeTab === 'coach-user-detail' ? <CoachUserDetail /> : <CoachDashboard />
      ) : (
        <div className="pb-10">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'ai' && <AIFoodScanner />}
          {activeTab === 'tdee' && <TDEECalculator />}
          {activeTab === 'measure' && <MeasurementTracker />}
          {activeTab === 'rank' && <RankingBoard />}
        </div>
      )}
    </Layout>
  );
}
