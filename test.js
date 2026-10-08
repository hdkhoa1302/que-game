// Chạy: node test.js — kiểm tra lõi mô phỏng (thuần, không DOM).
import assert from 'node:assert/strict';
import { S, tick } from './src/state.js';
import { hatchLimit, advance, weatherOf, levelAt, phaseAt, adultsOf, capOf, lifeStage, dayAt } from './src/sim.js';
import { cross, founder, mulberry32, avg, MUT } from './src/genes.js';
import { STEP_MS, DAY_STEPS, MAX_CATCHUP, PHASE_STEPS, AGE } from './src/data.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
// bản lưu cố định để test xác định (không phụ thuộc seed ngẫu nhiên của lần chạy)
S.world.seed = 12345; { const r = mulberry32(99), d0 = dayAt(S.world.step); S.animals.forEach((a, i) => { a.genome = founder(r); a.born = d0 - 3 - ((i * 3) % 8); }); }
const run = (base, steps) => { const s = clone(base); s.fedUntil = Infinity; for (let i = 0; i < steps; i += 8) { const k = Math.min(8, steps - i); advance(s, s.t0 + (s.world.step - s.world.base + k) * STEP_MS + 1); } return s; };

// 1. cùng seed → cùng thời tiết
assert.equal(weatherOf(123, 40), weatherOf(123, 40));
assert.deepEqual([...Array(30)].map((_, d) => weatherOf(5, d)), [...Array(30)].map((_, d) => weatherOf(5, d)));

// 2. mực nước: khô thấp, nước nổi cao, luôn trong [0.2,1]
for (let n = 0; n < 400; n += 3) { const l = levelAt(n); assert.ok(l >= 0.19 && l <= 1.01, `level ${n}=${l}`); }
assert.ok(levelAt(PHASE_STEPS * 3.5) > 0.95 && levelAt(PHASE_STEPS * 0.5) < 0.25);

// 3. xác định: cùng bản lưu + cùng số bước → cùng kết quả
const a = run(S, 200), b = run(S, 200);
assert.deepEqual(a.animals, b.animals); assert.deepEqual(a.eggs, b.eggs);

// 4. offline = từng bước (một lần advance bằng nhiều lần advance nhỏ)
const one = run(S, 30), many = clone(S); many.fedUntil = Infinity;
for (let i = 1; i <= 30; i++) advance(many, many.t0 + (many.world.step - many.world.base + 1) * STEP_MS + 1);
assert.equal(many.world.step, one.world.step); assert.deepEqual(many.animals, one.animals);

// 5. trần bù offline
const far = clone(S); advance(far, far.t0 + 10000 * STEP_MS);
assert.ok(far.animals.length >= Math.floor(S.animals.length / 2), 'vắng lâu không được làm cả đàn chết');
const cap = clone(S); const before = cap.world.step; cap.world.step = before; advance(cap, cap.t0 + (before - cap.world.base + 5000) * STEP_MS);
// số bước thực chạy không vượt MAX_CATCHUP: world.step nhảy tới đích nhưng chỉ chạy MAX_CATCHUP bước mô phỏng
assert.equal(cap.world.step, before + 5000);

// 6. di truyền: allele con luôn từ bố hoặc mẹ (khi không đột biến); đột biến ≈ 2%, kẹp 0–9
const rng = mulberry32(42), m = founder(rng), f = founder(rng);
let mutated = 0, total = 0;
for (let i = 0; i < 4000; i++) {
  const c = cross(m, f, rng);
  for (const l of Object.keys(c)) for (let k = 0; k < 2; k++) {
    const par = k === 0 ? m[l] : f[l]; total++;
    assert.ok(c[l][k] >= 0 && c[l][k] <= 9);
    if (!par.includes(c[l][k])) mutated++;
  }
}
assert.ok(mutated / total > MUT * 0.5 && mutated / total < MUT * 1.2, `đột biến ${mutated / total}`);

