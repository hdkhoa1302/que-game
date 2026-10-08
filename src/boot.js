import { loadAssets } from './assets.js';
// tải mô hình Blender trước; lỗi thì game vẫn chạy bằng mô hình dựng bằng code
loadAssets().catch(() => {}).finally(() => import('./main.js'));
