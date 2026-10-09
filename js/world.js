'use strict';
// ===== Мир: уровень, плитки, физика, Искра, камера, объекты =====
const T_EMPTY = 0, T_GROUND = 1, T_STONE = 2, T_PLANK = 3, T_CRATE = 4, T_ONEWAY_DYN = 5, T_SOLID_DYN = 6, T_BLOCK = 7;
const isSolidT = t => t === T_GROUND || t === T_STONE || t === T_CRATE || t === T_SOLID_DYN || t === T_BLOCK;
const isOneWayT = t => t === T_PLANK || t === T_ONEWAY_DYN;

// прямоугольник спрайта в мировых координатах (та же геометрия, что у drawSprite)
function spriteRectW(im, x, yBottom, h, flip = false, ax = null) {
  const sc = h / im.height, w = im.width * sc, axp = (ax === null ? im.width / 2 : ax) * sc;
  return { x: flip ? x - (w - axp) : x - axp, y: yBottom - h, w, h };
}
class Level {
  constructor(w, h, bg) {
    this.w = w; this.h = h; this.bg = bg; this.grid = new Uint8Array(w * h);
    this.ents = []; this.deco = []; this.checkpoints = []; this.spawn = { x: 3 * TILE, y: 8 * TILE };
    this.pxW = w * TILE; this.pxH = h * TILE; this.water = true; this.storm = 0; this.night = 0;
    this.blockAt = new Map(); this.movers = [];
  }
  get(tx, ty) { if (tx < 0 || tx >= this.w) return T_SOLID_DYN; if (ty < 0 || ty >= this.h) return T_EMPTY; return this.grid[ty * this.w + tx]; }
  set(tx, ty, t) { if (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.grid[ty * this.w + tx] = t; }
  fill(x0, x1, y0, y1, t) { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) this.set(x, y, t); }
  ground(x0, x1, top) { this.fill(x0, x1, top, this.h, T_GROUND); }
  stone(x0, x1, y0, y1) { this.fill(x0, x1, y0, y1, T_STONE); }
  plank(x0, x1, row) { this.fill(x0, x1, row, row + 1, T_PLANK); }
  crate(x, row) { this.set(x, row, T_CRATE); }
  add(e) { this.ents.push(e); e.level = this; return e; }
  surfaceY(tx) { for (let y = 0; y < this.h; y++) { const t = this.get(tx, y); if (isSolidT(t) || isOneWayT(t)) return y * TILE; } return this.pxH + 200; }
}

