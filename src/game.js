import { S, save, tick, add, stageOf, bedReady, trapLeft, trapState, nestCap, questDone, reset } from './state.js';
import { FISH, CROPS, EGGS, GRAIN, BAIT, TRAP_TIMES, UP, COOP_CAP, ANIMAL, QUESTS, priceMul, MIN } from './data.js';
import { sfx, buzz, unlock } from './sfx.js';

const $ = (s) => document.querySelector(s);
let world, cur = null, pressed = false, placing = false, P = null;
const sync = () => { document.body.classList.toggle('busy', !!cur || F.on); $('#hint').hidden = !placing; world?.zone(placing); };

const fmt = (ms) => {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
const coin = (n) => `🪙${n}`;
export const toast = (msg, ms = 2400) => {
  document.querySelector('#toast')?.remove();
  const t = document.createElement('div'); t.id = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), ms);
};

// ---------- Bottom sheet ----------
const draw = () => { if (cur) $('#sheetBody').innerHTML = cur(); };
const open = (fn) => { cur = fn; draw(); $('#sheet').hidden = false; $('#back').hidden = false; $('#sheet').scrollTop = 0; sync(); };
const close = () => { cur = null; $('#sheet').hidden = true; $('#back').hidden = true; sync(); };

let shown = -1;
const countTo = (to) => {
  const el = $('#cv'), from = shown < 0 ? to : shown, t0 = performance.now(); shown = to;
  if (from === to) { el.textContent = to; return; }
  $('#coins').classList.remove('bump'); void $('#coins').offsetWidth; $('#coins').classList.add('bump');
  const f = (n) => { const k = Math.min(1, (n - t0) / 450); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
};
const hud = () => {
  countTo(S.coins);
  const q = QUESTS[S.quest];
  $('#quest').innerHTML = q ? `<span>🎯</span><div class="q">${q.text}<small>Nhiệm vụ ${S.quest + 1}/${QUESTS.length}</small></div><div class="rw">+${q.reward}🪙</div>` : '<span>🌾</span><div class="q">Hết nhiệm vụ<small>Cứ thong thả làm ăn nhé</small></div>';
  // chip báo việc cần làm: chạm là nhân vật tự đi tới
  const chips = [], rb = S.beds.map((b, i) => (i < S.bedsN && bedReady(b) ? i : -1)).filter((i) => i >= 0);
  if (rb.length) chips.push(`<button data-go="bed:${rb[0]}">${CROPS.find((c) => c.id === S.beds[rb[0]].crop).icon} ${rb.length} chín</button>`);
  const eg = Math.floor(S.nest.trungga + S.nest.trungvit); if (eg >= 1) chips.push(`<button data-go="coop:0">🥚 ${eg}</button>`);
  const tr = S.traps.map((t, i) => (trapState(t) === 'ready' ? i : -1)).filter((i) => i >= 0);
  if (tr.length) chips.push(`<button data-go="trap:${tr[0]}">🪤 ${tr.length} đầy</button>`);
  if (S.fedUntil < Date.now() && !chips.length && S.stats.fed) chips.push('<button data-go="coop:0">🌾 Gà vịt đói</button>');
  $('#chips').innerHTML = chips.join('');
  $('#bar [data-open=trap] i').textContent = tr.length || '';
};

// Nút hành động theo ngữ cảnh: main.js báo vật gần nhất trong tầm với.
let actKey = '';
export const setAction = (a) => {
  const key = a ? `${a.kind}:${a.idx}:${a.label}` : '';
  if (key === actKey) return; actKey = key;
  const b = $('#act'); b.hidden = !a; if (a) { b.innerHTML = `${a.icon}<span>${a.label}</span>`; b.dataset.kind = a.kind; b.dataset.idx = a.idx; }
};

export const after = () => {
  tick();
  const q = questDone();
  if (q) { toast(`✅ ${q.text}  +${coin(q.reward)}`, 3200); sfx.ok(); }
  if (S.house >= 3 && !S.won) {
    S.won = true;
    open(() => `<h2>🏡 Về quê trọn vẹn!</h2><p>Căn nhà đã sửa xong, ao có cá, vườn có rau, chuồng có gà vịt. Bạn đã bỏ phố về quê thành công.</p><button class="btn big" data-a="close">Tiếp tục làm ăn</button>`);
    sfx.ok();
  }
  hud(); save(); world?.refresh(); draw();
};

// ---------- Cá ----------
const pickFish = () => {
  const w = FISH.map((f, i) => f.weight * (1 + (S.rod - 1) * i * 0.35));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < FISH.length; i++) if ((r -= w[i]) <= 0) return FISH[i];
  return FISH[0];
};
const trapYield = (ms) => Math.min(14, Math.floor(2 * Math.sqrt(ms / MIN)));

