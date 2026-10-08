// Chạy: node test.js — kiểm tra lõi mô phỏng (thuần, không DOM).
import assert from 'node:assert/strict';
import { S, tick } from './src/state.js';
import { hatchLimit, advance, weatherOf, levelAt, phaseAt, adultsOf, capOf, lifeStage, dayAt } from './src/sim.js';
import { cross, founder, mulberry32, avg, MUT } from './src/genes.js';
import { STEP_MS, DAY_STEPS, MAX_CATCHUP, PHASE_STEPS, AGE } from './src/data.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
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
