// Mọi con số cân bằng game nằm ở đây.
export const MIN = 60e3;

export const FISH = [
  { id: 'ro', name: 'Cá rô', icon: '🐟', price: 6, weight: 50, speed: 0.5 },
  { id: 'chep', name: 'Cá chép', icon: '🐠', price: 11, weight: 30, speed: 0.7 },
  { id: 'tre', name: 'Cá trê', icon: '🐟', price: 15, weight: 20, speed: 0.9 },
  { id: 'loc', name: 'Cá lóc', icon: '🐡', price: 26, weight: 10, speed: 1.2 },
  { id: 'chinh', name: 'Lươn', icon: '🐍', price: 42, weight: 5, speed: 1.5 },
  { id: 'koi', name: 'Cá koi vàng', icon: '✨', price: 95, weight: 2, speed: 1.8 },
  { id: 'linh', name: 'Cá linh', icon: '🐟', price: 18, weight: 0, speed: 0.6, season: 3 }, // chỉ mùa nước nổi
];

export const CROPS = [
  { id: 'cai', name: 'Cải xanh', icon: '🥬', cost: 4, price: 8, grow: 1.5 * MIN, color: 0x58b947 },
  { id: 'muong', name: 'Rau muống', icon: '🌿', cost: 5, price: 11, grow: 2 * MIN, color: 0x2f9e52 },
  { id: 'cachua', name: 'Cà chua', icon: '🍅', cost: 9, price: 20, grow: 3.5 * MIN, color: 0xe5483a },
  { id: 'bi', name: 'Bí đỏ', icon: '🎃', cost: 16, price: 38, grow: 7 * MIN, color: 0xf08a24 },
];

export const EGGS = [
  { id: 'trungga', name: 'Trứng gà', icon: '🥚', price: 4, lay: 1.5 * MIN },
  { id: 'trungvit', name: 'Trứng vịt', icon: '🥚', price: 6, lay: 2 * MIN },
];

export const GRAIN = { cost: 2, feed: 4 * MIN };
export const BAIT = 3;
export const TRAP_TIMES = [
  { label: 'Ngắn · 2 phút', ms: 2 * MIN },
  { label: 'Vừa · 15 phút', ms: 15 * MIN },
  { label: 'Dài · 2 giờ', ms: 120 * MIN },
];
export const TRAP_CAP = 8 * 60 * MIN; // tối đa 8 giờ khi offline

export const UP = {
  rod: [0, 80, 220], // giá lên cấp 2, 3 (index = cấp-1 → giá lên cấp kế)
  trap: [0, 60, 140, 300], // số lờ 1..4
  bed: [0, 0, 0, 60, 120, 240], // luống 1..6 (3 luống đầu miễn phí)
  coop: [0, 100, 250],
  house: [0, 250, 700],
};
export const COOP_CAP = [
  { chicken: 6, duck: 5 },
  { chicken: 9, duck: 7 },
  { chicken: 13, duck: 10 },
];
export const ANIMAL = { chicken: 20, duck: 25 };

export const QUESTS = [
  { text: 'Câu con cá đầu tiên (chạm ao)', ok: (s) => s.stats.fish >= 1, reward: 20 },
  { text: 'Bán cá ở quầy chợ', ok: (s) => s.stats.sold >= 1, reward: 20 },
  { text: 'Gieo một luống rau', ok: (s) => s.stats.planted >= 1, reward: 20 },
  { text: 'Rải thóc cho gà vịt (chạm chuồng)', ok: (s) => s.stats.fed >= 1, reward: 20 },
  { text: 'Đặt lờ đầu tiên bên ao', ok: (s) => s.stats.trapsSet >= 1, reward: 30 },
  { text: 'Thu hoạch 3 cây rau', ok: (s) => s.stats.harvested >= 3, reward: 40 },
  { text: 'Nâng cấp cần câu lên cấp 2', ok: (s) => s.rod >= 2, reward: 50 },
  { text: 'Sửa nhà lên cấp 2', ok: (s) => s.house >= 2, reward: 100 },
  { text: 'Sửa nhà lên cấp 3 — về quê trọn vẹn!', ok: (s) => s.house >= 3, reward: 300 },
];

