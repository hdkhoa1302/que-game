import * as THREE from 'three';
import { S, tick, stageOf, bedReady, trapLeft, save, offlineSummary } from './state.js';
import { CROPS } from './data.js';
import * as M from './models.js';
import * as game from './game.js';
import { sfx } from './sfx.js';

// ---------- Renderer / camera ----------
const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 120);
const TARGET = new THREE.Vector3(0.8, 0, 1.2), DIR = new THREE.Vector3(1, 1.15, 1).normalize();
const fit = () => {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(w, h, false);
  camera.aspect = a; const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(18.5 / (2 * t * a), 16 / (2 * t));
  scene.fog.near = dist + 6; scene.fog.far = dist + 34;
  camera.position.copy(TARGET).addScaledVector(DIR, dist); camera.lookAt(TARGET); camera.updateProjectionMatrix();
};


const sky = new THREE.Color(), SKY = [new THREE.Color(0x9fd8f0), new THREE.Color(0x101c40)];
const hemi = new THREE.HemisphereLight(0xffffff, 0x8fb070, 1);
const sun = new THREE.DirectionalLight(0xfff2d6, 1.1); sun.position.set(-8, 14, 6);
const lamp = new THREE.PointLight(0xffa850, 0, 9, 1.5);
scene.add(hemi, sun, lamp);
scene.fog = new THREE.Fog(0x9fd8f0, 30, 62);
addEventListener('resize', fit); fit();

// ---------- Tĩnh: nền, cây, hàng rào (gộp 1 mesh) ----------
const rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646; })();
const POND = { x: 6.2, z: -1.2, rx: 4.3, rz: 3.2 };
const inPond = (x, z, k = 1.25) => ((x - POND.x) / (POND.rx * k)) ** 2 + ((z - POND.z) / (POND.rz * k)) ** 2 < 1;
const keepOut = (x, z) => inPond(x, z) || (x > -9 && x < 2 && z > -0.2 && z < 5.3) || (x > -9 && x < 3 && z > 4.5 && z < 10.5) || (x > -9 && x < -1 && z > -9 && z < -2) || (x > 1 && x < 7.5 && z > 4 && z < 8) || (x > 0 && x < 5 && z > -2.2 && z < 0);
{
  const b = new M.B();
  b.cyl(0x6fb65a, [0, -0.25, 0], 18, 18.4, 0.5, 28);
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * 30, z = (rnd() - 0.5) * 30; if (!keepOut(x, z) && Math.hypot(x, z) < 16) b.ball(i % 2 ? 0x7cc467 : 0x5fa84d, [x, 0, z], [1 + rnd() * 1.5, 0.12, 1 + rnd() * 1.5], 6); }
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 6.283, r = 7 + rnd() * 9, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z)) continue;
    const k = rnd(); k < 0.5 ? M.tree(b, x, z, 0.8 + rnd() * 0.7) : k < 0.65 ? M.rock(b, x, z, 0.8 + rnd()) : k < 0.8 ? M.bush(b, x, z, 0.8 + rnd() * 0.6) : M.flower(b, x, z, [0xf26b8a, 0xffd23f, 0xb487f0, 0xffffff][Math.floor(rnd() * 4)]);
  }
  // đường đất: nhà → vườn → chợ
  [[-4, -2.6], [-3.4, -1.2], [-2.6, 0.4], [-1, 1], [0.6, 2.4], [1.8, 4.2], [3.2, 5.4], [3.6, 3.2], [3.0, 1.4], [2.4, -0.4]].forEach(([x, z]) => b.cyl(0xd2b27a, [x, 0.01, z], 0.6, 0.6, 0.03, 8));
  // hàng rào sân gà vịt
  M.fence(b, -4.6, 8.4, 6, Math.PI / 2); M.fence(b, -1.6, 10.6, 6, 0); M.fence(b, 1.8, 7.6, 4.5, Math.PI / 2);
  M.fence(b, -4.4, 4.2, 5, 0); M.fence(b, 2.4, 4.4, 4, 0);
  scene.add(b.mesh());
}

// pond
const pond = new THREE.Group();
{
  const mud = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 24), new THREE.MeshLambertMaterial({ color: 0x8a6a45, flatShading: true }));
  mud.scale.set(POND.rx * 1.12, 1, POND.rz * 1.12); mud.position.y = 0.02;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 28), new THREE.MeshLambertMaterial({ color: 0x4aa8d8, emissive: 0x0b2a40, flatShading: true }));
  water.scale.set(POND.rx, 1, POND.rz); water.position.y = 0.05;
  pond.add(mud, water); pond.position.set(POND.x, 0, POND.z); pond.userData = { water };
  scene.add(pond);
}
const dockM = M.dock(); dockM.position.set(1.7, 0, -1.2); scene.add(dockM);
const rodM = M.rod(); rodM.position.set(4.35, 0.3, -0.7); rodM.rotation.y = 0.1; scene.add(rodM);
const ROD_TIP = new THREE.Vector3(4.35 + 0.7, 1.9, -0.75);

