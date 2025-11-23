const CONFIG = {
  chatgpt: {
    sendButtonSelector: '[data-testid="send-button"]',
    textareaSelector: '#prompt-textarea'
  },
  gemini: {
    sendButtonSelector: 'button[aria-label*="送信"], button[aria-label*="Send"], button .fa-paper-plane',
    textareaSelector: 'div[contenteditable="true"]' 
  }
};

let userId = null;
// 連打防止用の変数を追加
let lastSentTime = 0;

// ユーザーIDの取得
chrome.storage.local.get(['userId'], (result) => {
  if (result.userId) {
    userId = result.userId;
  } else {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    chrome.storage.local.set({ userId: userId });
  }
});

const currentHost = window.location.hostname;
const serviceName = currentHost.includes('chatgpt') ? 'chatgpt' : 
                    currentHost.includes('gemini') ? 'gemini' : null;

if (serviceName) {
  setupTracking(serviceName);
}

function setupTracking(service) {
  const config = CONFIG[service];
  console.log(`AI Tracker Ready on: ${service}`);

  document.addEventListener('click', (event) => {
    const button = event.target.closest(config.sendButtonSelector);
    if (button && !button.disabled) {
      sendMessageToBackground(service, 'click');
    }
  }, true);

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

  // 【ここが修正ポイント】クールダウン処理
  // 前回の送信から1秒(1000ミリ秒)経過していない場合は無視する
  const now = Date.now();
  if (now - lastSentTime < 1000) {
    console.log("⏳ Skipped double count (Cooldown)");
    return;
  }
  // 送信時刻を更新
  lastSentTime = now;

  const data = {
    service: service,
    user_id: userId,
  };

  try {
    chrome.runtime.sendMessage({ action: "logChat", data: data });
    console.log("📨 Message sent to background script");
  } catch (e) {
    console.log("Extension context invalidated. Please reload the page.");
  }
}
// （これまでのコードはそのまま、一番下に追記）

// ==========================================
// 自動接続機能（Webアプリからの連携）
// ==========================================
if (window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app')) {
  console.log("🔌 AI Tracker: Waiting for token from dashboard...");
  
  window.addEventListener('AI_TRACKER_TOKEN', (event) => {
    const token = event.detail;
    if (token) {
      console.log("🔌 Token received!", token);
      // トークンをChromeストレージに保存
      chrome.storage.local.set({ supabaseToken: token }, () => {
        alert('✅ 拡張機能の接続設定が完了しました！\nChatGPTやGeminiを開いて利用を開始してください。');
      });
    }
  });
}