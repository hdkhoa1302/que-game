// Gen gà vịt: 5 locus × 2 allele (0–9). Thuần, không đụng DOM.
const LOCI = ['color', 'size', 'eggs', 'resist', 'water'];
export const MUT = 0.02;

export const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const rngAt = (seed, n) => mulberry32((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0);

const clamp = (v) => Math.max(0, Math.min(9, v));
const pick = (a, rng) => a[rng() < 0.5 ? 0 : 1];
const mut = (v, rng) => (rng() < MUT ? clamp(v + (rng() < 0.5 ? -1 : 1)) : v);

export const founder = (rng) => Object.fromEntries(LOCI.map((l) => {
  const one = () => (l === 'color' ? Math.floor(rng() * 10) : 3 + Math.floor(rng() * 4));
  return [l, [one(), one()]];
}));
export const cross = (m, f, rng) => Object.fromEntries(LOCI.map((l) => [l, [mut(pick(m[l], rng), rng), mut(pick(f[l], rng), rng)]]));

export const avg = (g, l) => (g[l][0] + g[l][1]) / 2;
export const colorOf = (g) => { const d = Math.max(...g.color); return d <= 2 ? 0 : d <= 4 ? 1 : d <= 6 ? 2 : 3; };
export const sizeGroup = (g) => { const s = avg(g, 'size'); return s < 3.5 ? 'S' : s < 6 ? 'M' : 'L'; };
