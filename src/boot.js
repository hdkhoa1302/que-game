import { loadAssets } from './assets.js';
// bản mới của service worker nhận quyền thì tải lại một lần để người chơi thấy ngay bản mới
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
}
loadAssets()
  .then(() => import('./main.js'))
  .catch((err) => {
    console.error('Lỗi khởi động game:', err);
    document.querySelector('#load').innerHTML = '<div>⚠️</div>Không tải được mô hình.<br>Kiểm tra mạng rồi tải lại trang.';
  });

