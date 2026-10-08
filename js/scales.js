'use strict';
// ===== Весы и всё, что на них кладут =====
// Правило весов (как в уроке): чаша, где БОЛЬШЕ, опускается; знак раскрыт к большему.
// Наклон коромысла считается из чисел: угол = clamp((справа − слева) · 3°, ±12°) — пружинит к цели.
const TILT_PER = 3, TILT_MAX = 12;
function tiltFor(L, R) { return clamp((R - L) * TILT_PER, -TILT_MAX, TILT_MAX) * Math.PI / 180; }

// ---------- предметы (нарисованы кодом, объёмно, с бликом) ----------
const ITEM_SZ = { apple: 36, pear: 36, bun: 40, stone: 40, coin: 30, bag: 54, weight: 34, melon: 44, gem: 32 };
const ITEM_RU = {
  apple: n => plural(n, 'яблоко', 'яблока', 'яблок'), pear: n => plural(n, 'груша', 'груши', 'груш'), bun: n => plural(n, 'булочка', 'булочки', 'булочек'),
  stone: n => plural(n, 'камень', 'камня', 'камней'), coin: n => plural(n, 'монета', 'монеты', 'монет'), melon: n => plural(n, 'дыня', 'дыни', 'дынь'),
  gem: n => plural(n, 'кристалл', 'кристалла', 'кристаллов'), firefly: n => plural(n, 'светлячок', 'светлячка', 'светлячков'),
};
const ITEM_CACHE = new Map();
function itemCanvas(kind, s) {
  const key = kind + s; if (ITEM_CACHE.has(key)) return ITEM_CACHE.get(key);
  const PR = 2.5, W = Math.ceil(s * 1.4), H = Math.ceil(s * 1.5), cv = document.createElement('canvas'); cv.id = 'item_' + key;
  cv.width = W * PR; cv.height = H * PR; const c = cv.getContext('2d'); c.scale(PR, PR); c.translate(W / 2, H - 2);
  paintItem(c, kind, s);
  const o = { cv, W, H }; ITEM_CACHE.set(key, o); return o;
}
function sphere(c, x, y, r, c0, c1, c2) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2); c.fillStyle = g;
}
function paintItem(c, kind, s) {
  const r = s / 2; c.lineJoin = 'round'; c.lineCap = 'round';
  if (kind === 'apple') {
    sphere(c, 0, -r, r, '#ffb3a8', '#e8362b', '#8f1410'); c.strokeStyle = '#5c0e08'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(0, -s + 5); c.bezierCurveTo(r * 1.2, -s - 2, r * 1.15, -2, 0, -1); c.bezierCurveTo(-r * 1.15, -2, -r * 1.2, -s - 2, 0, -s + 5); c.fill(); c.stroke();
    c.strokeStyle = '#5b3313'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -s + 6); c.quadraticCurveTo(1, -s - 3, 4, -s - 6); c.stroke();
    c.fillStyle = '#5fbf3a'; c.strokeStyle = '#2b6a14'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(9, -s - 3, 8, 4, -0.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-r * 0.45, -r * 1.35, r * 0.2, r * 0.13, -0.6, 0, 7); c.fill();
  } else if (kind === 'pear') {
    sphere(c, 0, -r * 0.8, r, '#fbffb0', '#b8d83a', '#5f7f10'); c.strokeStyle = '#3f5408'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(0, -s - 2); c.bezierCurveTo(r * 0.55, -s - 2, r * 0.45, -r * 1.1, r * 0.95, -r * 0.6); c.bezierCurveTo(r * 1.25, -r * 0.1, r * 0.8, -1, 0, -1);
    c.bezierCurveTo(-r * 0.8, -1, -r * 1.25, -r * 0.1, -r * 0.95, -r * 0.6); c.bezierCurveTo(-r * 0.45, -r * 1.1, -r * 0.55, -s - 2, 0, -s - 2); c.fill(); c.stroke();
    c.strokeStyle = '#5b3313'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -s - 1); c.quadraticCurveTo(2, -s - 8, 5, -s - 10); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.95, r * 0.17, r * 0.28, -0.3, 0, 7); c.fill();
  } else if (kind === 'melon') {
    sphere(c, 0, -r, r, '#fff7c0', '#f2c94c', '#a8740c'); c.strokeStyle = '#6b4a08'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(0, -r, r * 1.1, r * 0.92, 0, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(120,80,10,0.45)'; c.lineWidth = 1.5; for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.ellipse(0, -r, r * 1.05 * Math.abs(k || 0.08), r * 0.88, 0, 0, 7); c.stroke(); }
  } else if (kind === 'stone') {
    sphere(c, 0, -r * 0.8, r * 1.1, '#e9eef2', '#9aa5ad', '#4c565d'); c.strokeStyle = '#2f363b'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-r, -2); c.quadraticCurveTo(-r * 1.1, -r * 1.2, -r * 0.3, -r * 1.55); c.quadraticCurveTo(r * 0.6, -r * 1.75, r * 0.95, -r * 0.9); c.quadraticCurveTo(r * 1.15, -1, r * 0.4, -1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 1.2, r * 0.28, r * 0.13, -0.4, 0, 7); c.fill();
  } else if (kind === 'coin') {
    c.fillStyle = '#8a5a00'; c.beginPath(); c.ellipse(0, -r * 0.62, r, r * 0.55, 0, 0, 7); c.fill();
    sphere(c, 0, -r * 0.8, r, '#fffbe0', '#ffd43b', '#c77d00'); c.strokeStyle = '#6b4300'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, -r * 0.8, r, r * 0.55, 0, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(140,90,0,0.6)'; c.beginPath(); c.ellipse(0, -r * 0.8, r * 0.62, r * 0.32, 0, 0, 7); c.stroke();
  } else if (kind === 'gem') {
    const g = c.createLinearGradient(-r, -s, r, 0); g.addColorStop(0, '#e6fcff'); g.addColorStop(0.5, '#66d9e8'); g.addColorStop(1, '#1971c2');
    c.fillStyle = g; c.strokeStyle = '#0b3d6b'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -1); c.lineTo(r, -s * 0.55); c.lineTo(r * 0.55, -s); c.lineTo(-r * 0.55, -s); c.lineTo(-r, -s * 0.55); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(-r, -s * 0.55); c.lineTo(r, -s * 0.55); c.moveTo(0, -1); c.lineTo(-r * 0.3, -s * 0.55); c.lineTo(0, -s); c.stroke();
  } else if (kind === 'weight') {
    // золотая гирька: колокол с ручкой-кольцом
    c.strokeStyle = '#6b4300'; c.lineWidth = 5; c.beginPath(); c.arc(0, -s * 0.86, r * 0.42, Math.PI, 0); c.stroke();
    c.strokeStyle = '#ffd43b'; c.lineWidth = 2.6; c.stroke();
    sphere(c, 0, -r * 0.8, r * 1.05, '#fffbe0', '#ffc21a', '#a86b00'); c.strokeStyle = '#6b4300'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-r * 0.55, -s * 0.8); c.lineTo(r * 0.55, -s * 0.8); c.quadraticCurveTo(r * 1.05, -r * 0.6, r, -1); c.lineTo(-r, -1); c.quadraticCurveTo(-r * 1.05, -r * 0.6, -r * 0.55, -s * 0.8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 1.05, r * 0.14, r * 0.3, 0.2, 0, 7); c.fill();
  } else if (kind === 'bag') {
    // мешочек «10»: ровно десять монет внутри — написано на боку
    sphere(c, 0, -r * 0.9, r * 1.1, '#f4dfb4', '#c99a5a', '#7a5428'); c.strokeStyle = '#4a2c12'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-r * 0.3, -s * 0.78); c.quadraticCurveTo(-r * 1.15, -r * 0.6, -r * 0.8, -1); c.lineTo(r * 0.8, -1); c.quadraticCurveTo(r * 1.15, -r * 0.6, r * 0.3, -s * 0.78); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c99a5a'; c.beginPath(); c.moveTo(-r * 0.3, -s * 0.78); c.lineTo(-r * 0.5, -s * 0.98); c.lineTo(r * 0.5, -s * 0.98); c.lineTo(r * 0.3, -s * 0.78); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#e03131'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-r * 0.36, -s * 0.8); c.lineTo(r * 0.36, -s * 0.8); c.stroke();
    c.fillStyle = '#ffd43b'; c.strokeStyle = '#6b4300'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -r * 0.62, r * 0.62, r * 0.42, 0, 0, 7); c.fill(); c.stroke();
    txt(c, '10', 0, -r * 0.6, { size: r * 0.62, fill: '#7a3e00', stroke: '#fff3c4', sw: 3 });
  }
}
function drawItem(c, kind, x, yb, s) {
  if (kind === 'bun') { const im = IMG.t_bun, w = s * 1.08, h = w * im.height / im.width; c.drawImage(im, x - w / 2, yb - h, w, h); return; }
  const o = itemCanvas(kind, s); c.drawImage(o.cv, x - o.W / 2, yb - o.H + 2, o.W, o.H);
}
function itemH(kind, s) { if (kind === 'bun') { const im = IMG.t_bun; return s * 1.08 * im.height / im.width; } return kind === 'pear' ? s + 8 : kind === 'apple' ? s + 6 : kind === 'coin' ? s * 0.72 : s; }

