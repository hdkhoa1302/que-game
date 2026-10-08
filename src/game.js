import { S, save, tick, add, stageOf, bedReady, trapLeft, trapState, nestCap, questDone, reset } from './state.js';
import { FISH, CROPS, EGGS, GRAIN, BAIT, TRAP_TIMES, UP, COOP_CAP, ANIMAL, QUESTS, priceMul, MIN, PHASES, WEATHER, SP, RES, RES_CAP, BUILD, LU_CAP, TRAP_MOD, TOOLS, OBJ, TIER_NAME, TIME_MUL, YIELD_MUL } from './data.js';
import { phaseAt, dayAt, lifeStage, ofSp, capOf, hatchLimit, addAnimal, dexAll, isFlooded, levelAt, stepF } from './sim.js';
import { founder, mulberry32, avg, colorOf, sizeGroup } from './genes.js';
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
  const eg = S.eggs.filter((e) => !e.fertile).length; if (eg >= 1) chips.push(`<button data-go="coop:0">🥚 ${eg}</button>`);
  const sick = S.animals.filter((a) => a.sickUntil).length; if (sick) chips.push(`<button data-a="herd">🤒 ${sick} ốm</button>`);
  const fl = S.beds.some((b, i) => b && isFlooded(S, i)); if (fl) chips.push('<button data-go="bed:3">🌊 Ngập vườn</button>');
  const tr = S.traps.map((t, i) => (trapState(t) === 'ready' ? i : -1)).filter((i) => i >= 0);
  if (tr.length) chips.push(`<button data-go="trap:${tr[0]}">🪤 ${tr.length} đầy</button>`);
  if (S.fedUntil < Date.now() && S.animals.length && !chips.length) chips.push('<button data-go="coop:0">🌾 Gà vịt đói</button>');
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
  const ph = phaseAt(S.world.step), far = world.onBridge?.();
  const w = FISH.map((f, i) => (f.season !== undefined ? (ph === f.season ? 40 : 0) : f.weight * (1 + (S.rod - 1) * i * 0.35) * (far ? 1 + 0.25 * i : 1)));
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
const cnt = (sp) => S.animals.filter((a) => a.sp === sp).length;
const STAGE = { young: 'Con non', adult: 'Trưởng thành', old: 'Già' };
const swatch = (a) => `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;vertical-align:-1px;background:#${SP[a.sp].hex[colorOf(a.genome)].toString(16).padStart(6, '0')};border:2px solid #0002"></span>`;
const price = (a) => Math.round(ANIMAL[a.sp] * 0.6 * (1 + avg(a.genome, 'size') / 18) * (lifeStage(a, dayAt(S.world.step)) === 'young' ? 0.5 : 1));
const coopPanel = () => {
  const fed = S.fedUntil - Date.now(), c = COOP_CAP[S.coop - 1];
  const eg = (f) => S.eggs.filter((e) => e.fertile === f).length;
  return `<h2>🐔 Chuồng gà vịt</h2>
  <p>${cnt('chicken')} gà · ${cnt('duck')} vịt (chuồng chứa ${c.chicken} gà, ${c.duck} vịt; con non được vượt tới ${hatchLimit(S, 'chicken')}/${hatchLimit(S, 'duck')}). ${fed > 0 ? `Đang no, còn <b>${fmt(fed)}</b>.` : 'Đang đói: cho ăn thì mới đẻ trứng.'}</p>
  <div class="row"><div class="ic">🌾</div><div class="tx">Rải thóc<small>Có ${S.inv.grain} thóc · no ${GRAIN.feed / MIN} phút</small></div><button class="btn" data-a="feed">Rải</button></div>
  <div class="row"><div class="ic">🐌</div><div class="tx">Cho ăn ốc / rau<small>Có ${S.res.oc || 0} ốc, ${Object.values(S.inv.crop).reduce((a, b) => a + b, 0)} rau · no ${Math.round(GRAIN.feed * 0.7 / MIN * 10) / 10} phút</small></div><button class="btn" data-a="feedfood">Cho ăn</button></div>
  <div class="row"><div class="ic">🥚</div><div class="tx">Trong ổ: ${eg(false)} trứng thường, ${eg(true)} trứng có phôi<small>${S.builds.oap ? 'Có ổ ấp: trứng có phôi nở sau ~1 ngày.' : 'Chưa có ổ ấp rơm: chỉ 60% trứng có phôi nở.'} Ổ chứa tối đa ${nestCap()} mỗi loại.</small></div><button class="btn gold" data-a="eggs" ${eg(false) < 1 ? 'disabled' : ''}>Thu</button></div>
  ${eg(true) ? `<div class="row"><div class="ic">🍳</div><div class="tx">Bán cả trứng có phôi<small>Mất cơ hội nở con</small></div><button class="btn gray" data-a="eggsall">Thu hết</button></div>` : ''}
  <div class="row"><div class="ic">📋</div><div class="tx">Xem đàn và gen<small>Chọn con tốt để giữ, bán con yếu</small></div><button class="btn" data-a="herd">Xem</button></div>
  <div class="row"><div class="ic">📖</div><div class="tx">Sổ giống<small>${Object.keys(S.dex).length}/${dexAll().length} kiểu đã gặp</small></div><button class="btn" data-a="dex">Mở</button></div>
  <div class="row"><div class="ic">🐔</div><div class="tx">Mua gà<small>${coin(ANIMAL.chicken)}</small></div><button class="btn" data-a="buy" data-v="chicken" ${cnt('chicken') >= c.chicken || S.coins < ANIMAL.chicken ? 'disabled' : ''}>Mua</button></div>
  <div class="row"><div class="ic">🦆</div><div class="tx">Mua vịt<small>${coin(ANIMAL.duck)}</small></div><button class="btn" data-a="buy" data-v="duck" ${cnt('duck') >= c.duck || S.coins < ANIMAL.duck ? 'disabled' : ''}>Mua</button></div>`;
};
const herdPanel = () => {
  const day = dayAt(S.world.step), L = [...S.animals].sort((a, b) => a.sp.localeCompare(b.sp) || a.born - b.born);
  return `<h2>📋 Đàn gà vịt (${L.length})</h2><p>Con có <b>đề kháng</b> cao sống sót tốt mùa mưa, vịt <b>chịu nước</b> cao hợp mùa nước nổi. Giữ con tốt, bán con yếu.</p>` + (L.map((a) => {
    const st = lifeStage(a, day);
    return `<div class="row"><div class="ic">${SP[a.sp].icon}</div><div class="tx">${swatch(a)} ${SP[a.sp].colors[colorOf(a.genome)]} ${a.sex === 'm' ? '♂' : '♀'} · ${STAGE[st]}${a.sickUntil ? ' 🤒' : ''}<small>Cỡ ${avg(a.genome, 'size').toFixed(1)} · Trứng ${avg(a.genome, 'eggs').toFixed(1)} · Kháng ${avg(a.genome, 'resist').toFixed(1)} · Nước ${avg(a.genome, 'water').toFixed(1)}</small></div><button class="btn" data-a="view" data-v="${a.id}">Xem</button></div>`;
  }).join('') || '<p>Chuồng đang trống. Mua gà vịt ở menu chuồng.</p>') + `<button class="btn gray big" data-a="coopback" style="margin-top:8px">Về chuồng</button>`;
};
const GENE_ROWS = [['size', 'Cỡ thể'], ['eggs', 'Đẻ trứng'], ['resist', 'Đề kháng'], ['water', 'Chịu nước']];
const animalCard = (id) => () => {
  const a = S.animals.find((x) => x.id === id);
  if (!a) return '<h2>Con này không còn trong đàn</h2><button class="btn gray big" data-a="herd">Về đàn</button>';
  const day = dayAt(S.world.step), age = day - a.born, st = lifeStage(a, day);
  return `<h2>${SP[a.sp].icon} ${SP[a.sp].name} ${SP[a.sp].colors[colorOf(a.genome)].toLowerCase()} ${a.sex === 'm' ? '♂ (trống)' : '♀ (mái)'}</h2>
  <p>${swatch(a)} ${STAGE[st]} · ${age} ngày tuổi (sống tối đa 18 ngày)${a.sickUntil ? ' · <b>đang ốm 🤒</b>' : ''} · cỡ nhóm ${sizeGroup(a.genome)}</p>
  ${GENE_ROWS.map(([k, n]) => `<div class="gene"><span>${n}</span><div class="bar"><i style="width:${(avg(a.genome, k) / 9) * 100}%"></i></div><b>${avg(a.genome, k).toFixed(1)}</b></div>`).join('')}
  <p style="margin-top:10px">Gen ghép từ bố mẹ, mỗi lần sinh có khoảng 2% đột biến nhẹ.</p>
  <button class="btn red big" data-a="sellanimal" data-v="${a.id}">Bán · ${coin(price(a))}</button>
  <p><button class="btn gray big" data-a="herd">Về đàn</button></p>`;
};
const dexPanel = () => {
  const all = dexAll(), got = all.filter((k) => S.dex[k]).length;
  return `<h2>📖 Sổ giống (${got}/${all.length})</h2><p>Mỗi kiểu (loài, màu, cỡ) gặp lần đầu thưởng 🪙15. Lai và chọn lọc để gặp đủ.</p>` + Object.keys(SP).map((sp) =>
    `<div class="row"><div class="ic">${SP[sp].icon}</div><div class="tx">${SP[sp].name}<small>` + [0, 1, 2, 3].map((c) => `${SP[sp].colors[c]}: ` + ['S', 'M', 'L'].map((z) => (S.dex[`${sp}:${c}:${z}`] ? `✅${z}` : `▫️${z}`)).join(' ')).join(' · ') + '</small></div></div>').join('') +
    '<button class="btn gray big" data-a="coopback" style="margin-top:8px">Về chuồng</button>';
};

