// Địa lý và vật thể khai thác: sông, hồ, sinh vật thể xác định, kiểm tra còn dùng được. Thuần, không đụng DOM.
import { mulberry32 } from './genes.js';
import { OBJ, ZONES, WATER_MIX, WALK_R, PADDY, PLOTS, RIVER } from './data.js';

export const LAKE = { x: -23, z: 3, rx: 5.5, rz: 3 };
export const inEll = (e, x, z, k = 1) => ((x - e.x) / (e.rx * k)) ** 2 + ((z - e.z) / (e.rz * k)) ** 2 < 1;

// ---- sông: đường tâm Catmull-Rom lấy mẫu N điểm ----
const N = 170;
const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
export const RS = (() => {
  const P = RIVER.pts, segs = P.length - 1, out = [];
  for (let i = 0; i < N; i++) {
    const u = (i / (N - 1)) * segs, k = Math.min(segs - 1, Math.floor(u)), t = u - k, p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(segs, k + 2)];
    out.push({ x: cr(p0[0], p1[0], p2[0], p3[0], t), z: cr(p0[1], p1[1], p2[1], p3[1], t) });
  }
  let L = 0;
  out.forEach((p, i) => {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(N - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, m = Math.hypot(tx, tz) || 1;
    if (i) L += Math.hypot(p.x - out[i - 1].x, p.z - out[i - 1].z);
    Object.assign(p, { tx: tx / m, tz: tz / m, nx: -tz / m, nz: tx / m, L, half: RIVER.half * (1 + 0.16 * Math.sin(i * 0.09 + 1) + 0.08 * Math.sin(i * 0.23)) });
  });
  return out;
})();

// điểm trên đường tâm tại s ∈ [0,1]: toạ độ, pháp tuyến, nửa bề rộng (đã nhân hệ số mực nước k) và góc dòng chảy
export const riverPoint = (s, k = 1) => {
  const f = Math.min(Math.max(s, 0), 1) * (N - 1), i = Math.min(N - 2, Math.floor(f)), t = f - i, a = RS[i], b = RS[i + 1], l = (u, v) => u + (v - u) * t;
  return { x: l(a.x, b.x), z: l(a.z, b.z), nx: l(a.nx, b.nx), nz: l(a.nz, b.nz), half: l(a.half, b.half) * k, ang: Math.atan2(l(a.tx, b.tx), l(a.tz, b.tz)) };
};
// điểm gần nhất trên đường tâm: khoảng cách d, nửa bề rộng tại đó, s, chân vuông góc (cx, cz)
export const riverAt = (x, z, k = 1) => {
  let best = null;
  for (let i = 0; i < N - 1; i++) {
    const a = RS[i], b = RS[i + 1], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))), cx = a.x + dx * t, cz = a.z + dz * t, d = Math.hypot(x - cx, z - cz);
    if (!best || d < best.d) best = { d, cx, cz, s: (i + t) / (N - 1), half: (a.half + (b.half - a.half) * t) * k };
  }
  return best;
};
export const shallowAt = (x, z, k = 1) => { const r = riverAt(x, z, k), f = r.d / r.half; return f >= 0.5 && f <= 0.97; }; // nước nông ven bờ để đặt lờ
// kéo một điểm (vd lờ cũ trong ao) về nước nông gần nhất của sông
export const snapToShallow = (x, z, k = 1) => {
  const r = riverAt(x, z, k); let ux = x - r.cx, uz = z - r.cz; const m = Math.hypot(ux, uz);
  if (m < 1e-3) { const p = riverPoint(r.s, k); ux = p.nx; uz = p.nz; } else { ux /= m; uz /= m; }
  return [r.cx + ux * r.half * 0.78, r.cz + uz * r.half * 0.78];
};

// khu nhà, vườn, chuồng, chợ, bến: không rải vật thể; bờ sông thì chỉ vật ven nước được ở đó
export const keepOut = (x, z, wet = false) => (x > PADDY.x0 - 1 && x < PADDY.x1 + 1 && z > PADDY.z0 - 1 && z < PADDY.z1 + 1) || inEll(LAKE, x, z, 1.25) || (x > -9 && x < 3 && z > -4.6 && z < 5.3) || (x > -9 && x < 3 && z > 4.5 && z < 10.8) || (x > -9 && x < -1 && z > -9 && z < -2) || (x > 1 && x < 8 && z > 3.6 && z < 8.2) || (x > 1 && x < 7.5 && z > -2.4 && z < 0.8) || (() => { const r = riverAt(x, z, 1.2); return wet ? r.d < r.half * 1.12 : r.d < r.half * 1.2 + 0.7; })();

export const genObjects = () => {
  const rng = mulberry32(20241008), list = [];
  const add = (kind, x, z, gap = 1.35, wet = false) => {
    if (Math.hypot(x, z) > WALK_R - 1 || keepOut(x, z, wet) || list.some((o) => Math.hypot(o.x - x, o.z - z) < gap)) return false;
    list.push({ id: list.length, kind, x, z, rot: rng() * 6.283, s: 0.85 + rng() * 0.4 });
    return true;
  };
  for (const zn of ZONES) for (const [kind, n] of zn.mix) {
    for (let k = 0, got = 0; got < n && k < n * 60; k++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * zn.r; if (add(kind, zn.x + Math.cos(a) * r, zn.z + Math.sin(a) * r)) got++; }
  }
  for (const [kind, n] of WATER_MIX.river) { // dọc hai bờ sông
    for (let k = 0, got = 0; got < n && k < n * 80; k++) { const p = riverPoint(0.03 + rng() * 0.9, 1.15), side = rng() < 0.5 ? -1 : 1, f = 1.08 + rng() * 0.4; if (add(kind, p.x + p.nx * side * p.half * f, p.z + p.nz * side * p.half * f, 0.8, true)) got++; }
  }
  for (const [kind, n] of WATER_MIX.lake) { // quanh rạch
    for (let k = 0, got = 0; got < n && k < n * 60; k++) { const a = rng() * 6.283, f = 1.34 + rng() * 0.3; if (add(kind, LAKE.x + Math.cos(a) * LAKE.rx * f, LAKE.z + Math.sin(a) * LAKE.rz * f, 0.8, true)) got++; }
  }
  // bốn thửa ruộng: vật thể khai thác đặc biệt, mỗi thửa một mục (tâm thửa + hình chữ nhật)
  PLOTS.forEach((pl) => list.push({ id: list.length, kind: 'thua', x: (pl.x0 + pl.x1) / 2, z: (pl.z0 + pl.z1) / 2, rot: 0, s: 1, plot: pl }));
  return list;
};

// còn khai thác được không: đúng mùa và đã mọc lại
export const objAvail = (S, o, day, phase) => {
  const d = OBJ[o.kind];
  if (d.phases && !d.phases.includes(phase)) return false;
  return !(S.obj[o.id] > day);
};
export const zoneAt = (x, z) => {
  if (inEll(LAKE, x, z, 2)) return 'Bờ rạch';
  const r = riverAt(x, z, 1);
  if (r.d < r.half * 1.5) return 'Ven sông';
  let best = null, bd = 1e9;
  for (const zn of ZONES) { const d = Math.hypot(x - zn.x, z - zn.z) - zn.r; if (d < bd) { bd = d; best = zn; } }
  return bd < 3 ? best.name : 'Đồng hoang';
};
