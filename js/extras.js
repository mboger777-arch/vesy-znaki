'use strict';
// ===== Новое: светлячки, плот, подъёмник, стог-батут, золотой фонарь, лужа, ветерок, передний план, оживление героев =====

// ---------- оживление спрайтов по частям (фонарь деда, хвост и лапа Бублика) ----------
// многоугольники — в пикселях исходной картинки; вращаем вокруг «шарнира» (кулак деда, основание хвоста, запястье)
const RIGS = {
  ded: { lantern: { poly: [[0, 60], [58, 60], [68, 80], [80, 88], [83, 175], [81, 214], [0, 214]], px: 50, py: 52 } },
  bublik: {
    tail: { poly: [[249, 316], [338, 316], [338, 404], [249, 404]], px: 251, py: 362 },
    paw: { poly: [[0, 94], [79, 94], [79, 174], [0, 174]], px: 54, py: 174 },
  },
};
function npcParts(n) {
  const tail = Math.sin(G.t * 5.5 + n.ph) * 0.1 * (n.mood > 0 ? 1.8 : 1);
  const paw = n.wave > 0 ? Math.sin((1.4 - n.wave) * 11) * 0.24 * Math.min(1, n.wave * 3) : 0;
  return [Object.assign({ a: tail }, RIGS.bublik.tail), Object.assign({ a: paw }, RIGS.bublik.paw)];
}
function polyPath(c, poly, grow = 0) {
  let cx = 0, cy = 0; for (const [x, y] of poly) { cx += x; cy += y; } cx /= poly.length; cy /= poly.length;
  poly.forEach(([x, y], i) => { const d = Math.hypot(x - cx, y - cy) || 1, X = x + (x - cx) / d * grow, Y = y + (y - cy) / d * grow; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
  c.closePath();
}
function drawRig(c, im, x, yb, h, flip, sx, sy, parts) {
  const s = h / im.height, w = im.width * s;
  c.save(); c.translate(x, yb); c.scale((flip ? -1 : 1) * sx, sy); c.translate(-w / 2, -h); c.scale(s, s);
  if (!parts || parts.every(p => Math.abs(p.a) < 0.003)) { c.drawImage(im, 0, 0); c.restore(); return; }
  c.save(); c.beginPath(); c.rect(0, 0, im.width, im.height); for (const p of parts) polyPath(c, p.poly); c.clip('evenodd'); c.drawImage(im, 0, 0); c.restore();
  for (const p of parts) {
    c.save(); c.translate(p.px, p.py); c.rotate(p.a); c.translate(-p.px, -p.py);
    c.beginPath(); polyPath(c, p.poly, 1.5); c.clip(); c.drawImage(im, 0, 0); c.restore();
  }
  c.restore();
}

// ---------- прогресс: звёзды, секреты, светлячки ----------
function loadJ(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) && v.length === d.length ? v : d.slice(); } catch (_) { return d.slice(); } }
function saveJ(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } }
const Prog = {
  stars() { return loadJ('vz_plat_stars', [0, 0, 0, 0, 0]); },
  secrets() { return loadJ('vz_plat_secret', [0, 0, 0, 0, 0]); },
  ff() { return loadJ('vz_plat_ff', [0, 0, 0, 0, 0]); },
  ffMax() { return loadJ('vz_plat_ffmax', [0, 0, 0, 0, 0]); },
  record(n, stars, secret, ff, ffMax) {
    const s = this.stars(); s[n] = Math.max(s[n] || 0, stars); saveJ('vz_plat_stars', s);
    const q = this.secrets(); q[n] = q[n] || (secret ? 1 : 0); saveJ('vz_plat_secret', q);
    const f = this.ff(); f[n] = Math.max(f[n] || 0, ff); saveJ('vz_plat_ff', f);
    const m = this.ffMax(); m[n] = ffMax; saveJ('vz_plat_ffmax', m);
  },
  secretNow(n) { const q = this.secrets(); q[n] = 1; saveJ('vz_plat_secret', q); },
  reset() { for (const k of ['vz_plat_stars', 'vz_plat_secret', 'vz_plat_ff', 'vz_plat_ffmax', 'vz_plat_seen']) try { localStorage.removeItem(k); } catch (_) { } },
};
// старые сохранения (4 уровня): «Десяток булочек» вставлен четвёртым — сдвигаем звёзды башни на 5-е место, ничего не теряем
(function migrateProg() {
  try {
    let moved = false;
    for (const k of ['vz_plat_stars', 'vz_plat_secret', 'vz_plat_ff', 'vz_plat_ffmax']) {
      const v = JSON.parse(localStorage.getItem(k));
      if (Array.isArray(v) && v.length === 4) { v.splice(3, 0, 0); localStorage.setItem(k, JSON.stringify(v)); moved = true; }
    }
    const p = +localStorage.getItem('vz_plat_progress');
    if (moved && p >= 5) localStorage.setItem('vz_plat_progress', '6'); // всё было пройдено — открыто всё
  } catch (_) { }
})();

