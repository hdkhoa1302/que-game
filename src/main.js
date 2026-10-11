import * as THREE from 'three';
import { S, tick, stageOf, bedReady, trapState, save, offlineSummary } from './state.js';
import { CROPS, PHASES, WEATHER, SP, OBJ, TOOLS, WALK_R, STEP_MS, DAY_STEPS, YEAR_STEPS, riverK } from './data.js';
import { genObjects, objAvail, zoneAt, LAKE, inEll, RS, riverAt, riverPoint, shallowAt } from './objs.js';
import { phaseAt, levelAt, stepF, isFlooded, lifeStage, dayAt } from './sim.js';
import { colorOf, avg } from './genes.js';
import * as M from './models.js';
import * as game from './game.js';
import { sfx } from './sfx.js';
import { setupInput } from './input.js';
import { initFx } from './fx.js';
import { initTerrain } from './terrain.js';

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
const hemi = new THREE.HemisphereLight(0xffffff, 0x8fb070, 1), sun = new THREE.DirectionalLight(0xfff2d6, 1.1), lamp = new THREE.PointLight(0xffa850, 0, 9, 1.5);
sun.position.set(-8, 14, 6); scene.add(hemi, sun, lamp); scene.fog = new THREE.Fog(0x9fd8f0, 30, 62);
addEventListener('resize', fit); fit(); placeCam();

const rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646; })();
const RN = RS.length; let kR = riverK(0.45);
const { shapeRiver, waterMat, riverTex, zone, dockM, cauM, oapM, luM, phanM, heap, BENCH, benchM, plotMeshes } = initTerrain({ scene, rnd, RN, riverPoint });
shapeRiver(kR);

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
const pickObj = (cx, cy) => {
  let best = null, bd = 38; const v = new THREE.Vector3();
  for (const o of OBJS) { if (o.st !== 'full') continue; v.set(o.x, 0.5, o.z).project(camera); if (v.z > 1) continue; const d = Math.hypot((v.x + 1) / 2 * innerWidth - cx, (1 - v.y) / 2 * innerHeight - cy); if (d < bd) { bd = d; best = o; } }
  return best;
};

const tint = new THREE.Mesh(new THREE.CircleGeometry(58, 40), new THREE.MeshBasicMaterial({ color: 0xd8b058, transparent: true, opacity: 0, depthWrite: false }));
tint.rotation.x = -Math.PI / 2; tint.position.y = 0.012; scene.add(tint);

const { updateFx } = initFx(scene, rnd);
const rodM = M.rod(); rodM.rotation.y = Math.PI / 2; rodM.position.set(0.22, 0.15, 0.2); rodM.visible = false;
const ROD_TIP = new THREE.Vector3();

const hits = [], addHit = (h) => { scene.add(h); hits.push(h); return h; };
const benchHit = M.hit('bench', 0, 2.0, 1.4, 1.2, [BENCH.x, 0.7, BENCH.z]);

const HOUSE = new THREE.Vector3(-5.2, 0, -5.2), houseG = new THREE.Group();
houseG.position.copy(HOUSE); houseG.rotation.y = 0.6; scene.add(houseG);
addHit(M.hit('house', 0, 3.6, 3.4, 3, [HOUSE.x, 1.6, HOUSE.z]));
const smoke = [0, 1, 2, 3].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); houseG.add(s); return s; });
let houseMesh, houseLv = 0, SM = [0.6, 2.7, 0.3];
const SMOKE = [[0.6, 2.7, 0.3], [1.1, 3.5, -0.4], [2.7, 2.4, -0.3]];

const stall = M.stallB(); stall.position.set(4.2, 0, 6.2); stall.rotation.y = -0.3; scene.add(stall);
addHit(M.hit('stall', 0, 3.4, 3, 2.2, [4.2, 1.4, 6.2]));
const stallLabel = M.bubble('🧺'); stallLabel.position.set(4.2, 3.6, 6.2); scene.add(stallLabel);

const COOP = new THREE.Vector3(-0.6, 0, 8.4), coopG = new THREE.Group();
coopG.position.copy(COOP); coopG.rotation.y = 0.15; scene.add(coopG);
addHit(M.hit('coop', 0, 2.8, 2, 2.2, [COOP.x, 1, COOP.z]));
let coopMesh, coopLv = 0;

