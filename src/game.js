import { S, save, tick, add, bedReady, trapState, questDone, reset } from './state.js';
import { FISH, CROPS, GRAIN, BAIT, TRAP_TIMES, UP, ANIMAL, QUESTS, PHASES, SP, RES, BUILD, LU_CAP, TRAP_MOD, TOOLS, OBJ, TIER_NAME, TIME_MUL, YIELD_MUL, isHighTide } from './data.js';
import { phaseAt, dayAt, capOf, addAnimal } from './sim.js';
import { founder, mulberry32 } from './genes.js';
import { sfx, buzz, unlock } from './sfx.js';
import {
  fmt, coin, sellable, unit, trapYield, placePanel, trapPanel,
  coopPanel, herdPanel, animalCard, dexPanel, animalPrice,
  bedPanel, market, house, buildPanel, craftPanel,
  traderPanel, boatPanel, mekongPanels, canBuild
} from './panels.js';

const $ = (s) => document.querySelector(s);
let world, cur = null, pressed = false, placing = false, P = null;
const sync = () => { document.body.classList.toggle('busy', !!cur || F.on); $('#hint').hidden = !placing; world?.zone(placing); };

export const toast = (msg, ms = 2400) => {
  document.querySelector('#toast')?.remove();
  const t = document.createElement('div'); t.id = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), ms);
};

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
  const chips = [], rb = S.beds.map((b, i) => (i < S.bedsN && bedReady(b) ? i : -1)).filter((i) => i >= 0);
  if (rb.length) chips.push(`<button data-go="bed:${rb[0]}">${CROPS.find((c) => c.id === S.beds[rb[0]].crop).icon} ${rb.length} chín</button>`);
  const eg = S.eggs.filter((e) => !e.fertile).length; if (eg >= 1) chips.push(`<button data-go="coop:0">🥚 ${eg}</button>`);
  const sick = S.animals.filter((a) => a.sickUntil).length; if (sick) chips.push(`<button data-a="herd">🤒 ${sick} ốm</button>`);
  const tr = S.traps.map((t, i) => (trapState(t) === 'ready' ? i : -1)).filter((i) => i >= 0);
  if (tr.length) chips.push(`<button data-go="trap:${tr[0]}">🪤 ${tr.length} đầy</button>`);
  if (S.fedUntil < Date.now() && S.animals.length && !chips.length) chips.push('<button data-go="coop:0">🌾 Gà vịt đói</button>');
  $('#chips').innerHTML = chips.join('');
  $('#bar [data-open=trap] i').textContent = tr.length || '';
};

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
    open(() => `<h2>🏡 Về quê trọn vẹn!</h2><p>Căn nhà đã sửa xong, sông có cá, vườn có rau, chuồng có gà vịt.</p><button class="btn big" data-a="close">Tiếp tục làm ăn</button>`);
    sfx.ok();
  }
  hud(); save(); world?.refresh(); draw();
};