// ---------- светлячок-собиралка ----------
function drawFireflyBug(c, x, y, s = 1, t = G.t, ph = 0, glowA = 1) {
  const fl = 0.75 + 0.25 * Math.sin(t * 4 + ph);
  glow(c, x, y + 3 * s, (28 * fl + 6) * s, 'rgba(210,255,120,0.85)', 0.85 * glowA);
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.sin(t * 1.6 + ph) * 0.2);
  const flap = Math.abs(Math.sin(t * 34 + ph));
  c.fillStyle = 'rgba(235,245,255,0.8)'; c.strokeStyle = 'rgba(70,90,130,0.55)'; c.lineWidth = 1.2;
  for (const [wx, ang] of [[-2, -0.5], [3, -1.0]]) { c.save(); c.translate(wx, -4); c.rotate(ang); c.beginPath(); c.ellipse(0, -6 * flap, 4.2, 7.5 * flap + 1.5, 0, 0, 7); c.fill(); c.stroke(); c.restore(); }
  // брюшко светится
  const g = c.createRadialGradient(-4, 3, 1, -4, 3, 7); g.addColorStop(0, '#ffffe8'); g.addColorStop(0.5, '#eaff7a'); g.addColorStop(1, '#8fd336');
  c.fillStyle = g; c.beginPath(); c.ellipse(-4, 3, 6.5, 5, -0.3, 0, 7); c.fill();
  c.fillStyle = '#3b2a40'; c.beginPath(); c.ellipse(2.5, -0.5, 4.2, 3.6, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(6.2, -1.5, 3, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(7.2, -2.4, 1.1, 0, 7); c.fill();
  c.strokeStyle = '#3b2a40'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(7, -4); c.quadraticCurveTo(9, -9, 12, -10); c.moveTo(6, -4); c.quadraticCurveTo(6, -10, 8, -12); c.stroke();
  c.restore();
}
class Firefly extends Ent {
  constructor(x, y, i) { super(x, y); this.hx = x; this.hy = y; this.z = 0.5; this.ph = i * 1.7; this.idx = i; this.trail = []; this.trT = 0; }
  pos(t = G.t) { return { x: this.hx + Math.sin(t * 1.6 + this.ph) * 7, y: this.hy + Math.sin(t * 2.3 + this.ph * 1.3) * 5 }; }
  update(dt) { this.trT -= dt; if (this.trT <= 0) { this.trT = 0.06; this.trail.unshift(this.pos()); if (this.trail.length > 6) this.trail.pop(); } }
  rect() { const p = this.pos(); return { x: p.x - 15, y: p.y - 15, w: 30, h: 30 }; }
  draw(c) {
    // светящийся след-дуга
    c.save(); c.globalCompositeOperation = 'lighter';
    this.trail.forEach((q, i) => { c.globalAlpha = (1 - i / 6) * 0.45; c.fillStyle = '#e8ff9a'; c.beginPath(); c.arc(q.x - 4, q.y + 3, 2.6 - i * 0.3, 0, 7); c.fill(); });
    c.restore();
    const p = this.pos(); drawFireflyBug(c, p.x, p.y, 1, G.t, this.ph);
  }
}
// светлячки по дуге прыжка: от (x0,y0) до (x1,y1), вершина на h выше; y — уровень «груди» Искры
function ffArc(S, x0, y0, x1, y1, h, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), x = lerp(x0, x1, t), y = lerp(y0, y1, t) - 4 * h * t * (1 - t);
    S.fflies.push(S.L.add(new Firefly(x, y, S.fflies.length)));
  }
}
function ffAt(S, pts) { for (const [x, y] of pts) S.fflies.push(S.L.add(new Firefly(x, y, S.fflies.length))); }
PDRAW.ffhud = (c, p, k) => {
  const e = easeOut(k), x = lerp(p.x0, p.x1, e), y = lerp(p.y0, p.y1, e) - Math.sin(k * Math.PI) * 90;
  glow(c, x, y, 26, 'rgba(220,255,140,0.95)', 1 - k * 0.3); c.save(); c.globalAlpha = 1; c.fillStyle = '#fbffd6'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.restore();
};