export const priceMul = (id, now = Date.now()) => {
  const day = Math.floor(now / (24 * 60 * MIN));
  let h = 0;
  for (const c of id + day) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 0.85 + (h % 31) / 100; // 0.85–1.15
};

// ===== Thế giới sống (miền Tây) =====
export const STEP_MS = 60e3; // 1 bước thế giới = 1 phút thật
export const DAY_STEPS = 8; // 1 ngày game = 8 phút
export const PHASE_STEPS = 24; // mỗi giai đoạn = 3 ngày
export const YEAR_STEPS = 96;
export const MAX_CATCHUP = 40; // bù offline tối đa 40 bước (5 ngày game); phần vượt: đàn "ngủ", không già đi
export const START_STEP = PHASE_STEPS; // bắt đầu từ Đầu mưa

export const PHASES = [
  { name: 'Mùa khô', icon: '☀️', level: 0.2, tip: 'Gió chướng, nắng gắt, mặn xâm nhập: cá ít, cần tưới và lu nước.' },
  { name: 'Đầu mưa', icon: '🌦️', level: 0.45, tip: 'Mưa chiều tự tưới vườn, cỏ rơm và ốc bắt đầu nhiều.' },
  { name: 'Mùa mưa', icon: '🌧️', level: 0.7, tip: 'Mưa nhiều, gà vịt dễ ốm: nên có chuồng tre lá.' },
  { name: 'Nước nổi', icon: '🌊', level: 1, tip: 'Nước dâng ngập vườn thấp. Cá linh, điên điển, bông súng về; vịt chạy đồng.' },
];
export const WEATHER = [
  { id: 'nang', name: 'Nắng', icon: '☀️' }, { id: 'may', name: 'Nhiều mây', icon: '⛅' }, { id: 'mua', name: 'Mưa chiều', icon: '🌧️' },
  { id: 'chuong', name: 'Gió chướng', icon: '💨' }, { id: 'suong', name: 'Sương sớm', icon: '🌫️' },
];
export const WEATHER_P = [[.55, .15, .02, .25, .03], [.30, .30, .35, 0, .05], [.10, .30, .55, 0, .05], [.30, .35, .25, .05, .05]];
export const FLOOD_LEVEL = 0.85;

