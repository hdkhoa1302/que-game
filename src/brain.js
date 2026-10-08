// Ông Trời: luật cố định đọc số liệu cả làng và ĐỀ XUẤT sự kiện; trưởng làng duyệt mới chạy. Thuần, không DOM.
import { LOCI } from './genes.js';
import { SP, BRAIN, PHASE_STEPS, STEP_MS } from './data.js';

const LIFE_MS = PHASE_STEPS * STEP_MS; // đề xuất sống một mùa game; sự kiện cũng kéo dài một mùa
const int = (v, hi) => (Number.isFinite(v) ? Math.max(0, Math.min(hi, Math.round(v))) : 0);

// ---- client: tóm tắt nông trại (số con, đếm allele từng locus, xu) ----
export const summarize = (S) => ({
  farm: S.farmId, coins: S.coins,
  herd: Object.fromEntries(Object.keys(SP).map((sp) => {
    const as = S.animals.filter((a) => a.sp === sp);
    const al = Object.fromEntries(LOCI.map((l) => { const c = Array(10).fill(0); as.forEach((a) => a.genome[l].forEach((v) => c[v]++)); return [l, c]; }));
    return [sp, { m: as.filter((a) => a.sex === 'm').length, f: as.filter((a) => a.sex === 'f').length, al }];
  })),
});

// ---- server: làm sạch báo cáo (client có thể nói dối, nhưng không được làm hỏng server) ----
export const sanitize = (r) => {
  if (!r || typeof r !== 'object' || typeof r.farm !== 'string' || !/^[a-z0-9]{6,16}$/.test(r.farm)) return null;
  const herd = {};
  for (const sp of Object.keys(SP)) {
    const h = r.herd?.[sp] || {};
    herd[sp] = { m: int(h.m, 200), f: int(h.f, 200), al: Object.fromEntries(LOCI.map((l) => [l, Array.from({ length: 10 }, (_, i) => int(h.al?.[l]?.[i], 400))])) };
  }
  return { farm: r.farm, coins: int(r.coins, 1e7), herd };
};

const median = (xs) => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

// tần suất allele cả làng: mỗi nông trại góp quyền như nhau (một người khai 400 con không lấn át được)
export const diversity = (farms) => {
  const out = [];
  for (const sp of Object.keys(SP)) for (const l of LOCI) {
    const fr = farms.map((f) => f.herd[sp].al[l]).filter((c) => c.reduce((a, b) => a + b, 0) >= 2).map((c) => { const t = c.reduce((a, b) => a + b, 0); return c.map((x) => x / t); });
    if (fr.length < BRAIN.minFarms) continue;
    const mean = Array.from({ length: 10 }, (_, i) => fr.reduce((a, f) => a + f[i], 0) / fr.length);
    const allele = mean.indexOf(Math.max(...mean));
    out.push({ sp, locus: l, allele, share: mean[allele], farms: fr.length });
  }
  return out;
};

const busy = (B, type, sp, now, step) =>
  B.proposals.some((p) => p.type === type && (!sp || p.sp === sp) && p.expires > now) ||
  B.events.some((e) => e.type === type && (!sp || e.sp === sp) && step < e.to + PHASE_STEPS); // đang chạy hoặc vừa xong một mùa

// B = {reports:{farm:{...,t}}, history:[{t, median}], proposals:[], events:[]}
export const think = (B, now, step) => {
  B.proposals = B.proposals.filter((p) => p.expires > now);
  for (const [k, r] of Object.entries(B.reports)) if (now - r.t > 2 * BRAIN.activeMs) delete B.reports[k];
  const farms = Object.values(B.reports).filter((r) => now - r.t < BRAIN.activeMs);
  if (farms.length < BRAIN.minFarms) return [];
  const made = [], id = () => `${now.toString(36)}${made.length}`;
  const med = median(farms.map((f) => f.coins));
  if (!B.history.length || now - B.history.at(-1).t >= BRAIN.historyGapMs) { B.history.push({ t: now, median: med }); if (B.history.length > 60) B.history.shift(); }

  // 1. gen thiếu đa dạng → dịch bệnh nhắm kiểu gen đang thừa
  const worst = diversity(farms).filter((d) => d.share > BRAIN.dominant).sort((a, b) => b.share - a.share);
  for (const d of worst) {
    if (busy(B, 'dich', d.sp, now, step)) continue;
    made.push({ id: id(), type: 'dich', sp: d.sp, locus: d.locus, allele: d.allele, created: now, expires: now + LIFE_MS,
      reason: `${Math.round(d.share * 100)}% allele ${d.allele} ở gen "${d.locus}" của ${SP[d.sp].name.toLowerCase()} (${d.farms} nông trại)` });
    break; // mỗi lần một đề xuất dịch
  }
  // 2. kinh tế: so xu trung vị với một năm game trước
  const old = [...B.history].reverse().find((h) => now - h.t >= BRAIN.econWindowMs);
  if (old && old.median >= BRAIN.econMinCoins && !busy(B, 'gia', null, now, step)) {
    const g = med / old.median;
    const mul = g > 1 + BRAIN.inflate ? BRAIN.priceDown : g < 1 - BRAIN.deflate ? BRAIN.priceUp : 0;
    if (mul) made.push({ id: id(), type: 'gia', mul, created: now, expires: now + LIFE_MS,
      reason: `Xu trung vị ${Math.round(old.median)} → ${Math.round(med)} (${g > 1 ? '+' : ''}${Math.round((g - 1) * 100)}% sau một năm game)` });
  }
  B.proposals.push(...made);
  return made;
};

// trưởng làng duyệt/bỏ; duyệt thì thành sự kiện chung bắt đầu ở bước kế, kéo dài một mùa
export const decide = (B, id, ok, now, step) => {
  const p = B.proposals.find((x) => x.id === id && x.expires > now);
  if (!p) return null;
  B.proposals.splice(B.proposals.indexOf(p), 1);
  if (!ok) return null;
  const { type, sp, locus, allele, mul, reason } = p, e = { id, type, from: step + 1, to: step + 1 + PHASE_STEPS, reason };
  if (type === 'dich') Object.assign(e, { sp, locus, allele }); else e.mul = mul;
  B.events.push(e);
  B.events = B.events.filter((x) => x.to > step - 4 * PHASE_STEPS);
  return e;
};

export const describe = (e) => e.type === 'dich'
  ? `🦠 Dịch ${SP[e.sp].name.toLowerCase()}: con mang gen "${e.locus}" = ${e.allele} dễ ốm hơn`
  : e.mul < 1 ? `📉 Thương lái ép giá: bán chợ ×${e.mul}` : `📈 Chợ khan hàng: bán chợ ×${e.mul}`;
