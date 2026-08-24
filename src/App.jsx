import React, { useState, useMemo } from 'react';
import { 
  User, Plus, Trash2, Calendar, CheckCircle, AlertCircle, 
  TrendingUp, Award, Utensils, Activity, MessageSquare, 
  Shield, LogOut, Search, Filter, Sparkles, UserPlus, Lock, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

// --- MOCK INITIAL DATA ---
const TODAY_STR = new Date().toISOString().split('T')[0];

const INITIAL_USERS = [
  { id: '1', name: 'Admin (ระบบ)', username: 'admin', password: '1234', role: 'coach', targetCalories: 2200, targetProtein: 140 },
  { id: '2', name: 'น้องพลอย', username: 'ploy', password: '1234', role: 'user', targetCalories: 1500, targetProtein: 100 },
  { id: '3', name: 'คุณต้น', username: 'ton', password: '1234', role: 'user', targetCalories: 2000, targetProtein: 150 },
  { id: '4', name: 'คุณมุก', username: 'mook', password: '1234', role: 'user', targetCalories: 1600, targetProtein: 110 }
];

const INITIAL_FOOD_LOGS = [
  { id: '101', userId: '2', date: TODAY_STR, foodName: 'อกไก่ปั่น + ข้าวกล้อง', calories: 450, protein: 45, type: 'มื้อเช้า' },
  { id: '102', userId: '2', date: TODAY_STR, foodName: 'สลัดทูน่าไข่ต้ม', calories: 350, protein: 30, type: 'มื้อเที่ยง' },
  { id: '103', userId: '2', date: TODAY_STR, foodName: 'สเต็กบอสแซลมอน', calories: 550, protein: 40, type: 'มื้อเย็น' },
  { id: '104', userId: '3', date: TODAY_STR, foodName: 'เวย์โปรตีน 2 สกู๊ป', calories: 240, protein: 48, type: 'ของว่าง' },
  { id: '105', userId: '3', date: TODAY_STR, foodName: 'ข้าวผัดอกไก่ไข่ดาว', calories: 650, protein: 35, type: 'มื้อเที่ยง' },
  { id: '106', userId: '4', date: TODAY_STR, foodName: 'ชาบูบุฟเฟต์ (เน้นเนื้อหมู)', calories: 1100, protein: 60, type: 'มื้อเย็น' }
];

const INITIAL_BODY_LOGS = [
  { id: '201', userId: '2', date: '2026-08-10', weight: 55.5, waist: 68, hip: 92, arm: 25 },
  { id: '202', userId: '2', date: '2026-08-17', weight: 54.8, waist: 67, hip: 91, arm: 24.8 },
  { id: '203', userId: '2', date: TODAY_STR, weight: 54.2, waist: 66, hip: 90, arm: 24.5 }
];

export default function App() {
  // State Management
  const [users, setUsers] = useState(INITIAL_USERS);
  const [foodLogs, setFoodLogs] = useState(INITIAL_FOOD_LOGS);
  const [bodyLogs, setBodyLogs] = useState(INITIAL_BODY_LOGS);
  const [coachNotes, setCoachNotes] = useState({}); // { "userId_date": "note string" }

  // Auth State
  const [currentUser, setCurrentUser] = useState(INITIAL_USERS[0]); // Default login as Admin (Coach)
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState('dailySummary'); // default tab for coach
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [statusFilter, setStatusFilter] = useState('all'); // all, ontrack, exceeded, nolog

  // Form States
  const [newFood, setNewFood] = useState({ foodName: '', calories: '', protein: '', type: 'มื้อเช้า' });
  const [newBody, setNewBody] = useState({ weight: '', waist: '', hip: '', arm: '' });
  const [newMember, setNewMember] = useState({ 
    name: '', username: '', password: '', role: 'user', targetCalories: 1800, targetProtein: 120 
  });
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Auth Handler
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      setCurrentUser(found);
      setIsLoggedIn(true);
      setLoginError('');
      setActiveTab(found.role === 'coach' ? 'dailySummary' : 'foodLog');
    } else {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginForm({ username: '', password: '' });
  };

  // Calculations for Coach Daily Overview
  const isCoach = currentUser?.role === 'coach';

  const dailyUserSummaries = useMemo(() => {
    const memberUsers = users.filter(u => u.role === 'user');
    
    return memberUsers.map(user => {
      const userLogs = foodLogs.filter(f => f.userId === user.id && f.date === selectedDate);
      const totalCal = userLogs.reduce((sum, item) => sum + Number(item.calories || 0), 0);
      const totalProt = userLogs.reduce((sum, item) => sum + Number(item.protein || 0), 0);
      const hasLogged = userLogs.length > 0;
      const isExceeded = totalCal > user.targetCalories;

      let status = 'ontrack';
      if (!hasLogged) status = 'nolog';
      else if (isExceeded) status = 'exceeded';

      return {
        user,
        logs: userLogs,
        totalCal,
        totalProt,
        hasLogged,
        isExceeded,
        status
      };
    });
  }, [users, foodLogs, selectedDate]);

  const overviewMetrics = useMemo(() => {
    const totalMembers = users.filter(u => u.role === 'user').length;
    const loggedCount = dailyUserSummaries.filter(s => s.hasLogged).length;
    const exceededCount = dailyUserSummaries.filter(s => s.isExceeded).length;
    const onTrackCount = dailyUserSummaries.filter(s => s.hasLogged && !s.isExceeded).length;
    const grandCal = dailyUserSummaries.reduce((sum, s) => sum + s.totalCal, 0);
    const grandProt = dailyUserSummaries.reduce((sum, s) => sum + s.totalProt, 0);

    return { totalMembers, loggedCount, exceededCount, onTrackCount, grandCal, grandProt };
  }, [dailyUserSummaries, users]);

  const filteredSummaries = useMemo(() => {
    if (statusFilter === 'all') return dailyUserSummaries;
    return dailyUserSummaries.filter(s => s.status === statusFilter);
  }, [dailyUserSummaries, statusFilter]);

  // Actions
  const handleAddFood = (e) => {
    e.preventDefault();
    if (!newFood.foodName || !newFood.calories) return;
    const item = {
      id: Date.now().toString(),
      userId: currentUser.id,
      date: TODAY_STR,
      foodName: newFood.foodName,
      calories: Number(newFood.calories),
      protein: Number(newFood.protein || 0),
      type: newFood.type
    };
    setFoodLogs([item, ...foodLogs]);
    setNewFood({ foodName: '', calories: '', protein: '', type: 'มื้อเช้า' });
  };

  const handleDeleteFood = (id) => {
    setFoodLogs(foodLogs.filter(f => f.id !== id));
  };

  const handleAddBody = (e) => {
    e.preventDefault();
    if (!newBody.weight) return;
    const item = {
      id: Date.now().toString(),
      userId: currentUser.id,
      date: TODAY_STR,
      weight: Number(newBody.weight),
      waist: Number(newBody.waist || 0),
      hip: Number(newBody.hip || 0),
      arm: Number(newBody.arm || 0)
    };
    setBodyLogs([item, ...bodyLogs]);
    setNewBody({ weight: '', waist: '', hip: '', arm: '' });
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.username || !newMember.password) return;
    const user = {
      id: Date.now().toString(),
      name: newMember.name,
      username: newMember.username,
      password: newMember.password,
      role: newMember.role,
      targetCalories: Number(newMember.targetCalories || 2000),
      targetProtein: Number(newMember.targetProtein || 120)
    };
    setUsers([...users, user]);
    setNewMember({ name: '', username: '', password: '', role: 'user', targetCalories: 1800, targetProtein: 120 });
    setShowAddMemberModal(false);
  };

  const handleDeleteUser = (id) => {
    if (users.length <= 1) return alert('ไม่สามารถลบผู้ใช้งานทั้งหมดได้');
    setUsers(users.filter(u => u.id !== id));
  };

  const handleSaveNote = (userId, noteText) => {
    setCoachNotes({
      ...coachNotes,
      [`${userId}_${selectedDate}`]: noteText
    });
  };

  // Filter current user specific logs
  const myFoodLogs = foodLogs.filter(f => f.userId === currentUser?.id && f.date === TODAY_STR);
  const myTotalCal = myFoodLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const myTotalProt = myFoodLogs.reduce((acc, curr) => acc + curr.protein, 0);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">PastelFit Login</h1>
            <p className="text-sm text-slate-500 mt-1">ระบบติดตามสุขภาพ & โภชนาการสำหรับโค้ชและสมาชิก</p>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3 text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Username</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition"
                placeholder="กรอกชื่อผู้ใช้ (เช่น admin, ploy)"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition"
                placeholder="กรอกรหัสผ่าน"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">💡 บัญชีทดสอบระบบ:</p>
            <p>• <b>Admin (Coach):</b> User: <code className="bg-slate-200 px-1 rounded">admin</code> | Pass: <code className="bg-slate-200 px-1 rounded">1234</code></p>
            <p>• <b>สมาชิกทั่วไป:</b> User: <code className="bg-slate-200 px-1 rounded">ploy</code> | Pass: <code className="bg-slate-200 px-1 rounded">1234</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100">
              P
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">PastelFit</h1>
              <span className="text-xs text-indigo-500 font-medium">Health & Nutrition Tracker</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              {currentUser.role === 'coach' ? (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  👑 Coach
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  👤 Member
                </span>
              )}
              <span className="text-sm font-semibold text-slate-700">{currentUser.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-100 mb-6">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto scrollbar-none py-2">
          {isCoach && (
            <>
              <button 
                onClick={() => setActiveTab('dailySummary')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'dailySummary' 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Activity className="w-4 h-4" /> 📊 สรุปภาพรวมรายวัน
              </button>

              <button 
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'members' 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <UserPlus className="w-4 h-4" /> 👥 จัดการสมาชิก & โค้ช
              </button>
            </>
          )}

          <button 
            onClick={() => setActiveTab('foodLog')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'foodLog' 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Utensils className="w-4 h-4" /> 🍎 บันทึกอาหาร
          </button>

          <button 
            onClick={() => setActiveTab('bodyTrack')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'bodyTrack' 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> 📏 ติดตามสัดส่วน
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4">

        {/* --- TAB 1: COACH DAILY OVERVIEW --- */}
        {activeTab === 'dailySummary' && isCoach && (
          <div className="space-y-6">
            {/* Header & Date Selector */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>📊</span> สรุปภาพรวมสุขภาพทุกคนรายวัน
                </h2>
                <p className="text-xs text-slate-400 mt-1">ประมวลผลโภชนาการและการคุมแคลอรี่ของสมาชิกทุกคนสำหรับโค้ช</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">วันที่:</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-indigo-600 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-semibold text-slate-400">สมาชิกบันทึกแล้ว</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-slate-800">{overviewMetrics.loggedCount}</span>
                  <span className="text-xs text-slate-400">/ {overviewMetrics.totalMembers} คน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${(overviewMetrics.loggedCount / (overviewMetrics.totalMembers || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-semibold text-slate-400">คุมแคลอรี่ได้ดี (On Track)</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-emerald-600">{overviewMetrics.onTrackCount}</span>
                  <span className="text-xs text-slate-400">คน</span>
                </div>
                <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2 font-medium">
                  อยู่ในเป้าหมาย
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-semibold text-slate-400">ทานเกินเป้าหมาย (Exceeded)</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-rose-500">{overviewMetrics.exceededCount}</span>
                  <span className="text-xs text-slate-400">คน</span>
                </div>
                <p className="text-[10px] text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-2 font-medium">
                  ต้องระวัง
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-semibold text-slate-400">โปรตีนรวมทั้งหมด</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-indigo-600">{overviewMetrics.grandProt}</span>
                  <span className="text-xs text-slate-400">กรัม</span>
                </div>
                <p className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-2 font-medium">
                  รวมทุกคนวันนี้
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> กรอง:
              </span>
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'ontrack', label: '✅ อยู่ในเป้าหมาย' },
                { id: 'exceeded', label: '⚠️ ทานเกินเป้า' },
                { id: 'nolog', label: '❌ ยังไม่บันทึก' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                    statusFilter === f.id 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Members Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSummaries.map(({ user, logs, totalCal, totalProt, hasLogged, isExceeded, status }) => {
                const calPercent = Math.min(Math.round((totalCal / user.targetCalories) * 100), 100);
                const noteKey = `${user.id}_${selectedDate}`;
                const currentNote = coachNotes[noteKey] || '';

                return (
                  <div key={user.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{user.name}</h3>
                          <p className="text-xs text-slate-400">เป้าหมาย: {user.targetCalories} kcal | {user.targetProtein}g โปรตีน</p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {status === 'nolog' && (
                        <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold">
                          ยังไม่ได้บันทึก
                        </span>
                      )}
                      {status === 'ontrack' && (
                        <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> อยู่ในเป้าหมาย
                        </span>
                      )}
                      {status === 'exceeded' && (
                        <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> ทานเกินเป้า
                        </span>
                      )}
                    </div>

                    {/* Calorie & Protein Progress */}
                    {hasLogged ? (
                      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-600">แคลอรี่ที่ได้รับ</span>
                            <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {totalCal} / {user.targetCalories} kcal ({Math.round((totalCal/user.targetCalories)*100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all ${isExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${calPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">โปรตีนรวม:</span>
                          <span className="font-bold text-indigo-600">{totalProt} / {user.targetProtein} g</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                        ยังไม่มีรายการบันทึกอาหารในวันที่เลือก
                      </div>
                    )}

                    {/* Food list preview */}
                    {logs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-400">รายการอาหารที่ทาน:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {logs.map(l => (
                            <span key={l.id} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                              {l.foodName} ({l.calories}k)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coach Feedback Input */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> คำแนะนำจากโค้ช (Coach Note):
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="พิมพ์คำแนะนำประจำวัน..."
                          defaultValue={currentNote}
                          onBlur={(e) => handleSaveNote(user.id, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 2: MEMBERS & COACH MANAGEMENT --- */}
        {activeTab === 'members' && isCoach && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>👥</span> จัดการสมาชิกและโค้ชในระบบ
                </h2>
                <p className="text-xs text-slate-400 mt-1">เพิ่ม ลบ หรือแก้ไขข้อมูลเป้าหมายของผู้ใช้งานและโค้ชในทีม</p>
              </div>
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
              </button>
            </div>

            {/* Users List Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-4">ผู้ใช้งาน</th>
                      <th className="p-4">บทบาท (Role)</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">เป้าหมาย Cal/Protein</th>
                      <th className="p-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                        </td>
                        <td className="p-4">
                          {u.role === 'coach' ? (
                            <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                              👑 โค้ช / Admin
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                              👤 สมาชิกทั่วไป
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500">{u.username}</td>
                        <td className="p-4 text-xs font-medium">
                          <span className="text-indigo-600 font-bold">{u.targetCalories}</span> kcal / <span className="text-purple-600 font-bold">{u.targetProtein}g</span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="ลบสมาชิก"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Add Member */}
            {showAddMemberModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" /> เพิ่มสมาชิก / โค้ชใหม่
                  </h3>

                  <form onSubmit={handleAddMember} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล / ชื่อเล่น</label>
                      <input 
                        type="text" required
                        placeholder="เช่น โค้ชใหม่, น้องต่าย"
                        value={newMember.name}
                        onChange={e => setNewMember({...newMember, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                        <input 
                          type="text" required
                          placeholder="ชื่อเข้าใช้งาน"
                          value={newMember.username}
                          onChange={e => setNewMember({...newMember, username: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                        <input 
                          type="password" required
                          placeholder="รหัสผ่าน"
                          value={newMember.password}
                          onChange={e => setNewMember({...newMember, password: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">สิทธิ์การใช้งาน (Role)</label>
                      <select 
                        value={newMember.role}
                        onChange={e => setNewMember({...newMember, role: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500 font-semibold text-slate-700"
                      >
                        <option value="user">👤 สมาชิกทั่วไป (Member)</option>
                        <option value="coach">👑 โค้ช / ผู้ดูแลระบบ (Coach)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">เป้าหมาย Cal (kcal)</label>
                        <input 
                          type="number"
                          value={newMember.targetCalories}
                          onChange={e => setNewMember({...newMember, targetCalories: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">เป้าหมาย โปรตีน (g)</label>
                        <input 
                          type="number"
                          value={newMember.targetProtein}
                          onChange={e => setNewMember({...newMember, targetProtein: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <button 
                        type="button"
                        onClick={() => setShowAddMemberModal(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-xs transition"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-100 transition"
                      >
                        บันทึกผู้ใช้งาน
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: FOOD LOG & AI SCANNER --- */}
        {activeTab === 'foodLog' && (
          <div className="space-y-6">
            {/* My Daily Stats */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">สรุปโภชนาการของคุณวันนี้</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-500 font-semibold">แคลอรี่วันนี้</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{myTotalCal} <span className="text-xs font-normal text-slate-400">/ {currentUser.targetCalories} kcal</span></p>
                  <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-2">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((myTotalCal/currentUser.targetCalories)*100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-500 font-semibold">โปรตีนวันนี้</p>
                  <p className="text-2xl font-black text-purple-700 mt-1">{myTotalProt} <span className="text-xs font-normal text-slate-400">/ {currentUser.targetProtein} g</span></p>
                  <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min((myTotalProt/currentUser.targetProtein)*100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Food Form */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-indigo-500" /> บันทึกมื้ออาหาร
              </h3>
              <form onSubmit={handleAddFood} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input 
                  type="text" placeholder="ชื่ออาหาร (เช่น ข้าวผัดอกไก่)" required
                  value={newFood.foodName} onChange={e => setNewFood({...newFood, foodName: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <input 
                  type="number" placeholder="แคลอรี่ (kcal)" required
                  value={newFood.calories} onChange={e => setNewFood({...newFood, calories: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <input 
                  type="number" placeholder="โปรตีน (กรัม)" 
                  value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm rounded-xl py-2 transition shadow-sm">
                  + เพิ่มรายการ
                </button>
              </form>
            </div>

            {/* Food Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-3">รายการอาหารวันนี้</h3>
              {myFoodLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">ยังไม่มีการบันทึกอาหารในวันนี้</p>
              ) : (
                <div className="space-y-2">
                  {myFoodLogs.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.foodName}</p>
                        <p className="text-xs text-slate-400">{item.type || 'มื้ออาหาร'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-indigo-600 text-sm">{item.calories} kcal</p>
                          <p className="text-xs text-purple-600 font-semibold">{item.protein}g โปรตีน</p>
                        </div>
                        <button onClick={() => handleDeleteFood(item.id)} className="text-slate-300 hover:text-rose-500 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: BODY TRACKING --- */}
        {activeTab === 'bodyTrack' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> อัปเดตสัดส่วนรายสัปดาห์
              </h3>
              <form onSubmit={handleAddBody} className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <input 
                  type="number" step="0.1" placeholder="น้ำหนัก (kg)" required
                  value={newBody.weight} onChange={e => setNewBody({...newBody, weight: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <input 
                  type="number" step="0.1" placeholder="รอบเอว (นิ้ว)" 
                  value={newBody.waist} onChange={e => setNewBody({...newBody, waist: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <input 
                  type="number" step="0.1" placeholder="สะโพก (นิ้ว)" 
                  value={newBody.hip} onChange={e => setNewBody({...newBody, hip: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <input 
                  type="number" step="0.1" placeholder="ต้นแขน (นิ้ว)" 
                  value={newBody.arm} onChange={e => setNewBody({...newBody, arm: e.target.value})}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button type="submit" className="col-span-2 md:col-span-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm rounded-xl py-2 transition">
                  บันทึกสัดส่วน
                </button>
              </form>
            </div>

            {/* Progress Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">กราฟการเปลี่ยนแปลงน้ำหนัก</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyLogs.filter(b => b.userId === currentUser.id)}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
