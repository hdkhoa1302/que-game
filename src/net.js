// Kết nối thế giới chung (tuỳ chọn): nếu không có máy chủ thì game vẫn chạy một mình như cũ.
import { joinWorld, ev } from './sim.js';
import { summarize, describe } from './brain.js';

const NAME_KEY = 'que-name', ADMIN_KEY = 'que-admin';
// trưởng làng: mở game bằng ?admin=KHÓA một lần; khóa được nhớ và gỡ khỏi thanh địa chỉ
const adminKey = () => {
  try {
    const q = new URLSearchParams(location.search), k = q.get('admin');
    if (k != null) { k ? localStorage.setItem(ADMIN_KEY, k) : localStorage.removeItem(ADMIN_KEY); q.delete('admin'); history.replaceState(null, '', location.pathname + (q.size ? '?' + q : '') + location.hash); }
    return localStorage.getItem(ADMIN_KEY) || undefined;
  } catch { return undefined; }
};
export const net = { on: false, id: 0, admin: false, proposals: [], peers: new Map(), onJoin: null, onLeave: null, onEmote: null, onStatus: null, onBrain: null };
let ws, retry = 1000, S, getPose;

const myName = () => {
  let n = ''; try { n = localStorage.getItem(NAME_KEY) || ''; } catch {}
  if (!n) { n = (prompt('Tên của bạn trong làng?', 'Người ' + Math.floor(100 + Math.random() * 900)) || '').trim().slice(0, 14) || 'Khách'; try { localStorage.setItem(NAME_KEY, n); } catch {} }
  return n;
};
const status = () => net.onStatus?.(net.on, net.peers.size + 1);

// sự kiện chung đã duyệt: lưu vào thế giới để mô phỏng (kể cả chạy bù offline) dùng đúng như mọi người
const setEvents = (list, announce) => {
  if (!Array.isArray(list)) return;
  const old = new Set((S.world.events || []).map((e) => e.id));
  S.world.events = list;
  if (announce) list.filter((e) => !old.has(e.id)).forEach((e) => ev(S, `🌏 Ông Trời: ${describe(e)} trong một mùa.`));
  net.onBrain?.();
};
const report = () => { if (net.on && ws.readyState === 1) ws.send(JSON.stringify({ t: 'report', r: summarize(S) })); };

export const connect = (state, pose) => {
  S = state; getPose = pose;
  if (location.protocol === 'file:') return;
  const url = (import.meta.env?.VITE_WS || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`) + '/ws';
  const open = () => {
    try { ws = new WebSocket(url); } catch { return; }
    ws.onopen = () => { retry = 1000; ws.send(JSON.stringify({ t: 'hello', name: myName(), admin: adminKey() })); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === 'welcome') {
        net.on = true; net.id = m.id;
        const r = joinWorld(S, m.world, m.now, Date.now());
        if (r.changed) { net.onWorld?.(); return; }
        net.admin = !!m.admin; setEvents(m.events, false); report();
        net.peers.clear(); m.players.forEach((p) => { net.peers.set(p.id, p); net.onJoin?.(p); });
      } else if (m.t === 'join') { net.peers.set(m.p.id, m.p); net.onJoin?.(m.p); }
      else if (m.t === 'leave') { net.peers.delete(m.id); net.onLeave?.(m.id); }
      else if (m.t === 'pos') m.p.forEach(([id, x, z, ry, mv]) => { const p = net.peers.get(id); if (p) Object.assign(p, { x, z, ry, mv }); });
      else if (m.t === 'emote') net.onEmote?.(m.id, m.e);
      else if (m.t === 'events') setEvents(m.events, true);
      else if (m.t === 'proposals') { net.proposals = m.proposals; net.onBrain?.(); }
      status();
    };
    ws.onclose = () => { net.on = false; net.peers.forEach((_, id) => net.onLeave?.(id)); net.peers.clear(); status(); setTimeout(open, retry); retry = Math.min(retry * 2, 15000); };
    ws.onerror = () => ws.close();
  };
  open();
  setInterval(report, 60e3);
  setInterval(() => { if (net.on && ws.readyState === 1 && !document.hidden) ws.send(JSON.stringify({ t: 'pos', ...getPose() })); }, 150);
};
export const emote = (e) => { if (net.on && ws.readyState === 1) ws.send(JSON.stringify({ t: 'emote', e })); };
export const decide = (id, ok) => { if (net.admin && ws.readyState === 1) ws.send(JSON.stringify({ t: 'decide', id, ok })); };
