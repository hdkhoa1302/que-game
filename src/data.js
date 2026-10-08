// Mọi con số cân bằng game nằm ở đây.
export const MIN = 60e3;

export const FISH = [
  { id: 'ro', name: 'Cá rô', icon: '🐟', price: 6, weight: 50, speed: 0.5 },
  { id: 'chep', name: 'Cá chép', icon: '🐠', price: 11, weight: 30, speed: 0.7 },
  { id: 'tre', name: 'Cá trê', icon: '🐟', price: 15, weight: 20, speed: 0.9 },
  { id: 'loc', name: 'Cá lóc', icon: '🐡', price: 26, weight: 10, speed: 1.2 },
  { id: 'chinh', name: 'Lươn', icon: '🐍', price: 42, weight: 5, speed: 1.5 },
  { id: 'koi', name: 'Cá koi vàng', icon: '✨', price: 95, weight: 2, speed: 1.8 },
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
  { chicken: 3, duck: 2 },
  { chicken: 5, duck: 3 },
  { chicken: 7, duck: 5 },
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