// ---------- плот на реке (держится на воде) ----------
class Raft extends Ent {
  constructor(xa, xb, L) {
    super(xa, L.pxH - 46); this.xa = xa; this.xb = xb; this.w = 132; this.side = 0; this.state = 'wait'; this.t = 0; this.idle = 0; this.rideT = 0;
    this.dx = 0; this.dy = 0; this.bobY = 0; this.dip = 0; this.dipV = 0; this.z = -0.5; this.water = L.pxH - 46; this.lapT = 1; this.wake = 0;
  }
  topY() { return this.water - 12 + this.bobY; }
  logCenterY() { return this.topY() + 13; }
  move(dt, S) {
    const p = S.p, rider = p.ride === this && p.onGround && !p.hidden;
    const ox = this.x, oy = this.topY();
    // пружинистая осадка: плот проседает, когда на него прыгают, и покачивается на волне
    this.dipV += (-this.dip * 60 - this.dipV * 7) * dt; this.dip += this.dipV * dt;
    this.bobY = Math.sin(G.t * 2.1) * 1.5 + this.dip + (rider ? 2.5 : 0);
    this.rideT = rider ? this.rideT + dt : 0;
    if (this.state === 'wait') {
      this.t += dt; this.idle = rider ? 0 : this.idle + dt;
      const farSide = this.side === 0 ? p.x > this.xb + 90 : p.x < this.xa - 90;
      if (!rider) this.needOff = false;   // доплыли — ждём, пока Искра сойдёт или снова прыгнет на плот
      if ((rider && this.rideT > 0.4 && !this.needOff) || (!rider && this.idle > 2.5 && farSide)) { this.state = 'go'; this.t = 0; Sound.raftLap(); }
    } else {
      const tgt = this.side === 0 ? this.xb : this.xa, d = tgt - this.x;
      const v = Math.min(66, Math.abs(d) * 1.6 + 14, (this.t += dt) * 90);
      if (Math.abs(d) <= v * dt) { this.x = tgt; this.state = 'wait'; this.side = 1 - this.side; this.t = 0; this.idle = 0; this.dipV += 12; this.needOff = rider; Sound.raftLand(); }
      else this.x += Math.sign(d) * v * dt;
      this.wake = Math.sign(d);
      this.lapT -= dt; if (this.lapT <= 0) { this.lapT = 1.1; if (Math.abs(p.x - this.x) < 700) Sound.raftLap(); }
      if (!this.dry && fx() < dt * 10) spawn({ type: 'drop', x: this.x - this.wake * (this.w / 2 + 4), y: this.water + 2, vx: -this.wake * frand(20, 60), vy: frand(-80, -30), g: 500, life: 0.5, size: frand(2.5, 4) });
    }
    if (rider && this.state === 'go') p.x = clamp(p.x + 0, this.x - this.w / 2 + 14, this.x + this.w / 2 - 14);
    this.dx = this.x - ox; this.dy = this.topY() - oy;
  }
  onLand(p, soft) { this.dipV += soft ? 20 : 55; if (!soft && !this.dry) { Sound.raftLand(); for (let i = 0; i < 8; i++) spawn({ type: 'drop', x: this.x + frand(-60, 60), y: this.water, vx: frand(-120, 120), vy: frand(-260, -120), g: 1200, life: 0.6, size: frand(3, 5) }); } }
  rect() { return { x: this.x - this.w / 2 - 6, y: this.topY() - 6, w: this.w + 12, h: 40 }; }
  draw(c) {
    const X = this.x, top = this.topY(), W = this.w, wy = this.water;
    c.save();
    // волны и пена у бортов
    c.fillStyle = 'rgba(255,255,255,0.55)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(X + sd * (W / 2 + 2), wy + 3, 14 + Math.sin(G.t * 4 + sd) * 3, 4, 0, 0, 7); c.fill(); }
    // брёвна (торцами к нам), связанные верёвкой
    const n = 5, r = 13.5;
    for (let i = 0; i < n; i++) {
      const lx = X - W / 2 + r + i * ((W - 2 * r) / (n - 1)), ly = top + r - 0.5;
      c.fillStyle = '#5b3313'; c.beginPath(); c.arc(lx, ly, r + 1.5, 0, 7); c.fill();
      const g = c.createRadialGradient(lx - 3, ly - 3, 1, lx, ly, r); g.addColorStop(0, '#f2c68e'); g.addColorStop(0.6, '#cf9455'); g.addColorStop(1, '#8a5524');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, r, 0, 7); c.fill();
      c.strokeStyle = 'rgba(110,60,20,0.55)'; c.lineWidth = 1.4; for (const rr0 of [4, 8]) { c.beginPath(); c.arc(lx, ly, rr0, 0, 7); c.stroke(); }
    }
    // настил сверху
    const dg = c.createLinearGradient(0, top - 4, 0, top + 6); dg.addColorStop(0, '#ffd59a'); dg.addColorStop(1, '#b8743a');
    c.fillStyle = dg; c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5; rr(c, X - W / 2 - 2, top - 4, W + 4, 9, 4); c.fill(); c.stroke();
    c.strokeStyle = '#e9c98f'; c.lineWidth = 3; for (const sx of [X - W / 2 + 22, X + W / 2 - 22]) { c.beginPath(); c.moveTo(sx - 5, top - 4); c.lineTo(sx + 5, top + 26); c.stroke(); }
    // флажок на шесте
    const mx = X + W / 2 - 16;
    c.strokeStyle = '#6b3f18'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx, top - 2); c.lineTo(mx, top - 58); c.stroke();
    const wv = Math.sin(G.t * 5) * 4;
    c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(mx, top - 58); c.quadraticCurveTo(mx - 16, top - 52 + wv, mx - 30, top - 48 + wv); c.lineTo(mx, top - 40); c.closePath(); c.fill();
    // вода закрывает низ брёвен — плот действительно плывёт
    const wg = c.createLinearGradient(0, wy, 0, wy + 30); wg.addColorStop(0, 'rgba(120,110,255,0.55)'); wg.addColorStop(1, 'rgba(60,44,150,0.75)');
    c.fillStyle = wg; c.fillRect(X - W / 2 - 6, wy + 1, W + 12, top + 30 - wy);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; c.beginPath();
    for (let x = X - W / 2 - 6; x <= X + W / 2 + 6; x += 6) { const yy = wy + 3 + Math.sin(x * 0.07 + G.t * 3) * 1.6; if (x === X - W / 2 - 6) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
    c.restore();
  }
}

