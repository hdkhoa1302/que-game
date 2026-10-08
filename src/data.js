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
  bed: [0, 25, 40, 60, 120, 240], // luống 1..6 (3 luống đầu miễn phí)
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
  { text: 'Câu con cá đầu tiên (chạm xuống sông)', ok: (s) => s.stats.fish >= 1, reward: 20 },
  { text: 'Bán cá ở quầy chợ', ok: (s) => s.stats.sold >= 1, reward: 20 },
  { text: 'Gieo một luống rau', ok: (s) => s.stats.planted >= 1, reward: 20 },
  { text: 'Rải thóc cho gà vịt (chạm chuồng)', ok: (s) => s.stats.fed >= 1, reward: 20 },
  { text: 'Đặt lờ đầu tiên ở nước nông ven sông', ok: (s) => s.stats.trapsSet >= 1, reward: 30 },
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
  { name: 'Nước nổi', icon: '🌊', level: 1, tip: 'Sông dâng, nước ngập vườn thấp. Cá linh, điên điển, bông súng về; vịt chạy đồng.' },
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
export const RES_CAP = 60;
export const RES = {
  la: { name: 'Lá dừa', icon: '🌴', price: 0 }, tre: { name: 'Tre', icon: '🎋', price: 0 }, rom: { name: 'Rơm', icon: '🌾', price: 0 },
  oc: { name: 'Ốc bươu', icon: '🐌', price: 3 }, dien: { name: 'Bông điên điển', icon: '🌼', price: 9 }, sung: { name: 'Bông súng', icon: '🪷', price: 7 },
  set: { name: 'Đất sét', icon: '🧱', price: 0 }, go: { name: 'Gỗ', icon: '🪵', price: 0 }, da: { name: 'Đá', icon: '🪨', price: 0 },
  soi: { name: 'Sợi', icon: '🧵', price: 0 }, dua: { name: 'Dừa', icon: '🥥', price: 6 }, qua: { name: 'Quả dại', icon: '🫐', price: 4 }, phan: { name: 'Phân', icon: '💩', price: 0 }, phanu: { name: 'Phân ủ', icon: '🪱', price: 0 },
};
export const BUILD = {
  ban: { name: 'Bàn thợ', icon: '🔨', desc: 'Chế và nâng cấp công cụ (rựa, rìu, cuốc, liềm, xẻng, rổ vợt)', cost: { go: 4, da: 3, soi: 2 }, coins: 10 },
  chuong: { name: 'Chuồng tre lá', icon: '🛖', desc: 'Giảm 60% bệnh, chắn gió chướng cho đàn', cost: { la: 8, tre: 6, go: 4 }, coins: 30 },
  oap: { name: 'Ổ ấp rơm', icon: '🪺', desc: 'Trứng có phôi nở 100% (không có ổ: 60%)', cost: { rom: 8 }, coins: 10 },
  lu: { name: 'Lu nước mưa', icon: '🏺', desc: 'Trữ nước mưa tưới vườn mùa khô (6 lần/lu), tối đa 2 lu', cost: { set: 4, tre: 2, da: 2 }, coins: 15 },
  phan: { name: 'Đống ủ phân', icon: '♻️', desc: 'Đổi 2 phân thành 1 phân ủ mỗi 2 ngày, bón cho cây lớn nhanh x1,5', cost: { rom: 6, tre: 4, go: 2 }, coins: 10 },
  cau: { name: 'Cầu khỉ', icon: '🌉', desc: 'Bắc qua sông sang bờ đông (rừng dừa tre, đồng lúa); đứng giữa sông cá hiếm dễ cắn hơn', cost: { tre: 12, go: 8, soi: 5 }, coins: 30 },
  nen: { name: 'Nền cao (mỗi luống thấp)', icon: '⛰️', desc: 'Chống ngập mùa nước nổi cho luống 4–6', cost: { set: 4, rom: 4, da: 3 }, coins: 15 },
};
export const LU_CAP = 6;
export const TRAP_MOD = { chuong: 0.7, kho: 0.8 }; // gió chướng, mùa khô (mặn)

QUESTS.unshift(
  { text: 'Dựng bàn thợ (🏠 Nhà → Xây dựng)', ok: (s) => !!s.builds.ban, reward: 25 },
  { text: 'Khai thác 5 vật thể ngoài cảnh (chạm vào cây, đá, bụi...)', ok: (s) => s.stats.picked >= 5, reward: 25 },
  { text: 'Chế một công cụ ở bàn thợ', ok: (s) => s.stats.crafted >= 1, reward: 40 },
);
QUESTS.push(
  { text: 'Bắc cầu khỉ qua sông, sang bờ đông', ok: (s) => !!s.builds.cau, reward: 80 },
  { text: 'Chặt một cây bằng rìu (🪓)', ok: (s) => s.stats.chopped >= 1, reward: 30 },
  { text: 'Xây một công trình ở 🏠 Nhà → Xây dựng', ok: (s) => s.stats.built >= 1, reward: 40 },
  { text: 'Ấp nở con gà/vịt đầu tiên', ok: (s) => s.stats.hatched >= 1, reward: 60 },
);