const timeRows = (data) => TRAP_TIMES.map((x, k) => `<div class="row"><div class="tx">${x.label}<small>Khoảng ${trapYield(x.ms)} con</small></div><button class="btn" data-a="${data}" data-v="${k}" ${S.coins < BAIT ? 'disabled' : ''}>Thả lờ</button></div>`).join('');
const TIP = 'Mẹo ngư dân: lờ đặt ở nước nông ven bờ, chỗ có bóng râm và lau sậy, cá ra kiếm ăn đêm nên để lâu thì được nhiều.';
const placePanel = () => `<h2>🪤 Thả lờ ở đây</h2><p>Mồi tốn ${coin(BAIT)}. Lờ chạy cả khi bạn thoát game (tối đa 8 giờ). ${TIP}</p>${timeRows('place')}`;
const trapPanel = (i) => () => {
  const t = S.traps[i];
  if (!t) return '<h2>🪤 Lờ</h2>';
  const st = trapState(t);
  if (st === 'idle') return `<h2>🪤 Lờ ${i + 1} đang rảnh</h2><p>Mồi tốn ${coin(BAIT)}.</p>${timeRows('settrap').replace(/data-a="settrap" data-v="(\d)"/g, `data-a="settrap" data-v="${i}:$1"`)}<button class="btn gray big" data-a="pickup" data-v="${i}">Nhấc lờ lên (đặt lại chỗ khác)</button>`;
  const left = trapLeft(t), el = Date.now() - t.start, pct = Math.min(100, (el / t.ms) * 100), n = trapYield(Math.min(el, t.ms));
  return `<h2>🪤 Lờ ${i + 1}</h2><div class="bar"><i style="width:${pct}%"></i></div>
    <p>${left ? `Còn <b>${fmt(left)}</b> nữa là đầy. Hiện có khoảng ${n} con.` : `Lờ đã đầy: <b>${n} con</b>!`}</p>
    <button class="btn big ${left ? 'gold' : ''}" data-a="takeTrap" data-v="${i}" ${n < 1 ? 'disabled' : ''}>${left ? 'Nhấc lờ sớm' : 'Thu cá'}</button>`;
};

// ---------- Chuồng ----------
const cap = () => COOP_CAP[S.coop - 1];
const coopPanel = () => {
  const fed = S.fedUntil - Date.now(), c = cap();
  const eg = (id) => Math.floor(S.nest[id]);
  return `<h2>🐔 Chuồng gà vịt</h2>
  <p>${S.chickens} gà · ${S.ducks} vịt (tối đa ${c.chicken} gà, ${c.duck} vịt). ${fed > 0 ? `Đang no, còn <b data-t="${S.fedUntil}">${fmt(fed)}</b>.` : 'Đang đói — rải thóc thì mới đẻ trứng.'}</p>
  <div class="row"><div class="ic">🌾</div><div class="tx">Rải thóc<small>Có ${S.inv.grain} thóc · no ${GRAIN.feed / MIN} phút</small></div><button class="btn" data-a="feed">Rải</button></div>
  <div class="row"><div class="ic">🥚</div><div class="tx">Trong ổ: ${eg('trungga')} trứng gà, ${eg('trungvit')} trứng vịt<small>Ổ chứa tối đa ${nestCap()} mỗi loại</small></div><button class="btn gold" data-a="eggs" ${eg('trungga') + eg('trungvit') < 1 ? 'disabled' : ''}>Thu</button></div>
  <div class="row"><div class="ic">🐔</div><div class="tx">Mua gà<small>${coin(ANIMAL.chicken)}</small></div><button class="btn" data-a="buy" data-v="chicken" ${S.chickens >= c.chicken || S.coins < ANIMAL.chicken ? 'disabled' : ''}>Mua</button></div>
  <div class="row"><div class="ic">🦆</div><div class="tx">Mua vịt<small>${coin(ANIMAL.duck)}</small></div><button class="btn" data-a="buy" data-v="duck" ${S.ducks >= c.duck || S.coins < ANIMAL.duck ? 'disabled' : ''}>Mua</button></div>`;
};

