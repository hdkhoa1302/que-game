// Chạy: node test-brain.js — Ông Trời: luật đề xuất, chống khai man, dịch nhắm gen, quyền duyệt trên server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const tmp = (n) => path.join(os.tmpdir(), `que-${n}-${process.pid}.json`);
process.env.WORLD_FILE = tmp('world'); process.env.BRAIN_FILE = tmp('brain');
const { think, decide, sanitize, summarize, diversity } = await import('./src/brain.js');
const { S } = await import('./src/state.js');
const { advance, worldPrice, eventsAt, dayAt } = await import('./src/sim.js');
const { founder, mulberry32, LOCI } = await import('./src/genes.js');
const { STEP_MS, PHASE_STEPS, MIN, BRAIN } = await import('./src/data.js');
const clone = (o) => JSON.parse(JSON.stringify(o));

// nông trại giả: đàn gà với allele `v` ở gen size chiếm tỉ lệ `share`
const farm = (name, { coins = 100, share = 0.3, n = 6 } = {}) => {
  const s = clone(S); s.farmId = name.padEnd(8, '0'); s.coins = coins;
  const r = mulberry32(name.length * 77 + name.charCodeAt(0));
  s.animals.forEach((a, i) => { a.genome = founder(r); if (a.sp === 'chicken') a.genome.size = [r() < share ? 9 : (i % 8), r() < share ? 9 : ((i + 3) % 8)]; });
  return sanitize(summarize(s));
};
const fresh = () => ({ reports: {}, history: [], proposals: [], events: [] });
const put = (B, rs, t) => rs.forEach((r) => (B.reports[r.farm] = { ...r, t }));
const T0 = 1e12;

// 1. tóm tắt hợp lệ qua sanitize; rác bị loại hoặc kẹp
{
  const r = farm('aaa');
  assert.ok(r && r.herd.chicken.al.size.length === 10);
  assert.equal(sanitize({ farm: '../x' }), null);
  const bad = sanitize({ farm: 'abcdef12', coins: -5, herd: { chicken: { m: 1e9, al: { size: ['x', 1e9] } } } });
  assert.equal(bad.coins, 0); assert.equal(bad.herd.chicken.m, 200); assert.deepEqual(bad.herd.chicken.al.size.slice(0, 2), [0, 400]);
}
// 2. dưới 3 nông trại: không đề xuất gì
{ const B = fresh(); put(B, [farm('aa1', { share: 1 }), farm('aa2', { share: 1 })], T0); assert.deepEqual(think(B, T0, 100), []); }
// 3. gen lệch → đề xuất dịch đúng loài/gen/allele; gen đa dạng → không
{
  const B = fresh(); put(B, ['bb1', 'bb2', 'bb3'].map((n) => farm(n, { share: 1 })), T0);
  const [p] = think(B, T0, 100);
  assert.equal(p.type, 'dich'); assert.equal(p.sp, 'chicken'); assert.equal(p.locus, 'size'); assert.equal(p.allele, 9);
  assert.equal(think(B, T0 + MIN, 101).length, 0, 'không đề xuất trùng khi đang chờ duyệt');
  const C = fresh(); put(C, ['cc1', 'cc2', 'cc3'].map((n) => farm(n, { share: 0 })), T0);
  assert.ok(!think(C, T0, 100).some((x) => x.type === 'dich' && x.locus === 'size'), 'gen size đa dạng thì không bị nhắm');
}
// 4. một người khai 400 con cùng allele không lấn át 3 nông trại thật (mỗi nông trại một phiếu)
{
  const liar = farm('liar0'); liar.herd.chicken.al.size = [0, 0, 0, 0, 0, 0, 0, 0, 0, 400];
  const d = diversity([farm('dd1', { share: 0 }), farm('dd2', { share: 0 }), farm('dd3', { share: 0 }), liar]).find((x) => x.sp === 'chicken' && x.locus === 'size');
  assert.ok(d.share < BRAIN.dominant, `kẻ khai man lấn át: ${d.share}`);
}
// 5. kinh tế: xu trung vị tăng mạnh sau một năm game → ép giá ×0.8; giảm mạnh → ×1.2
{
  const B = fresh(), names = ['ee1', 'ee2', 'ee3'];
  put(B, names.map((n) => farm(n, { coins: 100 })), T0); think(B, T0, 100);
  const t1 = T0 + BRAIN.econWindowMs; put(B, names.map((n) => farm(n, { coins: 400 })), t1);
  const g = think(B, t1, 200).find((x) => x.type === 'gia'); assert.equal(g?.mul, BRAIN.priceDown);
  const C = fresh(); put(C, names.map((n) => farm(n, { coins: 400 })), T0); think(C, T0, 100);
  put(C, names.map((n) => farm(n, { coins: 100 })), t1);
  assert.equal(think(C, t1, 200).find((x) => x.type === 'gia')?.mul, BRAIN.priceUp);
}
// 6. hết hạn sau một mùa; duyệt → sự kiện bắt đầu bước kế, dài một mùa; bỏ → không có gì
{
  const B = fresh(); put(B, ['ff1', 'ff2', 'ff3'].map((n) => farm(n, { share: 1 })), T0);
  const [p] = think(B, T0, 100);
  assert.equal(decide(B, p.id, true, T0 + PHASE_STEPS * STEP_MS + 1, 130), null, 'đề xuất hết hạn không duyệt được');
  const [q] = think(B, T0 + PHASE_STEPS * STEP_MS + 2, 130);
  assert.equal(decide(B, q.id, false, T0 + PHASE_STEPS * STEP_MS + 3, 130), null); assert.equal(B.events.length, 0);
  const [r] = think(B, T0 + 2 * PHASE_STEPS * STEP_MS, 160);
  const e = decide(B, r.id, true, T0 + 2 * PHASE_STEPS * STEP_MS, 160);
  assert.deepEqual([e.from, e.to], [161, 161 + PHASE_STEPS]); assert.equal(B.events.length, 1);
  assert.equal(think(B, T0 + 2 * PHASE_STEPS * STEP_MS + MIN, 170).length, 0, 'không đề xuất lại khi dịch đang chạy');
}
// 7. mô phỏng: dịch chỉ chạy trong [from, to), làm con mang allele ốm nhiều hơn; giá chợ nhân hệ số
{
  const base = clone(S); base.world.seed = 4242; base.fedUntil = Infinity;
  const sick = (withEv) => { let n = 0;
    for (let k = 0; k < 40; k++) {
      const s = clone(base); s.world.seed = 1000 + k; const r = mulberry32(k + 3);
      s.animals.forEach((a) => { a.genome = founder(r); a.genome.size = [9, 9]; a.genome.resist = [3, 3]; });
      const st = s.world.step; s.world.events = withEv ? [{ id: 'x', type: 'dich', sp: 'chicken', locus: 'size', allele: 9, from: st + 1, to: st + 1 + PHASE_STEPS }] : [];
      for (let i = 0; i < PHASE_STEPS; i++) { advance(s, s.t0 + (s.world.step - s.world.base + 1) * STEP_MS + 1); n += s.animals.filter((a) => a.sp === 'chicken' && a.sickUntil).length; }
    } return n; };
  const a = sick(true), b = sick(false);
  assert.ok(a > b * 2 + 10, `dịch không có tác dụng: ${a} vs ${b}`);
  const s = clone(S); s.world.events = [{ id: 'g', type: 'gia', mul: 0.8, from: 10, to: 20 }];
  assert.equal(worldPrice(s, 9), 1); assert.equal(worldPrice(s, 10), 0.8); assert.equal(worldPrice(s, 20), 1);
  assert.equal(eventsAt(s, 15).length, 1);
  console.log(`dịch nhắm gen: số lượt ốm ${a} (có dịch) vs ${b} (không)`);
}