// ---------- весы ----------
// style: 'market' (деревянные с латунью), 'gold' (сокровищница), 'wall' (висят на кронштейне башни), 'great' (Великие весы)
class Scales extends Ent {
  constructor(x, yG, o = {}) {
    super(x, yG); this.z = -1.4;
    Object.assign(this, { arm: 150, post: 230, chain: 96, panW: 160, item: 'apple', style: 'market', perRow: 4, sz: 0, left: 0, right: 0, leftKind: null, rightKind: null, sign: null, signT: 0, mount: null }, o);
    if (!this.sz) this.sz = ITEM_SZ[this.item] || 36;
    this.ang = tiltFor(this.left, this.right); this.av = 0; this.labels = null; this.wob = 0;
  }
  setCounts(L, R) { this.left = L; this.right = R; }
  get target() { return tiltFor(this.left, this.right); }
  update(dt) {
    // пружина с затуханием: весы качнутся и успокоятся
    const k = 26, d = 6.5; this.av += ((this.target - this.ang) * k - this.av * d) * dt; this.ang += this.av * dt;
    if (this.sign) this.signT = Math.min(1, this.signT + dt * 2.5);
  }
  get settled() { return Math.abs(this.ang - this.target) < 0.004 && Math.abs(this.av) < 0.01; }
  pivot() { return { x: this.x, y: this.y - this.post }; }
  end(side) { const p = this.pivot(), d = side < 0 ? -1 : 1; return { x: p.x + d * this.arm * Math.cos(this.ang), y: p.y + d * this.arm * Math.sin(this.ang) }; }
  panPt(side) { const e = this.end(side); return { x: e.x, y: e.y + this.chain }; } // верх чаши (на неё кладут)
  slots(n, kind) {
    const s = this.sz, out = [], per = this.perRow, gap = s * 0.96, rowH = itemH(kind || this.item, s) * 0.86;
    for (let i = 0; i < n; i++) { const row = Math.floor(i / per), inRow = Math.min(per, n - row * per), j = i % per; out.push([(j - (inRow - 1) / 2) * gap, -row * rowH]); }
    return out;
  }
  kindOf(side) { return (side < 0 ? this.leftKind : this.rightKind) || this.item; }
  itemRects(side) {
    const n = side < 0 ? this.left : this.right, p = this.panPt(side), kind = this.kindOf(side), h = itemH(kind, this.sz), w = kind === 'bun' ? this.sz * 1.08 : this.sz;
    return this.slots(n, kind).map(([dx, dy]) => ({ x: p.x + dx - w / 2, y: p.y - 2 + dy - h, w, h }));
  }
  signRect() { const p = this.pivot(); return { x: p.x - 34, y: p.y + this.post * 0.42 - 34, w: 68, h: 68 }; }
  audit(add, out, L) {
    const p = this.pivot();
    if (this.style === 'wall') out.push({ kind: 'весы на кронштейне', x: Math.round(p.x), bottom: Math.round(p.y), surface: Math.round(p.y), onto: 'кронштейн в стене', diff: 0, ok: !!this.mount });
    else add('весы (основание)', this.x, this.y, { feet: 40 });
    for (const side of [-1, 1]) {
      const e = this.end(side), pp = this.panPt(side), rope = pp.y - e.y;
      out.push({ kind: 'чаша весов ' + (side < 0 ? 'слева' : 'справа'), x: Math.round(pp.x), bottom: Math.round(pp.y), surface: Math.round(e.y), onto: 'цепочки ' + Math.round(rope) + ' px от коромысла', diff: 0, ok: rope > 20 && Math.abs(pp.x - e.x) < 0.5 });
      const rs = this.itemRects(side), k = this.kindOf(side), slots = this.slots(rs.length, k);
      rs.forEach((r, i) => { const onPan = slots[i][1] === 0; out.push({ kind: 'предмет на чаше', x: Math.round(r.x), bottom: Math.round(r.y + r.h), surface: Math.round(onPan ? pp.y - 2 : r.y + r.h), onto: onPan ? 'чаша' : 'нижний ряд', diff: 0, ok: true }); });
    }
  }
  drawBase(c) {
    const p = this.pivot(), X = this.x, G0 = this.y, gold = this.style === 'gold' || this.style === 'great';
    if (this.style === 'wall') {
      // кронштейн из стены: изогнутая латунная рука держит ось
      const m = this.mount; c.strokeStyle = '#3e2a10'; c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(m.x, m.y); c.quadraticCurveTo(m.x + (p.x - m.x) * 0.2, p.y - 70, p.x, p.y - 30); c.lineTo(p.x, p.y); c.stroke();
      c.strokeStyle = '#d9a43a'; c.lineWidth = 9; c.stroke();
      c.fillStyle = '#5b3a10'; c.beginPath(); c.arc(m.x, m.y, 16, 0, 7); c.fill(); c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(m.x, m.y, 9, 0, 7); c.fill();
      return;
    }
    c.fillStyle = 'rgba(30,20,10,0.3)'; c.beginPath(); c.ellipse(X + 4, G0 + 1, 74, 10, 0, 0, 7); c.fill();
    const wood = (x0, x1) => { const g = c.createLinearGradient(x0, 0, x1, 0); if (gold) { g.addColorStop(0, '#8a5a00'); g.addColorStop(0.35, '#ffe58a'); g.addColorStop(0.6, '#e0a82e'); g.addColorStop(1, '#7a4a00'); } else { g.addColorStop(0, '#6b3f18'); g.addColorStop(0.3, '#d7965a'); g.addColorStop(0.6, '#b07335'); g.addColorStop(1, '#5a3412'); } return g; };
    // ступенчатое основание
    c.strokeStyle = gold ? '#5e3c00' : '#3e2410'; c.lineWidth = 3.5;
    c.fillStyle = wood(X - 70, X + 70); rr(c, X - 70, G0 - 22, 140, 22, 8); c.fill(); c.stroke();
    c.fillStyle = wood(X - 46, X + 46); rr(c, X - 46, G0 - 40, 92, 20, 8); c.fill(); c.stroke();
    // стойка
    const pw = this.style === 'great' ? 34 : 24;
    c.fillStyle = wood(X - pw / 2, X + pw / 2); rr(c, X - pw / 2, p.y + 4, pw, G0 - 40 - p.y, 8); c.fill(); c.stroke();
    if (!gold) { c.strokeStyle = '#e9c98f'; c.lineWidth = 3; for (const yy of [p.y + 40, p.y + 50, G0 - 70, G0 - 60]) { c.beginPath(); c.moveTo(X - pw / 2 + 1, yy); c.lineTo(X + pw / 2 - 1, yy - 5); c.stroke(); } }
  }
  drawPan(c, side) {
    const e = this.end(side), pp = this.panPt(side), W = this.panW, gold = this.style !== 'market';
    // три цепочки к краям и середине чаши
    for (const ox of [-W * 0.42, W * 0.42]) chainLinks(c, e.x, e.y + 4, pp.x + ox, pp.y - 4);
    // чаша: латунная полусфера
    const g = c.createLinearGradient(pp.x - W / 2, 0, pp.x + W / 2, 0);
    g.addColorStop(0, '#8a5a00'); g.addColorStop(0.3, gold ? '#fff3b0' : '#ffe08a'); g.addColorStop(0.55, '#e8a920'); g.addColorStop(1, '#7a4a00');
    c.fillStyle = g; c.strokeStyle = '#5e3c00'; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(pp.x - W / 2, pp.y - 2); c.quadraticCurveTo(pp.x - W * 0.42, pp.y + 34, pp.x, pp.y + 36); c.quadraticCurveTo(pp.x + W * 0.42, pp.y + 34, pp.x + W / 2, pp.y - 2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c98a1a'; c.beginPath(); c.ellipse(pp.x, pp.y - 2, W / 2, 7, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; rr(c, pp.x - W * 0.36, pp.y + 6, W * 0.22, 5, 2.5); c.fill();
  }
  drawItems(c, side) {
    const pp = this.panPt(side), kind = this.kindOf(side), n = side < 0 ? this.left : this.right;
    const sl = this.slots(n, kind);
    for (let i = sl.length - 1; i >= 0; i--) { const [dx, dy] = sl[i]; drawItem(c, kind, pp.x + dx, pp.y - 2 + dy, this.sz); }
    if (this.labels) sl.forEach(([dx, dy], i) => {
      if ((this.labels.side !== side) || i >= this.labels.n) return;
      const h = itemH(kind, this.sz); c.save(); c.translate(pp.x + dx, pp.y - 2 + dy - h / 2); c.fillStyle = side < 0 ? '#ffd43b' : '#a5d8ff'; c.strokeStyle = '#7a3e00'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(0, 0, 12, 0, 7); c.fill(); c.stroke(); txt(c, String(i + 1), 0, 1, { size: 17, fill: '#3b2412' }); c.restore();
    });
  }
  drawBeam(c) {
    const p = this.pivot(), a = this.ang, len = this.arm * 2 + 28, th = this.style === 'great' ? 22 : 16;
    c.save(); c.translate(p.x, p.y); c.rotate(a);
    const g = c.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, '#fff0a8'); g.addColorStop(0.45, '#e0a82e'); g.addColorStop(1, '#7a4a00');
    c.fillStyle = g; c.strokeStyle = '#5e3c00'; c.lineWidth = 3.5; rr(c, -len / 2, -th / 2, len, th, th / 2); c.fill(); c.stroke();
    for (const ex of [-this.arm, this.arm]) { c.fillStyle = '#5e3c00'; c.beginPath(); c.arc(ex, 0, 6, 0, 7); c.fill(); c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(ex, 0, 3.5, 0, 7); c.fill(); }
    // стрелка-указатель вверх (стоит ровно — весы в равновесии)
    c.fillStyle = '#c92a2a'; c.strokeStyle = '#5e1010'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -th / 2); c.lineTo(0, -th / 2 - 34); c.lineTo(5, -th / 2); c.closePath(); c.fill(); c.stroke();
    c.restore();
    // ось
    const bg = c.createRadialGradient(p.x - 4, p.y - 4, 1, p.x, p.y, 13); bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.5, '#ffd43b'); bg.addColorStop(1, '#a86b00');
    c.fillStyle = bg; c.strokeStyle = '#5e3c00'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 12, 0, 7); c.fill(); c.stroke();
  }
  drawSign(c) {
    if (!this.sign || this.style === 'wall') return;
    const r = this.signRect(), k = easeOutBack(this.signT), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    c.save(); c.translate(cx, cy); c.scale(k, k);
    glow(c, 0, 0, 60, 'rgba(255,230,120,0.7)', 0.8);
    c.fillStyle = '#5b3313'; c.beginPath(); c.arc(0, 0, 33, 0, 7); c.fill();
    const g = c.createRadialGradient(-10, -12, 3, 0, 0, 30); g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#ffc21a'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 28, 0, 7); c.fill();
    drawSignGlyph(c, this.sign, 0, 0, 13, '#fff', '#b8460b');
    c.restore();
  }
  draw(c) {
    this.drawBase(c);
    for (const s of [-1, 1]) { const e = this.end(s), pp = this.panPt(s); }
    this.drawBeam(c);
    for (const s of [-1, 1]) { this.drawPan(c, s); this.drawItems(c, s); }
    this.drawSign(c);
  }
}
// летящий предмет (на чашу / с чаши) — дуга
class FlyItem extends Ent {
  constructor(kind, sz, x0, y0, x1, y1, dur, onEnd, arc = 120) { super(x0, y0); Object.assign(this, { kind, sz, x0, y0, x1, y1, dur, onEnd, arc }); this.t = 0; this.z = 4; }
  update(dt) { this.t += dt; if (this.t >= this.dur) { this.dead = true; this.onEnd && this.onEnd(); } }
  pos() { const k = Math.min(1, this.t / this.dur), x1 = typeof this.x1 === 'function' ? this.x1() : this.x1, y1 = typeof this.y1 === 'function' ? this.y1() : this.y1; return { x: lerp(this.x0, x1, k), y: lerp(this.y0, y1, k) - Math.sin(k * Math.PI) * this.arc }; }
  draw(c) { const p = this.pos(); drawItem(c, this.kind, p.x, p.y, this.sz); }
}
// золотая гирька (награда уровня): лежит на постаменте или у Щёлка
class WeightPickup extends Ent {
  constructor(x, y) { super(x, y); this.z = 1; this.got = false; this.t = 0; this.vis = true; }
  update(dt) { this.t += dt; }
  draw(c) {
    if (this.got || !this.vis) return;
    const b = Math.sin(this.t * 3) * 4;
    glow(c, this.x, this.y - 30 + b, 70, 'rgba(255,214,90,0.8)', 0.9);
    drawItem(c, 'weight', this.x, this.y - 6 + b, 46);
    if (Math.floor(this.t * 6) % 5 === 0) sparkBurst(this.x + frand(-20, 20), this.y - 30 + b + frand(-14, 14), 1, '#fff6b0', 40);
  }
}
// HUD: пять золотых гирек (сколько вернули)
function drawWeightIcon(c, x, y, on, s = 30) {
  c.save();
  if (on) { glow(c, x, y - s * 0.5, s * 1.1, 'rgba(255,214,90,0.85)', 0.9); drawItem(c, 'weight', x, y, s); }
  else { c.globalAlpha = 0.85; const o = itemCanvas('weight', s); c.drawImage(filteredImg(o.cv, 'grayscale(1) brightness(0.55)'), x - o.W / 2, y - o.H + 2, o.W, o.H); }
  c.restore();
}
// предмет, который Искра собирает (лежит на прилавке-противне или на ящике)
class Pickup extends Ent {
  constructor(kind, x, y, sz = 0) { super(x, y); this.kind = kind; this.sz = sz || ITEM_SZ[kind] || 36; this.taken = false; this.ph = frand(0, 6); this.z = -1; }
  rect() { const h = itemH(this.kind, this.sz); return { x: this.x - this.sz / 2, y: this.y - h, w: this.sz, h }; }
  draw(c) {
    if (this.taken) return;
    const sq = 1 + Math.sin(G.t * 2.4 + this.ph) * 0.025, h = itemH(this.kind, this.sz);
    glow(c, this.x, this.y - h * 0.5, 30, 'rgba(255,230,150,0.4)', 0.6);
    c.fillStyle = 'rgba(60,30,10,0.3)'; c.beginPath(); c.ellipse(this.x, this.y - 1, this.sz * 0.4, 4, 0, 0, 7); c.fill();
    c.save(); c.translate(this.x, this.y); c.scale(1 / sq, sq); drawItem(c, this.kind, 0, 0, this.sz); c.restore();
  }
}