// ---------- Пререндер рельефа ----------
let PAT = {};
function makePatterns(c) {
  PAT.dirt = c.createPattern(IMG.tex_dirt, 'repeat');
  PAT.stone = c.createPattern(IMG.tex_stone, 'repeat');
  PAT.grass = c.createPattern(IMG.tex_grass, 'repeat-x');
}
function renderTerrain(L) {
  const PR = clamp(G.scale * G.dpr * G.zoom, 1, 2.4);
  // плитки 512×512: маленькие текстуры рисуются быстрее огромных полос во всю высоту маяка
  const CH = 512; L.chunks = []; L.PR = PR;
  for (let cx = 0; cx < L.pxW; cx += CH) {
    const cw = Math.min(CH, L.pxW - cx);
    for (let cy = 0; cy < L.pxH; cy += CH) {
      const chh = Math.min(CH, L.pxH - cy);
      const cv = document.createElement('canvas'); cv.width = Math.ceil(cw * PR); cv.height = Math.ceil(chh * PR);
      const c = cv.getContext('2d'); c.scale(PR, PR); c.translate(-cx, -cy);
      makePatterns(c);
      drawTerrainRange(c, L, Math.floor(cx / TILE) - 2, Math.ceil((cx + cw) / TILE) + 2);
      if (L.terrainTint) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = L.terrainTint; c.fillRect(cx, cy, cw, chh); c.globalCompositeOperation = 'source-over'; }
      L.chunks.push({ x: cx, y: cy, w: cw, h: chh, cv });
    }
  }
}
function drawTerrainRange(c, L, tx0, tx1) {
  tx0 = Math.max(0, tx0); tx1 = Math.min(L.w, tx1);
  const g = (x, y) => L.get(x, y);
  const same = (t, x, y) => { const u = (x < 0 || x >= L.w) ? t : g(x, y); return t === T_GROUND ? u === T_GROUND : u === t; };
  // каменные опоры под досками: круглые колонны с резной капителью и травяным основанием, между ними — арка
  const market = L.style === 'market';
  if (!market) for (const ar of plankArches(L)) {
    if (ar.xb < tx0 * TILE - 60 || ar.xa > tx1 * TILE + 60) continue;
    drawArch(c, ar);
  }
  for (const sp of plankSupports(L)) {
    if (sp.x < tx0 * TILE - 60 || sp.x > tx1 * TILE + 60) continue;
    // на рынке навесы стоят на деревянных столбах
    if (market) drawPole(c, sp.x, sp.top - 18, sp.ground, sp.onto === 'water', L);
    else drawPier(c, sp.x, sp.top, sp.ground, sp.w, sp.onto === 'water', L);
  }
  for (const mat of [T_GROUND, T_STONE]) {
    // контур
    for (let x = tx0; x < tx1; x++) for (let y = 0; y < L.h; y++) {
      if (g(x, y) !== mat) continue;
      const up = same(mat, x, y - 1), dn = same(mat, x, y + 1) || y === L.h - 1, lf = same(mat, x - 1, y), rt = same(mat, x + 1, y);
      const R = 16, e = 4;
      rr(c, x * TILE - e, y * TILE - e, TILE + 2 * e, TILE + 2 * e, [(!up && !lf) ? R : 2, (!up && !rt) ? R : 2, (!dn && !rt) ? R : 2, (!dn && !lf) ? R : 2]);
      c.fillStyle = mat === T_GROUND ? '#4b2a10' : '#5c5446'; c.fill();
    }
    // заливка
    for (let x = tx0; x < tx1; x++) for (let y = 0; y < L.h; y++) {
      if (g(x, y) !== mat) continue;
      const up = same(mat, x, y - 1), dn = same(mat, x, y + 1) || y === L.h - 1, lf = same(mat, x - 1, y), rt = same(mat, x + 1, y);
      const R = 13;
      const X = x * TILE, Y = y * TILE;
      rr(c, X, Y, TILE, TILE, [(!up && !lf) ? R : 0, (!up && !rt) ? R : 0, (!dn && !rt) ? R : 0, (!dn && !lf) ? R : 0]);
      c.save(); c.clip();
      c.save(); c.scale(0.5, 0.5); c.fillStyle = mat === T_GROUND ? PAT.dirt : PAT.stone; c.fillRect(X * 2 - 4, Y * 2 - 4, TILE * 2 + 8, TILE * 2 + 8); c.restore();
      // глубина
      let depth = 0; for (let k = 1; k < 6; k++) { if (same(mat, x, y - k)) depth++; else break; }
      if (mat === T_GROUND) {
        const gr = c.createLinearGradient(0, Y, 0, Y + TILE);
        gr.addColorStop(0, `rgba(55,22,0,${Math.min(0.5, depth * 0.16)})`); gr.addColorStop(1, `rgba(55,22,0,${Math.min(0.5, (depth + 1) * 0.16)})`);
        c.fillStyle = gr; c.fillRect(X, Y, TILE, TILE);
      }
      if (!lf) { const gr = c.createLinearGradient(X, 0, X + 18, 0); gr.addColorStop(0, 'rgba(255,240,210,0.25)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = gr; c.fillRect(X, Y, 18, TILE); }
      if (!rt) { const gr = c.createLinearGradient(X + TILE - 22, 0, X + TILE, 0); gr.addColorStop(0, 'rgba(40,15,0,0)'); gr.addColorStop(1, 'rgba(40,15,0,0.35)'); c.fillStyle = gr; c.fillRect(X + TILE - 22, Y, 22, TILE); }
      if (!dn) { const gr = c.createLinearGradient(0, Y + TILE - 18, 0, Y + TILE); gr.addColorStop(0, 'rgba(40,15,0,0)'); gr.addColorStop(1, 'rgba(40,15,0,0.4)'); c.fillStyle = gr; c.fillRect(X, Y + TILE - 18, TILE, 18); }
      if (mat === T_STONE && !up) { c.fillStyle = 'rgba(255,255,240,0.35)'; c.fillRect(X, Y, TILE, 6); }
      c.restore();
    }
  }
  // трава по верхним граням земли и каменных уступов (по отрезкам)
  for (const GM of [T_GROUND, T_STONE]) for (let y = 0; y < L.h; y++) {
    let x = tx0;
    while (x < tx1) {
      if (g(x, y) === GM && !same(GM, x, y - 1) && !(GM === T_STONE && g(x, y - 1) !== T_EMPTY)) {
        let x2 = x; while (x2 < L.w && g(x2, y) === GM && !same(GM, x2, y - 1)) x2++;
        let xs = x; while (xs > 0 && g(xs - 1, y) === GM && !same(GM, xs - 1, y - 1)) xs--;
        const lfOpen = !same(GM, xs - 1, y), rtOpen = !same(GM, x2, y);
        const X0 = xs * TILE - (lfOpen ? 7 : 0), X1 = x2 * TILE + (rtOpen ? 7 : 0), Y = y * TILE;
        c.save();
        rr(c, X0, Y - 16, X1 - X0, 50, [16, 16, 20, 20]); c.clip();
        c.translate(0, Y - 16); c.scale(0.75, 0.75);
        c.fillStyle = PAT.grass; c.fillRect(X0 / 0.75, 0, (X1 - X0) / 0.75, 64);
        c.restore();
        // блик сверху
        c.save(); rr(c, X0 + 6, Y - 13, X1 - X0 - 12, 7, 4); c.fillStyle = 'rgba(230,255,170,0.35)'; c.fill(); c.restore();
        x = x2;
      } else x++;
    }
  }
  // доски (односторонние платформы)
  for (let y = 0; y < L.h; y++) {
    let x = tx0;
    while (x < tx1) {
      if (g(x, y) === T_PLANK) {
        let xs = x; while (xs > 0 && g(xs - 1, y) === T_PLANK) xs--;
        let x2 = x; while (x2 < L.w && g(x2, y) === T_PLANK) x2++;
        if (market) drawAwningRun(c, xs * TILE - 4, x2 * TILE + 4, y * TILE, xs); else drawPlankRun(c, xs * TILE - 4, x2 * TILE + 4, y * TILE);
        x = x2;
      } else x++;
    }
  }
  for (let x = tx0; x < tx1; x++) for (let y = 0; y < L.h; y++) if (g(x, y) === T_CRATE) {
    if (g(x, y + 1) !== T_CRATE) { c.fillStyle = 'rgba(30,20,10,0.3)'; c.beginPath(); c.ellipse(x * TILE + TILE / 2 + 4, (y + 1) * TILE + 2, TILE * 0.56, 7, 0, 0, 7); c.fill(); }
    c.drawImage(IMG.t_crate, x * TILE - 2, y * TILE - 4, TILE + 4, TILE + 4);
  }
}
function drawPlankRun(c, X0, X1, Y) {
  // настил мостика: верхняя площадка и две длинные доски внахлёст, швы вразбежку, гвоздики
  c.save();
  const W = X1 - X0;
  c.fillStyle = 'rgba(30,20,10,0.25)'; rr(c, X0 + 6, Y + 26, W - 12, 10, 5); c.fill();
  const board = (y, h, seed, c0, c1, seamOff) => {
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1);
    c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, X0, y, W, h, h / 2.4); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(90,50,20,0.35)'; c.lineWidth = 1.5;
    for (let x = X0 + 14; x < X1 - 30; x += 38) { const yy = y + h * (0.35 + hash1(seed + x) * 0.3); c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + 14, yy + 2, x + 28, yy); c.stroke(); }
    for (let x = X0 + seamOff; x < X1 - 30; x += 150) {
      c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x, y + h - 2); c.stroke();
      c.fillStyle = '#3e2410'; for (const nx of [x - 7, x + 7]) { c.beginPath(); c.arc(nx, y + h / 2, 2.2, 0, 7); c.fill(); }
    }
    c.fillStyle = '#3e2410'; for (const nx of [X0 + 9, X1 - 9]) { c.beginPath(); c.arc(nx, y + h / 2, 2.2, 0, 7); c.fill(); }
  };
  board(Y + 15, 14, X0 + 7, '#c27e40', '#82491d', 104);
  board(Y + 2, 15, X0, '#e3a45f', '#a8652c', 58);
  // верх — тёплая освещённая площадка
  const tg = c.createLinearGradient(0, Y - 4, 0, Y + 4); tg.addColorStop(0, '#ffd59a'); tg.addColorStop(1, '#d89850');
  c.fillStyle = tg; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, X0 + 2, Y - 3, W - 4, 8, 4); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,250,230,0.6)'; rr(c, X0 + 10, Y - 1, W - 20, 2.5, 1.2); c.fill();
  // мох и травка по верхнему краю, плющ на концах, цветочки
  grassTufts(c, X0 + 10, X1 - 10, Y + 1, 12, X0, 10);
  const cols = ['#ffffff', '#ff8fab', '#ffd8a8', '#d0bfff'];
  for (let x = X0 + 26, i = 0; x < X1 - 20; x += 46, i++) if (hash1(X0 + i) > 0.35) flower(c, x + hash1(i + X0 * 2) * 16, Y - 4 - hash1(i * 5 + X0) * 4, cols[i % 4], 4);
  c.strokeStyle = '#3f8f2a'; c.lineWidth = 3; c.lineCap = 'round';
  for (const ex of [X0 + 8, X1 - 8]) {
    c.beginPath(); c.moveTo(ex, Y + 2); c.quadraticCurveTo(ex + (ex < X1 - 20 ? -6 : 6), Y + 20, ex, Y + 38); c.stroke();
    c.fillStyle = '#5cbf3a'; for (const yy of [Y + 12, Y + 26, Y + 38]) { c.beginPath(); c.ellipse(ex + 4, yy, 5, 3, 0.6, 0, 7); c.fill(); }
  }
  c.restore();
}
// навес рыночной палатки: деревянная балка сверху (на неё встают), полосатая ткань с фестонами
function drawAwningRun(c, X0, X1, Y, seed) {
  const W = X1 - X0, cols = ['#ff6b6b', '#4dabf7', '#ffa94d', '#51cf66', '#cc5de8'], col = cols[seed % cols.length];
  c.save();
  c.fillStyle = 'rgba(30,20,10,0.22)'; rr(c, X0 + 8, Y + 40, W - 16, 8, 4); c.fill();
  // ткань
  const n = Math.max(3, Math.round(W / 34)), sw = W / n;
  for (let i = 0; i < n; i++) {
    const x = X0 + i * sw;
    c.fillStyle = i % 2 ? '#fff6e8' : col;
    c.beginPath(); c.moveTo(x, Y + 6); c.lineTo(x + sw, Y + 6); c.lineTo(x + sw, Y + 28); c.arc(x + sw / 2, Y + 28, sw / 2, 0, Math.PI); c.closePath(); c.fill();
  }
  c.strokeStyle = 'rgba(80,30,10,0.6)'; c.lineWidth = 2.5;
  c.beginPath(); for (let i = 0; i < n; i++) { const x = X0 + i * sw; c.moveTo(x + sw, Y + 28); c.arc(x + sw / 2, Y + 28, sw / 2, 0, Math.PI); } c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(X0, Y + 6, W, 6);
  // балка
  const g = c.createLinearGradient(0, Y - 4, 0, Y + 9); g.addColorStop(0, '#f2c084'); g.addColorStop(1, '#9a5a24');
  c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, X0, Y - 4, W, 12, 5); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,250,230,0.6)'; rr(c, X0 + 8, Y - 2, W - 16, 2.5, 1.2); c.fill();
  c.fillStyle = '#3e2410'; for (const nx of [X0 + 10, X1 - 10]) { c.beginPath(); c.arc(nx, Y + 2, 2.4, 0, 7); c.fill(); }
  c.restore();
}
// деревянный столб навеса на каменной пяте
function drawPole(c, x, top, ground, water, L) {
  const bottom = water ? L.pxH + 4 : ground + 4, w = 16;
  if (!water) { c.fillStyle = 'rgba(30,20,10,0.28)'; c.beginPath(); c.ellipse(x + 4, ground + 2, 22, 5, 0, 0, 7); c.fill(); }
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#6b3f18'); g.addColorStop(0.35, '#d7965a'); g.addColorStop(0.7, '#b07335'); g.addColorStop(1, '#5a3412');
  c.fillStyle = g; c.strokeStyle = '#3e2410'; c.lineWidth = 2.5; rr(c, x - w / 2, top, w, bottom - top, 5); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(70,35,10,0.45)'; c.lineWidth = 1.5; for (let yy = top + 30; yy < bottom - 30; yy += 52) { c.beginPath(); c.moveTo(x - 4, yy); c.quadraticCurveTo(x, yy + 6, x + 4, yy + 2); c.stroke(); }
  if (!water) { c.fillStyle = '#a89f8e'; c.strokeStyle = '#4a4338'; c.lineWidth = 2.5; rr(c, x - 14, ground - 12, 28, 14, 5); c.fill(); c.stroke(); grassTufts(c, x - 18, x + 18, ground + 2, 7, x); }
}
function plankRuns(L) {
  const runs = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (L.get(x, y) !== T_PLANK) continue;
    let x2 = x; while (x2 < L.w && L.get(x2, y) === T_PLANK) x2++;
    runs.push({ x0: x, x1: x2, row: y }); x = x2;
  }
  return runs;
}
// поверхность под точкой (по тайлам); если ничего нет — дно уровня (вода)
function supportBelow(L, px, fromY) {
  const tx = Math.floor(px / TILE);
  for (let ty = Math.ceil(fromY / TILE); ty < L.h; ty++) { const t = L.get(tx, ty); if (isSolidT(t) || isOneWayT(t)) return { y: ty * TILE, t }; }
  return { y: L.pxH + 10, t: 'water' };
}
function plankSupports(L) {
  if (L._sup) return L._sup;
  const out = [];
  for (const r of plankRuns(L)) {
    const wT = r.x1 - r.x0, X0 = r.x0 * TILE, X1 = r.x1 * TILE;
    let xs;
    if (wT <= 2) xs = [(X0 + X1) / 2];
    else if (wT <= 5) xs = [X0 + 34, X1 - 34];
    else xs = [X0 + 34, (X0 + X1) / 2, X1 - 34];
    const w = wT <= 2 ? 44 : 38;
    for (const x of xs) {
      const b = supportBelow(L, x, r.row * TILE + TILE);
      out.push({ x, w, top: r.row * TILE + 24, bottom: b.y + 6, ground: b.y, onto: b.t, run: r });
    }
  }
  return (L._sup = out);
}
function plankArches(L) {
  if (L._arch) return L._arch;
  const out = [], sup = plankSupports(L);
  for (let i = 0; i + 1 < sup.length; i++) {
    const a = sup[i], b = sup[i + 1];
    if (a.run !== b.run) continue;
    const gap = b.x - a.x - (a.w + b.w) / 2, hgt = Math.min(a.ground, b.ground) - a.top;
    if (gap < 40 || hgt < 50) continue;
    out.push({ xa: a.x + a.w / 2 - 2, xb: b.x - b.w / 2 + 2, yT: a.top - 2, depth: Math.min(78, hgt * 0.55, gap * 0.42) + 16 });
  }
  return (L._arch = out);
}
function stoneFill(c, x, y, w, h, sc = 0.36) {
  c.save(); c.scale(sc, sc); c.fillStyle = PAT.stone; c.fillRect(x / sc - 4, y / sc - 4, w / sc + 8, h / sc + 8); c.restore();
}
function drawPier(c, x, top, ground, w, water, L) {
  const bottom = water ? L.pxH + 4 : ground + 6;
  const X = x - w / 2;
  // мягкая тень колонны на земле
  if (!water) { c.fillStyle = 'rgba(30,20,10,0.28)'; c.beginPath(); c.ellipse(x + 6, ground + 2, w * 0.9, 7, 0, 0, 7); c.fill(); }
  // ствол
  c.save(); rr(c, X, top, w, bottom - top, 6); c.clip();
  stoneFill(c, X, top, w, bottom - top);
  const g = c.createLinearGradient(X, 0, X + w, 0);
  g.addColorStop(0, 'rgba(40,30,20,0.45)'); g.addColorStop(0.28, 'rgba(255,250,235,0.28)'); g.addColorStop(0.5, 'rgba(255,250,235,0.05)'); g.addColorStop(1, 'rgba(30,20,40,0.55)');
  c.fillStyle = g; c.fillRect(X, top, w, bottom - top);
  const v = c.createLinearGradient(0, top, 0, top + 40); v.addColorStop(0, 'rgba(30,20,10,0.45)'); v.addColorStop(1, 'rgba(30,20,10,0)');
  c.fillStyle = v; c.fillRect(X, top, w, 40);
  c.restore();
  c.strokeStyle = '#4a4338'; c.lineWidth = 3; rr(c, X, top, w, bottom - top, 6); c.stroke();
  // резная капитель
  const capG = c.createLinearGradient(0, top + 4, 0, top + 22); capG.addColorStop(0, '#d9cfbd'); capG.addColorStop(1, '#8f8572');
  c.fillStyle = capG; c.strokeStyle = '#4a4338'; c.lineWidth = 3;
  rr(c, X - 9, top + 4, w + 18, 13, 6); c.fill(); c.stroke();
  rr(c, X - 4, top + 16, w + 8, 8, 4); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,245,0.55)'; rr(c, X - 5, top + 6, w + 6, 3, 1.5); c.fill();
  if (water) {
    // пена у воды
    const wy = L.pxH - 44;
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x, wy + 2, w * 0.8, 5, 0, 0, 7); c.fill();
    return;
  }
  // основание + травка
  const bG = c.createLinearGradient(0, ground - 18, 0, ground + 4); bG.addColorStop(0, '#cfc5b2'); bG.addColorStop(1, '#7d7362');
  c.fillStyle = bG; rr(c, X - 8, ground - 18, w + 16, 22, 7); c.fill(); c.stroke();
  grassTufts(c, X - 14, X + w + 14, ground + 2, 7, x);
}
function drawArch(c, a) {
  const { xa, xb, yT, depth } = a, cx = (xa + xb) / 2, rx = (xb - xa) / 2, ry = depth - 14, base = yT + depth;
  const path = () => { c.beginPath(); c.moveTo(xa, yT); c.lineTo(xb, yT); c.lineTo(xb, base); c.ellipse(cx, base, rx, ry, 0, 0, Math.PI, true); c.closePath(); };
  c.save(); path(); c.clip();
  stoneFill(c, xa, yT, xb - xa, depth + 4);
  const g = c.createLinearGradient(0, yT, 0, base); g.addColorStop(0, 'rgba(30,20,10,0.35)'); g.addColorStop(0.5, 'rgba(255,250,235,0.1)'); g.addColorStop(1, 'rgba(30,20,40,0.3)');
  c.fillStyle = g; c.fillRect(xa, yT, xb - xa, depth + 4);
  c.restore();
  c.strokeStyle = '#4a4338'; c.lineWidth = 3; path(); c.stroke();
  // клинчатые камни по своду
  c.strokeStyle = 'rgba(60,50,40,0.75)'; c.lineWidth = 2.5;
  const n = Math.max(5, Math.round(rx / 16));
  for (let k = 1; k < n; k++) {
    const an = Math.PI + Math.PI * k / n, px = cx + Math.cos(an) * rx, py = base + Math.sin(an) * ry;
    const qx = cx + Math.cos(an) * (rx + 14), qy = base + Math.sin(an) * (ry + 14);
    c.beginPath(); c.moveTo(px, py); c.lineTo(qx, Math.max(yT + 2, qy)); c.stroke();
  }
  c.strokeStyle = 'rgba(255,250,235,0.45)'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(cx, base, rx + 2, ry + 2, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  // замковый камень
  c.fillStyle = '#c9bfab'; c.strokeStyle = '#4a4338'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(cx - 9, base - ry - 2); c.lineTo(cx + 9, base - ry - 2); c.lineTo(cx + 12, yT + 2); c.lineTo(cx - 12, yT + 2); c.closePath(); c.fill(); c.stroke();
}
// детерминированный «шум» для травинок и цветочков
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function grassTufts(c, x0, x1, y, step = 9, seed = 0, hMax = 14) {
  c.save(); c.lineCap = 'round';
  for (let x = x0, i = 0; x <= x1; x += step, i++) {
    const r = hash1(seed + i * 3.7), h = hMax * (0.55 + r * 0.6);
    const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, '#9be35a'); g.addColorStop(1, '#3f8f2a');
    c.strokeStyle = g; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 2, y - h * 0.6, x - 4 + r * 3, y - h); c.stroke();
    c.beginPath(); c.moveTo(x + 3, y); c.quadraticCurveTo(x + 5, y - h * 0.5, x + 7, y - h * 0.8); c.stroke();
  }
  c.restore();
}
function flower(c, x, y, col, r = 4) {
  c.fillStyle = col; for (let k = 0; k < 5; k++) { const an = k * 1.2566; c.beginPath(); c.arc(x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9, r * 0.62, 0, 7); c.fill(); }
  c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(x, y, r * 0.5, 0, 7); c.fill();
}
function drawTerrain(c, L, cam) {
  const vx0 = cam.x - 40, vx1 = cam.x + viewW() + 40, vy0 = cam.y - 40, vy1 = cam.y + viewH() + 40;
  for (const ch of L.chunks) {
    if (ch.x + ch.w < vx0 || ch.x > vx1 || ch.y + ch.h < vy0 || ch.y > vy1) continue;
    c.drawImage(ch.cv, ch.x, ch.y, ch.w, ch.h);
  }
}

