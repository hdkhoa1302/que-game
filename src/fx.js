import * as THREE from 'three';
import * as M from './models.js';

export const initFx = (scene, rnd) => {
  const RAIN_N = 220, rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) rainPos.set([(rnd() - 0.5) * 22, rnd() * 9, (rnd() - 0.5) * 22], i * 3);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0xcfe6f5, size: 0.09, transparent: true, opacity: 0, depthWrite: false });
  const rain = new THREE.Points(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);

  const clouds = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const c = M.cloud(); c.position.set(-40 + i * 11, 6 + (i % 2) * 1.5, -24 + ((i * 7) % 8) * 6);
    c.scale.setScalar(0.8 + (i % 3) * 0.2); scene.add(c); return c;
  });

  const FF = 70, ffPos = new Float32Array(FF * 3), ffSeed = [];
  for (let i = 0; i < FF; i++) {
    const a = rnd() * 6.283, r = 3 + rnd() * 22;
    ffSeed.push([Math.cos(a) * r, 0.6 + rnd() * 1.4, Math.sin(a) * r, rnd() * 6]);
  }
  const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({ color: 0xfff08a, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireflies = new THREE.Points(ffGeo, ffMat); fireflies.frustumCulled = false; scene.add(fireflies);

  const SPK = Array.from({ length: 14 }, () => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.userData = { ph: rnd() * 6.283, s: 0.05 + rnd() * 0.9, off: (rnd() - 0.5) * 1.6 }; scene.add(m); return m;
  });

  const BUT = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: [0xffd23f, 0xf26b8a, 0xffffff, 0xb487f0, 0xff9f43][i], side: THREE.DoubleSide });
    const w = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.16, 0.0, 0.12), new THREE.Vector3(0.16, 0.0, -0.12)]);
    const wl = new THREE.Mesh(w, mat), wr = new THREE.Mesh(w, mat); wr.scale.x = -1; g.add(wl, wr);
    g.userData = { wl, wr, cx: -4 + rnd() * 9, cz: 1 + rnd() * 7, ph: rnd() * 6.283, r: 1 + rnd() };
    scene.add(g); return g;
  });

  return {
    updateFx: (dt, now, CAMT, rainK, d, RS, riverPoint) => {
      rainMat.opacity = rainK * 0.75; rain.visible = rainK > 0.02;
      if (rain.visible) {
        rain.position.set(CAMT.x, 0, CAMT.z);
        for (let i = 0; i < RAIN_N; i++) {
          rainPos[i * 3 + 1] -= dt * 14;
          if (rainPos[i * 3 + 1] < 0) rainPos[i * 3 + 1] = 8 + rnd() * 2;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      for (const c of clouds) { c.position.x += dt * 0.45; if (c.position.x > 50) c.position.x = -50; }
      ffMat.opacity = d < 0.25 ? (0.25 - d) * 3.6 : 0;
      if (ffMat.opacity > 0.02) {
        for (let i = 0; i < FF; i++) {
          const s = ffSeed[i];
          ffPos[i * 3] = s[0] + Math.cos(now * 0.8 + s[3]) * 0.6;
          ffPos[i * 3 + 1] = s[1] + Math.sin(now * 1.2 + s[3]) * 0.35;
          ffPos[i * 3 + 2] = s[2] + Math.sin(now * 0.7 + s[3]) * 0.6;
        }
        ffGeo.attributes.position.needsUpdate = true;
      }
      for (const m of SPK) {
        const u = m.userData, s = (u.s + now * 0.02) % 1, p = riverPoint(s, 1);
        m.position.set(p.x + p.nx * u.off, 0.07, p.z + p.nz * u.off);
        m.material.opacity = Math.max(0, Math.sin(now * 3 + u.ph)) * 0.55 * d;
      }
      for (const b of BUT) {
        const u = b.userData, a = now * 1.4 + u.ph;
        b.position.set(u.cx + Math.cos(a) * u.r, 0.4 + Math.sin(now * 3) * 0.15, u.cz + Math.sin(a) * u.r);
        b.rotation.y = -a + Math.PI / 2;
        const fl = Math.sin(now * 22) * 0.8;
        u.wl.rotation.z = fl; u.wr.rotation.z = -fl;
      }
    }
  };
};