// ===== Thế giới rộng + vật thể khai thác + công cụ =====
export const WORLD_R = 34, WALK_R = 31;
export const TOOLS = {
  rua: { name: 'Rựa', icon: '🔪', use: 'tre, dừa', tiers: [null, { cost: {}, coins: 0 }, { cost: { go: 3, da: 4 }, coins: 20 }, { cost: { go: 5, da: 10, soi: 4 }, coins: 80 }] },
  riu: { name: 'Rìu', icon: '🪓', use: 'cây gỗ', tiers: [null, { cost: { go: 3, da: 2, soi: 2 }, coins: 10 }, { cost: { go: 5, da: 6, soi: 3 }, coins: 40 }, { cost: { go: 8, da: 14, soi: 5 }, coins: 120 }] },
  cuoc: { name: 'Cuốc', icon: '⛏️', use: 'đá', tiers: [null, { cost: { go: 3, da: 3, soi: 2 }, coins: 10 }, { cost: { go: 5, da: 8, soi: 3 }, coins: 45 }, { cost: { go: 8, da: 16, soi: 4 }, coins: 130 }] },
  liem: { name: 'Liềm', icon: '🌙', use: 'cỏ rơm, lau sậy', tiers: [null, { cost: { tre: 3, da: 1, soi: 2 }, coins: 5 }, { cost: { tre: 5, da: 4, soi: 3 }, coins: 30 }, { cost: { go: 3, da: 8, soi: 5 }, coins: 90 }] },
  xeng: { name: 'Xẻng', icon: '🛠️', use: 'đất sét', tiers: [null, { cost: { go: 2, da: 2, tre: 2 }, coins: 8 }, { cost: { go: 4, da: 6, tre: 3 }, coins: 35 }, { cost: { go: 6, da: 12, tre: 4 }, coins: 100 }] },
  ro: { name: 'Rổ vợt', icon: '🧺', use: 'ốc, cá nhỏ', tiers: [null, { cost: { tre: 4, soi: 4 }, coins: 5 }, { cost: { tre: 6, soi: 6, go: 2 }, coins: 25 }, { cost: { tre: 8, soi: 8, go: 4 }, coins: 70 }] },
};
export const TIER_NAME = ['Chưa có', 'Tre gỗ', 'Đá mài', 'Sắt rèn'];
export const TIME_MUL = [1, 1, 0.65, 0.4]; // theo bậc công cụ
export const YIELD_MUL = [1, 1, 1.5, 2];
// tool: null = làm bằng tay; time: giây ở bậc 1; regrow: số ngày game mọc lại; phases: chỉ có ở giai đoạn mùa nào
export const OBJ = {
  tree: { name: 'Cây gỗ', icon: '🌳', tool: 'riu', verb: 'Chặt cây', time: 5, yield: { go: [3, 4] }, regrow: 6 },
  palm: { name: 'Cây dừa', icon: '🥥', tool: 'rua', verb: 'Hái dừa', time: 4, yield: { la: [2, 3], dua: [1, 2] }, regrow: 4 },
  thua: { name: 'Thửa ruộng', icon: '🌾', tool: 'liem', verb: 'Gặt lúa', time: 6, yield: { thoc: [6, 9] }, regrow: 5, phases: [0] }, // chỉ chín mùa khô; thóc vào kho cho gà vịt
  ban: { name: 'Cây bần', icon: '🌳', tool: 'riu', verb: 'Chặt bần', time: 6, yield: { go: [3, 5] }, regrow: 7 },
  nipa: { name: 'Dừa nước', icon: '🌴', tool: 'rua', verb: 'Chặt lá dừa nước', time: 3, yield: { la: [2, 4] }, regrow: 3 },
  bamboo: { name: 'Bụi tre', icon: '🎋', tool: 'rua', verb: 'Chặt tre', time: 3, yield: { tre: [2, 3] }, regrow: 2 },
  rock: { name: 'Tảng đá', icon: '🪨', tool: 'cuoc', verb: 'Đập đá', time: 6, yield: { da: [2, 3] }, regrow: 8 },
  grass: { name: 'Cỏ rơm', icon: '🌾', tool: 'liem', verb: 'Cắt rơm', time: 2, yield: { rom: [2, 3], soi: [0, 1] }, regrow: 1 },
  reed: { name: 'Lau sậy', icon: '🌿', tool: 'liem', verb: 'Cắt sậy', time: 3, yield: { rom: [1, 2], soi: [1, 2] }, regrow: 2 },
  clay: { name: 'Đất sét', icon: '🧱', tool: 'xeng', verb: 'Đào sét', time: 4, yield: { set: [2, 3] }, regrow: 2 },
  snail: { name: 'Ốc bươu', icon: '🐌', tool: 'ro', verb: 'Bắt ốc', time: 2, yield: { oc: [1, 3] }, regrow: 1, phases: [1, 2, 3] },
  berry: { name: 'Bụi quả dại', icon: '🫐', tool: null, verb: 'Hái quả', time: 2, yield: { qua: [2, 3] }, regrow: 3 },
  dien: { name: 'Bông điên điển', icon: '🌼', tool: null, verb: 'Hái điên điển', time: 2, yield: { dien: [1, 2] }, regrow: 1, phases: [3] },
  lily: { name: 'Bông súng', icon: '🪷', tool: null, verb: 'Hái bông súng', time: 2, yield: { sung: [1, 2] }, regrow: 1, phases: [3] },
  branch: { name: 'Cành khô', icon: '🪵', tool: null, verb: 'Nhặt cành', time: 1.2, yield: { go: [1, 1] }, regrow: 1 },
  pebble: { name: 'Đá cuội', icon: '⚪', tool: null, verb: 'Nhặt đá', time: 1.2, yield: { da: [1, 1] }, regrow: 2 },
  weed: { name: 'Cỏ dại', icon: '🌱', tool: null, verb: 'Nhổ cỏ', time: 1.2, yield: { soi: [1, 1] }, regrow: 1 },
};
// Bố cục theo công dụng. Bờ tây (làng): tài nguyên khởi đầu, tre, gỗ, đá, sét. Bờ đông (qua cầu khỉ): rừng dừa tre, đồng lúa.
export const ZONES = [
  { id: 'lang', name: 'Làng', x: 0, z: 2, r: 15, mix: [['branch', 8], ['pebble', 8], ['weed', 10], ['grass', 8], ['berry', 3], ['tree', 3], ['rock', 1], ['bamboo', 2]] },
  { id: 'tre', name: 'Lũy tre', x: -19, z: -9, r: 7, mix: [['bamboo', 12], ['branch', 3], ['weed', 3]] },
  { id: 'nui', name: 'Núi đá', x: -6, z: -23, r: 10, mix: [['rock', 12], ['tree', 8], ['berry', 4], ['pebble', 6], ['branch', 3]] },
  { id: 'bai', name: 'Bãi bồi', x: 3, z: 22, r: 9, mix: [['clay', 10], ['grass', 9], ['weed', 4], ['berry', 3], ['pebble', 3]] },
  { id: 'rach', name: 'Bờ rạch', x: -23, z: 3, r: 11, mix: [['palm', 5], ['grass', 4], ['weed', 3], ['tree', 3], ['ban', 4], ['nipa', 4]] },
  { id: 'rung', name: 'Rừng dừa tre', x: 29, z: -9, r: 10, mix: [['palm', 12], ['bamboo', 14], ['tree', 10], ['branch', 4], ['berry', 3]] },
  { id: 'dong', name: 'Đồng lúa', x: 25, z: 8, r: 9, mix: [['grass', 10], ['berry', 4], ['weed', 5]] },
];
// vật thể ven nước (dọc sông và quanh rạch)
export const WATER_MIX = { river: [['snail', 12], ['reed', 14], ['nipa', 10], ['clay', 6], ['dien', 8], ['lily', 8], ['ban', 4]], lake: [['snail', 6], ['reed', 8], ['nipa', 6], ['ban', 3], ['clay', 4], ['dien', 4], ['lily', 4]] };
export const START_RES = { go: 4, da: 3, soi: 3, tre: 4 };