const pickFish = (deep = false) => {
  const ph = phaseAt(S.world.step), far = world?.onBridge?.() || deep;
  const w = FISH.map((f, i) => (f.season !== undefined ? (ph === f.season ? 40 : 0) : f.weight * (1 + (S.rod - 1) * i * 0.35) * (far ? 1 + 0.35 * i : 1)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < FISH.length; i++) if ((r -= w[i]) <= 0) return FISH[i];
  return FISH[0];
};

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
    const i = +v, t = S.traps[i], mod = (S.world.weather === 'chuong' ? TRAP_MOD.chuong : 1) * (phaseAt(S.world.step) === 0 ? TRAP_MOD.kho : 1), n = Math.max(1, Math.round(trapYield(Math.min(Date.now() - t.start, t.ms)) * mod)), got = {};
    for (let k = 0; k < n; k++) { const f = pickFish(); add('fish', f.id); got[f.name] = (got[f.name] || 0) + 1; S.stats.fish++; }
    Object.assign(t, { start: 0, ms: 0 }); sfx.ok(); toast(`Thu ${n} con: ` + Object.entries(got).map(([a, b]) => `${a} ×${b}`).join(', '), 3500); close();
  },
  feedfood() {
    const crop = Object.keys(S.inv.crop).find((k) => S.inv.crop[k] > 0);
    if (S.res.oc > 0) S.res.oc--; else if (crop) S.inv.crop[crop]--; else { toast('Chưa có ốc hay rau để cho ăn'); return; }
    tick(); S.fedUntil = Math.max(S.fedUntil, Date.now()) + GRAIN.feed * 0.7; S.stats.fed++; sfx.cluck(); toast('Gà vịt đang ăn 🐌');
  },
  feed() {
    if (S.inv.grain < 1) { toast('Hết thóc — mua ở chợ 🧺'); return; }
    tick(); S.inv.grain--; S.fedUntil = Math.max(S.fedUntil, Date.now()) + GRAIN.feed; S.stats.fed++; sfx.cluck(); toast('Gà vịt đang ăn 🌾');
  },
  eggs() {
    let n = 0; S.eggs = S.eggs.filter((e) => { if (e.fertile) return true; add('egg', SP[e.sp].egg, 1); n++; return false; });
    sfx.pop(); toast(`Nhặt ${n} quả trứng 🥚`);
  },
  eggsall() { let n = 0; for (const e of S.eggs) { add('egg', SP[e.sp].egg, 1); n++; } S.eggs = []; sfx.pop(); toast(`Thu ${n} quả trứng 🥚`); },
  buy(v) {
    if (cnt(v) >= capOf(S, v) || !spend(ANIMAL[v])) return;
    const rng = mulberry32((Date.now() ^ (S.nextId * 2654435761)) >>> 0), m = S.animals.filter((a) => a.sp === v && a.sex === 'm').length, f = cnt(v) - m;
    addAnimal(S, v, m * 2 <= f ? 'm' : 'f', founder(rng), dayAt(S.world.step) - 3 - Math.floor(rng() * 4), true); sfx.cluck(); sfx.coin();
  },
  view(v) { open(animalCard(S, +v)); },
  herd() { open(herdPanel(S)); },
  dex() { open(dexPanel(S)); },
  coopback() { open(coopPanel(S)); },
  openbuild() { open(buildPanel(S)); },
  opencraft() { open(craftPanel(S)); },
  craft(k) {
    const t = TOOLS[k], tier = S.tools[k] || 0, nx = t.tiers[tier + 1];
    if (!S.builds.ban || !nx || S.coins < nx.coins || !Object.entries(nx.cost).every(([r, n]) => (S.res[r] || 0) >= n)) return;
    S.coins -= nx.coins; for (const [r, n] of Object.entries(nx.cost)) S.res[r] -= n;
    S.tools[k] = tier + 1; S.stats.crafted++; sfx.ok(); buzz([20, 30]); toast(`${t.icon} ${t.name} ${TIER_NAME[tier + 1]}!`);
  },
  sellanimal(v) { const a = S.animals.find((x) => x.id === +v); if (!a) return; const p = animalPrice(S, a); S.coins += p; S.animals.splice(S.animals.indexOf(a), 1); sfx.coin(); toast(`Đã bán, được ${coin(p)}`); open(herdPanel(S)); },
  build(v) {
    const [key, idx] = v.split(':'), b = BUILD[key];
    if (!canBuild(S, b)) return;
    if (key === 'lu' && (S.builds.lu || 0) >= 2) return;
    S.coins -= b.coins; for (const [k, n] of Object.entries(b.cost)) S.res[k] -= n;
    if (key === 'lu') S.builds.lu = (S.builds.lu || 0) + 1; else if (key === 'nen') S.builds.nen[+idx] = true; else S.builds[key] = true;
    S.stats.built++; sfx.ok(); toast(`Đã xây ${b.icon} ${b.name}!`);
  },
  fert(v) { const b = S.beds[+v]; if (!b || b.fert || !S.res.phanu) return; S.res.phanu--; b.fert = true; sfx.pop(); toast('Đã bón phân ủ 🪱'); },
  plant(v) { const [i, id] = v.split(':'), c = CROPS.find((x) => x.id === id); if (isFlooded(S, +i) || !spend(c.cost)) return; S.beds[+i] = { crop: id, progress: 0, last: Date.now(), waterUntil: 0, fert: false, flood: 0 }; S.stats.planted++; sfx.pop(); close(); },
  water(v) {
    const b = S.beds[+v], c = CROPS.find((x) => x.id === b.crop), now = Date.now(); let k = 0.6;
    if (phaseAt(S.world.step) === 0) { if (S.lu >= 1) S.lu--; else { k = 0.3; toast('Mùa khô, nước cạn: tưới được ít. Xây lu nước mưa để trữ nước.'); } }
    b.waterUntil = Math.min(now + 0.9 * c.grow, Math.max(now, b.waterUntil) + k * c.grow); sfx.splash(); if (k === 0.6) toast('Đã tưới 💧');
  },
  pull(v) { S.beds[+v] = null; close(); },
  harvest(v) { const b = S.beds[+v]; add('crop', b.crop, 4); S.stats.harvested += 4; S.beds[+v] = null; sfx.pop(); toast(`Thu 4 ${CROPS.find((c) => c.id === b.crop).name}`); close(); },
  sell(v) { const [b, id] = v.split(':'), x = sellable(S).find((y) => y.b === b && y.id === id), n = (b === 'res' ? S.res : S.inv[b])[id]; S.coins += unit(x) * n; (b === 'res' ? S.res : S.inv[b])[id] = 0; S.stats.sold += n; sfx.coin(); },
  sellall() { for (const x of sellable(S)) { const n = (x.b === 'res' ? S.res : S.inv[x.b])[x.id]; S.coins += unit(x) * n; (x.b === 'res' ? S.res : S.inv[x.b])[x.id] = 0; S.stats.sold += n; } sfx.coin(); },
  grain(v) { const n = +v; if (!spend(GRAIN.cost * n)) return; S.inv.grain += n; sfx.coin(); },
  up(key) {
    const map = { house: ['house', UP.house, 3], rod: ['rod', UP.rod, 3], trap: ['trapsN', UP.trap, 4], bed: ['bedsN', UP.bed, 6], coop: ['coop', UP.coop, 3] };
    const [f, costs, max] = map[key];
    if (S[f] >= max || !spend(costs[S[f]])) return;
    S[f]++; sfx.ok(); toast('Nâng cấp thành công! ✨');
  },
  boatcross() { world.crossRiver?.(); sfx.splash(); toast(world.px() > 8 ? 'Đã chèo xuồng sang bờ ruộng Đông 🌾' : 'Đã chèo xuồng về bến Tây 🛶'); close(); },
  boatfish() {
    if (!spend(BAIT)) return toast('Cần mồi cá để thả lờ sâu');
    const f = pickFish(true); add('fish', f.id); S.stats.fish++; sfx.splash(); toast(`Thăm lờ sâu được ${f.icon} ${f.name}!`); close();
  },
  tradersell(v) {
    const [b, id] = v.split(':'), x = sellable(S).find((y) => y.b === b && y.id === id), n = (b === 'res' ? S.res : S.inv[b])[id];
    const u = unit(x, 1.25); S.coins += u * n; (b === 'res' ? S.res : S.inv[b])[id] = 0; S.stats.sold += n; sfx.coin(); toast(`Bán cho thương lái: +${coin(u * n)}`); open(traderPanel(S));
  },
  tradersellall() {
    for (const x of sellable(S)) { const n = (x.b === 'res' ? S.res : S.inv[x.b])[x.id], u = unit(x, 1.25); S.coins += u * n; (x.b === 'res' ? S.res : S.inv[x.b])[x.id] = 0; S.stats.sold += n; }
    sfx.coin(); toast('Đã bán hết hàng cho thương lái chợ nổi!'); open(traderPanel(S));
  },
  traderbuy(v) {
    if (v === 'bau') { if (!spend(12)) return toast('Không đủ tiền mua giống bầu'); S.inv.crop.bau = (S.inv.crop.bau || 0) + 2; sfx.coin(); toast('Mua thành công 2 quả Bầu hồ lô giống 🥒'); }
  },
  altarpray() {
    const day = dayAt(S.world.step);
    if (S.blessedDay === day) return toast('Hôm nay đã thắp nhang Bàn Thiên rồi 🙏');
    S.blessedDay = day; sfx.ok(); toast('Thắp nhang Bàn Thiên: Cầu mưa thuận gió hòa, gia đạo an yên 🙏'); close();
  },
  hammockrest() {
    sfx.pop();
    for (const a of S.animals) if (a.sickUntil) a.sickUntil = Math.min(a.sickUntil, Date.now() + 20e3);
    toast('Nằm võng đung đưa, gió mát miệt vườn, gà vịt mau lành bệnh 🌴'); close();
  },
  arborharvest() {
    const day = dayAt(S.world.step);
    if (S.arborDay === day) return toast('Bầu đang đơm hoa kết trái, mai hẵng hái tiếp nhé 🌱');
    S.arborDay = day; S.inv.crop.bau = (S.inv.crop.bau || 0) + 2; S.stats.harvested += 2; sfx.pop();
    toast('Hái 2 quả bầu hồ lô non ngọt nước nấu canh tép đồng 🥒'); close();
  },
  hutrest() { sfx.pop(); toast('Nghỉ chân bên chòi lá ngắm đồng lúa chín bao la 🛖'); close(); },
  buffaloplow() {
    S.plowed = true; sfx.ok(); toast('Trâu đã cày ải đất tơi xốp, vụ lúa tới năng suất tăng gấp đôi! 🐃'); close();
  },
  music() { S.sound = !S.sound; $('#snd').firstChild.textContent = S.sound ? '🔊' : '🔇'; },
  reset() { if (confirm('Xoá hết tiến trình và chơi lại?')) reset(); },
};

