// Mô phỏng thế giới theo bước xác định (1 bước = 1 phút thật). Thuần: nhận S, không đụng DOM.
import { STEP_MS, DAY_STEPS, PHASE_STEPS, MAX_CATCHUP, PHASES, WEATHER, WEATHER_P, FLOOD_LEVEL, SP, AGE, DEX_REWARD, NEST_PER_COOP, RES_CAP, CROPS, COOP_CAP } from './data.js';
import { rngAt, founder, cross, avg, colorOf, sizeGroup } from './genes.js';

export const phaseAt = (n) => Math.floor(n / PHASE_STEPS) % 4;
export const dayAt = (n) => Math.floor(n / DAY_STEPS);
export const stepF = (S, now = Date.now()) => S.world.base + (now - S.t0) / STEP_MS;
export const stepTime = (S, n) => S.t0 + (n - S.world.base) * STEP_MS;
export const weatherOf = (seed, day) => {
  const p = WEATHER_P[phaseAt(day * DAY_STEPS)], r = rngAt(seed, 70000 + day)();
  let a = 0;
  for (let i = 0; i < p.length; i++) if (r < (a += p[i])) return WEATHER[i].id;
  return 'nang';
};
// mực nước: nội suy mượt giữa tâm các giai đoạn
export const levelAt = (nf) => {
  const q = nf / PHASE_STEPS - 0.5, i = Math.floor(q), t = q - i, k = t * t * (3 - 2 * t), m = (x) => ((x % 4) + 4) % 4;
  return PHASES[m(i)].level + (PHASES[m(i + 1)].level - PHASES[m(i)].level) * k;
};
export const nestCap = (S) => NEST_PER_COOP * S.coop;
export const isFlooded = (S, i, now = Date.now()) => i >= 3 && !S.builds.nen?.[i] && levelAt(stepF(S, now)) > FLOOD_LEVEL;

// ---- luống rau (cây lớn theo thời gian thật, tưới/bón ảnh hưởng tốc độ) ----
export const growBed = (b, now) => {
  const dt = Math.max(0, now - b.last), wet = Math.max(0, Math.min(dt, b.waterUntil - b.last));
  const g = CROPS.find((c) => c.id === b.crop).grow, k = b.fert ? 1.5 : 1;
  b.progress = Math.min(g, b.progress + (wet + (dt - wet) * 0.25) * k); // khô thì lớn chậm 25%
  b.last = now;
};

// ---- gà vịt ----
export const lifeStage = (a, day) => { const age = day - a.born; return age < AGE.adult ? 'young' : age >= AGE.old ? 'old' : 'adult'; };
export const ofSp = (S, sp) => S.animals.filter((a) => a.sp === sp);
export const adultsOf = (S, sp, sex, day = dayAt(S.world.step)) => S.animals.filter((a) => a.sp === sp && (!sex || a.sex === sex) && lifeStage(a, day) !== 'young');
export const capOf = (S, sp) => COOP_CAP[S.coop - 1][sp];
export const hatchLimit = (S, sp) => Math.ceil(capOf(S, sp) * 1.5); // đàn được vượt sức chứa tới 150% nhờ con non, để thế hệ sau kịp lớn trước khi đàn cũ già

const dexKey = (a) => `${a.sp}:${colorOf(a.genome)}:${sizeGroup(a.genome)}`;
export const dexAll = () => Object.keys(SP).flatMap((sp) => [0, 1, 2, 3].flatMap((c) => ['S', 'M', 'L'].map((z) => `${sp}:${c}:${z}`)));
export const addAnimal = (S, sp, sex, genome, born, reward = true) => {
  const a = { id: S.nextId++, sp, sex, born, genome, sickUntil: 0 };
  S.animals.push(a);
  const k = dexKey(a);
  if (!S.dex[k]) { S.dex[k] = 1; if (reward) { S.coins += DEX_REWARD; ev(S, `📖 Giống mới vào sổ: ${SP[sp].name} ${SP[sp].colors[colorOf(genome)].toLowerCase()} cỡ ${sizeGroup(genome)} (+${DEX_REWARD}🪙)`); } }
  return a;
};
export const ev = (S, msg) => { S.ev.push(msg); if (S.ev.length > 6) S.ev.shift(); };
const gain = (S, k, n) => { S.res[k] = Math.min(RES_CAP, (S.res[k] || 0) + n); };

