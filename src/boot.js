import { loadAssets } from './assets.js';
// bản mới của service worker nhận quyền thì tải lại một lần để người chơi thấy ngay bản mới
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
}
// mô hình Blender là bắt buộc: tải được mới vào game, không thì báo để tải lại
loadAssets().then(() => import('./main.js')).catch(() => { document.querySelector('#load').innerHTML = '<div>⚠️</div>Không tải được mô hình.<br>Kiểm tra mạng rồi tải lại trang.'; });