// ---------- Фон с параллаксом ----------
const TINT_CACHE = new Map();
function tintedImg(im, tint) {
  const key = (im.src || '') + '|' + tint.join('|'); let cv = TINT_CACHE.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d');
  g.drawImage(im, 0, 0); const gr = g.createLinearGradient(0, 0, 0, im.height); gr.addColorStop(0, tint[0]); gr.addColorStop(1, tint[1]); g.fillStyle = gr; g.fillRect(0, 0, im.width, im.height);
  TINT_CACHE.set(key, cv); return cv;
}
function drawBackground(c, L, cam) {
  if (L.bg === 'cave' && typeof drawCaveBg === 'function') { drawCaveBg(c, L, cam); return; }
  drawBackground0(c, L, cam);   // оттенок уровня (L.tint) запечён в картинку фона — без лишней заливки всего экрана
}
function drawBackground0(c, L, cam) {
  const im0 = L.bg === 'day' ? (IMG.bg_day_soft || IMG.bg_day) : (IMG.bg_eve_soft || IMG.bg_eve);
  const im = L.tint ? tintedImg(im0, L.tint) : im0;
  const H = G.H + 90; const s = H / im.height; const w = im.width * s;
  const px = cam.x * 0.22 * G.zoom, maxY = Math.max(1, L.pxH - viewH());
  const py = -((cam.y / maxY) * 70);
  let start = -((px % (w * 2)) + w * 2) % (w * 2);
  for (let x = start, i = 0; x < G.W; x += w, i++) {
    const idx = Math.round((x - start) / w);
    const flip = (idx % 2) === 1;
    // у зеркальной копии маяк стёрт — иначе на стыке стоят два маяка-близнеца
    const imI = flip && L.bg === 'day' && IMG.bg_day_soft_b ? IMG.bg_day_soft_b : im;
    c.save(); c.translate(x + (flip ? w : 0), py); c.scale(flip ? -1 : 1, 1); c.drawImage(imI, 0, 0, w + 1, H); c.restore();
  }
  // мягкие облака-параллакс
  if (L.bg === 'day') {
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 520 + G.t * 9 - cam.x * 0.35) % (G.W + 600) + G.W + 600) % (G.W + 600) - 300;
      cloud(c, cx, 90 + (i % 3) * 55 + py * 0.5, 0.75 + (i % 2) * 0.35, 0.85);
    }
  }
}
function drawWater(c, L, cam) {
  if (!L.water) return;
  const y0 = L.pxH - 46;
  const g = c.createLinearGradient(0, y0, 0, L.pxH);
  if (L.bg === 'day') { g.addColorStop(0, '#5fd0ff'); g.addColorStop(1, '#1c7ed6'); } else { g.addColorStop(0, '#7a6cff'); g.addColorStop(1, '#3b2c8f'); }
  const VW = viewW();
  c.fillStyle = g; c.fillRect(cam.x - 10, y0, VW + 20, 46);
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath();
  for (let x = Math.floor(cam.x / 40) * 40 - 40; x < cam.x + VW + 40; x += 6) { const yy = y0 + 4 + Math.sin(x * 0.045 + G.t * 3) * 3; if (x === Math.floor(cam.x / 40) * 40 - 40) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = Math.floor(cam.x / 90) * 90; x < cam.x + VW + 90; x += 90) { const off = Math.sin(x * 1.7 + G.t * 1.5) * 18; rr(c, x + off, y0 + 18 + (x % 3) * 6, 26, 4, 2); c.fill(); }
}

