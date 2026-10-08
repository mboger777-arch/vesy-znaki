'use strict';
// ===== Десять фонарей — ядро: экран, ввод, звук, рисование =====
const TILE = 64;
// true, если в assets лежит logo.png (объёмный логотип для заголовка); иначе логотип рисуется шрифтом
const HAS_LOGO = true;
const G = {
  W: 1280, H: 720, scale: 1, ox: 0, oy: 0, dpr: 1, t: 0, rt: 0,
  scene: null, muted: false, assertFails: [], touchUI: false, portrait: false,
  timeScale: 1, freeze: false, tasks: [], bubbles: [], particles: [], shake: 0,
  trans: null, ui: [], zoom: 1.3, baseZoom: 1.3,
};
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function check(cond, msg) {
  if (!cond) { G.assertFails.push(String(msg)); }
  console.assert(!!cond, 'ПРОВЕРКА: ' + msg);
  return !!cond;
}

// ---------- RNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const URLP = new URLSearchParams(location.search);
G.seed = URLP.has('seed') ? (parseInt(URLP.get('seed'), 10) || 1) : ((Date.now() % 100000) + 1);
const fx = mulberry32(G.seed ^ 0x5bd1e995);           // только эффекты (не математика)
function frand(a = 0, b = 1) { return a + (b - a) * fx(); }
function mathRngFor(level) { return mulberry32(G.seed * 7919 + level * 104729 + 17); }
function rint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function shuffle(rng, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function makeChoices(rng, answer, lo = 0, hi = 10) {
  const set = new Set([answer]);
  const near = [];
  for (let d = 1; d <= 4; d++) { near.push(answer - d, answer + d); }
  shuffle(rng, near);
  near.sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer) + (rng() - 0.5) * 2.5);
  for (const v of near) { if (set.size >= 3) break; if (v >= lo && v <= hi) set.add(v); }
  const res = shuffle(rng, [...set]);
  check(res.length === 3 && res.filter(v => v === answer).length === 1 && new Set(res).size === 3 && res.every(v => v >= lo && v <= hi), 'выбор ответов корректен ' + res + ' ответ ' + answer);
  return res;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
const bulkaW = n => plural(n, 'булочка', 'булочки', 'булочек');

// ---------- Экран ----------
function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.cw = cw; G.ch = ch;
  G.portrait = ch > cw * 1.05;
  const H = 720;
  let W = Math.round(H * cw / ch);
  W = clamp(W, 1100, 1600);
  G.W = W; G.H = H;
  G.scale = Math.min(cw / W, ch / H);
  G.ox = (cw - W * G.scale) / 2; G.oy = (ch - H * G.scale) / 2;
  canvas.width = Math.round(cw * G.dpr); canvas.height = Math.round(ch * G.dpr);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  if (G.portrait && typeof Voice !== 'undefined') Voice.stop();
  // поворот/смена размера посреди уровня: кадр вопроса пересчитывается под новый экран, рельеф перерисовывается чётко
  const S = G.scene;
  if (S && S.isPlay) {
    if (S.cam.lock && S.cam.lock.make) S.cam.lock = S.cam.lock.make();
    if (S.lockAway && S.lockAway.make) S.lockAway = S.lockAway.make();
    clearTimeout(G.reTerrain); G.reTerrain = setTimeout(() => { if (G.scene === S) renderTerrain(S.L); }, 250);
  }
}
window.addEventListener('resize', resize);
resize();

// ---------- Картинки ----------
const IMG = {};
const IMG_LIST = ['bg_day.jpg', 'bg_eve.jpg', 'bg_day_soft.jpg', 'bg_day_soft_b.jpg', 'bg_eve_soft.jpg', 'arch_idle', 'arch_point', 'arch_worried', 'arch_cheer', 'bublik', 'iskra_fall', 'iskra_hero', 'iskra_idle', 'iskra_jump', 'iskra_runA', 'iskra_runB', 'iskra_runC',
  'shchelk_carry', 'shchelk_down', 'shchelk_front', 'shchelk_laugh', 'shchelk_up', 't_basket', 't_bun', 't_bush', 't_crate', 't_fence', 't_flag', 't_grass',
  't_lamp_off', 't_lamp_on', 't_plank', 't_star', 't_stone', 'tex_dirt', 'tex_grass', 'tex_stone'];
function loadImages() {
  return Promise.all(IMG_LIST.map(n => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { IMG[n.replace(/\.jpg$/, '')] = im; res(); };
    im.onerror = () => rej(new Error('не загрузилась картинка ' + n));
    im.src = 'assets/' + (n.endsWith('.jpg') ? n : n + '.png');
  })));
}
// якоря кадров Искры (центр головы по X), из обработки листа
const ISKRA_AX = { iskra_idle: 81.4, iskra_runA: 79.8, iskra_runB: 79.0, iskra_runC: 81.0, iskra_jump: 107.0, iskra_fall: 100.5 };

