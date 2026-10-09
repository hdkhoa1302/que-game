import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as A from './assets.js';

// Một vật liệu duy nhất (màu theo đỉnh) → mỗi mô hình gộp thành 1 draw call.
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

const E = new THREE.Euler(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class B {
  constructor() { this.g = []; }
  // p=[x,y,z] r=[rx,ry,rz] s=[sx,sy,sz]
  add(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    M4.compose(V(...p), Q.setFromEuler(E.set(...r)), V(...s));
    g.applyMatrix4(M4);
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  box(c, p, s, r) { return this.add(new THREE.BoxGeometry(1, 1, 1), c, p, r, s); }
  cyl(c, p, rt, rb, h, seg = 7, r) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, p, r); }
  cone(c, p, rad, h, seg = 6, r) { return this.add(new THREE.ConeGeometry(rad, h, seg), c, p, r); }
  ball(c, p, s, seg = 6) { return this.add(new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)), c, p, [0, 0, 0], s); }
  mesh() { return new THREE.Mesh(mergeGeometries(this.g), MAT); }
}

export const blob = (r = 0.5) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02;
  return m;
};

export const bubble = (txt) => {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath(); x.arc(48, 44, 38, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(36, 78); x.lineTo(48, 94); x.lineTo(60, 78); x.fill();
  x.font = '44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 48, 46);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(1.1, 1.1, 1); s.renderOrder = 10;
  return s;
};

// Vật vô hình, to hơn hình thật, để chạm trúng dễ trên điện thoại.
export const hit = (kind, idx, w, h, d, p) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(...p); m.userData = { kind, idx };
  return m;
};

const LEAF = [0x4f9d3a, 0x5fae45, 0x3f8a35], TRUNK = 0x7a4f2b;

export const tree = (b, x, z, s = 1) => {
  b.cyl(TRUNK, [x, 0.5 * s, z], 0.12 * s, 0.18 * s, 1 * s, 5);
  const c = LEAF[Math.floor((x * 7 + z * 3) & 1) + (x > 0 ? 1 : 0)];
  b.cone(c, [x, 1.5 * s, z], 0.85 * s, 1.4 * s, 6);
  b.cone(c, [x, 2.2 * s, z], 0.6 * s, 1.2 * s, 6);
};
export const rock = (b, x, z, s = 1) => b.ball(0x9a9a92, [x, 0.12 * s, z], [0.4 * s, 0.25 * s, 0.35 * s], 5);
export const fence = (b, x, z, len, rotY = 0) => {
  const n = Math.round(len / 0.7), cs = Math.cos(rotY), sn = Math.sin(rotY);
  for (let i = 0; i <= n; i++) {
    const t = (i / n - 0.5) * len;
    b.box(0xb98a52, [x + cs * t, 0.3, z - sn * t], [0.08, 0.6, 0.08]);
  }
  b.box(0xc89a60, [x, 0.42, z], [len, 0.06, 0.05], [0, rotY, 0]);
  b.box(0xc89a60, [x, 0.22, z], [len, 0.06, 0.05], [0, rotY, 0]);
};

// ---- Nhà theo cấp ----
export const coop = (lv, leaf) => {
  const b = new B();
  b.box(0xb98a52, [0, 0.55, 0], [1.9, 1.1, 1.4]);
  b.cone(leaf ? 0x86a842 : lv > 1 ? 0xb8452f : 0x6b4a36, [0, 1.5, 0], leaf ? 1.75 : 1.55, leaf ? 0.95 : 0.8, leaf ? 8 : 4, [0, Math.PI / 4, 0]);
  b.box(0x3a2a1c, [0.5, 0.4, 0.71], [0.45, 0.6, 0.04]);
  b.box(0xe8d9b0, [-0.5, 0.7, 0.71], [0.4, 0.4, 0.04]);
  b.box(0x8a6a4a, [0.5, 0.2, 1.1], [0.8, 0.06, 0.6], [0.35, 0, 0]);
  if (lv > 2) b.box(0xe8d9b0, [1.6, 0.4, 0], [1.2, 0.8, 1.2]);
  return b.mesh();
};