const MEKONG_ITEMS = [
  ['altar', -3.8, 0, -3.8, 0, M.altarB, [1.4, 1.8, 1.4, 0.9]],
  ['hammock', -7.2, 0, -2.5, 0.4, M.hammockB, [2.4, 1.4, 1.4, 0.7]],
  ['arbor', -7.5, 0, 2.2, 0, M.arborB, [2.8, 2.2, 2.8, 1.1]],
  ['boat', 3.6, 0.05, -1.0, -0.2, M.boatB, [2.8, 1.2, 1.5, 0.4]],
  ['trader', 9.5, 0.08, 4.0, 0.35, M.traderB, [3.4, 2.2, 2.0, 1.1]],
  ['hut', 15.5, 0, 2.5, -0.15, M.hutB, [3.2, 2.6, 2.8, 1.3]],
  ['buffalo', 18.5, 0, 1.5, -0.8, M.buffaloB, [2.4, 1.8, 1.8, 0.9]]
];
const ALTAR = { x: -3.8, z: -3.8 }, HAMMOCK = { x: -7.2, z: -2.5 }, ARBOR = { x: -7.5, z: 2.2 }, BOAT = { x: 3.6, z: -1.0 }, TRADER = { x: 9.5, z: 4.0 }, HUT = { x: 15.5, z: 2.5 }, BUFFALO = { x: 18.5, z: 1.5 };
for (const [k, x, y, z, ry, fn, [sx, sy, sz, offY]] of MEKONG_ITEMS) {
  const m = fn(); if (m) { m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); }
  addHit(M.hit(k, 0, sx, sy, sz, [x, y + offY, z]));
}

const HYACINTHS = [[8.6, -6.5], [9.8, -1.5], [9.2, 6.0], [10.5, 11.5]].map(([x, z], i) => {
  const m = M.hyacinthB(); if (!m) return null;
  m.position.set(x, 0.06, z); m.rotation.y = i * 1.5; scene.add(m); return m;
}).filter(Boolean);

const BEDS = [], BED_POS = [[-6, 1.2], [-3.6, 1.2], [-1.2, 1.2], [-6, 3.3], [-3.6, 3.3], [-1.2, 3.3]];
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

const eggBub = M.bubble('🥚'); eggBub.position.set(COOP.x, 2.8, COOP.z); scene.add(eggBub);
const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe5483a, emissive: 0x330a06 }));
const bobPos = new THREE.Vector3(6.4, 0.12, -0.2); bobber.position.copy(bobPos); bobber.visible = false; scene.add(bobber);
const lineGeo = new THREE.BufferGeometry().setFromPoints([ROD_TIP.clone(), bobPos.clone()]);
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff })); line.visible = false; line.frustumCulled = false; scene.add(line);
const bobRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
bobRing.rotation.x = -Math.PI / 2; bobRing.visible = false; scene.add(bobRing);
let bobOn = false, bobBite = false;

const yard = { x0: -4.0, x1: 1.2, z0: 5.2, z1: 7.6 }, riverside = { x0: 3.2, x1: 5.0, z0: 1.8, z1: 4.4 };
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

const world = {
  refresh() {
    if (houseLv !== S.house) { if (houseMesh) houseG.remove(houseMesh); houseMesh = M.houseB(S.house); houseG.add(houseMesh); houseLv = S.house; SM = SMOKE[S.house - 1]; }
    const coopKey = `${S.coop}:${!!S.builds.chuong}`;
    if (coopLv !== coopKey) { if (coopMesh) coopG.remove(coopMesh); coopMesh = M.coop(S.coop, S.builds.chuong); coopG.add(coopMesh); coopLv = coopKey; }
    cauM.visible = !!S.builds.cau; oapM.visible = !!S.builds.oap; luM.forEach((m, i) => (m.visible = i < (S.builds.lu || 0)));
    phanM.visible = !!S.builds.phan; heap.visible = !S.builds.phan && (S.res.phan || 0) >= 3;
    { const ph = phaseAt(S.world.step), first = OBJS.findIndex((o) => o.kind === 'thua'); for (const p of plotMeshes) { const ripe = OBJS[first + p.j].st === 'full'; p.chin.visible = ripe; p.xanh.visible = ph !== 0; } }
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
    if (on && !bobOn) {
      const r = riverAt(P.x, P.z, kR); let vx = r.cx - P.x, vz = r.cz - P.z, m = Math.hypot(vx, vz);
      if (m < 0.6) { const q = riverPoint(r.s, kR); vx = q.nx; vz = q.nz; m = 1; }
      vx /= m; vz /= m; const reach = Math.max(1.4, Math.min(3.8, m - r.half * 0.4)); bobPos.set(P.x + vx * reach, 0.12, P.z + vz * reach); player.rotation.y = Math.atan2(vx, vz);
    }
    rodM.visible = on; bobOn = on; bobBite = bite; bobber.visible = line.visible = on; bobRing.visible = on;
  },
  zone(v) { zone.visible = v; },
  shallow: (x, z) => shallowAt(x, z, kR),
  dist(x, z) { return Math.hypot(P.x - x, P.z - z); },
  near, approach,
  obj: (id) => OBJS[id], objAvail: (id) => OBJS[id].st === 'full', px: () => P.x, pz: () => P.z, face: (x, z) => { player.rotation.y = Math.atan2(x - P.x, z - P.z); },
  onBridge() { return !!S.builds.cau && P.x > 5.9 && onDock(P.x, P.z); },
};