// ---------- Искра ----------
const ISKRA_H = 114; // рост Искры в мире (крупнее — читается как у Марио)
const PHYS = { maxV: 345, accG: 2300, accA: 1500, decG: 2700, decA: 700, jumpV: 950, gUp: 2550, gCut: 6200, gDown: 3300, maxFall: 1150, coyote: 0.1, buffer: 0.13, minHold: 0.28 };
class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.w = 40; this.h = 96;
    this.onGround = false; this.face = 1; this.coyote = 0; this.buf = 0; this.jumping = false;
    this.sx = 1; this.sy = 1; this.anim = 0; this.prevVy = 0; this.inv = 0; this.hidden = false; this.landT = 0;
    this.ride = null; this.boost = false; this.slow = 1; this.wind = 0; this.lean = 0; this.wasRun = false; this.airT = 0;
  }
  get left() { return this.x - this.w / 2; } get right() { return this.x + this.w / 2; } get top() { return this.y - this.h; }
  // Искра тоже говорит (живой голос): пузырь — от её рта
  get kind() { return 'iskra'; }
  headTop() { return { x: this.x, y: this.y - ISKRA_H - 2 }; }
  mouth() { return { x: this.x + this.face * 9, y: this.y - ISKRA_H * 0.63 }; }
  update(dt, L) {
    const frozen = G.freeze;
    const dir = frozen ? 0 : (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
    // едем на плоту / в корзине подъёмника: платформа уже сдвинулась — сдвигаемся вместе с ней
    this.carry = 0;
    if (this.ride) { if (this.onGround && !this.ride.dead) { this.carry = this.ride.dx; this.y += this.ride.dy; } else this.ride = null; }
    // мягкие помехи: лужа замедляет, ветерок мешает идти вправо (никогда не сталкивает и не ранит)
    const maxV = PHYS.maxV * this.slow * (this.wind < 0 && dir > 0 ? 0.62 : 1);
    if (Input.jumpPresses > 0) { if (!frozen) this.buf = PHYS.buffer; Input.jumpPresses = 0; }
    const acc = this.onGround ? PHYS.accG : PHYS.accA, dec = this.onGround ? PHYS.decG : PHYS.decA;
    if (dir !== 0) { this.autoX = null; this.autoJump = false; }
    if (dir !== 0) {
      let a = acc; if (Math.sign(this.vx) === -dir && Math.abs(this.vx) > 60) { a *= 1.9; if (this.onGround && fx() < 0.3) dust(this.x, this.y, 1, -dir); }
      this.vx = clamp(this.vx + dir * a * dt, -maxV, maxV); if (Math.abs(this.vx) > maxV) this.vx = Math.sign(this.vx) * maxV; this.face = dir;
    } else if (this.autoX != null && this.onGround) {
      // сценка: Искра сама отходит на своё место (не загораживая счёт)
      const d = this.autoX - this.x;
      if (Math.abs(d) < 3) { this.x = this.autoX; this.autoX = null; this.vx = 0; if (this.autoFace) this.face = this.autoFace; if (this.autoJump && !frozen) { this.autoJump = false; this.buf = PHYS.buffer; this.autoHold = true; } }
      else { this.vx = Math.sign(d) * Math.min(210, Math.abs(d) * 8 + 40); this.face = Math.sign(d); }
    } else if (this.nudge && this.onGround) {
      // вежливо отходит в сторону, чтобы не стоять «внутри» Архимеда или Бублика
      this.vx = this.nudge * 150; this.face = this.nudge;
    } else {
      const d = dec * dt; this.vx = Math.abs(this.vx) <= d ? 0 : this.vx - Math.sign(this.vx) * d;
    }
    if (this.onGround) this.coyote = PHYS.coyote; else this.coyote -= dt;
    this.buf -= dt;
    if (this.buf > 0 && this.coyote > 0) {
      this.vy = -PHYS.jumpV; this.onGround = false; this.coyote = 0; this.buf = 0; this.jumping = true; this.ride = null; this.jumpT = 0;
      this.sx = 0.74; this.sy = 1.3; Sound.jump(); dust(this.x, this.y, 6);
    }
    let gr = PHYS.gDown;
    // короткое касание кнопки всё равно даёт почти полный прыжок (ребёнку не нужно точно держать)
    this.jumpT = (this.jumpT || 0) + dt;
    if (this.vy < 0) gr = ((this.jumping && (Input.jumpHeld || this.autoHold || this.jumpT < PHYS.minHold) && !frozen) || this.boost) ? PHYS.gUp : PHYS.gCut;
    if (this.vy >= 0 && !this.onGround) { this.jumping = false; this.boost = false; this.autoHold = false; }
    else if (this.vy >= 0) { this.jumping = false; this.boost = false; }
    if (!this.onGround && this.wind) this.vx = Math.max(-PHYS.maxV, this.vx + this.wind * dt);
    this.vy = Math.min(this.vy + gr * dt, PHYS.maxFall);
    this.prevVy = this.vy;
    this.moveX(dt, L); this.moveY(dt, L);
    // анимация: сжатие-растяжение, пыль на старте бега, наклон по скорости
    this.sx = lerp(this.sx, 1, 1 - Math.exp(-dt * 11)); this.sy = lerp(this.sy, 1, 1 - Math.exp(-dt * 11));
    if (!this.onGround) {
      this.airT += dt;
      // в полёте вверх чуть вытягивается, на спуске — чуть сплющивается в ожидании приземления
      const st = clamp(-this.vy / 2400, -0.06, 0.1);
      this.sy = lerp(this.sy, 1 + st, 1 - Math.exp(-dt * 10)); this.sx = lerp(this.sx, 1 - st * 0.7, 1 - Math.exp(-dt * 10));
    } else this.airT = 0;
    const run = this.onGround && Math.abs(this.vx) > 20;
    if (run) {
      const prev = Math.floor(this.anim);
      this.anim += dt * (4.2 + Math.abs(this.vx) / 40);
      // шажок: лёгкий «пружинящий» отскок и пылинка из-под ноги
      if (Math.floor(this.anim) !== prev && Math.floor(this.anim) % 2 === 0) { this.sy = Math.min(this.sy, 0.965); this.sx = Math.max(this.sx, 1.03); if (fx() < 0.35) dust(this.x - this.face * 10, this.y, 1, -this.face); }
    } else this.anim = 0;
    if (run && !this.wasRun && Math.abs(this.vx) < 200) { dust(this.x - this.face * 14, this.y, 4, -this.face); this.sx = 0.9; this.sy = 1.08; }
    this.wasRun = run;
    this.lean = lerp(this.lean, this.onGround ? clamp(this.vx / PHYS.maxV, -1, 1) * 0.07 : clamp(this.vx / PHYS.maxV, -1, 1) * 0.04, 1 - Math.exp(-dt * 8));
    if (this.inv > 0) this.inv -= dt;
  }
  moveX(dt, L) {
    const dx = this.vx * dt + (this.carry || 0); this.carry = 0;
    this.x += dx;
    const y0 = Math.floor((this.top + 2) / TILE), y1 = Math.floor((this.y - 2) / TILE);
    if (dx > 0) {
      const tx = Math.floor(this.right / TILE);
      for (let ty = y0; ty <= y1; ty++) if (isSolidT(L.get(tx, ty))) { this.x = tx * TILE - this.w / 2 - 0.01; this.vx = 0; break; }
    } else if (dx < 0) {
      const tx = Math.floor(this.left / TILE);
      for (let ty = y0; ty <= y1; ty++) if (isSolidT(L.get(tx, ty))) { this.x = (tx + 1) * TILE + this.w / 2 + 0.01; this.vx = 0; break; }
    }
    // край уровня: Искра целиком остаётся в кадре (волосы не обрезаются краем экрана)
    if (this.x < 48) { this.x = 48; if (this.vx < 0) this.vx = 0; }
    else if (this.x > L.pxW - 48) { this.x = L.pxW - 48; if (this.vx > 0) this.vx = 0; }
  }
  moveY(dt, L) {
    const prevBottom = this.y;
    this.y += this.vy * dt;
    const x0 = Math.floor((this.left + 3) / TILE), x1 = Math.floor((this.right - 3) / TILE);
    const was = this.onGround; this.onGround = false;
    if (this.vy >= 0) {
      const ty = Math.floor(this.y / TILE);
      for (let tx = x0; tx <= x1; tx++) {
        const t = L.get(tx, ty);
        if (isSolidT(t) || (isOneWayT(t) && prevBottom <= ty * TILE + 1)) {
          this.y = ty * TILE; 
          if (!was && this.vy > 220) this.landFx();
          this.vy = 0; this.onGround = true; this.ride = null; break;
        }
      }
      // движущиеся опоры (плот на воде, корзина подъёмника на верёвках): только сверху
      if (!this.onGround) for (const m of L.movers) {
        const top = m.topY(), x0 = m.x - m.w / 2, x1 = m.x + m.w / 2;
        if (this.right - 6 > x0 && this.left + 6 < x1 && prevBottom <= top + 2 + Math.max(0, m.dy) && this.y >= top) {
          this.y = top; if (!was && this.vy > 220) this.landFx(m); else if (!was && m.onLand) m.onLand(this, true);
          this.vy = 0; this.onGround = true; this.ride = m; break;
        }
      }
    } else {
      const ty = Math.floor(this.top / TILE);
      let hit = false, best = null, bestOv = -1;
      for (let tx = x0; tx <= x1; tx++) {
        const t = L.get(tx, ty);
        if (isSolidT(t)) {
          hit = true;
          const ov = Math.min(this.right, (tx + 1) * TILE) - Math.max(this.left, tx * TILE);
          if (t === T_BLOCK && ov > bestOv) { bestOv = ov; best = [tx, ty]; }
        }
      }
      if (hit) {
        this.y = (ty + 1) * TILE + this.h + 0.01; this.vy = 60; this.jumping = false;
        if (best) { L.onBump && L.onBump(best[0], best[1]); } else Sound.bump();
      }
    }
  }
  landFx(m = null) {
    const k = clamp(this.vy / 900, 0.3, 1);
    this.sx = 1 + 0.3 * k; this.sy = 1 - 0.26 * k;
    dust(this.x, this.y, Math.round(3 + 7 * k)); for (const d of [-1, 1]) dust(this.x + d * 16, this.y, 2, d * 1.5);
    Sound.land(k); if (m && m.onLand) m.onLand(this, false);
  }
  rect() { const fr = this.frame(), im = IMG[fr]; return spriteRectW(im, this.x, this.y + 1, ISKRA_H * im.height / 322, this.face < 0, ISKRA_AX[fr]); }
  frame() {
    if (!this.onGround) return this.vy < 0 ? 'iskra_jump' : 'iskra_fall';
    if (Math.abs(this.vx) > 20) { const seq = ['iskra_runA', 'iskra_runB', 'iskra_runC', 'iskra_runB']; return seq[Math.floor(this.anim) % 4]; }
    return 'iskra_idle';
  }
  draw(c, L) {
    if (this.hidden) return;
    if (this.inv > 0 && Math.floor(this.inv * 12) % 2 === 0) c.globalAlpha = 0.5;
    // тень
    const gy = groundBelow(L, this.x, this.y);
    if (gy < this.y + 400) {
      const d = gy - this.y, a = clamp(0.35 - d / 900, 0.05, 0.35), s = clamp(1 - d / 500, 0.4, 1);
      c.fillStyle = `rgba(30,20,10,${a})`; c.beginPath(); c.ellipse(this.x, gy - 1, 24 * s, 6 * s, 0, 0, 7); c.fill();
    }
    const fr = this.frame(); const im = IMG[fr];
    const H = ISKRA_H * im.height / 322;
    const bob = (fr === 'iskra_idle') ? Math.sin(G.t * 3) * 0.018 : 0;
    // бег: плавный подскок по фазе шага; наклон корпуса по скорости
    const runBob = (this.onGround && Math.abs(this.vx) > 20) ? -Math.abs(Math.sin(this.anim * Math.PI / 2)) * 3.5 : 0;
    c.save(); c.translate(this.x, this.y + 1 + runBob); c.rotate(this.lean);
    drawSprite(c, im, 0, 0, H, this.face < 0, this.sx, this.sy * (1 + bob), ISKRA_AX[fr]);
    c.restore();
    c.globalAlpha = 1;
  }
}
function groundBelow(L, x, y) {
  const tx = Math.floor(x / TILE); let best = 1e9;
  for (let ty = Math.floor((y - 1) / TILE); ty < L.h; ty++) { const t = L.get(tx, ty); if (ty * TILE >= y - 1 && (isSolidT(t) || isOneWayT(t))) { best = ty * TILE; break; } }
  for (const m of L.movers || []) { const top = m.topY(); if (Math.abs(x - m.x) < m.w / 2 && top >= y - 1 && top < best) best = top; }
  return best;
}

// ---------- Камера ----------
const viewW = () => G.W / G.zoom, viewH = () => G.H / G.zoom;
class Camera {
  constructor() { this.x = 0; this.y = 0; this.look = 0; this.lock = null; this.groundY = 0; }
  snap(p, L) { this.groundY = p.y; this.update(p, L, 1, true); }
  update(p, L, dt, snap = false) {
    const lookT = p.face * (Math.abs(p.vx) > 120 ? 150 : 60);
    this.look = lerp(this.look, lookT, 1 - Math.exp(-dt * 2.2));
    if (p.onGround) this.groundY = p.y;
    const VW = viewW(), VH = viewH();
    let tx = p.x + this.look - VW / 2;
    let ty = this.groundY - VH * 0.68;
    if (p.y - VH * 0.68 > ty) ty = p.y - VH * 0.68;
    const sy = p.y - this.y;
    if (sy < VH * 0.3) ty = Math.min(ty, p.y - VH * 0.3);
    // мягкая подсказка: держать в кадре прямоугольник (например, табличку на воротах)
    if (this.hint && !this.lock) tx = clamp(tx, this.hint.x1 + 24 - VW, this.hint.x0 - 24);
    if (this.lock) { tx = this.lock.x - VW / 2; ty = this.lock.y - VH / 2; }
    this.tx = tx; this.ty = ty;
    tx = clamp(tx, 0, Math.max(0, L.pxW - VW)); ty = clamp(ty, 0, Math.max(0, L.pxH - VH));
    if (snap) { this.x = tx; this.y = ty; return; }
    this.x = lerp(this.x, tx, 1 - Math.exp(-dt * (this.lock ? 3 : 7)));
    this.y = lerp(this.y, ty, 1 - Math.exp(-dt * (this.lock ? 3 : (p.boost || p.vy < -1000 ? 9 : 4.5))));
    // высокий отскок (стог): голова Искры никогда не уходит за верх кадра
    if (!this.lock && !p.hidden) { const head = p.y - ISKRA_H - 28; if (head < this.y) this.y = Math.max(0, head); }
    // плавный отъезд камеры, когда на экране должно поместиться всё, что считаем
    const zT = (this.lock && this.lock.zoom) || G.baseZoom;
    G.zoom = Math.abs(G.zoom - zT) < 0.002 ? zT : lerp(G.zoom, zT, 1 - Math.exp(-dt * 3));
    this.settled = Math.abs(this.x - tx) < 1.5 && Math.abs(this.y - ty) < 1.5 && G.zoom === zT;
  }
}

