export default { base: './', define: { __BUILD__: JSON.stringify(new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })) }, build: { chunkSizeWarningLimit: 800 } };
