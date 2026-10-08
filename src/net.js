// Kết nối thế giới chung (tuỳ chọn): nếu không có máy chủ thì game vẫn chạy một mình như cũ.
import { joinWorld } from './sim.js';

const NAME_KEY = 'que-name';
export const net = { on: false, id: 0, peers: new Map(), onJoin: null, onLeave: null, onEmote: null, onStatus: null };
let ws, retry = 1000, S, getPose;

const myName = () => {
  let n = ''; try { n = localStorage.getItem(NAME_KEY) || ''; } catch {}
  if (!n) { n = (prompt('Tên của bạn trong làng?', 'Người ' + Math.floor(100 + Math.random() * 900)) || '').trim().slice(0, 14) || 'Khách'; try { localStorage.setItem(NAME_KEY, n); } catch {} }
  return n;
};
const status = () => net.onStatus?.(net.on, net.peers.size + 1);

export const connect = (state, pose) => {
  S = state; getPose = pose;
  if (location.protocol === 'file:') return;
  const url = (import.meta.env?.VITE_WS || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`) + '/ws';
  const open = () => {
    try { ws = new WebSocket(url); } catch { return; }
    ws.onopen = () => { retry = 1000; ws.send(JSON.stringify({ t: 'hello', name: myName() })); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === 'welcome') {
        net.on = true; net.id = m.id;
        const r = joinWorld(S, m.world, m.now, Date.now());
        if (r.changed) { net.onWorld?.(); return; }
        net.peers.clear(); m.players.forEach((p) => { net.peers.set(p.id, p); net.onJoin?.(p); });
      } else if (m.t === 'join') { net.peers.set(m.p.id, m.p); net.onJoin?.(m.p); }
      else if (m.t === 'leave') { net.peers.delete(m.id); net.onLeave?.(m.id); }
      else if (m.t === 'pos') m.p.forEach(([id, x, z, ry, mv]) => { const p = net.peers.get(id); if (p) Object.assign(p, { x, z, ry, mv }); });
      else if (m.t === 'emote') net.onEmote?.(m.id, m.e);
      status();
    };
    ws.onclose = () => { net.on = false; net.peers.forEach((_, id) => net.onLeave?.(id)); net.peers.clear(); status(); setTimeout(open, retry); retry = Math.min(retry * 2, 15000); };
    ws.onerror = () => ws.close();
  };
  open();
  setInterval(() => { if (net.on && ws.readyState === 1 && !document.hidden) ws.send(JSON.stringify({ t: 'pos', ...getPose() })); }, 150);
};
export const emote = (e) => { if (net.on && ws.readyState === 1) ws.send(JSON.stringify({ t: 'emote', e })); };
