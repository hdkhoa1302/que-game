import * as THREE from 'three';
import { S, tick, stageOf, bedReady, trapState, save, offlineSummary } from './state.js';
import { CROPS, PHASES, WEATHER, SP, OBJ, TOOLS, WORLD_R, WALK_R, STEP_MS, DAY_STEPS, YEAR_STEPS } from './data.js';
import { DECOR, PADDY } from './data.js';
import { genObjects, objAvail, zoneAt, keepOut, LAKE, inEll } from './objs.js';
import { phaseAt, levelAt, stepF, isFlooded, lifeStage, dayAt } from './sim.js';
import { colorOf, avg } from './genes.js';
import * as M from './models.js';
import * as game from './game.js';
import { sfx } from './sfx.js';

// ---------- Renderer / camera ----------
const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 120);
const TARGET = new THREE.Vector3(2.4, 0, 3), CAMT = TARGET.clone();
let az = Math.PI / 4, zoom = 1, baseDist = 20, suongK = 0;
const fit = () => {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(w, h, false);
  camera.aspect = a; const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  baseDist = Math.max(15 / (2 * t * a), 13 / (2 * t)); camera.updateProjectionMatrix();
};
const placeCam = () => {
  const d = baseDist * zoom;
  camera.position.set(CAMT.x + Math.sin(az) * 1.414 * d * 0.66, CAMT.y + 1.15 * d * 0.66, CAMT.z + Math.cos(az) * 1.414 * d * 0.66);
  camera.lookAt(CAMT);
  scene.fog.near = d * 1.1 + 8 - suongK * 6; scene.fog.far = d * 1.1 + 48 - suongK * 22;
};

const sky = new THREE.Color(), SKY = [new THREE.Color(0x9fd8f0), new THREE.Color(0x101c40)];
const hemi = new THREE.HemisphereLight(0xffffff, 0x8fb070, 1);
const sun = new THREE.DirectionalLight(0xfff2d6, 1.1); sun.position.set(-8, 14, 6);
const lamp = new THREE.PointLight(0xffa850, 0, 9, 1.5);
scene.add(hemi, sun, lamp);
scene.fog = new THREE.Fog(0x9fd8f0, 30, 62);
addEventListener('resize', fit); fit(); placeCam();

