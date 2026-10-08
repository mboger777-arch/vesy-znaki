'use strict';
// ---------- Уровень 2: Мост-коромысло (полдень, река) ----------
// Мост — огромные весы: настил качается на каменной опоре, под концами висят корзины с камнями.
// Перейти можно, только когда стало ПОРОВНУ: добавляем или убираем камни. Это уровень знака «=».
class BeamBridge extends Scales {
  constructor(E, row) {
    super(tx(E + 4), tx(row) + 12, { arm: 176, post: 0, chain: 44, panW: 116, item: 'stone', perRow: 3, sz: 34, style: 'bridge' });
    this.E = E; this.row = row; this.half = 256; this.walk = false; this.z = -1.2;
  }
  setWalk(L) { this.walk = true; for (let x = this.E; x < this.E + 8; x++) L.set(x, this.row, T_ONEWAY_DYN); }
  audit(add, out, L) {
    const p = this.pivot();
    out.push({ kind: 'опора моста (из реки)', x: Math.round(p.x), bottom: L.pxH, surface: L.pxH, onto: 'дно реки', diff: 0, ok: true });
    for (const side of [-1, 1]) {
      const e = this.end(side), pp = this.panPt(side), rope = pp.y - e.y;
      out.push({ kind: 'корзина моста ' + (side < 0 ? 'слева' : 'справа'), x: Math.round(pp.x), bottom: Math.round(pp.y), surface: Math.round(e.y), onto: 'верёвки ' + Math.round(rope) + ' px от настила', diff: 0, ok: rope > 20 && Math.abs(pp.x - e.x) < 0.5 && pp.y + 40 < L.pxH - 46 });
    }
    if (this.walk) out.push({ kind: 'настил ровный (по нему идут)', x: Math.round(p.x), bottom: Math.round(p.y), surface: this.row * TILE, onto: 'опора', diff: 0, ok: Math.abs(this.ang) < 0.002 });
  }
  drawBase(c) {
    // каменная опора-бык из воды до оси
    const p = this.pivot(), L = this.level, bot = L ? L.pxH + 4 : p.y + 200, w = 46;
    c.save(); c.beginPath(); c.moveTo(p.x - w / 2, p.y + 8); c.lineTo(p.x - w / 2 - 14, bot); c.lineTo(p.x + w / 2 + 14, bot); c.lineTo(p.x + w / 2, p.y + 8); c.closePath(); c.clip();
    c.save(); c.scale(0.4, 0.4); c.fillStyle = PAT.stone || (PAT.stone = c.createPattern(IMG.tex_stone, 'repeat')); c.fillRect((p.x - 60) / 0.4, p.y / 0.4, 120 / 0.4, (bot - p.y) / 0.4); c.restore();
    const g = c.createLinearGradient(p.x - 40, 0, p.x + 40, 0); g.addColorStop(0, 'rgba(20,30,60,0.45)'); g.addColorStop(0.4, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(20,30,60,0.5)'); c.fillStyle = g; c.fillRect(p.x - 60, p.y, 120, bot - p.y);
    c.restore();
    c.strokeStyle = '#3f3a33'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x - w / 2, p.y + 8); c.lineTo(p.x - w / 2 - 14, bot); c.moveTo(p.x + w / 2, p.y + 8); c.lineTo(p.x + w / 2 + 14, bot); c.stroke();
  }
  drawBeam(c) {
    const p = this.pivot();
    c.save(); c.translate(p.x, p.y); c.rotate(this.ang);
    const H = this.half, th = 24;
    c.fillStyle = 'rgba(20,20,40,0.25)'; rr(c, -H + 6, th / 2 - 2, H * 2 - 12, 10, 5); c.fill();
    c.fillStyle = '#6b3f18'; c.fillRect(-H, -2, H * 2, 12);
    for (let x = -H, i = 0; x < H; x += 32, i++) {
      const tone = i % 3, g = c.createLinearGradient(0, -th / 2, 0, th / 2);
      g.addColorStop(0, ['#e4a35e', '#d9964f', '#eaad68'][tone]); g.addColorStop(0.5, ['#b8743a', '#ad6a32', '#c07c40'][tone]); g.addColorStop(1, '#7c4a20');
      c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5; rr(c, x + 1, -th / 2, 30, th, 4); c.fill(); c.stroke();
    }
    // перила на верёвке
    c.strokeStyle = '#5a3a18'; c.lineWidth = 6; c.lineCap = 'round';
    for (const x of [-H + 10, -H / 2, 0, H / 2, H - 10]) { c.beginPath(); c.moveTo(x, -th / 2); c.lineTo(x, -th / 2 - 46); c.stroke(); }
    c.strokeStyle = '#c99a5a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-H + 10, -th / 2 - 44); c.quadraticCurveTo(-H / 4, -th / 2 - 30, 0, -th / 2 - 44); c.quadraticCurveTo(H / 4, -th / 2 - 30, H - 10, -th / 2 - 44); c.stroke();
    // указатель равновесия на опоре
    c.restore();
    const bg = c.createRadialGradient(p.x - 4, p.y - 4, 1, p.x, p.y, 14); bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.5, '#ffd43b'); bg.addColorStop(1, '#a86b00');
    c.fillStyle = bg; c.strokeStyle = '#5e3c00'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.fill(); c.stroke();
  }
  drawPan(c, side) {
    const e = this.end(side), pp = this.panPt(side), W = this.panW;
    c.strokeStyle = '#7a5428'; c.lineWidth = 3.5;
    for (const ox of [-W * 0.42, W * 0.42]) { c.beginPath(); c.moveTo(e.x, e.y + 10); c.lineTo(pp.x + ox, pp.y - 2); c.stroke(); }
    // плетёная корзина-поддон
    const g = c.createLinearGradient(0, pp.y - 4, 0, pp.y + 30); g.addColorStop(0, '#e9b56a'); g.addColorStop(1, '#8a5a24');
    c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(pp.x - W / 2, pp.y - 4); c.lineTo(pp.x + W / 2, pp.y - 4); c.lineTo(pp.x + W / 2 - 12, pp.y + 28); c.lineTo(pp.x - W / 2 + 12, pp.y + 28); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(78,44,16,0.5)'; c.lineWidth = 2; for (let y = pp.y + 4; y < pp.y + 26; y += 7) { c.beginPath(); c.moveTo(pp.x - W / 2 + 6, y); c.lineTo(pp.x + W / 2 - 6, y); c.stroke(); }
  }
  drawSign(c) {
    if (!this.sign) return;
    const p = this.pivot(), k = easeOutBack(this.signT);
    c.save(); c.translate(p.x, p.y + 70); c.scale(k, k);
    glow(c, 0, 0, 56, 'rgba(255,230,120,0.7)', 0.8);
    c.fillStyle = '#5b3313'; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fill();
    const g = c.createRadialGradient(-10, -12, 3, 0, 0, 27); g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#ffc21a'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 25, 0, 7); c.fill();
    drawSignGlyph(c, this.sign, 0, 0, 12, '#fff', '#b8460b');
    c.restore();
  }
}
// горка камней на берегу (отсюда носим камни)
class StonePile extends Ent {
  constructor(x, y) { super(x, y); this.z = -1.3; }
  audit(add) { add('горка камней', this.x, this.y, { feet: 30 }); }
  draw(c) { for (const [dx, dy, s] of [[-28, 0, 34], [6, 0, 38], [34, 0, 30], [-10, -26, 32], [20, -28, 30], [4, -52, 30]]) drawItem(c, 'stone', this.x + dx, this.y + dy, s); }
}
const LV2 = {
  idx: 1, rngId: 2,
  build(S) {
    const L = new Level(100, 13, 'day'); S.L = L; L.song = 'river';
    const rng = S.rng;
    let a1 = rint(rng, 4, 9), b1 = rint(rng, Math.max(1, a1 - 5), a1 - 1);
    let R2 = rint(rng, 4, 9), L2 = rint(rng, Math.max(1, R2 - 5), R2 - 1); while (R2 - L2 === a1 - b1) { R2 = rint(rng, 4, 9); L2 = rint(rng, Math.max(1, R2 - 5), R2 - 1); }
    let L3, R3; do { L3 = rint(rng, 1, 8); R3 = rint(rng, 2, 9); } while (L3 === R3 || Math.abs(L3 - R3) > 5);
    S.math = { st: [{ kind: 'add', L: a1, R: b1 }, { kind: 'remove', L: L2, R: R2 }, { kind: 'sign', L: L3, R: R3 }] };
    // берега и три моста-коромысла
    const E = [22, 46, 70];
    L.ground(0, 22, 10); L.ground(30, 46, 10); L.ground(54, 70, 10); L.ground(78, 100, 10);
    L.plank(5, 8, 8); L.plank(34, 36, 8); L.plank(58, 60, 7);
    L.spawn = { x: tc(2), y: tx(10) };
    S.arch = L.add(new NPC('arch', tc(6), tx(10), 1));
    S.stations = E.map((e, i) => {
      const br = L.add(new BeamBridge(e, 10)); const m = S.math.st[i]; br.setCounts(m.L, m.R); br.ang = br.target;
      const pile = L.add(new StonePile(tx(e - 2) + 24, tx(10)));
      return { i, E: e, br, pile, started: false, done: false, cols: [e - 8, e - 6, e - 4] };
    });
    // секрет: стог → высокий навес над первым берегом
    L.plank(89, 92, 4); S.bouncers.push(L.add(new Bouncer(tc(88) - 20, tx(10), 'hay'))); S.gold = L.add(new GoldLantern(tx(90) + 32, tx(4)));
    S.puddles.push(L.add(new Puddle(tx(32) + 8, tx(34) + 40, tx(10))));
    S.flag = L.add(new Flag(tc(95), tx(10), true)); S.flag.locked = true;
    S.shch = L.add(new Shchelk(tx(79) + 20, tx(10) - 6)); S.shch.mode = 'perch'; S.shch.face = -1; S.shch.weight = true;
    checkpoint(L, 13, 10, false); checkpoint(L, 31, 10); checkpoint(L, 37, 10, false); checkpoint(L, 55, 10); checkpoint(L, 61, 10, false); checkpoint(L, 79, 10);
    ffAt(S, [[tc(88) - 20, 468], [tc(88) - 10, 378], [tc(88) + 20, 288]]);
    for (const e of E) ffArc(S, tx(e) + 60, 560, tx(e + 8) - 60, 560, 60, 4);
    ffAt(S, [[tc(35), 440], [tc(59), 380], [tc(88), 560]]);
    [[1, 80], [17, 70], [31.5, 70], [43, 80], [56, 70], [67, 80], [80, 80], [97, 80]].forEach(([c, w]) => deco(L, 't_bush', tc(c), tx(10), w, 8));
    return L;
  },
  start(S) {
    S.weightsBase = 1; S.weightsHave = 1;
    S.hud = { icon: 'weights', text: (S.weightsHave || 0) + ' из 5' };
    run((function* () {
      G.freeze = true; yield 0.5;
      archSay(S.arch, 'point', VL.l2Intro(), 6); yield vwait(0.3);
      say(S.p, VL.l2IskraGo(), 3); yield vwait(0.2);
      S.arch.pose = 'idle'; G.freeze = false;
    })());
  },
  goal(S) { return goalOf(S, st => tx(st.E - 5), null); },
  update(S, dt) {
    const p = S.p;
    for (const st of S.stations) if (!st.started && p.onGround && p.x > tx(st.E - 9) && p.x < tx(st.E) && Math.abs(p.y - tx(10)) < 2 && !(S.q && !S.q.solved)) { st.started = true; S.cur = st; S.respawnPt = { x: tc(st.E - 8), y: tx(10) }; run(LV2.station(S, st)); }
    S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки, как в прологе
    if (S.wp && !S.wp.got && !p.hidden && overlap(p, S.wp.x - 30, S.wp.y - 60, 60, 60)) { S.wp.got = true; weightGot(S); run((function* () { yield 0.3; say(S.p, VL.l2Got(), 3); })()); }
    if (!S.done && !S.flag.locked && overlap(p, S.flag.x - 30, S.flag.y - 190, 60, 190)) { S.flag.on = true; S.complete(); }
  },
  lock(S, st) { return fitLock(tx(st.E - 10) + 10, tx(st.E + 8) + 40, tx(7) - 126); },
  *flyStones(S, st, side, n, out) {
    const br = st.br;
    for (let k = 0; k < n; k++) {
      if (!out) {
        const idx = (side < 0 ? br.left : br.right);
        S.L.add(new FlyItem('stone', br.sz, st.pile.x, st.pile.y - 40, () => br.panPt(side).x + br.slots(idx + 1)[idx][0], () => br.panPt(side).y - 2 + br.slots(idx + 1)[idx][1], 0.5, () => { if (side < 0) br.left++; else br.right++; Sound.raftLand(); }));
        yield 0.55;
      } else {
        const n0 = side < 0 ? br.left : br.right, sl = br.slots(n0)[n0 - 1], pp = br.panPt(side);
        if (side < 0) br.left--; else br.right--;
        const x0 = pp.x + sl[0], y0 = pp.y - 2 + sl[1], x1 = x0 + side * 120;
        S.L.add(new FlyItem('stone', br.sz, x0, y0, x1, S.L.pxH - 40, 0.55, () => { Sound.splashSmall(); for (let i = 0; i < 8; i++) spawn({ type: 'drop', x: x1 + frand(-10, 10), y: S.L.pxH - 46, vx: frand(-120, 120), vy: frand(-380, -160), g: 1400, life: 0.7, size: frand(3, 6) }); }, 80));
        yield 0.5;
      }
    }
    yield 0.6; yield () => br.settled;
  },
  station(S, st) {
    return (function* () {
      const br = st.br, m = S.math.st[st.i], A = S.arch;
      G.freeze = true;
      yield* puffTo(A, tc(st.E - 10), tx(10), 1);
      S.p.autoX = tc(st.E - 7); S.p.autoFace = 1;
      S.cam.lock = LV2.lock(S, st);
      yield 0.6;
      if (st.i === 0) { archSay(A, 'point', VL.l2A1(), 5); }
      else if (st.i === 1) { say(S.p, VL.l2B0(), 3); yield vwait(0.2); archSay(A, 'point', VL.l2B1(), 5); }
      else { archSay(A, 'worried', VL.l2C0(), 4); yield vwait(0.2); say(S.shch, VL.l2Sh1(), 3); }
      yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
      check(br.left === m.L && br.right === m.R, 'на мосту ' + br.left + ' и ' + br.right);
      if (m.kind === 'add') {
        const d = m.L - m.R;
        S.ask({ text: `${m.R} + ? = ${m.L}`, answer: d, choices: makeChoices(S.rng, d, 1, 9), row: 7, cols: st.cols, speaker: A,
          say: VL.l2QAdd(m.L, m.R), eqDone: `${m.R} + ${d} = ${m.L}`, hints: [VL.l2HAdd1(), VL.l2HAdd2(m.R, m.L)],
          demo: function* () { yield* countPan(S, br, -1, A, VL.countL()); yield* countPan(S, br, 1, A, VL.countR()); br.labels = null; say(A, VL.l2DemoAdd(m.R, m.L), 4); yield vwait(0.5); },
          onCorrect: function* () { br.labels = null; A.pose = 'cheer'; say(A, VL.l2OkAdd(d), 4); yield* LV2.flyStones(S, st, 1, d, false); yield* LV2.levelled(S, st); } });
      } else if (m.kind === 'remove') {
        const d = m.R - m.L;
        S.ask({ text: `${m.R} − ? = ${m.L}`, answer: d, choices: makeChoices(S.rng, d, 1, 9), row: 7, cols: st.cols, speaker: A,
          say: VL.l2QRem(m.L, m.R), eqDone: `${m.R} − ${d} = ${m.L}`, hints: [VL.l2HRem1(), VL.l2HRem2(m.R, m.L)],
          demo: function* () { yield* countPan(S, br, -1, A, VL.countL()); yield* countPan(S, br, 1, A, VL.countR()); br.labels = null; say(A, VL.l2DemoRem(m.R, m.L), 4); yield vwait(0.5); },
          onCorrect: function* () { br.labels = null; A.pose = 'cheer'; say(A, VL.l2OkRem(d), 4); yield* LV2.flyStones(S, st, 1, d, true); yield* LV2.levelled(S, st); } });
      } else {
        const sg = signOf(m.L, m.R), d = Math.abs(m.L - m.R), side = m.L < m.R ? -1 : 1;
        S.ask({ text: `${m.L} ? ${m.R}`, answer: sg, choices: signChoices(S.rng, SIGNS), row: 7, cols: st.cols, speaker: A,
          say: VL.l2QSign(), eqDone: `${m.L} ${sg} ${m.R}`, hints: [VL.l2HSign1(), VL.l2HSign2()],
          demo: function* () { yield* countPan(S, br, -1, A, VL.countL()); yield* countPan(S, br, 1, A, VL.countR()); br.labels = null; say(A, VL.l1Demo(m.L, m.R), 4); yield vwait(0.5); },
          onCorrect: function* () {
            br.labels = null; A.pose = 'cheer'; say(A, VL.l2OkSign(m.L, m.R), 5); yield vwait(0.2);
            A.pose = 'point'; say(A, side < 0 ? VL.l2FixL(d) : VL.l2FixR(d), 4); yield vwait(0.1);
            yield* LV2.flyStones(S, st, side, d, false);
            const big = Math.max(m.L, m.R), small = Math.min(m.L, m.R);
            S.board = { text: side < 0 ? `${small} + ${d} = ${big}` : `${big} = ${small} + ${d}`, solved: true, t: 0 };
            check(eqTrue(S.board.text), 'доска после выравнивания верна: ' + S.board.text);
            yield* LV2.levelled(S, st);
          } });
      }
    })();
  },
  *levelled(S, st) {
    const br = st.br, A = S.arch;
    check(br.left === br.right, 'мост выровнен: ' + br.left + ' = ' + br.right);
    br.sign = '='; Sound.sparkle(); br.setWalk(S.L); Sound.fanfare();
    say(A, st.i === 0 ? VL.l2Eq1(br.left) : st.i === 1 ? VL.l2Eq2(br.left) : VL.l2Eq3(br.left), 4);
    yield vwait(0.3);
    if (st.i === 2) {
      // мост ровный — Щёлк пугается и улетает, гирька падает на берег
      const sh = S.shch; say(sh, VL.l2Sh2(), 3); yield vwait(0.1);
      sh.mode = 'goto'; sh.tx = tx(104); sh.ty = tx(2); sh.weight = false;
      const wp = S.L.add(new WeightPickup(tx(82) + 20, tx(10))); S.wp = wp; puff(wp.x, wp.y - 20, 10); Sound.bump();
      yield 0.6;
    }
    A.pose = 'idle'; S.cam.lock = null; st.done = true;
  },
  counted(S) {
    const st = S.cur; if (!st || !asking(S)) return null;
    const out = [];
    st.br.itemRects(-1).forEach((r, i) => out.push({ kind: 'камень слева ' + (i + 1), group: 'L', r }));
    st.br.itemRects(1).forEach((r, i) => out.push({ kind: 'камень справа ' + (i + 1), group: 'R', r }));
    return out;
  },
  countRule(S, ok) { const m = S.math.st[S.cur.i]; return [{ name: 'камней слева', visible: cnt(ok, o => o.group === 'L'), expected: m.L }, { name: 'камней справа', visible: cnt(ok, o => o.group === 'R'), expected: m.R }]; },
  selfCheck(S) {
    if (S.cur && S.board && !S.board.solved) { const m = S.math.st[S.cur.i]; check(S.cur.br.left === m.L && S.cur.br.right === m.R, 'мост = числам вопроса'); }
    for (const st of S.stations) if (st.br.walk) check(st.br.left === st.br.right, 'по мосту идут только когда поровну');
  },
};