// ---------- Объекты ----------
class Ent { constructor(x, y) { this.x = x; this.y = y; this.z = 0; this.dead = false; } update(dt) { } draw(c) { } }
function overlap(p, x, y, w, h) { return p.right > x && p.left < x + w && p.y > y && p.top < y + h; }

class Lantern extends Ent {
  constructor(x, y, lit = false, h = 96) { super(x, y); this.lit = lit; this.h = h; this.flare = 0; this.label = null; this.labelT = 0; this.dim = 0; this.z = -1; this.ph = frand(0, 6); }
  setLit(v, quiet = false) {
    if (this.lit === v) return; this.lit = v;
    if (v) { this.flare = 1; if (!quiet) { sparkBurst(this.x, this.y - this.h * 0.72, 18, '#fff1a8', 300); spawn({ type: 'glowburst', x: this.x, y: this.y - this.h * 0.72, life: 0.7, size: 120 }); } }
    else { for (let i = 0; i < 8; i++) spawn({ type: 'smoke', x: this.x + frand(-6, 6), y: this.y - this.h * 0.72, vx: frand(-20, 40), vy: frand(-60, -30), life: frand(0.8, 1.3), size: frand(6, 11), drag: 1 }); }
  }
  update(dt) { this.flare = Math.max(0, this.flare - dt * 1.6); if (this.label) this.labelT += dt; }
  rect() { const im = this.lit ? IMG.t_lamp_on : IMG.t_lamp_off; return spriteRectW(im, this.x, this.y + 2, this.h * im.height / 231); }
  draw(c) {
    const im = this.lit ? IMG.t_lamp_on : IMG.t_lamp_off;
    const cy = this.y - this.h * 0.72;
    if (this.lit) {
      const L = this.level, eve = L && L.bg !== 'day';
      glow(c, this.x, cy, (eve ? 120 : 84) + Math.sin(G.t * 6 + this.ph) * 5 + this.flare * 120, eve ? 'rgba(255,200,90,0.55)' : 'rgba(255,214,90,0.5)', 0.9);
      // тёплое пятно света на земле
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = eve ? 0.35 : 0.18;
      const pg = c.createRadialGradient(this.x, this.y, 2, this.x, this.y, 70); pg.addColorStop(0, 'rgba(255,200,100,0.9)'); pg.addColorStop(1, 'rgba(255,200,100,0)');
      c.fillStyle = pg; c.beginPath(); c.ellipse(this.x, this.y, 70, 16, 0, 0, 7); c.fill(); c.restore();
    }
    c.fillStyle = 'rgba(30,20,10,0.25)'; c.beginPath(); c.ellipse(this.x, this.y, 20, 5, 0, 0, 7); c.fill();
    drawSprite(c, im, this.x, this.y + 2, this.h * im.height / 231 * (231 / 231));
    if (this.lit) glow(c, this.x, cy, 22, 'rgba(255,250,200,0.9)', 0.7);
    if (this.flare > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = this.flare; c.strokeStyle = '#fff3b0'; c.lineWidth = 4; c.beginPath(); c.arc(this.x, cy, 20 + (1 - this.flare) * 70, 0, 7); c.stroke(); c.restore(); }
    if (this.label) {
      const k = easeOutBack(Math.min(1, this.labelT / 0.3));
      c.save(); c.translate(this.x, this.y - this.h - 34); c.scale(k, k);
      c.fillStyle = this.labelCol || '#ffd43b'; c.strokeStyle = '#7a3e00'; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); c.stroke();
      txt(c, this.label, 0, 1, { size: 28, fill: '#5a2d00' }); c.restore();
    }
  }
}

// герои-собеседники: Архимед (4 позы), Бублик (кот-пекарь), Пончик (медвежонок-продавец фруктов, соперник Бублика; свой рисунок)
const NPC_NAME = { arch: 'Архимед', bublik: 'Бублик', ponchik: 'Пончик' };
// рот (доля ширины от центра, доля высоты сверху) для каждой картинки; Архимед — из tools/process_arch.py (assets/arch_meta.js)
const NPC_MOUTH = { bublik: [0.475, 0.29], ponchik: [0.545, 0.308] };   // ponchik: рот медвежонка на assets/ponchik.png
function archMeta(pose) { return (typeof ARCH_META !== 'undefined' && ARCH_META[pose]) || { mx: 0.5, my: 0.2 }; }
class NPC extends Ent {
  constructor(kind, x, y, face = 1) {
    super(x, y); this.kind = kind; this.face = face; this.talk = 0; this.hop = 0; this.z = -2; this.alpha = 1; this.mood = 0; this.pose = 'idle';
    this.h = kind === 'arch' ? 150 : kind === 'ponchik' ? 132 : 124;   // Архимед чуть выше Искры (114); медвежонок чуть крупнее кота
    this.ph = frand(0, 6); this.nodT = frand(2, 4); this.nod = 0; this.waveT = frand(1, 3); this.wave = 0;
  }
  // поза «ура» (руки вверх, в прыжке) показывается ТОЛЬКО во время двух коротких прыжков, после — снова стоит
  get apose() { return this.cheerT > 0 ? 'cheer' : (this.pose === 'cheer' ? 'idle' : this.pose); }
  get im() {
    if (this.kind === 'arch') return IMG['arch_' + this.apose] || IMG.arch_idle;
    if (this.kind === 'ponchik') return IMG.ponchik;   // медвежонок-продавец фруктов (свой рисунок, не перекрашенный Бублик)
    return IMG.bublik;
  }
  update(dt) {
    if (this.kind === 'arch') {
      if (this.pose === 'cheer' && !this.cheerT && !this.cheerDone) { this.cheerT = NPC.CHEER; this.cheerDone = true; }
      if (this.pose !== 'cheer') this.cheerDone = false;
      if (this.cheerT > 0) { this.cheerT = Math.max(0, this.cheerT - dt); if (this.cheerT === 0 && this.pose === 'cheer') this.pose = 'idle'; }
    }
    this.talk = Math.max(0, this.talk - dt); this.hop = Math.max(0, this.hop - dt);
    this.nodT -= dt; if (this.nodT <= 0) { this.nod = 1; this.nodT = frand(2.6, 4.2); }
    this.nod = Math.max(0, this.nod - dt * 4);
    this.waveT -= dt; if (this.waveT <= 0) { this.wave = 1.4; this.waveT = frand(3.5, 6); }
    if (this.talk > 0 && this.wave <= 0 && this.kind !== 'arch') this.wave = 0.9;
    this.wave = Math.max(0, this.wave - dt);
  }
  // рост картинки: у Архимеда кадры поз разной высоты при одном масштабе (hs), голова везде одного размера
  get drawH() { return this.kind === 'arch' ? this.h * (archMeta(this.apose).hs || 1) : this.h; }
  headTop() { return { x: this.x, y: this.y - this.drawH - 4 + this.bounceY() }; }
  mouth() {
    const im = this.im, H = this.drawH, s = H / im.height, w = im.width * s;
    let mx, my;
    if (this.kind === 'arch') { const m = archMeta(this.apose); mx = m.mx; my = m.my; } else [mx, my] = NPC_MOUTH[this.kind];
    const dx = (mx - 0.5) * w * this.face;
    return { x: this.x + dx, y: this.y - H * (1 - my) + this.bounceY() };
  }
  rect() { return spriteRectW(this.im, this.x, this.y + 2 + this.bounceY(), this.drawH, this.face < 0); }
  bounceY() {
    if (this.cheerT > 0) { const ph = ((1 - this.cheerT / NPC.CHEER) * 2) % 1; return -Math.sin(ph * Math.PI) * 30; }   // два прыжка и приземление
    return this.hop > 0 ? -Math.sin((1 - this.hop / 0.5) * Math.PI) * 26 : 0;
  }
  draw(c) {
    if (this.alpha <= 0) return;
    c.save(); c.globalAlpha = this.alpha;
    c.fillStyle = 'rgba(30,20,10,0.28)'; c.beginPath(); c.ellipse(this.x, this.y, this.h * 0.3, 8, 0, 0, 7); c.fill();
    const br = 1 + Math.sin(G.t * 2.2 + this.ph) * 0.012 + (this.talk > 0 ? Math.abs(Math.sin(G.t * 14)) * 0.025 : 0);
    const nod = 1 - Math.sin(this.nod * Math.PI) * 0.035;
    const sq = (this.mood > 0 ? 1 + Math.sin(G.t * 12) * 0.04 : 1) * nod;
    const parts = this.kind === 'arch' ? null : npcParts(this);
    drawRig(c, this.im, this.x, this.y + 2 + this.bounceY(), this.drawH, this.face < 0, 1 / Math.sqrt(br * sq), br * sq, parts);
    c.restore();
  }
}

NPC.CHEER = 1.1;

class Flag extends Ent {
  constructor(x, y, finish = false) { super(x, y); this.finish = finish; this.on = false; this.raise = 0; this.z = -1; this.locked = false; }
  update(dt) { if (this.on) this.raise = Math.min(1, this.raise + dt * 2); }
  draw(c) {
    const im = IMG.t_flag, h = this.finish ? 190 : 112;
    if (this.finish) { glow(c, this.x + 10, this.y - h * 0.6, 120, this.locked ? 'rgba(120,160,255,0.25)' : 'rgba(255,230,120,0.45)', 0.8); }
    c.fillStyle = 'rgba(30,20,10,0.25)'; c.beginPath(); c.ellipse(this.x, this.y, 18, 5, 0, 0, 7); c.fill();
    const s = h / im.height, w = im.width * s;
    const poleX = this.x - w * 0.5 + 18 * s;
    // древко
    c.drawImage(im, 0, 0, 45, im.height, poleX - 20 * s, this.y - h + 2, 45 * s, h);
    // полотнище: опущено, поднимается при активации
    const fy = this.finish ? 0 : (1 - (this.on ? easeOutBack(this.raise) : 0)) * h * 0.5;
    c.save(); c.translate(0, fy);
    const wave = Math.sin(G.t * 5 + this.x) * 0.06;
    c.translate(poleX + 25 * s, this.y - h); c.transform(1, wave, 0, 1, 0, 0);
    // серое полотнище берём из кэша: ctx.filter на каждом кадре очень дорогой (−15 FPS на телефоне)
    const src = !this.finish && !this.on ? filteredImg(im, 'grayscale(0.7) brightness(0.9)') : im;
    c.drawImage(src, 45, 0, im.width - 45, im.height * 0.55, 0, 0, (im.width - 45) * s, im.height * 0.55 * s);
    c.restore();
  }
}

