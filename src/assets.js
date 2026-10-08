// Mô hình dựng trong Blender (public/models/mekong2.json): tam giác + màu đỉnh đã bake AO; mềm thì kèm pháp tuyến.
import * as THREE from 'three';

const DATA = {}, GEO = {};

export const loadAssets = async () => {
  const r = await fetch(`${import.meta.env.BASE_URL}models/mekong2.json`);
  Object.assign(DATA, await r.json());
};

export const has = (name) => !!DATA[name];
export const geo = (name) => {
  if (GEO[name]) return GEO[name];
  const d = DATA[name]; if (!d) return null;
  const n = d.p.length / 3, g = new THREE.BufferGeometry(), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { c.setHex(d.v[i]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.p), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (d.n) { const nn = new Float32Array(d.n.length); for (let i = 0; i < nn.length; i++) nn[i] = d.n[i] / 127; g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); } else g.computeVertexNormals();
  return (GEO[name] = g);
};