// Sông Mê Kông thu nhỏ: đường tâm Catmull-Rom qua các điểm (x, z), chảy từ đông bắc xuống đông nam. half = nửa bề rộng ở mực nước trung bình.
export const RIVER = { pts: [[34, -26], [24, -20], [16, -12], [10, -5], [8.5, 1], [9, 7], [13, 13], [20, 18], [30, 22], [44, 26]], half: 3.3, flow: 0.9 };
export const riverK = (level) => 0.75 + 0.35 * level; // sông co giãn theo mực nước
// Ruộng lúa bên bờ đông: 2×2 thửa, mỗi thửa gặt được một lần mỗi mùa khô (liềm) ra thóc cho gà vịt
export const PADDY = { x0: 17, x1: 30, z0: 3, z1: 12 };
export const PLOTS = [0, 1, 2, 3].map((i) => { const w = (PADDY.x1 - PADDY.x0 - 0.6) / 2, h = (PADDY.z1 - PADDY.z0 - 0.6) / 2, x0 = PADDY.x0 + 0.3 + (i % 2) * (w + 0.0), z0 = PADDY.z0 + 0.3 + (i >> 1) * (h + 0.0); return { x0: x0 + 0.1, x1: x0 + w - 0.1, z0: z0 + 0.1, z1: z0 + h - 0.1 }; });