class Bun extends Ent {
  // y — точка опоры (верх противня); булочка лежит, а не висит
  constructor(x, y, group) { super(x, y); this.group = group; this.ph = frand(0, 6); this.taken = false; this.size = 46; this.z = -1; }
  get h() { return this.size * IMG.t_bun.height / IMG.t_bun.width; }
  draw(c) {
    if (this.taken) return;
    const im = IMG.t_bun, w = this.size, h = this.h;
    const sq = 1 + Math.sin(G.t * 2.4 + this.ph) * 0.025;
    glow(c, this.x, this.y - h * 0.5, 34, 'rgba(255,220,140,0.4)', 0.6);
    c.fillStyle = 'rgba(60,30,10,0.3)'; c.beginPath(); c.ellipse(this.x, this.y - 1, w * 0.4, 4, 0, 0, 7); c.fill();
    c.save(); c.translate(this.x, this.y + 1); c.scale(1 / sq, sq); c.drawImage(im, -w / 2, -h, w, h); c.restore();
    // тёплый парок
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.lineCap = 'round';
    const t = (G.t * 0.6 + this.ph) % 1;
    c.globalAlpha = Math.sin(t * Math.PI) * 0.8;
    const yy = this.y - h - 4 - t * 22;
    c.beginPath(); c.moveTo(this.x - 4, yy + 12); c.quadraticCurveTo(this.x + 6, yy + 6, this.x - 2, yy); c.quadraticCurveTo(this.x - 8, yy - 6, this.x + 2, yy - 12); c.stroke();
    c.restore();
  }
}
// противень-полочка, на котором лежат булочки
class BunTray extends Ent {
  constructor(x0, x1, ySurf) { super((x0 + x1) / 2, ySurf); this.x0 = x0; this.x1 = x1; this.z = -1.5; this.th = 12; }
  get top() { return this.y - this.th; }
  draw(c) {
    const X = this.x0, W = this.x1 - this.x0, Y = this.y;
    c.fillStyle = 'rgba(40,20,5,0.3)'; c.beginPath(); c.ellipse(this.x + 3, Y + 1, W * 0.52, 6, 0, 0, 7); c.fill();
    // ножки
    c.fillStyle = '#6b3f18'; for (const lx of [X + 10, X + W - 18]) { rr(c, lx, Y - 6, 8, 7, 2); c.fill(); }
    const g = c.createLinearGradient(0, Y - this.th, 0, Y - 4); g.addColorStop(0, '#f0b26a'); g.addColorStop(1, '#a8652c');
    c.fillStyle = g; c.strokeStyle = '#5b3313'; c.lineWidth = 3; rr(c, X, Y - this.th - 2, W, this.th - 2, 6); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,240,210,0.6)'; rr(c, X + 6, Y - this.th, W - 12, 3, 1.5); c.fill();
    // салфетка в клеточку
    c.save(); rr(c, X + 8, Y - this.th - 5, W - 16, 5, 2); c.clip();
    for (let x = X + 8, i = 0; x < X + W - 8; x += 10, i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff8787'; c.fillRect(x, Y - this.th - 5, 10, 5); }
    c.restore();
  }
}