// ---------- подъёмник: корзина на верёвках, блок на кронштейне маяка ----------
class Lift extends Ent {
  constructor(x, yTop, yBot, pulleyY, S) {
    super(x, yTop); this.w = 128; this.yTop = yTop; this.yBot = yBot; this.yy = yTop; this.pulleyY = pulleyY; this.state = 'lower'; this.S = S;
    this.dx = 0; this.dy = 0; this.t = 0; this.tick = 0; this.idle = 0; this.z = -0.4; this.ang = 0; this.appear = 0; this.rideT = 0;
  }
  topY() { return this.yy; }
  ringY() { return this.yy - 78; }
  move(dt, S) {
    const p = S.p, rider = p.ride === this && p.onGround && !p.hidden, oy = this.yy;
    this.appear = Math.min(1, this.appear + dt * 2);
    this.rideT = rider ? this.rideT + dt : 0;
    const goTo = (y, sp) => { const d = y - this.yy, v = Math.min(sp, Math.abs(d) * 2.2 + 18, (this.t += dt) * 160); if (Math.abs(d) <= v * dt) { this.yy = y; return true; } this.yy += Math.sign(d) * v * dt; return false; };
    if (this.state === 'lower') { if (goTo(this.yBot, 170)) { this.state = 'waitB'; this.t = 0; Sound.bump(); } }
    else if (this.state === 'waitB') { if (rider && this.rideT > 0.4) { this.state = 'up'; this.t = 0; Sound.liftCreak(); } }
    else if (this.state === 'up') { if (goTo(this.yTop, 118)) { this.state = 'waitT'; this.t = 0; this.idle = 0; Sound.bump(); dust(this.x, this.yy, 4); } }
    else if (this.state === 'waitT') { this.idle = rider ? 0 : this.idle + dt; if (this.idle > 2.2 && p.y > this.yTop + 40) { this.state = 'down'; this.t = 0; Sound.liftCreak(); } }
    else if (this.state === 'down') { if (goTo(this.yBot, 150)) { this.state = 'waitB'; this.t = 0; Sound.bump(); } }
    const moving = this.yy !== oy;
    if (moving) { this.tick -= dt; if (this.tick <= 0) { this.tick = 0.1; if (Math.abs(p.y - this.yy) < 700) Sound.liftTick(); } }
    this.ang += (this.yy - oy) / 16;
    // пока едем, Искра стоит внутри корзины (не задевает уступы)
    if (rider && moving) p.x = clamp(p.x, this.x - this.w / 2 + 22, this.x + this.w / 2 - 22);
    this.dx = 0; this.dy = this.yy - oy;
  }
  rects() {
    return [{ id: 'подъёмник', x: this.x - this.w / 2 - 4, y: this.yy - 36, w: this.w + 8, h: 66 }, { id: 'блок подъёмника', x: this.x - 26, y: this.pulleyY - 34, w: 52, h: 54 },
      { id: 'верёвка подъёмника', x: this.x - 4, y: this.pulleyY + 14, w: 8, h: Math.max(0, this.ringY() - this.pulleyY - 14) }];
  }
  draw(c) {
    const X = this.x, Y = this.yy, py = this.pulleyY;
    c.save(); c.globalAlpha = this.appear;
    // кронштейн: железная пластина на болтах в стене маяка + кованый крюк
    c.fillStyle = '#3c3a40'; c.strokeStyle = '#1e1c22'; c.lineWidth = 2.5; rr(c, X - 30, py - 34, 60, 16, 5); c.fill(); c.stroke();
    c.fillStyle = '#a9a3b5'; for (const bx of [X - 21, X + 21]) { c.beginPath(); c.arc(bx, py - 26, 3.2, 0, 7); c.fill(); }
    c.strokeStyle = '#2b2930'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(X, py - 20); c.lineTo(X, py - 2); c.stroke();
    // колесо блока
    c.save(); c.translate(X, py + 2); c.rotate(this.ang);
    c.fillStyle = '#7a4a1e'; c.strokeStyle = '#3e2410'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = '#c98a4b'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.stroke(); }
    c.fillStyle = '#2b2930'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.restore();
    // верёвка от блока к кольцу, от кольца — четыре стропы к краям корзины
    const ry = this.ringY();
    c.lineCap = 'round';
    for (const [w, col] of [[5, '#6b4a24'], [2.5, '#e3c48a']]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(X + 17, py + 2); c.lineTo(X + 2, ry); c.moveTo(X - 17, py + 2); c.lineTo(X - 30, py + 40); c.stroke();
      c.beginPath(); c.moveTo(X, ry); c.lineTo(X - this.w / 2 + 8, Y - 30); c.moveTo(X, ry); c.lineTo(X + this.w / 2 - 8, Y - 30); c.moveTo(X, ry); c.lineTo(X - 22, Y - 30); c.moveTo(X, ry); c.lineTo(X + 22, Y - 30); c.stroke();
    }
    // противовес на втором конце верёвки
    c.fillStyle = '#5c5446'; c.strokeStyle = '#2f2a22'; c.lineWidth = 2.5; rr(c, X - 40, py + 40, 20, 26, 5); c.fill(); c.stroke();
    c.strokeStyle = '#b8a78a'; c.lineWidth = 4; c.beginPath(); c.arc(X, ry, 6, 0, 7); c.stroke();
    // задняя стенка корзины
    this.drawBasket(c, false);
    c.restore();
  }
  drawBasket(c, front) {
    const X = this.x, Y = this.yy, W = this.w;
    c.save(); c.globalAlpha *= this.appear;
    if (!front) {
      const g = c.createLinearGradient(0, Y - 30, 0, Y + 24); g.addColorStop(0, '#c98a4b'); g.addColorStop(1, '#7a4a1e');
      c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, X - W / 2, Y - 30, W, 54, [6, 6, 16, 16]); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(70,40,15,0.45)'; c.lineWidth = 2;
      for (let yy = Y - 22; yy < Y + 20; yy += 9) { c.beginPath(); for (let x = X - W / 2 + 4; x < X + W / 2 - 4; x += 12) { c.moveTo(x, yy); c.quadraticCurveTo(x + 6, yy + 5, x + 12, yy); } c.stroke(); }
      // пол корзины
      c.fillStyle = '#e3a45f'; c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5; rr(c, X - W / 2 + 3, Y - 3, W - 6, 7, 3); c.fill(); c.stroke();
    } else {
      // передний бортик (низкий: ноги Искры почти целиком видны)
      const g = c.createLinearGradient(0, Y - 14, 0, Y + 24); g.addColorStop(0, '#e2a565'); g.addColorStop(1, '#8e5424');
      c.fillStyle = g; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, X - W / 2, Y - 12, W, 36, [8, 8, 16, 16]); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(70,40,15,0.5)'; c.lineWidth = 2;
      for (let yy = Y - 4; yy < Y + 20; yy += 8) { c.beginPath(); for (let x = X - W / 2 + 4; x < X + W / 2 - 4; x += 12) { c.moveTo(x, yy); c.quadraticCurveTo(x + 6, yy + 4, x + 12, yy); } c.stroke(); }
      c.fillStyle = '#f6c584'; c.strokeStyle = '#4e2c10'; c.lineWidth = 2.5; rr(c, X - W / 2 - 3, Y - 15, W + 6, 8, 4); c.fill(); c.stroke();
    }
    c.restore();
  }
}
class LiftFront extends Ent { constructor(lift) { super(lift.x, lift.yy); this.lift = lift; this.z = 1.2; } update() { this.y = this.lift.yy; } draw(c) { this.lift.drawBasket(c, true); } }