// ---------- Luống rau ----------
const bedPanel = (i) => () => {
  if (i >= S.bedsN) return `<h2>🌱 Luống ${i + 1}</h2><p>Chưa mở. Mở thêm luống ở 🏠 Nhà.</p>`;
  const b = S.beds[i];
  if (!b) {
    return `<h2>🌱 Gieo hạt</h2><p>Nhớ tưới nước: khô thì cây lớn chậm.</p>` + CROPS.map((c) =>
      `<div class="row"><div class="ic">${c.icon}</div><div class="tx">${c.name}<small>Hạt ${coin(c.cost)} · lớn ~${Math.round(c.grow / MIN * 10) / 10} phút · bán ${coin(c.price)}/cây</small></div><button class="btn" data-a="plant" data-v="${i}:${c.id}" ${S.coins < c.cost ? 'disabled' : ''}>Gieo</button></div>`).join('');
  }
  const c = CROPS.find((x) => x.id === b.crop);
  if (bedReady(b)) return `<h2>${c.icon} ${c.name} đã chín!</h2><p>Thu được 4 cây.</p><button class="btn big gold" data-a="harvest" data-v="${i}">Thu hoạch</button>`;
  const wet = b.waterUntil > Date.now(), pct = (b.progress / c.grow) * 100;
  const left = (c.grow - b.progress) / (wet ? 1 : 0.25);
  return `<h2>${c.icon} ${c.name}</h2><div class="bar"><i style="width:${pct}%"></i></div>
  <p>${wet ? `💧 Đang đủ nước. Còn khoảng ${fmt(left)}.` : `🏜️ Đất khô, cây lớn chậm. Tưới để nhanh gấp 4 lần.`}</p>
  <button class="btn big" data-a="water" data-v="${i}">💧 Tưới nước</button>
  <p style="text-align:center"><button class="btn gray" data-a="pull" data-v="${i}">Nhổ bỏ</button></p>`;
};

// ---------- Chợ ----------
const trend = (id) => { const m = priceMul(id); return m > 1.05 ? '▲' : m < 0.95 ? '▼' : ''; };
const sellable = () => [
  ...FISH.map((f) => ({ b: 'fish', ...f })), ...CROPS.map((c) => ({ b: 'crop', ...c })), ...EGGS.map((e) => ({ b: 'egg', ...e })),
].filter((x) => S.inv[x.b][x.id] > 0);
const unit = (x) => Math.round(x.price * priceMul(x.id));
const market = () => {
  const items = sellable(), total = items.reduce((a, x) => a + unit(x) * S.inv[x.b][x.id], 0);
  return `<h2>🧺 Chợ quê</h2><p>Giá đổi theo ngày. ▲ cao hơn thường, ▼ thấp hơn.</p>` +
    (items.length ? items.map((x) => `<div class="row"><div class="ic">${x.icon}</div><div class="tx">${x.name} ×${S.inv[x.b][x.id]}<small>${coin(unit(x))}/con ${trend(x.id)}</small></div><button class="btn" data-a="sell" data-v="${x.b}:${x.id}">Bán hết</button></div>`).join('') +
      `<button class="btn big gold" data-a="sellall">Bán tất cả · ${coin(total)}</button>` : '<p>Chưa có gì để bán. Đi câu cá, thu rau, nhặt trứng nhé!</p>') +
    `<div class="row" style="margin-top:8px"><div class="ic">🌾</div><div class="tx">Mua thóc (có ${S.inv.grain})<small>${coin(GRAIN.cost)}/phần</small></div><button class="btn" data-a="grain" data-v="1" ${S.coins < GRAIN.cost ? 'disabled' : ''}>+1</button><button class="btn" data-a="grain" data-v="5" ${S.coins < GRAIN.cost * 5 ? 'disabled' : ''}>+5</button></div>`;
};

