// Máy chủ thế giới chung: giữ đồng hồ/hạt giống mùa-thời tiết và chuyển tiếp vị trí người chơi.
// Mỗi người vẫn có nông trại riêng (xu, kho, gà vịt); cùng chung mùa, thời tiết, mực nước và gặp nhau trong làng.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(DIR, 'dist');
const FILE = process.env.WORLD_FILE || path.join(DIR, 'world.json');
const MAX_PLAYERS = 24, MAX_NAME = 14;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const loadWorld = () => {
  try { const w = JSON.parse(fs.readFileSync(FILE, 'utf8')); if (w.id && w.seed != null && w.t0) return w; } catch {}
  const w = { id: Math.random().toString(36).slice(2, 10), seed: (Math.random() * 2 ** 31) | 0, t0: Date.now(), base: 0 };
  try { fs.writeFileSync(FILE, JSON.stringify(w)); } catch {}
  return w;
};

export const createServer = ({ port = Number(process.env.PORT) || 3000 } = {}) => {
  const world = loadWorld();
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(DIST, path.normalize(p));
    if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }).end(buf);
    });
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 });
  const players = new Map(); // ws -> {id, name, x, z, ry, mv}
  let nextId = 1;
  const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
  const bcast = (m, except) => { for (const ws of players.keys()) if (ws !== except) send(ws, m); };
  const num = (v, lim) => (Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
  const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_NAME) || 'Khách';

  wss.on('connection', (ws) => {
    if (players.size >= MAX_PLAYERS) { send(ws, { t: 'full' }); ws.close(); return; }
    const me = { id: nextId++, name: 'Khách', x: 2.4, z: 3.4, ry: 0, mv: 0, hello: false };
    players.set(ws, me);
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello' && !me.hello) {
        me.hello = true; me.name = clean(m.name);
        const pub = (p) => ({ id: p.id, name: p.name, x: p.x, z: p.z, ry: p.ry, mv: p.mv });
        send(ws, { t: 'welcome', id: me.id, now: Date.now(), world, players: [...players.values()].filter((p) => p !== me && p.hello).map(pub) });
        bcast({ t: 'join', p: pub(me) }, ws);
      } else if (m.t === 'pos' && me.hello) {
        me.x = num(m.x, 30); me.z = num(m.z, 30); me.ry = num(m.ry, 7); me.mv = m.mv ? 1 : 0;
      } else if (m.t === 'emote' && me.hello) bcast({ t: 'emote', id: me.id, e: String(m.e).slice(0, 4) }, ws);
    });
    ws.on('close', () => { players.delete(ws); if (me.hello) bcast({ t: 'leave', id: me.id }); });
    ws.on('error', () => {});
  });
  // gộp vị trí 10 lần/giây
  const tickT = setInterval(() => {
    if (players.size < 2) return;
    const all = [...players.values()].filter((p) => p.hello).map((p) => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.ry.toFixed(2), p.mv]);
    for (const [ws, me] of players) send(ws, { t: 'pos', p: all.filter((a) => a[0] !== me.id) });
  }, 100);
  return new Promise((ok) => server.listen(port, () => ok({
    world, port: server.address().port,
    close: () => { clearInterval(tickT); for (const ws of players.keys()) ws.terminate(); wss.close(); server.close(); },
  })));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) createServer().then((s) => console.log(`Về quê: http://localhost:${s.port} (thế giới ${s.world.id})`));