// ---------- стог сена / пружинящий каравай ----------
class Bouncer extends Ent {
  constructor(x, y, kind = 'hay') { super(x, y); this.kind = kind; this.w = kind === 'loaf' ? 112 : kind === 'sack' ? 116 : 128; this.h = kind === 'loaf' ? 50 : kind === 'sack' ? 58 : 62; this.sq = 0; this.z = -0.3; this.n = 0; }
  topY() { return this.y - this.h + 10; }
  check(S, prevY, dt) {
    const p = S.p, top = this.topY();
    if (p.hidden || p.vy <= 0 || Math.abs(p.x - this.x) > this.w / 2 + 4) return false; // ловит прыжок с запасом: ребёнку легко попасть
    if (p.y >= top && prevY <= top + 8) {
      p.y = top; p.vy = -1450; p.boost = true; p.jumping = false; p.onGround = false; p.ride = null; p.sy = 1.32; p.sx = 0.74; p.buf = 0; p.coyote = 0;
      this.sq = 1; this.n++; Sound.boing(); G.shake = Math.max(G.shake, 0.06);
      for (let i = 0; i < 12; i++) spawn({ type: this.kind === 'loaf' ? 'crumb' : this.kind === 'sack' ? 'flour' : 'straw', x: this.x + frand(-40, 40), y: top + frand(0, 14), vx: frand(-180, 180), vy: frand(-380, -140), g: 900, life: frand(0.6, 1), size: frand(6, 11), rot: frand(0, 6), vr: frand(-9, 9) });
      return true;
    }
    return false;
  }
  update(dt) { this.sq = Math.max(0, this.sq - dt * 2.2); }
  rect() { return { x: this.x - this.w / 2, y: this.y - this.h - 6, w: this.w, h: this.h + 6 }; }
  draw(c) {
    const k = this.sq, s = 1 - Math.sin(k * Math.PI * 3) * 0.22 * k;
    const X = this.x, Y = this.y, W = this.w, H = this.h;
    c.fillStyle = 'rgba(30,20,10,0.28)'; c.beginPath(); c.ellipse(X + 4, Y + 1, W * 0.56, 8, 0, 0, 7); c.fill();
    c.save(); c.translate(X, Y); c.scale(1 / Math.sqrt(s), s);
    if (this.kind === 'sack') {
      // пузатый мешок с мукой: пружинит, а мука облачком
      const g = c.createLinearGradient(-W / 2, 0, W / 2, 0); g.addColorStop(0, '#c9b38a'); g.addColorStop(0.45, '#f7ecd2'); g.addColorStop(1, '#a98f62');
      c.fillStyle = g; c.strokeStyle = '#6b5530'; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(-W / 2, 0); c.bezierCurveTo(-W / 2 - 6, -H * 0.8, -W * 0.3, -H - 4, 0, -H - 2); c.bezierCurveTo(W * 0.3, -H - 4, W / 2 + 6, -H * 0.8, W / 2, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(107,85,48,0.45)'; c.lineWidth = 2; for (const ox of [-30, 0, 30]) { c.beginPath(); c.moveTo(ox - 6, -H * 0.85); c.quadraticCurveTo(ox + 4, -H * 0.5, ox - 2, -6); c.stroke(); }
      txt(c, 'МУКА', 0, -H * 0.45, { size: 20, fill: '#7a5a2a' });
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(-8, -H + 4, 26, 6, 0, 0, 7); c.fill();
    } else if (this.kind === 'loaf') {
      // доска и пышный каравай
      c.fillStyle = '#8e5424'; c.strokeStyle = '#4e2c10'; c.lineWidth = 3; rr(c, -W / 2 - 8, -10, W + 16, 12, 5); c.fill(); c.stroke();
      const g = c.createLinearGradient(0, -H, 0, -8); g.addColorStop(0, '#fcd38d'); g.addColorStop(0.55, '#e39a48'); g.addColorStop(1, '#a8601f');
      c.fillStyle = g; c.strokeStyle = '#6b3410'; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(-W / 2, -10); c.bezierCurveTo(-W / 2 - 4, -H - 6, W / 2 + 4, -H - 6, W / 2, -10); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,240,200,0.85)'; c.lineWidth = 4; c.lineCap = 'round';
      for (const ox of [-28, 0, 28]) { c.beginPath(); c.moveTo(ox - 10, -H + 14); c.quadraticCurveTo(ox, -H + 6, ox + 12, -H + 18); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(-22, -H + 8, 18, 5, -0.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(-36 + hash1(i * 3.3) * 72, -H + 4 + hash1(i * 7.1) * 22, 1.4, 0, 7); c.fill(); }
    } else {
      const g = c.createLinearGradient(0, -H, 0, 0); g.addColorStop(0, '#ffe79a'); g.addColorStop(0.5, '#f2bf4f'); g.addColorStop(1, '#b97f24');
      c.fillStyle = g; c.strokeStyle = '#7a4e10'; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(-W / 2, 0); c.bezierCurveTo(-W / 2 - 2, -H * 0.9, -W * 0.2, -H - 8, 0, -H - 6); c.bezierCurveTo(W * 0.2, -H - 8, W / 2 + 2, -H * 0.9, W / 2, 0); c.closePath(); c.fill(); c.stroke();
      c.save(); c.clip();
      c.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const sx = -W / 2 + hash1(i * 1.7) * W, sy = -H + hash1(i * 4.1 + 2) * H, len = 10 + hash1(i * 2.9) * 12, an = -1.2 + hash1(i * 5.3) * 0.9;
        c.strokeStyle = i % 3 ? 'rgba(150,95,20,0.55)' : 'rgba(255,248,200,0.8)'; c.lineWidth = i % 3 ? 1.6 : 2;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(an) * len, sy + Math.sin(an) * len); c.stroke();
      }
      c.restore();
      // верёвочный пояс
      c.strokeStyle = '#7a4a1e'; c.lineWidth = 6; c.beginPath(); c.moveTo(-W / 2 + 3, -H * 0.38); c.quadraticCurveTo(0, -H * 0.3, W / 2 - 3, -H * 0.38); c.stroke();
      c.strokeStyle = '#d9a866'; c.lineWidth = 2.5; c.stroke();
      // торчащие соломинки
      c.strokeStyle = '#ffe79a'; c.lineWidth = 2.4;
      for (const [ox, an] of [[-14, -2.1], [-4, -1.7], [8, -1.3], [18, -1.0]]) { c.beginPath(); c.moveTo(ox, -H - 2); c.lineTo(ox + Math.cos(an) * 14, -H - 2 + Math.sin(an) * 14); c.stroke(); }
      flower(c, -W * 0.3, -H * 0.6, '#ff8fab', 4); flower(c, W * 0.28, -H * 0.5, '#ffffff', 4);
    }
    c.restore();
  }
}
PDRAW.straw = (c, p, k, a) => { c.save(); c.globalAlpha = Math.min(1, a * 1.5); c.translate(p.x, p.y); c.rotate(p.rot); c.strokeStyle = '#ffd96b'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-p.size / 2, 0); c.lineTo(p.size / 2, 0); c.stroke(); c.restore(); };
PDRAW.flour = (c, p, k, a) => { c.save(); c.globalAlpha = Math.min(0.9, a * 1.2); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, 7); c.fill(); c.restore(); };
PDRAW.crumb = (c, p, k, a) => { c.save(); c.globalAlpha = Math.min(1, a * 1.5); c.fillStyle = '#e9a85a'; c.beginPath(); c.arc(p.x, p.y, p.size * 0.35, 0, 7); c.fill(); c.restore(); };

