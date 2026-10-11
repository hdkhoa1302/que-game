import { FISH, CROPS, EGGS, GRAIN, BAIT, TRAP_TIMES, UP, COOP_CAP, ANIMAL, QUESTS, priceMul, MIN, PHASES, WEATHER, SP, RES, BUILD, LU_CAP, TOOLS, TIER_NAME } from './data.js';
import { phaseAt, dayAt, lifeStage, capOf, hatchLimit, dexAll, isFlooded } from './sim.js';
import { avg, colorOf, sizeGroup } from './genes.js';
import { bedReady, trapLeft, trapState, nestCap } from './state.js';

export const fmt = (ms) => {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
export const coin = (n) => `🪙${n}`;

const bag = (S, b) => (b === 'res' ? S.res : S.inv[b]);
export const sellable = (S) => [
  ...FISH.map((f) => ({ b: 'fish', ...f })), ...CROPS.map((c) => ({ b: 'crop', ...c })), ...EGGS.map((e) => ({ b: 'egg', ...e })),
  ...Object.entries(RES).filter(([, r]) => r.price > 0).map(([id, r]) => ({ b: 'res', id, ...r })),
].filter((x) => bag(S, x.b)[x.id] > 0);

export const unit = (x, bonus = 1) => Math.round(x.price * priceMul(x.id) * bonus);
const trend = (id) => { const m = priceMul(id); return m > 1.05 ? '▲' : m < 0.95 ? '▼' : ''; };

export const trapYield = (ms) => Math.min(14, Math.floor(2 * Math.sqrt(ms / MIN)));
const timeRows = (S, data) => TRAP_TIMES.map((x, k) => `<div class="row"><div class="tx">${x.label}<small>Khoảng ${trapYield(x.ms)} con</small></div><button class="btn" data-a="${data}" data-v="${k}" ${S.coins < BAIT ? 'disabled' : ''}>Thả lờ</button></div>`).join('');
const TIP = 'Mẹo ngư dân: lờ đặt ở nước nông ven bờ, chỗ có bóng râm và lau sậy, cá ra kiếm ăn đêm nên để lâu thì được nhiều.';

export const placePanel = (S) => () => `<h2>🪤 Thả lờ ở đây</h2><p>Mồi tốn ${coin(BAIT)}. Lờ chạy cả khi bạn thoát game (tối đa 8 giờ). ${TIP}</p>${timeRows(S, 'place')}`;

export const trapPanel = (S, i) => () => {
  const t = S.traps[i];
  if (!t) return '<h2>🪤 Lờ</h2>';
  const st = trapState(t);
  if (st === 'idle') return `<h2>🪤 Lờ ${i + 1} đang rảnh</h2><p>Mồi tốn ${coin(BAIT)}.</p>${timeRows(S, 'settrap').replace(/data-a="settrap" data-v="(\d)"/g, `data-a="settrap" data-v="${i}:$1"`)}<button class="btn gray big" data-a="pickup" data-v="${i}">Nhấc lờ lên (đặt lại chỗ khác)</button>`;
  const left = trapLeft(t), el = Date.now() - t.start, pct = Math.min(100, (el / t.ms) * 100), n = trapYield(Math.min(el, t.ms));
  return `<h2>🪤 Lờ ${i + 1}</h2><div class="bar"><i style="width:${pct}%"></i></div>
    <p>${left ? `Còn <b>${fmt(left)}</b> nữa là đầy. Hiện có khoảng ${n} con.` : `Lờ đã đầy: <b>${n} con</b>!`}</p>
    <button class="btn big ${left ? 'gold' : ''}" data-a="takeTrap" data-v="${i}" ${n < 1 ? 'disabled' : ''}>${left ? 'Nhấc lờ sớm' : 'Thu cá'}</button>`;
};

const cnt = (S, sp) => S.animals.filter((a) => a.sp === sp).length;
const STAGE = { young: 'Con non', adult: 'Trưởng thành', old: 'Già' };
const swatch = (a) => `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;vertical-align:-1px;background:#${SP[a.sp].hex[colorOf(a.genome)].toString(16).padStart(6, '0')};border:2px solid #0002"></span>`;
export const animalPrice = (S, a) => Math.round(ANIMAL[a.sp] * 0.6 * (1 + avg(a.genome, 'size') / 18) * (lifeStage(a, dayAt(S.world.step)) === 'young' ? 0.5 : 1));

export const coopPanel = (S) => () => {
  const fed = S.fedUntil - Date.now(), c = COOP_CAP[S.coop - 1];
  const eg = (f) => S.eggs.filter((e) => e.fertile === f).length;
  return `<h2>🐔 Chuồng gà vịt</h2>
  <p>${cnt(S, 'chicken')} gà · ${cnt(S, 'duck')} vịt (chuồng chứa ${c.chicken} gà, ${c.duck} vịt; con non được vượt tới ${hatchLimit(S, 'chicken')}/${hatchLimit(S, 'duck')}). ${fed > 0 ? `Đang no, còn <b>${fmt(fed)}</b>.` : 'Đang đói: cho ăn thì mới đẻ trứng.'}</p>
  <div class="row"><div class="ic">🌾</div><div class="tx">Rải thóc<small>Có ${S.inv.grain} thóc · no ${GRAIN.feed / MIN} phút</small></div><button class="btn" data-a="feed">Rải</button></div>
  <div class="row"><div class="ic">🐌</div><div class="tx">Cho ăn ốc / rau<small>Có ${S.res.oc || 0} ốc, ${Object.values(S.inv.crop).reduce((a, b) => a + b, 0)} rau · no ${Math.round(GRAIN.feed * 0.7 / MIN * 10) / 10} phút</small></div><button class="btn" data-a="feedfood">Cho ăn</button></div>
  <div class="row"><div class="ic">🥚</div><div class="tx">Trong ổ: ${eg(false)} trứng thường, ${eg(true)} trứng có phôi<small>${S.builds.oap ? 'Có ổ ấp: trứng có phôi nở sau ~1 ngày.' : 'Chưa có ổ ấp rơm: chỉ 60% trứng có phôi nở.'} Ổ chứa tối đa ${nestCap()} mỗi loại.</small></div><button class="btn gold" data-a="eggs" ${eg(false) < 1 ? 'disabled' : ''}>Thu</button></div>
  ${eg(true) ? `<div class="row"><div class="ic">🍳</div><div class="tx">Bán cả trứng có phôi<small>Mất cơ hội nở con</small></div><button class="btn gray" data-a="eggsall">Thu hết</button></div>` : ''}
  <div class="row"><div class="ic">📋</div><div class="tx">Xem đàn và gen<small>Chọn con tốt để giữ, bán con yếu</small></div><button class="btn" data-a="herd">Xem</button></div>
  <div class="row"><div class="ic">📖</div><div class="tx">Sổ giống<small>${Object.keys(S.dex).length}/${dexAll().length} kiểu đã gặp</small></div><button class="btn" data-a="dex">Mở</button></div>
  <div class="row"><div class="ic">🐔</div><div class="tx">Mua gà<small>${coin(ANIMAL.chicken)}</small></div><button class="btn" data-a="buy" data-v="chicken" ${cnt(S, 'chicken') >= c.chicken || S.coins < ANIMAL.chicken ? 'disabled' : ''}>Mua</button></div>
  <div class="row"><div class="ic">🦆</div><div class="tx">Mua vịt<small>${coin(ANIMAL.duck)}</small></div><button class="btn" data-a="buy" data-v="duck" ${cnt(S, 'duck') >= c.duck || S.coins < ANIMAL.duck ? 'disabled' : ''}>Mua</button></div>`;
};

export const herdPanel = (S) => () => {
  const day = dayAt(S.world.step), L = [...S.animals].sort((a, b) => a.sp.localeCompare(b.sp) || a.born - b.born);
  return `<h2>📋 Đàn gà vịt (${L.length})</h2><p>Con có <b>đề kháng</b> cao sống sót tốt mùa mưa, vịt <b>chịu nước</b> cao hợp mùa nước nổi. Giữ con tốt, bán con yếu.</p>` + (L.map((a) => {
    const st = lifeStage(a, day);
    return `<div class="row"><div class="ic">${SP[a.sp].icon}</div><div class="tx">${swatch(a)} ${SP[a.sp].colors[colorOf(a.genome)]} ${a.sex === 'm' ? '♂' : '♀'} · ${STAGE[st]}${a.sickUntil ? ' 🤒' : ''}<small>Cỡ ${avg(a.genome, 'size').toFixed(1)} · Trứng ${avg(a.genome, 'eggs').toFixed(1)} · Kháng ${avg(a.genome, 'resist').toFixed(1)} · Nước ${avg(a.genome, 'water').toFixed(1)}</small></div><button class="btn" data-a="view" data-v="${a.id}">Xem</button></div>`;
  }).join('') || '<p>Chuồng đang trống. Mua gà vịt ở menu chuồng.</p>') + `<button class="btn gray big" data-a="coopback" style="margin-top:8px">Về chuồng</button>`;
};

const GENE_ROWS = [['size', 'Cỡ thể'], ['eggs', 'Đẻ trứng'], ['resist', 'Đề kháng'], ['water', 'Chịu nước']];
export const animalCard = (S, id) => () => {
  const a = S.animals.find((x) => x.id === id);
  if (!a) return '<h2>Con này không còn trong đàn</h2><button class="btn gray big" data-a="herd">Về đàn</button>';
  const day = dayAt(S.world.step), age = day - a.born, st = lifeStage(a, day);
  return `<h2>${SP[a.sp].icon} ${SP[a.sp].name} ${SP[a.sp].colors[colorOf(a.genome)].toLowerCase()} ${a.sex === 'm' ? '♂ (trống)' : '♀ (mái)'}</h2>
  <p>${swatch(a)} ${STAGE[st]} · ${age} ngày tuổi (sống tối đa 18 ngày)${a.sickUntil ? ' · <b>đang ốm 🤒</b>' : ''} · cỡ nhóm ${sizeGroup(a.genome)}</p>
  ${GENE_ROWS.map(([k, n]) => `<div class="gene"><span>${n}</span><div class="bar"><i style="width:${(avg(a.genome, k) / 9) * 100}%"></i></div><b>${avg(a.genome, k).toFixed(1)}</b></div>`).join('')}
  <p style="margin-top:10px">Gen ghép từ bố mẹ, mỗi lần sinh có khoảng 2% đột biến nhẹ.</p>
  <button class="btn red big" data-a="sellanimal" data-v="${a.id}">Bán · ${coin(animalPrice(S, a))}</button>
  <p><button class="btn gray big" data-a="herd">Về đàn</button></p>`;
};

export const dexPanel = (S) => () => {
  const all = dexAll(), got = all.filter((k) => S.dex[k]).length;
  return `<h2>📖 Sổ giống (${got}/${all.length})</h2><p>Mỗi kiểu (loài, màu, cỡ) gặp lần đầu thưởng 🪙15. Lai và chọn lọc để gặp đủ.</p>` + Object.keys(SP).map((sp) =>
    `<div class="row"><div class="ic">${SP[sp].icon}</div><div class="tx">${SP[sp].name}<small>` + [0, 1, 2, 3].map((c) => `${SP[sp].colors[c]}: ` + ['S', 'M', 'L'].map((z) => (S.dex[`${sp}:${c}:${z}`] ? `✅${z}` : `▫️${z}`)).join(' ')).join(' · ') + '</small></div></div>').join('') +
    '<button class="btn gray big" data-a="coopback" style="margin-top:8px">Về chuồng</button>';
};

export const bedPanel = (S, i) => () => {
  if (i >= S.bedsN) return `<h2>🌱 Luống ${i + 1}</h2><p>Chưa mở. Mở thêm luống ở 🏠 Nhà.</p>`;
  const b = S.beds[i], flooded = isFlooded(S, i);
  if (flooded) return `<h2>🌊 Luống ${i + 1} đang ngập</h2><p>Nước nổi dâng lên vườn thấp. Cây ngập quá 3 phút sẽ hỏng. Đắp <b>nền cao</b> (🏠 Nhà → Xây dựng) để canh tác quanh năm.</p><button class="btn big gold" data-a="openbuild">Mở Xây dựng</button>`;
  if (!b) {
    return `<h2>🌱 Gieo hạt</h2><p>Nhớ tưới nước: khô thì cây lớn chậm.</p>` + CROPS.map((c) =>
      `<div class="row"><div class="ic">${c.icon}</div><div class="tx">${c.name}<small>Hạt ${coin(c.cost)} · lớn ~${Math.round(c.grow / MIN * 10) / 10} phút · bán ${coin(c.price)}/cây</small></div><button class="btn" data-a="plant" data-v="${i}:${c.id}" ${S.coins < c.cost ? 'disabled' : ''}>Gieo</button></div>`).join('');
  }
  const c = CROPS.find((x) => x.id === b.crop);
  if (bedReady(b)) return `<h2>${c.icon} ${c.name} đã chín!</h2><p>Thu được 4 cây.</p><button class="btn big gold" data-a="harvest" data-v="${i}">Thu hoạch</button>`;
  const wet = b.waterUntil > Date.now(), pct = (b.progress / c.grow) * 100, left = (c.grow - b.progress) / (wet ? 1 : 0.25);
  return `<h2>${c.icon} ${c.name}</h2><div class="bar"><i style="width:${pct}%"></i></div>
  <p>${wet ? `💧 Đang đủ nước. Còn khoảng ${fmt(left)}.` : `🏜️ Đất khô, cây lớn chậm. Tưới để nhanh gấp 4 lần.`}${b.fert ? ' 🪱 Đã bón phân ủ (lớn x1,5).' : ''}${phaseAt(S.world.step) === 0 ? ` Mùa khô: sông cạn, cần nước lu (${S.lu}/${LU_CAP * (S.builds.lu || 0)}).` : ''}</p>
  <button class="btn big" data-a="water" data-v="${i}">💧 Tưới nước</button>
  ${!b.fert && S.res.phanu ? `<p><button class="btn big gold" data-a="fert" data-v="${i}">🪱 Bón phân ủ (có ${S.res.phanu})</button></p>` : ''}
  <p style="text-align:center"><button class="btn gray" data-a="pull" data-v="${i}">Nhổ bỏ</button></p>`;
};

export const market = (S) => () => {
  const items = sellable(S), total = items.reduce((a, x) => a + unit(x) * bag(S, x.b)[x.id], 0);
  return `<h2>🧺 Quầy chợ</h2><p>Giá nông sản biến động theo ngày. ▲ cao hơn thường, ▼ thấp hơn.</p>` +
    (items.length ? items.map((x) => `<div class="row"><div class="ic">${x.icon}</div><div class="tx">${x.name} ×${bag(S, x.b)[x.id]}<small>${coin(unit(x))}/món ${trend(x.id)}</small></div><button class="btn" data-a="sell" data-v="${x.b}:${x.id}">Bán hết</button></div>`).join('') +
      `<button class="btn big gold" data-a="sellall">Bán tất cả · ${coin(total)}</button>` : '<p>Chưa có gì để bán. Đi câu cá, thu rau, nhặt trứng nhé!</p>') +
    `<div class="row" style="margin-top:8px"><div class="ic">🌾</div><div class="tx">Mua thóc (có ${S.inv.grain})<small>${coin(GRAIN.cost)}/phần</small></div><button class="btn" data-a="grain" data-v="1" ${S.coins < GRAIN.cost ? 'disabled' : ''}>+1</button><button class="btn" data-a="grain" data-v="5" ${S.coins < GRAIN.cost * 5 ? 'disabled' : ''}>+5</button></div>`;
};

export const costTxt = (S, cost, coins) => Object.entries(cost).map(([k, n]) => `<span style="${(S.res[k] || 0) >= n ? '' : 'color:#d8523f'}">${RES[k].icon}${S.res[k] || 0}/${n}</span>`).join(' ') + ` · ${coin(coins)}`;
export const canBuild = (S, b) => S.coins >= b.coins && Object.entries(b.cost).every(([k, n]) => (S.res[k] || 0) >= n);

export const house = (S) => () => {
  const q = QUESTS[S.quest], ph = phaseAt(S.world.step), W = WEATHER.find((x) => x.id === S.world.weather) || WEATHER[0];
  const upRow = (ic, name, desc, lv, max, cost, key) => {
    const full = lv >= max;
    return `<div class="row"><div class="ic">${ic}</div><div class="tx">${name} · cấp ${lv}/${max}<small>${desc}</small></div>
    <button class="btn ${full ? 'gray' : 'gold'}" data-a="up" data-v="${key}" ${full || S.coins < cost ? 'disabled' : ''}>${full ? 'Tối đa' : coin(cost)}</button></div>`;
  };
  return `<h2>🏠 Nhà lá Ba Tri</h2><p>${PHASES[ph].icon} <b>${PHASES[ph].name}</b> · ${W.icon} ${W.name}. ${PHASES[ph].tip}</p><p>${q ? `<b>Nhiệm vụ:</b> ${q.text} (thưởng ${coin(q.reward)})` : 'Bạn đã hoàn thành mọi nhiệm vụ!'}</p>` +
    upRow('🏠', 'Sửa nhà lá', 'Mái lá chằm stepped layers, cột tràm', S.house, 3, UP.house[S.house] ?? 0, 'house') +
    upRow('🎣', 'Cần câu', 'Thanh kéo to hơn, dễ câu cá to', S.rod, 3, UP.rod[S.rod] ?? 0, 'rod') +
    upRow('🪤', 'Thêm lờ', 'Thêm chỗ đặt lờ ven sông', S.trapsN, 4, UP.trap[S.trapsN] ?? 0, 'trap') +
    upRow('🌱', 'Thêm luống rau', 'Thêm luống đất vườn', S.bedsN, 6, UP.bed[S.bedsN] ?? 0, 'bed') +
    upRow('🐔', 'Mở rộng chuồng', 'Nuôi được nhiều gà vịt hơn', S.coop, 3, UP.coop[S.coop] ?? 0, 'coop') +
    `<div class="row"><div class="ic">🔨</div><div class="tx">Xây dựng<small>Cầu khỉ, lu nước mưa, đống ủ, bàn thợ</small></div><button class="btn gold" data-a="openbuild">Mở</button></div>` +
    `<div class="row"><div class="ic">🪓</div><div class="tx">Công cụ<small>${Object.entries(TOOLS).map(([k, t]) => `${t.icon}${S.tools[k] || 0}`).join(' ')} (bậc 0–3)</small></div><button class="btn" data-a="opencraft">Mở</button></div>` +
    `<p style="margin-top:12px"><button class="btn gray" data-a="music">${S.sound ? '🔊 Tắt' : '🔇 Bật'} âm thanh</button> <button class="btn red" data-a="reset">Chơi lại</button></p>`;
};

export const buildPanel = (S) => () => {
  const bBag = Object.entries(S.res).filter(([, n]) => n > 0).map(([k, n]) => `${RES[k].icon}${n}`).join(' ') || 'trống';
  const row = (key, label, done, data) => { const b = BUILD[key]; return `<div class="row"><div class="ic">${b.icon}</div><div class="tx">${label || b.name}<small>${b.desc}<br>${costTxt(S, b.cost, b.coins)}</small></div><button class="btn ${done ? 'gray' : 'gold'}" data-a="build" data-v="${data}" ${done || !canBuild(S, b) ? 'disabled' : ''}>${done ? 'Đã xây' : 'Xây'}</button></div>`; };
  return `<h2>🔨 Xây dựng công trình</h2><p>Túi nguyên liệu: ${bBag}. Khai thác tre, tràm, bùn sét ngoài vườn rạch.</p>` +
    row('ban', null, S.builds.ban, 'ban') + row('chuong', null, S.builds.chuong, 'chuong') + row('oap', null, S.builds.oap, 'oap') +
    row('lu', `Lu nước mưa (${S.builds.lu || 0}/2)`, (S.builds.lu || 0) >= 2, 'lu') + row('phan', null, S.builds.phan, 'phan') + row('cau', null, S.builds.cau, 'cau') +
    [3, 4, 5].map((i) => row('nen', `Nền cao luống ${i + 1}`, S.builds.nen?.[i], `nen:${i}`)).join('');
};

export const craftPanel = (S) => () => {
  if (!S.builds.ban) return `<h2>🔨 Chưa có bàn thợ</h2><p>Dựng bàn thợ trước để chế rựa, rìu: ${costTxt(S, BUILD.ban.cost, BUILD.ban.coins)}.</p><button class="btn big gold" data-a="openbuild">Mở Xây dựng</button>`;
  const bBag = Object.entries(S.res).filter(([, n]) => n > 0).map(([k, n]) => `${RES[k].icon}${n}`).join(' ') || 'trống';
  return `<h2>🔨 Bàn thợ mộc</h2><p>Túi: ${bBag}. Rựa, rìu đẽo từ gỗ tràm và tre già.</p>` + Object.entries(TOOLS).map(([k, t]) => {
    const tier = S.tools[k] || 0, nx = t.tiers[tier + 1], ok = nx && S.coins >= nx.coins && Object.entries(nx.cost).every(([r, n]) => (S.res[r] || 0) >= n);
    return `<div class="row"><div class="ic">${t.icon}</div><div class="tx">${t.name} · ${TIER_NAME[tier]}<small>Dùng cho ${t.use}${nx ? `<br>Lên ${TIER_NAME[tier + 1]}: ${costTxt(S, nx.cost, nx.coins)}` : ' · bậc cao nhất'}</small></div><button class="btn ${nx ? 'gold' : 'gray'}" data-a="craft" data-v="${k}" ${ok ? '' : 'disabled'}>${nx ? (tier ? 'Nâng' : 'Chế') : 'Tối đa'}</button></div>`;
  }).join('');
};

export const traderPanel = (S) => () => {
  const items = sellable(S), totalBonus = items.reduce((a, x) => a + unit(x, 1.25) * bag(S, x.b)[x.id], 0);
  return `<h2>🍉 Ghe Chợ Nổi Cà Mau</h2>
  <p>Cây bẹo treo gì bán nấy, mắt ghe dẫn lối con nước lớn! Thương lái mua nông sản <b>giá thưởng +25%</b>.</p>` +
  (items.length ? items.map((x) => `<div class="row"><div class="ic">${x.icon}</div><div class="tx">${x.name} ×${bag(S, x.b)[x.id]}<small>${coin(unit(x, 1.25))}/món (+25%)</small></div><button class="btn gold" data-a="tradersell" data-v="${x.b}:${x.id}">Bán cho ghe</button></div>`).join('') +
    `<button class="btn big gold" data-a="tradersellall">Bán hết cho ghe · ${coin(totalBonus)}</button>` : '<p>Bạn chưa có nông sản hay cá tôm để bán cho thương lái.</p>') +
  `<div class="row" style="margin-top:10px"><div class="ic">🥒</div><div class="tx">Hạt giống Bầu hồ lô<small>Giống bầu leo giàn sai quả ngọt nước</small></div><button class="btn" data-a="traderbuy" data-v="bau" ${S.coins < 12 ? 'disabled' : ''}>12🪙</button></div>`;
};

export const boatPanel = () => () => `<h2>🛶 Xuồng Ba Lá</h2>
<p>Phương tiện xuôi ngược kinh rạch miền Tây. Đáy ván be, dầm chèo gỗ tràm.</p>
<div class="row"><div class="ic">🌾</div><div class="tx">Chèo sang bờ ruộng Đông<small>Đến đồng lúa chín và rừng dừa bến bên kia sông</small></div><button class="btn gold" data-a="boatcross">Chèo qua</button></div>
<div class="row"><div class="ic">🐟</div><div class="tx">Thăm lờ nước sâu giữa dòng<small>Thả lờ nước sâu bắt cá lóc, tôm càng (tốn ${coin(BAIT)})</small></div><button class="btn" data-a="boatfish">Thả lờ sâu</button></div>`;

export const mekongPanels = {
  altar: () => () => `<h2>🕯️ Bàn Thiên Thông Thiên</h2><p>Nét văn hóa tín ngưỡng tâm linh Nam Bộ trước sân nhà. Chắp tay cầu mưa thuận gió hòa, mùa màng tươi tốt.</p><button class="btn gold big" data-a="altarpray">Thắp nén nhang cầu an</button>`,
  hammock: () => () => `<h2>🌴 Cái Võng Trưa Hè</h2><p>Mắc dưới tán cây râm mát, đung đưa nghe gió chướng vi vu. Nghỉ trưa để hồi phục sức lực.</p><button class="btn gold big" data-a="hammockrest">Nằm võng nghỉ trưa</button>`,
  arbor: (ready) => () => `<h2>🥒 Giàn Bầu Trước Ngõ</h2><p>Giàn bầu quả lúc lắt xanh mướt. Trái bầu nấu canh tôm đồng giải nhiệt mùa khô.</p><button class="btn ${ready ? 'gold' : 'gray'} big" data-a="arborharvest" ${ready ? '' : 'disabled'}>${ready ? 'Hái bầu nấu canh' : 'Bầu đang lớn…'}</button>`,
  hut: () => () => `<h2>🛖 Chòi Canh Đồng Bờ Đông</h2><p>Chòi lá che mưa nắng giữa đồng lúa bao la. Nơi nghỉ chân khi gặt lúa và trông coi đồng ruộng.</p><button class="btn gold big" data-a="hutrest">Trú mát tại chòi</button>`,
  buffalo: () => () => `<h2>🐃 Con Trâu Đầm Sình</h2><p>Con trâu là đầu cơ nghiệp. Mùa cày ải, trâu giúp đất tơi xốp, mùa khô trâu đầm vũng bùn mát rượi.</p><button class="btn gold big" data-a="buffaloplow">Dắt trâu cày ải</button>`
};