// ---------- Nhà / nâng cấp ----------
const upRow = (ic, name, desc, lv, max, cost, key) => {
  const full = lv >= max;
  return `<div class="row"><div class="ic">${ic}</div><div class="tx">${name} · cấp ${lv}/${max}<small>${desc}</small></div>
  <button class="btn ${full ? 'gray' : 'gold'}" data-a="up" data-v="${key}" ${full || S.coins < cost ? 'disabled' : ''}>${full ? 'Tối đa' : coin(cost)}</button></div>`;
};
const house = () => {
  const q = QUESTS[S.quest];
  return `<h2>🏠 Nhà quê</h2><p>${q ? `<b>Nhiệm vụ:</b> ${q.text} (thưởng ${coin(q.reward)})` : 'Bạn đã hoàn thành mọi nhiệm vụ!'}</p>` +
    upRow('🏠', 'Sửa nhà', 'Nhà đẹp hơn, mục tiêu cuối game', S.house, 3, UP.house[S.house] ?? 0, 'house') +
    upRow('🎣', 'Cần câu', 'Thanh kéo to hơn, dễ ra cá hiếm', S.rod, 3, UP.rod[S.rod] ?? 0, 'rod') +
    upRow('🪤', 'Thêm lờ', 'Thêm một chỗ đặt lờ bên ao', S.trapsN, 4, UP.trap[S.trapsN] ?? 0, 'trap') +
    upRow('🌱', 'Thêm luống rau', 'Thêm một luống trong vườn', S.bedsN, 6, UP.bed[S.bedsN] ?? 0, 'bed') +
    upRow('🐔', 'Mở rộng chuồng', 'Nuôi được nhiều gà vịt hơn', S.coop, 3, UP.coop[S.coop] ?? 0, 'coop') +
    `<p style="margin-top:12px"><button class="btn gray" data-a="music">${S.sound ? '🔊 Tắt' : '🔇 Bật'} âm thanh</button> <button class="btn red" data-a="reset">Chơi lại từ đầu</button></p>`;
};

// ---------- Câu cá ----------
const F = { on: false };
const fishCard = (html) => { const el = $('#fish'); el.hidden = false; el.innerHTML = `<div class="card">${html}</div>`; };
const fishEnd = () => { F.on = false; sync(); cancelAnimationFrame(F.raf); clearTimeout(F.t); world.bobber(false); $('#fish').hidden = true; };
const fishIdle = () => fishCard(`<h3>🎣 Cắm câu</h3><p>Quăng cần, đợi phao nhúng rồi chạm thật nhanh.</p><button class="btn big" data-a="cast">Quăng cần</button><p><button class="btn gray" data-a="fishend">Thôi</button></p>`);
const startFishing = () => { close(); F.on = true; sync(); fishIdle(); };
const cast = () => {
  sfx.splash(); world.bobber(true); fishCard(`<h3>Đợi cá cắn…</h3><p>🎣 Phao đang nổi, kiên nhẫn nhé.</p><button class="btn gray" data-a="fishend">Thu cần</button>`);
  F.t = setTimeout(() => {
    sfx.bite(); buzz(80); world.bobber(true, true);
    fishCard(`<h3>🐟 CÁ CẮN!</h3><button class="btn red big" style="font-size:24px;padding:22px" data-a="hook">KÉO!</button>`);
    F.t = setTimeout(() => { sfx.fail(); world.bobber(true); fishCard(`<h3>Cá chạy mất 😢</h3><button class="btn big" data-a="cast">Quăng lại</button><p><button class="btn gray" data-a="fishend">Xong</button></p>`); }, 1500);
  }, (2000 + Math.random() * 3500) / (1 + 0.12 * (S.rod - 1)));
};
const hook = () => {
  clearTimeout(F.t); buzz(40);
  const fish = pickFish(), H = 150, ch = 42 + 18 * (S.rod - 1);
  let cy = 0, cv = 0, fy = H / 2, ft = H / 2, tt = 0, prog = 30, hold = false, last = performance.now();
  fishCard(`<h3>Giữ nút để thanh xanh đuổi theo cá</h3>
    <div id="reel"><div id="track"><div id="catcher"></div><div id="fishy">${fish.icon}</div></div><div id="prog"><i></i></div><button id="hold">GIỮ</button></div>`);
  const hb = $('#hold'), cat = $('#catcher'), fi = $('#fishy'), pr = $('#prog i');
  const set = (v) => (e) => { hold = v; hb.classList.toggle('on', v); if (e.pointerId != null && v) hb.setPointerCapture?.(e.pointerId); };
  hb.addEventListener('pointerdown', set(true)); hb.addEventListener('pointerup', set(false));
  hb.addEventListener('pointercancel', set(false)); hb.addEventListener('pointerleave', set(false));
  cat.style.height = ch + 'px';
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cv += (hold ? 560 : -480) * dt; cv = Math.max(-300, Math.min(300, cv)); cy += cv * dt;
    if (cy < 0) { cy = 0; cv = 0; } if (cy > H - ch) { cy = H - ch; cv = 0; }
    tt -= dt; if (tt <= 0) { ft = 12 + Math.random() * (H - 24); tt = (0.5 + Math.random() * 0.9) / fish.speed; }
    fy += (ft - fy) * Math.min(1, dt * 3 * fish.speed);
    const inside = fy >= cy && fy <= cy + ch;
    prog += (inside ? 26 : -20 * (0.6 + fish.speed * 0.4)) * dt;
    cat.style.bottom = cy + 'px'; fi.style.bottom = fy - 11 + 'px'; pr.style.height = Math.max(0, Math.min(100, prog)) + '%';
    if (prog >= 100) return caught(fish);
    if (prog <= 0) { sfx.fail(); buzz(120); fishCard(`<h3>Cá thoát rồi 😢</h3><button class="btn big" data-a="cast">Quăng lại</button><p><button class="btn gray" data-a="fishend">Xong</button></p>`); return; }
    F.raf = requestAnimationFrame(loop);
  };
  F.raf = requestAnimationFrame(loop);
};
const caught = (fish) => {
  add('fish', fish.id); S.stats.fish++; sfx.ok(); buzz([30, 40, 30]);
  fishCard(`<div style="font-size:56px">${fish.icon}</div><h3>Được ${fish.name}!</h3><p>Bán được khoảng ${coin(Math.round(fish.price * priceMul(fish.id)))}</p><button class="btn big" data-a="cast">Quăng tiếp</button><p><button class="btn gray" data-a="fishend">Xong</button></p>`);
  world.bobber(false); after();
};