// clouds
const clouds = [0, 1, 2, 3].map((i) => { const c = M.cloud(); c.position.set(-18 + i * 11, 6 + (i % 2) * 1.5, -9 + i * 3); c.scale.setScalar(0.8 + (i % 3) * 0.2); scene.add(c); return c; });

// fireflies
const FF = 44, ffPos = new Float32Array(FF * 3), ffSeed = [];
for (let i = 0; i < FF; i++) { const a = rnd() * 6.283, r = 3 + rnd() * 9; ffSeed.push([Math.cos(a) * r, 0.6 + rnd() * 1.4, Math.sin(a) * r, rnd() * 6]); }
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const ffMat = new THREE.PointsMaterial({ color: 0xfff08a, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const fireflies = new THREE.Points(ffGeo, ffMat); fireflies.frustumCulled = false; scene.add(fireflies);

// ---------- Vật tương tác ----------
const hits = [];
const addHit = (h) => { scene.add(h); hits.push(h); return h; };
addHit(M.hit('pond', 0, POND.rx * 2.1, 0.4, POND.rz * 2.1, [POND.x, 0.2, POND.z]));
addHit(M.hit('pond', 0, 3.4, 1.2, 1.6, [3.2, 0.6, -1.2]));

const HOUSE = new THREE.Vector3(-5.2, 0, -5.2);
const houseG = new THREE.Group(); houseG.position.copy(HOUSE); houseG.rotation.y = 0.6; scene.add(houseG);
addHit(M.hit('house', 0, 3.6, 3.4, 3, [HOUSE.x, 1.6, HOUSE.z]));
const smoke = [0, 1, 2, 3].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); houseG.add(s); return s; });
let houseMesh, houseLv = 0;

const stall = M.stall(); stall.position.set(4.2, 0, 6.2); stall.rotation.y = -0.3; scene.add(stall);
addHit(M.hit('stall', 0, 3.4, 3, 2.2, [4.2, 1.4, 6.2]));
const stallLabel = M.bubble('🧺'); stallLabel.position.set(4.2, 3.6, 6.2); scene.add(stallLabel);

const COOP = new THREE.Vector3(-0.6, 0, 8.4);
const coopG = new THREE.Group(); coopG.position.copy(COOP); coopG.rotation.y = 0.15; scene.add(coopG);
addHit(M.hit('coop', 0, 2.8, 2, 2.2, [COOP.x, 1, COOP.z]));
let coopMesh, coopLv = 0;

const BEDS = []; // {g, hit, base, key}
const BED_POS = [[-6, 1.2], [-3.6, 1.2], [-1.2, 1.2], [-6, 3.3], [-3.6, 3.3], [-1.2, 3.3]];
const lockedMat = new THREE.MeshLambertMaterial({ color: 0x8a9a6a, flatShading: true });
BED_POS.forEach(([x, z], i) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const base = M.bedBase(); g.add(base);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 1.3), lockedMat); lock.position.y = 0.03; g.add(lock);
  const bub = M.bubble('🔒'); bub.position.y = 1.5; bub.scale.setScalar(0.8); g.add(bub);
  addHit(M.hit('bed', i, 2.1, 1.6, 1.5, [x, 0.7, z]));
  BEDS.push({ g, base, lock, bub, key: '', plant: null });
});

const TRAPS = [];
const TRAP_POS = [[4.1, 0.9], [8.6, 1.5], [9.9, -1.9], [6.7, -3.9]];
TRAP_POS.forEach(([x, z], i) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const stake = M.stake(); g.add(stake);
  const trap = M.trap(); trap.position.y = 0.0; trap.rotation.y = i * 0.8; g.add(trap);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
  const bub = M.bubble('🐟'); bub.position.y = 1.5; g.add(bub);
  addHit(M.hit('trap', i, 1.9, 1.6, 1.9, [x, 0.8, z]));
  TRAPS.push({ g, stake, trap, ring, bub });
});

// bóng "!" ổ trứng
const eggBub = M.bubble('🥚'); eggBub.position.set(COOP.x, 2.8, COOP.z); scene.add(eggBub);