// ---------- Tĩnh: nền, cây, hàng rào (gộp 1 mesh) ----------
const rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646; })();
const POND = { x: 6.2, z: -1.2, rx: 4.3, rz: 3.2 }, POND0 = { rx: 4.3, rz: 3.2 };
const inPond = (x, z, k = 1.25) => ((x - POND.x) / (POND.rx * k)) ** 2 + ((z - POND.z) / (POND.rz * k)) ** 2 < 1;
{
  const b = new M.B();
  b.cyl(0x6fb65a, [0, -0.25, 0], 58, 58.4, 0.5, 40);
  for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100; if (!keepOut(x, z)) b.ball(i % 2 ? 0x7cc467 : 0x5fa84d, [x, 0, z], [1 + rnd() * 2, 0.12, 1 + rnd() * 2], 6); }
  for (let i = 0; i < 150; i++) { const x = (rnd() - 0.5) * 66, z = (rnd() - 0.5) * 66; if (!keepOut(x, z) && Math.hypot(x, z) < WORLD_R) M.flower(b, x, z, [0xf26b8a, 0xffd23f, 0xb487f0, 0xffffff][Math.floor(rnd() * 4)]); }
  for (let i = 0; i < 26; i++) { const an = (i / 26) * 6.283 + rnd() * 0.2, r = 38 + rnd() * 14, h = 4 + rnd() * 7; b.ball([0x5f9a5a, 0x6aa86a, 0x4f8a5a, 0x7a9a8a][i % 4], [Math.cos(an) * r, 0, Math.sin(an) * r], [h * 1.6, h * 0.55, h * 1.6], 7); } // đồi ở chân trời, không đi tới được
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
const lake = new THREE.Group();
{
  const mud = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 24), new THREE.MeshLambertMaterial({ color: 0x8a6a45, flatShading: true })), wat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 28), new THREE.MeshLambertMaterial({ color: 0x5aa6c8, emissive: 0x0b2a40, flatShading: true }));
  mud.scale.set(LAKE.rx * 1.12, 1, LAKE.rz * 1.12); mud.position.y = 0.02; wat.scale.set(LAKE.rx, 1, LAKE.rz); wat.position.y = 0.05;
  lake.add(mud, wat); lake.position.set(LAKE.x, 0, LAKE.z); scene.add(lake);
}
const dockM = M.dockB(); dockM.position.set(1.3, 0, -1.2); scene.add(dockM);
const cauM = M.bridgeB(); cauM.position.set(4.55, 0, -1.2); cauM.visible = false; scene.add(cauM);
const oapM = M.nest(); oapM.position.set(-2.2, 0, 6.2); oapM.visible = false; scene.add(oapM);
const luM = [[-2.6, -3.2], [-1.6, -3.2]].map(([x, z]) => { const m = M.lu(); m.position.set(x, 0, z); m.visible = false; scene.add(m); return m; });
const phanM = M.manure(); phanM.position.set(-6.6, 0, 7.2); phanM.visible = false; scene.add(phanM);
const heap = M.manure(); heap.position.set(-6.6, 0, 7.2); heap.scale.setScalar(0.7); heap.visible = false; scene.add(heap); // đống phân thô khi chưa có đống ủ
const BENCH = new THREE.Vector3(-0.2, 0, -3.2);
const benchM = M.bench(); benchM.position.copy(BENCH); benchM.rotation.y = 0.3; benchM.visible = false; scene.add(benchM);
const benchHit = M.hit('bench', 0, 2.0, 1.4, 1.2, [BENCH.x, 0.7, BENCH.z]);
// ---- vật thể khai thác (instanced theo loại) ----
const OBJS = genObjects(), OI = {}, dummy = new THREE.Object3D();
for (const kind of Object.keys(OBJ)) {
  const list = OBJS.filter((o) => o.kind === kind), g = M.objGeo(kind);
  const mk = (geo) => { const m = new THREE.InstancedMesh(geo, M.MAT, Math.max(1, list.length)); m.frustumCulled = false; m.count = list.length; scene.add(m); return m; };
  OI[kind] = { list, full: mk(g.full), spent: g.spent ? mk(g.spent) : null };
  list.forEach((o, i) => { o.i = i; o.st = ''; });
}
const putInst = (mesh, i, o, on) => { dummy.position.set(o.x, 0, o.z); dummy.rotation.set(0, o.rot, 0); dummy.scale.setScalar(on ? o.s : 0.0001); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };
const syncObjs = () => {
  const day = dayAt(S.world.step), ph = phaseAt(S.world.step);
  for (const kind in OI) {
    const g = OI[kind], d = OBJ[kind]; let dirty = false;
    for (const o of g.list) {
      const season = !d.phases || d.phases.includes(ph), ok = season && objAvail(S, o, day, ph), st = !season ? 'off' : ok ? 'full' : g.spent ? 'spent' : 'off';
      if (st === o.st) continue; o.st = st; dirty = true; o.ok = ok;
      putInst(g.full, o.i, o, st === 'full'); if (g.spent) putInst(g.spent, o.i, o, st === 'spent');
    }
    if (dirty) { g.full.instanceMatrix.needsUpdate = true; if (g.spent) g.spent.instanceMatrix.needsUpdate = true; }
  }
};
const pickObj = (cx, cy) => { // chạm gần nhất trong 38px (màn hình) trong các vật thể còn dùng được
  let best = null, bd = 38;
  const v = new THREE.Vector3();
  for (const o of OBJS) { if (o.st !== 'full') continue; v.set(o.x, 0.5, o.z).project(camera); if (v.z > 1) continue; const d = Math.hypot((v.x + 1) / 2 * innerWidth - cx, (1 - v.y) / 2 * innerHeight - cy); if (d < bd) { bd = d; best = o; } }
  return best;
};
// ---- trang trí dựng bằng Blender ----
const decorAnim = [];
for (const d of DECOR) { const m = M.fromBlender(d.a); if (!m) continue; m.position.set(d.x, d.y, d.z); m.rotation.y = d.rot; scene.add(m); if (d.anim) decorAnim.push(m); if (d.a === 'xuong' || d.a === 'ghe_cho') decorAnim.push(m); }
const floaters = [];
const lucBinh = (parent, e, list) => list.forEach(([fx, fz, sc], i) => { const m = M.fromBlender('luc_binh'); if (!m) return; m.position.set(e.rx * fx, 0.11, e.rz * fz); m.scale.setScalar(sc); m.rotation.y = i * 1.7; parent.add(m); floaters.push({ m, ph: i * 1.3 + fx }); });
lucBinh(pond, POND0, [[-0.45, 0.3, 1.1], [0.15, -0.55, 0.9], [0.5, 0.35, 1.2], [-0.05, 0.6, 0.8], [-0.6, -0.2, 0.85]]);
lucBinh(lake, LAKE, [[-0.4, 0.2, 1.3], [0.3, -0.45, 1.1], [0.55, 0.3, 1.4], [-0.1, 0.55, 1.0], [-0.65, -0.35, 1.2], [0.1, 0.05, 1.0]]);
const paddies = [];
{ // ruộng lúa: nước + bờ + khóm lúa (xanh hoặc chín theo mùa)
  const w = PADDY.x1 - PADDY.x0, h = PADDY.z1 - PADDY.z0, cx = (PADDY.x0 + PADDY.x1) / 2, cz = (PADDY.z0 + PADDY.z1) / 2;
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, h), new THREE.MeshLambertMaterial({ color: 0x7fb4c4, transparent: true, opacity: 0.8, flatShading: true })); mirror.position.set(cx, 0.03, cz); scene.add(mirror);
  const bund = new M.B(); for (let i = 0; i <= 3; i++) bund.box(0x8a6a3a, [cx, 0.08, PADDY.z0 + (h * i) / 3], [w + 0.4, 0.16, 0.3]); [PADDY.x0, PADDY.x1].forEach((x) => bund.box(0x8a6a3a, [x, 0.08, cz], [0.3, 0.16, h]));
  scene.add(bund.mesh());
  for (const kind of ['lua_xanh', 'lua_chin']) {
    const g = M.fromBlender(kind); if (!g) continue;
    const pts = []; for (let x = PADDY.x0 + 0.6; x < PADDY.x1 - 0.3; x += 0.75) for (let z = PADDY.z0 + 0.6; z < PADDY.z1 - 0.3; z += 0.75) { const k = Math.floor(((x - PADDY.x0) / 0.75)) % 1 === 0 ? 1 : 0; if (Math.abs(((z - PADDY.z0) % (h / 3))) < 0.9 && z > PADDY.z0 + 0.2) continue; pts.push([x + (rnd() - 0.5) * 0.2, z + (rnd() - 0.5) * 0.2]); }
    const im = new THREE.InstancedMesh(g.geometry, M.MAT, pts.length); im.frustumCulled = false;
    pts.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, rnd() * 6, 0); dummy.scale.setScalar(0.85 + rnd() * 0.3); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    scene.add(im); paddies.push({ kind, im });
  }
}
const tint = new THREE.Mesh(new THREE.CircleGeometry(58, 40), new THREE.MeshBasicMaterial({ color: 0xd8b058, transparent: true, opacity: 0, depthWrite: false }));
tint.rotation.x = -Math.PI / 2; tint.position.y = 0.012; scene.add(tint);
const RAIN_N = 220, rainPos = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) rainPos.set([(rnd() - 0.5) * 22, rnd() * 9, (rnd() - 0.5) * 22], i * 3);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({ color: 0xcfe6f5, size: 0.09, transparent: true, opacity: 0, depthWrite: false });
const rain = new THREE.Points(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);
const rodM = M.rod(); rodM.rotation.y = Math.PI / 2; rodM.position.set(0.22, 0.15, 0.2); rodM.visible = false;
const ROD_TIP = new THREE.Vector3();