export const trap = () => {
  const b = new B();
  b.cyl(0xc8b070, [0, 0.1, 0], 0.17, 0.17, 0.85, 7, [0, 0, Math.PI / 2]);
  b.cone(0xa98f50, [0.5, 0.1, 0], 0.2, 0.3, 7, [0, 0, -Math.PI / 2]);
  b.box(0x8a6a4a, [-0.2, 0.1, 0], [0.04, 0.38, 0.38]);
  return b.mesh();
};
export const stake = () => {
  const b = new B();
  b.cyl(0x7a4f2b, [0, 0.35, 0], 0.04, 0.04, 0.7, 4);
  b.box(0xf6d34a, [0.12, 0.62, 0], [0.24, 0.16, 0.02]);
  return b.mesh();
};

export const rod = () => {
  const b = new B();
  b.cyl(0x7a4f2b, [0, 0.9, 0], 0.02, 0.035, 1.8, 4, [0, 0, 0.5]);
  b.cyl(0x7a4f2b, [-0.45, 0.0, 0], 0.04, 0.04, 0.5, 4);
  return b.mesh();
};

// ---- Con vật (màu theo gen, trống có mào lớn) ----
export const chicken = (color, male) => {
  const b = new B();
  b.ball(color, [0, 0.28, 0], [0.22, 0.2, 0.28], 6);
  b.ball(color, [0, 0.52, 0.2], [0.11, 0.12, 0.11], 5);
  b.cone(0xf0a020, [0, 0.5, 0.33], 0.04, 0.1, 4, [Math.PI / 2, 0, 0]);
  b.box(0xd8332a, [0, male ? 0.7 : 0.65, 0.2], male ? [0.04, 0.12, 0.14] : [0.03, 0.07, 0.08]);
  if (male) b.box(0xd8332a, [0, 0.42, 0.3], [0.04, 0.08, 0.04]);
  b.cone(color, [0, 0.4, -0.3], male ? 0.14 : 0.1, male ? 0.38 : 0.25, 4, [-0.9, 0, 0]);
  b.box(0xf0a020, [0.07, 0.07, 0.02], [0.03, 0.14, 0.03]); b.box(0xf0a020, [-0.07, 0.07, 0.02], [0.03, 0.14, 0.03]);
  return b.mesh();
};
export const duck = (color, male) => {
  const b = new B();
  b.ball(color, [0, 0.22, 0], [0.2, 0.17, 0.3], 6);
  b.ball(male ? 0x2f7a4f : color, [0, 0.45, 0.2], [0.11, 0.11, 0.11], 5);
  b.box(0xf0a020, [0, 0.42, 0.34], [0.12, 0.04, 0.12]);
  b.cone(color, [0, 0.3, -0.3], 0.09, 0.2, 4, [-1.2, 0, 0]);
  b.box(0xf0a020, [0.07, 0.04, 0.02], [0.05, 0.08, 0.1]); b.box(0xf0a020, [-0.07, 0.04, 0.02], [0.05, 0.08, 0.1]);
  return b.mesh();
};