export const isBusy = () => F.on;
export const isPlacing = () => placing;
const startPlace = () => {
  if (F.on) return;
  if (S.traps.length >= S.trapsN) return toast(`Đã đặt đủ ${S.trapsN} lờ. Nâng cấp thêm ở 🏠 Nhà.`, 3200);
  close(); placing = true; sync();
};
export const placeAt = (x, z) => {
  if (S.traps.length >= S.trapsN) return;
  if (!world.shallow(x, z)) return toast('Đặt lờ ở chỗ nước nông, gần bờ nhé 🌾');
  if (S.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 1.1)) return toast('Chỗ này đã có lờ rồi');
  if (world.dist(x, z) > 8) return toast('Đi lại gần sông hơn rồi hẵng thả lờ 🚶');
  P = { x, z }; sfx.tap(); open(placePanel(S));
};
export const interact = (kind, idx) => {
  if (F.on) return;
  unlock(); sfx.tap();
  if (kind === 'river') return world.near('river') ? startFishing() : world.approach('river', 0);
  if (kind === 'animal') return open(animalCard(S, idx));
  if (kind === 'bench') return open(craftPanel(S));
  if (kind === 'obj') return harvest(idx);
  if (kind === 'trap') return open(trapPanel(S, idx));
  if (kind === 'coop') return open(coopPanel(S));
  if (kind === 'bed') return open(bedPanel(S, idx));
  if (kind === 'stall') return open(market(S));
  if (kind === 'house') return open(house(S));
  if (kind === 'boat') return open(boatPanel());
  if (kind === 'trader') return isHighTide(S.world.step) ? open(traderPanel(S)) : toast('Ghe chợ nổi đang xuôi dòng, chờ giờ Nước Lớn ghe cập bến nhé! 🍉');
  if (kind === 'altar') return open(mekongPanels.altar());
  if (kind === 'hammock') return open(mekongPanels.hammock());
  if (kind === 'arbor') { const day = dayAt(S.world.step); return open(mekongPanels.arbor(S.arborDay !== day)); }
  if (kind === 'hut') return open(mekongPanels.hut());
  if (kind === 'buffalo') return open(mekongPanels.buffalo());
};

