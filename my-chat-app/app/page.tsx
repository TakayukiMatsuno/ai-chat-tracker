'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Twitter, LogOut, ChevronDown, ChevronUp, Zap, Copy, Calendar, Settings, X } from 'lucide-react';

const COLORS = {
  chatgpt: '#10A37F', 
  gemini: '#2563EB',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // トークン関連
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState(''); // ★追加: リフレッシュトークン

  // ユーザー設定関連
  const [username, setUsername] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // フィルター設定
  const [dateRange, setDateRange] = useState<'all' | '30days' | '7days'>('30days');
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // 初回セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token); // ★追加
        fetchLogs();
        fetchProfile(session.user.id);
      }
    });

    // ログイン状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token); // ★追加
        fetchLogs();
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]);
    setSession(null);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setLogs(data);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (data && data.username) {
      setUsername(data.username);
    } else {
      setUsername(session?.user?.email?.split('@')[0] || '');
    }
  };

  const updateProfile = async () => {
    if (!session) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: session.user.id, 
        username: username,
        updated_at: new Date().toISOString()
      });

    setIsSaving(false);
    if (error) {
      alert('保存に失敗しました');
      console.error(error);
    } else {
      alert('ユーザー名を保存しました！');
      setIsProfileOpen(false);
    }
  };

  // ★ 修正: 自動接続機能
  // アクセストークンとリフレッシュトークンをまとめてJSONで送る
  const connectExtension = () => {
    const data = {
      accessToken: accessToken,
      refreshToken: refreshToken
    };
    const event = new CustomEvent('AI_TRACKER_TOKEN', { detail: JSON.stringify(data) });
    window.dispatchEvent(event);
    alert('拡張機能に認証情報を送信しました！\n(自動更新用のトークンも含みます)');
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
      if (groupBy === 'daily') key = dateObj.toLocaleDateString('ja-JP');
      else if (groupBy === 'weekly') {
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dateObj.setDate(diff));
        key = `${monday.getMonth() + 1}/${monday.getDate()}週`;
      } else if (groupBy === 'monthly') key = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}`;

      if (!groupedData[key]) groupedData[key] = { date: key, chatgpt: 0, gemini: 0 };
      if (log.service === 'chatgpt') groupedData[key].chatgpt += 1;
      if (log.service === 'gemini') groupedData[key].gemini += 1;
    });

    return { filteredCounts: counts, chartData: Object.values(groupedData) };
  }, [logs, dateRange, groupBy]);

  const shareOnX = () => {
    const text = `${username}さんのAI学習記録(${dateRange === 'all' ? '累計' : dateRange}): ChatGPT ${filteredCounts.chatgpt}回, Gemini ${filteredCounts.gemini}回 📊 #AIStack`;
    const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, '_blank');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <button onClick={handleGoogleLogin} className="bg-white border p-4 rounded-lg font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2">
           Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ヘッダー */}
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
              <Twitter size={16} /> シェア
            </button>
            <button onClick={() => setIsProfileOpen(true)} className="text-gray-400 hover:text-blue-500 transition-colors">
              <Settings size={20} />
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>

          {/* プロフィール設定モーダル */}
          {isProfileOpen && (
            <div className="absolute top-16 right-4 z-10 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-700">ユーザー名設定</h3>
                <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
              </div>
              <p className="text-xs text-gray-500 mb-2">ランキングに表示される名前です</p>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-sm mb-3 focus:outline-none focus:border-blue-500"
                placeholder="表示名を入力"
              />
              <button 
                onClick={updateProfile}
                disabled={isSaving}
                className="w-full bg-blue-600 text-white rounded p-2 text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          )}
        </div>

        {/* 接続設定 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition-colors">
            <span className="flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> 拡張機能との接続設定</span>
            {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isSettingsOpen && (
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <button onClick={connectExtension} className="w-full md:w-auto bg-yellow-400 text-white px-6 py-2 rounded hover:bg-yellow-500 flex items-center justify-center gap-2 font-bold shadow-sm transition-colors">
                  自動接続する
                </button>
                <div className="flex-1 flex gap-2 w-full">
                  <input readOnly value={accessToken} className="flex-1 p-2 text-xs bg-gray-50 border border-gray-200 rounded text-gray-400 font-mono" />
                  <button onClick={() => navigator.clipboard.writeText(accessToken)} className="px-3 py-2 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1"><Copy size={14}/></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* メインエリア */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 p-1 rounded-lg inline-flex">
              <FilterTab label="過去7日" active={dateRange === '7days'} onClick={() => setDateRange('7days')} />
              <FilterTab label="過去30日" active={dateRange === '30days'} onClick={() => setDateRange('30days')} />
              <FilterTab label="全期間" active={dateRange === 'all'} onClick={() => setDateRange('all')} />
            </div>
            <span className="text-xs text-gray-400 ml-2 flex items-center gap-1"><Calendar size={12}/> {dateRange === 'all' ? 'すべてのログ' : `直近${dateRange === '30days' ? '30' : '7'}日間の集計`}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Chats" count={filteredCounts.total} color="border-gray-800" textColor="text-gray-800" />
            <StatCard title="ChatGPT" count={filteredCounts.chatgpt} color={`border-[${COLORS.chatgpt}]`} textColor="text-[#10A37F]" />
            <StatCard title="Gemini" count={filteredCounts.gemini} color={`border-[${COLORS.gemini}]`} textColor="text-[#2563EB]" />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">📊 アクティビティ推移</h3>
              <div className="flex bg-gray-100 p-1 rounded-lg text-xs">
                {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                  <button key={mode} onClick={() => setGroupBy(mode)} className={`px-3 py-1 rounded-md transition-all ${groupBy === mode ? 'bg-white font-bold shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    {mode === 'daily' ? '日次' : mode === 'weekly' ? '週次' : '月次'}
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
        </div>
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-4 py-1.5 text-xs rounded-md transition-all font-medium ${
        active 
          ? 'bg-white text-gray-800 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, count, color, textColor }: any) {
  const borderColor = title === 'ChatGPT' ? COLORS.chatgpt : title === 'Gemini' ? COLORS.gemini : '#374151';
  const numColor = title === 'ChatGPT' ? COLORS.chatgpt : title === 'Gemini' ? COLORS.gemini : '#111827';
  return (
    <div 
      className="bg-white p-5 rounded-xl shadow-sm border-l-4 transition-transform hover:-translate-y-1 duration-200"
      style={{ borderLeftColor: borderColor }}
    >
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold mt-2 font-mono" style={{ color: numColor }}>{count}</p>
    </div>
  );
}