// ---------- Ввод ----------
const Input = { left: false, right: false, jumpHeld: false, jumpPresses: 0, k: {}, touch: { left: false, right: false, jump: false }, ptr: new Map() };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump' };
window.addEventListener('keydown', e => {
  Sound.unlock();
  const a = KEYMAP[e.code];
  if (a) {
    e.preventDefault();
    if (a === 'jump' && !Input.k.jump) Input.jumpPresses++;
    Input.k[a] = true;
  }
  if (e.code === 'Enter' || e.code === 'NumpadEnter') { if (G.scene && G.scene.onEnter) G.scene.onEnter(); }
  if (e.code === 'KeyM') Sound.toggle();
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) { e.preventDefault(); Input.k[a] = false; } });
window.addEventListener('blur', () => { Input.k = {}; Input.ptr.clear(); updTouch(); });
function toLogical(cx, cy) { return { x: (cx - G.ox) / G.scale, y: (cy - G.oy) / G.scale }; }
function touchZone(p) {
  if (!G.touchUI || !G.scene || !G.scene.isPlay) return null;
  const B = touchButtons();
  for (const b of B) { if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.35) return b.id; }
  if (p.y > G.H * 0.45) { if (p.x < 210) return 'left'; if (p.x < 400) return 'right'; if (p.x > G.W - 330) return 'jump'; }
  return null;
}
function touchButtons() {
  return [
    { id: 'left', x: 110, y: G.H - 110, r: 74 },
    { id: 'right', x: 285, y: G.H - 110, r: 74 },
    { id: 'jump', x: G.W - 140, y: G.H - 125, r: 92 },
  ];
}
function updTouch() {
  const t = { left: false, right: false, jump: false };
  for (const z of Input.ptr.values()) if (z) t[z] = true;
  if (t.jump && !Input.touch.jump) Input.jumpPresses++;
  Input.touch = t;
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sound.unlock();
  if (e.pointerType === 'touch') G.touchUI = true;
  const p = toLogical(e.clientX, e.clientY);
  // сначала нарисованные кнопки интерфейса
  for (let i = G.ui.length - 1; i >= 0; i--) {
    const u = G.ui[i];
    if (p.x >= u.x && p.x <= u.x + u.w && p.y >= u.y && p.y <= u.y + u.h) { u.press = G.rt; Sound.click(); u.fn(); return; }
  }
  // коснулся блока с ответом — Искра сама подбегает и бьёт его головой (удобно пальцем и мышкой)
  if (G.scene && G.scene.tapBlock && G.scene.tapBlock(p.x, p.y)) return;
  const z = touchZone(p);
  if (z) { Input.ptr.set(e.pointerId, z); updTouch(); try { canvas.setPointerCapture(e.pointerId); } catch (_) { } return; }
  if (G.scene && G.scene.onTap) G.scene.onTap(p.x, p.y);
}, { passive: false });
canvas.addEventListener('pointermove', e => {
  if (!Input.ptr.has(e.pointerId)) return;
  const p = toLogical(e.clientX, e.clientY);
  const z = touchZone(p);
  Input.ptr.set(e.pointerId, z); updTouch();
});
function ptrEnd(e) { if (Input.ptr.has(e.pointerId)) { Input.ptr.delete(e.pointerId); updTouch(); } }
canvas.addEventListener('pointerup', ptrEnd);
canvas.addEventListener('pointercancel', ptrEnd);
canvas.addEventListener('contextmenu', e => e.preventDefault());
if ((window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0) G.touchUI = true;
function readInput() {
  Input.left = !!(Input.k.left || Input.touch.left);
  Input.right = !!(Input.k.right || Input.touch.right);
  Input.jumpHeld = !!(Input.k.jump || Input.touch.jump);
}

// ---------- Звук (WebAudio синтез) ----------
const Sound = {
  ctx: null, master: null, sfx: null, mus: null, musOn: false, nextT: 0, step: 0, timer: null, mode: 'day',
  unlock() {
    Voice.unlock();
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = G.muted ? 0 : 0.9; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.16; this.mus.connect(this.master);
    const len = this.ctx.sampleRate * 1.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic();
  },
  toggle() {
    G.muted = !G.muted; try { localStorage.setItem('vz_plat_muted', G.muted ? '1' : '0'); } catch (_) { }
    if (this.master) this.master.gain.setTargetAtTime(G.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    if (G.muted) Voice.stop();
  },
  tone(f, dur, type = 'sine', vol = 0.3, t0 = 0, f2 = null, dest = null) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, freq = 1200, t0 = 0, type = 'lowpass', q = 0.8, f2 = null, dest = null) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfx); s.start(t); s.stop(t + dur + 0.05);
  },
  jump() { this.tone(330, 0.16, 'square', 0.07, 0, 720); this.tone(660, 0.12, 'sine', 0.08, 0.02, 990); },
  land(k = 0.5) { this.noise(0.08, 0.04 + 0.07 * k, 500); this.tone(120, 0.09, 'sine', 0.05 + 0.08 * k, 0, 70); },
  sparkle() { this.tone(1318, 0.12, 'sine', 0.16); this.tone(1976, 0.25, 'sine', 0.13, 0.07); this.tone(2637, 0.2, 'triangle', 0.05, 0.12); },
  light(n) { const sc = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093]; const f = sc[clamp(n, 0, 10)]; this.tone(f, 0.35, 'triangle', 0.18); this.tone(f * 2, 0.4, 'sine', 0.07, 0.05); this.noise(0.25, 0.04, 6000, 0, 'highpass'); },
  bump() { this.tone(140, 0.14, 'triangle', 0.3, 0, 90); this.noise(0.06, 0.12, 900); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => { this.tone(f, 0.35, 'triangle', 0.16, i * 0.09); this.tone(f * 2, 0.3, 'sine', 0.05, i * 0.09); }); },
  wrong() { this.tone(392, 0.22, 'sine', 0.16, 0, 300); this.tone(300, 0.3, 'sine', 0.14, 0.18, 240); },
  fanfare() { const m = [[523, 0], [659, .12], [784, .24], [1047, .36], [784, .55], [1047, .68]]; m.forEach(([f, t]) => { this.tone(f, 0.3, 'square', 0.06, t); this.tone(f, 0.4, 'triangle', 0.14, t); }); this.tone(1319, 0.9, 'triangle', 0.12, 0.85); this.tone(1047, 0.9, 'sine', 0.1, 0.85); },
  pop() { this.tone(880, 0.08, 'sine', 0.15, 0, 1500); },
  count(i) { const sc = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397]; this.tone(sc[clamp(i, 0, 10)], 0.22, 'triangle', 0.2); },
  puff() { this.noise(0.35, 0.18, 1600, 0, 'bandpass', 0.6, 300); this.tone(500, 0.2, 'sine', 0.08, 0, 200); },
  splash() { this.noise(0.45, 0.2, 2500, 0, 'bandpass', 0.7, 400); },
  wind() { this.noise(1.8, 0.16, 400, 0, 'bandpass', 1.4, 1400); this.noise(1.4, 0.08, 900, 0.3, 'bandpass', 2, 300); },
  blowout() { this.noise(0.25, 0.09, 1200, 0, 'bandpass', 1, 400); this.tone(600, 0.18, 'sine', 0.06, 0, 300); },
  thunder() { this.noise(2.2, 0.12, 180, 0, 'lowpass', 0.5, 60); },
  bounce() { this.tone(260, 0.2, 'square', 0.06, 0, 780); this.tone(520, 0.18, 'sine', 0.1, 0.02, 1200); },
  // сорока: хриплое «ча-ча-ча» (шум через полосовой фильтр + писк вверх)
  laugh() { [0, .11, .22, .33].forEach((t, i) => { this.noise(0.07, 0.07, 2600 - i * 150, t, 'bandpass', 6, 1800); this.tone(1500 + i * 60, 0.06, 'square', 0.025, t, 1100); }); },
  // сорока: щебет «чир-рик» (два быстрых свиста вверх)
  chirp() { this.tone(2200, 0.07, 'sine', 0.07, 0, 3600); this.tone(2600, 0.09, 'sine', 0.06, 0.09, 4200); this.noise(0.05, 0.03, 4000, 0.02, 'bandpass', 8); },
  // кот Бублик: мурлыканье — низкий пульсирующий рокот ~24 Гц
  purr(dur = 0.9) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 260; fl.Q.value = 1.2;
    const am = c.createGain(); am.gain.value = 0; const lfo = c.createOscillator(); lfo.frequency.value = 24; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(am); am.connect(g); g.connect(this.sfx); s.start(t); lfo.start(t); s.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  },
  // Искра: «Ура!» — заранее записанный нейроголосом клип (работает и с file://)
  ura() { if (G.muted) return; try { if (!this.uraEl) this.uraEl = new Audio('assets/sfx/ura.mp3'); this.uraEl.currentTime = 0; this.uraEl.volume = 0.9; Voice.played.push({ k: 'sfx|ура', f: '../sfx/ura.mp3', t: performance.now() / 1000, d: 0.55, muted: false, sfx: true }); const p = this.uraEl.play(); if (p && p.catch) p.catch(() => { }); } catch (_) { } },
  click() { this.tone(700, 0.06, 'sine', 0.12, 0, 900); },
  whoosh() { this.noise(0.4, 0.1, 600, 0, 'bandpass', 1.2, 2400); },
  // новые звуки: светлячок, пружинящий стог, плот, подъёмник, лужа, ветерок, секрет
  firefly(k = 0) { const f = 1319 * Math.pow(2, clamp(k, 0, 12) / 12); this.tone(f, 0.16, 'sine', 0.13); this.tone(f * 1.5, 0.22, 'sine', 0.07, 0.06); this.tone(f * 2, 0.18, 'triangle', 0.03, 0.1); },
  boing() { this.tone(150, 0.38, 'sine', 0.26, 0, 640); this.tone(300, 0.3, 'triangle', 0.07, 0.03, 980); this.noise(0.22, 0.07, 3200, 0, 'highpass'); },
  raftLand() { this.tone(170, 0.16, 'triangle', 0.2, 0, 110); this.noise(0.4, 0.09, 900, 0.03, 'lowpass', 0.8, 300); },
  raftLap() { this.noise(0.5, 0.035, 650, 0, 'bandpass', 1.4, 380); },
  liftTick() { this.tone(1500, 0.025, 'square', 0.025); this.noise(0.03, 0.04, 4200, 0, 'highpass'); },
  liftCreak() { this.tone(330, 0.32, 'sawtooth', 0.018, 0, 270); this.tone(250, 0.26, 'triangle', 0.03, 0.08, 300); },
  splashSmall() { this.noise(0.2, 0.08, 1900, 0, 'bandpass', 1, 600); this.tone(700, 0.08, 'sine', 0.04, 0, 1100); },
  gust() { this.noise(1.7, 0.07, 450, 0, 'bandpass', 1.3, 1300); this.noise(1.2, 0.04, 1200, 0.3, 'bandpass', 2, 500); },
  secret() { [784, 988, 1175, 1568, 1976].forEach((f, i) => { this.tone(f, 0.4, 'triangle', 0.13, i * 0.08); this.tone(f * 2, 0.3, 'sine', 0.04, i * 0.08); }); this.noise(0.9, 0.04, 7000, 0.2, 'highpass'); },
  duck(on) { if (!this.ctx || !this.mus) return; this.mus.gain.setTargetAtTime(on ? 0.06 : 0.16, this.ctx.currentTime, on ? 0.08 : 0.4); },
  setMode(m) { this.pending = m !== this.mode ? m : null; if (!this.ctx) { this.mode = m; this.pending = null; } },
  startMusic() {
    if (this.timer) return;
    this.nextT = this.ctx.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  },
  // по настроению: день — бодро, вечер — тепло и тише, гроза — в миноре, но не страшно, финал — праздник
  SONGS: {
    day: { bpm: 104, mel: [7, null, 9, 7, 4, null, 2, 4, 7, null, 12, null, 9, 7, 9, null, 4, null, 7, 4, 2, null, 0, 2, 4, 7, 9, 7, 4, 2, 0, null],
      bass: [0, 0, -5, -5, -7, -7, -5, -5], ch: [[0, 4, 7], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2]], kick: [0, 4], hat: true, arp: false, clap: false },
    eve: { bpm: 88, mel: [4, null, 7, 4, 2, null, 0, 2, 4, null, 9, null, 7, 4, 2, null, 0, null, 4, 2, -3, null, -5, -3, 0, 2, 4, 2, 0, -3, 0, null],
      bass: [-3, -3, -7, -7, -10, -10, -5, -5], ch: [[-3, 0, 4], [-7, -3, 0], [-10, -7, -3], [-5, -1, 2]], kick: [], hat: false, arp: true, clap: false, shaker: true },
    storm: { bpm: 96, mel: [-3, null, 0, null, 4, null, 2, 0, -1, null, 0, -1, -3, null, null, null, 5, null, 4, 2, 0, null, 2, null, 4, null, 7, 5, 4, null, null, null],
      bass: [-3, -3, -7, -7, -5, -5, -8, -8], ch: [[-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-8, -4, -1]], kick: [0, 3, 4], hat: false, arp: true, clap: false, tom: true },
    // пещера — таинственно, капли; закат — торжественно-тёплый подъём; мост — бодро, «водный» ритм
    cave: { bpm: 84, mel: [9, null, null, 7, 4, null, 7, null, 9, null, 12, null, 11, null, 7, null, 4, null, null, 2, 4, null, 7, null, 9, null, 7, 4, 2, null, -1, null],
      bass: [-3, -3, -8, -8, -5, -5, -10, -10], ch: [[-3, 0, 4], [-8, -4, -1], [-5, -1, 2], [-10, -7, -3]], kick: [0], hat: false, arp: true, clap: false, drip: true },
    river: { bpm: 112, mel: [0, 4, 7, null, 9, 7, 4, null, 5, 9, 12, null, 9, 5, 2, null, 4, 7, 11, null, 12, 11, 7, null, 5, 4, 2, 4, 0, null, null, null],
      bass: [0, 0, 5, 5, 7, 7, 0, 0], ch: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], kick: [0, 3, 6], hat: true, arp: false, clap: false, shaker: true },
    sunset: { bpm: 96, mel: [4, null, 7, null, 12, null, 11, 9, 7, null, 9, null, 5, null, null, null, 2, null, 5, null, 9, null, 7, 5, 4, null, 7, null, 12, null, null, null],
      bass: [0, 0, -3, -3, -7, -7, -5, -5], ch: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], kick: [0, 4], hat: false, arp: true, clap: false, shaker: true },
    finale: { bpm: 124, mel: [0, null, -1, 0, 4, null, 0, null, 2, null, 0, -1, -3, null, -5, null, -3, null, -1, 0, 2, null, 4, null, 7, null, 4, 2, 0, null, 12, null],
      bass: [0, 0, -3, -3, -7, -7, -5, -5], ch: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], kick: [0, 2, 4, 6], hat: true, arp: true, clap: true },
  },
  schedule() {
    if (!this.ctx) return;
    const C = 261.63, N = s => C * Math.pow(2, s / 12), M = this.mus;
    while (this.nextT < this.ctx.currentTime + 0.25) {
      const s = this.step % 32;
      if (s === 0 && this.pending) { this.mode = this.pending; this.pending = null; }
      const S = this.SONGS[this.mode] || this.SONGS.day, spb = 60 / S.bpm / 2; // восьмые
      const t0 = this.nextT - this.ctx.currentTime;
      const m = S.mel[s], bar = (s / 8) | 0, beat = s % 8;
      if (m !== null) { this.tone(N(m + 12), spb * 1.6, 'triangle', 0.2, t0, null, M); this.tone(N(m + 24), spb * 0.9, 'sine', 0.035, t0, null, M); }
      if (s % 4 === 0) this.tone(N(S.bass[(s / 4) | 0] - 12), spb * 3.2, 'sine', 0.3, t0, null, M);
      if (beat === 0) for (const n of S.ch[bar]) this.tone(N(n), spb * 7.5, 'triangle', 0.035, t0, null, M);
      else if (s % 2 === 1 && !S.arp) this.tone(N(S.ch[bar][1] + 12), spb * 0.6, 'triangle', 0.05, t0, null, M);
      if (S.arp) { const ch = S.ch[bar]; this.tone(N(ch[beat % 3] + 24), spb * 0.8, 'sine', 0.045, t0, null, M); }
      if (S.kick.includes(beat)) { this.tone(110, 0.16, 'sine', 0.42, t0, 45, M); }
      if (S.hat && s % 2 === 1) this.noise(0.04, 0.05, 7000, t0, 'highpass', 0.7, null, M);
      if (S.shaker && s % 2 === 1) this.noise(0.06, 0.025, 5000, t0, 'highpass', 0.7, null, M);
      if (S.clap && (beat === 2 || beat === 6)) this.noise(0.1, 0.12, 1600, t0, 'bandpass', 1.1, null, M);
      if (S.drip && (s === 5 || s === 19 || s === 27)) { this.tone(N(24 + (s % 7)), 0.09, 'sine', 0.05, t0, N(31), M); }
      if (S.tom && beat === 7 && bar % 2 === 1) { this.tone(160, 0.2, 'sine', 0.22, t0, 90, M); this.tone(130, 0.22, 'sine', 0.2, t0 + spb * 0.5, 75, M); }
      this.nextT += spb; this.step++;
    }
  },
};
// ---------- Голос: живая озвучка (заранее записанные нейроголоса, assets/voice/*.mp3) ----------
// Никакого системного синтеза речи. Реплика → файл по таблице VOICE_FILES (js/voice_manifest.js).
// Один общий <audio>: так звук работает и с file://, и на iPhone (элемент «разблокирован» первым касанием).
// Пока говорит герой — музыка тише. Новая реплика обрывает прежнюю. Выключается кнопкой звука и ?voice=0.
const VOICED = { arch: 1, bublik: 1, ponchik: 1, shchelk: 1, iskra: 1, narrator: 1 };
const Voice = {
  enabled: URLP.get('voice') !== '0', el: null, cur: null, missing: [], played: [], endT: 0, unlocked: false,
  SIL: 'data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAzAAAAAAAAAAAAAAD/84TAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAACoABtbW1tbW1tbW1tbW1tbW1tbW1tkpKSkpKSkpKSkpKSkpKSkpKSkpK2tra2tra2tra2tra2tra2tra2ttvb29vb29vb29vb29vb29vb29vb//////////////////////////8AAAAATGF2YzYxLjE5AAAAAAAAAAAAAAAAJARQAAAAAAAAAqC9P8vrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80TEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy7/80TEUwAAA0gAAAAAMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy7/80TEpgAAA0gAAAAAMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80TErAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80TErAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=',
  init() { try { this.el = new Audio(); this.el.preload = 'auto'; this.el.addEventListener('ended', () => this.onEnd()); this.el.addEventListener('error', () => { if (this.cur) { console.warn('VOICE LOAD FAIL: ' + this.cur); this.onEnd(); } }); } catch (_) { } },
  unlock() {
    if (this.unlocked || !this.el) return; this.unlocked = true;
    try { if (!this.cur) { this.el.src = this.SIL; const p = this.el.play(); if (p && p.catch) p.catch(() => { }); } } catch (_) { }
  },
  get(kind, text) { return (typeof VOICE_FILES !== 'undefined' && VOICE_FILES[kind + '|' + text]) || null; },
  speak(text, kind) {
    const v = this.get(kind, text);
    if (!v) { this.missing.push(kind + '|' + text); console.warn('VOICE MISSING: ' + kind + '|' + text); return 0; }
    this.played.push({ k: kind + '|' + text, f: v[0], t: performance.now() / 1000, d: v[1], muted: !!(G.muted || !this.enabled) });
    if (this.played.length > 400) this.played.shift();
    this.endT = G.t + v[1];
    if (!this.enabled || G.muted || !this.el) return v[1];
    try {
      this.el.pause(); this.cur = v[0];
      this.el.src = 'assets/voice/' + v[0]; this.el.currentTime = 0; this.el.volume = 1;
      const p = this.el.play(); if (p && p.catch) p.catch(() => { });
      Sound.duck(true);
    } catch (_) { }
    return v[1];
  },
  busy() { return G.t < this.endT; },
  onEnd() { this.cur = null; Sound.duck(false); },
  stop() { this.endT = 0; if (this.el && this.cur) { try { this.el.pause(); } catch (_) { } } this.cur = null; Sound.duck(false); },
};
Voice.init();
document.addEventListener('visibilitychange', () => { if (document.hidden) Voice.stop(); });
// ждать в сценарии: не меньше t секунд и пока герой договорит
function vwait(t = 0) { const t0 = G.t; return () => G.t - t0 >= t && !Voice.busy() && G.bubbles.every(b => b.t >= b.dur - 0.4); }
try { G.muted = localStorage.getItem('vz_plat_muted') === '1'; } catch (_) { }