// ---------- золотой фонарь — секрет уровня ----------
let GOLD_LAMP = null;
function goldLampImg() {
  if (GOLD_LAMP) return GOLD_LAMP;
  const im = IMG.t_lamp_on, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d'); g.filter = 'sepia(1) saturate(2.8) hue-rotate(-8deg) brightness(1.18)'; g.drawImage(im, 0, 0); g.filter = 'none';
  return (GOLD_LAMP = cv);
}
class GoldLantern extends Ent {
  constructor(x, y) { super(x, y); this.h = 80; this.found = false; this.z = -0.8; this.ft = 0; }
  update(dt) { if (this.found) this.ft += dt; }
  rect() { return { x: this.x - 26, y: this.y - this.h - 30, w: 52, h: this.h + 32 }; }
  draw(c) {
    const cy = this.y - this.h * 0.7;
    glow(c, this.x, cy, (this.found ? 120 : 80) + Math.sin(G.t * 3) * 8, 'rgba(255,215,80,0.75)', 0.9);
    // вращающиеся лучики
    c.save(); c.translate(this.x, cy); c.rotate(G.t * 0.8); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,230,140,0.25)';
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(-7, -64); c.lineTo(7, -64); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(30,20,10,0.25)'; c.beginPath(); c.ellipse(this.x, this.y, 18, 4, 0, 0, 7); c.fill();
    const im = goldLampImg(), hh = this.h * im.height / 231, bob = this.found ? 0 : Math.sin(G.t * 2.5) * 1.5;
    c.drawImage(im, this.x - hh * im.width / im.height / 2, this.y + 2 - hh, hh * im.width / im.height, hh);
    c.fillStyle = '#ffe066'; c.strokeStyle = '#a86b00'; c.lineWidth = 2.5; drawStar(c, this.x, this.y - hh - 10 + bob, 11, G.t * 1.5); c.fill(); c.stroke();
    if (this.found && this.ft < 1.2) { const k = this.ft / 1.2; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.strokeStyle = '#fff3b0'; c.lineWidth = 6; c.beginPath(); c.arc(this.x, cy, 20 + k * 120, 0, 7); c.stroke(); c.restore(); }
  }
}