let H = null;
export const isHarvesting = () => !!H;
const cancelH = () => { if (H) { cancelAnimationFrame(H.raf); H = null; } $('#hbar').hidden = true; };
const harvest = (id) => {
  const o = world.obj(id), d = OBJ[o.kind], day = dayAt(S.world.step);
  if (!world.objAvail(id)) return toast('Chỗ này đã khai thác, chờ mọc lại 🌱', 1800);
  const tier = d.tool ? S.tools[d.tool] || 0 : 0;
  if (d.tool && !tier) return toast(`Cần ${TOOLS[d.tool].icon} ${TOOLS[d.tool].name} để ${d.verb.toLowerCase()}. Chế ở bàn thợ 🔨`, 3200);
  cancelH(); unlock(); sfx.tap();
  const dur = d.time * (d.tool ? TIME_MUL[tier] : 1) * 1000, x0 = world.px(), z0 = world.pz(), t0 = performance.now(), bar = $('#hbar');
  bar.hidden = false; bar.firstElementChild.textContent = `${d.icon} ${d.verb}…`; const fill = bar.querySelector('i'); fill.style.width = '0%';
  world.face(o.x, o.z); H = { id };
  const loop = (now) => {
    const k = Math.min(1, (now - t0) / dur); fill.style.width = k * 100 + '%';
    if (world.dist(x0, z0) > 0.5 || F.on || cur) return cancelH();
    if (k >= 1) {
      const got = [];
      for (const [r, [lo, hi]] of Object.entries(d.yield)) {
        let n = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (d.tool ? YIELD_MUL[tier] : 1));
        if (o.kind === 'thua' && S.plowed && r === 'thoc') { n *= 2; S.plowed = false; toast('Trâu cày ải kỹ, vụ mùa trúng đậm thóc vàng! 🌾', 3000); }
        const add = Math.min(n, 60 - (S.res[r] || 0));
        if (r === 'thoc') { S.inv.grain += n; got.push(`+${n}🌾 thóc`); continue; }
        if (add > 0) { S.res[r] = (S.res[r] || 0) + add; got.push(`+${add}${RES[r].icon}`); }
      }
      S.obj[id] = day + d.regrow; S.stats.picked++; if (o.kind === 'tree') S.stats.chopped++;
      cancelH(); sfx.pop(); buzz(20); toast(got.length ? got.join('  ') : `Túi đã đầy`, 1400); return after();
    }
    H.raf = requestAnimationFrame(loop);
  };
  H.raf = requestAnimationFrame(loop);
};

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
  fishCard(`<div style="font-size:56px">${fish.icon}</div><h3>Được ${fish.name}!</h3><p>Bán được khoảng ${coin(Math.round(fish.price * (1)))}</p><button class="btn big" data-a="cast">Quăng tiếp</button><p><button class="btn gray" data-a="fishend">Xong</button></p>`);
  world.bobber(false); after();
};

const drain = () => {
  const q = S.ev.splice(0).slice(-3);
  q.forEach((m, i) => setTimeout(() => toast(m, 2800), i * 3000));
};
let lastHud = 0;
export const pulse = () => { tick(); drain(); if (Date.now() - lastHud > 4000) { lastHud = Date.now(); hud(); } };
export const init = (w) => {
  world = w;
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { unlock(); sfx.tap(); if (F.on && o.dataset.open !== 'fish') return; if (o.dataset.open === 'fish') return F.on ? undefined : interact('river', 0); if (o.dataset.open === 'trap') return startPlace(); return open({ market: market(S), house: house(S) }[o.dataset.open]); }
    const a = e.target.closest('[data-a]');
    if (a && !a.disabled) { unlock(); sfx.tap(); ACT[a.dataset.a]?.(a.dataset.v); if (!['close', 'fishend', 'cast', 'hook', 'unplace', 'view', 'herd', 'dex', 'coopback', 'openbuild', 'opencraft'].includes(a.dataset.a)) after(); return; }
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