// 8. server: báo cáo → đề xuất chỉ tới trưởng làng; khách không duyệt được; duyệt → mọi người nhận sự kiện
{
  const { createServer } = await import('./server.js');
  const srv = await createServer({ port: 0, adminKey: 'bi-mat' });
  const url = `ws://localhost:${srv.port}/ws`, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const client = (name, admin) => new Promise((ok) => {
    const ws = new WebSocket(url), c = { ws, msgs: [] };
    ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', name, admin })));
    ws.on('message', (d) => { const m = JSON.parse(d); c.msgs.push(m); if (m.t === 'welcome') { c.welcome = m; ok(c); } });
  });
  const boss = await client('Trưởng', 'bi-mat'), guest = await client('Khách', 'doan-mo'), cs = [boss, guest, await client('Ba')];
  assert.equal(boss.welcome.admin, true); assert.equal(guest.welcome.admin, false);
  cs.forEach((c, i) => c.ws.send(JSON.stringify({ t: 'report', r: farm(`srv${i}`, { share: 1 }) })));
  guest.ws.send(JSON.stringify({ t: 'report', r: farm('srvX', { share: 1 }) })); // kết nối thứ hai báo nông trại khác: bị bỏ
  await wait(100);
  assert.equal(Object.keys(srv.brain.reports).length, 3);
  const [p] = srv.mind(); await wait(80);
  assert.ok(p, 'có đề xuất');
  assert.ok(boss.msgs.some((m) => m.t === 'proposals' && m.proposals.some((x) => x.id === p.id)));
  assert.ok(!guest.msgs.some((m) => m.t === 'proposals'), 'khách không thấy đề xuất');
  guest.ws.send(JSON.stringify({ t: 'decide', id: p.id, ok: true })); await wait(80);
  assert.equal(srv.brain.events.length, 0, 'khách không duyệt được');
  boss.ws.send(JSON.stringify({ t: 'decide', id: p.id, ok: true })); await wait(80);
  assert.equal(srv.brain.events.length, 1);
  for (const c of cs) assert.ok(c.msgs.some((m) => m.t === 'events' && m.events[0].id === p.id), 'mọi người nhận sự kiện');
  cs.forEach((c) => c.ws.close()); srv.close();
}
for (const f of [process.env.WORLD_FILE, process.env.BRAIN_FILE]) fs.rmSync(f, { force: true });
console.log('OK: test Ông Trời đạt');
process.exit(0);
