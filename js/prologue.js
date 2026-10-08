'use strict';
// ---------- Пролог: Великие весы на площади, Щёлк крадёт пять золотых гирек ----------
// Сценка на движке (герои, весы, пузыри, голос). «Пропустить» — кнопка или Enter.
const PROLOGUE = {
  idx: -1, rngId: 99, cutscene: true,
  build(S) {
    const L = new Level(34, 12, 'day'); S.L = L; L.song = 'day';
    L.ground(0, 34, 10);
    L.spawn = { x: tc(9), y: tx(10) };
    S.great = L.add(new Scales(tc(17), tx(10), { style: 'great', item: 'melon', arm: 170, post: 260, chain: 100, panW: 180, left: 5, right: 5, rightKind: 'weight', perRow: 3 }));
    S.arch = L.add(new NPC('arch', tc(12) - 10, tx(10), 1));
    S.bub = L.add(new NPC('bublik', tc(23), tx(10), -1));
    S.shch = L.add(new Shchelk(tx(40), tx(2))); S.shch.vis = false; S.shch.mode = 'arrived';
    [[3, 90], [8, 80], [27, 90], [31, 80]].forEach(([c, w]) => deco(L, 't_bush', tc(c), tx(10), w, 8));
    [[5, 10], [26, 10]].forEach(([c, r]) => deco(L, 't_fence', tx(c) + 20, tx(r), 120, 6));
    return L;
  },
  start(S) {
    S.weightsBase = 5; S.weightsHave = 5; S.hud = { icon: 'weights', text: '' };
    S.p.face = 1;
    S.cam.lock = fitLock(tc(8), tc(25), tx(10) - 420, 24);
    run(PROLOGUE.script(S));
  },
  script(S) {
    return (function* () {
      const A = S.arch, gs = S.great, sh = S.shch, p = S.p;
      G.freeze = true; yield 0.8;
      say(NARR, VL.pr1(), 6); yield vwait(0.3);
      archSay(A, 'point', VL.pr2(), 6); yield vwait(0.3); A.pose = 'idle';
      say(S.bub, VL.pr3(), 4); yield vwait(0.3);
      // Щёлк влетает и уносит гирьки по одной — весы кренятся всё сильнее
      sh.vis = true; sh.weight = false; sh.x = tx(36); sh.y = tx(2); sh.gotoSpeed = 520;
      Sound.laugh();
      for (let k = 0; k < 5; k++) {
        const pp = gs.panPt(1); sh.mode = 'goto'; sh.tx = pp.x + 30; sh.ty = pp.y - 120;
        yield () => sh.mode === 'arrived';
        if (k === 0) { say(sh, VL.pr4(), 3); }
        gs.right--; S.weightsHave = gs.right; Sound.pop(); sparkBurst(pp.x, pp.y - 20, 10, '#ffe066', 200);
        S.L.add(new FlyItem('weight', 40, pp.x, pp.y - 20, () => sh.x, () => sh.y + 30, 0.35, null, 30));
        sh.weight = true; yield 0.4;
        sh.mode = 'goto'; sh.tx = tx(31) + k * 20; sh.ty = tx(3); yield () => sh.mode === 'arrived'; sh.weight = false;
      }
      sh.weight = true; sh.mode = 'goto'; sh.tx = tx(40); sh.ty = tx(0); Sound.laugh();
      yield 0.6; yield () => gs.settled;
      check(gs.right === 0 && gs.ang < 0, 'гирьки украдены: чаша с дынями опустилась');
      archSay(A, 'worried', VL.pr5(), 5); yield vwait(0.3);
      say(p, VL.pr6(), 3); yield vwait(0.3);
      archSay(A, 'point', VL.pr7(), 6); yield vwait(0.3); A.pose = 'idle';
      say(NARR, VL.pr8(), 4); yield vwait(0.5);
      PROLOGUE.finish(S);
    })();
  },
  finish(S) {
    if (S.leaving) return; S.leaving = true;
    try { localStorage.setItem('vz_plat_prologue', '1'); } catch (_) { }
    goScene(() => new MapScene());
  },
  onEnter(S) { PROLOGUE.finish(S); },
  drawHud(S, c) {
    const w = 250, h = 70, x = G.W - 84 - 80 - 24 - w, y = 16;
    goldButton(c, x, y, w, h, 'Пропустить', 32, 0, 'green');
    addButton(x, y, w, h, () => PROLOGUE.finish(S), 'skip');
  },
  update(S) { S.hud.text = S.weightsHave + ' из 5'; },
  counted() { return null; },
  // дыни и гирьки на Великих весах — пузыри их не закрывают (как счётные предметы)
  avoidRects(S) { const g = S.great; return [...g.itemRects(-1), ...g.itemRects(1), g.signRect()].map(r => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12, counted: true })); },
  selfCheck(S) { check(S.weightsHave === S.great.right, 'табличка гирек = гирькам на весах'); },
};
function prologueSeen() { try { return localStorage.getItem('vz_plat_prologue') === '1'; } catch (_) { return true; } }