// phao + dây câu
const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe5483a, emissive: 0x330a06 }));
const bobPos = new THREE.Vector3(6.4, 0.12, -0.2); bobber.position.copy(bobPos); bobber.visible = false; scene.add(bobber);
const lineGeo = new THREE.BufferGeometry().setFromPoints([ROD_TIP, bobPos]);
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff })); line.visible = false; line.frustumCulled = false; scene.add(line);
const bobRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
bobRing.rotation.x = -Math.PI / 2; bobRing.visible = false; scene.add(bobRing);
let bobOn = false, bobBite = false;

// ---------- Gà vịt ----------
const yard = { x0: -4.0, x1: 1.2, z0: 5.2, z1: 7.6 };
const animals = [], tmpl = { chicken0: M.chicken(true), chicken1: M.chicken(false), duck: M.duck() };
const addAnimal = (type) => {
  const g = new THREE.Group(), body = (type === 'duck' ? tmpl.duck : tmpl[`chicken${animals.length % 2}`]).clone();
  g.add(body, M.blob(0.3)); g.userData = { type, body, tx: 0, tz: 0, wait: Math.random() * 2, bob: Math.random() * 6 };
  g.position.set(yard.x0 + Math.random() * (yard.x1 - yard.x0), 0, yard.z0 + 1 + Math.random() * 3);
  g.userData.tx = g.position.x; g.userData.tz = g.position.z; scene.add(g); animals.push(g);
};
const syncAnimals = () => {
  for (const [type, n] of [['chicken', S.chickens], ['duck', S.ducks]]) {
    let have = animals.filter((a) => a.userData.type === type);
    while (have.length < n) { addAnimal(type); have = animals.filter((a) => a.userData.type === type); }
    while (have.length > n) { const a = have.pop(); scene.remove(a); animals.splice(animals.indexOf(a), 1); }
  }
};

// ---------- refresh(): đồng bộ thế giới theo state ----------
const world = {
  refresh() {
    if (houseLv !== S.house) { if (houseMesh) houseG.remove(houseMesh); houseMesh = M.house(S.house); houseG.add(houseMesh); houseLv = S.house; smoke.forEach((s) => (s.visible = S.house >= 2)); }
    if (coopLv !== S.coop) { if (coopMesh) coopG.remove(coopMesh); coopMesh = M.coop(S.coop); coopG.add(coopMesh); coopLv = S.coop; }
    syncAnimals();
    BEDS.forEach((o, i) => {
      const open = i < S.bedsN, b = S.beds[i];
      o.base.visible = open; o.lock.visible = !open; o.bub.visible = !open;
      const key = !open || !b ? '' : `${b.crop}:${stageOf(b)}`;
      if (key !== o.key) {
        if (o.plant) { o.g.remove(o.plant); o.plant = null; }
        if (key) { o.plant = M.plant(CROPS.find((c) => c.id === b.crop), stageOf(b)); o.plant.position.y = 0.17; o.g.add(o.plant); }
        o.key = key;
      }
      if (o.ready !== !!(open && bedReady(b))) {
        o.ready = !!(open && bedReady(b));
        if (o.readyBub) { o.g.remove(o.readyBub); o.readyBub = null; }
        if (o.ready) { o.readyBub = M.bubble(CROPS.find((c) => c.id === b.crop).icon); o.readyBub.position.y = 1.5; o.g.add(o.readyBub); }
      }
    });
    TRAPS.forEach((o, i) => {
      const open = i < S.trapsN, t = S.traps[i], run = open && !!t, ready = run && trapLeft(t) === 0;
      o.stake.visible = !run; o.trap.visible = run; o.ring.visible = run && !ready; o.bub.visible = ready;
      o.stake.scale.setScalar(open ? 1 : 0.6);
    });
    eggBub.visible = S.nest.trungga + S.nest.trungvit >= 1;
  },
  bobber(on, bite = false) { bobOn = on; bobBite = bite; bobber.visible = line.visible = on; bobRing.visible = on; },
};

// ---------- Chạm ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 14) return;
  down = null;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const r = ray.intersectObjects(hits, false)[0];
  if (r) game.interact(r.object.userData.kind, r.object.userData.idx);
});