class NumBlock extends Ent {
  // value: число, знак «>», «<», «=» или слово («больше»…); wT — ширина в клетках (слова — 2 клетки)
  constructor(tx, ty, value, q, wT = 1) { super(tx * TILE + wT * TILE / 2, ty * TILE); this.tx = tx; this.ty = ty; this.wT = wT; this.value = value; this.q = q; this.bump = 0; this.shake = 0; this.state = 'idle'; this.appear = 0; this.used = false; this.z = 1; this.hl = 0; }
  get bw() { return this.wT === 1 ? 68 : this.wT * TILE - 12; }
  update(dt) { this.bump = Math.max(0, this.bump - dt * 4); this.shake = Math.max(0, this.shake - dt * 2.2); this.appear = Math.min(1, this.appear + dt * 2.5); this.hl = Math.max(0, this.hl - dt); }
  rect() { return { x: this.x - this.bw / 2 - 4, y: this.y - 4, w: this.bw + 8, h: 76 }; }
  draw(c) {
    const k = easeOutBack(this.appear);
    const by = this.y - Math.sin(this.bump * Math.PI) * 16 + (1 - k) * 30;
    const sx = Math.sin(this.shake * 40) * 6 * this.shake;
    const S = 68;
    if (this.frame) drawChains(c, this.x, this.frame.beamY + 20 + this.frame.dropY(), this.x + sx, by - 2 + (1 - k) * 20, this.frame.alpha(), this.wT > 1 ? 44 : 21);
    c.save(); c.translate(this.x + sx, by + TILE / 2); c.scale(k, k);
    drawNumBlock(c, 0, 0, S, this.value, this.state, this.hl, this.bw);
    c.restore();
  }
}
function chainLinks(c, x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 11));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    c.save(); c.translate(x, y);
    const g = c.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, '#9a6a00'); g.addColorStop(0.45, '#ffe58a'); g.addColorStop(1, '#a87400');
    c.strokeStyle = '#5e3c00'; c.lineWidth = 5.5;
    if (i % 2) { c.beginPath(); c.ellipse(0, 0, 2.2, 6.5, 0, 0, 7); c.stroke(); c.strokeStyle = g; c.lineWidth = 3; c.stroke(); }
    else { c.beginPath(); c.ellipse(0, 0, 4.6, 6.5, 0, 0, 7); c.stroke(); c.strokeStyle = g; c.lineWidth = 3; c.stroke(); }
    c.restore();
  }
}
function drawChains(c, bx, beamY, x, topY, a = 1, sp = 21) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  for (const o of [-sp, sp]) {
    chainLinks(c, bx + o, beamY, x + o, topY);
    c.fillStyle = '#5e3c00'; c.beginPath(); c.arc(x + o, topY + 3, 4.5, 0, 7); c.fill(); c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(x + o, topY + 3, 2.6, 0, 7); c.fill();
  }
  c.restore();
}
// деревянная рама «как на ярмарке»: два столба на земле и перекладина, на ней висят блоки с ответами
class QFrame extends Ent {
  constructor(xL, xR, beamY, groundL, groundR) { super((xL + xR) / 2, Math.max(groundL, groundR)); this.xL = xL; this.xR = xR; this.beamY = beamY; this.gL = groundL; this.gR = groundR; this.t = 0; this.out = 0; this.leaving = false; this.z = -1.6; }
  update(dt) { this.t = Math.min(1, this.t + dt * 2.2); if (this.leaving) { this.out = Math.min(1, this.out + dt * 2); if (this.out >= 1) this.dead = true; } }
  alpha() { return Math.min(1, this.t * 1.5) * (1 - this.out); }
  rects() { const by = this.beamY + this.dropY(); return [{ id: 'столб рамы', x: this.xL - 11, y: by - 18, w: 22, h: this.gL - by + 18 }, { id: 'столб рамы', x: this.xR - 11, y: by - 18, w: 22, h: this.gR - by + 18 }, { id: 'перекладина', x: this.xL - 24, y: by, w: this.xR - this.xL + 48, h: 36 }]; }
  dropY() { return -(1 - easeOutBack(this.t)) * 40; }
  draw(c) {
    const a = this.alpha(); if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    const by = this.beamY + this.dropY();
    for (const [px, gy] of [[this.xL, this.gL], [this.xR, this.gR]]) {
      c.fillStyle = 'rgba(30,20,10,0.3)'; c.beginPath(); c.ellipse(px + 4, gy + 1, 22, 6, 0, 0, 7); c.fill();
      const w = 22, g = c.createLinearGradient(px - w / 2, 0, px + w / 2, 0);
      g.addColorStop(0, '#6b3f18'); g.addColorStop(0.3, '#d7965a'); g.addColorStop(0.6, '#b07335'); g.addColorStop(1, '#5a3412');
      c.fillStyle = g; c.strokeStyle = '#3e2410'; c.lineWidth = 3; rr(c, px - w / 2, by + 6, w, gy - by - 2, 7); c.fill(); c.stroke();
      // верёвочная обмотка
      c.strokeStyle = '#e9c98f'; c.lineWidth = 3;
      for (const yy of [by + 34, by + 44, gy - 40, gy - 30]) { c.beginPath(); c.moveTo(px - w / 2 + 1, yy); c.lineTo(px + w / 2 - 1, yy - 5); c.stroke(); }
      // латунный набалдашник
      const bg = c.createRadialGradient(px - 4, by - 10, 1, px, by - 6, 12); bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.5, '#ffd43b'); bg.addColorStop(1, '#a86b00');
      c.fillStyle = bg; c.strokeStyle = '#5e3c00'; c.lineWidth = 2.5; c.beginPath(); c.arc(px, by - 8, 10, 0, 7); c.fill(); c.stroke();
      grassTufts(c, px - 16, px + 14, gy + 2, 8, px, 12);
    }
    // перекладина
    const X0 = this.xL - 24, X1 = this.xR + 24, h = 24;
    const bg = c.createLinearGradient(0, by, 0, by + h); bg.addColorStop(0, '#e8a866'); bg.addColorStop(0.55, '#b5743a'); bg.addColorStop(1, '#6e3f17');
    c.fillStyle = bg; c.strokeStyle = '#3e2410'; c.lineWidth = 3.5; rr(c, X0, by, X1 - X0, h, 11); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,240,210,0.5)'; rr(c, X0 + 12, by + 4, X1 - X0 - 24, 4, 2); c.fill();
    c.strokeStyle = 'rgba(90,50,20,0.45)'; c.lineWidth = 1.5;
    for (let x = X0 + 30; x < X1 - 30; x += 70) { c.beginPath(); c.moveTo(x, by + 14); c.quadraticCurveTo(x + 18, by + 18, x + 36, by + 13); c.stroke(); }
    // флажки-гирлянда по краю
    const cols = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#f783ac'];
    for (let x = X0 + 18, i = 0; x < X1 - 18; x += 30, i++) {
      if ((this.blockXs || []).some(bx => Math.abs(x - bx) < 36)) continue;
      c.fillStyle = cols[i % 5]; c.beginPath(); c.moveTo(x - 9, by + h - 2); c.lineTo(x + 9, by + h - 2); c.lineTo(x, by + h + 12); c.closePath(); c.fill();
    }
    c.restore();
  }
}
function drawNumBlock(c, x, y, S, value, state = 'idle', hl = 0, W = S) {
  const r = 16, X = x - W / 2, Y = y - S / 2;
  c.fillStyle = 'rgba(40,20,0,0.3)'; rr(c, X + 3, Y + 8, W, S, r); c.fill();
  const gold = state !== 'wrong';
  rr(c, X, Y, W, S, r); c.fillStyle = state === 'used' ? '#8a5a1c' : gold ? '#a85d00' : '#9c3b2e'; c.fill();
  rr(c, X + 4, Y + 3, W - 8, S - 10, r - 4);
  const g = c.createLinearGradient(0, Y, 0, Y + S);
  if (state === 'used') { g.addColorStop(0, '#ffe8a3'); g.addColorStop(1, '#e0a040'); }
  else if (gold) { g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ffcc29'); g.addColorStop(1, '#f39200'); }
  else { g.addColorStop(0, '#ffc9b8'); g.addColorStop(1, '#e8735a'); }
  c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)'; rr(c, X + 10, Y + 7, W - 20, 10, 5); c.fill();
  c.fillStyle = 'rgba(120,60,0,0.45)';
  for (const [a, b] of [[X + 9, Y + 9], [X + W - 9, Y + 9], [X + 9, Y + S - 13], [X + W - 9, Y + S - 13]]) { c.beginPath(); c.arc(a, b, 3, 0, 7); c.fill(); }
  if (hl > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = hl; rr(c, X, Y, W, S, r); c.fillStyle = '#fff6c0'; c.fill(); c.restore(); }
  const v = String(value), sign = v === '>' || v === '<' || v === '=';
  if (sign) drawSignGlyph(c, v, x, y - 3, S * 0.27, '#fff', '#8a4300');
  else { c.font = font(S * 0.62, 900); const sz = Math.min(S * 0.62, S * 0.62 * (W - 22) / Math.max(1, c.measureText(v).width)); txt(c, v, x, y - 2, { size: sz, fill: '#fff', stroke: '#8a4300', sw: sz > 30 ? 8 : 6, shadow: 'rgba(110,50,0,0.45)', sy: 3 }); }
}
// знаки сравнения рисуем сами (толстые «клювики» и две полоски) — одинаково в любом шрифте
function drawSignGlyph(c, v, x, y, s, fill = '#fff', stroke = '#8a4300') {
  c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => {
    c.beginPath();
    if (v === '=') { c.moveTo(-s, -s * 0.42); c.lineTo(s, -s * 0.42); c.moveTo(-s, s * 0.42); c.lineTo(s, s * 0.42); }
    else { const d = v === '>' ? 1 : -1; c.moveTo(-s * 0.8 * d, -s); c.lineTo(s * 0.8 * d, 0); c.lineTo(-s * 0.8 * d, s); }
  };
  c.strokeStyle = stroke; c.lineWidth = s * 0.62; path(); c.stroke();
  c.strokeStyle = fill; c.lineWidth = s * 0.34; path(); c.stroke();
  c.restore();
}
class Shchelk extends Ent {
  constructor(x, y) { super(x, y); this.kind = 'shchelk'; this.mode = 'patrol'; this.t = 0; this.face = -1; this.cx = x; this.cy = y; this.range = 260; this.carry = false; this.held = 0; this.flee = 0; this.z = 2; this.w = 64; this.h = 46; this.speed = 0.8; this.tx = x; this.ty = y; this.vis = true; this.hitCd = 0; }
  update(dt) {
    this.t += dt; this.hitCd = Math.max(0, this.hitCd - dt);
    const ox = this.x, oy = this.y;
    if (this.mode === 'patrol') {
      // пикирует дугой: у краёв маршрута выше, посередине ныряет вниз
      const th = this.t * this.speed, nx = this.cx + Math.sin(th) * this.range;
      const ny = this.cy - 34 + 62 * Math.pow(Math.cos(th), 2);
      this.face = nx < this.x ? -1 : 1; this.x = nx; this.y = ny;
    } else if (this.mode === 'flee') {
      this.flee -= dt; this.y -= 260 * dt * Math.max(0, this.flee); this.x += this.face * 80 * dt;
      if (this.flee <= -1.2) { this.mode = 'return'; }
    } else if (this.mode === 'return' || this.mode === 'goto') {
      const tx = this.mode === 'return' ? this.cx + Math.sin(this.t * this.speed) * this.range : this.tx;
      const ty = this.mode === 'return' ? this.cy : this.ty;
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      const sp = this.mode === 'goto' ? (this.gotoSpeed || 420) : 220;
      if (Math.abs(dx) > 2) this.face = dx < 0 ? -1 : 1;
      if (d < sp * dt + 2) { this.x = tx; this.y = ty; if (this.mode === 'return') this.mode = 'patrol'; else this.mode = 'arrived'; }
      else { this.x += dx / d * sp * dt; this.y += dy / d * sp * dt; }
      if (this.mode === 'patrol') this.t = Math.asin(clamp((this.x - this.cx) / this.range, -1, 1)) / this.speed;
    }
    // наклон по направлению полёта
    const vx = (this.x - ox) / Math.max(dt, 1e-4), vy = (this.y - oy) / Math.max(dt, 1e-4);
    const tilt = (this.mode === 'perch' || this.held > 0) ? 0 : clamp(Math.atan2(vy, Math.abs(vx) + 60) * 0.55, -0.35, 0.35);
    this.tilt = lerp(this.tilt || 0, tilt, 1 - Math.exp(-dt * 6));
  }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  draw(c) {
    if (!this.vis) return;
    // тень на земле под летящим Щёлком
    if (this.level) { const gy = groundBelow(this.level, this.x, this.y + 20); const d = gy - this.y; if (d < 420) { const k = clamp(1 - d / 420, 0, 1); c.fillStyle = `rgba(30,20,10,${0.22 * k})`; c.beginPath(); c.ellipse(this.x, gy - 1, 34 * (0.5 + k * 0.5), 6 * (0.5 + k * 0.5), 0, 0, 7); c.fill(); } }
    if (this.held > 0) { this.drawHolding(c); return; }
    // золотая гирька на ленточке под Щёлком
    if (this.weight) { const wx = this.x - this.face * 6, wy = this.y + 66 + Math.sin(this.t * 5) * 3; c.strokeStyle = '#e03131'; c.lineWidth = 3; c.beginPath(); c.moveTo(this.x - this.face * 4, this.y + 14); c.lineTo(wx, wy - 40); c.stroke(); glow(c, wx, wy - 18, 46, 'rgba(255,214,90,0.7)', 0.8); drawItem(c, 'weight', wx, wy, 40); }
    let im;
    if (this.mode === 'perch') im = IMG.shchelk_laugh;
    else if (this.carry) im = IMG.shchelk_carry;
    else im = (Math.floor(this.t * 9) % 2) ? IMG.shchelk_up : IMG.shchelk_down;
    const W = this.mode === 'perch' ? 92 : 128; const s = W / im.width;
    c.save(); c.translate(this.x, this.y);
    if (this.mode !== 'perch') c.rotate((this.tilt || 0) * (this.face > 0 ? 1 : -1));
    c.scale(this.face > 0 ? -1 : 1, 1);
    if (this.mode === 'perch') c.drawImage(im, -im.width * s / 2, -im.height * s + 10, im.width * s, im.height * s);
    else c.drawImage(im, -im.width * s * 0.42, -im.height * s * 0.5, im.width * s, im.height * s);
    c.restore();
  }
  // булочки у Щёлка: одна в лапах (в спрайте) + остальные висят на верёвочках ниже — каждая видна целиком
  extraBuns() { const n = Math.max(0, this.held - 1), out = []; for (let i = 0; i < n; i++) out.push([(i - (n - 1) / 2) * 32, 76]); return out; }
  drawnBuns() { return this.held > 0 ? 1 + this.extraBuns().length : 0; }
  holdGeom() { const im = IMG.shchelk_carry, W = 140, s = W / im.width; return { im, W, H: im.height * s, s, bob: this.mode === 'perch' ? Math.sin(G.t * 4) * 5 : 0 }; }
  // локальные координаты (до отражения): центр булочки в спрайте
  spriteBunLocal() { const g = this.holdGeom(); return { x: 95 * g.s - g.W * 0.42, y: 180 * g.s - g.H * 0.5, w: 72 * g.s, h: 68 * g.s }; }
  drawHolding(c) {
    const g = this.holdGeom(), im = g.im;
    c.save(); c.translate(this.x, this.y + g.bob);
    c.scale(this.face > 0 ? -1 : 1, 1);
    const sb = this.spriteBunLocal(), bw = 30, bh = bw * IMG.t_bun.height / IMG.t_bun.width;
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 2;
    for (const [ox, oy] of this.extraBuns()) { c.beginPath(); c.moveTo(sb.x, sb.y + 8); c.lineTo(sb.x + ox, sb.y + oy - bh / 2); c.stroke(); }
    c.drawImage(im, -g.W * 0.42, -g.H * 0.5, g.W, g.H);
    for (const [ox, oy] of this.extraBuns()) c.drawImage(IMG.t_bun, sb.x + ox - bw / 2, sb.y + oy - bh / 2, bw, bh);
    c.restore();
  }
  toWorld(lx, ly) { const g = this.holdGeom(); return { x: this.x + (this.face > 0 ? -lx : lx), y: this.y + g.bob + ly }; }
  bunRects() {
    if (this.held <= 0) return [];
    const sb = this.spriteBunLocal(), bw = 30, bh = bw * IMG.t_bun.height / IMG.t_bun.width, out = [];
    const p0 = this.toWorld(sb.x, sb.y); out.push({ x: p0.x - sb.w / 2, y: p0.y - sb.h / 2, w: sb.w, h: sb.h, inSprite: true });
    for (const [ox, oy] of this.extraBuns()) { const p = this.toWorld(sb.x + ox, sb.y + oy); out.push({ x: p.x - bw / 2, y: p.y - bh / 2, w: bw, h: bh }); }
    return out;
  }
  rect() {
    if (this.held > 0) { const g = this.holdGeom(); const x0 = this.face > 0 ? this.x - g.W * 0.58 : this.x - g.W * 0.42; return { x: x0, y: this.y + g.bob - g.H * 0.5, w: g.W, h: g.H }; }
    let im; if (this.mode === 'perch') im = IMG.shchelk_laugh; else if (this.carry) im = IMG.shchelk_carry; else im = IMG.shchelk_up;
    const W = this.mode === 'perch' ? 92 : 128, s = W / im.width, H = im.height * s;
    if (this.mode === 'perch') return { x: this.x - W / 2, y: this.y - H + 10, w: W, h: H };
    return { x: this.face > 0 ? this.x - W * 0.58 : this.x - W * 0.42, y: this.y - H * 0.5, w: W, h: H };
  }
  headTop() { return { x: this.x, y: this.y - (this.held > 0 ? 50 : (this.mode === 'perch' ? 80 : 40)) }; }
  mouth() { return { x: this.x + this.face * 30, y: this.y - (this.held > 0 ? 20 : (this.mode === 'perch' ? 50 : 10)) }; }
}