// ---------- Рисование ----------
const FONT = '"Pangolin"';
function font(size, w = 900) { return `${w} ${size}px ${FONT}`; }
function rr(c, x, y, w, h, r) {
  const R = typeof r === 'number' ? [r, r, r, r] : r;
  c.beginPath();
  c.moveTo(x + R[0], y); c.lineTo(x + w - R[1], y); c.arcTo(x + w, y, x + w, y + R[1], R[1]);
  c.lineTo(x + w, y + h - R[2]); c.arcTo(x + w, y + h, x + w - R[2], y + h, R[2]);
  c.lineTo(x + R[3], y + h); c.arcTo(x, y + h, x, y + h - R[3], R[3]);
  c.lineTo(x, y + R[0]); c.arcTo(x, y, x + R[0], y, R[0]); c.closePath();
}
function txt(c, s, x, y, o = {}) {
  c.save();
  c.font = font(o.size || 32, o.w || 900);
  c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
  c.lineJoin = 'round'; c.miterLimit = 2;
  if (o.shadow) { c.fillStyle = o.shadow; c.fillText(s, x + (o.sx || 0), y + (o.sy || 4)); }
  if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.sw || 6; c.strokeText(s, x, y); }
  c.fillStyle = o.fill || '#3b2412'; c.fillText(s, x, y);
  c.restore();
}
function wrapText(c, s, maxW) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
// строка с подсветкой чисел и знаков
function richLine(c, s, x, y, size, align = 'center', base = '#3b2412', hi = '#e8590c') {
  c.font = font(size, 900);
  const parts = s.split(/(\d+|[+−=?])/).filter(p => p !== '');
  let total = 0; for (const p of parts) total += c.measureText(p).width;
  let cx = align === 'center' ? x - total / 2 : x;
  c.textAlign = 'left'; c.textBaseline = 'middle';
  for (const p of parts) {
    const isHi = /^(\d+|[+−=?])$/.test(p);
    c.fillStyle = isHi ? hi : base;
    c.fillText(p, cx, y); cx += c.measureText(p).width;
  }
}
function woodPanel(c, x, y, w, h, r = 18, seed = 1) {
  c.save();
  c.fillStyle = 'rgba(40,20,5,0.35)'; rr(c, x + 3, y + 7, w, h, r); c.fill();
  rr(c, x, y, w, h, r); c.fillStyle = '#5b3313'; c.fill();
  rr(c, x + 4, y + 4, w - 8, h - 8, r - 3);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d69a5a'); g.addColorStop(0.5, '#b8773b'); g.addColorStop(1, '#9a5f2a');
  c.fillStyle = g; c.fill();
  c.clip();
  // волокна
  const rng = mulberry32(seed * 977 + 3);
  c.strokeStyle = 'rgba(90,45,10,0.28)'; c.lineWidth = 2;
  for (let i = 0; i < Math.max(3, h / 14); i++) {
    const yy = y + 8 + rng() * (h - 16); c.beginPath(); c.moveTo(x, yy);
    for (let xx = x; xx <= x + w; xx += 30) c.lineTo(xx, yy + Math.sin(xx * 0.03 + i) * 2.5 + (rng() - 0.5) * 1.5);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,240,200,0.35)'; rr(c, x + 8, y + 7, w - 16, Math.min(10, h * 0.18), 6); c.fill();
  c.restore();
  // гвоздики
  c.fillStyle = '#6e4a24';
  for (const [nx, ny] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) {
    if (w < 120 && ny > y + 20) continue;
    c.beginPath(); c.arc(nx, ny, 4.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,230,180,0.6)'; c.beginPath(); c.arc(nx - 1.3, ny - 1.3, 1.6, 0, 7); c.fill(); c.fillStyle = '#6e4a24';
  }
}
function goldButton(c, x, y, w, h, label, size = 44, pulse = 0, col = 'gold') {
  c.save();
  const s = 1 + pulse; c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-w / 2, -h / 2);
  const r = h / 2;
  c.fillStyle = 'rgba(60,30,0,0.35)'; rr(c, 4, 10, w, h, r); c.fill();
  rr(c, 0, 0, w, h, r); c.fillStyle = col === 'gold' ? '#8a4b00' : '#1f5e17'; c.fill();
  rr(c, 4, 4, w - 8, h - 10, r - 4);
  const g = c.createLinearGradient(0, 0, 0, h);
  if (col === 'gold') { g.addColorStop(0, '#fff3a6'); g.addColorStop(0.45, '#ffc928'); g.addColorStop(1, '#f08c00'); }
  else { g.addColorStop(0, '#d8ff9c'); g.addColorStop(0.45, '#7ed957'); g.addColorStop(1, '#2f9e44'); }
  c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)'; rr(c, 16, 8, w - 32, h * 0.28, h * 0.14); c.fill();
  txt(c, label, w / 2, h / 2 - 1, { size, fill: '#fff', stroke: col === 'gold' ? '#8a4b00' : '#1f5e17', sw: 9, shadow: 'rgba(80,40,0,0.35)', sy: 4 });
  c.restore();
}
function addButton(x, y, w, h, fn, id = '') { G.ui.push({ x, y, w, h, fn, id, press: -9 }); }
function drawStar(c, x, y, r, rot = 0, pts = 5, inner = 0.48) {
  c.beginPath();
  for (let i = 0; i < pts * 2; i++) { const a = rot + i * Math.PI / pts - Math.PI / 2; const rad = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  c.closePath();
}
// свечение: заранее нарисованный мягкий круг на цвет (быстро даже на телефоне)
const GLOW_CACHE = new Map();
// картинка с CSS-фильтром, отрисованная один раз (фильтр на каждом кадре — дорого)
const FILT = new Map();
function filteredImg(im, f) {
  const key = (im.src || im.id || '') + '|' + im.width + 'x' + im.height + '|' + f;
  let cv = FILT.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d'); g.filter = f; g.drawImage(im, 0, 0); g.filter = 'none';
  FILT.set(key, cv); return cv;
}
function glowSprite(col) {
  let cv = GLOW_CACHE.get(col);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g2 = cv.getContext('2d'), g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = g; g2.fillRect(0, 0, 128, 128);
    GLOW_CACHE.set(col, cv);
  }
  return cv;
}
function glow(c, x, y, r, col, a = 1) {
  if (a <= 0 || r <= 0) return;
  const pa = c.globalAlpha;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = pa * Math.min(1, a);
  c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); c.restore();
}
function drawSprite(c, im, x, yBottom, h, flip = false, sx = 1, sy = 1, ax = null) {
  const s = h / im.height; const w = im.width * s;
  const axp = (ax === null ? im.width / 2 : ax) * s;
  c.save(); c.translate(x, yBottom); c.scale((flip ? -1 : 1) * sx, sy);
  c.drawImage(im, -axp, -h, w, h); c.restore();
}
function cloud(c, x, y, s, a = 1) {
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  const blobs = [[-50, 8, 34], [-15, -12, 44], [28, -4, 38], [58, 12, 26], [0, 14, 36]];
  c.fillStyle = 'rgba(120,150,200,0.25)';
  for (const [bx, by, br] of blobs) { c.beginPath(); c.arc(bx + 4, by + 8, br, 0, 7); c.fill(); }
  for (const [bx, by, br] of blobs) {
    const g = c.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe9fb'); c.fillStyle = g;
    c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
  }
  c.restore();
}