// clouds
const clouds = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const c = M.cloud(); c.position.set(-40 + i * 11, 6 + (i % 2) * 1.5, -24 + ((i * 7) % 8) * 6); c.scale.setScalar(0.8 + (i % 3) * 0.2); scene.add(c); return c; });

// fireflies
const FF = 70, ffPos = new Float32Array(FF * 3), ffSeed = [];
for (let i = 0; i < FF; i++) { const a = rnd() * 6.283, r = 3 + rnd() * 22; ffSeed.push([Math.cos(a) * r, 0.6 + rnd() * 1.4, Math.sin(a) * r, rnd() * 6]); }
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
let houseMesh, houseLv = 0, SM = [0.6, 2.7, 0.3];
const SMOKE = [[0.6, 2.7, 0.3], [1.1, 3.5, -0.4], [2.7, 2.4, -0.3]]; // chỗ khói bốc lên theo cấp nhà

const stall = M.stallB(); stall.position.set(4.2, 0, 6.2); stall.rotation.y = -0.3; scene.add(stall);
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
  const flood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 1.5), new THREE.MeshLambertMaterial({ color: 0x4aa8d8, transparent: true, opacity: 0.72, flatShading: true })); flood.position.y = 0.2; flood.visible = false; g.add(flood);
  const plat = M.platform(); plat.visible = false; g.add(plat);
  addHit(M.hit('bed', i, 2.1, 1.6, 1.5, [x, 0.7, z]));
  BEDS.push({ g, base, lock, bub, flood, plat, key: '', plant: null });
});

const TRAPS = [], trapHits = [];
const mkTrap = () => {
  const g = new THREE.Group(); scene.add(g);
  const stake = M.stake(); g.add(stake);
  const trap = M.trap(); trap.position.y = 0.0; trap.rotation.y = TRAPS.length * 0.8; g.add(trap);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
  const bub = M.bubble('🐟'); bub.position.y = 1.5; g.add(bub);
  const hit = M.hit('trap', TRAPS.length, 1.9, 1.6, 1.9, [0, 0.8, 0]); scene.add(hit); trapHits.push(hit);
  return { g, stake, trap, ring, bub, hit };
};
const rmTrap = (o) => { scene.remove(o.g, o.hit); trapHits.splice(trapHits.indexOf(o.hit), 1); };
const zone = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.99, 40), new THREE.MeshBasicMaterial({ color: 0x9be8a0, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
zone.rotation.x = -Math.PI / 2; zone.scale.set(POND.rx, POND.rz, 1); zone.position.set(POND.x, 0.13, POND.z); zone.visible = false; scene.add(zone);

// bóng "!" ổ trứng
const eggBub = M.bubble('🥚'); eggBub.position.set(COOP.x, 2.8, COOP.z); scene.add(eggBub);

// phao + dây câu
const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe5483a, emissive: 0x330a06 }));
const bobPos = new THREE.Vector3(6.4, 0.12, -0.2); bobber.position.copy(bobPos); bobber.visible = false; scene.add(bobber);
const lineGeo = new THREE.BufferGeometry().setFromPoints([ROD_TIP.clone(), bobPos.clone()]);
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff })); line.visible = false; line.frustumCulled = false; scene.add(line);
const bobRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
bobRing.rotation.x = -Math.PI / 2; bobRing.visible = false; scene.add(bobRing);
let bobOn = false, bobBite = false;