// ---------- лужа: мягко замедляет ----------
class Puddle extends Ent {
  constructor(x0, x1, y) { super((x0 + x1) / 2, y); this.x0 = x0; this.x1 = x1; this.z = -0.9; this.rip = []; this.splT = 0; }
  effect(p, dt) {
    const inside = p.onGround && !p.hidden && Math.abs(p.y - this.y) < 1.5 && p.x > this.x0 + 4 && p.x < this.x1 - 4;
    if (!inside) return;
    p.slow = 0.5; this.splT -= dt;
    if (Math.abs(p.vx) > 30 && this.splT <= 0) {
      this.splT = 0.22; Sound.splashSmall(); this.rip.push({ x: p.x, t: 0 });
      for (let i = 0; i < 5; i++) spawn({ type: 'drop', x: p.x + frand(-12, 12), y: this.y - 2, vx: frand(-110, 110), vy: frand(-260, -120), g: 1300, life: 0.5, size: frand(2.5, 4.5) });
    }
  }
  update(dt) { for (const r of this.rip) r.t += dt; this.rip = this.rip.filter(r => r.t < 0.9); }
  draw(c) {
    const cx = this.x, rx = (this.x1 - this.x0) / 2, y = this.y + 1;
    const eve = this.level && this.level.bg !== 'day';
    const g = c.createLinearGradient(0, y - 7, 0, y + 7);
    if (eve) { g.addColorStop(0, '#a79cff'); g.addColorStop(1, '#4a3aa8'); } else { g.addColorStop(0, '#9fe3ff'); g.addColorStop(1, '#2f8fd8'); }
    c.fillStyle = 'rgba(60,40,20,0.35)'; c.beginPath(); c.ellipse(cx, y + 1, rx + 4, 9, 0, 0, 7); c.fill();
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, y, rx, 7.5, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(cx - rx * 0.3, y - 2.5, rx * 0.35, 1.8, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
    const tt = (G.t * 0.6) % 1; c.globalAlpha = 1 - tt; c.beginPath(); c.ellipse(cx + rx * 0.25, y, 6 + tt * 18, 1.5 + tt * 3, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
    for (const r of this.rip) { const k = r.t / 0.9; c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(r.x, y, 8 + k * 34, 2 + k * 4, 0, 0, 7); c.stroke(); }
    c.globalAlpha = 1;
    grassTufts(c, this.x0 - 10, this.x0 + 6, y + 2, 6, this.x0, 10); grassTufts(c, this.x1 - 6, this.x1 + 10, y + 2, 6, this.x1, 10);
  }
}

// ---------- ветерок: дует налево порывами, ветровой рукав показывает, когда ----------
class GustZone extends Ent {
  constructor(x0, x1, yG) { super(x1 + 30, yG); this.x0 = x0; this.x1 = x1; this.yG = yG; this.z = -0.95; this.t = 0; this.on = false; this.k = 0; }
  update(dt) {
    this.t += dt; const ph = this.t % 5;
    const on = ph > 1.8;
    if (on && !this.on && this.S && Math.abs(this.S.p.x - (this.x0 + this.x1) / 2) < 900) Sound.gust();
    this.on = on; this.k = lerp(this.k, on ? 1 : 0, 1 - Math.exp(-dt * 3));
    if (this.on && this.S) {
      const cam = this.S.cam, VW = viewW(), VH = viewH();
      if (fx() < dt * 6) { const yy = this.yG - frand(40, 260); if (this.x1 > cam.x && this.x0 < cam.x + VW) spawn({ type: 'swirl', x: Math.min(this.x1, cam.x + VW) + 20, y: yy, vx: -frand(260, 340), vy: frand(-10, 10), life: 2.2, size: frand(16, 26), vr: -4 }); }
      if (fx() < dt * 5 && this.x1 > cam.x && this.x0 < cam.x + VW) spawn({ type: 'leaf', x: Math.min(this.x1, cam.x + VW) + 10, y: this.yG - frand(30, 240), vx: -frand(220, 300), vy: frand(-20, 30), life: 3, size: frand(8, 11), rot: frand(0, 6), vr: frand(-4, 4), ph: frand(0, 6), col: ['#8bd35a', '#ffb347', '#a9e36b'][Math.floor(frand(0, 3)) % 3] });
    }
  }
  effect(p) { if (this.on && !p.hidden && p.x > this.x0 && p.x < this.x1) p.wind = -320 * this.k; }
  draw(c) {
    // ветровой рукав на столбике (столбик стоит на земле)
    const X = this.x, Y = this.yG;
    c.fillStyle = 'rgba(30,20,10,0.25)'; c.beginPath(); c.ellipse(X + 3, Y + 1, 14, 4, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(X - 6, 0, X + 6, 0); g.addColorStop(0, '#8a5a2b'); g.addColorStop(0.5, '#d29a5c'); g.addColorStop(1, '#6b4220');
    c.fillStyle = g; c.strokeStyle = '#3e2410'; c.lineWidth = 2.5; rr(c, X - 5, Y - 150, 10, 152, 4); c.fill(); c.stroke();
    const k = this.k, droop = (1 - k);
    c.save(); c.translate(X, Y - 142);
    const wv = Math.sin(G.t * 9) * 3 * k;
    for (let i = 0; i < 4; i++) {
      const x0 = -i * 16, x1 = -(i + 1) * 16, r0 = 11 - i * 1.6, r1 = 11 - (i + 1) * 1.6;
      const dy0 = droop * i * i * 6 + Math.sin(i + G.t * 9) * 2 * k, dy1 = droop * (i + 1) * (i + 1) * 6 + Math.sin(i + 1 + G.t * 9) * 2 * k;
      const sx = lerp(1, 0.35, droop);
      c.fillStyle = i % 2 ? '#ffffff' : '#ff6b5b'; c.strokeStyle = '#7a2a10'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(x0 * sx, dy0 - r0); c.lineTo(x1 * sx, dy1 - r1 + wv); c.lineTo(x1 * sx, dy1 + r1 + wv); c.lineTo(x0 * sx, dy0 + r0); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.restore();
  }
}

// ---------- бабочки днём ----------
PDRAW.butterfly = (c, p) => {
  const pos = butterflyPos(p), al = Math.min(1, p.t, p.life - p.t);
  const flap = Math.abs(Math.sin(p.t * 15 + p.ph));
  c.save(); c.globalAlpha = al; c.translate(pos.x, pos.y); c.rotate(Math.sin(p.t * 2 + p.ph) * 0.25);
  c.fillStyle = p.col; c.strokeStyle = 'rgba(60,30,40,0.6)'; c.lineWidth = 1;
  for (const sd of [-1, 1]) { c.save(); c.scale(sd * (0.25 + flap * 0.75), 1); c.beginPath(); c.ellipse(5, -3, 6, 4.5, -0.5, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(4, 4, 4, 3, 0.5, 0, 7); c.fill(); c.stroke(); c.restore(); }
  c.fillStyle = '#4a3040'; c.fillRect(-1, -5, 2, 10);
  c.restore();
};
function butterflyPos(p) { return { x: p.x + Math.sin(p.t * 0.9 + p.ph) * 46, y: p.y + Math.sin(p.t * 2.1 + p.ph) * 16 + Math.sin(p.t * 5.3) * 3 }; }

// ---------- птицы в небе (за всем миром — ничего не закрывают) ----------
function drawBirds(c, cam) {
  c.save(); c.strokeStyle = 'rgba(60,70,100,0.6)'; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const span = G.W + 400, x = ((i * 430 + G.t * (26 + i * 5) - cam.x * 0.12) % span + span) % span - 200, y = 70 + (i % 3) * 38 + Math.sin(G.t * 0.7 + i) * 10;
    for (let j = 0; j < (i % 2 ? 3 : 2); j++) {
      const bx = x - j * 26, by = y + j * 12, f = Math.sin(G.t * 7 + i * 2 + j) * 5;
      c.beginPath(); c.moveTo(bx - 9, by - 2 - f); c.quadraticCurveTo(bx - 4, by - 4, bx, by); c.quadraticCurveTo(bx + 4, by - 4, bx + 9, by - 2 - f); c.stroke();
    }
  }
  c.restore();
}

// ---------- передний план: трава и цветы у нижнего края (во время вопросов — спрятан) ----------
const FG_CACHE = {};
function fgCanvas(kind) {
  if (FG_CACHE[kind]) return FG_CACHE[kind];
  const W = 1600, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), eve = kind !== 'day';
  const dark = eve ? '#203a3a' : '#2f7a2a', mid = eve ? '#2e5246' : '#4aa63a', light = eve ? '#466e58' : '#86d65a';
  c.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = hash1(i * 1.31) * W, h = 20 + hash1(i * 2.7) * (hash1(i * 0.37) > 0.85 ? 70 : 42), lean = (hash1(i * 3.9) - 0.5) * 18;
    const g = c.createLinearGradient(0, H - h, 0, H); g.addColorStop(0, light); g.addColorStop(1, dark);
    c.strokeStyle = g; c.lineWidth = 4 + hash1(i * 5.1) * 3;
    c.beginPath(); c.moveTo(x, H + 2); c.quadraticCurveTo(x + lean * 0.3, H - h * 0.55, x + lean, H - h); c.stroke();
  }
  c.fillStyle = mid; for (let i = 0; i < 18; i++) { const x = hash1(i * 7.7 + 1) * W; c.beginPath(); c.ellipse(x, H - 4, 30 + hash1(i) * 26, 16, 0, 0, 7); c.fill(); }
  const cols = eve ? ['#c5b8ff', '#ffd8a8', '#9fd8ff'] : ['#ff8fab', '#ffffff', '#ffd43b', '#d0bfff'];
  for (let i = 0; i < 26; i++) {
    const x = hash1(i * 9.3 + 4) * W, h = 30 + hash1(i * 4.4) * 34;
    c.strokeStyle = dark; c.lineWidth = 3; c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + 4, H - h * 0.5, x + 2, H - h); c.stroke();
    flower(c, x + 2, H - h, cols[i % cols.length], 7);
  }
  return (FG_CACHE[kind] = cv);
}
function drawForeground(c, S) {
  if (S.def.noFg) return; // где переднего плана нет (пещера, башня)
  const a = S.fgA; if (a <= 0.02) return;
  const cv = fgCanvas(S.L.bg), W = cv.width, H = cv.height;
  const off = ((S.cam.x * G.zoom * 1.35) % W + W) % W;
  c.save(); c.globalAlpha = a;
  const sway = Math.sin(G.t * 1.3) * 0.04;
  c.translate(0, G.H); c.transform(1, 0, sway, 1, 0, 0); c.translate(0, -G.H);
  for (let x = -off; x < G.W + 20; x += W) c.drawImage(cv, x, G.H - H + 14);
  c.restore();
}

// ---------- каменная стена с фонарями (уровень 2): фонари стоят на ней, высоко над рамой ----------
const WALL_CACHE = new Map();
class StationWall extends Ent {
  constructor(x0, x1, top, ground) { super((x0 + x1) / 2, ground); this.x0 = x0; this.x1 = x1; this.top = top; this.ground = ground; this.z = -3; }
  canvas() {
    const W = Math.round(this.x1 - this.x0), H = Math.round(this.ground - this.top), key = W + 'x' + H;
    if (WALL_CACHE.has(key)) return WALL_CACHE.get(key);
    const PR = 1.5, cv = document.createElement('canvas'); cv.width = Math.ceil((W + 40) * PR); cv.height = Math.ceil((H + 40) * PR);
    const c = cv.getContext('2d'); c.scale(PR, PR); c.translate(20, 30);
    // кладка
    rr(c, 0, 0, W, H + 4, [14, 14, 0, 0]); c.save(); c.clip();
    c.save(); c.scale(0.42, 0.42); c.fillStyle = c.createPattern(IMG.tex_stone, 'repeat'); c.fillRect(0, 0, W / 0.42, (H + 4) / 0.42); c.restore();
    c.fillStyle = 'rgba(50,40,90,0.38)'; c.fillRect(0, 0, W, H + 4);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,230,190,0.18)'); g.addColorStop(1, 'rgba(20,10,40,0.35)'); c.fillStyle = g; c.fillRect(0, 0, W, H + 4);
    // арочные ниши (тёмные, без окон — чтобы ничего не путалось со счётом)
    for (let x = 70; x < W - 60; x += 150) {
      c.fillStyle = 'rgba(25,15,45,0.45)'; c.beginPath(); c.moveTo(x - 30, H + 4); c.lineTo(x - 30, H * 0.5); c.arc(x, H * 0.5, 30, Math.PI, 0); c.lineTo(x + 30, H + 4); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(220,210,190,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(x, H * 0.5, 34, Math.PI, 0); c.stroke();
    }
    // плющ
    c.strokeStyle = '#2f7a3a'; c.lineWidth = 3; c.lineCap = 'round';
    for (const vx of [24, W * 0.42, W - 30]) { c.beginPath(); c.moveTo(vx, 10); c.bezierCurveTo(vx + 14, H * 0.3, vx - 12, H * 0.6, vx + 6, H * 0.85); c.stroke(); c.fillStyle = '#4caf50'; for (let k = 0; k < 7; k++) { const t = k / 7, yy = 16 + t * H * 0.75; c.beginPath(); c.ellipse(vx + Math.sin(k * 1.9) * 9, yy, 6, 4, k, 0, 7); c.fill(); } }
    c.restore();
    c.strokeStyle = '#3a3346'; c.lineWidth = 4; rr(c, 0, 0, W, H + 4, [14, 14, 0, 0]); c.stroke();
    // карниз: широкие плиты сверху
    for (let x = -8, i = 0; x < W + 8; x += 56, i++) {
      const w = Math.min(56, W + 8 - x), cg = c.createLinearGradient(0, -14, 0, 8); cg.addColorStop(0, '#e6dccb'); cg.addColorStop(1, '#9a8f7c');
      c.fillStyle = cg; c.strokeStyle = '#4a4338'; c.lineWidth = 3; rr(c, x, -12, w - 2, 20, 6); c.fill(); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,245,0.55)'; rr(c, -4, -10, W + 8, 3, 1.5); c.fill();
    grassTufts(c, -6, W + 6, -10, 11, 7, 9);
    WALL_CACHE.set(key, cv); return cv;
  }
  draw(c) {
    c.fillStyle = 'rgba(30,20,10,0.3)'; c.beginPath(); c.ellipse(this.x, this.ground + 2, (this.x1 - this.x0) * 0.52, 10, 0, 0, 7); c.fill();
    const cv = this.canvas(); c.drawImage(cv, this.x0 - 20, this.top - 30, cv.width / 1.5, cv.height / 1.5);
    grassTufts(c, this.x0 - 10, this.x1 + 10, this.ground + 2, 9, this.x0, 12);
  }
}