const player = M.playerB(); player.position.set(2.4, 0, 3.4); player.add(rodM); scene.add(player);
const P = player.position;
const onDock = (x, z) => x > 2.2 && x < (S.builds.cau ? 13.0 : 5.9) && z > -1.9 && z < -0.5;
const SOLID = [
  [HOUSE.x, HOUSE.z, 2.3], [4.2, 6.2, 1.7], [COOP.x, COOP.z, 1.5], [BENCH.x, BENCH.z, 0.9],
  [ALTAR.x, ALTAR.z, 0.7], [ARBOR.x, ARBOR.z, 1.4], [HUT.x, HUT.z, 1.6], [BUFFALO.x, BUFFALO.z, 1.2]
];
const inWater = (x, z, sc = 0.97) => { const r = riverAt(x, z, kR); return r.d < r.half * sc; };
const blocked = (x, z) => (inWater(x, z) && !onDock(x, z)) || inEll(LAKE, x, z, 0.97) || Math.hypot(x, z) > WALK_R || SOLID.some(([a, b, r]) => Math.hypot(x - a, z - b) < r);
const REACH = { trap: 4.8, coop: 2.9, bed: 2.4, stall: 3.0, house: 3.4, bench: 2.8, obj: 1.8, altar: 2.4, hammock: 2.6, arbor: 2.8, boat: 3.2, trader: 3.8, hut: 3.0, buffalo: 2.8 };
const MIND = { trap: 0, coop: 2.0, bed: 1.4, stall: 2.0, house: 2.8, bench: 1.7, obj: 0.9, altar: 1.2, hammock: 1.4, arbor: 1.5, boat: 1.6, trader: 2.0, hut: 1.8, buffalo: 1.6 };
const objPos = (kind, idx) => kind === 'trap' ? [S.traps[idx].x, S.traps[idx].z] : kind === 'coop' ? [COOP.x, COOP.z] : kind === 'bed' ? BED_POS[idx] : kind === 'stall' ? [4.2, 6.2] : kind === 'bench' ? [BENCH.x, BENCH.z] : kind === 'altar' ? [ALTAR.x, ALTAR.z] : kind === 'hammock' ? [HAMMOCK.x, HAMMOCK.z] : kind === 'arbor' ? [ARBOR.x, ARBOR.z] : kind === 'boat' ? [BOAT.x, BOAT.z] : kind === 'trader' ? [TRADER.x, TRADER.z] : kind === 'hut' ? [HUT.x, HUT.z] : kind === 'buffalo' ? [BUFFALO.x, BUFFALO.z] : kind === 'obj' ? [OBJS[idx].x, OBJS[idx].z] : [HOUSE.x, HOUSE.z];
let go = null;
function near(kind, idx = 0) {
  if (kind === 'river') { const r = riverAt(P.x, P.z, kR); return r.d - r.half < 2.4 || onDock(P.x, P.z); }
  if (kind === 'obj' && OBJS[idx].plot) { const q = OBJS[idx].plot; return P.x > q.x0 - 1.4 && P.x < q.x1 + 1.4 && P.z > q.z0 - 1.4 && P.z < q.z1 + 1.4; }
  const [x, z] = objPos(kind, idx); return Math.hypot(P.x - x, P.z - z) <= REACH[kind];
}
function approach(kind, idx = 0) {
  if (near(kind, idx)) { go = null; return game.interact(kind, idx); }
  if (kind === 'river') { const r = riverAt(P.x, P.z, kR), m = Math.hypot(P.x - r.cx, P.z - r.cz) || 1, e = r.half + 1.0; go = { x: r.cx + ((P.x - r.cx) / m) * e, z: r.cz + ((P.z - r.cz) / m) * e, kind, idx, stuck: 0 }; return; }
  const [ox, oz] = objPos(kind, idx), dx = P.x - ox, dz = P.z - oz, L = Math.hypot(dx, dz) || 1;
  for (let d = MIND[kind]; d < 16; d += 0.4) {
    const x = ox + (dx / L) * d, z = oz + (dz / L) * d;
    if (!blocked(x, z)) { go = { x, z, kind, idx, stuck: 0 }; return; }
  }
}
const joy = { x: 0, y: 0 };
const SPEED = 4.2;
const stepPlayer = (dt, now) => {
  let mx = 0, mz = 0; const fx = -Math.sin(az), fz = -Math.cos(az);
  if (joy.x || joy.y) { go = null; mx = fx * -joy.y + -fz * joy.x; mz = fz * -joy.y + fx * joy.x; }
  else if (go) {
    const dx = go.x - P.x, dz = go.z - P.z, L = Math.hypot(dx, dz);
    if (L < 0.15 || go.stuck > 0.5) { const g = go; go = null; if (near(g.kind, g.idx)) game.interact(g.kind, g.idx); }
    else { mx = dx / L; mz = dz / L; }
  }
  const len = Math.hypot(mx, mz), u = player.userData;
  if (len > 0.05 && !game.isBusy()) {
    const v = Math.min(1, len) * SPEED * dt, nx = P.x + (mx / len) * v, nz = P.z + (mz / len) * v, ox = P.x, oz = P.z;
    if (!blocked(nx, nz)) { P.x = nx; P.z = nz; } else if (!blocked(nx, P.z)) P.x = nx; else if (!blocked(P.x, nz)) P.z = nz;
    if (go) go.stuck = Math.hypot(P.x - ox, P.z - oz) < v * 0.3 ? go.stuck + dt : 0;
    const want = Math.atan2(mx, mz); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 12);
    const sw = Math.sin(now * 11) * 0.7; u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.body.position.y = Math.abs(Math.sin(now * 11)) * 0.05;
  } else { u.legL.rotation.x = u.legR.rotation.x = 0; u.body.position.y = Math.sin(now * 2) * 0.012 + (game.isHarvesting() ? Math.abs(Math.sin(now * 12)) * 0.07 : 0); u.body.rotation.x = game.isHarvesting() ? Math.sin(now * 12) * 0.22 : 0; }
  CAMT.lerp(P, Math.min(1, dt * 4));
};

