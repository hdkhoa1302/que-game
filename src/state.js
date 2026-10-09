import { CROPS, QUESTS, TRAP_CAP, MIN, START_STEP, START_RES } from './data.js';
import { advance, growBed, addAnimal, nestCap as nestCapOf, dayAt } from './sim.js';
import { mulberry32, founder } from './genes.js';
import { shallowAt, snapToShallow } from './objs.js';

const KEY = 'que-game-v1';

const fresh = () => ({
  coins: 80,
  inv: { fish: {}, crop: {}, egg: {}, grain: 0 },
  rod: 1, house: 1, coop: 1,
  trapsN: 1, bedsN: 1,
  traps: [], // {x, z, start, ms}; start=0: lờ đang rảnh
  beds: [null, null, null, null, null, null], // {crop, progress, last, waterUntil, fert, flood}
  animals: [], eggs: [], dex: {}, nextId: 1, ev: [],
  res: { ...START_RES }, builds: { nen: {} }, lu: 0, obj: {}, objv: 4, tools: { rua: 1 }, qv: 2,
  fedUntil: 0, last: Date.now(), t0: Date.now(),
  world: { step: START_STEP, base: START_STEP, seed: (Math.random() * 2 ** 31) | 0, weather: 'nang' },
  quest: 0, won: false, sound: true,
  stats: { fish: 0, sold: 0, planted: 0, fed: 0, trapsSet: 0, harvested: 0, picked: 0, built: 0, hatched: 0, crafted: 0, chopped: 0 },
});

// Đàn ban đầu: gà 1 trống 2 mái, vịt 1 trống 1 mái. Bản lưu cũ chuyển số lượng cũ thành cá thể.
const seedHerd = (S, nc, nd) => {
  const rng = mulberry32(S.world.seed ^ 0x5eed), day = dayAt(S.world.step);
  [['chicken', nc], ['duck', nd]].forEach(([sp, n]) => { for (let i = 0; i < n; i++) addAnimal(S, sp, i === 0 && n > 1 ? 'm' : 'f', founder(rng), day - 3 - Math.floor(rng() * 8),false); });
};

export const S = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.coins != null) {
      const DEF = [[4.1, 0.9], [8.6, 1.5], [9.9, -1.9], [6.7, -3.9]]; // bản lưu cũ: lờ cố định
      raw.traps = (raw.traps || []).filter(Boolean).map((t, i) => (t.x == null ? { x: DEF[i][0], z: DEF[i][1], ...t } : t));
      raw.traps = raw.traps.map((t) => { if (shallowAt(t.x, t.z)) return t; const [x, z] = snapToShallow(t.x, t.z); return { ...t, x, z }; }); // lờ cũ đặt trong ao: kéo về nước nông ven sông
      const s = { ...fresh(), ...raw };
      s.stats = { ...fresh().stats, ...raw.stats }; s.tools = { rua: 1, ...(raw.tools || {}) }; s.obj = raw.objv === 4 ? raw.obj || {} : {}; s.objv = 4; // bố cục vật thể đổi: bỏ trạng thái mọc lại cũ
      if (!raw.qv) { s.quest = (raw.quest || 0) + 3; s.qv = 2; } // 3 nhiệm vụ công cụ mới ở đầu danh sách: bản lưu cũ bỏ qua
      if (!raw.animals) { s.animals = []; s.eggs = []; seedHerd(s, raw.chickens ?? 2, raw.ducks ?? 1); delete s.chickens; delete s.ducks; delete s.nest; }
      if (!raw.world) { s.t0 = raw.t0 || Date.now(); s.world = fresh().world; s.world.step = s.world.base = START_STEP; s.t0 = Date.now(); }
      return s;
    }
  } catch {}
  const s = fresh(); seedHerd(s, 3, 2); return s;
})();

export const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
};

export const nestCap = () => nestCapOf(S);
export const add = (bucket, id, n = 1) => { S.inv[bucket][id] = (S.inv[bucket][id] || 0) + n; };

export const stageOf = (b) => {
  const g = CROPS.find((c) => c.id === b.crop).grow;
  const p = b.progress / g;
  return p >= 1 ? 2 : p >= 0.45 ? 1 : 0;
};
export const bedReady = (b) => b && stageOf(b) === 2;

export const trapLeft = (t, now = Date.now()) => (t && t.start ? Math.max(0, t.start + Math.min(t.ms, TRAP_CAP) - now) : 0);
export const trapState = (t, now = Date.now()) => (!t.start ? 'idle' : trapLeft(t, now) ? 'run' : 'ready');

// Đẩy thế giới tới hiện tại: các bước mùa/gà vịt, rồi cây lớn. Gọi định kỳ và lúc mở game (bù offline).
export const tick = (now = Date.now()) => {
  advance(S, now);
  S.beds.forEach((b) => b && growBed(b, now));
  S.last = now;
};

export const questDone = () => {
  const q = QUESTS[S.quest];
  if (q && q.ok(S)) { S.coins += q.reward; S.quest++; return q; }
  return null;
};

export const reset = () => { localStorage.removeItem(KEY); location.reload(); };

export const offlineSummary = (before) => {
  const ts = S.traps.filter((t) => trapState(t) === 'ready').length;
  const bs = S.beds.filter(bedReady).length;
  const eggs = S.eggs.length;
  const away = Date.now() - before;
  if (away < 2 * MIN) return '';
  return [ts && `${ts} lờ đã đầy`, bs && `${bs} luống rau chín`, eggs && `${eggs} quả trứng trong ổ`].filter(Boolean).join(' · ');
};