export const SP = {
  chicken: { name: 'Gà', icon: '🐔', egg: 'trungga', colors: ['Trắng', 'Nâu', 'Đen', 'Vàng'], hex: [0xf6f0e2, 0xc9733a, 0x3a3a3a, 0xe8c24a] },
  duck: { name: 'Vịt', icon: '🦆', egg: 'trungvit', colors: ['Trắng', 'Nâu', 'Đen', 'Xanh cổ vịt'], hex: [0xf4e9c0, 0x8a6a4a, 0x3a3a40, 0x6f8f5f] },
};
export const AGE = { adult: 3, old: 14, max: 18 }; // ngày game
export const DEX_REWARD = 15;
export const NEST_PER_COOP = 6;
export const RES_CAP = 40;
export const RES = {
  la: { name: 'Lá dừa', icon: '🌴', price: 0 }, tre: { name: 'Tre', icon: '🎋', price: 0 }, rom: { name: 'Rơm', icon: '🌾', price: 0 },
  oc: { name: 'Ốc bươu', icon: '🐌', price: 3 }, dien: { name: 'Bông điên điển', icon: '🌼', price: 9 }, sung: { name: 'Bông súng', icon: '🪷', price: 7 },
  set: { name: 'Đất sét', icon: '🧱', price: 0 }, phan: { name: 'Phân', icon: '💩', price: 0 }, phanu: { name: 'Phân ủ', icon: '🪱', price: 0 },
};
// điểm nhặt: kind, mùa có (null = quanh năm). Điểm ven ao tính từ tâm ao.
export const SPOTS = [
  ['la', -8.2, 0.5], ['tre', -8, 3.5], ['rom', -7.5, 6.5], ['la', -6, 11.5], ['rom', -2, 12], ['tre', 2.5, 11], ['rom', 6, 9.5], ['la', 9, 6],
  ['tre', 12, 2], ['rom', 9, -7], ['la', 4, -7.5], ['tre', 0, -7.5], ['rom', -3, -9], ['la', -8, -8], ['rom', 1, -4.5], ['tre', -1.5, -2.5],
  ['oc', 0, 0, [1, 2, 3]], ['oc', 1.7, 0, [1, 2, 3]], ['oc', 3.4, 0, [1, 2, 3]], ['dien', 0.5, 0, [3]], ['dien', 2.4, 0, [3]],
  ['sung', 0.9, 0, [3]], ['sung', 2.8, 0, [3]], ['sung', 4, 0, [3]], ['set', 5.3, 0, [0]], ['set', 6.4, 0, [0]],
];
export const BUILD = {
  chuong: { name: 'Chuồng tre lá', icon: '🛖', desc: 'Giảm 60% bệnh, chắn gió chướng cho đàn', cost: { la: 8, tre: 6 }, coins: 30 },
  oap: { name: 'Ổ ấp rơm', icon: '🪺', desc: 'Trứng có phôi nở 100% (không có ổ: 60%)', cost: { rom: 8 }, coins: 10 },
  lu: { name: 'Lu nước mưa', icon: '🏺', desc: 'Trữ nước mưa tưới vườn mùa khô (6 lần/lu), tối đa 2 lu', cost: { set: 4, tre: 2 }, coins: 15 },
  phan: { name: 'Đống ủ phân', icon: '♻️', desc: 'Đổi 2 phân thành 1 phân ủ mỗi 2 ngày, bón cho cây lớn nhanh x1,5', cost: { rom: 6, tre: 4 }, coins: 10 },
  cau: { name: 'Cầu khỉ', icon: '🌉', desc: 'Đứng ra giữa ao: cá hiếm dễ cắn hơn', cost: { tre: 10, la: 4 }, coins: 25 },
  nen: { name: 'Nền cao (mỗi luống thấp)', icon: '⛰️', desc: 'Chống ngập mùa nước nổi cho luống 4–6', cost: { set: 4, rom: 4 }, coins: 15 },
};
export const LU_CAP = 6;
export const TRAP_MOD = { chuong: 0.7, kho: 0.8 }; // gió chướng, mùa khô (mặn)

QUESTS.push(
  { text: 'Nhặt 5 nguyên liệu ngoài cảnh (🌴🎋🌾)', ok: (s) => s.stats.picked >= 5, reward: 30 },
  { text: 'Xây một công trình ở 🏠 Nhà → Xây dựng', ok: (s) => s.stats.built >= 1, reward: 40 },
  { text: 'Ấp nở con gà/vịt đầu tiên', ok: (s) => s.stats.hatched >= 1, reward: 60 },
);

// ===== Ông Trời (bộ não cân bằng làng, chạy trên server, bạn duyệt) =====
export const BRAIN = {
  minFarms: 3, // cần ít nhất 3 nông trại báo cáo trong 24 giờ mới đề xuất (làng nhỏ: số liệu quá nhiễu)
  activeMs: 24 * 60 * MIN,
  dominant: 0.7, // 1 allele chiếm >70% một locus trong cả làng → thiếu đa dạng
  econWindowMs: 96 * MIN, // so xu trung vị với 1 năm game trước
  econMinCoins: 50,
  inflate: 0.5, // xu trung vị tăng >50%/năm → ép giá
  deflate: 0.3, // giảm >30%/năm → nâng giá
  priceDown: 0.8, priceUp: 1.2,
  epidemic: 0.02, // thêm xác suất ốm mỗi bước cho mỗi bản sao allele bị nhắm
  historyGapMs: 24 * MIN, // chụp số liệu mỗi mùa game
};