let nextAct = 0;
const pickAction = () => {
  const c = [];
  const add = (kind, idx, x, z, icon, label) => { if (near(kind, idx)) c.push({ kind, idx, icon, label, d: Math.hypot(P.x - x, P.z - z) }); };
  S.traps.forEach((t, i) => add('trap', i, t.x, t.z, '🪤', { idle: 'Thả lờ', run: 'Xem lờ', ready: 'Thu cá' }[trapState(t)]));
  BED_POS.forEach(([x, z], i) => { if (i >= S.bedsN) return; const b = S.beds[i]; add('bed', i, x, z, b ? (bedReady(b) ? '🧺' : '💧') : '🌱', b ? (bedReady(b) ? 'Thu hoạch' : 'Tưới') : 'Gieo hạt'); });
  add('coop', 0, COOP.x, COOP.z, '🐔', 'Chuồng'); add('stall', 0, 4.2, 6.2, '🧺', 'Chợ'); add('house', 0, HOUSE.x, HOUSE.z, '🏠', 'Nhà');
  if (S.builds.ban) add('bench', 0, BENCH.x, BENCH.z, '🔨', 'Bàn thợ');
  add('altar', 0, ALTAR.x, ALTAR.z, '🕯️', 'Bàn Thiên');
  add('hammock', 0, HAMMOCK.x, HAMMOCK.z, '🌴', 'Nằm võng');
  add('arbor', 0, ARBOR.x, ARBOR.z, '🥒', 'Giàn bầu');
  add('boat', 0, BOAT.x, BOAT.z, '🛶', 'Chèo xuồng');
  add('trader', 0, TRADER.x, TRADER.z, '🍉', 'Ghe chợ');
  add('hut', 0, HUT.x, HUT.z, '🛖', 'Chòi ruộng');
  add('buffalo', 0, BUFFALO.x, BUFFALO.z, '🐃', 'Con trâu');
  for (const o of OBJS) { if (o.st !== 'full' || (!o.plot && Math.hypot(P.x - o.x, P.z - o.z) > 2.2) || !near('obj', o.id)) continue; const d = OBJ[o.kind], lack = d.tool && !S.tools[d.tool]; c.push({ kind: 'obj', idx: o.id, icon: lack ? '🔒' : d.icon, label: lack ? `Cần ${TOOLS[d.tool].name}` : d.verb, d: Math.hypot(P.x - o.x, P.z - o.z) - 0.8 }); }
  if (near('river')) { const r = riverAt(P.x, P.z, kR); c.push({ kind: 'river', idx: 0, icon: '🎣', label: 'Câu cá', d: r.d - r.half + 0.5 }); }
  c.sort((a, b) => a.d - b.d);
  game.setAction(!game.isBusy() && !go?.kind ? c[0] || null : null);
};

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), gp = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05), gv = new THREE.Vector3();
const handleTap = (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (game.isPlacing()) { if (ray.ray.intersectPlane(gp, gv)) game.placeAt(gv.x, gv.z); return; }
  if (game.isBusy()) return;
  const r = ray.intersectObjects([...animalHits, ...hits, ...trapHits], false)[0];
  if (r && r.object.userData.kind === 'animal') return game.interact('animal', r.object.userData.idx);
  if (r) return approach(r.object.userData.kind, r.object.userData.idx);
  const po = pickObj(e.clientX, e.clientY); if (po) return approach('obj', po.id);
  if (ray.ray.intersectPlane(gp, gv)) {
    const o = OBJS.find((q) => q.plot && gv.x > q.plot.x0 && gv.x < q.plot.x1 && gv.z > q.plot.z0 && gv.z < q.plot.z1);
    if (o) return o.st === 'full' ? approach('obj', o.id) : game.toast(phaseAt(S.world.step) === 0 ? 'Thửa này đã gặt xong 🌾' : 'Lúa còn xanh, chờ mùa khô mới chín 🌾');
  }
  if (ray.ray.intersectPlane(gp, gv) && inWater(gv.x, gv.z, 1.05)) return approach('river', 0);
  if (ray.ray.intersectPlane(gp, gv) && !blocked(gv.x, gv.z)) go = { x: gv.x, z: gv.z, kind: null, stuck: 0 };
};
setupInput({ canvas, camera, joy, getAz: () => az, setAz: (v) => { az = v; }, getZoom: () => zoom, setZoom: (v) => { zoom = v; }, onTap: handleTap });

