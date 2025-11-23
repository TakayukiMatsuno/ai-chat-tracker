// 保存ボタンが押されたら
document.getElementById('saveBtn').addEventListener('click', () => {
  const token = document.getElementById('tokenInput').value;
  if (!token) return;

  // Chromeに保存
  chrome.storage.local.set({ supabaseToken: token }, () => {
    const status = document.getElementById('status');
    status.textContent = '✅ 保存しました！';
    status.style.color = 'green';
    
    // 1秒後にウィンドウを閉じる
    setTimeout(() => window.close(), 1500);
  });
});

// 画面が開いた時に、保存済みのトークンがあれば表示する
chrome.storage.local.get(['supabaseToken'], (result) => {
  if (result.supabaseToken) {
    document.getElementById('tokenInput').value = result.supabaseToken;
  }
});