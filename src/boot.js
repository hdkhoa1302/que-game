import { loadAssets } from './assets.js';
// bản mới của service worker nhận quyền thì tải lại một lần để người chơi thấy ngay bản mới
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
}
// tải mô hình Blender trước; lỗi thì game vẫn chạy bằng mô hình dựng bằng code
loadAssets().catch(() => {}).finally(() => import('./main.js'));
