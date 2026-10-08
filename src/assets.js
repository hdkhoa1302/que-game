// Mô hình dựng trong Blender (xuất ra public/models/mekong.json): mỗi mục là tam giác + màu theo mặt.
import * as THREE from 'three';

const DATA = {}, GEO = {};

export const loadAssets = async () => {
  const r = await fetch(`${import.meta.env.BASE_URL}models/mekong.json`);
  Object.assign(DATA, await r.json());
};

export const has = (name) => !!DATA[name];
export const geo = (name) => {
  if (GEO[name]) return GEO[name];
  const d = DATA[name]; if (!d) return null;
  const g = new THREE.BufferGeometry(), col = new Float32Array(d.c.length * 9), c = new THREE.Color();
  d.c.forEach((hex, i) => { c.setHex(hex); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], i * 9 + k * 3); });
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.p), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return (GEO[name] = g);
};
