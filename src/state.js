import { CROPS, EGGS, QUESTS, TRAP_CAP, MIN } from './data.js';

const KEY = 'que-game-v1';

const fresh = () => ({
  coins: 100,
  inv: { fish: {}, crop: {}, egg: {}, grain: 0 },
  rod: 1, house: 1, coop: 1,
  trapsN: 1, bedsN: 3,
  traps: [], // {x, z, start, ms}; start=0: lờ đang rảnh
  beds: [null, null, null, null, null, null], // {crop, progress, last, waterUntil}
  chickens: 2, ducks: 1,
  fedUntil: 0, nest: { trungga: 0, trungvit: 0 }, last: Date.now(),
  quest: 0, won: false, sound: true,
  stats: { fish: 0, sold: 0, planted: 0, fed: 0, trapsSet: 0, harvested: 0 },
});

export const S = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.coins != null) {
      const DEF = [[4.1, 0.9], [8.6, 1.5], [9.9, -1.9], [6.7, -3.9]]; // bản lưu cũ: lờ cố định
      raw.traps = (raw.traps || []).filter(Boolean).map((t, i) => (t.x == null ? { x: DEF[i][0], z: DEF[i][1], ...t } : t));
      return { ...fresh(), ...raw };
    }
  } catch {}
  return fresh();
})();

export const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
};

export const nestCap = () => 6 * S.coop;
export const add = (bucket, id, n = 1) => { S.inv[bucket][id] = (S.inv[bucket][id] || 0) + n; };

export const stageOf = (b) => {
  const g = CROPS.find((c) => c.id === b.crop).grow;
  const p = b.progress / g;
  return p >= 1 ? 2 : p >= 0.45 ? 1 : 0;
};
export const bedReady = (b) => b && stageOf(b) === 2;

const growBed = (b, now) => {
  const dt = Math.max(0, now - b.last);
  const wet = Math.max(0, Math.min(dt, b.waterUntil - b.last));
  const g = CROPS.find((c) => c.id === b.crop).grow;
  b.progress = Math.min(g, b.progress + wet + (dt - wet) * 0.25); // khô thì lớn chậm 25%
  b.last = now;
};

export const trapLeft = (t, now = Date.now()) => (t && t.start ? Math.max(0, t.start + Math.min(t.ms, TRAP_CAP) - now) : 0);
export const trapState = (t, now = Date.now()) => (!t.start ? 'idle' : trapLeft(t, now) ? 'run' : 'ready');

// Đẩy thời gian về hiện tại: cây lớn, gà vịt đẻ. Gọi định kỳ và lúc mở game (bù offline).
export const tick = (now = Date.now()) => {
  S.beds.forEach((b) => b && growBed(b, now));
  const fedDt = Math.max(0, Math.min(now, S.fedUntil) - S.last);
  if (fedDt > 0) {
    const cnt = { trungga: S.chickens, trungvit: S.ducks };
    for (const e of EGGS) S.nest[e.id] = Math.min(nestCap(), S.nest[e.id] + (fedDt / e.lay) * cnt[e.id]);
  }
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
  const eggs = Math.floor(S.nest.trungga + S.nest.trungvit);
  const away = Date.now() - before;
  if (away < 2 * MIN) return '';
  return [ts && `${ts} lờ đã đầy`, bs && `${bs} luống rau chín`, eggs && `${eggs} quả trứng trong ổ`].filter(Boolean).join(' · ');
};
