// ==========================================
// 1. チャット計測機能 (ChatGPT / Gemini用)
// ==========================================
const CONFIG = {
  chatgpt: {
    sendButtonSelector: '[data-testid="send-button"]',
    textareaSelector: '#prompt-textarea'
  },
  gemini: {
    sendButtonSelector: 'button[aria-label*="送信"], button[aria-label*="Send"], button .fa-paper-plane, button[data-test-id="send-button"]',
    textareaSelector: 'div[contenteditable="true"]' 
  }
};

// 連打防止用の変数
let lastSentTime = 0;
let userId = null;

// ユーザーIDの取得または生成
chrome.storage.local.get(['userId'], (result) => {
  if (result.userId) {
    userId = result.userId;
  } else {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    chrome.storage.local.set({ userId: userId });
  }
});

// どのサイトにいるか判定
const currentHost = window.location.hostname;
const serviceName = currentHost.includes('chatgpt') ? 'chatgpt' : 
                    currentHost.includes('gemini') ? 'gemini' : null;

// ChatGPTかGeminiなら計測を開始
if (serviceName) {
  setupTracking(serviceName);
}

function setupTracking(service) {
  const config = CONFIG[service];
  console.log(`AI Tracker Ready on: ${service}`);

  // クリック監視
  document.addEventListener('click', (event) => {
    const button = event.target.closest(config.sendButtonSelector);
    if (button && !button.disabled) {
      sendMessageToBackground(service, 'click');
    }
  }, true);

  // Enterキー監視
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      const textarea = event.target.closest(config.textareaSelector);
      if (textarea && !event.isComposing) {
        sendMessageToBackground(service, 'enter-key');
      }
    }
  }, true);
}

function sendMessageToBackground(service, method) {
  if (!userId) return;

  // 連打防止（1秒以内の重複は無視）
  const now = Date.now();
  if (now - lastSentTime < 1000) {
    return;
  }
  lastSentTime = now;

  const data = {
    service: service,
    user_id: userId,
  };

  try {
    chrome.runtime.sendMessage({ action: "logChat", data: data });
  } catch (e) {
    // 拡張機能が更新された直後などのエラー対策
    console.log("Context invalidated.");
  }
}

// ==========================================
// 2. 自動接続機能 (Webダッシュボード用)
// ==========================================
if (window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app')) {
  console.log("🔌 AI Tracker: Waiting for token from dashboard...");
  
  window.addEventListener('AI_TRACKER_TOKEN', (event) => {
    try {
      // JSONをパースして保存
      const data = JSON.parse(event.detail);
      
      if (data.accessToken && data.refreshToken) {
        console.log("🔌 Tokens received!");
        
        // アクセストークンとリフレッシュトークンの両方を保存
        chrome.storage.local.set({ 
          supabaseToken: data.accessToken,
          supabaseRefreshToken: data.refreshToken
        }, () => {
          alert('✅ Connection setup complete! \n接続設定が完了しました！');
        });
      }
    } catch (e) {
      console.error("Token parse error", e);
    }
  });
}