// ---------- Gà vịt (mỗi cá thể một nhóm, màu/cỡ theo gen) ----------
const yard = { x0: -4.0, x1: 1.2, z0: 5.2, z1: 7.6 }, riverside = { x0: 0.8, x1: 3.6, z0: 1.4, z1: 3.4 };
const animals = new Map(), animalHits = [];
const mkAnimal = (a) => {
  const g = new THREE.Group(), hex = SP[a.sp].hex[colorOf(a.genome)], male = a.sex === 'm';
  const body = a.sp === 'duck' ? M.duck(hex, male) : M.chicken(hex, male);
  const hit = M.hit('animal', a.id, 0.8, 0.8, 0.8, [0, 0.4, 0]);
  g.add(body, M.blob(0.3), hit); animalHits.push(hit);
  g.userData = { id: a.id, sp: a.sp, body, hit, tx: 0, tz: 0, wait: Math.random() * 2, bob: Math.random() * 6, sick: null };
  g.position.set(yard.x0 + Math.random() * (yard.x1 - yard.x0), 0, yard.z0 + Math.random() * (yard.z1 - yard.z0));
  g.userData.tx = g.position.x; g.userData.tz = g.position.z; scene.add(g); animals.set(a.id, g);
};
const syncAnimals = () => {
  const day = dayAt(S.world.step), alive = new Set(S.animals.map((a) => a.id));
  for (const [id, g] of animals) if (!alive.has(id)) { scene.remove(g); animalHits.splice(animalHits.indexOf(g.userData.hit), 1); animals.delete(id); }
  for (const a of S.animals) {
    if (!animals.has(a.id)) mkAnimal(a);
    const g = animals.get(a.id), u = g.userData, st = lifeStage(a, day);
    g.scale.setScalar(st === 'young' ? 0.55 : (0.82 + avg(a.genome, 'size') * 0.045) * (a.sex === 'm' ? 1.06 : 1));
    if (!!a.sickUntil !== !!u.sick) {
      if (a.sickUntil) { u.sick = M.bubble('🤒'); u.sick.position.y = 1.0; u.sick.scale.setScalar(0.6); g.add(u.sick); } else { g.remove(u.sick); u.sick = null; }
    }
    u.isSick = !!a.sickUntil;
  }
};

