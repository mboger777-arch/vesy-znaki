'use strict';
// ---------- Уровень 3: Лес светлячков (вечер → ночь) ----------
// На ветках висят банки со светлячками. Волшебные ворота открывает только верный знак: > < =.
// Щёлк шалит — выпускает светлячков из банки.
class JarTree extends Ent {
  // дерево с длинной веткой; на ветке на верёвочках две банки (слева и справа)
  constructor(x, yG, L, R) { super(x, yG); this.z = -1.5; this.n = [L, R]; this.h = 330; this.spread = 112; this.str = 54; this.labels = null; this.fly = []; this.ph = frand(0, 6); }
  branchY() { return this.y - this.h + 40; }
  jarTop(side) { const s = side < 0 ? 0 : 1; return { x: this.x + (side < 0 ? -1 : 1) * this.spread, y: this.branchY() + 14 + this.str + Math.sin(G.t * 1.3 + s * 2 + this.ph) * 1.5 }; }
  slots(n) { const out = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / 3), cI = i % 3, inRow = Math.min(3, n - r * 3); out.push([(cI - (inRow - 1) / 2) * 25, 84 - r * 26]); } return out; }
  bugRects(side) { const j = this.jarTop(side), n = this.n[side < 0 ? 0 : 1]; return this.slots(n).map(([dx, dy]) => ({ x: j.x + dx - 10, y: j.y + dy - 10, w: 20, h: 20 })); }
  jarRect(side) { const j = this.jarTop(side); return { x: j.x - 46, y: j.y - 4, w: 92, h: 112 }; }
  audit(add, out) {
    add('дерево с банками', this.x, this.y, { feet: 16 });
    for (const s of [-1, 1]) { const j = this.jarTop(s); out.push({ kind: 'банка ' + (s < 0 ? 'слева' : 'справа'), x: Math.round(j.x), bottom: Math.round(j.y), surface: Math.round(this.branchY() + 14), onto: 'верёвочка ' + this.str + ' px от ветки', diff: 0, ok: Math.abs(j.x - this.x) < this.spread + 140 }); }
  }
  draw(c) {
    const X = this.x, Y = this.y, by = this.branchY();
    // ствол
    c.fillStyle = 'rgba(20,10,30,0.35)'; c.beginPath(); c.ellipse(X + 4, Y + 1, 46, 8, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(X - 24, 0, X + 24, 0); g.addColorStop(0, '#3e2416'); g.addColorStop(0.4, '#8a5a3a'); g.addColorStop(1, '#2e180c');
    c.fillStyle = g; c.strokeStyle = '#1e0f06'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(X - 30, Y); c.quadraticCurveTo(X - 16, Y - 120, X - 18, by); c.lineTo(X + 18, by); c.quadraticCurveTo(X + 16, Y - 120, X + 34, Y); c.closePath(); c.fill(); c.stroke();
    // ветка в обе стороны
    c.lineCap = 'round';
    for (const [w, col] of [[22, '#1e0f06'], [16, '#7a4e30']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(X - this.spread - 34, by + 8); c.quadraticCurveTo(X, by - 18, X + this.spread + 34, by + 8); c.stroke(); }
    // крона
    for (const [dx, dy, r, col] of [[-90, -70, 70, '#1f4d3a'], [80, -80, 74, '#1f4d3a'], [0, -120, 86, '#24604a'], [-40, -60, 60, '#2b6e52'], [50, -50, 58, '#2b6e52']]) {
      const gg = c.createRadialGradient(X + dx - r * 0.3, by + dy - r * 0.3, r * 0.1, X + dx, by + dy, r); gg.addColorStop(0, '#3f8f6a'); gg.addColorStop(1, col);
      c.fillStyle = gg; c.beginPath(); c.arc(X + dx, by + dy, r, 0, 7); c.fill();
    }
    for (const s of [-1, 1]) this.drawJar(c, s);
  }
  drawJar(c, side) {
    const j = this.jarTop(side), n = this.n[side < 0 ? 0 : 1];
    c.strokeStyle = '#d9c39a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(j.x, this.branchY() + 12); c.lineTo(j.x, j.y + 2); c.stroke();
    // свечение по числу светлячков
    if (n) glow(c, j.x, j.y + 56, 50 + n * 7, 'rgba(220,255,120,0.55)', 0.9);
    // стекло
    c.fillStyle = 'rgba(200,230,255,0.22)'; c.strokeStyle = 'rgba(230,245,255,0.85)'; c.lineWidth = 3;
    rr(c, j.x - 42, j.y + 12, 84, 92, [12, 12, 18, 18]); c.fill(); c.stroke();
    // крышка
    const lg = c.createLinearGradient(0, j.y, 0, j.y + 14); lg.addColorStop(0, '#ffd27a'); lg.addColorStop(1, '#a8652c');
    c.fillStyle = lg; c.strokeStyle = '#4a2c12'; c.lineWidth = 2.5; rr(c, j.x - 34, j.y, 68, 14, 5); c.fill(); c.stroke();
    // светлячки внутри: каждый виден целиком
    this.slots(n).forEach(([dx, dy], i) => { drawFireflyBug(c, j.x + dx, j.y + dy, 0.8, G.t, i * 1.3 + side, 0.9); });
    c.fillStyle = 'rgba(255,255,255,0.35)'; rr(c, j.x - 34, j.y + 20, 8, 60, 4); c.fill();
    if (this.labels && this.labels.side === side) this.slots(n).forEach(([dx, dy], i) => {
      if (i >= this.labels.n) return; c.save(); c.translate(j.x + dx, j.y + dy - 18); c.fillStyle = '#ffd43b'; c.strokeStyle = '#7a3e00'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.stroke(); txt(c, String(i + 1), 0, 1, { size: 13, fill: '#3b2412' }); c.restore();
    });
  }
}
function* countJar(S, tr, side, speaker, line) {
  if (line) say(speaker, line, 2.5);
  yield 0.5; const n = tr.n[side < 0 ? 0 : 1];
  for (let i = 1; i <= n; i++) { tr.labels = { side, n: i }; Sound.count(Math.min(10, i)); yield 0.55; }
  yield 0.6;
}
// ворота: табличка со знаком вопроса, после ответа — со знаком
function signPlaque(gate) {
  return (c, px, py) => {
    c.fillStyle = '#3b2412'; c.beginPath(); c.arc(px, py, 38, 0, 7); c.fill();
    const g3 = c.createRadialGradient(px - 10, py - 12, 4, px, py, 36); g3.addColorStop(0, gate.open ? '#fff6b0' : '#d0f0ff'); g3.addColorStop(1, gate.open ? '#ffc21a' : '#6a7fd0');
    c.fillStyle = g3; c.beginPath(); c.arc(px, py, 33, 0, 7); c.fill();
    if (gate.sign) drawSignGlyph(c, gate.sign, px, py, 13, '#fff', '#b8460b'); else txt(c, '?', px, py + 2, { size: 40, fill: '#fff', stroke: '#2b3a80', sw: 7 });
  };
}
const LV3 = {
  idx: 2, rngId: 3,
  build(S) {
    const L = new Level(124, 12, 'eve'); S.L = L; L.night = 0.55; L.song = 'eve';
    const rng = S.rng;
    let a1, b1; do { a1 = rint(rng, 1, 9); b1 = rint(rng, 1, 9); } while (a1 === b1);
    // Щёлк выпускает k светлячков из большей банки — знак может поменяться
    let a2, b2, k2; do { a2 = rint(rng, 4, 9); b2 = rint(rng, 2, 8); k2 = rint(rng, 1, 4); } while (a2 <= b2 || a2 - k2 < 1 || signOf(a2 - k2, b2) === signOf(a2, b2) && rng() < 0.6);
    const e3 = rint(rng, 2, 8);
    const n4 = rint(rng, 2, 7), ans4 = rint(rng, n4 + 1, 9);
    S.math = { st: [{ kind: 'sign', L: a1, R: b1 }, { kind: 'shch', L: a2, R: b2, k: k2 }, { kind: 'sign', L: e3, R: e3 }, { kind: 'pick', L: 0, R: n4, a: ans4 }] };
    L.ground(0, 30, 10); L.ground(30, 31, 11); L.ground(37, 38, 11); L.ground(38, 124, 10);
    L.plank(7, 10, 8); L.plank(58, 61, 8); L.plank(84, 87, 8); L.plank(109, 112, 8);
    S.raft = L.add(new Raft(tx(31) + 70, tx(37) - 70, L)); L.movers.push(S.raft);
    L.spawn = { x: tc(2), y: tx(10) };
    S.arch = L.add(new NPC('arch', tc(4), tx(10), 1));
    S.stations = [12, 40, 66, 92].map((X0, i) => {
      const m = S.math.st[i];
      const tr = L.add(new JarTree(tx(X0 + 11) + 32, tx(10), m.L, m.R));
      const gate = L.add(new Gate(X0 + 15, 6, 10)); gate.apply(L); gate.plaque = signPlaque(gate);
      return { i, X0, tr, gate, started: false, done: false, cols: [X0 + 3, X0 + 5, X0 + 7] };
    });
    // секрет: стог у стартовой поляны → высокий сук с золотым фонариком
    L.plank(119, 122, 4); S.bouncers.push(L.add(new Bouncer(tc(118) - 30, tx(10), 'hay')));
    S.gold = L.add(new GoldLantern(tx(120) + 32, tx(4)));
    S.puddles.push(L.add(new Puddle(tx(63) + 8, tx(65) + 40, tx(10))));
    S.flag = L.add(new Flag(tc(114), tx(10), true)); S.flag.locked = true;
    S.shch = L.add(new Shchelk(tx(56), tx(5))); S.shch.vis = false; S.shch.mode = 'arrived';
    checkpoint(L, 13, 10, false); checkpoint(L, 28, 10); checkpoint(L, 41, 10, false); checkpoint(L, 54, 10); checkpoint(L, 67, 10, false); checkpoint(L, 82, 10); checkpoint(L, 93, 10, false); checkpoint(L, 108, 10);
    ffAt(S, [[tx(32) + 20, 704], [tx(33) + 30, 704], [tx(34) + 40, 704], [tx(35) + 50, 704]]);
    ffAt(S, [[tc(118) - 30, 468], [tc(118) - 20, 378], [tc(118) + 10, 288]]);
    ffArc(S, tx(58) + 20, 470, tx(61) - 20, 470, 40, 3); ffArc(S, tx(84) + 20, 470, tx(87) - 20, 470, 40, 3); ffArc(S, tx(109) + 20, 470, tx(112) - 20, 470, 40, 3);
    [[1, 80], [9.5, 70], [29, 70], [39, 70], [53, 80], [63, 70], [80, 80], [89, 70], [107, 80], [122, 70]].forEach(([c, w]) => deco(L, 't_bush', tc(c), tx(10), w, 8));
    return L;
  },
  start(S) {
    S.weightsBase = 2; S.weightsHave = 2;
    S.hud = { icon: 'weights', text: (S.weightsHave || 0) + ' из 5' };
    run((function* () {
      G.freeze = true; yield 0.5;
      archSay(S.arch, 'point', VL.l3Intro(), 6); yield vwait(0.3);
      say(S.p, VL.l3IskraGo(), 3); yield vwait(0.2);
      S.arch.pose = 'idle'; G.freeze = false;
    })());
  },
  goal(S) { return goalOf(S, st => tx(st.X0 + 5), tx(108)); },
  update(S, dt) {
    const p = S.p;
    for (const st of S.stations) if (!st.started && p.onGround && p.x > tx(st.X0 + 3) && p.x < tx(st.X0 + 15) && !(S.q && !S.q.solved)) { st.started = true; S.cur = st; S.respawnPt = { x: tc(st.X0 + 4), y: tx(10) }; run(LV3.station(S, st)); }
    S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки, как в прологе
    // с каждыми воротами ночь чуть глубже
    S.L.night = 0.55 + S.stations.filter(s => s.done).length * 0.08;
    if (!S.endStarted && S.stations[3].done && p.x > tx(106)) { S.endStarted = true; run(LV3.ending(S)); }
    if (S.wp && !S.wp.got && !p.hidden && !G.freeze && Dialog.idle() && overlap(p, S.wp.x - 30, S.wp.y - 60, 60, 60)) { S.wp.got = true; weightGot(S); run((function* () { yield 0.3; say(S.p, VL.l3Got(), 3); })()); }
    if (!S.done && !S.flag.locked && overlap(p, S.flag.x - 30, S.flag.y - 190, 60, 190)) { S.flag.on = true; S.complete(); }
  },
  lock(S, st) { return fitLock(tx(st.X0) + 20, tx(st.X0 + 16) + 60, tx(10) - 330 - 40 - 90); },
  station(S, st) {
    return (function* () {
      const tr = st.tr, m = S.math.st[st.i], A = S.arch;
      G.freeze = true;
      yield* puffTo(A, tc(st.X0 + 1), tx(10), 1);
      S.p.autoX = tx(st.X0 + 5) + 32; S.p.autoFace = 1;
      S.cam.lock = LV3.lock(S, st);
      yield 0.6;
      if (st.i === 0) { archSay(A, 'point', VL.l3A1(), 5); }
      else if (st.i === 1) {
        archSay(A, 'idle', VL.l3B0(m.L, m.R), 4); yield vwait(0.2);
        // Щёлк подлетает к левой банке и выпускает светлячков
        const sh = S.shch, j = tr.jarTop(-1); sh.vis = true; sh.x = S.cam.x + viewW() + 60; sh.y = j.y - 60; sh.mode = 'goto'; sh.tx = j.x + 10; sh.ty = j.y - 40; sh.gotoSpeed = 420;
        yield () => sh.mode === 'arrived';
        Sound.laugh(); say(sh, VL.l3Sh1(), 2.5); yield 0.5;
        for (let q = 0; q < m.k; q++) { tr.n[0]--; spawn({ type: 'firefly', x: j.x + frand(-10, 10), y: j.y + 20, vx: frand(-60, 60), vy: frand(-140, -90), life: 2.5, size: 4, ph: frand(0, 6) }); Sound.firefly(q); yield 0.45; }
        yield vwait(0.2); sh.mode = 'goto'; sh.tx = S.cam.x - 200; sh.ty = j.y - 200; archSay(A, 'worried', VL.l3B1(m.k), 4); yield vwait(0.2);
        yield 0.8; sh.vis = false;
      }
      else if (st.i === 2) { archSay(A, 'point', VL.l3C1(), 4); }
      else { archSay(A, 'point', VL.l3D1(m.R), 5); }
      yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
      const Lc = tr.n[0], Rc = tr.n[1];
      if (m.kind !== 'pick') {
        const sg = signOf(Lc, Rc);
        S.ask({ text: `${Lc} ? ${Rc}`, answer: sg, choices: signChoices(S.rng, SIGNS), row: 7, cols: st.cols, speaker: A,
          say: st.i === 0 ? VL.l3QA() : st.i === 1 ? VL.l3QB() : VL.l3QC(), eqDone: `${Lc} ${sg} ${Rc}`,
          hints: [VL.l3H1(), VL.l2HSign1()],
          demo: function* () { yield* countJar(S, tr, -1, A, VL.countL()); yield* countJar(S, tr, 1, A, VL.countR()); tr.labels = null; say(A, VL.l1Demo(Lc, Rc), 4); yield vwait(0.5); },
          onCorrect: function* () { tr.labels = null; A.pose = 'cheer'; say(A, Lc === Rc ? VL.l3OkEq(Lc) : VL.l3Ok(Lc, Rc), 5); yield vwait(0.2); yield* LV3.open(S, st, sg); } });
      } else {
        const n = Rc, a = m.a, ch = shuffle(S.rng, [a, n, Math.max(1, n - rint(S.rng, 1, 2)) === n ? n - 1 : Math.max(1, n - rint(S.rng, 1, 2))]);
        const choices = [...new Set(ch)].length === 3 ? ch : shuffle(S.rng, [a, n, n - 1 >= 1 ? n - 1 : n + 10]);
        S.ask({ text: `? > ${n}`, answer: a, choices, row: 7, cols: st.cols, speaker: A,
          say: VL.l3QD(n), eqDone: `${a} > ${n}`, hints: [VL.l3HD1(n), VL.l3HD2(n)],
          demo: function* () { yield* countJar(S, tr, 1, A, VL.countR()); tr.labels = null; say(A, VL.l3DemoD(n), 4); yield vwait(0.5); },
          onCorrect: function* () {
            tr.labels = null; A.pose = 'cheer'; say(A, VL.l3OkD(a, n), 5);
            const j = tr.jarTop(-1);
            for (let q = 0; q < a; q++) { tr.n[0]++; sparkBurst(j.x, j.y + 40, 4, '#eaff9a', 100); Sound.firefly(q); yield 0.3; }
            check(tr.n[0] === a, 'в левую банку прилетело ' + a);
            yield vwait(0.2); yield* LV3.open(S, st, '>');
          } });
      }
    })();
  },
  *open(S, st, sg) {
    st.gate.sign = sg; Sound.sparkle(); yield 0.6;
    st.gate.open = true; st.gate.apply(S.L); Sound.fanfare(); sparkBurst(st.gate.x, tx(8), 30);
    yield 0.8; S.arch.pose = 'idle'; S.cam.lock = null; st.done = true;
  },
  ending(S) {
    return (function* () {
      const sh = S.shch; G.freeze = true;
      S.cam.lock = { x: tx(112), y: tx(10) - viewH() * 0.62 };
      sh.vis = true; sh.weight = true; sh.x = tx(124); sh.y = tx(3); sh.mode = 'goto'; sh.tx = tx(111); sh.ty = tx(6); sh.gotoSpeed = 300;
      yield () => sh.mode === 'arrived';
      say(sh, VL.l3Sh2(), 3); yield vwait(0.2);
      sh.weight = false; const wp = S.L.add(new WeightPickup(tx(110) + 20, tx(10))); S.wp = wp; puff(wp.x, wp.y - 20, 8); Sound.bump();
      say(sh, VL.l3Sh3(), 3); yield vwait(0.1);
      sh.mode = 'goto'; sh.tx = tx(130); sh.ty = tx(0);
      yield 0.6; S.cam.lock = null; G.freeze = false; yield 2; sh.vis = false;
    })();
  },
  counted(S) {
    const st = S.cur; if (!st || !asking(S)) return null;
    const out = [];
    st.tr.bugRects(-1).forEach((r, i) => out.push({ kind: 'светлячок слева ' + (i + 1), group: 'L', r }));
    st.tr.bugRects(1).forEach((r, i) => out.push({ kind: 'светлячок справа ' + (i + 1), group: 'R', r }));
    return out;
  },
  countRule(S, ok) { const st = S.cur; return [{ name: 'светлячков слева', visible: cnt(ok, o => o.group === 'L'), expected: st.tr.n[0] }, { name: 'светлячков справа', visible: cnt(ok, o => o.group === 'R'), expected: st.tr.n[1] }]; },
  avoidRects(S) { const st = S.cur; return st ? [st.tr.jarRect(-1), st.tr.jarRect(1)] : []; },
  selfCheck(S) {
    if (S.cur && S.board && !S.board.solved) {
      const st = S.cur, m = S.math.st[st.i];
      if (m.kind === 'shch') check(st.tr.n[0] === m.L - m.k, 'после Щёлка в банке ' + (m.L - m.k));
      if (m.kind !== 'pick') check(S.board.text === `${st.tr.n[0]} ? ${st.tr.n[1]}`, 'доска = банкам');
    }
  },
};
