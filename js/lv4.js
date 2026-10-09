'use strict';
// ---------- Уровень 4: Пещера-сокровищница Щёлка (светящиеся кристаллы) ----------
// Мешочки по десять монет и монеты россыпью: числа 10–20, «десяток и ещё…». Вагонетки над пропастью.
let CAVE_BG = null;
function drawCaveBg(c, L, cam) {
  const W = Math.ceil(G.W), H = Math.ceil(G.H + 120);
  if (!CAVE_BG || CAVE_BG.w !== W) {
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H; const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a0f33'); bg.addColorStop(0.6, '#2c1a52'); bg.addColorStop(1, '#3a2266'); g.fillStyle = bg; g.fillRect(0, 0, W * 2, H);
    const rnd = mulberry32(77);
    // дальние стены-скалы
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer ? '#241544' : '#1d1238';
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W * 2; x += 60) g.lineTo(x, H * (0.55 + layer * 0.12) + Math.sin(x * 0.01 + layer) * 40 + rnd() * 30); g.lineTo(W * 2, H); g.fill();
    }
    // сталактиты
    for (let i = 0; i < 40; i++) { const x = rnd() * W * 2, w = 20 + rnd() * 50, h = 60 + rnd() * 170; const gg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gg.addColorStop(0, '#2a1a4a'); gg.addColorStop(0.5, '#4a3576'); gg.addColorStop(1, '#22143e'); g.fillStyle = gg; g.beginPath(); g.moveTo(x - w / 2, -5); g.quadraticCurveTo(x - w * 0.2, h * 0.6, x, h); g.quadraticCurveTo(x + w * 0.2, h * 0.6, x + w / 2, -5); g.fill(); }
    // светящиеся кристаллы
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W * 2, y = H * (0.5 + rnd() * 0.4), s = 14 + rnd() * 30, hue = rnd() < 0.5 ? [120, 220, 255] : [255, 120, 220];
      const gl = g.createRadialGradient(x, y, 2, x, y, s * 3); gl.addColorStop(0, `rgba(${hue},0.45)`); gl.addColorStop(1, `rgba(${hue},0)`); g.fillStyle = gl; g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
      g.fillStyle = `rgba(${hue},0.9)`; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5;
      for (const [dx, a, k] of [[0, 0, 1], [-s * 0.5, -0.4, 0.7], [s * 0.5, 0.35, 0.75]]) { g.save(); g.translate(x + dx, y); g.rotate(a); g.beginPath(); g.moveTo(-s * 0.22 * k, 0); g.lineTo(0, -s * 1.4 * k); g.lineTo(s * 0.22 * k, 0); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    }
    CAVE_BG = { w: W, cv };
  }
  const off = ((cam.x * 0.25 * G.zoom) % (W * 2) + W * 2) % (W * 2), py = -((cam.y / Math.max(1, L.pxH - viewH())) * 60);
  c.drawImage(CAVE_BG.cv, off, 0, Math.min(W, W * 2 - off), H, 0, py, Math.min(W, W * 2 - off), H);
  if (W * 2 - off < W) c.drawImage(CAVE_BG.cv, 0, 0, W - (W * 2 - off), H, W * 2 - off, py, W - (W * 2 - off), H);
  // мерцающие пылинки
  for (let i = 0; i < 14; i++) { const x = (i * 211 + G.t * 12) % G.W, y = (i * 97) % G.H; c.fillStyle = `rgba(200,220,255,${0.25 + 0.25 * Math.sin(G.t * 2 + i)})`; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
}
// сундук: мешочки «10» + монеты россыпью сверху
class Chest extends Ent {
  constructor(x, yG, bags, loose) { super(x, yG); this.bags = bags; this.loose = loose; this.z = -1.3; this.labels = null; this.W = 150; }
  get total() { return this.bags * 10 + this.loose; }
  topY() { return this.y - 62; }
  layout() {
    const out = [], top = this.topY();
    for (let i = 0; i < this.bags; i++) out.push({ kind: 'bag', x: this.x + (i - (this.bags - 1) / 2) * 60 - (this.loose ? 0 : 0), y: top - 2, s: 54 });
    const rowY = top - (this.bags ? 58 : 2);
    for (let i = 0; i < this.loose; i++) { const r = Math.floor(i / 5), inRow = Math.min(5, this.loose - r * 5), j = i % 5; out.push({ kind: 'coin', x: this.x + (j - (inRow - 1) / 2) * 27, y: rowY - r * 24, s: 26 }); }
    return out;
  }
  rects() { return this.layout().map(o => { const h = itemH(o.kind, o.s); return { kind: o.kind, x: o.x - o.s / 2, y: o.y - h, w: o.s, h }; }); }
  audit(add) { add('сундук', this.x, this.y, { feet: 56 }); }
  draw(c) {
    const X = this.x, Y = this.y, W = this.W, top = this.topY();
    c.fillStyle = 'rgba(10,5,20,0.4)'; c.beginPath(); c.ellipse(X + 4, Y + 1, W * 0.55, 9, 0, 0, 7); c.fill();
    // открытая крышка позади
    const lg = c.createLinearGradient(0, top - 60, 0, top); lg.addColorStop(0, '#a8652c'); lg.addColorStop(1, '#5a3412');
    c.fillStyle = lg; c.strokeStyle = '#2e1808'; c.lineWidth = 3; c.beginPath(); c.moveTo(X - W / 2 + 4, top); c.lineTo(X - W / 2 + 14, top - 52); c.quadraticCurveTo(X, top - 74, X + W / 2 - 14, top - 52); c.lineTo(X + W / 2 - 4, top); c.closePath(); c.fill(); c.stroke();
    // содержимое
    const lay = this.layout();
    for (let i = lay.length - 1; i >= 0; i--) { const o = lay[i]; if (o.kind === 'bag') drawItem(c, 'bag', o.x, o.y, o.s); }
    for (const o of lay) if (o.kind === 'coin') drawItem(c, 'coin', o.x, o.y, o.s);
    // короб
    const g = c.createLinearGradient(0, top, 0, Y); g.addColorStop(0, '#c98a4b'); g.addColorStop(1, '#6b3f18');
    c.fillStyle = g; rr(c, X - W / 2, top, W, Y - top, 8); c.fill(); c.stroke();
    c.fillStyle = '#e0a82e'; c.strokeStyle = '#5e3c00'; c.lineWidth = 2.5; for (const bx of [X - W / 2 + 14, X + W / 2 - 24]) { rr(c, bx, top, 10, Y - top, 3); c.fill(); c.stroke(); }
    rr(c, X - 12, top + 14, 24, 22, 5); c.fill(); c.stroke();
    if (this.labels) {
      const coins = lay.filter(o => o.kind === 'coin'), bags = lay.filter(o => o.kind === 'bag');
      const show = this.labels.n;
      // сначала мешочки («10», «20»), потом монеты по одной: «11, 12, 13…»
      [...bags, ...coins].forEach((o, i) => { if (i >= show) return; const v = i < bags.length ? (i + 1) * 10 : bags.length * 10 + (i - bags.length + 1); const h = itemH(o.kind, o.s); c.save(); c.translate(o.x, o.y - h - 12); c.fillStyle = i < bags.length ? '#ffd43b' : '#a5d8ff'; c.strokeStyle = '#7a3e00'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill(); c.stroke(); txt(c, String(v), 0, 1, { size: 15, fill: '#3b2412' }); c.restore(); });
    }
  }
}
function* countChest(S, ch, speaker, line) {
  if (line) say(speaker, line, 2.5);
  yield 0.5; const n = ch.bags + ch.loose;
  for (let i = 1; i <= n; i++) { ch.labels = { n: i }; Sound.count(Math.min(10, i)); yield i <= ch.bags ? 0.8 : 0.5; }
  yield 0.8;
}
// вагонетка на рельсах над пропастью (едет сама, как плот)
class Cart extends Raft {
  constructor(xa, xb, L, rail) { super(xa, xb, L); this.rail = rail; this.water = rail + 12; this.dry = true; this.w = 132; }
  topY() { return this.rail + this.dip * 0.4; }
  audit(add, out, L) { out.push({ kind: 'вагонетка на рельсах', x: Math.round(this.x), bottom: Math.round(this.topY()), surface: this.rail, onto: 'рельсы на опорах', diff: 0, ok: Math.abs(this.topY() - this.rail) < 8 && this.x >= this.xa - 0.5 && this.x <= this.xb + 0.5 }); }
  rect() { return { x: this.x - this.w / 2 - 6, y: this.topY() - 6, w: this.w + 12, h: 64 }; }
  draw(c) {
    const X = this.x, top = this.topY(), W = this.w;
    // корпус вагонетки
    const g = c.createLinearGradient(0, top, 0, top + 48); g.addColorStop(0, '#9aa5ad'); g.addColorStop(1, '#4c565d');
    c.fillStyle = g; c.strokeStyle = '#1f252a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(X - W / 2, top - 4); c.lineTo(X + W / 2, top - 4); c.lineTo(X + W / 2 - 12, top + 40); c.lineTo(X - W / 2 + 12, top + 40); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c98a4b'; rr(c, X - W / 2 - 2, top - 8, W + 4, 10, 4); c.fill(); c.stroke();
    for (const bx of [X - W / 3, X, X + W / 3]) { c.fillStyle = '#5e3c00'; c.beginPath(); c.arc(bx, top + 16, 3, 0, 7); c.fill(); }
    // колёса на рельсе
    for (const wx of [X - W / 2 + 26, X + W / 2 - 26]) { c.fillStyle = '#2b2f33'; c.beginPath(); c.arc(wx, top + 44, 11, 0, 7); c.fill(); c.fillStyle = '#c9a46a'; c.beginPath(); c.arc(wx, top + 44, 4, 0, 7); c.fill(); }
    // фонарик-кристалл
    glow(c, X + W / 2 - 14, top - 30, 40, 'rgba(120,220,255,0.7)', 0.8);
    c.strokeStyle = '#4a2c12'; c.lineWidth = 3; c.beginPath(); c.moveTo(X + W / 2 - 14, top - 6); c.lineTo(X + W / 2 - 14, top - 24); c.stroke();
    drawItem(c, 'gem', X + W / 2 - 14, top - 22, 22);
  }
}
class Rails extends Ent {
  constructor(x0, x1, y, L) { super((x0 + x1) / 2, y); this.x0 = x0; this.x1 = x1; this.z = -1.6; this.bot = L.pxH + 10; }
  audit(add, out) { out.push({ kind: 'рельсы над пропастью', x: Math.round(this.x), bottom: this.bot, surface: this.bot, onto: 'опоры до дна', diff: 0, ok: true }); }
  draw(c) {
    const y = this.y + 56;
    for (let x = this.x0 + 40; x < this.x1 - 20; x += 128) { const gg = c.createLinearGradient(x - 8, 0, x + 8, 0); gg.addColorStop(0, '#4a2c12'); gg.addColorStop(0.5, '#8a5a2b'); gg.addColorStop(1, '#3a200c'); c.fillStyle = gg; c.fillRect(x - 8, y, 16, this.bot - y); c.strokeStyle = '#3a200c'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 40, this.bot); c.lineTo(x, y + 30); c.lineTo(x + 40, this.bot); c.stroke(); }
    c.fillStyle = '#6b3f18'; for (let x = this.x0; x < this.x1; x += 20) c.fillRect(x, y - 2, 12, 8);
    c.strokeStyle = '#c9ced2'; c.lineWidth = 4; c.beginPath(); c.moveTo(this.x0, y - 2); c.lineTo(this.x1, y - 2); c.stroke();
  }
}
const LV4 = {
  idx: 3, rngId: 4,
  build(S) {
    const L = new Level(112, 12, 'cave'); S.L = L; L.water = false; L.song = 'cave'; L.terrainTint = 'rgba(70,40,130,0.42)';
    const rng = S.rng;
    let a1, b1; do { a1 = rint(rng, 1, 9); b1 = rint(rng, 1, 9); } while (a1 === b1);
    const c2 = rint(rng, 1, 9);
    const l3 = rng() < 0.5 ? 20 : 10 + rint(rng, 1, 9); let r3 = 10 + rint(rng, 1, 9); if (rng() < 0.3) r3 = l3 === 20 ? 19 : l3;
    S.math = { st: [{ kind: 'sign', L: 10 + a1, R: 10 + b1 }, { kind: 'count', L: 10 + c2 }, { kind: 'sign', L: l3, R: r3 }] };
    L.ground(0, 30, 10); L.ground(38, 64, 10); L.ground(72, 112, 10);
    L.plank(5, 8, 8); L.plank(57, 60, 8); L.plank(98, 101, 8);
    L.add(new Rails(tx(30), tx(38), tx(10), L)); L.add(new Rails(tx(64), tx(72), tx(10), L));
    S.carts = [L.add(new Cart(tx(30) + 70, tx(38) - 70, L, tx(10))), L.add(new Cart(tx(64) + 70, tx(72) - 70, L, tx(10)))]; for (const c of S.carts) L.movers.push(c);
    L.spawn = { x: tc(2), y: tx(10) };
    S.arch = L.add(new NPC('arch', tc(4), tx(10), 1));
    const mk = (v, x) => L.add(new Chest(x, tx(10), Math.floor(v / 10), v % 10));
    S.stations = [12, 42, 78].map((X0, i) => {
      const m = S.math.st[i];
      const chL = mk(m.L, tx(X0 + 10) + 20), chR = m.R !== undefined ? mk(m.R, tx(X0 + 13) + 30) : null;
      return { i, X0, chL, chR, started: false, done: false, cols: [X0 + 3, X0 + 5, X0 + 7] };
    });
    // секрет: стог → высокий кристальный уступ
    L.plank(106, 109, 5); S.bouncers.push(L.add(new Bouncer(tc(105) - 20, tx(10), 'sack'))); S.gold = L.add(new GoldLantern(tx(107) + 32, tx(5)));
    S.flag = L.add(new Flag(tc(102), tx(10), true)); S.flag.locked = true;
    S.shch = L.add(new Shchelk(tx(97), tx(10) - 70)); S.shch.mode = 'perch'; S.shch.face = -1; S.shch.weight = true; S.hoard = { x: tx(97), y: tx(10) };
    checkpoint(L, 13, 10, false); checkpoint(L, 28, 10); checkpoint(L, 39, 10); checkpoint(L, 43, 10, false); checkpoint(L, 62, 10); checkpoint(L, 73, 10); checkpoint(L, 79, 10, false); checkpoint(L, 92, 10);
    for (const x0 of [30, 64]) ffArc(S, tx(x0) + 60, 560, tx(x0 + 8) - 60, 560, 70, 4);
    ffAt(S, [[tc(105) - 20, 468], [tc(105) - 10, 378], [tc(105) + 20, 288]]);
    ffAt(S, [[tc(6), 450], [tc(58), 450], [tc(99), 450]]);
    return L;
  },
  start(S) {
    S.weightsBase = 3; S.weightsHave = 3;
    S.hud = { icon: 'weights', text: (S.weightsHave || 0) + ' из 5' };
    run((function* () {
      G.freeze = true; yield 0.5;
      say(S.p, VL.l4IskraWow(), 3); yield vwait(0.2);
      archSay(S.arch, 'point', VL.l4Intro(), 6); yield vwait(0.3);
      S.arch.pose = 'idle'; G.freeze = false;
    })());
  },
  goal(S) { return goalOf(S, st => tx(st.X0 + 5), tx(93)); },
  update(S, dt) {
    const p = S.p;
    for (const st of S.stations) if (!st.started && p.onGround && p.x > tx(st.X0 + 3) && p.x < tx(st.X0 + 15) && Math.abs(p.y - tx(10)) < 2 && !(S.q && !S.q.solved)) { st.started = true; S.cur = st; S.respawnPt = { x: tc(st.X0 + 4), y: tx(10) }; run(LV4.station(S, st)); }
    S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки, как в прологе
    // пока станция не пройдена, вагонетка дальше не поедет: на ту сторону — только после ответа
    if (!S.endStarted && S.stations[2].done && p.x > tx(91)) { S.endStarted = true; run(LV4.ending(S)); }
    if (S.wp && !S.wp.got && !p.hidden && !G.freeze && Dialog.idle() && overlap(p, S.wp.x - 30, S.wp.y - 60, 60, 60)) { S.wp.got = true; weightGot(S); run((function* () { yield 0.3; say(S.p, VL.l4Got(), 3); })()); }
    if (!S.done && !S.flag.locked && overlap(p, S.flag.x - 30, S.flag.y - 190, 60, 190)) { S.flag.on = true; S.complete(); }
  },
  lock(S, st) { return fitLock(tx(st.X0) + 20, tx(st.X0 + 15) + 40, tx(7) - 126); },
  station(S, st) {
    return (function* () {
      const m = S.math.st[st.i], A = S.arch, chL = st.chL, chR = st.chR;
      G.freeze = true;
      yield* puffTo(A, tc(st.X0 + 1), tx(10), 1);
      S.p.autoX = tx(st.X0 + 5) + 32; S.p.autoFace = 1;
      S.cam.lock = LV4.lock(S, st);
      yield 0.6;
      if (st.i === 0) { archSay(A, 'point', VL.l4A1(), 6); yield vwait(0.2); say(S.p, VL.l4A2(), 3); }
      else if (st.i === 1) { archSay(A, 'idle', VL.l4B1(), 4); }
      else { archSay(A, 'point', VL.l4C1(), 4); }
      yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
      const tensSay = v => v === 20 ? VL.l4Two() : VL.l4Ten(v - 10);
      if (m.kind === 'sign') {
        const sg = signOf(m.L, m.R);
        S.ask({ text: `${m.L} ? ${m.R}`, answer: sg, choices: signChoices(S.rng, SIGNS), row: 7, cols: st.cols, speaker: A,
          say: st.i === 0 ? VL.l4QA() : VL.l4QC(), eqDone: `${m.L} ${sg} ${m.R}`, hints: st.i === 0 ? [VL.l4H1(), VL.l4CountTen()] : [VL.l4H1(), VL.l4H2()],
          demo: function* () { yield* countChest(S, chL, A, VL.countL()); chL.labels = null; yield* countChest(S, chR, A, VL.countR()); chR.labels = null; say(A, VL.l1Demo(m.L, m.R), 4); yield vwait(0.5); },
          onCorrect: function* () { chL.labels = chR.labels = null; A.pose = 'cheer'; say(A, VL.l4OkSign(m.L, m.R), 5); yield vwait(0.2); A.pose = 'idle'; yield* LV4.leave(S, st); } });
      } else {
        const v = m.L;
        S.ask({ text: `10 + ${v - 10} = ?`, answer: v, choices: makeChoices(S.rng, v, 10, 20), row: 7, cols: st.cols, speaker: A,
          say: VL.l4QB(), eqDone: `10 + ${v - 10} = ${v}`, hints: [VL.l4HB1(), VL.l4HB2(v - 10)],
          demo: function* () { yield* countChest(S, chL, A, VL.l4CountTen()); chL.labels = null; yield vwait(0.3); },
          onCorrect: function* () { chL.labels = null; A.pose = 'cheer'; say(A, VL.l4OkCount(v), 5); yield vwait(0.2); A.pose = 'idle'; yield* LV4.leave(S, st); } });
      }
    })();
  },
  *leave(S, st) { Sound.sparkle(); sparkBurst(st.chL.x, st.chL.topY() - 40, 20, '#ffe066', 260); yield 0.5; S.cam.lock = null; st.done = true; },
  ending(S) {
    return (function* () {
      const sh = S.shch; G.freeze = true;
      S.cam.lock = { x: tx(97), y: tx(10) - viewH() * 0.62 };
      say(sh, VL.l4Sh1(), 4); yield vwait(0.2);
      say(S.p, VL.l4Sh2(), 3); yield vwait(0.2);
      say(sh, VL.l4Sh3(), 4); yield vwait(0.2);
      sh.weight = false; const wp = S.L.add(new WeightPickup(tx(95), tx(10))); S.wp = wp; puff(wp.x, wp.y - 20, 8); Sound.pop();
      sh.mode = 'goto'; sh.tx = tx(116); sh.ty = tx(1);
      yield 0.6; S.cam.lock = null; G.freeze = false; yield 2; sh.vis = false;
    })();
  },
  counted(S) {
    const st = S.cur; if (!st || !asking(S)) return null;
    const out = [];
    for (const [ch, g] of [[st.chL, 'L'], [st.chR, 'R']]) if (ch) ch.rects().forEach((r, i) => out.push({ kind: (r.kind === 'bag' ? 'мешочек 10 ' : 'монета ') + g + (i + 1), group: g, val: r.kind === 'bag' ? 10 : 1, r }));
    return out;
  },
  countRule(S, ok) {
    const st = S.cur, sum = g => ok.filter(o => o.group === g).reduce((a, o) => a + (o.kind.startsWith('мешочек') ? 10 : 1), 0);
    const out = [{ name: 'монет слева (мешочки по 10 + россыпь)', visible: sum('L'), expected: st.chL.total }];
    if (st.chR) out.push({ name: 'монет справа', visible: sum('R'), expected: st.chR.total });
    return out;
  },
  selfCheck(S) {
    for (const st of S.stations) { const m = S.math.st[st.i]; check(st.chL.total === m.L && (!st.chR || st.chR.total === m.R), 'сундуки = числам'); }
  },
};