// ---------- refresh(): đồng bộ thế giới theo state ----------
const world = {
  refresh() {
    if (houseLv !== S.house) { if (houseMesh) houseG.remove(houseMesh); houseMesh = M.houseB(S.house); houseG.add(houseMesh); houseLv = S.house; SM = SMOKE[S.house - 1]; }
    const coopKey = `${S.coop}:${!!S.builds.chuong}`;
    if (coopLv !== coopKey) { if (coopMesh) coopG.remove(coopMesh); coopMesh = M.coop(S.coop, S.builds.chuong); coopG.add(coopMesh); coopLv = coopKey; }
    cauM.visible = !!S.builds.cau; oapM.visible = !!S.builds.oap; luM.forEach((m, i) => (m.visible = i < (S.builds.lu || 0)));
    phanM.visible = !!S.builds.phan; heap.visible = !S.builds.phan && (S.res.phan || 0) >= 3;
    for (const p of paddies) p.im.visible = (phaseAt(S.world.step) === 0) === (p.kind === 'lua_chin');
    syncAnimals(); syncObjs();
    benchM.visible = !!S.builds.ban; { const k = hits.indexOf(benchHit); if (S.builds.ban && k < 0) { scene.add(benchHit); hits.push(benchHit); } else if (!S.builds.ban && k >= 0) { scene.remove(benchHit); hits.splice(k, 1); } }
    BEDS.forEach((o, i) => {
      const open = i < S.bedsN, b = S.beds[i];
      o.base.visible = open; o.lock.visible = !open; o.bub.visible = !open;
      o.flood.visible = open && isFlooded(S, i); o.plat.visible = !!S.builds.nen?.[i]; o.g.position.y = S.builds.nen?.[i] ? 0.22 : 0;
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
    while (TRAPS.length < S.traps.length) TRAPS.push(mkTrap());
    while (TRAPS.length > S.traps.length) rmTrap(TRAPS.pop());
    TRAPS.forEach((o, i) => {
      const t = S.traps[i], st = trapState(t);
      o.g.position.set(t.x, 0, t.z); o.hit.position.set(t.x, 0.8, t.z); o.hit.userData.idx = i;
      o.ring.visible = st === 'run'; o.bub.visible = st === 'ready';
    });
    eggBub.visible = S.eggs.length >= 1;
  },
  bobber(on, bite = false) {
    if (on && !bobOn) { const dx = POND.x - P.x, dz = POND.z - P.z, L = Math.hypot(dx, dz) || 1, r = Math.min(3.4, L * 0.85); bobPos.set(P.x + (dx / L) * r, 0.12, P.z + (dz / L) * r); player.rotation.y = Math.atan2(dx, dz); }
    rodM.visible = on; bobOn = on; bobBite = bite; bobber.visible = line.visible = on; bobRing.visible = on;
  },
  zone(v) { zone.visible = v; },
  shallow(x, z) { const n = ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2; return n <= 0.98 && n >= 0.3; },
  dist(x, z) { return Math.hypot(P.x - x, P.z - z); },
  near, approach,
  obj: (id) => OBJS[id], objAvail: (id) => OBJS[id].st === 'full', px: () => P.x, pz: () => P.z, face: (x, z) => { player.rotation.y = Math.atan2(x - P.x, z - P.z); },
  onBridge() { return !!S.builds.cau && P.x > 4.6 && onDock(P.x, P.z); },
};

// ---------- Nhân vật ----------
const player = M.playerB(); player.position.set(2.4, 0, 3.4); player.add(rodM); scene.add(player);
const P = player.position;
const onDock = (x, z) => x > 1.5 && x < (S.builds.cau ? 9.2 : 4.7) && z > -1.9 && z < -0.5;
const SOLID = [[HOUSE.x, HOUSE.z, 2.3], [4.2, 6.2, 1.7], [COOP.x, COOP.z, 1.5], [BENCH.x, BENCH.z, 0.9]];
const blocked = (x, z) => (inPond(x, z, 0.97) && !onDock(x, z)) || inEll(LAKE, x, z, 0.97) || Math.hypot(x, z) > WALK_R || SOLID.some(([a, b, r]) => Math.hypot(x - a, z - b) < r);
const REACH = { trap: 4.8, coop: 2.9, bed: 2.4, stall: 3.0, house: 3.4, bench: 2.8, obj: 1.8 };
const MIND = { trap: 0, coop: 2.0, bed: 1.4, stall: 2.0, house: 2.8, bench: 1.7, obj: 0.9 };
const objPos = (kind, idx) => kind === 'trap' ? [S.traps[idx].x, S.traps[idx].z] : kind === 'coop' ? [COOP.x, COOP.z] : kind === 'bed' ? BED_POS[idx] : kind === 'stall' ? [4.2, 6.2] : kind === 'bench' ? [BENCH.x, BENCH.z] : kind === 'obj' ? [OBJS[idx].x, OBJS[idx].z] : [HOUSE.x, HOUSE.z];
let go = null; // {x, z, kind, idx, stuck}
function near(kind, idx = 0) {
  if (kind === 'pond') return inPond(P.x, P.z, 1.35);
  const [x, z] = objPos(kind, idx); return Math.hypot(P.x - x, P.z - z) <= REACH[kind];
}
function approach(kind, idx = 0) {
  if (near(kind, idx)) { go = null; return game.interact(kind, idx); }
  if (kind === 'pond') { go = { x: 3.0, z: -1.2, kind, idx, stuck: 0 }; return; }
  const [ox, oz] = objPos(kind, idx), dx = P.x - ox, dz = P.z - oz, L = Math.hypot(dx, dz) || 1;
  for (let d = MIND[kind]; d < 16; d += 0.4) {
    const x = ox + (dx / L) * d, z = oz + (dz / L) * d;
    if (!blocked(x, z)) { go = { x, z, kind, idx, stuck: 0 }; return; }
  }
}
const joy = { x: 0, y: 0 };
const SPEED = 4.2;
const stepPlayer = (dt, now) => {
  let mx = 0, mz = 0;
  const fx = -Math.sin(az), fz = -Math.cos(az); // hướng nhìn của camera trên mặt đất
  if (joy.x || joy.y) { go = null; mx = fx * -joy.y + -fz * joy.x; mz = fz * -joy.y + fx * joy.x; }
  else if (go) {
    const dx = go.x - P.x, dz = go.z - P.z, L = Math.hypot(dx, dz);
    if (L < 0.15 || go.stuck > 0.5) { const g = go; go = null; if (near(g.kind, g.idx)) game.interact(g.kind, g.idx); }
    else { mx = dx / L; mz = dz / L; }
  }
  const len = Math.hypot(mx, mz), u = player.userData;
  if (len > 0.05 && !game.isBusy()) {
    const v = Math.min(1, len) * SPEED * dt, nx = P.x + (mx / len) * v, nz = P.z + (mz / len) * v;
    const ox = P.x, oz = P.z;
    if (!blocked(nx, nz)) { P.x = nx; P.z = nz; } else if (!blocked(nx, P.z)) P.x = nx; else if (!blocked(P.x, nz)) P.z = nz;
    if (go) go.stuck = Math.hypot(P.x - ox, P.z - oz) < v * 0.3 ? go.stuck + dt : 0;
    const want = Math.atan2(mx, mz); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 12);
    const sw = Math.sin(now * 11) * 0.7; u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.body.position.y = Math.abs(Math.sin(now * 11)) * 0.05;
  } else { u.legL.rotation.x = u.legR.rotation.x = 0; u.body.position.y = Math.sin(now * 2) * 0.012 + (game.isHarvesting() ? Math.abs(Math.sin(now * 12)) * 0.07 : 0); u.body.rotation.x = game.isHarvesting() ? Math.sin(now * 12) * 0.22 : 0; }
  CAMT.lerp(P, Math.min(1, dt * 4));
};

// nút hành động: vật gần nhất trong tầm với
let nextAct = 0;
const pickAction = () => {
  const c = [];
  const add = (kind, idx, x, z, icon, label) => { if (near(kind, idx)) c.push({ kind, idx, icon, label, d: Math.hypot(P.x - x, P.z - z) }); };
  S.traps.forEach((t, i) => add('trap', i, t.x, t.z, '🪤', { idle: 'Thả lờ', run: 'Xem lờ', ready: 'Thu cá' }[trapState(t)]));
  BED_POS.forEach(([x, z], i) => { if (i >= S.bedsN) return; const b = S.beds[i]; add('bed', i, x, z, b ? (bedReady(b) ? '🧺' : '💧') : '🌱', b ? (bedReady(b) ? 'Thu hoạch' : 'Tưới') : 'Gieo hạt'); });
  add('coop', 0, COOP.x, COOP.z, '🐔', 'Chuồng'); add('stall', 0, 4.2, 6.2, '🧺', 'Chợ'); add('house', 0, HOUSE.x, HOUSE.z, '🏠', 'Nhà');
  if (S.builds.ban) add('bench', 0, BENCH.x, BENCH.z, '🔨', 'Bàn thợ');
  for (const o of OBJS) { if (o.st !== 'full' || Math.hypot(P.x - o.x, P.z - o.z) > 2.2 || !near('obj', o.id)) continue; const d = OBJ[o.kind], lack = d.tool && !S.tools[d.tool]; c.push({ kind: 'obj', idx: o.id, icon: lack ? '🔒' : d.icon, label: lack ? `Cần ${TOOLS[d.tool].name}` : d.verb, d: Math.hypot(P.x - o.x, P.z - o.z) - 0.8 }); }
  if (near('pond')) c.push({ kind: 'pond', idx: 0, icon: '🎣', label: 'Câu cá', d: Math.hypot(P.x - POND.x, P.z - POND.z) - 3.5 });
  c.sort((a, b) => a.d - b.d);
  game.setAction(!game.isBusy() && !go?.kind ? c[0] || null : null);
};

// joystick
{
  const el = document.querySelector('#joy'), knob = el.firstElementChild; let id = null;
  const set = (e) => {
    const r = el.getBoundingClientRect(), R = 38;
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); const l = Math.hypot(x, y);
    if (l > R) { x = (x / l) * R; y = (y / l) * R; }
    knob.style.transform = `translate(${x}px,${y}px)`; joy.x = x / R; joy.y = y / R;
  };
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerdown', (e) => { id = e.pointerId; el.setPointerCapture(id); set(e); e.stopPropagation(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

// ---------- Chạm / xoay / zoom ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ptrs = new Map(), gp = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05), gv = new THREE.Vector3();
let moved = 0, pinch0 = 0, zoom0 = 1;
const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
const aim = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); };
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
  if (ptrs.size === 2) { pinch0 = pdist(); zoom0 = zoom; moved = 99; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 12) az -= dx * 0.008; }
  else if (ptrs.size === 2) zoom = THREE.MathUtils.clamp((zoom0 * pinch0) / pdist(), 0.55, 1.35);
});
const endPtr = (e) => ptrs.delete(e.pointerId);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { zoom = THREE.MathUtils.clamp(zoom * (1 + e.deltaY * 0.001), 0.55, 1.35); }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  const tap = ptrs.size === 1 && moved <= 12; endPtr(e);
  if (!tap) return;
  aim(e);
  if (game.isPlacing()) { if (ray.ray.intersectPlane(gp, gv)) game.placeAt(gv.x, gv.z); return; }
  if (game.isBusy()) return;
  const r = ray.intersectObjects([...animalHits, ...hits, ...trapHits], false)[0];
  if (r && r.object.userData.kind === 'animal') return game.interact('animal', r.object.userData.idx);
  if (r) return approach(r.object.userData.kind, r.object.userData.idx);
  const po = pickObj(e.clientX, e.clientY); if (po) return approach('obj', po.id);
  if (ray.ray.intersectPlane(gp, gv) && !blocked(gv.x, gv.z)) go = { x: gv.x, z: gv.z, kind: null, stuck: 0 };
});