// ---- Công trình mới ----
export const nest = () => new B().cyl(0xd9b45a, [0, 0.1, 0], 0.38, 0.46, 0.2, 8).cyl(0xc9a24a, [0, 0.2, 0], 0.3, 0.3, 0.05, 8).ball(0xf6f0e2, [0, 0.27, 0], [0.1, 0.07, 0.08], 5).mesh();
export const lu = () => new B().cyl(0x9a6b3e, [0, 0.45, 0], 0.36, 0.28, 0.9, 8).cyl(0x7a4f2b, [0, 0.92, 0], 0.4, 0.4, 0.06, 8).cyl(0x4aa8d8, [0, 0.9, 0], 0.3, 0.3, 0.03, 8).mesh();
export const manure = () => new B().ball(0x6a4a2a, [0, 0.2, 0], [0.6, 0.28, 0.5], 5).ball(0x7a5a30, [0.35, 0.14, 0.22], [0.3, 0.2, 0.3], 5).ball(0x5f8f3a, [-0.2, 0.42, 0], [0.16, 0.1, 0.16], 4).box(0xa88a50, [0.5, 0.25, -0.3], [0.5, 0.05, 0.05], [0, 0.6, 0.3]).mesh();
export const platform = () => new B().box(0x7a5a38, [0, -0.1, 0], [2.1, 0.24, 1.5]).mesh();

// ---- Cây trồng theo giai đoạn 0..2 ----
export const plant = (crop, stage) => {
  const b = new B(), c = crop.color;
  const pts = [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]];
  for (const [x, z] of pts) {
    if (stage === 0) { b.cone(0x6fcf55, [x, 0.12, z], 0.07, 0.22, 4); continue; }
    const s = stage === 1 ? 0.7 : 1;
    if (crop.id === 'cachua') {
      b.cyl(0x3f8a35, [x, 0.3 * s, z], 0.02, 0.02, 0.6 * s, 3);
      b.ball(0x3f8a35, [x, 0.55 * s, z], [0.2 * s, 0.15 * s, 0.2 * s], 5);
      if (stage === 2) { b.ball(c, [x + 0.08, 0.4, z], [0.09, 0.09, 0.09], 5); b.ball(c, [x - 0.07, 0.3, z + 0.05], [0.08, 0.08, 0.08], 5); }
    } else if (crop.id === 'bi') {
      b.ball(0x3f8a35, [x, 0.14 * s, z], [0.25 * s, 0.12 * s, 0.25 * s], 5);
      if (stage === 2) b.ball(c, [x + 0.05, 0.14, z + 0.05], [0.2, 0.15, 0.2], 6);
    } else {
      for (let k = 0; k < 4; k++) b.cone(stage === 2 ? c : 0x6fcf55, [x + Math.cos(k * 1.57) * 0.07, 0.22 * s, z + Math.sin(k * 1.57) * 0.07], 0.07 * s + 0.02, 0.45 * s, 4, [Math.sin(k * 1.57) * 0.3, 0, -Math.cos(k * 1.57) * 0.3]);
    }
  }
  return b.mesh();
};
export const bedBase = () => new B().box(0x6a4326, [0, 0.08, 0], [1.9, 0.16, 1.3]).box(0x8a5a35, [0, 0.17, 0], [1.7, 0.04, 1.1]).mesh();

export const cloud = () => {
  const b = new B();
  [[0, 0, 0, 1.1], [1, 0.1, 0.2, 0.8], [-1, 0, -0.1, 0.8], [0.4, 0.3, 0, 0.7]].forEach(([x, y, z, s]) => b.ball(0xffffff, [x, y, z], [s * 1.1, s * 0.6, s * 0.8], 6));
  return b.mesh();
};

