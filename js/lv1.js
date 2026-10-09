'use strict';
// ---------- Уровень 1: Ярмарка (яркое утро) ----------
// Бублик и Пончик спорят, у кого больше. Искра собирает товар и кладёт на рыночные весы — и ВИДИТ наклон.
// Сначала слова «больше / меньше / столько же», потом из наклона рождается знак.
const LV1 = {
  idx: 0, rngId: 1,
  build(S) {
    const L = new Level(150, 12, 'day'); S.L = L; L.style = 'market'; L.song = 'day';
    const rng = S.rng;
    // числа: две станции с неравенством (разные слова-ответы), третья — «столько же»
    let a1, b1; do { a1 = rint(rng, 2, 7); b1 = rint(rng, 1, 7); } while (a1 === b1);
    let a2, b2; do { a2 = rint(rng, 1, 7); b2 = rint(rng, 2, 7); } while (a2 === b2 || wordOf(b2, a2) === wordOf(a1, b1));
    const e3 = rint(rng, 3, 6);
    S.math = { st: [{ L: a1, R: b1 }, { L: a2, R: b2 }, { L: e3, R: e3 }] };
    // рельеф: земля, пара речек-ручейков, навесы-прилавки
    L.ground(0, 48, 10); L.ground(50, 90, 10); L.ground(92, 130, 10); L.ground(132, 150, 10);
    L.plank(10, 13, 8); L.plank(20, 22, 8);
    L.plank(54, 57, 8); L.plank(60, 62, 7);
    L.plank(95, 98, 8); L.plank(101, 104, 7);
    L.plank(137, 141, 8);
    L.spawn = { x: tc(2), y: tx(10) };
    S.arch = L.add(new NPC('arch', tc(5), tx(10), 1));
    // секрет: стог подбрасывает на высокий навес — там золотой фонарик
    L.plank(15, 18, 4); S.bouncers.push(L.add(new Bouncer(tc(14) - 10, tx(10), 'hay'))); S.gold = L.add(new GoldLantern(tx(16) + 32, tx(4)));
    // товар для станций: где лежит (столбец, ряд поверхности)
    const spots = [
      [[7, 10], [11, 8], [12, 8], [17.5, 10], [21, 8], [9, 10], [19, 10]],
      [[52.5, 10], [55, 8], [56, 8], [61, 7], [58.5, 10], [64, 10], [53.5, 10]],
      [[94, 10], [96, 8], [97, 8], [102, 7], [103, 7], [99.5, 10], [92.5, 10]],
    ];
    // товар у каждого свой: Бублик (слева) — булочки, Пончик (справа) — фрукты; Искра кладёт собранное на ЛЕВУЮ чашу
    const kinds = [['bun', 'apple'], ['apple', 'apple'], ['bun', 'pear']];
    S.stations = [];
    [24, 66, 106].forEach((X0, i) => {
      const m = S.math.st[i], carry = m.L, fill = m.R, [kL, kR] = kinds[i];
      const sc = L.add(new Scales(tx(X0 + 15) + 32, tx(10), { item: kL, leftKind: kL, rightKind: kR, left: 0, right: fill }));
      const items = spots[i].slice(0, carry).map(([c, r]) => L.add(new Pickup(kL, tc(c), tx(r))));
      const bub = L.add(new NPC('bublik', tx(X0 + 10) + 56, tx(10), 1));
      const pon = L.add(new NPC('ponchik', tx(X0 + 15) + 32 + 282, tx(10), -1));
      S.stations.push({ i, X0, sc, items, carry, fill, side: -1, bub, pon, started: false, done: false, cols: [X0 + 3, X0 + 5, X0 + 7] });
    });
    S.flag = L.add(new Flag(tc(146), tx(10), true)); S.flag.locked = true;
    S.shch = L.add(new Shchelk(tx(152), tx(4))); S.shch.vis = false; S.shch.mode = 'arrived';
    checkpoint(L, 25, 10, false); checkpoint(L, 51, 10); checkpoint(L, 67, 10, false); checkpoint(L, 93, 10); checkpoint(L, 107, 10, false); checkpoint(L, 133, 10);
    // светлячки по дугам прыжков
    ffArc(S, tx(47) + 30, 590, tx(50) + 30, 590, 110, 3); ffArc(S, tx(89) + 30, 590, tx(92) + 30, 590, 110, 3); ffArc(S, tx(129) + 30, 590, tx(132) + 30, 590, 110, 3);
    ffAt(S, [[tc(14) - 10, 468], [tc(14), 378], [tc(14) + 30, 288]]);
    ffAt(S, [[tc(36), 560], [tc(78), 560], [tc(118), 560]]);
    [[1, 80], [9.5, 70], [44, 80], [64.5, 70], [86, 80], [104, 70], [127, 80], [135, 70], [148, 80]].forEach(([c, w]) => deco(L, 't_bush', tc(c), tx(10), w, 8));
    [[3, 10], [45.5, 10], [87.5, 10], [128, 10]].forEach(([c, r]) => deco(L, 't_fence', tx(c) + 20, tx(r), 120, 6));
    return L;
  },
  start(S) {
    S.weightsBase = 0; S.weightsHave = 0; S.carried = 0;
    S.hud = { icon: 'weights', text: (S.weightsHave || 0) + ' из 5' };
    run((function* () {
      G.freeze = true; yield 0.5;
      archSay(S.arch, 'point', VL.l1Intro(), 6); yield vwait(0.4);
      say(S.p, VL.l1IskraGo(), 3); yield vwait(0.2);
      S.arch.pose = 'idle'; G.freeze = false;
    })());
  },
  goal(S) { return goalOf(S, st => tx(st.X0 + 5), tx(135)); },
  update(S, dt) {
    const p = S.p;
    for (const st of S.stations) {
      for (const it of st.items) if (!it.taken && !p.hidden && overlap(p, it.x - 24, it.y - 50, 48, 50)) {
        it.taken = true; S.carried++; Sound.pop(); sparkBurst(it.x, it.y - 20, 8);
        spawn({ type: 'num', text: String(st.items.filter(o => o.taken).length), x: it.x, y: it.y - 70, vy: -60, life: 0.9, size: 34 });
      }
      if (!st.started && p.onGround && p.x > tx(st.X0 + 3) && p.x < tx(st.X0 + 12) && !(S.q && !S.q.solved)) { st.started = true; S.cur = st; S.respawnPt = { x: tc(st.X0 + 4), y: tx(10) }; run(LV1.station(S, st)); }
    }
    S.hud.text = (S.weightsHave || 0) + ' из 5';   // табличка = золотые гирьки, как в прологе
    if (!S.endStarted && S.stations[2].done && p.x > tx(133)) { S.endStarted = true; run(LV1.ending(S)); }
    if (S.wp && !S.wp.got && !p.hidden && !G.freeze && Dialog.idle() && overlap(p, S.wp.x - 30, S.wp.y - 60, 60, 60)) { S.wp.got = true; weightGot(S); run((function* () { yield 0.3; say(S.p, VL.l1Got(), 3); })()); }
    if (!S.done && !S.flag.locked && overlap(p, S.flag.x - 30, S.flag.y - 190, 60, 190)) { S.flag.on = true; S.complete(); }
  },
  lock(S, st) { return fitLock(tx(st.X0) + 30, st.pon.x + 64, tx(7) - 126); },
  station(S, st) {
    return (function* () {
      const sc = st.sc, m = S.math.st[st.i], A = S.arch;
      G.freeze = true;
      yield* puffTo(A, tc(st.X0 + 1) + 6, tx(10), 1);
      S.p.autoX = tx(st.X0 + 5); S.p.autoFace = 1;
      S.cam.lock = LV1.lock(S, st);
      yield 0.5;
      // спор торговцев — у каждой станции свой
      const kind = sc.kindOf(st.side);   // то, что Искра кладёт (левая чаша)
      if (st.i === 0) { say(st.bub, VL.l1A1(), 3); yield vwait(0.2); say(st.pon, VL.l1A2(), 3); yield vwait(0.2); archSay(A, 'point', VL.l1A3(), 4); }
      else if (st.i === 1) { say(st.pon, VL.l1B1(), 3); yield vwait(0.2); say(st.bub, VL.l1B2(), 3); yield vwait(0.2); archSay(A, 'point', VL.l1B3(), 4); }
      else { say(st.bub, VL.l1C1(), 3); yield vwait(0.2); say(st.pon, VL.l1C2(), 3); yield vwait(0.2); archSay(A, 'point', VL.l1C3(), 4); }
      yield vwait(0.3); A.pose = 'idle';
      // Искра кладёт свой товар на чашу: по одному, весы качаются на глазах
      const side = st.side; let k = 0;
      const srcs = st.items.map(it => it.taken ? { x: S.p.x, y: S.p.y - 60 } : { x: it.x, y: it.y - 20, it });
      for (const s0 of srcs) {
        if (s0.it) s0.it.taken = true;
        const idx = k++; const slot = () => { const pp = sc.panPt(side), sl = sc.slots(idx + 1, kind)[idx]; return pp; };
        S.L.add(new FlyItem(kind, sc.sz, s0.x, s0.y, () => sc.panPt(side).x + sc.slots(idx + 1, kind)[idx][0], () => sc.panPt(side).y - 2 + sc.slots(idx + 1, kind)[idx][1], 0.5, () => { if (side < 0) sc.left++; else sc.right++; Sound.count(Math.min(10, idx + 1)); }));
        yield 0.42;
      }
      yield 0.6; yield () => sc.settled; yield 0.3;
      check(sc.left === m.L && sc.right === m.R, `на весах ${sc.left} и ${sc.right} = ${m.L} и ${m.R}`);
      G.freeze = false;
      const sign = signOf(m.L, m.R);
      const ans = st.i === 1 ? wordOf(m.R, m.L) : wordOf(m.L, m.R);
      const qLine = st.i === 0 ? VL.l1QA(sc.kindOf(-1), sc.kindOf(1)) : st.i === 1 ? VL.l1QB(sc.kindOf(1)) : VL.l1QC(sc.kindOf(-1), sc.kindOf(1));
      S.ask({
        text: `${m.L} ? ${m.R}`, answer: ans, choices: signChoices(S.rng, WORDS), wide: true, row: 7, cols: st.cols, speaker: A,
        say: qLine, eqDone: `${m.L} ${sign} ${m.R}`,
        hints: [VL.l1H1(), VL.l1H2()],
        demo: function* () { yield* countPan(S, sc, -1, A, VL.countL()); yield* countPan(S, sc, 1, A, VL.countR()); sc.labels = null; say(A, VL.l1Demo(m.L, m.R, kind), 4); yield vwait(0.6); },
        onCorrect: function* () {
          sc.labels = null; A.pose = 'cheer';
          if (st.i === 1) say(A, VL.l1OkB(m.L, m.R, kind), 5); else say(A, VL.l1Ok(m.L, m.R, kind), 5);
          yield vwait(0.3);
          sc.sign = sign; Sound.sparkle(); A.pose = 'point';
          // знак рождается из наклона (первый раз объясняем подробно)
          if (st.i === 0) say(A, sign === '>' ? VL.l1SignGt() : VL.l1SignLt(), 6);
          else if (st.i === 1) say(A, sign === '>' ? VL.l1SignGt2(m.L, m.R) : VL.l1SignLt2(m.L, m.R), 5);
          else say(A, VL.l1SignEq(), 6);
          yield vwait(0.3);
          if (st.i === 0) { say(st.bub, VL.l1A4(), 3); yield vwait(0.2); say(st.pon, VL.l1A5(), 3); }
          else if (st.i === 1) { say(st.pon, VL.l1B4(), 3); }
          else { say(st.bub, VL.l1C4(), 3); yield vwait(0.2); say(st.pon, VL.l1C5(), 3); }
          yield vwait(0.3); A.pose = 'idle';
          S.cam.lock = null; st.done = true;
        },
      });
    })();
  },
  ending(S) {
    return (function* () {
      const sh = S.shch; G.freeze = true;
      S.cam.lock = { x: tx(139), y: tx(10) - viewH() * 0.62 };
      sh.vis = true; sh.weight = true; sh.x = tx(150); sh.y = tx(4); sh.mode = 'goto'; sh.tx = tx(141); sh.ty = tx(5); sh.gotoSpeed = 380;
      yield () => sh.mode === 'arrived';
      Sound.laugh(); say(sh, VL.l1Sh1(), 3); yield vwait(0.2);
      // гирька тяжёлая: Щёлк роняет её на навес
      sh.weight = false; const wp = S.L.add(new WeightPickup(tx(139) + 32, tx(8))); S.wp = wp; puff(wp.x, wp.y - 20, 8); Sound.bump();
      say(sh, VL.l1Sh2(), 3); yield vwait(0.2);
      sh.mode = 'goto'; sh.tx = tx(160); sh.ty = tx(1);
      say(S.p, VL.l1IskraJump(), 3);
      yield 0.6; S.cam.lock = null; G.freeze = false;
      yield 2; sh.vis = false;
    })();
  },
  // товар на рыночных весах пузыри не закрывают и в разговоре (его потом считают)
  // пузыри не закрывают ни товар, ни сами чаши (даже пустая чаша должна быть видна)
  avoidRects(S) {
    const out = [];
    for (const st of S.stations) {
      const sc = st.sc; out.push(...sc.itemRects(-1), ...sc.itemRects(1));
      for (const sd of [-1, 1]) { const p = sc.panPt(sd), h = itemH(sc.kindOf(sd), sc.sz) * 1.9; out.push({ x: p.x - sc.panW / 2 - 4, y: p.y - h, w: sc.panW + 8, h: h + 40 }); }
    }
    return out.map(r => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12, counted: true }));
  },
  counted(S) {
    const st = S.cur; if (!st || !asking(S)) return null;
    const out = [];
    st.sc.itemRects(-1).forEach((r, i) => out.push({ kind: 'слева ' + (i + 1), group: 'L', r }));
    st.sc.itemRects(1).forEach((r, i) => out.push({ kind: 'справа ' + (i + 1), group: 'R', r }));
    return out;
  },
  countRule(S, ok) {
    const m = S.math.st[S.cur.i];
    return [{ name: 'слева на весах', visible: cnt(ok, o => o.group === 'L'), expected: m.L }, { name: 'справа на весах', visible: cnt(ok, o => o.group === 'R'), expected: m.R }];
  },
  selfCheck(S) {
    if (S.cur && S.board && !S.board.solved) { const m = S.math.st[S.cur.i]; check(S.board.text === `${m.L} ? ${m.R}`, 'на доске — числа с весов'); check(S.cur.sc.left === m.L && S.cur.sc.right === m.R, 'весы = числам'); }
    for (const st of S.stations) { const want = tiltFor(st.sc.left, st.sc.right); check(Math.sign(Math.round(want * 1000)) === Math.sign(st.sc.right - st.sc.left), 'наклон: опускается чаша, где больше'); }
  },
};
