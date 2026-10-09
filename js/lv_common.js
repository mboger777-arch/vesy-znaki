'use strict';
// ===== Общее для уровней «Весы и знаки» =====
const tx = n => n * TILE;           // колонка -> пиксели (левый край)
const tc = n => n * TILE + TILE / 2; // центр колонки
function deco(L, img, x, y, w, dy = 0) { L.deco.push({ img, x, y, w, dy }); }
function checkpoint(L, col, row, withFlag = true) {
  const f = withFlag ? L.add(new Flag(tc(col), row * TILE, false)) : null;
  L.checkpoints.push({ x: tc(col), y: row * TILE, flag: f });
}
// вопрос задан, прочитан (≥1.2 с) и ещё не решён — значит, ребёнок сейчас считает
function asking(S) { return !!(S.q && !S.q.solved && S.board && !S.board.solved && G.t - (S.qT0 || 0) > 1.2); }
function cnt(list, f) { return list.filter(f).length; }
// кадр «всё видно»: [x0, x1] по ширине, верх кадра — yTop (мировые). Справа на телефоне — место под кнопку прыжка.
function fitLock(x0, x1, yTop, rightPad = null) {
  const rightM = rightPad !== null ? rightPad : (G.touchUI ? 250 : 24);
  const Z = Math.min(G.baseZoom, (G.W - 24 - rightM) / (x1 - x0));
  const free = G.W - (x1 - x0) * Z;
  const left = free / 2 >= rightM ? (x0 + x1) / 2 - G.W / Z / 2 : x0 - 24 / Z;
  const top = yTop - 120 / Z; // сверху — место под доску с вопросом
  return { x: left + G.W / Z / 2, y: top + G.H / Z / 2, zoom: Z, make: () => fitLock(x0, x1, yTop, rightPad) };
}
// герой исчезает облачком и появляется в другом месте
function* puffTo(npc, x, y, face = 1) {
  puff(npc.x, npc.y - 60, 10); npc.alpha = 0; yield 0.25;
  npc.x = x; npc.y = y; npc.face = face; npc.alpha = 1; puff(npc.x, npc.y - 60, 10); Sound.pop();
}
// Архимед меняет позу на время реплики
function archSay(a, pose, text, dur) { a.pose = pose; return say(a, text, dur); }
// Искра отходит на место (сама, без телепортов) и смотрит в сторону
function* iskraTo(S, x, face = 1) { S.p.autoX = x; S.p.autoFace = face; const t0 = G.t; yield () => S.p.autoX == null || G.t - t0 > 3; }
// показ: подписываем предметы на чаше по одному
function* countPan(S, sc, side, speaker, line) {
  if (line) { say(speaker, line, 2.5); yield vwait(0.1); }   // считаем после того, как Архимед договорил (тики не ложатся на голос)
  yield 0.3; const n = side < 0 ? sc.left : sc.right;
  for (let i = 1; i <= n; i++) { sc.labels = { side, n: i }; Sound.count(Math.min(10, i)); yield 0.55; }
  yield 0.6;
  check((sc.labels ? sc.labels.n : 0) === n, 'показ: подписано столько, сколько лежит на чаше');
}
// слово для сравнения левой части с правой
const wordOf = (a, b) => a > b ? 'больше' : a < b ? 'меньше' : 'столько же';
const WORDS = ['больше', 'меньше', 'столько же'];
const SIGNS = ['>', '<', '='];
// случайный порядок блоков, но слово/знак-ответ всегда среди них
function signChoices(rng, list) { const r = shuffle(rng, list.slice()); return r; }
// ступенька, выезжающая из башни (уровень 5, геометрия проверена reach_audit)
class Step extends Ent {
  constructor(c0, c1, row, S) { super(tc(13), row * TILE); this.c0 = c0; this.c1 = c1; this.row = row; this.t = 0; this.S = S; this.z = -1; this.set = false; }
  update(dt) {
    this.t = Math.min(1, this.t + dt * 2);
    if (this.t >= 1 && !this.set) { this.set = true; for (let x = this.c0; x < this.c1; x++) this.level.set(x, this.row, T_ONEWAY_DYN); dust(tx(this.c0) + 64, tx(this.row), 6); Sound.bump(); }
  }
  draw(c) {
    const k = easeOutBack(this.t);
    const X = lerp(tc(13) - (this.c1 - this.c0) * 32, tx(this.c0), k), Y = tx(this.row), w = (this.c1 - this.c0) * TILE;
    c.save(); c.globalAlpha = Math.min(1, this.t * 2);
    c.fillStyle = '#6e4a3a'; rr(c, X - 4, Y - 4, w + 8, TILE * 0.62 + 8, 14); c.fill();
    rr(c, X, Y, w, TILE * 0.62, 11); c.save(); c.clip();
    c.save(); c.scale(0.5, 0.5); c.fillStyle = PAT.stone || (PAT.stone = c.createPattern(IMG.tex_stone, 'repeat')); c.fillRect(X * 2, Y * 2, w * 2, TILE * 2); c.restore();
    c.fillStyle = 'rgba(255,200,150,0.35)'; c.fillRect(X, Y, w, 6);
    c.restore();
    if (this.t > 0.6) {
      const ca = Math.min(1, (this.t - 0.6) / 0.4);
      c.save(); c.globalAlpha *= ca;
      c.fillStyle = 'rgba(20,10,40,0.3)'; rr(c, X + 6, Y + TILE * 0.62, w - 12, 10, 5); c.fill();
      for (const cx0 of [X + 18, X + w - 18]) {
        const g = c.createLinearGradient(0, Y + 36, 0, Y + 70); g.addColorStop(0, '#c8a890'); g.addColorStop(1, '#7a5f50');
        c.fillStyle = g; c.strokeStyle = '#3f3033'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(cx0 - 14, Y + 38); c.lineTo(cx0 + 14, Y + 38); c.quadraticCurveTo(cx0 + 12, Y + 58, cx0, Y + 70); c.quadraticCurveTo(cx0 - 12, Y + 58, cx0 - 14, Y + 38); c.closePath(); c.fill(); c.stroke();
      }
      c.restore();
    }
    glow(c, X + w / 2, Y + 10, 60, 'rgba(255,220,120,0.5)', (1 - this.t) * 0.9);
    c.restore();
  }
}
// (гирьку берём только когда сценка кончилась и все договорили — «Ура!» не ложится на реплику)
// финал уровня: Щёлк роняет гирьку, Искра её подбирает → гирька в табличке, флаг открыт
function weightGot(S) {
  S.weightsHave = (S.weightsBase || 0) + 1; Sound.secret(); Sound.ura(); G.shake = 0.15;
  sparkBurst(S.p.x, S.p.y - 60, 30, '#ffe066', 380);
  const Z = G.zoom; spawn({ type: 'num', text: 'Гирька!', x: S.p.x, y: S.p.y - 150, vy: -40, life: 1.4, size: 40 });
  if (S.flag) S.flag.locked = false;
}
// куда сейчас идёт история (то, что ребёнок видит на экране): следующая станция → место финальной сценки → гирька → флаг.
// Только для тестов «настоящим вводом» (бот читает цель, но ходит клавишами).
function goalOf(S, stX, endX) {
  const st = S.stations.find(s => !s.done);
  if (st) return st.started ? null : { x: stX(st), y: tx(10), kind: 'station' };
  if (endX && !S.endStarted) return { x: endX, y: tx(10), kind: 'trigger' };
  if (S.wp && !S.wp.got) return { x: S.wp.x, y: S.wp.y, kind: 'weight' };
  if (S.wp && S.wp.got && S.flag && !S.flag.locked) return { x: S.flag.x + 20, y: S.flag.y, kind: 'flag' };
  return null;
}