const dayStart = (S, n, t, day, rng) => {
  const w = S.world;
  if (w.weather === 'chuong') ev(S, '💨 Gió chướng thổi: lờ đánh bắt kém, gà vịt ngoài chuồng đẻ ít.');
  // già chết
  for (const a of [...S.animals]) if (day - a.born >= AGE.max || (day - a.born >= AGE.old && rng() < 0.3)) { S.animals.splice(S.animals.indexOf(a), 1); ev(S, `${SP[a.sp].icon} Một con ${SP[a.sp].name.toLowerCase()} già đã mất.`); }
  // trứng: nở hoặc hỏng
  for (const e of [...S.eggs]) {
    const age = day - e.laid;
    if (e.fertile && age >= 1) {
      if (S.animals.filter((a) => a.sp === e.sp).length >= hatchLimit(S, e.sp)) { if (age >= 5) S.eggs.splice(S.eggs.indexOf(e), 1); continue; } // chuồng đầy: chờ chỗ trống
      S.eggs.splice(S.eggs.indexOf(e), 1);
      if (rng() < (S.builds.oap ? 1 : 0.6)) {
        const m = S.animals.filter((a) => a.sp === e.sp && a.sex === 'm').length, f = S.animals.filter((a) => a.sp === e.sp && a.sex === 'f').length;
        addAnimal(S, e.sp, m === 0 ? 'm' : f < 2 * m ? 'f' : rng() < 0.25 ? 'm' : 'f', e.genome, day); S.stats.hatched++; // giữ tỉ lệ trống/mái để đàn không tuyệt
        ev(S, `🐣 Một con ${SP[e.sp].name.toLowerCase()} con vừa nở!`);
      }
    } else if (!e.fertile && age >= 3) S.eggs.splice(S.eggs.indexOf(e), 1);
  }
  // đẻ trứng
  const ph = phaseAt(n);
  for (const sp of Object.keys(SP)) {
    const males = adultsOf(S, sp, 'm', day);
    for (const a of adultsOf(S, sp, 'f', day)) {
      const fed = t < S.fedUntil || (sp === 'duck' && ph === 3 && avg(a.genome, 'water') >= 5);
      if (!fed || S.eggs.filter((e) => e.sp === sp).length >= nestCap(S)) continue;
      let p = 0.35 + 0.5 * (avg(a.genome, 'eggs') / 9);
      if (w.weather === 'chuong' && !S.builds.chuong) p *= 0.7;
      if (ph === 0 && avg(a.genome, 'size') >= 6 && !S.builds.lu) p *= 0.8;
      if (lifeStage(a, day) === 'old') p *= 0.5;
      if (rng() >= p) continue;
      // không có trống trong chuồng: 50% có trống nhà hàng xóm sang "giúp" (gen mới từ ngoài vào, tránh tuyệt chủng)
      const fg = males.length ? males[Math.floor(rng() * males.length)].genome : rng() < 0.5 ? founder(rng) : null;
      S.eggs.push({ id: S.nextId++, sp, laid: day, fertile: !!fg, genome: fg ? cross(a.genome, fg, rng) : a.genome });
    }
  }
  // phân + ủ phân
  gain(S, 'phan', Math.ceil(S.animals.filter((a) => lifeStage(a, day) !== 'young').length / 3));
  if (S.builds.phan && day % 2 === 0 && S.res.phan >= 2) { S.res.phan -= 2; gain(S, 'phanu', 1); }
};

const stepOnce = (S, n) => {
  const w = S.world, t = stepTime(S, n), day = dayAt(n), sod = n % DAY_STEPS, rng = rngAt(w.seed, n), ph = phaseAt(n);
  w.weather = weatherOf(w.seed, day);
  S.beds.forEach((b) => b && growBed(b, t));
  if (n % PHASE_STEPS === 0) ev(S, `${PHASES[ph].icon} ${PHASES[ph].name}: ${PHASES[ph].tip}`);
  if (sod === 0) dayStart(S, n, t, day, rng);
  const rainy = w.weather === 'mua';
  if (sod === 3 && rainy) { // mưa chiều: tưới vườn, đầy lu
    S.beds.forEach((b) => { if (b) b.waterUntil = Math.max(b.waterUntil, t + 4 * STEP_MS); });
    S.lu = Math.min(6 * (S.builds.lu || 0), S.lu + 2);
  }
  // ngập vườn thấp
  const lv = levelAt(n);
  S.beds.forEach((b, i) => {
    if (!b) return;
    if (i >= 3 && !S.builds.nen?.[i] && lv > FLOOD_LEVEL) { b.flood = (b.flood || 0) + 1; if (b.flood >= 3) { S.beds[i] = null; ev(S, '🌊 Nước dâng làm hỏng một luống rau. Đắp nền cao để chống ngập.'); } } else if (b.flood) b.flood = 0;
  });
  // bệnh và chọn lọc
  const wetK = (ph === 2 ? 1 : ph === 0 ? 0 : 0.5) + (rainy && sod >= 3 && sod <= 5 ? 0.5 : 0); // độ ẩm: mùa mưa nặng nhất, mùa khô không bệnh
  for (const a of [...S.animals]) {
    const r = avg(a.genome, 'resist');
    if (a.sickUntil) {
      if (n < a.sickUntil) continue;
      a.sickUntil = 0;
      const lastFemale = lifeStage(a, day) !== 'young' && adultsOf(S, a.sp, a.sex, day).length === 1; // con trưởng thành cuối cùng của giới đó thì không chết vì bệnh
      if (!lastFemale && rng() < 0.6 * (1 - r / 9)) { S.animals.splice(S.animals.indexOf(a), 1); ev(S, `🤒 Một con ${SP[a.sp].name.toLowerCase()} ốm không qua khỏi.`); }
      continue;
    }
    let p = wetK && !S.noDisease ? 0.05 * wetK * (1 - r / 9) * (S.builds.chuong ? 0.4 : 1) : 0;
    if (a.sp === 'duck' && ph === 3 && avg(a.genome, 'water') < 3) p += 0.01;
    if (p && rng() < p) a.sickUntil = n + DAY_STEPS;
  }
  w.step = n;
};

export const advance = (S, now = Date.now()) => {
  const target = Math.floor(stepF(S, now)), w = S.world;
  if (target - w.step > MAX_CATCHUP) { // vắng quá lâu: phần vượt trần coi như thế giới "ngủ", đàn không già đi
    const skip = target - MAX_CATCHUP - w.step, days = Math.floor(skip / DAY_STEPS);
    S.animals.forEach((a) => { a.born += days; if (a.sickUntil) a.sickUntil += skip; }); S.eggs.forEach((e) => { e.laid += days; });
    w.step = target - MAX_CATCHUP;
  }
  while (w.step < target) stepOnce(S, w.step + 1);
};

export { founder };