// ---------- Частицы ----------
function spawn(p) { G.particles.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, t: 0, size: 10, rot: 0, vr: 0, drag: 0, col: '#fff', type: 'spark' }, p)); }
function sparkBurst(x, y, n = 12, col = '#fff4a0', sp = 260) {
  for (let i = 0; i < n; i++) { const a = frand(0, Math.PI * 2), v = frand(sp * 0.3, sp); spawn({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 300, life: frand(0.5, 0.9), size: frand(6, 13), col, drag: 2, rot: frand(0, 3), vr: frand(-4, 4) }); }
}
function dust(x, y, n = 6, dir = 0) {
  for (let i = 0; i < n; i++) spawn({ type: 'dust', x: x + frand(-14, 14), y: y - frand(0, 6), vx: frand(-90, 90) + dir * 80, vy: frand(-70, -20), g: -20, life: frand(0.35, 0.6), size: frand(8, 15), drag: 3 });
}
function puff(x, y, n = 14, col = '#ffffff') {
  for (let i = 0; i < n; i++) { const a = frand(0, Math.PI * 2), v = frand(40, 220); spawn({ type: 'puff', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: frand(0.5, 0.85), size: frand(16, 30), drag: 4, col }); }
}
const PDRAW = {}; // дополнительные виды частиц (бабочки, соломинки, светлячок в табличку…)
function updateParticles(dt) {
  const P = G.particles;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.t += dt;
    if (p.t >= p.life) { P.splice(i, 1); continue; }
    p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
}
function drawParticles(c, layer = 'world') {
  for (const p of G.particles) {
    if ((p.layer || 'world') !== layer) continue;
    const k = p.t / p.life, a = 1 - k;
    if (p.type === 'spark') {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = p.col;
      const s = p.size * (1 - k * 0.5);
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(0, 0, s, 0); c.quadraticCurveTo(0, 0, 0, s); c.quadraticCurveTo(0, 0, -s, 0); c.quadraticCurveTo(0, 0, 0, -s); c.fill();
      c.globalAlpha = a * 0.5; c.beginPath(); c.arc(0, 0, s * 0.45, 0, 7); c.fillStyle = '#fff'; c.fill();
      c.restore();
    } else if (p.type === 'dust' || p.type === 'puff') {
      c.save(); c.globalAlpha = a * (p.type === 'dust' ? 0.75 : 0.9);
      const s = p.size * (0.6 + k * 0.9);
      const g = c.createRadialGradient(p.x - s * 0.3, p.y - s * 0.3, s * 0.1, p.x, p.y, s);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, p.type === 'dust' ? 'rgba(230,215,190,0.6)' : 'rgba(220,230,250,0.75)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, s, 0, 7); c.fill(); c.restore();
    } else if (p.type === 'smoke') {
      c.save(); c.globalAlpha = a * 0.5; c.fillStyle = '#9aa0b5'; c.beginPath(); c.arc(p.x, p.y, p.size * (0.6 + k), 0, 7); c.fill(); c.restore();
    } else if (p.type === 'confetti') {
      c.save(); c.globalAlpha = Math.min(1, a * 2); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore();
    } else if (p.type === 'fw') {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, 7); c.fill(); c.restore();
    } else if (p.type === 'drop') {
      c.save(); c.globalAlpha = a; c.fillStyle = '#9fd8ff'; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); c.restore();
    } else if (p.type === 'swirl') {
      c.save(); c.globalAlpha = Math.min(1, a * 1.6) * 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.lineCap = 'round';
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.beginPath(); for (let i = 0; i <= 24; i++) { const an = i / 24 * Math.PI * 3.2, rad = p.size * (1 - i / 30); c.lineTo(Math.cos(an) * rad, Math.sin(an) * rad * 0.6); } c.stroke();
      c.restore();
    } else if (p.type === 'coin') {
      c.save(); c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; c.translate(p.x, p.y);
      const sx = Math.abs(Math.cos(p.t * 14)) * 0.85 + 0.15, r = p.size;
      glow(c, 0, 0, r * 2.2, 'rgba(255,220,90,0.7)', 0.8);
      c.scale(sx, 1);
      const g = c.createRadialGradient(-r * 0.3, -r * 0.35, 2, 0, 0, r); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.45, '#ffd43b'); g.addColorStop(1, '#c47f00');
      c.fillStyle = '#7a4a00'; c.beginPath(); c.arc(0, 0, r + 3, 0, 7); c.fill();
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)'; drawStar(c, 0, 0, r * 0.55, 0); c.fill();
      c.restore();
    } else if (p.type === 'ring') {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.9; c.strokeStyle = p.col; c.lineWidth = 8 * a + 2;
      c.beginPath(); c.arc(p.x, p.y, p.size * easeOut(k), 0, 7); c.stroke(); c.restore();
    } else if (p.type === 'glowburst') {
      glow(c, p.x, p.y, p.size * (0.5 + k), 'rgba(255,225,120,0.9)', a * 0.9);
    } else if (p.type === 'leaf') {
      const sway = Math.sin(p.t * 1.8 + p.ph) * 26;
      c.save(); c.globalAlpha = Math.min(1, p.t * 2, (p.life - p.t) * 1.5) * 0.9; c.translate(p.x + sway, p.y); c.rotate(p.rot + Math.sin(p.t * 2.2 + p.ph) * 0.8);
      c.fillStyle = p.col; c.beginPath(); c.moveTo(-p.size, 0); c.quadraticCurveTo(0, -p.size * 0.7, p.size, 0); c.quadraticCurveTo(0, p.size * 0.7, -p.size, 0); c.fill();
      c.strokeStyle = 'rgba(60,90,20,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-p.size * 0.8, 0); c.lineTo(p.size * 0.8, 0); c.stroke();
      c.restore();
    } else if (p.type === 'firefly') {
      const fl = 0.55 + 0.45 * Math.sin(p.t * 3.1 + p.ph), al = Math.min(1, p.t, (p.life - p.t)) * fl;
      const xx = p.x + Math.sin(p.t * 1.3 + p.ph) * 18, yy = p.y + Math.cos(p.t * 1.7 + p.ph) * 12;
      glow(c, xx, yy, 14, 'rgba(220,255,140,0.9)', al * 0.5);
      c.save(); c.globalAlpha = al * 0.7; c.fillStyle = '#f4ffc0'; c.beginPath(); c.arc(xx, yy, p.size * 0.45, 0, 7); c.fill(); c.restore();
    } else if (p.type === 'num') {
      c.save(); c.globalAlpha = Math.min(1, a * 2); txt(c, p.text, p.x, p.y, { size: p.size, fill: '#fff', stroke: '#c25e00', sw: 8 }); c.restore();
    } else if (PDRAW[p.type]) PDRAW[p.type](c, p, k, a);
  }
}