// ---------- Lấp lánh mặt nước + bướm ----------
const SPK = Array.from({ length: 12 }, (_, i) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; const a = rnd() * 6.283, r = Math.sqrt(0.35 + rnd() * 0.6);
  m.position.set(POND.x + Math.cos(a) * POND.rx * r, 0.11, POND.z + Math.sin(a) * POND.rz * r); m.userData.ph = rnd() * 6.283; scene.add(m); return m;
});
const BUT = Array.from({ length: 5 }, (_, i) => {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: [0xffd23f, 0xf26b8a, 0xffffff, 0xb487f0, 0xff9f43][i], side: THREE.DoubleSide });
  const w = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.16, 0.0, 0.12), new THREE.Vector3(0.16, 0.0, -0.12)]);
  const wl = new THREE.Mesh(w, mat), wr = new THREE.Mesh(w, mat); wr.scale.x = -1; g.add(wl, wr); g.userData = { wl, wr, cx: -4 + rnd() * 9, cz: 1 + rnd() * 7, ph: rnd() * 6.283, r: 1 + rnd() };
  scene.add(g); return g;
});

// ---------- Vòng lặp ----------
const CYC = DAY_STEPS * STEP_MS; // ngày game = 8 phút; f=0 là bình minh, f=0.6 hoàng hôn, còn lại là đêm
const dayFrac = () => (((Date.now() - S.t0) / CYC) % 1 + 1) % 1;
const dayness = (f) => (f < 0.6 ? THREE.MathUtils.smoothstep(Math.sin((Math.PI * f) / 0.6), 0.02, 0.4) : 0);
const TINT = [[0xd8b058, 0.24], [0x7fcf5a, 0.08], [0x2f8f50, 0.12], [0x5fa6a0, 0.1]].map(([c, o]) => ({ c: new THREE.Color(c), o }));
const tmpC = new THREE.Color(), GRAY = new THREE.Color(0x9aa7b0), FOG = new THREE.Color(0xe4ecf0);
let rainK = 0, windK = 0;
const BLUE = new THREE.Color(0x4aa8d8), SILT = new THREE.Color(0x9a9a60);
const clock = new THREE.Clock();
let first = true, nextSlow = 0, nextClock = 0;
let fpsN = 0;
const loop = () => {
  fpsN++;
  const dt = Math.min(0.05, clock.getDelta()), now = clock.elapsedTime;
  if (document.hidden) return requestAnimationFrame(loop);
  const f = dayFrac(), d = dayness(f), wx = S.world.weather, nf = stepF(S), ph = phaseAt(nf), lvl = levelAt(nf);
  const wantRain = wx === 'mua' && f > 0.36 && f < 0.7 ? 1 : 0, wantFog = wx === 'suong' && f < 0.3 ? 1 : 0, wantWind = wx === 'chuong' ? 1 : 0;
  rainK += (wantRain - rainK) * Math.min(1, dt * 0.8); suongK += (wantFog - suongK) * Math.min(1, dt * 0.6); windK += (wantWind - windK) * Math.min(1, dt * 0.6);
  sky.copy(SKY[1]).lerp(SKY[0], d).lerp(GRAY, rainK * 0.55 * Math.max(d, 0.3)).lerp(FOG, suongK * 0.7 * d); scene.background = sky; scene.fog.color.copy(sky);
  if (now > nextClock) {
    nextClock = now + 2; const W = WEATHER.find((x) => x.id === wx) || WEATHER[0], t = d > 0.75 ? '☀️ ban ngày' : f < 0.6 ? '🌅 sáng/chiều' : '🌙 ban đêm';
    document.querySelector('#clock').innerHTML = `<b>${PHASES[ph].icon} ${PHASES[ph].name}</b><small>Năm ${Math.floor(nf / YEAR_STEPS) + 1} · ${W.icon} ${W.name} · ${t}</small>`;
  }
  // ao co giãn theo mực nước, màu đất theo mùa
  const pk = 0.75 + 0.35 * lvl; POND.rx = POND0.rx * pk; POND.rz = POND0.rz * pk; pond.scale.set(pk, 1, pk); zone.scale.set(POND.rx, POND.rz, 1);
  { const fr = (nf / 24) % 1, a = TINT[ph], b = TINT[(ph + 1) % 4], k = THREE.MathUtils.smoothstep(fr, 0.8, 1); tint.material.color.copy(a.c).lerp(b.c, k); tint.material.opacity = a.o + (b.o - a.o) * k; }
  pond.userData.water.material.color.copy(BLUE).lerp(SILT, ph === 3 ? 0.35 : ph === 2 ? 0.15 : 0); // nước phù sa mùa lũ
  rainMat.opacity = rainK * 0.75; rain.visible = rainK > 0.02;
  if (rain.visible) { rain.position.set(CAMT.x, 0, CAMT.z); for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3 + 1] -= dt * 14; if (rainPos[i * 3 + 1] < 0) rainPos[i * 3 + 1] = 8 + rnd() * 2; } rainGeo.attributes.position.needsUpdate = true; }
  const dark = 1 - rainK * 0.35;
  hemi.intensity = (0.38 + 0.62 * d) * dark; sun.intensity = (0.2 + 0.95 * d) * (1 - rainK * 0.6); sun.color.setHex(ph === 0 ? 0xffe2a8 : 0xfff2d6); hemi.color.setHex(d > 0.5 ? 0xffffff : 0x8a9be0);
  lamp.intensity = (1 - d) * 4; lamp.position.set(HOUSE.x + 1.5, 1.8, HOUSE.z + 2.2);
  ffMat.opacity = Math.max(0, 1 - d * 1.6);
  if (ffMat.opacity > 0.01) for (let i = 0; i < FF; i++) { const s = ffSeed[i]; ffPos[i * 3] = s[0] + Math.sin(now * 0.5 + s[3]) * 0.8; ffPos[i * 3 + 1] = s[1] + Math.sin(now * 0.9 + s[3] * 2) * 0.3; ffPos[i * 3 + 2] = s[2] + Math.cos(now * 0.4 + s[3]) * 0.8; ffGeo.attributes.position.needsUpdate = true; }
  clouds.forEach((c, i) => { c.position.x += dt * (0.25 + i * 0.05) * (1 + windK * 5); if (c.position.x > 48) c.position.x = -48; });
  pond.userData.water.material.emissive.setScalar(0.04 + 0.02 * Math.sin(now * 1.5));

  SPK.forEach((m) => { const k = Math.max(0, Math.sin(now * 1.6 + m.userData.ph)); m.material.opacity = k ** 6 * 0.9 * d; m.scale.setScalar(0.5 + k); m.rotation.z = now; });
  BUT.forEach((g, i) => { const u = g.userData; g.visible = d > 0.55; if (!g.visible) return; const t = now * 0.5 + u.ph;
    g.position.set(u.cx + Math.cos(t) * u.r * 1.6, 0.9 + Math.sin(t * 2.3) * 0.25, u.cz + Math.sin(t * 1.3) * u.r * 1.6); g.rotation.y = -t * 1.3 + 1.2;
    const f = Math.sin(now * 22 + i) * 0.9; u.wl.rotation.z = f; u.wr.rotation.z = -f; });
  decorAnim.forEach((m, i) => { m.position.y += (m.userData.base ??= m.position.y) - m.position.y + Math.sin(now * 1.3 + i) * (m.userData.base > 0 ? 0.015 : 0.01); if (m.userData.base === 0) m.rotation.x = Math.sin(now * 0.9 + i) * 0.02; });
  floaters.forEach((f) => { f.m.position.y = 0.11 + Math.sin(now * 1.2 + f.ph) * 0.02; f.m.rotation.y += dt * 0.05; });
  // gà vịt: vịt chạy đồng ra bờ ao mùa nước nổi ban ngày; con ốm đi chậm
  for (const a of animals.values()) {
    const u = a.userData; u.bob += dt * 8;
    const dx = u.tx - a.position.x, dz = u.tz - a.position.z, dist = Math.hypot(dx, dz), run = u.sp === 'duck' && ph === 3 && d > 0.4, zn = run ? riverside : yard;
    if (dist > 0.08) {
      const sp = (u.sp === 'duck' ? 0.5 : 0.7) * dt * (u.isSick ? 0.3 : 1); a.position.x += (dx / dist) * sp; a.position.z += (dz / dist) * sp;
      a.rotation.y = Math.atan2(dx, dz); u.body.position.y = Math.abs(Math.sin(u.bob)) * 0.05; u.body.rotation.x = 0;
    } else {
      u.wait -= dt; u.body.rotation.x = u.isSick ? 0.7 : Math.sin(u.bob * 1.5) > 0.3 ? 0.5 : 0; // mổ thóc / cúi đầu khi ốm
      if (u.wait <= 0) { u.tx = zn.x0 + Math.random() * (zn.x1 - zn.x0); u.tz = zn.z0 + Math.random() * (zn.z1 - zn.z0); u.wait = 1 + Math.random() * 3; if (Math.random() < 0.15) sfx.cluck(); }
    }
    if (u.sick) u.sick.position.y = 1.0 + Math.sin(now * 5) * 0.05;
  }
  // phao
  if (bobOn) {
    bobber.position.set(bobPos.x, 0.12 + Math.sin(now * 3) * 0.03 - (bobBite ? 0.1 + Math.abs(Math.sin(now * 18)) * 0.08 : 0), bobPos.z);
    ROD_TIP.set(-0.43, 1.69, 0); rodM.updateWorldMatrix(true, false); rodM.localToWorld(ROD_TIP);
    const p = line.geometry.attributes.position; p.setXYZ(0, ROD_TIP.x, ROD_TIP.y, ROD_TIP.z); p.setXYZ(1, bobber.position.x, bobber.position.y, bobber.position.z); p.needsUpdate = true;
    bobRing.position.set(bobPos.x, 0.13, bobPos.z); const k = (now * (bobBite ? 3 : 0.8)) % 1; bobRing.scale.setScalar(0.6 + k * 1.6); bobRing.material.opacity = 0.7 * (1 - k);
  }
  // lờ + bong bóng nảy
  TRAPS.forEach((o, i) => { if (o.ring.visible) { const k = (now * 0.5 + i * 0.3) % 1; o.ring.scale.setScalar(0.6 + k); o.ring.material.opacity = 0.55 * (1 - k); } if (o.bub.visible) o.bub.position.y = 1.5 + Math.sin(now * 4 + i) * 0.12; });
  BEDS.forEach((o, i) => { if (o.readyBub) o.readyBub.position.y = 1.5 + Math.sin(now * 4 + i) * 0.12; });
  eggBub.position.y = 2.8 + Math.sin(now * 4) * 0.12; stallLabel.position.y = 3.6 + Math.sin(now * 2) * 0.08;
  smoke.forEach((s, i) => { const k = (now * 0.3 + i / smoke.length) % 1; s.position.set(SM[0] + k * 0.5, SM[1] + k * 1.6, SM[2]); s.scale.setScalar(0.5 + k * 1.2); s.material.opacity = 0.5 * (1 - k); });

  stepPlayer(dt, now); placeCam();
  if (now > nextAct) { nextAct = now + 0.2; pickAction(); }
  if (now > nextSlow) { nextSlow = now + 1; game.pulse(); world.refresh(); document.querySelector('#zone').textContent = '📍 ' + zoneAt(P.x, P.z); }
  renderer.render(scene, camera);
  if (first) { first = false; const l = document.querySelector('#load'); l.style.opacity = 0; setTimeout(() => l.remove(), 500); }
  requestAnimationFrame(loop);
};

// ---------- Khởi động ----------
const before = S.last;
tick(); world.refresh(); game.init(world);
const msg = offlineSummary(before); if (msg) setTimeout(() => game.toast('Trong lúc bạn vắng: ' + msg, 4500), 900);
game.after(); save();
if (!S.stats.picked && !S.stats.fish && !S.builds.ban) setTimeout(() => game.toast('Chào bạn về miệt vườn! 🛶 Chạm cành khô, đá cuội để nhặt, rồi dựng bàn thợ ở 🏠 Nhà.', 5200), 1500);
requestAnimationFrame(loop);
addEventListener('pagehide', () => { tick(); save(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); world.refresh(); } });
window.__game = { S, world, game, P, objs: () => OBJS, proj: (x, z) => { const v = new THREE.Vector3(x, 0, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, az: () => az, go: () => go, fps: () => fpsN };

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('sw.js').catch(() => {});
