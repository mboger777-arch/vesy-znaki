'use strict';
// ===== Игровая сцена: общий каркас уровней, вопросы, HUD =====
const LEVEL_NAMES = ['Ярмарка', 'Мост-коромысло', 'Лес светлячков', 'Пещера-сокровищница', 'Башня Великих весов'];

// проверка записи на доске: «7 > 4», «3 + 4 = 7», «10 + 3 < 15», «2 = 2»
function eqTrue(str) {
  if (/\?/.test(str)) return false;
  const m = str.match(/^(.+?) ([<>=]) (.+)$/); if (!m) return false;
  const val = e => { const t = e.trim().split(' '); if (!/^\d+$/.test(t[0])) return NaN; let v = +t[0]; for (let i = 1; i < t.length; i += 2) { if (!/^\d+$/.test(t[i + 1] || '')) return NaN; const b = +t[i + 1]; if (t[i] === '+') v += b; else if (t[i] === '−') v -= b; else return NaN; } return v; };
  const a = val(m[1]), b = val(m[3]); if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a > 20 || b > 20) return false;
  return m[2] === '>' ? a > b : m[2] === '<' ? a < b : a === b;
}
// знак сравнения по числам: клювик раскрыт к большему
const signOf = (a, b) => a > b ? '>' : a < b ? '<' : '=';
class PlayScene {
  constructor(n) {
    this.isPlay = true; this.def = typeof n === 'object' ? n : LEVELS[n]; this.n = typeof n === 'object' ? (n.idx !== undefined ? n.idx : -1) : n; this.rng = mathRngFor(this.def.rngId !== undefined ? this.def.rngId : this.n + 1);
    G.tasks = []; G.bubbles = []; G.particles = []; G.freeze = false; G.shake = 0; G.zoom = G.baseZoom; G.panelRect = null;
    this.fflies = []; this.ffGot = 0; this.ffStreak = 0; this.ffLastT = -9; this.bouncers = []; this.puddles = []; this.gusts = []; this.gold = null; this.secretFound = false;
    this.nQ = 0; this.firstTry = 0; this.fgA = 1; this.ffA = 1;
    this.visT = 0; G.visLog = G.visLog || [];
    this.cam = new Camera(); this.q = null; this.board = null; this.boardT = 0; this.eq = null; this.done = false; this.card = null;
    this.hud = { icon: 'lamp', text: '' }; this.flash = 0; this.rain = []; this.cpIndex = -1; this.lightT = 6; this.respawning = false;
    const def = this.def;
    this.L = def.build(this);
    renderTerrain(this.L);
    this.p = new Player(this.L.spawn.x, this.L.spawn.y);
    this.respawnPt = { x: this.L.spawn.x, y: this.L.spawn.y };
    this.cam.snap(this.p, this.L);
    this.L.onBump = (tx, ty) => this.onBump(tx, ty);
    Sound.setMode(this.L.song || (this.L.bg === 'day' ? 'day' : 'eve'));
    for (const g of this.gusts) g.S = this;
    this.ffTotal = this.fflies.length;
    this.intro = 0;
    if (def.start) def.start(this);
    this.checkTimer = 0;
  }
  // ---------- вопросы ----------
  ask(q) {
    // q: {text, answer, choices, row, cols[], speaker, hints[], demo(gen), eqDone, onCorrect(gen)}
    this.q = Object.assign({ tries: 0, solved: false, locked: false, blocks: [] }, q);
    check(q.choices.includes(q.answer), 'ответ среди блоков');
    const wT = q.wide ? 2 : 1;
    q.cols.forEach((tx, i) => {
      const b = this.L.add(new NumBlock(tx, q.row, q.choices[i], this.q, wT));
      for (let k = 0; k < wT; k++) { this.L.set(tx + k, q.row, T_BLOCK); this.L.blockAt.set((tx + k) + ',' + q.row, b); }
      this.q.blocks.push(b);
    });
    // блоки не висят в воздухе: рама на двух столбах, блоки — на золотых цепочках
    const bs = this.q.blocks, off = (wT > 1 ? 40 : 0) + ((bs.length > 1 && bs[1].tx - bs[0].tx <= 2 * wT) ? 80 : 96), xL = bs[0].x - off, xR = bs[bs.length - 1].x + off;
    const gL = supportBelow(this.L, xL, (q.row + 1) * TILE).y, gR = supportBelow(this.L, xR, (q.row + 1) * TILE).y;
    const fr = this.L.add(new QFrame(xL, xR, q.row * TILE - (q.beamOff || 110), gL, gR)); fr.blockXs = bs.map(b => b.x);
    this.nQ++;
    for (const b of bs) b.frame = fr;
    this.q.frame = fr;
    this.board = { text: q.text, solved: false, t: 0 }; this.qT0 = G.t;
    if (q.say) say(q.speaker, q.say, 7);
  }
  onBump(tx, ty) {
    const b = this.L.blockAt.get(tx + ',' + ty);
    if (!b || !this.q || b.q !== this.q) { Sound.bump(); return; }
    b.bump = 1; Sound.bump();
    const q = this.q;
    if (q.solved || q.locked) return;
    if (b.value === q.answer) {
      q.solved = true; b.state = 'used'; b.hl = 1; Sound.correct();
      if (q.tries === 0) this.firstTry++;
      this.L.add(new PopStar(b.x, b.y - 10));
      // сочная монетка-«дзынь» из блока, кольцо света и искры
      spawn({ type: 'coin', x: b.x, y: b.y - 6, vx: 0, vy: -720, g: 1500, life: 0.85, size: 26 });
      spawn({ type: 'ring', x: b.x, y: b.y + 30, life: 0.55, size: 90, col: '#fff3b0' });
      spawn({ type: 'glowburst', x: b.x, y: b.y + 30, life: 0.6, size: 150 });
      sparkBurst(b.x, b.y, 26, '#fff1a0', 380); G.shake = 0.15;
      this.board = { text: q.eqDone, solved: true, t: 0 };
      check(this.eqCheck(q), 'равенство после ответа верно: ' + q.eqDone);
      const self = this;
      run((function* () {
        yield 0.7;
        for (const o of q.blocks) { if (o !== b) { puff(o.x, o.y + 32, 10); o.dead = true; } for (let k = 0; k < o.wT; k++) { self.L.set(o.tx + k, o.ty, T_EMPTY); self.L.blockAt.delete((o.tx + k) + ',' + o.ty); } }
        Sound.puff();
        yield 0.5; puff(b.x, b.y + 32, 10); b.dead = true;
        if (q.frame) q.frame.leaving = true;
        if (q.onCorrect) yield* q.onCorrect();
        if (self.q === q) self.q = null;
        yield 2.5; if (self.board && self.board.text === q.eqDone) self.board.hide = true;
      })());
    } else {
      q.tries++; Sound.wrong(); b.shake = 1; b.state = 'wrong';
      setTimeout(() => { if (b.state === 'wrong') b.state = 'idle'; }, 650);
      if (q.tries % 3 === 0 && q.demo) {
        q.locked = true; const self = this;
        run((function* () {
          G.freeze = true;
          yield 0.4;
          yield* q.demo();
          G.freeze = false; q.locked = false;
          for (const o of q.blocks) o.hl = 0.8;
        })());
      } else {
        say(q.speaker, q.hints[(q.tries - 1) % q.hints.length], 4.5);
      }
    }
  }
  tapBlock(x, y) {
    const q = this.q; if (!q || q.solved || q.locked || G.freeze || this.p.hidden || this.card) return false;
    const Z = G.zoom;
    for (const b of q.blocks) {
      if (b.dead) continue;
      const sx = (b.x - this.cam.x) * Z, sy = (b.y - this.cam.y) * Z;
      const hw = b.bw / 2 + 12; if (x > sx - hw * Z && x < sx + hw * Z && y > sy - 16 * Z && y < sy + 84 * Z) {
        // встаём под блок на той высоте, где стоит Искра (обычно земля под рамой)
        this.p.autoX = b.x; this.p.autoFace = 0; this.p.autoJump = true; b.hl = Math.max(b.hl || 0, 0.6);
        return true;
      }
    }
    return false;
  }
  eqCheck(q) {
    // доска после ответа: «a ± b = c», сравнение «a > b», «a < b», «a = b» (числа 0–20),
    // а также «a + b = c» с выражением в одной из частей («4 + 3 = 7»). Знак вопроса не допускается.
    if (q.eqOk !== undefined) return q.eqOk; // уровень сам проверил смысл (слова «больше/меньше»)
    return eqTrue(q.eqDone);
  }
  // ---------- видимость считаемого ----------
  toScr(r) { const Z = G.zoom, cam = this.cam; return { x: (r.x - cam.x) * Z, y: (r.y - cam.y) * Z, w: r.w * Z, h: r.h * Z }; }
  countedItems() { const d = this.def; return d.counted ? d.counted(this) : null; }
  countedScreen() { const it = this.countedItems(); return it ? it.map(o => o.screen ? o.r : this.toScr(o.r)) : []; }
  occluders() {
    const out = [], add = (id, r, screen = false, world = !screen) => { if (r) out.push({ id, r: screen ? r : this.toScr(r), world }); };
    if (!this.p.hidden) add('Искра', this.p.rect());
    for (const e of this.L.ents) {
      if (e instanceof NPC && e.alpha > 0.5) add(NPC_NAME[e.kind] || e.kind, e.rect());
      else if (e instanceof Shchelk && e.vis) add('Щёлк', e.rect());
      else if (e instanceof QFrame && e.alpha() > 0.3) for (const r of e.rects()) add(r.id, r);
      else if (e instanceof NumBlock && !e.dead) add('блок ' + e.value, e.rect());
      else if (e instanceof Step) add('ступенька', { x: tx(e.c0) - 4, y: tx(e.row) - 4, w: (e.c1 - e.c0) * TILE + 8, h: TILE * 0.62 + 8 });
      else if (e instanceof Firefly) add('светлячок', e.rect());
      else if (e instanceof Raft) add('плот', e.rect());
      else if (e instanceof Lift) for (const r of e.rects()) add(r.id, r);
      else if (e instanceof Bouncer) add(e.kind === 'loaf' ? 'каравай' : e.kind === 'sack' ? 'мешок муки' : 'стог', e.rect());
      else if (e instanceof GoldLantern) add('золотой фонарь', e.rect());
      else if (e instanceof GustZone) add('ветровой рукав', { x: e.x - 70, y: e.yG - 160, w: 80, h: 162 });
    }
    if (this.ffRect && this.ffA > 0.05) add('табличка светлячков', this.ffRect, true);
    if (this.fgA > 0.05 && !this.def.noFg) add('передний план (трава)', { x: 0, y: G.H - 82, w: G.W, h: 82 }, true, true);
    for (const b of G.bubbles) if (b.rect && b.t < b.dur) add('пузырь «' + b.text.slice(0, 18) + '»', b.rect, true, true);
    add('табличка HUD', { x: 24, y: 18, w: this.hudW || 210, h: 76 }, true);
    if (this.board) { const ctx2 = canvas.getContext('2d'); ctx2.save(); ctx2.font = font(56, 900); const bw = Math.max(300, ctx2.measureText(this.board.text).width + 80); ctx2.restore(); add('доска с вопросом', { x: G.W / 2 - bw / 2, y: 16, w: bw, h: 92 }, true); }
    add('кнопки звук/домой', { x: G.W - 164, y: 18, w: 146, h: 66 }, true);
    if (G.touchUI) for (const b of touchButtons()) if (b.id === 'jump' || this.arrowsA > 0.05) add('сенсорная кнопка ' + b.id, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, true);
    if (G.panelRect) add('панель показа', G.panelRect, true);
    for (const q of G.particles) {
      if (!['leaf', 'firefly', 'puff', 'dust', 'smoke', 'confetti', 'num', 'drop', 'swirl', 'coin', 'butterfly', 'straw', 'crumb', 'flour'].includes(q.type) || (q.layer || 'world') !== 'world') continue;
      const sz = q.type === 'num' ? q.size : q.type === 'puff' || q.type === 'dust' || q.type === 'smoke' ? q.size * 1.5 : q.type === 'butterfly' ? 12 : q.size;
      const bp = q.type === 'butterfly' ? butterflyPos(q) : null;
      const xx = bp ? bp.x : q.type === 'firefly' ? q.x + Math.sin(q.t * 1.3 + q.ph) * 18 : q.type === 'leaf' ? q.x + Math.sin(q.t * 1.8 + q.ph) * 26 : q.x;
      const yy = bp ? bp.y : q.type === 'firefly' ? q.y + Math.cos(q.t * 1.7 + q.ph) * 12 : q.y;
      add('частица ' + q.type, { x: xx - sz, y: yy - sz, w: sz * 2, h: sz * 2 });
    }
    return out;
  }
  visCheck(record = false) {
    const d = this.def, items = this.countedItems();
    if (!items) return null;
    const occ = this.occluders(), res = [];
    const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    for (const it of items) {
      const r = it.screen ? it.r : this.toScr(it.r), area = r.w * r.h;
      const inView = r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= G.W + 0.5 && r.y + r.h <= G.H + 0.5;
      const hits = [];
      for (const o of occ) { if (it.skip && it.skip.some(sk => o.id.startsWith(sk))) continue; if (it.hud && o.world) continue; // табличка HUD рисуется поверх мира: мир её не закрывает
        const f = inter(r, o.r) / area; if (f >= 0.05) hits.push(o.id + ' ' + Math.round(f * 100) + '%'); }
      res.push({ kind: it.kind, group: it.group, lit: it.lit, idx: it.idx, ok: inView && !hits.length && (it.okExtra === undefined || it.okExtra), inView, hits, r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) } });
    }
    const counts = d.countRule(this, res.filter(o => o.ok), res);
    const fails = res.filter(o => !o.ok).map(o => `${o.kind}: ${o.inView ? '' : 'за краем экрана '}${o.hits.join(', ')}${o.inView && !o.hits.length ? 'не в том состоянии' : ''}`)
      .concat(counts.filter(c => c.visible !== c.expected).map(c => `${c.name}: видно ${c.visible}, а должно быть ${c.expected}`));
    if (record) for (const f of fails) check(false, 'ВИДИМОСТЬ (уровень ' + (this.n + 1) + '): ' + f);
    const out = { level: this.n + 1, n: res.length, counts, fails, items: res };
    if (record) { G.visLog.push({ level: this.n + 1, t: Math.round(G.t * 10) / 10, n: res.length, counts: counts.map(c => c.name + ' ' + c.visible + '/' + c.expected).join('; '), fails: fails.length }); if (G.visLog.length > 4000) G.visLog.shift(); }
    return out;
  }
  // ---------- живой воздух: листики днём, светлячки вечером ----------
  ambient(dt) {
    const L = this.L, cam = this.cam, VW = viewW(), VH = viewH();
    const eve = L.bg !== 'day';
    // светлячки и листики не залетают на то, что сейчас считают
    const zones = (this.countedItems() || []).filter(o => !o.screen).map(o => o.r);
    if (zones.length) G.particles = G.particles.filter(q => {
      if (q.type !== 'leaf' && q.type !== 'firefly' && q.type !== 'butterfly') return true;
      const bp = q.type === 'butterfly' ? butterflyPos(q) : null;
      const xx = bp ? bp.x : q.x + (q.type === 'firefly' ? Math.sin(q.t * 1.3 + q.ph) * 18 : Math.sin(q.t * 1.8 + q.ph) * 26), yy = bp ? bp.y : q.y + (q.type === 'firefly' ? Math.cos(q.t * 1.7 + q.ph) * 12 : 0);
      return !zones.some(r => xx > r.x - 40 && xx < r.x + r.w + 40 && yy > r.y - 40 && yy < r.y + r.h + 40);
    });
    // бабочки днём — у земли, не больше трёх
    if (!eve && !zones.length && !this.def.noFg && G.particles.filter(q => q.type === 'butterfly').length < 3 && fx() < dt * 0.8)
      spawn({ type: 'butterfly', x: cam.x + frand(60, VW - 60), y: this.p.y - frand(60, 170), life: frand(7, 11), ph: frand(0, 6), col: ['#ffb3d1', '#ffe066', '#a5d8ff', '#ffc078'][Math.floor(frand(0, 4)) % 4] });
    const n = G.particles.filter(q => q.type === 'leaf' || q.type === 'firefly').length;
    if (n < (eve ? 10 : 10) && fx() < dt * (eve ? 4 : 3)) {
      if (eve) {
        // новый светлячок не рождается рядом с тем, что считают (иначе на кадр-другой закрывает предмет)
        const fx0 = cam.x + frand(0, VW), fy0 = cam.y + frand(VH * 0.25, VH * 0.85);
        if (!zones.some(r => fx0 > r.x - 70 && fx0 < r.x + r.w + 70 && fy0 > r.y - 70 && fy0 < r.y + r.h + 70))
          spawn({ type: 'firefly', x: fx0, y: fy0, vx: frand(-12, 12), vy: frand(-10, 6), life: frand(4, 7), size: frand(3, 5), ph: frand(0, 6) });
      }
      else spawn({ type: 'leaf', x: cam.x + frand(-50, VW), y: cam.y - 20, vx: frand(20, 55), vy: frand(30, 55), life: frand(7, 10), size: frand(8, 12), rot: frand(0, 6), vr: frand(-2, 2), ph: frand(0, 6), col: ['#8bd35a', '#ffb347', '#a9e36b', '#ffd36b'][Math.floor(frand(0, 4)) % 4] });
    }
  }
  // ---------- светлячки и секрет ----------
  collect(dt) {
    const p = this.p; if (p.hidden) return;
    const cx = p.x, cy = p.y - 50;
    for (const f of this.fflies) {
      if (f.dead) continue;
      const q = f.pos();
      if (Math.hypot(q.x - cx, q.y - cy) < 46) {
        f.dead = true; this.ffGot++;
        this.ffStreak = G.t - this.ffLastT < 1.4 ? this.ffStreak + 1 : 0; this.ffLastT = G.t;
        Sound.firefly(this.ffStreak); sparkBurst(q.x, q.y, 8, '#eaff9a', 160);
        const Z = G.zoom; spawn({ type: 'ffhud', layer: 'hud', x0: (q.x - this.cam.x) * Z, y0: (q.y - this.cam.y) * Z, x1: 24 + 30, y1: 112 + 26, life: 0.7 });
      }
    }
    const g = this.gold;
    if (g && !g.found && overlap(p, g.x - 28, g.y - g.h, 56, g.h)) {
      g.found = true; this.secretFound = true; Prog.secretNow(this.n);
      Sound.secret(); sparkBurst(g.x, g.y - 50, 34, '#ffe066', 380); spawn({ type: 'glowburst', x: g.x, y: g.y - 50, life: 0.9, size: 200 }); G.shake = 0.12;
      // надпись — сбоку от Искры (не на лице), со стороны, где больше места в кадре
      // берём конечную позицию камеры (а не текущую), чтобы надпись не уехала за край, пока камера догоняет
      const VW = viewW(), vx0 = clamp(this.cam.tx != null ? this.cam.tx : this.cam.x, 0, Math.max(0, this.L.pxW - VW));
      // надпись — позади Искры (она летит/бежит вперёд и не наступит на неё)
      const side = (Math.abs(p.vx) > 30 ? Math.sign(p.vx) : p.face) > 0 ? -1 : 1;
      let sx = g.x + side * 130; if (sx + 110 > vx0 + VW || sx - 110 < vx0) sx = g.x - side * 130;
      sx = clamp(sx, vx0 + 110, vx0 + VW - 110);
      spawn({ type: 'num', text: 'Секрет!', x: sx, y: Math.max(this.cam.y + 60, g.y - g.h + 10), vy: -30, life: 1.6, size: 38 });
    }
  }
  // ---------- контрольные точки ----------
  respawn(kind = 'puff') {
    if (this.respawning) return; this.respawning = true;
    const p = this.p; const self = this;
    if (kind === 'water') { Sound.splash(); for (let i = 0; i < 16; i++) spawn({ type: 'drop', x: p.x + frand(-20, 20), y: this.L.pxH - 46, vx: frand(-160, 160), vy: frand(-520, -220), g: 1400, life: 0.8, size: frand(4, 8) }); }
    else { Sound.puff(); puff(p.x, p.y - 40, 16); G.shake = 0.25; }
    p.hidden = true; p.vx = 0; p.vy = 0;
    run((function* () {
      yield 0.55;
      p.x = self.respawnPt.x; p.y = self.respawnPt.y; p.vx = 0; p.vy = 0; p.hidden = false; p.inv = 1.2; p.onGround = false;
      puff(p.x, p.y - 40, 12); Sound.pop();
      self.respawning = false;
    })());
  }
  // ---------- цикл ----------
  update(dt) {
    readInput();
    const L = this.L, p = this.p;
    // личное пространство: Искра не стоит «внутри» Архимеда или Бублика
    p.nudge = 0;
    if (!p.hidden && p.onGround && !Input.left && !Input.right) {
      for (const e of L.ents) {
        if (!(e instanceof NPC) || e.alpha < 0.5 || Math.abs(e.y - p.y) > 6) continue;
        const dx = p.x - e.x, need = e.kind === 'arch' ? 104 : 94;
        if (Math.abs(dx) >= need) continue;
        let dir = dx === 0 ? 1 : Math.sign(dx);
        const canGo = d => { const nx = p.x + d * (Math.abs(dx) < 4 ? need : need - Math.abs(dx) + 24); return groundBelow(L, nx, p.y) === p.y && !isSolidT(L.get(Math.floor((nx + d * p.w / 2) / TILE), Math.floor((p.y - 10) / TILE))); };
        if (!canGo(dir)) dir = -dir;
        if (canGo(dir)) p.nudge = dir;
        break;
      }
    }
    // движущиеся опоры двигаются первыми; лужи и ветерок только мягко мешают
    for (const m of L.movers) m.move(dt, this);
    p.slow = 1; p.wind = 0;
    for (const pd of this.puddles) pd.effect(p, dt);
    for (const g of this.gusts) g.effect(p);
    const prevY = p.y;
    if (!p.hidden) p.update(dt, L); else Input.jumpPresses = 0;
    if (!p.hidden) for (const b of this.bouncers) if (b.check(this, prevY, dt)) break;
    this.collect(dt);
    this.ambient(dt);
    if (!p.hidden && p.y > L.pxH - 30) this.respawn(L.water ? 'water' : 'puff');
    // контрольные точки
    for (let i = 0; i < L.checkpoints.length; i++) {
      const cp = L.checkpoints[i];
      if (i > this.cpIndex && p.x > cp.x && p.onGround && Math.abs(p.y - cp.y) < 200) {
        this.cpIndex = i; this.respawnPt = { x: cp.x, y: cp.y };
        if (cp.flag && !cp.flag.on) { cp.flag.on = true; sparkBurst(cp.flag.x, cp.flag.y - 80, 12); Sound.sparkle(); }
      }
    }
    for (const e of L.ents) e.update(dt);
    L.ents = L.ents.filter(e => !e.dead);
    updateTasks(dt); // сначала сценарии, затем уровень пересчитывает табличку — проверка видит согласованный кадр
    this.def.update && this.def.update(this, dt);
    this.cam.update(p, L, dt);
    updateParticles(dt);
    for (const b of G.bubbles) b.t += dt;
    G.bubbles = G.bubbles.filter(b => b.t < b.dur);
    if (this.board) { this.board.t += dt; if (this.board.hide) { this.board.out = (this.board.out || 0) + dt * 3; if (this.board.out >= 1) this.board = null; } }
    G.shake = Math.max(0, G.shake - dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.card) this.card.t += dt;
    // проверка видимости считаемого: когда камера встала и вопрос уже прочитан
    this.visT -= dt;
    if (this.visT <= 0 && this.cam.settled && !G.trans) {
      this.visT = 0.5;
      const d = this.def;
      if (d.countReady ? d.countReady(this) : true) this.visCheck(true);
    }
    // периодические самопроверки счёта на экране
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) { this.checkTimer = 0.5; this.def.selfCheck && this.def.selfCheck(this); }
  }
  draw(c) {
    const L = this.L, cam = this.cam;
    const sh = G.shake > 0 ? G.shake * 22 : 0;
    const shx = sh ? frand(-sh, sh) : 0, shy = sh ? frand(-sh, sh) : 0;
    drawBackground(c, L, cam);
    if (L.bg === 'day') drawBirds(c, cam);
    if (L.night > 0 || L.storm > 0) {
      c.fillStyle = `rgba(25,15,60,${clamp(L.night * 0.25 + L.storm * 0.42, 0, 0.7)})`; c.fillRect(0, 0, G.W, G.H);
    }
    c.save(); c.scale(G.zoom, G.zoom); c.translate(-Math.round((cam.x + shx) * G.zoom) / G.zoom, -Math.round((cam.y + shy) * G.zoom) / G.zoom);
    if (this.def.drawBack) this.def.drawBack(this, c);
    drawWater(c, L, cam);
    for (const d of L.deco) {
      if (d.x + d.w < cam.x - 50 || d.x - d.w > cam.x + viewW() + 50) continue;
      c.fillStyle = 'rgba(30,40,10,0.22)'; c.beginPath(); c.ellipse(d.x + 4, d.y + 2, d.w * 0.48, 7, 0, 0, 7); c.fill();
      const im = IMG[d.img]; c.drawImage(im, d.x - d.w / 2, d.y - d.w * im.height / im.width + (d.dy || 0), d.w, d.w * im.height / im.width);
    }
    drawTerrain(c, L, cam);
    const ents = L.ents.slice().sort((a, b) => a.z - b.z);
    const vx0 = cam.x - 320, vx1 = cam.x + viewW() + 320;
    const vis = e => e.x > vx0 && e.x < vx1 || e instanceof QFrame || e instanceof Bridge;
    for (const e of ents) if (e.z < 1 && vis(e)) e.draw(c);
    this.p.draw(c, L);
    for (const e of ents) if (e.z >= 1 && vis(e)) e.draw(c);
    drawParticles(c, 'world');
    if (this.def.drawFront) this.def.drawFront(this, c);
    c.restore();
    // передний план прячется, когда идёт вопрос или сценка, и не закрывает ноги Искры
    const quiet = (this.q && !this.q.solved) || G.freeze || !!this.countedItems() || !!this.card;
    const feet = (this.p.y - cam.y) * G.zoom;
    const fgT = quiet ? 0 : clamp((G.H - 60 - feet) / 70, 0, 1);
    this.fgA = lerp(this.fgA, fgT, 1 - Math.exp(-(1 / 60) * 6)); if (this.fgA < 0.02 && fgT === 0) this.fgA = 0;
    drawForeground(c, this);
    if (L.storm > 0.05) this.drawRain(c, L.storm);
    if (this.flash > 0) { c.fillStyle = `rgba(235,240,255,${this.flash * 0.35})`; c.fillRect(0, 0, G.W, G.H); }
    G.avoid = [];
    const Z = G.zoom, scr = (x, y, w, h) => ({ x: (x - cam.x) * Z, y: (y - cam.y) * Z, w: w * Z, h: h * Z });
    // лица героев
    for (const e of L.ents) if (e instanceof NPC && e.alpha > 0.5) { const ht = e.headTop(), m = e.mouth(); G.avoid.push(Object.assign(scr(m.x - 46, ht.y, 92, m.y - ht.y + 34), { face: e })); }
    if (!this.p.hidden) G.avoid.push(Object.assign(scr(this.p.x - 36, this.p.top - 18, 72, 64), { face: this.p }));
    if (this.sh && this.sh.vis) { const bx = this.sh.box(); G.avoid.push(Object.assign(scr(bx.x - 20, bx.y - 30, bx.w + 40, bx.h + 40), { face: this.sh })); }
    if (this.def.avoidRects) for (const r of this.def.avoidRects(this)) G.avoid.push(Object.assign(scr(r.x, r.y, r.w, r.h), r.counted ? { counted: true } : {}));
    // HUD: табличка слева и доска с вопросом сверху
    G.avoid.push({ x: 16, y: 0, w: (this.hudW || 210) + 16, h: 100 });
    if (this.board) { c.font = font(56, 900); const bw = Math.max(300, c.measureText(this.board.text).width + 80); G.avoid.push({ x: G.W / 2 - bw / 2 - 10, y: 0, w: bw + 20, h: 116 }); }
    G.avoid.push({ x: G.W - 180, y: 0, w: 180, h: 96 });
    if (this.ffRect && this.ffA > 0.02) G.avoid.push({ x: this.ffRect.x - 8, y: this.ffRect.y - 6, w: this.ffRect.w + 16, h: this.ffRect.h + 12 });   // табличка светлячков
    // то, что ребёнок считает, пузыри обходят в первую очередь
    for (const r of this.countedScreen()) G.avoid.push(Object.assign({}, r, { counted: true }));
    if (this.basket && this.basket.count > 0) { const bk = this.basket; G.avoid.push({ x: (bk.x - 80 - cam.x) * G.zoom, y: (bk.y - 168 - cam.y) * G.zoom, w: 160 * G.zoom, h: 170 * G.zoom }); }
    if (this.q && !this.q.solved) for (const b of this.q.blocks) G.avoid.push({ x: (b.x - b.bw / 2 - 6 - cam.x) * G.zoom, y: (b.y - 10 - cam.y) * G.zoom, w: (b.bw + 12) * G.zoom, h: 84 * G.zoom });
    for (const b of G.bubbles) drawBubble(c, b, cam);
    this.drawHUD(c);
    drawParticles(c, 'hud');
    if (this.card) this.drawCard(c);
  }
  drawRain(c, k) {
    c.save();
    const cr = this.countedScreen();
    if (cr.length) { c.beginPath(); c.rect(0, 0, G.W, G.H); for (const r of cr) c.rect(r.x + r.w, r.y, -r.w, r.h); c.clip('evenodd'); }
    c.strokeStyle = 'rgba(200,220,255,0.55)'; c.lineWidth = 2.5; c.lineCap = 'round';
    const n = Math.floor(90 * k);
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const seed = i * 97.13;
      const x = ((seed * 13.7 + G.t * 260 - this.cam.x * 0.6) % (G.W + 100) + G.W + 100) % (G.W + 100) - 50;
      const y = ((seed * 7.3 + G.t * 900) % (G.H + 60)) - 30;
      c.moveTo(x, y); c.lineTo(x - 9, y + 26);
    }
    c.stroke(); c.restore();
  }
  drawHUD(c) {
    G.ui = [];
    // табличка счёта
    if (this.hud.text && this.hud.icon === 'weights') {
      // табличка гирек: число = гирькам у героев; рисуется в свой холст только при изменении (экономит ~5 FPS на телефоне)
      const n = this.weightsHave || 0; this.hud.text = n + ' из 5';
      const k = Math.max(1, Math.round(Math.abs(c.getTransform().a) * 4) / 4), key = this.hud.text + '|' + k;
      c.font = font(40, 900); const tw = c.measureText(this.hud.text).width;
      this.hudW = 5 * 36 + 30 + tw + 26;
      if (this._hudKey !== key) {
        this._hudKey = key; const W = this.hudW + 12, H = 104;
        const cv = this._hudCv || (this._hudCv = document.createElement('canvas')); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
        const g = cv.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, H); g.translate(0, 24);
        g.strokeStyle = '#6b4a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, -20); g.lineTo(40, 6); g.moveTo(this.hudW - 40, -20); g.lineTo(this.hudW - 40, 6); g.stroke();
        woodPanel(g, 0, 0, this.hudW, 76, 20, 5);
        for (let i = 0; i < 5; i++) drawWeightIcon(g, 30 + i * 36, 62, i < n, 30);
        g.font = font(40, 900); txt(g, this.hud.text, 5 * 36 + 30 + tw / 2, 40, { size: 40, fill: '#fff8e6', stroke: '#5b3313', sw: 8 });
        this._hudWH = [W, H];
      }
      c.drawImage(this._hudCv, 24, 18 - 24, this._hudWH[0], this._hudWH[1]);
      this.hudIcons = []; for (let i = 0; i < 5; i++) this.hudIcons.push({ x: 24 + 30 + i * 36 - 18, y: 18 + 62 - 44, w: 36, h: 46, lit: i < n });
    } else if (this.hud.text) {
      c.save(); c.translate(24, 18);
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(40, -20); c.lineTo(40, 6); c.moveTo(this.hudW - 40, -20); c.lineTo(this.hudW - 40, 6); c.stroke();
      // табличка гирек: число всегда берётся из гирек, которые сейчас у героев (не отстаёт на кадр)
      if (this.hud.icon === 'weights') this.hud.text = (this.weightsHave || 0) + ' из 5';
      c.font = font(40, 900); const tw = c.measureText(this.hud.text).width;
      const ic = this.hud.icon, strip = ic === 'windows5', wts = ic === 'weights';
      this.hudW = wts ? 5 * 36 + 30 + tw + 26 : strip ? 5 * 34 + 34 + tw + 24 : Math.max(210, tw + 112);
      woodPanel(c, 0, 0, this.hudW, 76, 20, 5);
      this.hudIcons = [];
      if (strip) {
        // пять окошек маяка: горящих ровно столько, сколько решено примеров
        const nLit = this.windows ? this.windows.filter(w => w.lit).length : 0;
        for (let i = 0; i < 5; i++) { const ix = 18 + i * 34, iy = 13; drawMiniWindow(c, ix, iy, i < nLit); this.hudIcons.push({ x: 24 + ix, y: 18 + iy, w: 26, h: 50, lit: i < nLit }); }
        txt(c, this.hud.text, 5 * 34 + 26 + tw / 2, 40, { size: 40, fill: '#fff8e6', stroke: '#5b3313', sw: 8 });
      }
      if (wts) {
        // пять золотых гирек: золотых ровно столько, сколько уже вернули городу
        const n = this.weightsHave || 0;
        for (let i = 0; i < 5; i++) { const ix = 30 + i * 36, iy = 62; drawWeightIcon(c, ix, iy, i < n, 30); this.hudIcons.push({ x: 24 + ix - 18, y: 18 + iy - 44, w: 36, h: 46, lit: i < n }); }
        txt(c, this.hud.text, 5 * 36 + 30 + tw / 2, 40, { size: 40, fill: '#fff8e6', stroke: '#5b3313', sw: 8 });
      }
      if (ic === 'lamp') { glow(c, 44, 34, 34, 'rgba(255,214,90,0.8)', 0.9); drawSprite(c, IMG.t_lamp_on, 44, 68, 60); }
      else if (ic === 'bun') { c.drawImage(IMG.t_basket, 14, 10, 60, 60 * IMG.t_basket.height / IMG.t_basket.width); }
      else if (ic === 'window') { drawWindowIcon(c, 44, 38); }
      if (!strip && !wts) txt(c, this.hud.text, 82 + tw / 2, 40, { size: 40, fill: '#fff8e6', stroke: '#5b3313', sw: 8 });
      c.restore();
    }
    // светлячки: отдельная маленькая табличка под главной (только вне вопросов)
    const ffShow = this.ffTotal > 0 && !(this.q && !this.q.solved) && !this.countedItems() && !this.card;
    this.ffA = lerp(this.ffA, ffShow ? 1 : 0, 0.15); if (!ffShow && this.ffA < 0.03) this.ffA = 0;
    this.ffRect = null;
    if (this.ffA > 0.02) {
      const t = String(this.ffGot); c.font = font(30, 900); const tw = c.measureText(t).width;
      const w = 70 + tw + (this.secretFound ? 46 : 0) + 16, x = 24, y = 112;
      c.save(); c.globalAlpha = this.ffA;
      woodPanel(c, x, y, w, 52, 16, 12);
      drawFireflyBug(c, x + 32, y + 26, 1.25, G.t, 0, 0.8);
      txt(c, t, x + 62 + tw / 2, y + 27, { size: 30, fill: '#fffbd6', stroke: '#5b3313', sw: 7 });
      if (this.secretFound) { glow(c, x + w - 30, y + 24, 26, 'rgba(255,215,80,0.9)', 0.9); const gi = goldLampImg(); c.drawImage(gi, x + w - 41, y + 4, 22, 22 * gi.height / gi.width); }
      c.restore();
      this.ffRect = { x, y, w, h: 58 }; this.ffShown = t;
      check(t === String(this.ffGot) && this.ffGot <= this.ffTotal, 'табличка светлячков = числу пойманных');
    }
    // доска с вопросом / равенством
    if (this.board) {
      const b = this.board; const k = easeOutBack(Math.min(1, b.t / 0.35)) * (1 - (b.out || 0));
      c.save(); c.font = font(56, 900);
      const tw = c.measureText(b.text).width + 80; const w = Math.max(300, tw), h = 92;
      const x = G.W / 2 - w / 2, y = 16 - (1 - k) * 140;
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 40, y - 40); c.lineTo(x + 40, y + 10); c.moveTo(x + w - 40, y - 40); c.lineTo(x + w - 40, y + 10); c.stroke();
      if (b.solved) glow(c, G.W / 2, y + h / 2, w * 0.7, 'rgba(255,220,100,0.6)', 0.7 + Math.sin(G.t * 6) * 0.2);
      woodPanel(c, x, y, w, h, 24, 9);
      c.fillStyle = b.solved ? 'rgba(255,248,210,0.95)' : 'rgba(255,250,235,0.92)'; rr(c, x + 16, y + 13, w - 32, h - 26, 16); c.fill();
      richLine(c, b.text, G.W / 2, y + h / 2 + 2, 56, 'center', '#3b2412', b.solved ? '#2b8a3e' : '#e8590c');
      c.restore();
    }
    // кнопки: звук и домой
    const bx = G.W - 84, by = 18;
    roundIconButton(c, bx, by, 66, G.muted ? 'mute' : 'sound');
    addButton(bx, by, 66, 66, () => Sound.toggle(), 'sound');
    roundIconButton(c, bx - 80, by, 66, 'home');
    addButton(bx - 80, by, 66, 66, () => goScene(() => new MapScene()), 'home');
    if (this.def.drawHud) this.def.drawHud(this, c);
    // сенсорные кнопки
    // во время вопроса и сценок стрелки прячутся (не закрывают героев): ответ — касанием блока
    const asking = !!(this.q && !this.q.solved) || !!this.countedItems() || !!this.def.cutscene;
    this.arrowsA = lerp(this.arrowsA === undefined ? 1 : this.arrowsA, asking ? 0 : 1, 0.2); if (asking && this.arrowsA < 0.03) this.arrowsA = 0;
    if (G.touchUI && !this.card) {
      for (const b of touchButtons()) {
        const on = Input.touch[b.id];
        const ba = b.id === 'jump' ? 1 : this.arrowsA; if (ba <= 0.01 && !on) continue;
        c.save(); c.globalAlpha = (on ? 0.75 : 0.42) * Math.max(ba, on ? 1 : 0);
        c.fillStyle = 'rgba(40,25,10,0.35)'; c.beginPath(); c.arc(b.x + 3, b.y + 7, b.r, 0, 7); c.fill();
        const g = c.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, b.id === 'jump' ? '#ffd05a' : '#cfe8ff');
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y + (on ? 3 : 0), b.r, 0, 7); c.fill();
        c.lineWidth = 5; c.strokeStyle = 'rgba(80,50,20,0.7)'; c.stroke();
        c.globalAlpha = (on ? 0.95 : 0.75) * Math.max(ba, on ? 1 : 0); c.fillStyle = '#5b3313';
        c.translate(b.x, b.y + (on ? 3 : 0));
        if (b.id === 'jump') { c.beginPath(); c.moveTo(0, -34); c.lineTo(30, 4); c.lineTo(12, 4); c.lineTo(12, 30); c.lineTo(-12, 30); c.lineTo(-12, 4); c.lineTo(-30, 4); c.closePath(); c.fill(); }
        else { c.scale(b.id === 'left' ? -1 : 1, 1); c.beginPath(); c.moveTo(30, 0); c.lineTo(-8, -30); c.lineTo(-8, -12); c.lineTo(-28, -12); c.lineTo(-28, 12); c.lineTo(-8, 12); c.lineTo(-8, 30); c.closePath(); c.fill(); }
        c.restore();
      }
    }
  }
  complete() {
    if (this.done) return; this.done = true;
    Sound.fanfare();
    saveProgress(this.n + 1);
    // звёзды — за ответы с первой попытки (мягко: всегда хотя бы одна, «плохих» звёзд нет)
    this.stars = this.nQ ? clamp(Math.round(3 * this.firstTry / this.nQ), 1, 3) : 3;
    Prog.record(this.n, this.stars, this.secretFound, this.ffGot, this.ffTotal);
    this.card = { t: 0 };
    const self = this;
    run((function* () { for (let i = 0; i < 30; i++) { spawn({ type: 'confetti', layer: 'hud', x: frand(0, G.W), y: -20, vx: frand(-60, 60), vy: frand(120, 300), g: 120, life: 3, size: frand(10, 18), col: ['#ffd43b', '#ff6b6b', '#69db7c', '#4dabf7', '#f783ac'][i % 5], rot: frand(0, 6), vr: frand(-6, 6) }); yield 0.03; } })());
  }
  drawCard(c) {
    const k = easeOutBack(Math.min(1, this.card.t / 0.5));
    c.fillStyle = `rgba(20,10,40,${0.35 * Math.min(1, this.card.t * 3)})`; c.fillRect(0, 0, G.W, G.H);
    const w = 660, h = 430, x = G.W / 2 - w / 2, y = G.H / 2 - h / 2;
    c.save(); c.translate(G.W / 2, G.H / 2); c.scale(k, k); c.translate(-G.W / 2, -G.H / 2);
    woodPanel(c, x, y, w, h, 34, 21);
    c.fillStyle = 'rgba(255,248,225,0.95)'; rr(c, x + 22, y + 22, w - 44, h - 44, 24); c.fill();
    txt(c, 'Уровень пройден!', G.W / 2, y + 74, { size: 54, fill: '#ffd43b', stroke: '#8a4300', sw: 12, shadow: 'rgba(120,60,0,0.35)', sy: 5 });
    // показываем только заработанные звёзды — никаких «пустых»
    const ns = this.stars || 3;
    for (let i = 0; i < ns; i++) {
      const st = clamp((this.card.t - 0.4 - i * 0.25) / 0.35, 0, 1);
      if (st > 0) {
        if (!this.card['s' + i]) { this.card['s' + i] = 1; Sound.light(4 + i * 2); }
        const s = easeOutBack(st); const sx = G.W / 2 + (i - (ns - 1) / 2) * 110, sy = y + 162 - (ns === 3 && i === 1 ? 14 : 0);
        glow(c, sx, sy, 70 * s, 'rgba(255,220,100,0.7)', 0.8); c.drawImage(IMG.t_star, sx - 45 * s, sy - 45 * s, 90 * s, 90 * s);
      }
    }
    // светлячки и секрет
    if (this.card.t > 1.1) {
      const k = easeOutBack(clamp((this.card.t - 1.1) / 0.35, 0, 1)), ly = y + 236;
      c.save(); c.translate(G.W / 2, ly); c.scale(k, k);
      const t1 = this.ffGot + ' из ' + this.ffTotal, secret = this.secretFound;
      c.font = font(34, 900); const w1 = 60 + c.measureText(t1).width, w2 = secret ? 230 : 0, gap = secret ? 40 : 0, x0 = -(w1 + w2 + gap) / 2;
      drawFireflyBug(c, x0 + 22, 0, 1.6, G.t, 0, 0.9);
      txt(c, t1, x0 + 50 + c.measureText(t1).width / 2, 2, { size: 34, fill: '#5b3313' });
      if (secret) { const gx = x0 + w1 + gap; glow(c, gx + 18, -4, 40, 'rgba(255,215,80,0.9)', 0.9); const gi = goldLampImg(); c.drawImage(gi, gx + 4, -28, 28, 28 * gi.height / gi.width); txt(c, 'Секрет найден!', gx + 44 + 90, 2, { size: 30, fill: '#b86b00' }); }
      c.restore();
    }
    c.restore();
    G.ui = G.ui.filter(u => false);
    if (this.card.t > 0.5) {
      const by = y + h - 112;
      const isLast = this.n >= LEVELS.length - 1;
      goldButton(c, G.W / 2 - 270, by, 250, 84, 'Карта', 40, 0, 'green');
      addButton(G.W / 2 - 270, by, 250, 84, () => goScene(() => new MapScene()), 'map');
      goldButton(c, G.W / 2 + 20, by, 250, 84, isLast ? 'Финал' : 'Дальше', 40, Math.sin(G.rt * 5) * 0.03); addButton(G.W / 2 + 20, by, 250, 84, () => goScene(() => isLast ? new FinaleScene() : new PlayScene(this.n + 1)), 'next');
    }
  }
  onEnter() { if (this.def.onEnter) return this.def.onEnter(this); if (this.card && this.card.t > 0.5) { if (this.n < LEVELS.length - 1) goScene(() => new PlayScene(this.n + 1)); else goScene(() => new FinaleScene()); } }
}
function drawMiniWindow(c, x, y, lit) {
  c.save();
  if (lit) glow(c, x + 13, y + 26, 30, 'rgba(255,214,90,0.8)', 0.9);
  c.fillStyle = '#4a3a2e'; rr(c, x, y, 26, 50, [13, 13, 4, 4]); c.fill();
  const g = c.createLinearGradient(0, y + 4, 0, y + 46);
  if (lit) { g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#ffb52e'); } else { g.addColorStop(0, '#5a6096'); g.addColorStop(1, '#2c3060'); }
  c.fillStyle = g; rr(c, x + 4, y + 4, 18, 42, [9, 9, 3, 3]); c.fill();
  c.strokeStyle = '#4a3a2e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 13, y + 4); c.lineTo(x + 13, y + 46); c.moveTo(x + 4, y + 24); c.lineTo(x + 22, y + 24); c.stroke();
  c.restore();
}
function drawWindowIcon(c, x, y) {
  c.save(); glow(c, x, y, 30, 'rgba(255,214,90,0.8)', 0.8);
  c.fillStyle = '#6e5a44'; rr(c, x - 20, y - 26, 40, 50, [20, 20, 6, 6]); c.fill();
  const g = c.createLinearGradient(0, y - 22, 0, y + 22); g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#ffb52e');
  c.fillStyle = g; rr(c, x - 14, y - 20, 28, 40, [14, 14, 4, 4]); c.fill();
  c.strokeStyle = '#6e5a44'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - 20); c.lineTo(x, y + 20); c.moveTo(x - 14, y); c.lineTo(x + 14, y); c.stroke();
  c.restore();
}
function roundIconButton(c, x, y, s, icon) {
  const r = s / 2, cx = x + r, cy = y + r;
  c.save();
  c.fillStyle = 'rgba(40,20,5,0.35)'; c.beginPath(); c.arc(cx + 2, cy + 5, r, 0, 7); c.fill();
  c.fillStyle = '#5b3313'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#e2a865'); g.addColorStop(1, '#a3652c');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r - 4, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,240,200,0.4)'; c.beginPath(); c.ellipse(cx, cy - r * 0.45, r * 0.55, r * 0.2, 0, 0, 7); c.fill();
  c.fillStyle = '#fff8e6'; c.strokeStyle = '#fff8e6'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.translate(cx, cy);
  if (icon === 'home') {
    c.beginPath(); c.moveTo(-16, -1); c.lineTo(0, -16); c.lineTo(16, -1); c.lineTo(11, -1); c.lineTo(11, 14); c.lineTo(-11, 14); c.lineTo(-11, -1); c.closePath(); c.fill();
    c.fillStyle = '#a3652c'; rr(c, -4, 3, 8, 11, 2); c.fill();
  } else {
    c.beginPath(); c.moveTo(-15, -6); c.lineTo(-7, -6); c.lineTo(3, -15); c.lineTo(3, 15); c.lineTo(-7, 6); c.lineTo(-15, 6); c.closePath(); c.fill();
    if (icon === 'sound') { c.beginPath(); c.arc(4, 0, 9, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(4, 0, 16, -0.8, 0.8); c.stroke(); }
    else { c.strokeStyle = '#ff8a7a'; c.lineWidth = 5; c.beginPath(); c.moveTo(9, -8); c.lineTo(21, 8); c.moveTo(21, -8); c.lineTo(9, 8); c.stroke(); }
  }
  c.restore();
}
class PopStar extends Ent {
  constructor(x, y) { super(x, y); this.t = 0; this.z = 3; }
  update(dt) { this.t += dt; if (this.t > 1.2) { this.dead = true; sparkBurst(this.x, this.y - 120, 10); } }
  draw(c) {
    const k = this.t / 1.2, yy = this.y - easeOut(Math.min(1, k * 1.6)) * 120;
    const s = 64 * (1 + Math.sin(k * Math.PI) * 0.25);
    c.save(); c.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    glow(c, this.x, yy, 70, 'rgba(255,230,120,0.8)', 0.8);
    c.translate(this.x, yy); c.rotate(Math.sin(this.t * 10) * 0.15); c.drawImage(IMG.t_star, -s / 2, -s / 2, s, s); c.restore();
  }
}
// летящая булочка (от Искры в корзину)
class FlyBun extends Ent {
  constructor(x0, y0, x1, y1, dur, onEnd) { super(x0, y0); this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1; this.t = 0; this.dur = dur; this.onEnd = onEnd; this.z = 4; }
  update(dt) { this.t += dt; if (this.t >= this.dur) { this.dead = true; this.onEnd && this.onEnd(); } }
  draw(c) {
    const k = Math.min(1, this.t / this.dur);
    const x = lerp(this.x0, this.x1, k), y = lerp(this.y0, this.y1, k) - Math.sin(k * Math.PI) * 120;
    const im = IMG.t_bun, w = 44; c.drawImage(im, x - w / 2, y - w * im.height / im.width / 2, w, w * im.height / im.width);
  }
}
function saveProgress(unlocked) {
  try { const cur = getProgress(); localStorage.setItem('vz_plat_progress', String(Math.max(cur, Math.min(LEVELS.length + 1, unlocked + 1)))); } catch (_) { }
}
function getProgress() { try { const v = Math.round(+(localStorage.getItem('vz_plat_progress') || 1)); return v >= 1 ? Math.min(v, LEVELS.length + 1) : 1; } catch (_) { return 1; } }
