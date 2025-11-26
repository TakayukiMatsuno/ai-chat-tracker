// ==========================================
// 設定エリア (あなたのSupabaseの情報を入れてください)
// ==========================================
const SUPABASE_URL = "https://hukompscjkwggxjlqaxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a29tcHNjamt3Z2d4amxxYXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzEwMzksImV4cCI6MjA3OTQ0NzAzOX0.RnuI1r64LnFXI6La7D2WSui3T6buFdryNo5ZU2eWChQ";
// ==========================================


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logChat") {
    handleLogChat(request.data);
    return true; 
  }
});

async function handleLogChat(logData) {
  // 1. 保存されたトークンを取り出す
  const storage = await chrome.storage.local.get(['supabaseToken', 'supabaseRefreshToken']);
  let userToken = storage.supabaseToken;
  let refreshToken = storage.supabaseRefreshToken;

  if (!userToken) {
    console.error("❌ トークンがありません。設定してください。");
    return;
  }

  // 2. ユーザーID取得 (トークンから)
  const userId = parseJwt(userToken).sub; 

  // 3. データ送信を試みる
  const success = await sendToSupabase(logData, userId, userToken);

  // 4. もし失敗（期限切れ）したら、リフレッシュして再挑戦
  if (!success && refreshToken) {
    console.log("🔄 Token expired. Refreshing...");
    
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      console.log("✅ Token refreshed! Retrying send...");
      // 新しいトークンで再送信
      await sendToSupabase(logData, userId, newTokens.accessToken);
    } else {
      console.error("❌ Refresh failed. Please login again via dashboard.");
      
      // ▼▼▼ 自動ログアウト処理 ▼▼▼
      await chrome.storage.local.remove(['supabaseToken', 'supabaseRefreshToken', 'userId']);
      console.log("👋 Auto logged out from extension.");
    }
  }
}

// データ送信関数
async function sendToSupabase(logData, userId, token) {
  const payload = {
    service: logData.service,
    user_id: userId
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ [Secure] Saved to Supabase successfully!');
      return true;
    } else {
      console.warn('⚠️ Send failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
}

// トークン更新関数
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
      await chrome.storage.local.set({ 
        supabaseToken: data.access_token,
        supabaseRefreshToken: data.refresh_token
      });
      return { 
        accessToken: data.access_token, 
        refreshToken: data.refresh_token 
      };
    }
  } catch (e) {
    console.error("Refresh error:", e);
  }
  return null;
}

function parseJwt(token) {
    try {
      return JSON.parse(decodeURIComponent(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch (e) { return { sub: null }; }
};