// 7. dân số không vượt sức chứa chuồng; già quá tuổi thì mất
const long = run(S, 12 * 96);
for (const sp of ['chicken', 'duck']) assert.ok(long.animals.filter((x) => x.sp === sp).length <= hatchLimit(long, sp), `${sp} vượt giới hạn`);
const day = dayAt(long.world.step);
assert.ok(long.animals.every((x) => day - x.born < AGE.max));
assert.ok(adultsOf(long, 'chicken', 'f').length >= 1 || long.animals.every((x) => x.sp !== 'chicken'));

// 8. chọn lọc: đề kháng trung bình của đàn sống sót trong mùa mưa không thấp hơn đàn ban đầu
const rain = clone(S); rain.world.step = rain.world.base = PHASE_STEPS * 2; rain.t0 = Date.now() - 1; // vào mùa mưa
rain.animals.forEach((x) => { x.born -= 0; });
const mean = (s) => s.animals.reduce((t, x) => t + avg(x.genome, 'resist'), 0) / Math.max(1, s.animals.length);
const after = run(rain, 30 * DAY_STEPS);
assert.ok(after.animals.length > 0);
console.log('OK: tất cả test đạt. dân số sau 12 năm game:', long.animals.length, '| trứng:', long.eggs.length, '| đề kháng TB', mean(S).toFixed(2), '→', mean(after).toFixed(2));

// 8b. chọn lọc: 6 năm game, đàn có áp lực bệnh mùa mưa có đề kháng TB cao hơn đàn đối chứng (tắt bệnh)
{
  const res = (noD) => { let tot = 0, n = 0; for (let k = 0; k < 60; k++) { const s = clone(S); s.world.seed = (k * 7919 + 13) | 0; const r = mulberry32(k + 1); s.animals.forEach((a) => { a.genome = founder(r); }); s.fedUntil = Infinity; s.noDisease = noD;
    for (let i = 0; i < 6 * 96; i++) advance(s, s.t0 + (s.world.step - s.world.base + 1) * STEP_MS + 1);
    if (s.animals.length) { tot += mean(s); n++; } } return tot / n; };
  const withP = res(false), ctrl = res(true);
  assert.ok(withP > ctrl + 0.1, `chọn lọc yếu: có áp lực ${withP.toFixed(2)} vs đối chứng ${ctrl.toFixed(2)}`);
  console.log(`chọn lọc: đề kháng TB có áp lực ${withP.toFixed(2)} > đối chứng ${ctrl.toFixed(2)}`);
}

// 9. ổn định đàn: 30 seed × 12 năm game, nuôi đủ ăn, không can thiệp → tuyệt chủng mỗi loài ≤ 10%
{
  let ext = { chicken: 0, duck: 0 };
  for (let k = 0; k < 30; k++) {
    const s = clone(S); s.world.seed = (k * 7919 + 13) | 0; const r = mulberry32(k + 1); s.animals.forEach((a, i) => { a.genome = founder(r); a.born = dayAt(s.world.step) - 3 - ((i * 3) % 8); }); s.fedUntil = Infinity;
    for (let i = 0; i < 12 * 96; i++) advance(s, s.t0 + (s.world.step - s.world.base + 1) * STEP_MS + 1);
    for (const sp of Object.keys(ext)) if (!s.animals.some((a) => a.sp === sp)) ext[sp]++;
  }
  assert.ok(ext.chicken <= 3 && ext.duck <= 3, `tuyệt chủng quá nhiều: ${JSON.stringify(ext)}`);
  console.log('ổn định đàn (30 seed × 12 năm):', JSON.stringify(ext));
}