// Nhân vật: nón lá + áo xanh; chân là nhóm riêng (pivot ở hông) để đu đưa khi đi.
// ---- Vật thể khai thác: hình đầy đủ dựng trong Blender (o_<loại>), hình sau khi khai thác dựng nhẹ tại chỗ (null = ẩn) ----
export const objGeo = (kind) => {
  const sp = new B();
  const ring = (n, f) => { for (let i = 0; i < n; i++) f(i, (i / n) * Math.PI * 2); };
  switch (kind) {
    case 'tree': sp.cyl(0x7a4f2b, [0, 0.18, 0], 0.2, 0.26, 0.36, 6).cyl(0xc9a06a, [0, 0.37, 0], 0.18, 0.18, 0.03, 6); break;
    case 'palm': sp.cyl(0x8a6a44, [0, 0.2, 0], 0.1, 0.14, 0.4, 5); break;
    case 'bamboo': ring(7, (i, a) => sp.cyl(0x9bb04a, [Math.cos(a) * 0.24, 0.1 + (i % 3) * 0.05, Math.sin(a) * 0.24], 0.05, 0.06, 0.2 + (i % 3) * 0.1, 5)); break;
    case 'rock': sp.ball(0x8a8a84, [0.2, 0.1, 0], [0.3, 0.12, 0.25], 5).ball(0x9a9a92, [-0.2, 0.08, 0.1], [0.2, 0.08, 0.18], 5); break;
    case 'grass': ring(4, (i, a) => sp.cone(0xb4b84a, [Math.cos(a) * 0.1, 0.07, Math.sin(a) * 0.1], 0.05, 0.14, 3)); break;
    case 'reed': for (let k = 0; k < 4; k++) sp.cyl(0x6a8a3a, [(k - 1.5) * 0.14, 0.08, 0], 0.025, 0.03, 0.16, 3); break;
    case 'clay': sp.cyl(0x8a5a3a, [0, 0.03, 0], 0.7, 0.8, 0.05, 8); break;
    case 'berry': sp.ball(0x3f8a35, [0, 0.35, 0], [0.55, 0.4, 0.5], 5); break;
    case 'ban': sp.cyl(0x6b4a36, [0, 0.2, 0], 0.22, 0.3, 0.4, 7); break;
    case 'nipa': sp.ball(0x6a4a22, [0, 0.15, 0], [0.22, 0.14, 0.22], 5); break;
  }
  const name = kind === 'nipa' ? 'dua_nuoc' : kind === 'ban' ? 'ban' : `o_${kind}`;
  return { full: A.has(name) ? A.geo(name) : new B().box(0, [0, -9, 0], [0.01, 0.01, 0.01]).mesh().geometry, // thửa ruộng: không hình riêng (plotMeshes vẽ)
    spent: sp.g.length ? sp.mesh().geometry : null };
};

export const bench = () => {
  const b = new B();
  b.box(0x9a6a3a, [0, 0.78, 0], [1.7, 0.14, 0.9]);
  [[-0.72, -0.35], [0.72, -0.35], [-0.72, 0.35], [0.72, 0.35]].forEach(([x, z]) => b.box(0x7a4f2b, [x, 0.36, z], [0.12, 0.72, 0.12]));
  b.ball(0x6a6a70, [0.35, 0.98, 0], [0.22, 0.14, 0.14], 5); b.box(0x5a5a60, [0.35, 0.86, 0], [0.34, 0.1, 0.2]);
  b.box(0x7a4f2b, [-0.35, 0.9, 0.1], [0.4, 0.05, 0.05], [0, 0.4, 0]); b.box(0x5a5a60, [-0.5, 0.93, 0.18], [0.12, 0.1, 0.08], [0, 0.4, 0]);
  b.box(0xb98a52, [0, 0.2, 0.6], [1.0, 0.4, 0.3]);
  return b.mesh();
};

// ---- Mô hình từ Blender (bắt buộc tải xong trước khi vào game: xem boot.js) ----
export const fromBlender = (name) => (A.has(name) ? new THREE.Mesh(A.geo(name), MAT) : null);
export const houseB = (lv) => fromBlender(`nha${lv}`);
export const stallB = () => fromBlender('quay_cho');
export const dockB = () => fromBlender('ben_tre');
export const bridgeB = () => fromBlender('cau_khi');
export const playerB = () => {
  const body = fromBlender('player_body'), lg = fromBlender('player_leg');
  const g = new THREE.Group(), mk = (x) => { const p = new THREE.Group(), m = lg.clone(); p.add(m); p.position.set(x, 0.4, 0); return p; };
  const legL = mk(-0.1), legR = mk(0.1);
  g.add(body, legL, legR, blob(0.32)); g.userData = { body, legL, legR };
  return g;
};