// ---------- Hành động ----------
const spend = (n) => (S.coins >= n ? ((S.coins -= n), true) : false);
const ACT = {
  close,
  cast, hook, fishend: fishEnd,
  settrap(v) { const [i, k] = v.split(':').map(Number); if (!spend(BAIT)) return; Object.assign(S.traps[i], { start: Date.now(), ms: TRAP_TIMES[k].ms }); S.stats.trapsSet++; sfx.splash(); toast('Đã thả lờ 🪤'); close(); },
  place(v) {
    if (!P || S.traps.length >= S.trapsN || !spend(BAIT)) return;
    S.traps.push({ x: P.x, z: P.z, start: Date.now(), ms: TRAP_TIMES[+v].ms }); S.stats.trapsSet++; P = null; placing = false; sfx.splash(); toast('Đã thả lờ 🪤'); close();
  },
  pickup(v) { S.traps.splice(+v, 1); sfx.pop(); toast('Đã nhấc lờ lên. Bấm 🪤 để đặt lại.'); close(); },
  unplace() { placing = false; P = null; sync(); },
  takeTrap(v) {
    const i = +v, t = S.traps[i], n = trapYield(Math.min(Date.now() - t.start, t.ms)), got = {};
    for (let k = 0; k < n; k++) { const f = pickFish(); add('fish', f.id); got[f.name] = (got[f.name] || 0) + 1; S.stats.fish++; }
    Object.assign(t, { start: 0, ms: 0 }); sfx.ok(); toast(`Thu ${n} con: ` + Object.entries(got).map(([a, b]) => `${a} ×${b}`).join(', '), 3500); close();
  },
  feed() {
    if (S.inv.grain < 1) { toast('Hết thóc — mua ở chợ 🧺'); return; }
    tick(); S.inv.grain--; S.fedUntil = Math.max(S.fedUntil, Date.now()) + GRAIN.feed; S.stats.fed++; sfx.cluck(); toast('Gà vịt đang ăn 🌾');
  },
  eggs() {
    let n = 0;
    for (const e of EGGS) { const k = Math.floor(S.nest[e.id]); S.nest[e.id] -= k; add('egg', e.id, k); n += k; }
    sfx.pop(); toast(`Nhặt ${n} quả trứng 🥚`);
  },
  buy(v) { if (!spend(ANIMAL[v])) return; v === 'chicken' ? S.chickens++ : S.ducks++; sfx.cluck(); sfx.coin(); },
  plant(v) { const [i, id] = v.split(':'), c = CROPS.find((x) => x.id === id); if (!spend(c.cost)) return; S.beds[+i] = { crop: id, progress: 0, last: Date.now(), waterUntil: 0 }; S.stats.planted++; sfx.pop(); close(); },
  water(v) { const b = S.beds[+v], c = CROPS.find((x) => x.id === b.crop), now = Date.now(); b.waterUntil = Math.min(now + 0.9 * c.grow, Math.max(now, b.waterUntil) + 0.6 * c.grow); sfx.splash(); toast('Đã tưới 💧'); },
  pull(v) { S.beds[+v] = null; close(); },
  harvest(v) { const b = S.beds[+v]; add('crop', b.crop, 4); S.stats.harvested += 4; S.beds[+v] = null; sfx.pop(); toast(`Thu 4 ${CROPS.find((c) => c.id === b.crop).name}`); close(); },
  sell(v) { const [b, id] = v.split(':'), x = sellable().find((y) => y.b === b && y.id === id), n = S.inv[b][id]; S.coins += unit(x) * n; S.inv[b][id] = 0; S.stats.sold += n; sfx.coin(); },
  sellall() { for (const x of sellable()) { const n = S.inv[x.b][x.id]; S.coins += unit(x) * n; S.inv[x.b][x.id] = 0; S.stats.sold += n; } sfx.coin(); },
  grain(v) { const n = +v; if (!spend(GRAIN.cost * n)) return; S.inv.grain += n; sfx.coin(); },
  up(key) {
    const map = { house: ['house', UP.house, 3], rod: ['rod', UP.rod, 3], trap: ['trapsN', UP.trap, 4], bed: ['bedsN', UP.bed, 6], coop: ['coop', UP.coop, 3] };
    const [f, costs, max] = map[key];
    if (S[f] >= max || !spend(costs[S[f]])) return;
    S[f]++; sfx.ok(); toast('Nâng cấp thành công! ✨');
  },
  music() { S.sound = !S.sound; $('#snd').firstChild.textContent = S.sound ? '🔊' : '🔇'; },
  reset() { if (confirm('Xoá hết tiến trình và chơi lại?')) reset(); },
};

