'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Twitter, LogOut, ChevronDown, ChevronUp, Zap, Copy, Calendar, Settings, X, BarChart3, CheckCircle, ArrowRight, Trophy } from 'lucide-react';

const COLORS = {
  chatgpt: '#10A37F', 
  gemini: '#2563EB',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [username, setUsername] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | '30days' | '7days'>('30days');
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingType, setRankingType] = useState<'total' | 'daily'>('daily');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token);
        fetchLogs();
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token);
        fetchLogs();
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchRanking();
  }, [rankingType, session]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]);
    setSession(null);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('chat_logs').select('*').order('created_at', { ascending: true });
    if (data) setLogs(data);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data && data.username) setUsername(data.username);
    else setUsername(session?.user?.email?.split('@')[0] || '');
  };

  const fetchRanking = async () => {
    const { data, error } = await supabase.rpc(rankingType === 'total' ? 'get_total_ranking' : 'get_daily_ranking');
    if (error) console.error(error);
    else setRankingData(data || []);
  };

  const updateProfile = async () => {
    if (!session) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        username: username,
        updated_at: new Date().toISOString()
      });
    setIsSaving(false);
    if (error) alert('Error saving profile');
    else {
      alert('Saved! / 保存しました');
      setIsProfileOpen(false);
      fetchRanking();
    }
  };

  const connectExtension = () => {
    const data = { accessToken: accessToken, refreshToken: refreshToken };
    const event = new CustomEvent('AI_TRACKER_TOKEN', { detail: JSON.stringify(data) });
    window.dispatchEvent(event);
    alert('Tokens sent to extension! \n拡張機能に認証情報を送信しました');
  };

  const { filteredCounts, chartData } = useMemo(() => {
    const now = new Date();
    const filteredLogs = logs.filter(log => {
      if (dateRange === 'all') return true;
      const logDate = new Date(log.created_at);
      const diffTime = Math.abs(now.getTime() - logDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= (dateRange === '30days' ? 30 : 7);
    });

    const counts = {
      total: filteredLogs.length,
      chatgpt: filteredLogs.filter(l => l.service === 'chatgpt').length,
      gemini: filteredLogs.filter(l => l.service === 'gemini').length,
    };

    const groupedData: { [key: string]: { date: string; chatgpt: number; gemini: number } } = {};
    filteredLogs.forEach((log) => {
      const dateObj = new Date(log.created_at);
      let key = '';
      if (groupBy === 'daily') key = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      else if (groupBy === 'weekly') {
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dateObj.setDate(diff));
        key = `${monday.getMonth() + 1}/${monday.getDate()} W`;
      } else if (groupBy === 'monthly') key = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}`;

      if (!groupedData[key]) groupedData[key] = { date: key, chatgpt: 0, gemini: 0 };
      if (log.service === 'chatgpt') groupedData[key].chatgpt += 1;
      if (log.service === 'gemini') groupedData[key].gemini += 1;
    });
    return { filteredCounts: counts, chartData: Object.values(groupedData) };
  }, [logs, dateRange, groupBy]);

  const shareOnX = () => {
    const text = `My AI Learning Stats: ChatGPT ${filteredCounts.chatgpt}, Gemini ${filteredCounts.gemini} (${dateRange}) 📊 #AIStack #AIChatTracker`;
    const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, '_blank');
  };

  // ▼▼▼ 未ログイン時 (LP) ▼▼▼
  if (!session) {
    return (
      <div className="min-h-screen bg-white font-sans text-gray-800">
        <header className="border-b py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><BarChart3 size={24} /></div>
              AI Chat Tracker
            </div>
            <button onClick={handleGoogleLogin} className="text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2">Login</button>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-gray-900">
              Visualize Your<br/>
              AI Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Automatically.</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              AI学習を、自動で可視化する。<br className="hidden md:block"/>
              Track your ChatGPT & Gemini usage habits automatically.
            </p>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">Steps</span>
                2 Steps to Start / 利用開始の2ステップ
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <span className="text-xs font-bold text-blue-600 ml-1">STEP 1</span>
                  <a href="https://chromewebstore.google.com/detail/doidkbcadhfgjlgadcgeciogckmncllo" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-xl font-bold text-sm md:text-base shadow-lg hover:bg-gray-800 transition-all hover:-translate-y-1">
                    Install Extension <ArrowRight size={18} />
                  </a>
                </div>
                <div className="hidden md:flex text-gray-300 pt-5"><ArrowRight size={24} /></div>
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <span className="text-xs font-bold text-blue-600 ml-1">STEP 2</span>
                  <button onClick={handleGoogleLogin} className="flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 px-6 py-4 rounded-xl font-bold text-sm md:text-base shadow-sm hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all hover:-translate-y-1 group">
                    <GoogleLogo /> <span className="group-hover:text-gray-900">Connect with Google</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">Free & Private / 完全無料・個人情報は保存しません</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="relative rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-gray-50 aspect-[4/3] group">
               <img src="/images/dashboard-preview.png" alt="Dashboard Preview" className="object-cover w-full h-full" />
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-20 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Track?</h2>
              <p className="text-gray-500">AI interaction is a new skill. / AIとの対話は新しいスキルです。</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard icon={<Zap className="w-8 h-8 text-yellow-500" />} title="Auto Tracking" desc="No manual entry needed. / 意識せず自動で記録。" />
              <FeatureCard icon={<BarChart3 className="w-8 h-8 text-blue-500" />} title="Visualize Growth" desc="Check daily & weekly stats. / 習慣をグラフで確認。" />
              <FeatureCard icon={<CheckCircle className="w-8 h-8 text-green-500" />} title="Multi-Platform" desc="Supports ChatGPT & Gemini. / 複数のAIに対応。" />
            </div>
          </div>
        </section>

        <footer className="bg-white py-12 border-t">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">&copy; 2025 AI Chat Tracker</p>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-500 hover:text-blue-600">Privacy Policy</a>
              <a href="https://chromewebstore.google.com/detail/doidkbcadhfgjlgadcgeciogckmncllo" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600">Chrome Web Store</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ▼▼▼ ログイン後 (ダッシュボード) ▼▼▼
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm relative">
          <div className="flex items-center gap-3">
            {session.user.user_metadata.avatar_url && (
              <img src={session.user.user_metadata.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border" />
            )}
            <div>
              <h1 className="text-lg font-bold">{username || 'Guest'}</h1>
              <p className="text-xs text-gray-500">Log Dashboard</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={shareOnX} className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-800 flex items-center gap-2 shadow-md transition-transform hover:scale-105">
              <Twitter size={16} /> Share
            </button>
            <button onClick={() => setIsProfileOpen(true)} className="text-gray-400 hover:text-blue-500 transition-colors"><Settings size={20} /></button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>

          {/* Profile Modal */}
          {isProfileOpen && (
            <div className="absolute top-16 right-4 z-10 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-700">Settings</h3>
                <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
              </div>
              <p className="text-xs text-gray-500 mb-2">Display name for ranking / ランキング表示名</p>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm mb-3 focus:outline-none focus:border-blue-500" placeholder="Enter username" />
              <button onClick={updateProfile} disabled={isSaving} className="w-full bg-blue-600 text-white rounded p-2 text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Connection Settings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition-colors">
            <span className="flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> Connection Settings / 接続設定</span>
            {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isSettingsOpen && (
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <button onClick={connectExtension} className="w-full md:w-auto bg-yellow-400 text-white px-6 py-2 rounded hover:bg-yellow-500 flex items-center justify-center gap-2 font-bold shadow-sm transition-colors">
                  Auto Connect / 自動接続
                </button>
                <div className="flex-1 flex gap-2 w-full">
                  <input readOnly value={accessToken} className="flex-1 p-2 text-xs bg-gray-50 border border-gray-200 rounded text-gray-400 font-mono" />
                  <button onClick={() => navigator.clipboard.writeText(accessToken)} className="px-3 py-2 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1"><Copy size={14}/></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Dashboard */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 p-1 rounded-lg inline-flex">
              <FilterTab label="7 Days" active={dateRange === '7days'} onClick={() => setDateRange('7days')} />
              <FilterTab label="30 Days" active={dateRange === '30days'} onClick={() => setDateRange('30days')} />
              <FilterTab label="All Time" active={dateRange === 'all'} onClick={() => setDateRange('all')} />
            </div>
            <span className="text-xs text-gray-400 ml-2 flex items-center gap-1"><Calendar size={12}/> {dateRange === 'all' ? 'All Logs' : `Last ${dateRange === '30days' ? '30' : '7'} days`}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Chats" count={filteredCounts.total} color="border-gray-800" textColor="text-gray-800" />
            <StatCard title="ChatGPT" count={filteredCounts.chatgpt} color={`border-[${COLORS.chatgpt}]`} textColor="text-[#10A37F]" />
            <StatCard title="Gemini" count={filteredCounts.gemini} color={`border-[${COLORS.gemini}]`} textColor="text-[#2563EB]" />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">📊 Activity / 推移</h3>
              <div className="flex bg-gray-100 p-1 rounded-lg text-xs">
                {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                  <button key={mode} onClick={() => setGroupBy(mode)} className={`px-3 py-1 rounded-md transition-all ${groupBy === mode ? 'bg-white font-bold shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#9ca3af" axisLine={false} tickLine={false} dy={10} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="chatgpt" name="ChatGPT" stackId="a" fill={COLORS.chatgpt} radius={[0, 0, 4, 4]} barSize={40} />
                  <Bar dataKey="gemini" name="Gemini" stackId="a" fill={COLORS.gemini} radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Trophy className="text-yellow-500" /> Ranking
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg text-xs">
                <button onClick={() => setRankingType('daily')} className={`px-3 py-1 rounded-md transition-all ${rankingType === 'daily' ? 'bg-white font-bold shadow-sm text-gray-800' : 'text-gray-500'}`}>Daily</button>
                <button onClick={() => setRankingType('total')} className={`px-3 py-1 rounded-md transition-all ${rankingType === 'total' ? 'bg-white font-bold shadow-sm text-gray-800' : 'text-gray-500'}`}>Total</button>
              </div>
            </div>
            <div className="space-y-3">
              {rankingData.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}>{index + 1}</div>
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full border" /> : <div className="w-8 h-8 rounded-full bg-gray-200" />}
                      <span className="font-medium text-sm text-gray-700">
                        {user.username}
                        {session?.user?.user_metadata?.full_name === user.username && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">YOU</span>}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-gray-900">{user.count} <span className="text-xs text-gray-400 font-normal">chats</span></div>
                </div>
              ))}
              {rankingData.length === 0 && <div className="text-center text-gray-400 text-sm py-8">No Data / データなし</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 text-xs rounded-md transition-all font-medium ${active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
  );
}

function StatCard({ title, count, color, textColor }: any) {
  const borderColor = title === 'ChatGPT' ? COLORS.chatgpt : title === 'Gemini' ? COLORS.gemini : '#374151';
  const numColor = title === 'ChatGPT' ? COLORS.chatgpt : title === 'Gemini' ? COLORS.gemini : '#111827';
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 transition-transform hover:-translate-y-1 duration-200" style={{ borderLeftColor: borderColor }}>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold mt-2 font-mono" style={{ color: numColor }}>{count}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4 p-3 bg-gray-50 rounded-xl inline-block">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}