// ---------- Luống rau ----------
const bedPanel = (i) => () => {
  if (i >= S.bedsN) return `<h2>🌱 Luống ${i + 1}</h2><p>Chưa mở. Mở thêm luống ở 🏠 Nhà.</p>`;
  const b = S.beds[i], flooded = isFlooded(S, i);
  if (flooded) return `<h2>🌊 Luống ${i + 1} đang ngập</h2><p>Nước nổi dâng lên vườn thấp. Cây ngập quá 3 phút sẽ hỏng. Đắp <b>nền cao</b> (🏠 Nhà → Xây dựng) để canh tác quanh năm.</p><button class="btn big gold" data-a="openbuild">Mở Xây dựng</button>`;
  if (!b) {
    return `<h2>🌱 Gieo hạt</h2><p>Nhớ tưới nước: khô thì cây lớn chậm.</p>` + CROPS.map((c) =>
      `<div class="row"><div class="ic">${c.icon}</div><div class="tx">${c.name}<small>Hạt ${coin(c.cost)} · lớn ~${Math.round(c.grow / MIN * 10) / 10} phút · bán ${coin(c.price)}/cây</small></div><button class="btn" data-a="plant" data-v="${i}:${c.id}" ${S.coins < c.cost ? 'disabled' : ''}>Gieo</button></div>`).join('');
  }
  const c = CROPS.find((x) => x.id === b.crop);
  if (bedReady(b)) return `<h2>${c.icon} ${c.name} đã chín!</h2><p>Thu được 4 cây.</p><button class="btn big gold" data-a="harvest" data-v="${i}">Thu hoạch</button>`;
  const wet = b.waterUntil > Date.now(), pct = (b.progress / c.grow) * 100;
  const left = (c.grow - b.progress) / (wet ? 1 : 0.25);
  return `<h2>${c.icon} ${c.name}</h2><div class="bar"><i style="width:${pct}%"></i></div>
  <p>${wet ? `💧 Đang đủ nước. Còn khoảng ${fmt(left)}.` : `🏜️ Đất khô, cây lớn chậm. Tưới để nhanh gấp 4 lần.`}${b.fert ? ' 🪱 Đã bón phân ủ (lớn x1,5).' : ''}${phaseAt(S.world.step) === 0 ? ` Mùa khô: ao cạn, cần nước lu (${S.lu}/${LU_CAP * (S.builds.lu || 0)}).` : ''}</p>
  <button class="btn big" data-a="water" data-v="${i}">💧 Tưới nước</button>
  ${!b.fert && S.res.phanu ? `<p><button class="btn big gold" data-a="fert" data-v="${i}">🪱 Bón phân ủ (có ${S.res.phanu})</button></p>` : ''}
  <p style="text-align:center"><button class="btn gray" data-a="pull" data-v="${i}">Nhổ bỏ</button></p>`;
};

