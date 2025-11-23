// ==========================================
// 設定エリア (あなたのSupabaseの情報を入れてください)
// ==========================================
const SUPABASE_URL = "https://hukompscjkwggxjlqaxd.supabase.co";
const SUPABASE_KEY = "sb_publishable_mB6X_fXlL_P2aK7EVo0vfQ_cwHri1Z-";
// ==========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logChat") {
    sendToSupabase(request.data);
  }
});

async function sendToSupabase(logData) {
  // 1. Chromeに保存されたトークンを取り出す
  const storage = await chrome.storage.local.get(['supabaseToken']);
  const userToken = storage.supabaseToken;

  if (!userToken) {
    console.error("❌ トークンがありません。拡張機能のアイコンから設定してください。");
    return;
  }

  // 2. トークンからユーザーIDを取り出す (JWTデコード)
  const userId = parseJwt(userToken).sub; 

  // 3. 送信データを作成
  const payload = {
    service: logData.service,
    user_id: userId // 認証された正しいユーザーID
  };

  try {
    // 4. Supabaseへ送信 (Authorizationヘッダー付き)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${userToken}`, // ⬅️ ここが通行手形になります
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ [Secure] Saved to Supabase successfully!');
    } else {
      console.error('❌ Failed to save:', await response.text());
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// JWT(トークン)の中身を解読してユーザーIDを取り出す関数
function parseJwt (token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return { sub: null };
    }
};