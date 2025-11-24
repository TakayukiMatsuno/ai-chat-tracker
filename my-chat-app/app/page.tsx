'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Twitter, LogOut, ChevronDown, ChevronUp, Zap, Copy, Calendar, Settings, X, BarChart3 } from 'lucide-react';

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
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-300">
            {/* アプリアイコン */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-50 rounded-full shadow-inner">
                <BarChart3 className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            
            {/* タイトルとサブテキスト */}
            <h1 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">AI Chat Tracker</h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              日々のAI活用を自動で記録。<br />
              あなたの成長を可視化しましょう。
            </p>

            {/* Googleログインボタン (Google公式スタイル風) */}
            <button 
              onClick={handleGoogleLogin} 
              className="w-full bg-white text-gray-700 border border-gray-300 px-4 py-3 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all flex items-center justify-center gap-3 group"
            >
              <GoogleLogo />
              <span className="group-hover:text-gray-900">Googleでログイン</span>
            </button>
            
            <p className="mt-6 text-xs text-gray-400">
              ログインすることで利用規約と<br/>プライバシーポリシーに同意したものとみなされます。
            </p>
          </div>
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