// ---------- Задачи-сценарии (корутины) ----------
function run(gen) { const t = { gen: gen, wait: 0, cond: null, done: false }; G.tasks.push(t); return t; }
function updateTasks(dt) {
  for (let i = 0; i < G.tasks.length; i++) {
    const t = G.tasks[i];
    if (t.done) continue;
    if (t.wait > 0) { t.wait -= dt; if (t.wait > 0) continue; }
    if (t.cond) { if (!t.cond()) continue; t.cond = null; }
    let r;
    try { r = t.gen.next(); } catch (e) { console.error(e); t.done = true; continue; }
    if (r.done) { t.done = true; continue; }
    if (typeof r.value === 'number') t.wait = r.value; else if (typeof r.value === 'function') t.cond = r.value;
  }
  G.tasks = G.tasks.filter(t => !t.done);
}

// ---------- Пузыри речи ----------
function say(who, text, dur = null, opts = {}) {
  G.bubbles = G.bubbles.filter(b => b.who !== who);
  // одновременно говорит один герой: прежние пузыри мягко гаснут
  for (const o of G.bubbles) o.t = Math.max(o.t, o.dur - 0.25);
  // реплика звучит живым голосом; пузырь держится, пока герой не договорит
  const vd = who && VOICED[who.kind] ? Voice.speak(text, who.kind) : 0;
  if (who && who.kind === 'shchelk') Sound.chirp(); else if (who && who.kind === 'bublik') Sound.purr();
  const d = Math.max(dur || clamp(2.2 + text.length * 0.055, 2.6, 6.5), vd ? vd + 0.5 : 0);
  const b = { who, text, t: 0, dur: d, opts, voice: vd };
  G.bubbles.push(b);
  if (who && who.talk !== undefined) who.talk = Math.max(0.5, vd);
  return b;
}
// рассказчик: нет рта — его слова на свитке-ленте вверху экрана (рисованный, не системный)
const NARR = { kind: 'narrator', narrator: true, talk: 0 };
function narrRect(c, text) {
  c.font = font(32, 800); const lines = wrapText(c, text, Math.min(900, G.W - 260));
  let tw = 0; for (const l of lines) tw = Math.max(tw, c.measureText(l).width);
  const w = tw + 120, h = lines.length * 40 + 34; return { x: G.W / 2 - w / 2, y: 18, w, h, lines };
}
function drawNarr(c, b) {
  const r = narrRect(c, b.text), k = Math.min(1, b.t / 0.3), out = b.dur - b.t < 0.3 ? (b.dur - b.t) / 0.3 : 1;
  b.rect = { x: r.x - 30, y: r.y, w: r.w + 60, h: r.h + 8 };
  c.save(); c.globalAlpha = Math.min(1, out * 1.4); c.translate(0, -(1 - easeOut(k)) * 40);
  const { x, y, w, h } = r;
  c.fillStyle = 'rgba(40,25,10,0.28)'; rr(c, x + 5, y + 8, w, h, 14); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff6dc'); g.addColorStop(1, '#f1d9a4');
  c.fillStyle = g; c.strokeStyle = '#7a4a1e'; c.lineWidth = 4; rr(c, x, y, w, h, 14); c.fill(); c.stroke();
  // свёрнутые концы свитка
  for (const sx of [x - 18, x + w - 8]) { const gg = c.createLinearGradient(sx, 0, sx + 26, 0); gg.addColorStop(0, '#c98a4b'); gg.addColorStop(0.5, '#f6d79a'); gg.addColorStop(1, '#a8652c'); c.fillStyle = gg; rr(c, sx, y - 8, 26, h + 16, 12); c.fill(); c.stroke(); }
  r.lines.forEach((l, i) => richLine(c, l, G.W / 2, y + 17 + 20 + i * 40, 32, 'center', '#4a2a10', '#b8460b'));
  c.restore();
}
function drawBubble(c, b, cam) {
  const who = b.who; if (!who) return;
  if (who.narrator) { drawNarr(c, b); return; }
  const m = who.mouth(); // мировые координаты рта
  const head = who.headTop();
  const Z = G.zoom;
  const mx = (m.x - cam.x) * Z, my = (m.y - cam.y) * Z, hy = (head.y - cam.y) * Z;
  if (mx < 20 || mx > G.W - 20 || my < -60 || my > G.H + 60) { b.rect = null; return; } // говорящий ушёл за кадр — пузырь не висит без хвостика
  const k = Math.min(1, b.t / 0.18), out = b.dur - b.t < 0.25 ? (b.dur - b.t) / 0.25 : 1;
  const size = 30, lh = 38;
  c.font = font(size, 800);
  // ищем место: не закрывать лица, блоки, корзину, вывеску и HUD; хвостик всегда тянется ко рту
  const avoid = G.avoid || [];
  const ovl = (x, y, w, h) => { let s = 0; for (const a of avoid) { const ox = Math.min(x + w, a.x + a.w) - Math.max(x, a.x), oy = Math.min(y + h, a.y + a.h) - Math.max(y, a.y); if (ox > 0 && oy > 0) s += ox * oy * (a.counted ? 12 : a.face ? 3 : 1); } return s; };
  let best = null;
  const tryC = (bx, by, w, h, lines, side, pen) => {
    bx = clamp(bx, 12, G.W - w - 12); by = clamp(by, 8, G.H - h - 8);
    let sc = ovl(bx, by, w, h) * 4 + pen + Math.abs((bx + w / 2) - mx) * 0.6 + Math.abs(by + h - hy) * 0.5;
    // хвостик тоже не должен перечёркивать то, что считаем, и чужие лица
    if (!side) {
      const t0x = clamp(mx, bx + 34, bx + w - 34), t0y = by + h, t1y = Math.max(by + h + 22, hy - 4);
      for (let i = 1; i < 8; i++) {
        const px = lerp(t0x, mx, i / 8), py = lerp(t0y, t1y, i / 8);
        for (const a of avoid) if ((a.counted || (a.face && a.face !== who)) && px > a.x && px < a.x + a.w && py > a.y && py < a.y + a.h) sc += a.counted ? 40000 : 6000;
      }
    }
    if (!side && by + h + 10 > hy) sc += 1e6; // хвостик снизу нужен — пузырь должен быть над головой
    if (!best || sc < best.sc) best = { bx, by, w, h, lines, side, sc };
  };
  for (const [mw, pen] of [[480, 0], [380, 900], [300, 2200]]) {
    const lines = wrapText(c, b.text, mw);
    let tw = 0; for (const l of lines) tw = Math.max(tw, c.measureText(l).width);
    const w = tw + 48, h = lines.length * lh + 30;
    const ys = [hy - 26 - h];
    for (const a of avoid) if (a.y - h - 14 < hy - 26 - h) ys.push(a.y - h - 14);
    for (const by of ys) for (const bx of [mx - w * 0.3, mx - w + 46, mx - 46, mx - w / 2]) tryC(bx, by, w, h, lines, false, pen + (hy - 26 - h - by) * 0.8);
    for (const sideX of [mx + 72, mx - 72 - w]) tryC(sideX, hy - 10, w, h, lines, true, pen + 3000);
  }
  let { bx, by, w, h, lines } = best;
  b.rect = { x: bx, y: by, w, h };
  const tailUp = best.side ? 'side' : false;
  c.save();
  const sc = easeOutBack(k) * out;
  const ox = clamp(mx, bx + 30, bx + w - 30), oy = by + h;
  c.translate(ox, oy); c.scale(sc, sc); c.translate(-ox, -oy);
  c.globalAlpha = Math.min(1, out * 1.5);
  // тень
  c.fillStyle = 'rgba(40,25,10,0.22)'; rr(c, bx + 4, by + 8, w, h, 26); c.fill();
  // хвостик
  const tx0 = clamp(mx, bx + 34, bx + w - 34);
  c.beginPath();
  if (tailUp === 'side') {
    const sx = mx < bx ? bx + 2 : bx + w - 2, syy = clamp(my - 10, by + 22, by + h - 22);
    c.moveTo(sx, syy - 14); c.quadraticCurveTo((sx + mx) / 2, syy, mx + (mx < bx ? 18 : -18), my - 6); c.lineTo(sx, syy + 14);
  } else {
    const tipY = Math.max(by + h + 22, hy - 4), tipX = mx;
    c.moveTo(tx0 - 18, by + h - 3); c.quadraticCurveTo(lerp(tx0, tipX, 0.4) - 4, lerp(by + h, tipY, 0.55), tipX, tipY); c.lineTo(tx0 + 16, by + h - 3);
  }
  c.closePath();
  c.fillStyle = '#fff'; c.strokeStyle = '#3b2412'; c.lineWidth = 4.5; c.lineJoin = 'round';
  c.fill(); c.stroke();
  rr(c, bx, by, w, h, 26); c.fill(); c.stroke();
  // закрываем стык хвостика
  c.beginPath();
  if (tailUp === 'side') { const sx = mx < bx ? bx + 3 : bx + w - 3, syy = clamp(my - 10, by + 22, by + h - 22); c.rect(sx - 4, syy - 11, 8, 22); }
  else c.rect(tx0 - 17, by + h - 8, 31, 9);
  c.fillStyle = '#fff'; c.fill();
  lines.forEach((l, i) => richLine(c, l, bx + w / 2, by + 15 + lh / 2 + i * lh + 1, size));
  c.restore();
}
