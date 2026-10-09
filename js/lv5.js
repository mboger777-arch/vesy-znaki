'use strict';
// ---------- Уровень 5: Башня Великих весов (закат → вечерние огни, финал истории) ----------
// Пять этажей-уступов; на каждом весы на кронштейне в стене башни и своя задача:
// знак → Щёлк меняет чаши местами → «сколько добавить» (появляется подъёмник) → слова → «поровну».
// Наверху — Великие весы: все пять гирек → равновесие → город зажигает огни → Щёлк просит прощения и получает медаль.
class WallScales extends Scales {
  constructor(x, pivotY, o) { super(x, pivotY, Object.assign({ style: 'wall', post: 0, arm: 130, chain: 110, perRow: 4 }, o)); this.mount = { x, y: pivotY - 80 }; this.fade = 0; this.z = -0.9; }
  update(dt) { super.update(dt); if (this.going) this.fade = Math.min(1, this.fade + dt * 1.6); }
  audit(add, out, L) { if (this.fade < 1) super.audit(add, out, L); }
  draw(c) { if (this.fade >= 1) return; c.save(); c.globalAlpha = 1 - this.fade; c.translate(0, -this.fade * 40); super.draw(c); c.restore(); }
}
const L5_ITEMS = ['gem', 'coin', 'stone', 'melon', 'apple'];
const LV5 = {
  idx: 4, rngId: 5,
  build(S) {
    const L = new Level(27, 46, 'eve'); S.L = L; L.night = 0.15; L.water = false; L.song = 'sunset'; L.tint = ['rgba(255,150,70,0.16)', 'rgba(255,90,40,0.10)'];
    const rng = S.rng;
    const pair = (lo, hi, minD) => { let a, b; do { a = rint(rng, lo, hi); b = rint(rng, lo, hi); } while (Math.abs(a - b) < minD); return [a, b]; };
    const st = [];
    { const [a, b] = pair(1, 8, 1); st.push({ kind: 'sign', L: a, R: b }); }
    { const [a, b] = pair(1, 8, 2); st.push({ kind: 'swap', L: a, R: b }); }
    { let a, b; do { a = rint(rng, 3, 8); b = rint(rng, 1, 7); } while (!(a > b && a - b <= 5)); st.push({ kind: 'add', L: a, R: b }); }
    { const [a, b] = pair(1, 8, 1); st.push({ kind: 'words', L: a, R: b }); }
    { const n = rint(rng, 2, 8); st.push({ kind: 'eq', L: n, R: n }); }
    S.math = { st };
    L.ground(0, 27, 44);
    S.rows = [44, 38, 32, 26, 20]; S.topRow = 14;
    S.ledges = [];
    S.rows.forEach((r, i) => {
      const left = i % 2 === 0;
      if (i > 0) { if (left) L.stone(3, 12, r, r + 1); else L.stone(14, 23, r, r + 1); }
      S.ledges.push({ row: r, left, x0: left ? (i === 0 ? 0 : 3) : 14, x1: left ? 12 : 23, cols: left ? [6, 8, 10] : [15, 17, 19], archCol: left ? (i === 0 ? 3 : 4) : 22.2, started: false });
    });
    L.stone(14, 23, S.topRow, S.topRow + 1);
    L.spawn = { x: tc(1), y: tx(44) };
    S.arch = L.add(new NPC('arch', tc(3), tx(44), 1));
    const cx = tc(13) - 32;
    S.scales = S.ledges.map((ld, i) => {
      const m = st[i], kind = L5_ITEMS[i];
      const o = { item: kind, left: m.L, right: m.R };
      if (kind === 'melon') o.sz = 40;
      if (m.kind === 'eq') { o.item = 'apple'; o.leftKind = 'apple'; o.rightKind = 'pear'; }
      return L.add(new WallScales(cx + (ld.left ? 180 : -180), tx(ld.row) - 330, o));
    });
    // Великие весы наверху: слева пять дынь, справа пусто — ждут гирьки
    S.great = L.add(new Scales(tc(21), tx(S.topRow), { style: 'great', item: 'melon', arm: 150, post: 230, chain: 96, panW: 170, left: 5, right: 0, rightKind: 'weight', perRow: 3 }));
    S.solved = 0; S.lit = false;
    // секрет: стог у стены подбрасывает на каменный столб с золотым фонарём
    L.stone(25, 27, 40, 44);
    S.bouncers.push(L.add(new Bouncer(1522, tx(44), 'hay')));
    S.gold = L.add(new GoldLantern(tx(25) + 52, tx(40)));
    ffAt(S, [[tc(15), 2756], [tc(17), 2756], [tc(19), 2756], [tc(21), 2756]]);
    ffAt(S, [[1524, 2634], [1530, 2544], [1570, 2464]]);
    ffAt(S, [[712, tx(32) - 70], [712, tx(20) - 70], [tc(15), tx(14) - 70]]);
    S.shch = L.add(new Shchelk(tc(22), tx(9))); S.shch.mode = 'perch'; S.shch.face = -1; S.shch.weight = true;
    return L;
  },
  start(S) {
    S.weightsBase = 4; S.weightsHave = 4;
    S.hud = { icon: 'weights', text: (S.weightsHave || 0) + ' из 5' };
    run((function* () {
      G.freeze = true;
      // Искра появляется у самого края кадра: отходит вправо от Архимеда, чтобы её реплика была с пузырём у рта
      S.p.autoX = tc(8); S.p.autoFace = -1; const t0 = G.t; yield () => S.p.autoX == null || G.t - t0 > 2.5; yield 0.2;
      archSay(S.arch, 'point', VL.l5Intro(), 6); yield vwait(0.2);
      say(S.p, VL.l5IskraGo(), 3); yield vwait(0.2);
      S.arch.pose = 'idle'; G.freeze = false; S.introDone = true;   // первая загадка — только после вступления
    })());
  },
  goal(S) {
    if (S.solved < 5) { const ld = S.ledges[S.solved]; return ld.started ? null : { x: tc(ld.left ? 5 : 21), y: tx(ld.row), kind: 'station' }; }
    if (!S.topStarted) return { x: tc(15), y: tx(S.topRow), kind: 'trigger' };
    if (S.wp && !S.wp.got) return { x: S.wp.x, y: S.wp.y, kind: 'weight' };
    return null;
  },
  update(S, dt) {
    const p = S.p, L = S.L;
    // если во время вопроса Искра ушла с уступа — камера идёт за ней, вернётся — снова покажет вопрос целиком
    const cur = S.ledges[S.solved];
    if (S.q && !S.q.solved && cur) {
      const near = Math.abs(p.y - tx(cur.row)) < 150 && p.x > tx(cur.x0) - 64 && p.x < tx(cur.x1) + 64;
      if (!near && S.cam.lock) { S.lockAway = S.cam.lock; S.cam.lock = null; }
      else if (near && !S.cam.lock && S.lockAway) { S.cam.lock = S.lockAway; S.lockAway = null; }
    }
    S.ledges.forEach((ld, i) => {
      if (!ld.started && i === S.solved && (i > 0 || S.introDone) && p.onGround && Math.abs(p.y - tx(ld.row)) < 2 && p.x > tx(ld.x0) && p.x < tx(ld.x1)) {
        ld.started = true; S.respawnPt = { x: p.x, y: tx(ld.row) };
        run(LV5.station(S, i));
      }
    });
    if (S.solved >= 5 && !S.topStarted && p.onGround && Math.abs(p.y - tx(S.topRow)) < 2 && p.x > tx(14)) { S.topStarted = true; S.respawnPt = { x: tc(15), y: tx(S.topRow) }; run(LV5.top(S)); }
    if (S.wp && !S.wp.got && !p.hidden && !G.freeze && Dialog.idle() && overlap(p, S.wp.x - 30, S.wp.y - 60, 60, 60)) { S.wp.got = true; weightGot(S); run(LV5.finale(S)); }
    // солнце садится: чем выше Искра, тем темнее
    if (!S.lit) L.night = 0.15 + 0.3 * clamp((tx(44) - p.y) / (tx(44) - tx(14)), 0, 1);
    S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки
    if (S.lit) {
      S.fwT = (S.fwT || 0) - dt;
      if (S.fwT <= 0) {
        S.fwT = frand(0.4, 0.9); const x = S.cam.x + frand(0.15, 0.85) * viewW(), y = S.cam.y + frand(0.08, 0.3) * viewH(), col = ['#ffd43b', '#ff8787', '#74c0fc', '#b2f2bb', '#f783ac'][Math.floor(frand(0, 5))];
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, v = frand(140, 230); spawn({ type: 'fw', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, drag: 1.4, life: frand(1, 1.4), size: frand(4, 6), col }); }
        Sound.tone(frand(500, 900), 0.3, 'sine', 0.05, 0, 1800);
      }
    }
  },
  lock(S, i) {
    const ld = S.ledges[i], r = ld.row, sc = S.scales[i];
    return ld.left ? fitLock(tx(i === 0 ? 2 : 3) + 10, sc.x + sc.arm + 100, tx(r) - 372) : fitLock(sc.x - sc.arm - 100, tx(23) + 10, tx(r) - 372);
  },
  station(S, i) {
    return (function* () {
      const ld = S.ledges[i], m = S.math.st[i], A = S.arch, sc = S.scales[i];
      G.freeze = true;
      if (i > 0) yield* puffTo(A, tc(Math.floor(ld.archCol)) + (ld.archCol % 1) * TILE, tx(ld.row), ld.left ? 1 : -1);
      S.cur = { i, sc };
      S.cam.lock = LV5.lock(S, i);
      yield 0.5;
      const kind = sc.item, base = { row: ld.row - 4, cols: ld.cols, speaker: A };
      const hintsSign = [VL.l5H1(), VL.l5H2()];
      const done = function* (line) {
        sc.labels = null; A.pose = 'cheer'; say(A, line, 5); yield vwait(0.2); A.pose = 'idle';
        yield* LV5.next(S, i);
      };
      const demoLR = function* () { yield* countPan(S, sc, -1, A, VL.countL()); yield* countPan(S, sc, 1, A, VL.countR()); sc.labels = null; say(A, VL.l1Demo(sc.left, sc.right), 4); yield vwait(0.5); };
      if (m.kind === 'sign') {
        archSay(A, 'point', VL.l5A0(kind), 5); yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
        const sg = signOf(m.L, m.R);
        S.ask(Object.assign({ text: `${m.L} ? ${m.R}`, answer: sg, choices: signChoices(S.rng, SIGNS), say: VL.l5Q0(), eqDone: `${m.L} ${sg} ${m.R}`, hints: hintsSign, demo: demoLR, onCorrect: function* () { yield* done(VL.l5OkSign(m.L, m.R)); } }, base));
      } else if (m.kind === 'swap') {
        archSay(A, 'idle', VL.l5B0(m.L, m.R, kind), 5); yield vwait(0.3);
        // Щёлк влетает и меняет чаши местами
        const sh = S.shch; sh.vis = true; const p0 = sc.pivot(); sh.x = p0.x + (ld.left ? 600 : -600); sh.y = p0.y - 200; sh.mode = 'goto'; sh.tx = p0.x; sh.ty = p0.y - 60; sh.gotoSpeed = 420;
        yield () => sh.mode === 'arrived';
        Sound.laugh(); say(sh, VL.l5Sh1(), 3); yield vwait(0.1);
        puff(sc.panPt(-1).x, sc.panPt(-1).y - 30, 8); puff(sc.panPt(1).x, sc.panPt(1).y - 30, 8); Sound.whoosh();
        const t = sc.left; sc.left = sc.right; sc.right = t; m.L = sc.left; m.R = sc.right; m.swapped = true;
        yield 0.4;
        sh.mode = 'goto'; sh.tx = tc(22); sh.ty = tx(9);
        yield 0.8; yield () => sc.settled;
        archSay(A, 'worried', VL.l5B1(), 5); yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
        const sg = signOf(m.L, m.R);
        S.ask(Object.assign({ text: `${m.L} ? ${m.R}`, answer: sg, choices: signChoices(S.rng, SIGNS), say: VL.l5QB(), eqDone: `${m.L} ${sg} ${m.R}`, hints: hintsSign, demo: demoLR, onCorrect: function* () { yield* done(VL.l5OkSign(m.L, m.R)); } }, base));
      } else if (m.kind === 'add') {
        archSay(A, 'point', VL.l5C0(), 5); yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
        const d = m.L - m.R;
        S.ask(Object.assign({ text: `${m.R} + ? = ${m.L}`, answer: d, choices: makeChoices(S.rng, d, 1, 6), say: VL.l5QC(m.L, m.R), eqDone: `${m.R} + ${d} = ${m.L}`, hints: [VL.l5HC1(), VL.l5HC2(m.L, m.R)],
          demo: function* () { yield* countPan(S, sc, -1, A, VL.countL()); yield* countPan(S, sc, 1, A, VL.countR()); sc.labels = null; say(A, VL.l5HC2(m.L, m.R), 4); yield vwait(0.5); },
          onCorrect: function* () {
            // монеты летят на правую чашу — весы выравниваются на глазах
            for (let k = 0; k < d; k++) { const idx = sc.right + k; S.L.add(new FlyItem(kind, sc.sz, S.p.x, S.p.y - 70, () => sc.panPt(1).x + sc.slots(idx + 1, kind)[idx][0], () => sc.panPt(1).y - 2 + sc.slots(idx + 1, kind)[idx][1], 0.5, () => { sc.right++; Sound.count(Math.min(10, sc.right)); })); yield 0.4; }
            yield 0.6; yield () => sc.settled;
            check(sc.left === sc.right, 'после добавления весы в равновесии');
            yield* done(VL.l5OkC(d));
          } }, base));
      } else if (m.kind === 'words') {
        archSay(A, 'point', VL.l5D0(), 5); yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
        S.ask(Object.assign({ text: `${m.L} ? ${m.R}`, answer: wordOf(m.L, m.R), choices: signChoices(S.rng, WORDS), wide: true, say: VL.l5QD(), eqDone: `${m.L} ${signOf(m.L, m.R)} ${m.R}`, hints: hintsSign, demo: demoLR, onCorrect: function* () { yield* done(VL.l5OkD(m.L, m.R)); } }, base));
      } else {
        archSay(A, 'point', VL.l5E0(), 5); yield vwait(0.3); A.pose = 'idle'; G.freeze = false;
        S.ask(Object.assign({ text: `${m.L} ? ${m.R}`, answer: '=', choices: signChoices(S.rng, SIGNS), say: VL.l5QE(), eqDone: `${m.L} = ${m.R}`, hints: [VL.l5HE1(), VL.l5H2()], demo: demoLR, onCorrect: function* () { yield* done(VL.l5OkE(m.L)); } }, base));
      }
    })();
  },
  *next(S, i) {
    const ld = S.ledges[i], sc = S.scales[i], r = ld.row;
    S.solved = i + 1; S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки
    check(S.solved === i + 1, 'этажей пройдено = решённых задач');
    Sound.sparkle(); sparkBurst(sc.pivot().x, sc.pivot().y + 80, 24, '#ffe066', 300);
    yield 0.4; sc.going = true; yield 0.6;
    if (i === 4) { /* последний уступ: ступеньки к балкону */ }
    if (i === 2) {
      // подъёмник: корзина на верёвках опускается с блока на кронштейне
      const lift = S.L.add(new Lift(tc(13) - 32, tx(S.rows[3]), tx(r), tx(S.rows[3]) - 132, S));
      S.L.movers.push(lift); S.L.add(new LiftFront(lift)); S.lift = lift; Sound.liftCreak();
      yield vwait(1.4);
      say(S.arch, VL.l5Lift(), 3);
      yield 0.4;
    } else {
      const stA = ld.left ? { row: r - 2, c0: 12, c1: 15 } : { row: r - 2, c0: 11, c1: 14 };
      const stB = { row: r - 4, c0: 12, c1: 14 };
      for (const st of [stA, stB]) { S.L.add(new Step(st.c0, st.c1, st.row, S)); Sound.whoosh(); yield 0.6; }
    }
    // камеру отпускаем, только если Искра ещё не начала следующий этаж (у него своя рамка)
    if (!(S.ledges[i + 1] && S.ledges[i + 1].started)) { S.cam.lock = null; S.lockAway = null; }
  },
  top(S) {
    return (function* () {
      const sh = S.shch, p = S.p; G.freeze = true;
      S.cam.lock = fitLock(tx(13), tx(26), tx(S.topRow) - 430);
      p.autoX = tc(16); p.autoFace = 1;
      sh.vis = true; sh.weight = true; sh.mode = 'goto'; sh.tx = tc(16) + 30; sh.ty = tx(S.topRow) - 270; sh.gotoSpeed = 300;
      yield () => sh.mode === 'arrived'; sh.face = -1;
      say(sh, VL.l5Top1(), 4); yield vwait(0.2);
      say(p, VL.l5Top2(), 4); yield vwait(0.2);
      say(sh, VL.l5Top3(), 5); yield vwait(0.2);
      // Щёлк сам кладёт гирьку на балкон
      sh.weight = false; const wp = S.L.add(new WeightPickup(tc(17) + 10, tx(S.topRow))); S.wp = wp; puff(wp.x, wp.y - 20, 8); Sound.pop();
      sh.mode = 'goto'; sh.tx = tc(16) + 30; sh.ty = tx(S.topRow) - 270;   // в небо над Искрой: не садится на гирьки, которые сейчас считаем
      yield 0.4; G.freeze = false;
    })();
  },
  finale(S) {
    return (function* () {
      const sh = S.shch, p = S.p, A = S.arch, gs = S.great; G.freeze = true;
      yield 0.3; say(p, VL.l5Got(), 3); yield vwait(0.2);
      yield* puffTo(A, tc(14) + 10, tx(S.topRow), 1);
      archSay(A, 'point', VL.l5Put(), 4); yield vwait(0.2);
      // пять гирек по одной летят на правую чашу: весы выпрямляются
      for (let k = 0; k < 5; k++) {
        const idx = k; S.L.add(new FlyItem('weight', gs.sz, p.x, p.y - 80, () => gs.panPt(1).x + gs.slots(idx + 1, 'weight')[idx][0], () => gs.panPt(1).y - 2 + gs.slots(idx + 1, 'weight')[idx][1], 0.6, () => { gs.right++; Sound.count(gs.right); }, 160));
        yield 0.55;
      }
      yield 0.8; yield () => gs.settled; yield 0.2;
      check(gs.left === 5 && gs.right === 5 && Math.abs(gs.ang) < 0.01, 'Великие весы: 5 и 5 — равновесие');
      gs.sign = '='; Sound.fanfare(); G.shake = 0.25; sparkBurst(gs.pivot().x, gs.pivot().y, 40, '#fff1a8', 420);
      archSay(A, 'cheer', VL.l5Bal(), 4); yield vwait(0.2);
      // город зажигает огни
      S.lit = true; for (let t = 0; t < 1.2; t += 1 / 60) { S.L.night = Math.max(0.12, S.L.night - 1 / 60 * 0.3); yield 1 / 60; }
      say(NARR, VL.l5Lights(), 5); yield vwait(0.2);
      sh.mode = 'goto'; sh.tx = tc(16) + 30; sh.ty = tx(S.topRow) - 270; yield () => sh.mode === 'arrived'; sh.face = -1;
      say(sh, VL.l5Sorry(), 4); yield vwait(0.2);
      archSay(A, 'idle', VL.l5Forgive(), 6); yield vwait(0.2);
      S.medal = { t: 0 }; Sound.sparkle(); sparkBurst(sh.x, sh.y + 10, 24, '#ffd43b', 260);
      Sound.laugh(); say(sh, VL.l5Medal(), 3); yield vwait(0.2);
      A.pose = 'cheer'; say(p, VL.l5Hurray(), 2.5); yield vwait(0.6);
      G.freeze = false; S.complete();
    })();
  },
  // наверху пузыри обходят дыни и гирьки на Великих весах и знак (как счётные предметы)
  avoidRects(S) {
    if (!S.topStarted || !S.great) return [];
    const g = S.great; return [...g.itemRects(-1), ...g.itemRects(1), g.signRect()].map(r => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12, counted: true }));
  },
  counted(S) {
    // Искра ушла с уступа во время вопроса — камера идёт за ней, считать сейчас нечего
    if (!S.cur || !asking(S) || !S.cam.lock) return null;
    const sc = S.cur.sc, out = [];
    sc.itemRects(-1).forEach((r, i) => out.push({ kind: 'слева ' + (i + 1), group: 'L', r }));
    sc.itemRects(1).forEach((r, i) => out.push({ kind: 'справа ' + (i + 1), group: 'R', r }));
    return out;
  },
  countRule(S, ok) {
    const m = S.math.st[S.cur.i];
    return [{ name: 'слева на весах', visible: cnt(ok, o => o.group === 'L'), expected: m.L }, { name: 'справа на весах', visible: cnt(ok, o => o.group === 'R'), expected: m.R }];
  },
  selfCheck(S) {
    check(S.weightsHave >= 4 && S.weightsHave <= 5, 'на башне у героев 4 гирьки (5-я — наверху)');
    if (S.cur && S.board && !S.board.solved) { const m = S.math.st[S.cur.i], sc = S.cur.sc; check(sc.left === m.L && sc.right === m.R, 'весы = числам на доске'); }
    for (const sc of S.scales) check(Math.sign(Math.round(sc.target * 1000)) === Math.sign(sc.right - sc.left), 'наклон: опускается чаша, где больше');
  },
  drawFront(S, c) {
    if (S.medal) {
      // медаль на шее у Щёлка
      const sh = S.shch; S.medal.t = Math.min(1, S.medal.t + 1 / 60); const k = easeOutBack(S.medal.t);
      const x = sh.x + 4, y = sh.y + 22;
      c.save(); c.translate(x, y); c.scale(k, k);
      c.strokeStyle = '#c92a2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(-12, -16); c.lineTo(0, 0); c.lineTo(12, -16); c.stroke();
      glow(c, 0, 8, 30, 'rgba(255,214,90,0.8)', 0.9);
      const g = c.createRadialGradient(-3, 5, 1, 0, 8, 12); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#a86b00');
      c.fillStyle = g; c.strokeStyle = '#5e3c00'; c.lineWidth = 2; c.beginPath(); c.arc(0, 8, 11, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    if (S.lit) {
      // гирлянда огней над балконом
      for (let i = 0; i < 16; i++) { const x = tx(14) + 20 + i * 36, y = tx(S.topRow) - 90 + Math.sin(i * 0.7) * 6; glow(c, x, y, 26, ['rgba(255,214,90,0.9)', 'rgba(255,135,135,0.9)', 'rgba(116,192,252,0.9)'][i % 3], 0.8 + 0.2 * Math.sin(G.t * 4 + i)); c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
    }
  },
  drawBack(S, c) {
    // маяк: чуть сужается кверху, полосатый, объёмный
    const cx = tc(13) - 32, top = tx(12), bot = tx(44);
    const wb = 230, wt = 180;
    c.save();
    const paintBody = (c) => {
      const body = () => { c.beginPath(); c.moveTo(cx - wb, bot); c.lineTo(cx - wt, top); c.lineTo(cx + wt, top); c.lineTo(cx + wb, bot); c.closePath(); };
      c.fillStyle = 'rgba(20,10,40,0.3)'; c.save(); c.translate(18, 0); body(); c.fill(); c.restore();
      body(); c.fillStyle = '#7a5a48'; c.fill();
      c.save(); c.translate(0, 0); c.beginPath(); c.moveTo(cx - wb + 6, bot); c.lineTo(cx - wt + 6, top + 6); c.lineTo(cx + wt - 6, top + 6); c.lineTo(cx + wb - 6, bot); c.closePath(); c.clip();
      c.save(); c.scale(0.4, 0.4); c.fillStyle = PAT.stone || (PAT.stone = c.createPattern(IMG.tex_stone, 'repeat')); c.fillRect((cx - wb) / 0.4, top / 0.4, wb * 2 / 0.4, (bot - top) / 0.4); c.restore();
      // золотые пояса башни
      c.globalCompositeOperation = 'multiply';
      for (let y = top + 180; y < bot; y += 760) { c.fillStyle = '#ffc46b'; c.fillRect(cx - wb, y, wb * 2, 300); }
      c.globalCompositeOperation = 'source-over';
      const g = c.createLinearGradient(cx - wb, 0, cx + wb, 0);
      g.addColorStop(0, 'rgba(30,10,60,0.55)'); g.addColorStop(0.18, 'rgba(255,240,220,0.18)'); g.addColorStop(0.35, 'rgba(255,255,255,0.05)'); g.addColorStop(0.75, 'rgba(30,10,60,0.35)'); g.addColorStop(1, 'rgba(20,5,40,0.7)');
      c.fillStyle = g; c.fillRect(cx - wb, top, wb * 2, bot - top);
      c.fillStyle = 'rgba(40,20,90,0.22)'; c.fillRect(cx - wb, top, wb * 2, bot - top);
      c.restore();
    };
    // корпус маяка статичен: рисуем один раз в плитки (узор + полосы + градиенты каждый кадр стоили ~10 FPS на телефоне)
    const PR = S.L.PR || 2; // тот же масштаб, что у рельефа (не меняется при наезде камеры)
    if (!S.towerTiles || S.towerTiles.pr !== PR) {
      const bx = cx - wb - 4, bw = wb * 2 + 26, CH = 512, tiles = [];
      for (let ty = top - 4; ty < bot; ty += CH) {
        const th = Math.min(CH, bot - ty), cv = document.createElement('canvas');
        cv.width = Math.ceil(bw * PR); cv.height = Math.ceil(th * PR);
        const g = cv.getContext('2d'); g.scale(PR, PR); g.translate(-bx, -ty); paintBody(g);
        tiles.push({ x: bx, y: ty, w: bw, h: th, cv });
      }
      S.towerTiles = { pr: PR, tiles };
    }
    const cam = S.cam, vy0 = cam.y - 40, vy1 = cam.y + viewH() + 40;
    for (const t of S.towerTiles.tiles) if (t.y + t.h >= vy0 && t.y <= vy1) c.drawImage(t.cv, t.x, t.y, t.w, t.h);
    // верх: галерея, фонарная комната, купол (вне кадра не рисуем — экономия на телефоне; лучи горящего фонаря видны всегда)
    const lwT = 118, rtT = top - 224, topVisible = S.lit || !(top + 30 < vy0 || rtT - 150 > vy1);
    if (topVisible) {
    c.fillStyle = '#3b3029'; rr(c, cx - wt - 40, top - 22, wt * 2 + 80, 30, 12); c.fill();
    c.fillStyle = '#8c7a6a'; rr(c, cx - wt - 34, top - 18, wt * 2 + 68, 18, 9); c.fill();
    c.lineCap = 'round';
    for (const [w, col] of [[9, '#3b3029'], [4, '#c9a46a']]) {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(cx - wt - 30, top - 70); c.lineTo(cx + wt + 30, top - 70); c.stroke();
      for (let x = cx - wt - 26; x <= cx + wt + 30; x += 34) { c.beginPath(); c.moveTo(x, top - 68); c.lineTo(x, top - 22); c.stroke(); }
    }
    const lw = 118, rt = top - 224, rb = top - 70, rh = rb - rt;
    const lit = S.lit;
    if (lit) {
      // вращающиеся лучи маяка
      const a0 = G.t * 0.9;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const dir of [0, Math.PI]) {
        const a = a0 + dir, len = 1400;
        const gr = c.createRadialGradient(cx, rt + rh / 2, 20, cx, rt + rh / 2, len);
        gr.addColorStop(0, 'rgba(255,236,160,0.55)'); gr.addColorStop(1, 'rgba(255,236,160,0)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(cx, rt + rh / 2);
        c.arc(cx, rt + rh / 2, len, a - 0.16, a + 0.16); c.closePath(); c.fill();
      }
      c.restore();
      glow(c, cx, rt + rh / 2, 340, 'rgba(255,220,120,0.9)', 1);
    }
    // стекло
    const gl = c.createLinearGradient(0, rt, 0, rb);
    if (lit) { gl.addColorStop(0, '#fffbe0'); gl.addColorStop(0.5, '#ffe58a'); gl.addColorStop(1, '#ffb43b'); }
    else { gl.addColorStop(0, '#5b66b8'); gl.addColorStop(1, '#262b5c'); }
    c.fillStyle = gl; rr(c, cx - lw, rt, lw * 2, rh, 18); c.fill();
    if (lit) { const rg = c.createRadialGradient(cx, rt + rh / 2, 4, cx, rt + rh / 2, 70); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, 'rgba(255,250,210,0.95)'); rg.addColorStop(1, 'rgba(255,230,140,0)'); c.fillStyle = rg; c.beginPath(); c.arc(cx, rt + rh / 2, 70, 0, 7); c.fill(); }
    else { c.fillStyle = '#3a3f78'; c.beginPath(); c.arc(cx, rt + rh / 2 + 6, 30, 0, 7); c.fill(); }
    // блики на стекле
    c.save(); rr(c, cx - lw, rt, lw * 2, rh, 18); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.28)';
    for (const ox of [-lw + 20, -lw / 2 + 30]) { c.beginPath(); c.moveTo(cx + ox, rb); c.lineTo(cx + ox + 26, rb); c.lineTo(cx + ox + 86, rt); c.lineTo(cx + ox + 60, rt); c.closePath(); c.fill(); }
    c.restore();
    // латунные рамы
    const brass = c.createLinearGradient(cx - lw, 0, cx + lw, 0);
    brass.addColorStop(0, '#7a5214'); brass.addColorStop(0.3, '#f2c94c'); brass.addColorStop(0.55, '#fff0a8'); brass.addColorStop(1, '#8a5c16');
    c.strokeStyle = '#4a3010'; c.lineWidth = 12; rr(c, cx - lw, rt, lw * 2, rh, 18); c.stroke();
    c.strokeStyle = brass; c.lineWidth = 7; rr(c, cx - lw, rt, lw * 2, rh, 18); c.stroke();
    for (const x of [cx - lw / 3 - 6, cx + lw / 3 + 6]) { c.fillStyle = '#4a3010'; rr(c, x - 6, rt, 12, rh, 5); c.fill(); c.fillStyle = brass; rr(c, x - 3, rt + 2, 6, rh - 4, 3); c.fill(); }
    // купол
    const dome = c.createLinearGradient(cx - lw, 0, cx + lw, 0);
    dome.addColorStop(0, '#a3241c'); dome.addColorStop(0.35, '#ff6b5b'); dome.addColorStop(0.6, '#e8433a'); dome.addColorStop(1, '#8f1f18');
    c.fillStyle = dome; c.strokeStyle = '#5a1410'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(cx - lw - 30, rt + 8); c.bezierCurveTo(cx - lw - 10, rt - 110, cx + lw + 10, rt - 110, cx + lw + 30, rt + 8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.38)'; c.beginPath(); c.ellipse(cx - 44, rt - 46, 34, 14, -0.35, 0, 7); c.fill();
    c.fillStyle = brass; c.strokeStyle = '#4a3010'; c.lineWidth = 4; rr(c, cx - lw - 34, rt - 2, (lw + 34) * 2, 16, 8); c.fill(); c.stroke();
    c.fillStyle = '#4a3010'; c.fillRect(cx - 4, rt - 112, 8, 30);
    const ball = c.createRadialGradient(cx - 6, rt - 124, 2, cx, rt - 118, 18); ball.addColorStop(0, '#fffbe0'); ball.addColorStop(0.5, '#ffd43b'); ball.addColorStop(1, '#a86b00');
    c.fillStyle = ball; c.beginPath(); c.arc(cx, rt - 118, 16, 0, 7); c.fill(); c.strokeStyle = '#4a3010'; c.lineWidth = 3; c.stroke();
    }
    c.restore();
    // каменные кронштейны-арки: каждый уступ вырастает из стены маяка на изогнутой каменной консоли
    const edgeAt = (yy, side) => cx + side * (wb + (wt - wb) * (bot - yy) / (bot - top));
    const ledgeList = S.ledges.filter((l, i) => i > 0).map(l => ({ x0: l.x0, x1: l.x1, row: l.row, left: l.left })).concat([{ x0: 14, x1: 23, row: S.topRow, left: false }]);
    S.struts = [];
    if (!PAT.stone) PAT.stone = c.createPattern(IMG.tex_stone, 'repeat');
    for (const l of ledgeList) {
      const side = l.left ? -1 : 1, yb = tx(l.row + 1) - 2;
      const xo = l.left ? tx(l.x0) + 34 : tx(l.x1) - 34;
      const span0 = Math.abs(edgeAt(yb, side) - xo), depth = Math.min(210, span0 * 0.5);
      const wall = edgeAt(yb + depth, side) - side * 10, rx = Math.abs(wall - xo), ry = depth;
      S.struts.push({ x: xo, y: tx(l.row + 1), wx: wall, wy: yb + depth, kind: 'arch' });
      if (yb + depth + 40 < vy0 || yb - 40 > vy1) continue;   // консоль вне кадра — геометрия для аудита есть, рисовать не нужно
      const path = () => {
        c.beginPath(); c.moveTo(xo, yb); c.lineTo(edgeAt(yb, side) - side * 10, yb); c.lineTo(wall, yb + depth);
        if (l.left) c.ellipse(xo, yb + depth, rx, ry, 0, 0, -Math.PI / 2, true); else c.ellipse(xo, yb + depth, rx, ry, 0, Math.PI, -Math.PI / 2, false);
        c.closePath();
      };
      c.save(); c.fillStyle = 'rgba(20,10,40,0.3)'; c.translate(8, 8); path(); c.fill(); c.restore();
      c.save(); path(); c.clip();
      c.save(); c.scale(0.36, 0.36); c.fillStyle = PAT.stone; c.fillRect(Math.min(xo, wall) / 0.36 - 8, yb / 0.36 - 8, (rx + 20) / 0.36, (depth + 20) / 0.36); c.restore();
      const gg = c.createLinearGradient(0, yb, 0, yb + depth); gg.addColorStop(0, 'rgba(30,20,40,0.32)'); gg.addColorStop(1, 'rgba(60,40,90,0.12)');
      c.fillStyle = gg; c.fillRect(Math.min(xo, wall) - 4, yb, rx + 30, depth + 4);
      c.restore();
      c.strokeStyle = '#3f3a33'; c.lineWidth = 3.5; path(); c.stroke();
      // клинчатые камни вдоль свода
      c.strokeStyle = 'rgba(50,40,35,0.8)'; c.lineWidth = 2.5;
      for (let k = 1; k < 8; k++) {
        const an = -Math.PI / 2 + (l.left ? 1 : -1) * (Math.PI / 2) * k / 8;
        const ax = xo + Math.cos(an) * rx * (l.left ? 1 : 1), ay = yb + depth + Math.sin(an) * ry;
        const bx2 = xo + Math.cos(an) * (rx + 20), by2 = yb + depth + Math.sin(an) * (ry + 20);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx2, Math.max(yb + 2, by2)); c.stroke();
      }
      c.strokeStyle = 'rgba(255,245,230,0.35)'; c.lineWidth = 2;
      c.beginPath(); if (l.left) c.ellipse(xo, yb + depth, rx - 3, ry - 3, 0, -0.08, -Math.PI / 2 + 0.1, true); else c.ellipse(xo, yb + depth, rx - 3, ry - 3, 0, Math.PI + 0.08, -Math.PI / 2 - 0.1, false); c.stroke();
    }
    // перила балкона у большого фонаря
    for (let x = 14; x < 23; x += 2) c.drawImage(IMG.t_fence, tx(x), tx(S.topRow) - 66, 128, 128 * IMG.t_fence.height / IMG.t_fence.width);
  },
};