const CYC = DAY_STEPS * STEP_MS;
const dayFrac = () => (((Date.now() - S.t0) / CYC) % 1 + 1) % 1;
const dayness = (f) => (f < 0.6 ? THREE.MathUtils.smoothstep(Math.sin((Math.PI * f) / 0.6), 0.02, 0.4) : 0);
const TINT = [[0xd8b058, 0.24], [0x7fcf5a, 0.08], [0x2f8f50, 0.12], [0x5fa6a0, 0.1]].map(([c, o]) => ({ c: new THREE.Color(c), o }));
const GRAY = new THREE.Color(0x9aa7b0), FOG = new THREE.Color(0xe4ecf0), SILT = new THREE.Color(0xb8b078);
let rainK = 0, windK = 0;
const clock = new THREE.Clock();
let first = true, nextSlow = 0, nextClock = 0, nextZone = 0;
const loop = () => {
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
  { const nk = riverK(lvl); if (Math.abs(nk - kR) > 0.004) { kR = nk; shapeRiver(kR); } }
  riverTex.offset.y -= dt * 0.35;
  { const fr = (nf / 24) % 1, a = TINT[ph], b = TINT[(ph + 1) % 4], k = THREE.MathUtils.smoothstep(fr, 0.8, 1); tint.material.color.copy(a.c).lerp(b.c, k); tint.material.opacity = a.o + (b.o - a.o) * k; }
  waterMat.color.setRGB(1, 1, 1).lerp(SILT, ph === 3 ? 0.55 : ph === 2 ? 0.25 : 0);
  const dark = 1 - rainK * 0.35;
  hemi.intensity = (0.38 + 0.62 * d) * dark; sun.intensity = (0.2 + 0.95 * d) * (1 - rainK * 0.6); sun.color.setHex(ph === 0 ? 0xffe2a8 : 0xfff2d6); hemi.color.setHex(d > 0.5 ? 0xffffff : 0x8a9be0);
  lamp.intensity = (1 - d) * 4; lamp.position.set(HOUSE.x + 1.5, 1.8, HOUSE.z + 2.2);
  waterMat.emissive.setScalar(0.04 + 0.02 * Math.sin(now * 1.5));
  if (zone.visible && now > nextZone) { nextZone = now + 1; shapeRiver(kR); }

  updateFx(dt, now, CAMT, rainK, d, RS, riverPoint);
  HYACINTHS.forEach((m, i) => { m.position.y = 0.06 + Math.sin(now * 1.8 + i * 1.2) * 0.025; });

  for (const a of animals.values()) {
    const u = a.userData; u.bob += dt * 8;
    const dx = u.tx - a.position.x, dz = u.tz - a.position.z, dist = Math.hypot(dx, dz), run = u.sp === 'duck' && ph === 3 && d > 0.4, zn = run ? riverside : yard;
    if (dist > 0.08) {
      const sp = (u.sp === 'duck' ? 0.5 : 0.7) * dt * (u.isSick ? 0.3 : 1); a.position.x += (dx / dist) * sp; a.position.z += (dz / dist) * sp;
      a.rotation.y = Math.atan2(dx, dz); u.body.position.y = Math.abs(Math.sin(u.bob)) * 0.05; u.body.rotation.x = 0;
    } else {
      u.wait -= dt; u.body.rotation.x = u.isSick ? 0.7 : Math.sin(u.bob * 1.5) > 0.3 ? 0.5 : 0;
      if (u.wait <= 0) { u.tx = zn.x0 + Math.random() * (zn.x1 - zn.x0); u.tz = zn.z0 + Math.random() * (zn.z1 - zn.z0); u.wait = 1 + Math.random() * 3; if (Math.random() < 0.15) sfx.cluck(); }
    }
    if (u.sick) u.sick.position.y = 1.0 + Math.sin(now * 5) * 0.05;
  }
  if (bobOn) {
    bobber.position.set(bobPos.x, 0.12 + Math.sin(now * 3) * 0.03 - (bobBite ? 0.1 + Math.abs(Math.sin(now * 18)) * 0.08 : 0), bobPos.z);
    ROD_TIP.set(-0.43, 1.69, 0); rodM.updateWorldMatrix(true, false); rodM.localToWorld(ROD_TIP);
    const p = line.geometry.attributes.position; p.setXYZ(0, ROD_TIP.x, ROD_TIP.y, ROD_TIP.z); p.setXYZ(1, bobber.position.x, bobber.position.y, bobber.position.z); p.needsUpdate = true;
    bobRing.position.set(bobPos.x, 0.13, bobPos.z); const k = (now * (bobBite ? 3 : 0.8)) % 1; bobRing.scale.setScalar(0.6 + k * 1.6); bobRing.material.opacity = 0.7 * (1 - k);
  }
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

const before = S.last;
tick(); world.refresh(); game.init(world);
const msg = offlineSummary(before); if (msg) setTimeout(() => game.toast('Trong lúc bạn vắng: ' + msg, 4500), 900);
game.after(); save();
if (!S.stats.picked && !S.stats.fish && !S.builds.ban) setTimeout(() => game.toast('Chào bạn về miệt vườn! 🛶 Chạm cành khô, đá cuội để nhặt, rồi dựng bàn thợ ở 🏠 Nhà.', 5200), 1500);
requestAnimationFrame(loop);
addEventListener('pagehide', () => { tick(); save(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); world.refresh(); } });
window.__game = { S, world, game, P, objs: () => OBJS, proj: (x, z) => { const v = new THREE.Vector3(x, 0, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, az: () => az, go: () => go };

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('sw.js').catch(() => {});