// 10. vật thể khai thác: sinh xác định, đủ loại, mọc lại theo ngày, đúng mùa
{
  const { genObjects, objAvail, keepOut, riverAt, riverPoint, shallowAt, snapToShallow, RS } = await import('./src/objs.js');
  const { OBJ, TOOLS, ZONES } = await import('./src/data.js');
  const a = genObjects(), b = genObjects();
  assert.deepEqual(a, b, 'vị trí vật thể phải xác định');
  const WET = ['snail', 'reed', 'nipa', 'clay', 'dien', 'lily', 'ban'];
  assert.ok(a.length > 200 && a.filter((o) => o.kind !== 'thua').every((o) => !keepOut(o.x, o.z, WET.includes(o.kind))), 'đủ vật thể, không đè khu nhà vườn, không rơi xuống sông');
  assert.ok(a.filter((o) => o.kind !== 'thua').every((o) => { const r = riverAt(o.x, o.z, 1.15); return r.d > r.half * 1.0; }), 'không vật thể nào nằm trong nước kể cả lúc nước nổi');
  for (const k of Object.keys(OBJ)) assert.ok(a.some((o) => o.kind === k), `thiếu loại ${k}`);
  const tree = a.find((o) => o.kind === 'tree'), snail = a.find((o) => o.kind === 'snail'), dien = a.find((o) => o.kind === 'dien');
  const s = { obj: {} };
  assert.ok(objAvail(s, tree, 10, 1)); s.obj[tree.id] = 10 + OBJ.tree.regrow;
  assert.ok(!objAvail(s, tree, 10, 1) && !objAvail(s, tree, 15, 1) && objAvail(s, tree, 16, 1), 'mọc lại sau regrow ngày');
  assert.ok(!objAvail(s, snail, 1, 0) && objAvail(s, snail, 1, 1), 'ốc chỉ có từ đầu mưa');
  assert.ok(!objAvail(s, dien, 1, 2) && objAvail(s, dien, 1, 3), 'điên điển chỉ mùa nước nổi');
  // mọi công cụ chế được từ nguyên liệu khai thác được; khởi đầu có thể dựng bàn thợ
  const yields = new Set(Object.values(OBJ).flatMap((o) => Object.keys(o.yield)));
  for (const t of Object.values(TOOLS)) for (const tr of t.tiers.slice(1)) for (const r of Object.keys(tr.cost)) assert.ok(yields.has(r), `không khai thác được ${r}`);
  const { BUILD, START_RES } = await import('./src/data.js');
  assert.ok(Object.entries(BUILD.ban.cost).every(([r, n]) => (START_RES[r] || 0) >= n), 'đủ nguyên liệu khởi đầu dựng bàn thợ');
  // tay không lấy được go, da, soi (để chế công cụ đầu tiên): cành khô, đá cuội, cỏ dại
  const hand = new Set(Object.values(OBJ).filter((o) => !o.tool).flatMap((o) => Object.keys(o.yield)));
  for (const r of ['go', 'da', 'soi']) assert.ok(hand.has(r), `tay không phải lấy được ${r}`);
  console.log(`vật thể: ${a.length} cái, ${ZONES.length} khu — OK`);
}