export const isBusy = () => F.on;
export const isPlacing = () => placing;
export const startPlace = () => {
  if (F.on) return;
  if (S.traps.length >= S.trapsN) return toast(`Đã đặt đủ ${S.trapsN} lờ. Nâng cấp thêm ở 🏠 Nhà.`, 3200);
  close(); placing = true; sync();
};
export const placeAt = (x, z) => {
  if (S.traps.length >= S.trapsN) return;
  if (!world.shallow(x, z)) return toast('Đặt lờ ở chỗ nước nông, gần bờ nhé 🌾');
  if (S.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 1.1)) return toast('Chỗ này đã có lờ rồi');
  if (world.dist(x, z) > 8) return toast('Đi lại gần ao hơn rồi hẵng thả lờ 🚶');
  P = { x, z }; sfx.tap(); open(placePanel);
};
export const interact = (kind, idx) => {
  if (F.on) return;
  unlock(); sfx.tap();
  if (kind === 'pond') return world.near('pond') ? startFishing() : world.approach('pond', 0);
  if (kind === 'trap') return open(trapPanel(idx));
  if (kind === 'coop') return open(coopPanel);
  if (kind === 'bed') return open(bedPanel(idx));
  if (kind === 'stall') return open(market);
  if (kind === 'house') return open(house);
};

export const init = (w) => {
  world = w;
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { unlock(); sfx.tap(); if (F.on && o.dataset.open !== 'fish') return; if (o.dataset.open === 'fish') return F.on ? undefined : interact('pond', 0); if (o.dataset.open === 'trap') return startPlace(); return open({ market, house }[o.dataset.open]); }
    const a = e.target.closest('[data-a]');
    if (a && !a.disabled) { unlock(); sfx.tap(); ACT[a.dataset.a]?.(a.dataset.v); if (!['close', 'fishend', 'cast', 'hook', 'unplace'].includes(a.dataset.a)) after(); return; }
    if (e.target.id === 'back') close();
    const go = e.target.closest('[data-go]');
    if (go) { unlock(); sfx.tap(); const [k, i] = go.dataset.go.split(':'); return world.approach(k, +i); }
    const ab = e.target.closest('#act');
    if (ab) { unlock(); return interact(ab.dataset.kind, +ab.dataset.idx); }
    if (e.target.closest('#snd')) { unlock(); ACT.music(); save(); }
  });
  $('#sheet').addEventListener('pointerdown', () => (pressed = true));
  addEventListener('pointerup', () => setTimeout(() => (pressed = false), 60));
  setInterval(() => { if (cur && !pressed) { tick(); draw(); } }, 1000);
  setInterval(() => { tick(); world.refresh(); hud(); save(); }, 5000);
  $('#snd').firstChild.textContent = S.sound ? '🔊' : '🔇';
  hud();
};
