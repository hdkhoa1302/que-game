import * as THREE from 'three';
import * as M from './models.js';
import { PADDY, PLOTS } from './data.js';
import { keepOut, LAKE } from './objs.js';

export const initTerrain = ({ scene, rnd, RN, riverPoint }) => {
  {
    const b = new M.B();
    b.cyl(0x6fb65a, [0, -0.25, 0], 58, 58.4, 0.5, 40);
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100;
      if (!keepOut(x, z)) b.ball(i % 2 ? 0x7cc467 : 0x5fa84d, [x, 0, z], [1 + rnd() * 2, 0.12, 1 + rnd() * 2], 6);
    }
    for (let i = 0; i < 28; i++) {
      const an = (i / 28) * 6.283 + rnd() * 0.2, r = 38 + rnd() * 12, h = 1.2 + rnd() * 1.5;
      b.ball([0x4f8a45, 0x5a9a4e, 0x3f7a38, 0x6a9a55][i % 4], [Math.cos(an) * r, 0, Math.sin(an) * r], [h * 2.5, h * 0.45, h * 2.5], 6);
    }
    [[-4, -2.6], [-3.4, -1.2], [-2.6, 0.4], [-1, 1], [0.6, 2.4], [1.8, 4.2], [3.2, 5.4], [3.6, 3.2], [3.0, 1.4], [2.4, -0.4]].forEach(([x, z]) => b.cyl(0xd2b27a, [x, 0.01, z], 0.6, 0.6, 0.03, 8));
    M.fence(b, -4.6, 8.4, 6, Math.PI / 2); M.fence(b, -1.6, 10.6, 6, 0); M.fence(b, 1.8, 7.6, 4.5, Math.PI / 2);
    M.fence(b, -4.4, 4.2, 5, 0); M.fence(b, 2.4, 4.4, 4, 0);
    scene.add(b.mesh());
  }

  const ribbonGeo = (uvY) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 2 * 3), 3));
    if (uvY) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(RN * 2 * 2), 2));
    const idx = []; for (let i = 0; i < RN - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx); return geo;
  };

  const fillRibbon = (geo, kRVal, f0, f1, y) => {
    const p = geo.attributes.position.array, uv = geo.attributes.uv?.array;
    for (let i = 0; i < RN; i++) {
      const q = riverPoint(i / (RN - 1), kRVal);
      p[i * 6] = q.x + q.nx * q.half * f0; p[i * 6 + 1] = y; p[i * 6 + 2] = q.z + q.nz * q.half * f0;
      p[i * 6 + 3] = q.x + q.nx * q.half * f1; p[i * 6 + 4] = y; p[i * 6 + 5] = q.z + q.nz * q.half * f1;
      if (uv) { uv[i * 4] = 0; uv[i * 4 + 1] = i * 0.4; uv[i * 4 + 2] = 1; uv[i * 4 + 3] = i * 0.4; }
    }
    geo.attributes.position.needsUpdate = true; if (uv) geo.attributes.uv.needsUpdate = true;
  };

  const riverTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#8e5932'; g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = i % 2 ? 'rgba(176,116,72,0.45)' : 'rgba(207,175,136,0.3)';
      g.lineWidth = 1.2 + rnd() * 2.2;
      const x = rnd() * 64, y = rnd() * 128; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y + 8 + rnd() * 26); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const mudG = ribbonGeo(false), waterG = ribbonGeo(true), zoneG = [ribbonGeo(false), ribbonGeo(false)];
  const waterMat = new THREE.MeshLambertMaterial({ map: riverTex, emissive: 0x241408, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(mudG, new THREE.MeshLambertMaterial({ color: 0x8a6a45, side: THREE.DoubleSide })), new THREE.Mesh(waterG, waterMat));

  const zone = new THREE.Group();
  for (const g of zoneG) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x9be8a0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })); m.frustumCulled = false; zone.add(m); }
  zone.visible = false; scene.add(zone);

  const shapeRiver = (kR) => {
    fillRibbon(mudG, kR, -1.16, 1.16, 0.02);
    fillRibbon(waterG, kR, -1, 1, 0.06);
    fillRibbon(zoneG[0], kR, 0.5, 0.97, 0.1);
    fillRibbon(zoneG[1], kR, -0.97, -0.5, 0.1);
  };

  const lake = new THREE.Group();
  {
    const mud = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 24), new THREE.MeshLambertMaterial({ color: 0x8a6a45, flatShading: true }));
    const wat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 28), new THREE.MeshLambertMaterial({ color: 0x825430, emissive: 0x241408, flatShading: true }));
    mud.scale.set(LAKE.rx * 1.12, 1, LAKE.rz * 1.12); mud.position.y = 0.02; wat.scale.set(LAKE.rx, 1, LAKE.rz); wat.position.y = 0.05;
    lake.add(mud, wat); lake.position.set(LAKE.x, 0, LAKE.z); scene.add(lake);
  }

  const dockM = M.dockB(); dockM.position.set(2.6, 0, -1.2); scene.add(dockM);
  const cauM = M.bridgeB(); cauM.position.set(5.1, 0, -1.2); cauM.scale.x = 1.66; cauM.visible = false; scene.add(cauM);
  const oapM = M.nest(); oapM.position.set(-2.2, 0, 6.2); oapM.visible = false; scene.add(oapM);
  const luM = [[-2.6, -3.2], [-1.6, -3.2]].map(([x, z]) => { const m = M.lu(); m.position.set(x, 0, z); m.visible = false; scene.add(m); return m; });
  const phanM = M.manure(); phanM.position.set(-6.6, 0, 7.2); phanM.visible = false; scene.add(phanM);
  const heap = M.manure(); heap.position.set(-6.6, 0, 7.2); heap.scale.setScalar(0.7); heap.visible = false; scene.add(heap);
  const BENCH = new THREE.Vector3(-0.2, 0, -3.2);
  const benchM = M.bench(); benchM.position.copy(BENCH); benchM.rotation.y = 0.3; benchM.visible = false; scene.add(benchM);

  const plotMeshes = [];
  {
    const w = PADDY.x1 - PADDY.x0, h = PADDY.z1 - PADDY.z0, cx = (PADDY.x0 + PADDY.x1) / 2, cz = (PADDY.z0 + PADDY.z1) / 2;
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, h), new THREE.MeshLambertMaterial({ color: 0x7fb4c4, transparent: true, opacity: 0.8, flatShading: true })); mirror.position.set(cx, 0.03, cz); scene.add(mirror);
    const bund = new M.B(); for (let i = 0; i <= 2; i++) bund.box(0x8a6a3a, [cx, 0.08, PADDY.z0 + (h * i) / 2], [w + 0.4, 0.16, 0.3]); for (let i = 0; i <= 2; i++) bund.box(0x8a6a3a, [PADDY.x0 + (w * i) / 2, 0.08, cz], [0.3, 0.16, h]);
    scene.add(bund.mesh());
    const geo = { xanh: M.fromBlender('lua_xanh').geometry, chin: M.fromBlender('lua_chin').geometry };
    const dummy = new THREE.Object3D();
    PLOTS.forEach((pl, j) => {
      const pts = []; for (let x = pl.x0 + 0.4; x < pl.x1 - 0.2; x += 0.75) for (let z = pl.z0 + 0.4; z < pl.z1 - 0.2; z += 0.75) pts.push([x + (rnd() - 0.5) * 0.2, z + (rnd() - 0.5) * 0.2]);
      const mk = (g) => { const im = new THREE.InstancedMesh(g, M.MAT, pts.length); im.frustumCulled = false; pts.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, rnd() * 6, 0); dummy.scale.setScalar(0.85 + rnd() * 0.3); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); scene.add(im); return im; };
      plotMeshes.push({ j, xanh: mk(geo.xanh), chin: mk(geo.chin) });
    });
  }

  return {
    shapeRiver, waterMat, riverTex, zone,
    dockM, cauM, oapM, luM, phanM, heap, BENCH, benchM, plotMeshes
  };
};