// ---------- Chợ ----------
const trend = (id) => { const m = priceMul(id); return m > 1.05 ? '▲' : m < 0.95 ? '▼' : ''; };
const bag = (b) => (b === 'res' ? S.res : S.inv[b]);
const sellable = () => [
  ...FISH.map((f) => ({ b: 'fish', ...f })), ...CROPS.map((c) => ({ b: 'crop', ...c })), ...EGGS.map((e) => ({ b: 'egg', ...e })),
  ...Object.entries(RES).filter(([, r]) => r.price > 0).map(([id, r]) => ({ b: 'res', id, ...r })),
].filter((x) => bag(x.b)[x.id] > 0);
const unit = (x) => Math.round(x.price * priceMul(x.id));
const market = () => {
  const items = sellable(), total = items.reduce((a, x) => a + unit(x) * bag(x.b)[x.id], 0);
  return `<h2>🧺 Chợ quê</h2><p>Giá đổi theo ngày. ▲ cao hơn thường, ▼ thấp hơn.</p>` +
    (items.length ? items.map((x) => `<div class="row"><div class="ic">${x.icon}</div><div class="tx">${x.name} ×${bag(x.b)[x.id]}<small>${coin(unit(x))}/con ${trend(x.id)}</small></div><button class="btn" data-a="sell" data-v="${x.b}:${x.id}">Bán hết</button></div>`).join('') +
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
  const ph = phaseAt(S.world.step), W = WEATHER.find((x) => x.id === S.world.weather) || WEATHER[0];
  return `<h2>🏠 Nhà quê</h2><p>${PHASES[ph].icon} <b>${PHASES[ph].name}</b> · ${W.icon} ${W.name}. ${PHASES[ph].tip}</p><p>${q ? `<b>Nhiệm vụ:</b> ${q.text} (thưởng ${coin(q.reward)})` : 'Bạn đã hoàn thành mọi nhiệm vụ!'}</p>` +
    upRow('🏠', 'Sửa nhà', 'Nhà đẹp hơn, mục tiêu cuối game', S.house, 3, UP.house[S.house] ?? 0, 'house') +
    upRow('🎣', 'Cần câu', 'Thanh kéo to hơn, dễ ra cá hiếm', S.rod, 3, UP.rod[S.rod] ?? 0, 'rod') +
    upRow('🪤', 'Thêm lờ', 'Thêm một chỗ đặt lờ bên ao', S.trapsN, 4, UP.trap[S.trapsN] ?? 0, 'trap') +
    upRow('🌱', 'Thêm luống rau', 'Thêm một luống trong vườn', S.bedsN, 6, UP.bed[S.bedsN] ?? 0, 'bed') +
    upRow('🐔', 'Mở rộng chuồng', 'Nuôi được nhiều gà vịt hơn', S.coop, 3, UP.coop[S.coop] ?? 0, 'coop') +
    `<div class="row"><div class="ic">🔨</div><div class="tx">Xây dựng<small>Bàn thợ, chuồng tre lá, ổ ấp, lu nước, ủ phân, cầu khỉ, nền cao</small></div><button class="btn gold" data-a="openbuild">Mở</button></div>` +
    `<div class="row"><div class="ic">🪓</div><div class="tx">Công cụ<small>${Object.entries(TOOLS).map(([k, t]) => `${t.icon}${S.tools[k] || 0}`).join(' ')} (bậc 0–3, chế ở bàn thợ)</small></div><button class="btn" data-a="opencraft">Mở</button></div>` +
    `<div class="row"><div class="ic">📖</div><div class="tx">Sổ giống<small>${Object.keys(S.dex).length}/${dexAll().length} kiểu gà vịt</small></div><button class="btn" data-a="dex">Mở</button></div>` +
    `<p style="margin-top:12px"><button class="btn gray" data-a="music">${S.sound ? '🔊 Tắt' : '🔇 Bật'} âm thanh</button> <button class="btn red" data-a="reset">Chơi lại từ đầu</button></p>`;
};

// ---------- Xây dựng ----------
const costTxt = (cost, coins) => Object.entries(cost).map(([k, n]) => `<span style="${(S.res[k] || 0) >= n ? '' : 'color:#d8523f'}">${RES[k].icon}${S.res[k] || 0}/${n}</span>`).join(' ') + ` · ${coin(coins)}`;
const canBuild = (b) => S.coins >= b.coins && Object.entries(b.cost).every(([k, n]) => (S.res[k] || 0) >= n);
const buildPanel = () => {
  const bag = Object.entries(S.res).filter(([, n]) => n > 0).map(([k, n]) => `${RES[k].icon}${n}`).join(' ') || 'trống';
  const row = (key, label, done, data) => { const b = BUILD[key]; return `<div class="row"><div class="ic">${b.icon}</div><div class="tx">${label || b.name}<small>${b.desc}<br>${costTxt(b.cost, b.coins)}</small></div><button class="btn ${done ? 'gray' : 'gold'}" data-a="build" data-v="${data}" ${done || !canBuild(b) ? 'disabled' : ''}>${done ? 'Đã xây' : 'Xây'}</button></div>`; };
  return `<h2>🔨 Xây dựng</h2><p>Túi nguyên liệu: ${bag}. Khai thác ngoài cảnh bằng công cụ phù hợp (chế ở bàn thợ); vật thể mọc lại sau vài ngày game, ốc từ đầu mưa, điên điển và bông súng mùa nước nổi.</p>` +
    row('ban', null, S.builds.ban, 'ban') + row('chuong', null, S.builds.chuong, 'chuong') + row('oap', null, S.builds.oap, 'oap') +
    row('lu', `Lu nước mưa (${S.builds.lu || 0}/2)`, (S.builds.lu || 0) >= 2, 'lu') + row('phan', null, S.builds.phan, 'phan') + row('cau', null, S.builds.cau, 'cau') +
    [3, 4, 5].map((i) => row('nen', `Nền cao luống ${i + 1}`, S.builds.nen?.[i], `nen:${i}`)).join('');
};

// ---------- Bàn thợ ----------
const craftPanel = () => {
  if (!S.builds.ban) return `<h2>🔨 Chưa có bàn thợ</h2><p>Dựng bàn thợ trước để chế công cụ: ${costTxt(BUILD.ban.cost, BUILD.ban.coins)}.</p><button class="btn big gold" data-a="openbuild">Mở Xây dựng</button>`;
  const bag = Object.entries(S.res).filter(([, n]) => n > 0).map(([k, n]) => `${RES[k].icon}${n}`).join(' ') || 'trống';
  return `<h2>🔨 Bàn thợ</h2><p>Túi: ${bag}. Công cụ dùng mãi, nâng bậc để khai thác nhanh hơn và nhiều hơn.</p>` + Object.entries(TOOLS).map(([k, t]) => {
    const tier = S.tools[k] || 0, nx = t.tiers[tier + 1], ok = nx && S.coins >= nx.coins && Object.entries(nx.cost).every(([r, n]) => (S.res[r] || 0) >= n);
    return `<div class="row"><div class="ic">${t.icon}</div><div class="tx">${t.name} · ${TIER_NAME[tier]}<small>Dùng cho ${t.use}${nx ? `<br>Lên ${TIER_NAME[tier + 1]}: ${costTxt(nx.cost, nx.coins)}` : ' · bậc cao nhất'}</small></div><button class="btn ${nx ? 'gold' : 'gray'}" data-a="craft" data-v="${k}" ${ok ? '' : 'disabled'}>${nx ? (tier ? 'Nâng' : 'Chế') : 'Tối đa'}</button></div>`;
  }).join('');
};

// ---------- Khai thác vật thể ----------
let H = null;
export const isHarvesting = () => !!H;
const cancelH = () => { if (H) { cancelAnimationFrame(H.raf); H = null; } $('#hbar').hidden = true; };
export const harvest = (id) => {
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
        const n = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (d.tool ? YIELD_MUL[tier] : 1)), add = Math.min(n, RES_CAP - (S.res[r] || 0));
        if (add > 0) { S.res[r] = (S.res[r] || 0) + add; got.push(`+${add}${RES[r].icon}`); }
      }
      S.obj[id] = day + d.regrow; S.stats.picked++; if (o.kind === 'tree') S.stats.chopped++;
      cancelH(); sfx.pop(); buzz(20); toast(got.length ? got.join('  ') : `Túi đã đầy (${RES_CAP})`, 1400); return after();
    }
    H.raf = requestAnimationFrame(loop);
  };
  H.raf = requestAnimationFrame(loop);
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
  eggs() { // chỉ thu trứng thường; trứng có phôi giữ lại để ấp
    let n = 0;
    S.eggs = S.eggs.filter((e) => { if (e.fertile) return true; add('egg', SP[e.sp].egg, 1); n++; return false; });
    sfx.pop(); toast(`Nhặt ${n} quả trứng 🥚`);
  },
  eggsall() { let n = 0; for (const e of S.eggs) { add('egg', SP[e.sp].egg, 1); n++; } S.eggs = []; sfx.pop(); toast(`Thu ${n} quả trứng 🥚`); },
  buy(v) {
    if (cnt(v) >= capOf(S, v) || !spend(ANIMAL[v])) return;
    const rng = mulberry32((Date.now() ^ (S.nextId * 2654435761)) >>> 0), m = S.animals.filter((a) => a.sp === v && a.sex === 'm').length, f = cnt(v) - m;
    addAnimal(S, v, m * 2 <= f ? 'm' : 'f', founder(rng), dayAt(S.world.step) - 3 - Math.floor(rng() * 4), true); sfx.cluck(); sfx.coin();
  },
  view(v) { open(animalCard(+v)); },
  herd() { open(herdPanel); },
  dex() { open(dexPanel); },
  coopback() { open(coopPanel); },
  openbuild() { open(buildPanel); },
  opencraft() { open(craftPanel); },
  craft(k) {
    const t = TOOLS[k], tier = S.tools[k] || 0, nx = t.tiers[tier + 1];
    if (!S.builds.ban || !nx || S.coins < nx.coins || !Object.entries(nx.cost).every(([r, n]) => (S.res[r] || 0) >= n)) return;
    S.coins -= nx.coins; for (const [r, n] of Object.entries(nx.cost)) S.res[r] -= n;
    S.tools[k] = tier + 1; S.stats.crafted++; sfx.ok(); buzz([20, 30]); toast(`${t.icon} ${t.name} ${TIER_NAME[tier + 1]}!`);
  },
  sellanimal(v) { const a = S.animals.find((x) => x.id === +v); if (!a) return; S.coins += price(a); S.animals.splice(S.animals.indexOf(a), 1); sfx.coin(); toast(`Đã bán, được ${coin(price(a))}`); open(herdPanel); },
  build(v) {
    const [key, idx] = v.split(':'), b = BUILD[key];
    if (!canBuild(b)) return;
    if (key === 'lu' && (S.builds.lu || 0) >= 2) return;
    S.coins -= b.coins; for (const [k, n] of Object.entries(b.cost)) S.res[k] -= n;
    if (key === 'lu') S.builds.lu = (S.builds.lu || 0) + 1; else if (key === 'nen') S.builds.nen[+idx] = true; else S.builds[key] = true;
    S.stats.built++; sfx.ok(); toast(`Đã xây ${b.icon} ${b.name}!`);
  },
  fert(v) { const b = S.beds[+v]; if (!b || b.fert || !S.res.phanu) return; S.res.phanu--; b.fert = true; sfx.pop(); toast('Đã bón phân ủ 🪱'); },
  plant(v) { const [i, id] = v.split(':'), c = CROPS.find((x) => x.id === id); if (isFlooded(S, +i) || !spend(c.cost)) return; S.beds[+i] = { crop: id, progress: 0, last: Date.now(), waterUntil: 0, fert: false, flood: 0 }; S.stats.planted++; sfx.pop(); close(); },
  water(v) {
    const b = S.beds[+v], c = CROPS.find((x) => x.id === b.crop), now = Date.now(); let k = 0.6;
    if (phaseAt(S.world.step) === 0) { if (S.lu >= 1) S.lu--; else { k = 0.3; toast('Mùa khô, ao cạn: tưới được ít. Xây lu nước mưa để trữ nước.'); } }
    b.waterUntil = Math.min(now + 0.9 * c.grow, Math.max(now, b.waterUntil) + k * c.grow); sfx.splash(); if (k === 0.6) toast('Đã tưới 💧');
  },
  pull(v) { S.beds[+v] = null; close(); },
  harvest(v) { const b = S.beds[+v]; add('crop', b.crop, 4); S.stats.harvested += 4; S.beds[+v] = null; sfx.pop(); toast(`Thu 4 ${CROPS.find((c) => c.id === b.crop).name}`); close(); },
  sell(v) { const [b, id] = v.split(':'), x = sellable().find((y) => y.b === b && y.id === id), n = bag(b)[id]; S.coins += unit(x) * n; bag(b)[id] = 0; S.stats.sold += n; sfx.coin(); },
  sellall() { for (const x of sellable()) { const n = bag(x.b)[x.id]; S.coins += unit(x) * n; bag(x.b)[x.id] = 0; S.stats.sold += n; } sfx.coin(); },
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
  if (kind === 'animal') return open(animalCard(idx));
  if (kind === 'bench') return open(craftPanel);
  if (kind === 'obj') return harvest(idx);
  if (kind === 'trap') return open(trapPanel(idx));
  if (kind === 'coop') return open(coopPanel);
  if (kind === 'bed') return open(bedPanel(idx));
  if (kind === 'stall') return open(market);
  if (kind === 'house') return open(house);
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
    if (o) { unlock(); sfx.tap(); if (F.on && o.dataset.open !== 'fish') return; if (o.dataset.open === 'fish') return F.on ? undefined : interact('pond', 0); if (o.dataset.open === 'trap') return startPlace(); return open({ market, house }[o.dataset.open]); }
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
