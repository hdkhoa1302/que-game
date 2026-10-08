// Vật thể khai thác trong thế giới: sinh xác định, kiểm tra còn dùng được. Thuần, không đụng DOM.
import { mulberry32 } from './genes.js';
import { OBJ, ZONES, WATER_MIX, WALK_R, DECOR, PADDY } from './data.js';

export const POND = { x: 6.2, z: -1.2, rx: 4.3, rz: 3.2 }, LAKE = { x: -23, z: 3, rx: 5.5, rz: 3 };
export const inEll = (e, x, z, k = 1) => ((x - e.x) / (e.rx * k)) ** 2 + ((z - e.z) / (e.rz * k)) ** 2 < 1;
// khu nhà, vườn, chuồng, chợ: không rải vật thể
export const keepOut = (x, z) => DECOR.some((d) => Math.hypot(d.x - x, d.z - z) < d.r) || (x > PADDY.x0 - 1 && x < PADDY.x1 + 1 && z > PADDY.z0 - 1 && z < PADDY.z1 + 1) || inEll(POND, x, z, 1.3) || inEll(LAKE, x, z, 1.25) || (x > -9 && x < 3 && z > -4.6 && z < 5.3) || (x > -9 && x < 3 && z > 4.5 && z < 10.8) || (x > -9 && x < -1 && z > -9 && z < -2) || (x > 1 && x < 8 && z > 3.6 && z < 8.2) || (x > 0 && x < 5 && z > -2.2 && z < 0.6);

export const genObjects = () => {
  const rng = mulberry32(20241008), list = [];
  const add = (kind, x, z, gap = 1.35) => {
    if (Math.hypot(x, z) > WALK_R - 1 || keepOut(x, z) || list.some((o) => Math.hypot(o.x - x, o.z - z) < gap)) return false;
    list.push({ id: list.length, kind, x, z, rot: rng() * 6.283, s: 0.85 + rng() * 0.4 });
    return true;
  };
  for (const zn of ZONES) for (const [kind, n] of zn.mix) {
    for (let k = 0, got = 0; got < n && k < n * 60; k++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * zn.r; if (add(kind, zn.x + Math.cos(a) * r, zn.z + Math.sin(a) * r)) got++; }
  }
  for (const [name, e] of [['pond', POND], ['lake', LAKE]]) for (const [kind, n] of WATER_MIX[name]) {
    for (let k = 0, got = 0; got < n && k < n * 60; k++) { const a = rng() * 6.283, f = 1.34 + rng() * 0.3, x = e.x + Math.cos(a) * e.rx * f, z = e.z + Math.sin(a) * e.rz * f; if (!(x < 3.6 && Math.abs(z + 1.2) < 1.6 && e === POND) && add(kind, x, z, 0.8)) got++; }
  }
  return list;
};

// còn khai thác được không: đúng mùa và đã mọc lại
export const objAvail = (S, o, day, phase) => {
  const d = OBJ[o.kind];
  if (d.phases && !d.phases.includes(phase)) return false;
  return !(S.obj[o.id] > day);
};
export const zoneAt = (x, z) => {
  let best = null, bd = 1e9;
  for (const zn of ZONES) { const d = Math.hypot(x - zn.x, z - zn.z) - zn.r; if (d < bd) { bd = d; best = zn; } }
  if (inEll(LAKE, x, z, 2)) return 'Bờ rạch';
  return bd < 3 ? best.name : 'Đồng hoang';
};