// ---------- Vòng lặp ----------
const CYC = 8 * 60e3;
S.t0 = S.t0 || Date.now();
const dayness = () => {
  const t = ((Date.now() - S.t0) / CYC + 0.18) % 1, s = Math.sin(t * 2 * Math.PI) + 0.4;
  return THREE.MathUtils.smoothstep(s, -0.15, 0.35);
};
const clock = new THREE.Clock();
let first = true, nextSlow = 0;
const loop = () => {
  const dt = Math.min(0.05, clock.getDelta()), now = clock.elapsedTime;
  if (document.hidden) return requestAnimationFrame(loop);
  const d = dayness();
  sky.copy(SKY[1]).lerp(SKY[0], d); scene.background = sky; scene.fog.color.copy(sky);
  hemi.intensity = 0.38 + 0.62 * d; sun.intensity = 0.2 + 0.95 * d; hemi.color.setHex(d > 0.5 ? 0xffffff : 0x8a9be0);
  lamp.intensity = (1 - d) * 4; lamp.position.set(HOUSE.x + 1.5, 1.8, HOUSE.z + 2.2);
  ffMat.opacity = Math.max(0, 1 - d * 1.6);
  if (ffMat.opacity > 0.01) for (let i = 0; i < FF; i++) { const s = ffSeed[i]; ffPos[i * 3] = s[0] + Math.sin(now * 0.5 + s[3]) * 0.8; ffPos[i * 3 + 1] = s[1] + Math.sin(now * 0.9 + s[3] * 2) * 0.3; ffPos[i * 3 + 2] = s[2] + Math.cos(now * 0.4 + s[3]) * 0.8; ffGeo.attributes.position.needsUpdate = true; }
  clouds.forEach((c, i) => { c.position.x += dt * (0.25 + i * 0.05); if (c.position.x > 24) c.position.x = -24; });
  pond.userData.water.material.emissive.setScalar(0.04 + 0.02 * Math.sin(now * 1.5));

  // gà vịt
  for (const a of animals) {
    const u = a.userData; u.bob += dt * 8;
    const dx = u.tx - a.position.x, dz = u.tz - a.position.z, dist = Math.hypot(dx, dz);
    if (dist > 0.08) {
      const sp = (u.type === 'duck' ? 0.5 : 0.7) * dt; a.position.x += (dx / dist) * sp; a.position.z += (dz / dist) * sp;
      a.rotation.y = Math.atan2(dx, dz); u.body.position.y = Math.abs(Math.sin(u.bob)) * 0.05; u.body.rotation.x = 0;
    } else {
      u.wait -= dt; u.body.rotation.x = Math.sin(u.bob * 1.5) > 0.3 ? 0.5 : 0; // mổ thóc
      if (u.wait <= 0) { u.tx = yard.x0 + Math.random() * (yard.x1 - yard.x0); u.tz = yard.z0 + Math.random() * (yard.z1 - yard.z0); u.wait = 1 + Math.random() * 3; if (Math.random() < 0.15) sfx.cluck(); }
    }
  }
  // phao
  if (bobOn) {
    bobber.position.set(bobPos.x, 0.12 + Math.sin(now * 3) * 0.03 - (bobBite ? 0.1 + Math.abs(Math.sin(now * 18)) * 0.08 : 0), bobPos.z);
    const p = line.geometry.attributes.position; p.setXYZ(1, bobber.position.x, bobber.position.y, bobber.position.z); p.needsUpdate = true;
    bobRing.position.set(bobPos.x, 0.13, bobPos.z); const k = (now * (bobBite ? 3 : 0.8)) % 1; bobRing.scale.setScalar(0.6 + k * 1.6); bobRing.material.opacity = 0.7 * (1 - k);
  }
  // lờ + bong bóng nảy
  TRAPS.forEach((o, i) => { if (o.ring.visible) { const k = (now * 0.5 + i * 0.3) % 1; o.ring.scale.setScalar(0.6 + k); o.ring.material.opacity = 0.55 * (1 - k); } if (o.bub.visible) o.bub.position.y = 1.5 + Math.sin(now * 4 + i) * 0.12; });
  BEDS.forEach((o, i) => { if (o.readyBub) o.readyBub.position.y = 1.5 + Math.sin(now * 4 + i) * 0.12; });
  eggBub.position.y = 2.8 + Math.sin(now * 4) * 0.12; stallLabel.position.y = 3.6 + Math.sin(now * 2) * 0.08;
  smoke.forEach((s, i) => { const k = (now * 0.3 + i / smoke.length) % 1; s.position.set(0.9 + k * 0.5, 3.3 + k * 1.8, -0.4); s.scale.setScalar(0.5 + k * 1.2); s.material.opacity = 0.5 * (1 - k); });

  if (now > nextSlow) { nextSlow = now + 1; world.refresh(); }
  renderer.render(scene, camera);
  if (first) { first = false; const l = document.querySelector('#load'); l.style.opacity = 0; setTimeout(() => l.remove(), 500); }
  requestAnimationFrame(loop);
};

// ---------- Khởi động ----------
const before = S.last;
tick(); world.refresh(); game.init(world);
const msg = offlineSummary(before); if (msg) setTimeout(() => game.toast('Trong lúc bạn vắng: ' + msg, 4500), 900);
game.after(); save();
requestAnimationFrame(loop);
addEventListener('pagehide', () => { tick(); save(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); world.refresh(); } });
window.__game = { S, world, game };

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('sw.js').catch(() => {});
