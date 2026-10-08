// Chạy: node test-net.js — server thế giới chung + logic gia nhập (không DOM).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

process.env.WORLD_FILE = path.join(os.tmpdir(), `que-world-${process.pid}.json`);
const { createServer } = await import('./server.js');
const { S } = await import('./src/state.js');
const { joinWorld, stepF, weatherOf, dayAt } = await import('./src/sim.js');

// --- joinWorld: hai máy lệch đồng hồ vẫn thấy cùng bước/thời tiết ---
const W = { id: 'w1', seed: 777, t0: 1_000_000, base: 0 }, now = 1_000_000 + 5000 * 60e3;
const a = JSON.parse(JSON.stringify(S)), b = JSON.parse(JSON.stringify(S));
const ageA = dayAt(a.world.step) - a.animals[0].born;
joinWorld(a, W, now, now);            // đồng hồ chuẩn
joinWorld(b, W, now, now + 90_000);   // máy này nhanh 90 giây
assert.equal(a.world.seed, 777);
assert.ok(Math.abs(stepF(a, now) - stepF(b, now + 90_000)) < 1e-6, 'lệch đồng hồ được bù');
assert.equal(weatherOf(a.world.seed, dayAt(Math.floor(stepF(a, now)))), weatherOf(b.world.seed, dayAt(Math.floor(stepF(b, now + 90_000)))));
assert.equal(dayAt(a.world.step) - a.animals[0].born, ageA, 'tuổi gà vịt được giữ nguyên');
assert.equal(joinWorld(a, W, now, now).changed, false, 'vào lại cùng thế giới không dời gì');

// --- server ---
const srv = await createServer({ port: 0 });
const url = `ws://localhost:${srv.port}/ws`;
const client = (name) => new Promise((ok) => {
  const ws = new WebSocket(url), c = { ws, msgs: [], name };
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', name })));
  ws.on('message', (d) => { const m = JSON.parse(d); c.msgs.push(m); if (m.t === 'welcome') { c.id = m.id; c.welcome = m; ok(c); } });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const c1 = await client('An'), c2 = await client('<b>Bình dài dài dài dài dài</b>');
assert.equal(c1.welcome.world.id, c2.welcome.world.id, 'cùng một thế giới');
assert.equal(c1.welcome.world.seed, c2.welcome.world.seed);
assert.equal(c2.welcome.players.length, 1, 'người sau thấy người trước');
await wait(50);
const join = c1.msgs.find((m) => m.t === 'join');
assert.ok(join && join.p.name.length <= 14 && !/[<>]/.test(join.p.name), 'tên được làm sạch');
c1.ws.send(JSON.stringify({ t: 'pos', x: 5, z: -2, ry: 1, mv: 1 }));
c1.ws.send(JSON.stringify({ t: 'pos', x: 1e9, z: NaN, ry: 0, mv: 0 }));
c1.ws.send('rác'); c1.ws.send(JSON.stringify({ t: 'pos', x: 5, z: -2, ry: 1, mv: 1 }));
await wait(250);
const pos = c2.msgs.filter((m) => m.t === 'pos').at(-1);
assert.ok(pos, 'nhận được vị trí'); assert.deepEqual(pos.p[0].slice(1, 3), [5, -2]);
assert.ok(!pos.p.some((r) => r[0] === c2.id), 'không gửi lại vị trí của chính mình');
c1.ws.send(JSON.stringify({ t: 'emote', e: '👋' })); await wait(80);
assert.ok(c2.msgs.some((m) => m.t === 'emote' && m.e === '👋'));
c1.ws.close(); await wait(80);
assert.ok(c2.msgs.some((m) => m.t === 'leave' && m.id === c1.id), 'thông báo khi rời');
c2.ws.close(); srv.close(); fs.rmSync(process.env.WORLD_FILE, { force: true });
console.log('OK: test mạng đạt');
process.exit(0);