class Basket extends Ent {
  constructor(x, y) { super(x, y); this.count = 0; this.z = -1; this.pulse = 0; this.labels = null; this.labelT = 0; }
  slots(n) {
    // два ровных ряда, булочки почти не перекрываются — каждую легко посчитать
    const out = [], nb = Math.min(n, 4), nt = Math.max(0, n - 4), dx = 39;
    for (let i = 0; i < nb; i++) out.push([(i - (nb - 1) / 2) * dx, -20]);
    for (let i = 0; i < nt; i++) out.push([(i - (nt - 1) / 2) * dx, -56]);
    return out;
  }
  update(dt) { this.pulse = Math.max(0, this.pulse - dt * 3); if (this.labels) this.labelT += dt; }
  draw(c) {
    const im = IMG.t_basket, W = 152, H = W * im.height / im.width;
    const s = 1 + this.pulse * 0.08;
    c.fillStyle = 'rgba(30,20,10,0.25)'; c.beginPath(); c.ellipse(this.x, this.y, 56, 9, 0, 0, 7); c.fill();
    c.save(); c.translate(this.x, this.y); c.scale(s, 1 / s);
    // задняя часть корзины: рисуем целиком, булочки поверх, затем передний край
    c.drawImage(im, -W / 2, -H, W, H);
    const top = -H * 0.52;
    const bw = 38, bun = IMG.t_bun, bh = bw * bun.height / bun.width;
    this.slots(this.count).forEach(([sx, sy], i) => {
      c.drawImage(bun, sx - bw / 2, top + sy - bh / 2, bw, bh);
    });
    // передний край корзины поверх булочек (нижняя половина)
    c.drawImage(im, 0, im.height * 0.5, im.width, im.height * 0.5, -W / 2, -H * 0.5, W, H * 0.5);
    c.restore();
    if (this.labels) {
      const k = easeOutBack(Math.min(1, this.labelT / 0.3));
      this.slots(this.count).forEach(([sx, sy], i) => {
        if (i >= this.labels) return;
        c.save(); c.translate(this.x + sx, this.y - H * 0.52 + sy - 2); c.scale(k, k);
        c.fillStyle = '#ffd43b'; c.strokeStyle = '#7a3e00'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); c.stroke();
        txt(c, String(i + 1), 0, 1, { size: 16, fill: '#5a2d00' }); c.restore();
      });
    }
  }
  bunRects() { const im = IMG.t_basket, W = 152, H = W * im.height / im.width, bw = 38, bh = bw * IMG.t_bun.height / IMG.t_bun.width; return this.slots(this.count).map(([sx, sy]) => ({ x: this.x + sx - bw / 2, y: this.y - H * 0.52 + sy - bh / 2, w: bw, h: bh })); }
  headTop() { return { x: this.x, y: this.y - 140 }; }
  mouth() { return { x: this.x, y: this.y - 100 }; }
}

class Gate extends Ent {
  constructor(tx, rowTop, rowBottom) { super(tx * TILE + TILE / 2, rowBottom * TILE); this.tx = tx; this.r0 = rowTop; this.r1 = rowBottom; this.open = false; this.fade = 1; this.z = -1; }
  apply(L) { for (let r = this.r0; r < this.r1; r++) L.set(this.tx, r, this.open ? T_EMPTY : T_SOLID_DYN); }
  update(dt) { if (this.open) this.fade = Math.max(0, this.fade - dt * 1.2); }
  draw(c) {
    const X = this.tx * TILE, Y0 = this.r0 * TILE, Y1 = this.r1 * TILE, h = Y1 - Y0;
    const ax = X - 50, aw = TILE + 100, inX = ax + 34, inW = aw - 68;
    c.save();
    if (this.fade > 0) {
      c.globalAlpha = this.fade;
      // волшебная завеса
      const g = c.createLinearGradient(0, Y0, 0, Y1);
      g.addColorStop(0, 'rgba(150,120,255,0.55)'); g.addColorStop(0.5, 'rgba(110,200,255,0.6)'); g.addColorStop(1, 'rgba(255,230,140,0.65)');
      c.fillStyle = g; c.beginPath(); c.moveTo(inX, Y1); c.lineTo(inX, Y0 + 30); c.quadraticCurveTo(X + TILE / 2, Y0 - 30, inX + inW, Y0 + 30); c.lineTo(inX + inW, Y1); c.closePath(); c.fill();
      c.save(); c.clip();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const xx = inX + ((G.t * 40 + i * 37) % inW); const gg = c.createLinearGradient(xx - 12, 0, xx + 12, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.fillRect(xx - 12, Y0, 24, h); }
      for (let i = 0; i < 10; i++) { const yy = Y1 - ((G.t * 70 + i * 41) % (h - 10)); c.fillStyle = 'rgba(255,255,230,0.9)'; drawStar(c, inX + 10 + ((i * 53) % (inW - 20)) + Math.sin(G.t * 3 + i) * 6, yy, 5 + (i % 3), G.t * 2 + i); c.fill(); }
      c.restore();
      glow(c, X + TILE / 2, Y0 + h / 2, 130, 'rgba(140,190,255,0.55)', 0.7 * this.fade);
    }
    c.globalAlpha = 1;
    // столбы
    for (const px of [ax, ax + aw - 34]) {
      c.fillStyle = '#5b3313'; rr(c, px - 3, Y0 + 10, 40, h - 8, 10); c.fill();
      const g2 = c.createLinearGradient(px, 0, px + 34, 0); g2.addColorStop(0, '#e09a52'); g2.addColorStop(1, '#8e521f');
      c.fillStyle = g2; rr(c, px, Y0 + 14, 34, h - 14, 8); c.fill();
      c.fillStyle = 'rgba(255,240,200,0.35)'; rr(c, px + 5, Y0 + 20, 7, h - 30, 4); c.fill();
    }
    // дуга
    c.lineWidth = 28; c.strokeStyle = '#5b3313'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ax + 17, Y0 + 30); c.quadraticCurveTo(X + TILE / 2, Y0 - 50, ax + aw - 17, Y0 + 30); c.stroke();
    c.lineWidth = 19; c.strokeStyle = '#c98543'; c.stroke();
    // табличка: нужен 10 фонарей
    const px = X + TILE / 2, py = Y0 - 18;
    if (this.plaque) { this.plaque(c, px, py); c.restore(); return; }
    c.fillStyle = '#5b3313'; c.beginPath(); c.arc(px, py, 38, 0, 7); c.fill();
    const g3 = c.createRadialGradient(px - 10, py - 12, 4, px, py, 36); g3.addColorStop(0, this.open ? '#fff6b0' : '#ffe08a'); g3.addColorStop(1, this.open ? '#ffc21a' : '#d99a2b');
    c.fillStyle = g3; c.beginPath(); c.arc(px, py, 33, 0, 7); c.fill();
    drawSprite(c, IMG.t_lamp_on, px - 11, py + 24, 44);
    txt(c, '10', px + 12, py + 2, { size: 26, fill: '#fff', stroke: '#8a4300', sw: 6 });
    c.restore();
  }
}
class Bridge extends Ent {
  constructor(tx0, tx1, row) { super(tx0 * TILE, row * TILE); this.tx0 = tx0; this.tx1 = tx1; this.row = row; this.n = 0; this.anim = []; this.z = -1; }
  build(L) {
    const self = this;
    run((function* () {
      for (let x = self.tx0; x < self.tx1; x++) { self.anim.push({ x, t: 0 }); L.set(x, self.row, T_ONEWAY_DYN); Sound.bump(); yield 0.16; }
    })());
  }
  update(dt) { for (const a of this.anim) a.t = Math.min(1, a.t + dt * 3); }
  draw(c) {
    const Y = this.row * TILE;
    if (!this.anim.length) return;
    const last = this.anim[this.anim.length - 1];
    const X0 = this.tx0 * TILE - 6, X1 = (last.x + 1) * TILE + 6;
    // столбики на концах
    const post = (x) => {
      const g = c.createLinearGradient(x - 9, 0, x + 9, 0); g.addColorStop(0, '#8a5a2b'); g.addColorStop(0.5, '#c98a4b'); g.addColorStop(1, '#6b4220');
      c.fillStyle = g; c.strokeStyle = '#4a2c12'; c.lineWidth = 3; rr(c, x - 9, Y - 62, 18, 70, 7); c.fill(); c.stroke();
      c.fillStyle = '#e0a868'; c.beginPath(); c.ellipse(x, Y - 62, 9, 4, 0, 0, Math.PI * 2); c.fill();
    };
    post(this.tx0 * TILE + 4);
    // верёвка-перила (непрерывная, провисает)
    c.lineCap = 'round';
    for (const [w, col] of [[7, '#5a3a18'], [3.5, '#c99a5a']]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(this.tx0 * TILE + 4, Y - 56); c.quadraticCurveTo((X0 + X1) / 2, Y - 22, X1 - 10, Y - 56); c.stroke();
    }
    // доски: по 3 на клетку, вплотную, на общей балке
    c.fillStyle = 'rgba(30,20,10,0.22)'; rr(c, X0 + 6, Y + 26, X1 - X0 - 12, 10, 5); c.fill();
    for (const a of this.anim) {
      const k = easeOutBack(a.t); const yy = Y - (1 - k) * 120;
      c.save(); c.globalAlpha = Math.min(1, a.t * 3);
      // балка
      c.fillStyle = '#7a4a1e'; c.fillRect(a.x * TILE - 1, yy + 14, TILE + 2, 9);
      const bw = TILE / 2;
      for (let j = 0; j < 2; j++) {
        const bx = a.x * TILE + j * bw, h = 24, tone = ((a.x * 5 + j * 3) % 3), tilt = (((a.x * 7 + j * 5) % 5) - 2) * 0.012;
        c.save(); c.translate(bx + bw / 2, yy + h / 2 - 4); c.rotate(tilt);
        const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, ['#e4a35e', '#d9964f', '#eaad68'][tone]); g.addColorStop(0.5, ['#b8743a', '#ad6a32', '#c07c40'][tone]); g.addColorStop(1, '#7c4a20');
        c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5;
        rr(c, -bw / 2 + 1, -h / 2, bw - 2, h, 4); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(90,50,20,0.45)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-bw / 2 + 6, -1); c.quadraticCurveTo(0, 3, bw / 2 - 6, 0); c.stroke();
        c.fillStyle = 'rgba(255,240,210,0.45)'; rr(c, -bw / 2 + 5, -h / 2 + 3, bw - 12, 3, 1.5); c.fill();
        c.fillStyle = '#3e2410'; c.beginPath(); c.arc(-bw / 2 + 7, 5, 2, 0, 7); c.fill(); c.beginPath(); c.arc(bw / 2 - 7, 5, 2, 0, 7); c.fill();
        c.restore();
      }
      c.restore();
    }
    if (this.anim.length === this.tx1 - this.tx0 && last.t >= 1) post(X1 - 10);
  }
}