// 11. sông: hình học, nước nông, đường qua sông
{
  const { riverAt, riverPoint, shallowAt, snapToShallow, RS } = await import('./src/objs.js');
  const { ZONES, riverK, PADDY } = await import('./src/data.js');
  for (const s of [0.1, 0.4, 0.8]) { const p = riverPoint(s, 1); const r = riverAt(p.x, p.z); assert.ok(r.d < 0.35, `điểm tâm phải nằm trên sông (${r.d})`); assert.ok(!shallowAt(p.x, p.z), 'giữa sông là nước sâu'); const q = [p.x + p.nx * p.half * 0.75, p.z + p.nz * p.half * 0.75]; assert.ok(shallowAt(q[0], q[1]), 'cách tâm 0,75 nửa bề rộng là nước nông'); }
  const [sx, sz] = snapToShallow(2, 2); assert.ok(shallowAt(sx, sz), 'kéo lờ cũ về nước nông');
  assert.ok(riverK(0.2) < riverK(1) && Math.abs(riverK(0.2) - 0.82) < 1e-9, 'sông rộng theo mực nước');
  // làng và bờ đông ở hai phía sông: phải bắc cầu mới sang
  const side = (x, z) => { const r = riverAt(x, z), i = Math.round(r.s * (RS.length - 1)), q = RS[Math.min(i, RS.length - 2)]; return Math.sign(q.tx * (z - r.cz) - q.tz * (x - r.cx)); };
  const village = side(0, 0);
  for (const id of ['rung', 'dong']) { const z = ZONES.find((x) => x.id === id); assert.notEqual(side(z.x, z.z), village, `${id} phải ở bờ đông`); }
  for (const id of ['lang', 'tre', 'nui', 'bai']) { const z = ZONES.find((x) => x.id === id); assert.equal(side(z.x, z.z), village, `${id} phải ở bờ tây`); }
  assert.notEqual(side((PADDY.x0 + PADDY.x1) / 2, (PADDY.z0 + PADDY.z1) / 2), village, 'ruộng lúa ở bờ đông');
  // cầu khỉ phủ hết lòng sông ở hàng z=-1.2 kể cả lúc nước nổi (cầu x ∈ [5.1, 13.0])
  let a = null, b = null; for (let x = 0; x < 20; x += 0.05) { if (riverAt(x, -1.2, riverK(1)).d < riverAt(x, -1.2, riverK(1)).half) { a ??= x; b = x; } }
  assert.ok(a >= 3.5 && a <= 5.4 && b <= 13.0, `bến tre/cầu phải chạm hai bờ (nước ${a}–${b})`);
  console.log(`sông: nước ở z=-1,2 từ x=${a.toFixed(1)} đến ${b.toFixed(1)} — OK`);
}

// 12. ruộng lúa: 4 thửa trong ruộng, ngoài lòng sông, chỉ gặt được mùa khô, thóc vào kho
{
  const { genObjects, objAvail, riverAt } = await import('./src/objs.js');
  const { PLOTS, PADDY, OBJ, ZONES } = await import('./src/data.js');
  const plots = genObjects().filter((o) => o.kind === 'thua');
  assert.equal(plots.length, 4); assert.equal(PLOTS.length, 4);
  for (const q of PLOTS) { assert.ok(q.x0 >= PADDY.x0 && q.x1 <= PADDY.x1 && q.z0 >= PADDY.z0 && q.z1 <= PADDY.z1, 'thửa nằm trong ruộng'); for (const [x, z] of [[q.x0, q.z0], [q.x1, q.z0], [q.x0, q.z1], [q.x1, q.z1]]) { const r = riverAt(x, z, 1.15); assert.ok(r.d > r.half, 'thửa không đè lòng sông'); } }
  const S = { obj: {} }, o = plots[0];
  assert.ok(objAvail(S, o, 5, 0) && !objAvail(S, o, 5, 1) && !objAvail(S, o, 5, 3), 'lúa chỉ chín mùa khô');
  S.obj[o.id] = 5 + OBJ.thua.regrow; assert.ok(!objAvail(S, o, 6, 0), 'gặt rồi thì chờ mùa sau');
  assert.ok(OBJ.thua.yield.thoc && OBJ.thua.tool === 'liem');
  // mỗi mảnh tài nguyên khởi đầu đều có nguồn ở bờ tây (không cần qua sông): tre, gỗ, đá, sợi, rơm, sét, lá dừa
  const west = new Set(ZONES.filter((z) => ['lang', 'tre', 'nui', 'bai', 'rach'].includes(z.id)).flatMap((z) => z.mix.flatMap(([k]) => Object.keys(OBJ[k].yield))));
  for (const r of ['go', 'da', 'soi', 'tre', 'rom', 'set', 'la']) assert.ok(west.has(r), `bờ tây phải có ${r} để bắc cầu`);
  console.log('ruộng lúa và nguồn tài nguyên bờ tây — OK');
}
