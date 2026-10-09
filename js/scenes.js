'use strict';
// ===== Заставка, карта, финал, главный цикл =====
// объёмная надпись: каждая буква (толща, тень, обводки, градиент, блик) рисуется ОДИН раз в свой холст,
// дальше кадр только ставит готовые буквы (иначе ~150 strokeText за кадр — тормозит на телефоне)
const LOGO_CACHE = new Map();
function logoGlyph(ch, size, k) {
  const key = ch + '|' + size + '|' + k; let g = LOGO_CACHE.get(key); if (g) return g;
  const depth = Math.round(size * 0.12), pad = Math.ceil(size * 0.25);
  const m = document.createElement('canvas').getContext('2d'); m.font = font(size, 400); const w = m.measureText(ch).width;
  const W = Math.ceil(w + pad * 2 + depth * 0.35 + 4), H = Math.ceil(size * 1.3 + pad * 2 + depth + size * 0.1);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
  const c = cv.getContext('2d'); c.scale(k, k); const ox = pad + w / 2, oy = pad + size * 0.65;
  c.font = font(size, 400); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.translate(ox, oy);
  for (let d = depth; d >= 1; d--) { const q = d / depth; c.lineWidth = size * 0.3; c.strokeStyle = `rgb(${Math.round(150 - 60 * q)},${Math.round(70 - 35 * q)},0)`; c.strokeText(ch, d * 0.35, d); c.fillStyle = c.strokeStyle; c.fillText(ch, d * 0.35, d); }
  c.fillStyle = 'rgba(70,30,0,0.45)'; c.lineWidth = size * 0.3; c.strokeStyle = 'rgba(70,30,0,0.45)'; c.strokeText(ch, 4, size * 0.1 + depth);
  c.lineWidth = size * 0.3; c.strokeStyle = '#5b2a00'; c.strokeText(ch, 0, 0);
  c.lineWidth = size * 0.16; c.strokeStyle = '#ff9d1c'; c.strokeText(ch, 0, 0);
  const gr = c.createLinearGradient(0, -size * 0.45, 0, size * 0.45); gr.addColorStop(0, '#fffbd0'); gr.addColorStop(0.42, '#ffe14d'); gr.addColorStop(0.55, '#ffc21a'); gr.addColorStop(1, '#ff8f00');
  c.fillStyle = gr; c.fillText(ch, 0, 0);
  c.save(); c.beginPath(); c.rect(-size, -size, size * 2, size * 0.78); c.clip(); c.globalAlpha = 0.35; c.fillStyle = '#fff'; c.fillText(ch, 0, -size * 0.04); c.restore();
  g = { cv, ox, oy, W, H }; LOGO_CACHE.set(key, g); return g;
}
function drawLogo(c, text, cx, cy, size, t = 0, arc = 0.0) {
  size = Math.round(size);
  const k = Math.min(4, Math.max(1, Math.round((c.getTransform ? Math.abs(c.getTransform().a) : 1) * 4) / 4));
  c.save(); c.font = font(size, 400);
  const chars = [...text], widths = chars.map(ch => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) * 1.03;
  let xx = cx - total / 2;
  chars.forEach((ch, i) => {
    const w = widths[i] * 1.03, px = xx + w / 2, rel = (px - cx) / total;
    const py = cy + rel * rel * arc * size + Math.sin(t * 3 + i * 0.5) * size * 0.04, rot = rel * arc * 0.9;
    xx += w; if (ch === ' ') return;
    const g = logoGlyph(ch, size, k);
    c.save(); c.translate(px, py); c.rotate(rot); c.drawImage(g.cv, -g.ox, -g.oy, g.W, g.H); c.restore();
  });
  c.restore();
}
class TitleScene {
  constructor() { this.t = 0; this.shA = 0; Sound.setMode('day'); }
  update(dt) { this.t += dt; updateParticles(dt); if (fx() < dt * 3) sparkBurst(frand(0, G.W), frand(0, G.H * 0.6), 1, '#fff6b0', 40); }
  draw(c) {
    G.ui = [];
    const im = IMG.bg_day, s = Math.max(G.W / im.width, G.H / im.height) * 1.06;
    c.drawImage(im, (G.W - im.width * s) / 2 + Math.sin(this.t * 0.2) * 14, (G.H - im.height * s) / 2, im.width * s, im.height * s);
    c.fillStyle = 'rgba(255,240,200,0.12)'; c.fillRect(0, 0, G.W, G.H);
    for (let i = 0; i < 3; i++) cloud(c, ((i * 500 + this.t * 14) % (G.W + 400)) - 200, 70 + i * 40, 0.8, 0.9);
    // логотип сверху по центру, герои по краям внизу — ничьё лицо не перекрыто
    const lr = IMG.logo ? IMG.logo.width / IMG.logo.height : 1.03, lh = Math.min(G.H * 0.62, G.W * 0.42 / lr), lw = lh * lr;
    const ly = 2 + Math.sin(this.t * 1.6) * 4, lx = G.W / 2 - lw / 2;
    const gy = G.H - 24;
    // мягкие контактные тени
    const shadow = (x, w) => { const g = c.createRadialGradient(x, gy, 4, x, gy, w); g.addColorStop(0, 'rgba(30,40,10,0.42)'); g.addColorStop(1, 'rgba(30,40,10,0)'); c.fillStyle = g; c.save(); c.translate(x, gy); c.scale(1, 0.16); c.translate(-x, -gy); c.beginPath(); c.arc(x, gy, w, 0, 7); c.fill(); c.restore(); };
    const dh = 280, ih = 262, kh = 262;
    const dX = G.W * 0.115, iX = G.W * 0.285, bX = G.W * 0.9;
    shadow(dX, 120); shadow(iX, 80); shadow(bX, 105);
    drawSprite(c, IMG.arch_point, dX, gy, dh + Math.sin(this.t * 2) * 3);
    const hop = Math.abs(Math.sin(this.t * 2.6)) * 6;
    drawSprite(c, IMG.iskra_hero, iX, gy - hop, ih);
    drawSprite(c, IMG.bublik, bX, gy, kh, true, 1, 1 + Math.sin(this.t * 2.4) * 0.012);
    // Щёлк кружит в правом верхнем углу, справа от логотипа
    const sx = (lx + lw + G.W) / 2 + Math.sin(this.t * 0.9) * Math.max(10, (G.W - lx - lw) / 2 - 130), sy = 200 + Math.sin(this.t * 1.8) * 26;
    c.save(); c.translate(sx, sy); c.rotate(Math.sin(this.t * 0.9 + 1.5) * 0.08); const fw = 230; c.drawImage(IMG.shchelk_front, -fw / 2, -fw * IMG.shchelk_front.height / IMG.shchelk_front.width / 2, fw, fw * IMG.shchelk_front.height / IMG.shchelk_front.width); c.restore();
    if (IMG.logo) {
      glow(c, G.W / 2, ly + lh * 0.55, lw * 0.5, 'rgba(255,230,150,0.45)', 0.6);
      // ось весов на логотипе поблёскивает
      glow(c, lx + lw * 0.49, ly + lh * 0.04, lw * 0.08, 'rgba(255,230,120,0.95)', 0.45 + Math.sin(this.t * 3.2) * 0.3);
      c.drawImage(IMG.logo, lx, ly, lw, lh);
    } else {
      glow(c, G.W / 2, 150, 520, 'rgba(255,220,120,0.45)', 0.6 + Math.sin(this.t * 2) * 0.1);
      drawLogo(c, 'Весы и знаки', G.W / 2, 150, Math.min(132, G.W / 9.4), this.t, 0.5);
    }
    const bw = 330, bh = 104, bx = G.W * 0.575 - bw / 2, by = G.H - 150;
    goldButton(c, bx, by, bw, bh, 'Играть', 60, Math.sin(this.t * 4) * 0.035);
    addButton(bx, by, bw, bh, () => this.onEnter(), 'play');
    drawParticles(c, 'world');
    roundIconButton(c, G.W - 84 - G.sr, 18, 66, G.muted ? 'mute' : 'sound'); addButton(G.W - 84 - G.sr, 18, 66, 66, () => Sound.toggle(), 'sound');
  }
  onEnter() { goScene(() => (typeof PROLOGUE !== 'undefined' && !prologueSeen()) ? new PlayScene(PROLOGUE) : new MapScene()); }
}
class MapScene {
  constructor() {
    this.t = 0; this.prog = getProgress(); Sound.setMode('day'); this.sel = Math.min(LEVELS.length - 1, this.prog - 1);
    this.stars = Prog.stars(); this.secrets = Prog.secrets(); this.ff = Prog.ff(); this.ffMax = Prog.ffMax();
    // праздник: если с прошлого визита пройден новый уровень — его фонарь зажигается на глазах
    let seen = 0; try { seen = +(localStorage.getItem('vz_plat_seen') || 0); } catch (_) { }
    const done = this.prog - 1;
    this.cele = done > seen ? { node: done - 1, t: 0, fx: {} } : null;
    try { localStorage.setItem('vz_plat_seen', String(Math.max(seen, done))); } catch (_) { }
    this.iskraPos = null;
  }
  pts() {
    const W = G.W, H = G.H;
    return [[-0.03, 0.97], [0.05, 0.88], [0.13, 0.74], [0.19, 0.60], [0.25, 0.48], [0.315, 0.45], [0.38, 0.52], [0.44, 0.66], [0.50, 0.74], [0.56, 0.66], [0.62, 0.52], [0.685, 0.45], [0.75, 0.52], [0.80, 0.66], [0.85, 0.74], [0.97, 0.66]].map(([x, y]) => ({ x: x * W, y: y * H }));
  }
  nodeIdx() { return [2, 5, 8, 11, 14]; }
  nodes() { const P = this.pts(); return this.nodeIdx().map(i => P[i]); }
  poly() {
    // сглаженная извилистая дорожка (Catmull-Rom), с индексами узлов
    const P = this.pts(), out = [], at = {};
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      at[i] = out.length;
      for (let k = 0; k < 16; k++) {
        const t = k / 16, t2 = t * t, t3 = t2 * t;
        out.push({ x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) });
      }
    }
    at[P.length - 1] = out.length; out.push(P[P.length - 1]);
    return { pts: out, at };
  }
  pathLen(a, b) {
    const { pts, at } = this.poly(); let L = 0;
    for (let i = at[a] + 1; i <= at[b]; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return L;
  }
  alongPath(a, b, k) {
    const { pts, at } = this.poly(), seg = pts.slice(at[a], at[b] + 1);
    let L = 0; const d = [0]; for (let i = 1; i < seg.length; i++) { L += Math.hypot(seg[i].x - seg[i - 1].x, seg[i].y - seg[i - 1].y); d.push(L); }
    const want = L * clamp(k, 0, 1); let i = 1; while (i < seg.length - 1 && d[i] < want) i++;
    const f = (want - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]);
    return { x: lerp(seg[i - 1].x, seg[i].x, f), y: lerp(seg[i - 1].y, seg[i].y, f), dir: Math.sign(seg[i].x - seg[i - 1].x) || 1 };
  }
  update(dt) {
    this.t += dt; updateParticles(dt);
    const ce = this.cele;
    if (ce) {
      ce.t += dt; const N = this.nodes(), p = N[ce.node];
      if (ce.t > 0.7 && !ce.fx.lit) {
        ce.fx.lit = 1; Sound.light(8); Sound.fanfare();
        sparkBurst(p.x, p.y - 55, 30, '#fff1a8', 360); spawn({ type: 'glowburst', x: p.x, y: p.y - 55, life: 0.9, size: 220 }); spawn({ type: 'ring', x: p.x, y: p.y - 55, life: 0.7, size: 160, col: '#fff3b0' });
        for (let i = 0; i < 26; i++) spawn({ type: 'confetti', x: p.x + frand(-40, 40), y: p.y - 120, vx: frand(-260, 260), vy: frand(-480, -200), g: 700, life: 2, size: frand(9, 15), col: ['#ffd43b', '#ff6b6b', '#69db7c', '#4dabf7', '#f783ac'][i % 5], rot: frand(0, 6), vr: frand(-6, 6) });
      }
      const ns = this.stars[ce.node] || 0;
      for (let i = 0; i < ns; i++) if (ce.t > 1.3 + i * 0.3 && !ce.fx['s' + i]) { ce.fx['s' + i] = 1; Sound.count(3 + i * 2); const sx = p.x + (i - (ns - 1) / 2) * 46; sparkBurst(sx, p.y - 150, 10, '#ffe066', 200); }
      if (ce.t > 4.2) this.cele = null;
    }
  }
  draw(c) {
    G.ui = [];
    const im = IMG.bg_day, s = Math.max(G.W / im.width, G.H / im.height);
    c.drawImage(im, (G.W - im.width * s) / 2, (G.H - im.height * s) / 2, im.width * s, im.height * s);
    c.fillStyle = 'rgba(255,245,215,0.26)'; c.fillRect(0, 0, G.W, G.H);
    drawBirds(c, { x: 0 });
    for (let i = 0; i < 3; i++) cloud(c, ((i * 470 + this.t * 10) % (G.W + 400)) - 200, 60 + i * 34, 0.6, 0.75);
    const N = this.nodes(), { pts } = this.poly();
    const sx0 = -999;
    // дорожка
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); };
    path(); c.strokeStyle = 'rgba(90,50,10,0.32)'; c.lineWidth = 50; c.stroke();
    path(); c.strokeStyle = '#f3d9a4'; c.lineWidth = 38; c.stroke();
    path(); c.strokeStyle = 'rgba(255,250,230,0.6)'; c.lineWidth = 8; c.translate(-4, -6); c.stroke(); c.translate(4, 6);
    // пройденная часть дорожки — тёплая золотая
    const at = this.poly().at, doneTo = this.nodeIdx()[Math.min(LEVELS.length - 1, this.prog - 1)];
    c.beginPath(); for (let i = 0; i <= at[doneTo]; i++) { const q = pts[i]; if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }
    c.setLineDash([3, 24]); c.strokeStyle = '#e8590c'; c.lineWidth = 11; c.stroke(); c.setLineDash([]);
    c.restore();
    // кусты, цветы, камушки вдоль дорожки
    for (let i = 0; i < pts.length; i += 7) {
      const q = pts[i], side = i % 14 ? 1 : -1, ox = q.x + side * 44, oy = q.y + 26 + hash1(i) * 10;
      if (N.some(n => Math.hypot(n.x - ox, n.y - oy) < 120) || Math.abs(ox - sx0) < 70 || oy > G.H - 20) continue;
      if (hash1(i * 3.1) > 0.55) { const w = 60 + hash1(i) * 30; c.drawImage(IMG.t_bush, ox - w / 2, oy - w * 0.87, w, w * 0.87); }
      else { flower(c, ox, oy - 4, ['#ff8fab', '#ffffff', '#d0bfff', '#ffd43b'][i % 4], 6); flower(c, ox + 14, oy + 2, '#ffffff', 5); }
    }
    // Великие весы в конце пути: когда все гирьки возвращены — стоят ровно и сияют
    const lx = N[N.length - 1].x + 130, ly = N[N.length - 1].y + 10;
    if (lx < G.W - 40) {
      const all = this.prog > LEVELS.length;
      if (!this.mini) this.mini = new Scales(0, 0, { style: 'great', item: 'melon', arm: 150, post: 230, chain: 90, panW: 160, left: 5, right: 5, rightKind: 'weight', perRow: 3 });
      this.mini.right = all ? 5 : 0; this.mini.ang = tiltFor(this.mini.left, this.mini.right);
      if (all) glow(c, lx, ly - 90, 110, 'rgba(255,220,120,0.8)', 0.8);
      c.save(); c.translate(lx, ly); c.scale(0.42, 0.42); this.mini.draw(c); c.restore();
    }
    const ce = this.cele;
    N.forEach((p, i) => {
      const unlocked = i < this.prog;
      let doneL = i < this.prog - 1;
      const celeHere = ce && ce.node === i;
      const litK = celeHere ? clamp((ce.t - 0.7) / 0.4, 0, 1) : (doneL ? 1 : 0);
      if (celeHere && litK <= 0) doneL = false;
      const bob = unlocked && !doneL ? Math.sin(this.t * 3) * 5 : 0;
      c.fillStyle = 'rgba(40,25,5,0.3)'; c.beginPath(); c.ellipse(p.x, p.y + 8, 62, 16, 0, 0, 7); c.fill();
      c.fillStyle = unlocked ? '#e9b44c' : '#9c9c9c'; c.strokeStyle = '#5b3313'; c.lineWidth = 5;
      c.beginPath(); c.ellipse(p.x, p.y, 60, 22, 0, 0, 7); c.fill(); c.stroke();
      if (litK > 0) glow(c, p.x, p.y - 50, 110 * litK + (celeHere ? Math.sin(ce.t * 10) * 10 * (1 - clamp(ce.t - 1.2, 0, 1)) : 0), 'rgba(255,214,90,0.9)', 0.9);
      else if (unlocked) glow(c, p.x, p.y - 50, 70, 'rgba(255,240,170,0.5)', 0.9);
      const scl = celeHere ? 1 + Math.sin(clamp((ce.t - 0.7) / 0.5, 0, 1) * Math.PI) * 0.15 : 1;
      c.save(); c.translate(p.x, p.y + 2 + bob); c.scale(scl, scl); drawWeightIcon(c, 0, 0, litK > 0.5, 96); c.restore();
      if (!unlocked) {
        c.save(); c.translate(p.x, p.y - 80);
        c.strokeStyle = '#6b6b6b'; c.lineWidth = 8; c.beginPath(); c.arc(0, -10, 16, Math.PI, 0); c.stroke();
        c.fillStyle = '#8d8d8d'; rr(c, -24, -10, 48, 38, 8); c.fill(); c.strokeStyle = '#444'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#444'; c.beginPath(); c.arc(0, 6, 6, 0, 7); c.fill(); c.restore();
      }
      // звёзды — только заработанные (не показываем «пустых»)
      if (doneL || celeHere) {
        const ns = this.stars[i] || 0;
        for (let k = 0; k < ns; k++) {
          const ap = celeHere ? clamp((ce.t - 1.3 - k * 0.3) / 0.3, 0, 1) : 1; if (ap <= 0) continue;
          const sc = easeOutBack(ap), sx = p.x + (k - (ns - 1) / 2) * 46, sy = p.y - 150 - (ns === 3 && k === 1 ? 8 : 0);
          c.drawImage(IMG.t_star, sx - 22 * sc, sy - 22 * sc, 44 * sc, 44 * sc);
        }
      }
      // табличка
      c.font = font(30, 900); const lab = (i + 1) + '. ' + LEVEL_NAMES[i];
      const tw = c.measureText(lab).width + 40;
      const ly2 = p.y + 30;
      woodPanel(c, p.x - tw / 2, ly2, tw, 54, 16, 40 + i);
      txt(c, lab, p.x, ly2 + 28, { size: 30, fill: unlocked ? '#fff8e6' : '#e6d6c0', stroke: '#5b3313', sw: 7 });
      if ((doneL || celeHere) && this.ffMax[i]) {
        const ft = String(this.ff[i]); c.font = font(24, 900); const fw = c.measureText(ft).width + 58;
        c.fillStyle = 'rgba(60,35,10,0.55)'; rr(c, p.x - fw / 2, ly2 + 60, fw, 34, 17); c.fill();
        drawFireflyBug(c, p.x - fw / 2 + 20, ly2 + 77, 0.95, this.t, i, 0.7);
        txt(c, ft, p.x - fw / 2 + 40 + (fw - 58) / 2, ly2 + 78, { size: 24, fill: '#fbffd6' });
      }
      // значок секрета у таблички: найден — золотой фонарик; нет — мягкий «?»-намёк
      if (doneL || celeHere) {
        const bx = p.x + tw / 2 + 24, by = ly2 + 27, gi = goldLampImg(), got = this.secrets[i];
        c.save();
        if (got) glow(c, bx, by, 44 + Math.sin(this.t * 3) * 4, 'rgba(255,215,80,0.9)', 0.9);
        c.fillStyle = 'rgba(40,20,5,0.35)'; c.beginPath(); c.arc(bx + 2, by + 3, 24, 0, 7); c.fill();
        const gg = c.createRadialGradient(bx - 7, by - 8, 3, bx, by, 24);
        if (got) { gg.addColorStop(0, '#fff6c8'); gg.addColorStop(1, '#e0a21a'); } else { gg.addColorStop(0, '#d9b98f'); gg.addColorStop(1, '#9b6b3c'); }
        c.fillStyle = gg; c.strokeStyle = '#5b3313'; c.lineWidth = 4; c.beginPath(); c.arc(bx, by, 22, 0, 7); c.fill(); c.stroke();
        if (got) { const hh = 34, ww = hh * gi.width / gi.height; c.drawImage(gi, bx - ww / 2, by - hh / 2 - 1, ww, hh); }
        else txt(c, '?', bx, by + 1, { size: 28, fill: '#fff8e6', stroke: '#5b3313', sw: 5 });
        c.restore();
      }
      if (unlocked) addButton(p.x - Math.max(80, tw / 2), p.y - 180, Math.max(160, tw), 270, () => goScene(() => new PlayScene(i)), 'level' + (i + 1));
    });
    // Искра у текущего уровня (после праздника — идёт по дорожке к следующему фонарю)
    const ix = this.nodeIdx();
    let pos, dir = 1;
    const curI = Math.min(LEVELS.length - 1, this.prog - 1);
    if (ce && ce.node + 1 <= LEVELS.length - 1) {
      // идёт от своего места у одного фонаря до такого же места у следующего — без рывка в конце
      const k = clamp((ce.t - 2.2) / 1.6, 0, 1), a = ix[ce.node] - 1, b = ix[ce.node + 1];
      const tot = this.pathLen(a, b), d0 = 0.55 * this.pathLen(a, a + 1), d1 = this.pathLen(a, b - 1) + 0.55 * this.pathLen(b - 1, b);
      const q = this.alongPath(a, b, lerp(d0, d1, k * k * (3 - 2 * k)) / tot);
      pos = { x: q.x, y: q.y }; dir = k > 0 && k < 1 ? q.dir : 1;
      if (k > 0 && k < 1) { pos.y -= Math.abs(Math.sin(this.t * 12)) * 8; }
    } else { const q0 = this.alongPath(ix[curI] - 1, ix[curI], 0.55); pos = { x: q0.x, y: q0.y - Math.abs(Math.sin(this.t * 3)) * 8 }; }
    drawSprite(c, IMG.iskra_idle, pos.x, pos.y + 6, 124, dir < 0);
    drawParticles(c, 'world');
    txt(c, 'Путь за гирьками', G.W / 2, 64, { size: 56, fill: '#fff8e6', stroke: '#8a4300', sw: 12, shadow: 'rgba(80,40,0,0.35)', sy: 5 });
    roundIconButton(c, 18 + G.sl, 18, 66, 'home'); addButton(18 + G.sl, 18, 66, 66, () => goScene(() => new TitleScene()), 'home');
    if (typeof PROLOGUE !== 'undefined') { goldButton(c, 100 + G.sl, 18, 200, 66, 'Сказка', 32, 0, 'green'); addButton(100 + G.sl, 18, 200, 66, () => goScene(() => new PlayScene(PROLOGUE)), 'story'); }
    roundIconButton(c, G.W - 84 - G.sr, 18, 66, G.muted ? 'mute' : 'sound'); addButton(G.W - 84 - G.sr, 18, 66, 66, () => Sound.toggle(), 'sound');
  }
  onEnter() { goScene(() => new PlayScene(Math.min(LEVELS.length - 1, this.prog - 1))); }
}
class FinaleScene {
  constructor() { this.t = 0; this.fwT = 0; Sound.setMode('finale'); Sound.fanfare(); G.particles = []; G.bubbles = []; Dialog.reset(); G.tasks = []; G.freeze = false; }
  update(dt) {
    this.t += dt; this.fwT -= dt;
    if (this.fwT <= 0) {
      this.fwT = frand(0.35, 0.8);
      const x = frand(G.W * 0.1, G.W * 0.9), y = frand(70, 300), col = ['#ffd43b', '#ff8787', '#74c0fc', '#b2f2bb', '#f783ac', '#ffa94d'][Math.floor(frand(0, 6))];
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, v = frand(160, 260); spawn({ type: 'fw', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, drag: 1.4, life: frand(1, 1.5), size: frand(4, 6), col }); }
      Sound.tone(frand(500, 900), 0.3, 'sine', 0.06, 0, 1800); Sound.noise(0.5, 0.05, 3000, 0.1, 'highpass');
    }
    if (fx() < dt * 8) spawn({ type: 'confetti', x: frand(0, G.W), y: -20, vx: frand(-40, 40), vy: frand(100, 220), g: 60, life: 5, size: frand(10, 16), col: ['#ffd43b', '#ff6b6b', '#69db7c', '#4dabf7', '#f783ac'][Math.floor(frand(0, 5))], rot: frand(0, 6), vr: frand(-5, 5) });
    updateParticles(dt);
  }
  draw(c) {
    G.ui = [];
    const im = IMG.bg_eve, s = Math.max(G.W / im.width, G.H / im.height);
    c.drawImage(im, (G.W - im.width * s) / 2, (G.H - im.height * s) / 2, im.width * s, im.height * s);
    c.fillStyle = 'rgba(255,200,120,0.12)'; c.fillRect(0, 0, G.W, G.H);
    drawParticles(c, 'world');
    const gy = G.H - 26;
    const hop = k => Math.abs(Math.sin(this.t * 3 + k)) * 18;
    c.fillStyle = 'rgba(30,20,40,0.3)';
    for (const [x, w] of [[G.W * 0.17, 110], [G.W * 0.43, 90], [G.W * 0.66, 100]]) { c.beginPath(); c.ellipse(x, gy, w, 14, 0, 0, 7); c.fill(); }
    // Архимед радуется: два прыжка «ура» (руки вверх) → приземлился и стоит со свитком → снова прыжки
    { const cyc = this.t % 2.0; if (cyc < 1.1) { const ph = (cyc / 1.1 * 2) % 1; drawSprite(c, IMG.arch_cheer, G.W * 0.17, gy - Math.sin(ph * Math.PI) * 30, 320 * ARCH_META.cheer.hs); } else drawSprite(c, IMG.arch_idle, G.W * 0.17, gy, 320); }
    glow(c, G.W * 0.43, gy - 150, 220, 'rgba(255,220,120,0.35)', 0.8);
    drawSprite(c, IMG.iskra_hero, G.W * 0.43, gy - hop(1), 330);
    drawSprite(c, IMG.bublik, G.W * 0.66, gy - hop(2), 290, true);
    const a = this.t * 0.8; const sx = G.W * 0.45 + Math.cos(a) * G.W * 0.3, sy = 265 + Math.sin(a * 2) * 40;
    c.save(); c.translate(sx, sy); c.scale(Math.cos(a) < 0 ? 1 : 1, 1); const fw = 200; c.drawImage(IMG.shchelk_front, -fw / 2, -fw * 0.34, fw, fw * IMG.shchelk_front.height / IMG.shchelk_front.width);
    // медаль Щёлка
    c.strokeStyle = '#c92a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(-16, fw * 0.2); c.lineTo(0, fw * 0.32); c.lineTo(16, fw * 0.2); c.stroke();
    glow(c, 0, fw * 0.38, 40, 'rgba(255,214,90,0.9)', 0.9); drawItem(c, 'coin', 0, fw * 0.46, 34); c.restore();
    drawLogo(c, 'Весы спасены!', G.W / 2, 120, Math.min(120, G.W / 9.5), this.t, 0.35);
    // фонарь-кнопка «Играть снова»
    if (this.t > 1.5) {
      const bx = G.W * 0.868, by = G.H - 350, k = easeOutBack(Math.min(1, (this.t - 1.5) / 0.5));
      c.save(); c.translate(bx, by + 150); c.scale(k, k); c.translate(-bx, -(by + 150));
      glow(c, bx, by + 40, 120, 'rgba(255,214,90,0.9)', 0.8 + Math.sin(this.t * 4) * 0.15);
      drawSprite(c, IMG.t_lamp_on, bx, by + 150, 220);
      c.font = font(36, 900); const lab = 'Играть снова'; const tw = c.measureText(lab).width + 52;
      woodPanel(c, bx - tw / 2, by + 160, tw, 68, 20, 77);
      txt(c, lab, bx, by + 195, { size: 36, fill: '#fff8e6', stroke: '#5b3313', sw: 7 });
      c.restore();
      addButton(bx - 140, by - 80, 280, 320, () => this.onEnter(), 'again');
    }
  }
  onEnter() { G.seed += 1000; goScene(() => new PlayScene(0)); }
}
// ---------- переходы (круглая шторка) ----------
function goScene(make) {
  if (G.trans) return;
  G.trans = { t: 0, phase: 'out', make };
}
function drawTrans(c) {
  // мягкое затемнение в тёплый сумеречный цвет с лёгким свечением в центре
  const tr = G.trans; if (!tr) return;
  const k0 = clamp(tr.phase === 'out' ? tr.t / 0.4 : 1 - tr.t / 0.4, 0, 1), k = k0 * k0 * (3 - 2 * k0);
  c.save();
  c.globalAlpha = k; c.fillStyle = '#2b1a3a'; c.fillRect(-10, -10, G.W + 20, G.H + 20);
  const g = c.createRadialGradient(G.W / 2, G.H / 2, 10, G.W / 2, G.H / 2, G.H * 0.7);
  g.addColorStop(0, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
  c.globalAlpha = k * (1 - Math.abs(k - 0.6)); c.fillStyle = g; c.fillRect(0, 0, G.W, G.H);
  c.restore();
}
function updateTrans(dt) {
  const tr = G.trans; if (!tr) return;
  tr.t += dt;
  if (tr.phase === 'out' && tr.t >= 0.4) {
    G.tasks = []; G.bubbles = []; Dialog.reset(); G.particles = []; G.avoid = []; G.freeze = false; Input.jumpPresses = 0; Voice.stop(true, 'scene');
    try { G.scene = tr.make(); } catch (e) { console.error(e); }
    tr.phase = 'in'; tr.t = 0;
  } else if (tr.phase === 'in' && tr.t >= 0.4) G.trans = null;
}
// ---------- «Поверни телефон» ----------
function drawRotate() {
  const cw = G.cw, ch = G.ch;
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#fff1c9');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  const s = Math.min(cw / 390, ch / 700);
  ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.scale(s, s);
  cloud(ctx, -110, -280, 0.6); cloud(ctx, 120, -230, 0.5);
  woodPanel(ctx, -170, -190, 340, 420, 30, 3);
  ctx.fillStyle = 'rgba(255,250,235,0.95)'; rr(ctx, -150, -170, 300, 380, 22); ctx.fill();
  drawSprite(ctx, IMG.iskra_hero, -70, 40, 190);
  // телефон, поворачивается
  const a = (Math.sin(G.rt * 2) * 0.5 + 0.5) * Math.PI / 2;
  ctx.save(); ctx.translate(70, -40); ctx.rotate(-a);
  ctx.fillStyle = '#3b2412'; rr(ctx, -34, -60, 68, 120, 14); ctx.fill();
  ctx.fillStyle = '#9be7ff'; rr(ctx, -27, -50, 54, 100, 8); ctx.fill();
  ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(70, -40, 84, -2.4, -1.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(70 + Math.cos(-1.2) * 84, -40 + Math.sin(-1.2) * 84); ctx.lineTo(70 + Math.cos(-1.2) * 84 - 16, -40 + Math.sin(-1.2) * 84 - 4); ctx.moveTo(70 + Math.cos(-1.2) * 84, -40 + Math.sin(-1.2) * 84); ctx.lineTo(70 + Math.cos(-1.2) * 84 - 6, -40 + Math.sin(-1.2) * 84 + 14); ctx.stroke();
  txt(ctx, 'Поверни', 0, 105, { size: 46, fill: '#ffd43b', stroke: '#8a4300', sw: 10 });
  txt(ctx, 'телефон', 0, 155, { size: 46, fill: '#ffd43b', stroke: '#8a4300', sw: 10 });
  ctx.restore();
}
// ---------- Главный цикл ----------
let last = 0, acc = 0;
const STEP = 1 / 120;
function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts / 1000; let dt = Math.min(0.1, now - (last || now)); last = now;
  G.rt += dt;
  if (G.portrait) { drawRotate(); return; }
  dt *= G.timeScale;
  acc += dt; let steps = 0;
  while (acc >= STEP && steps < 24) { acc -= STEP; steps++; G.t += STEP; if (G.scene && !G.trans || (G.trans && G.trans.phase === 'in')) G.scene.update(STEP); updateTrans(STEP); }
  if (steps >= 24) acc = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2b1a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(G.scale * G.dpr, 0, 0, G.scale * G.dpr, G.ox * G.dpr, G.oy * G.dpr);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, G.W, G.H); ctx.clip();
  if (G.scene) G.scene.draw(ctx);
  G.panelRect = null;
  drawTrans(ctx);
  ctx.restore();
}
// ---------- API для автотестов ----------
window.__game = {
  state() {
    const S = G.scene; const o = { scene: S ? S.constructor.name : null, seed: G.seed, assertFails: G.assertFails.slice(), voiceMissing: Voice.missing.slice(), voicePlayed: Voice.played.length, trans: !!G.trans, freeze: G.freeze, W: G.W, H: G.H };
    if (S && S.isPlay) {
      o.level = S.n; o.p = { x: S.p.x, y: S.p.y, vx: S.p.vx, vy: S.p.vy, onGround: S.p.onGround, hidden: S.p.hidden };
      o.cam = { x: S.cam.x, y: S.cam.y }; o.zoom = G.zoom; o.hud = S.hud.text;
      o.ff = S.ffGot; o.ffTotal = S.ffTotal; o.secret = S.secretFound; o.stars = S.stars || null; o.nQ = S.nQ; o.firstTry = S.firstTry;
      o.ride = S.p.ride ? S.p.ride.constructor.name : null;
      if (S.raft) o.raft = { x: S.raft.x, top: S.raft.topY(), state: S.raft.state, side: S.raft.side };
      const rides = (S.raft ? [S.raft] : []).concat(S.carts || []);
      o.rides = rides.map(r => ({ kind: r.constructor.name, x: r.x, xa: r.xa, xb: r.xb, w: r.w, top: r.topY(), state: r.state, side: r.side }));
      o.goal = S.def.goal ? S.def.goal(S) : null; o.wp = S.wp ? { x: S.wp.x, y: S.wp.y, got: S.wp.got } : null;
      o.solved = S.solved; o.topStarted = !!S.topStarted;
      if (S.lift) o.lift = { y: S.lift.yy, state: S.lift.state }; o.board = S.board ? S.board.text : null; o.done = S.done; o.card = !!S.card;
      o.q = S.q ? { answer: S.q.answer, choices: S.q.choices.slice(), tries: S.q.tries, solved: S.q.solved, locked: S.q.locked, blocks: S.q.blocks.map(b => ({ v: b.value, tx: b.tx, ty: b.ty })) } : null;
      o.math = S.math || null;
      if (S.lamps) o.lit = S.lamps.filter(l => l.lit).length;
      if (S.basket) { o.basket = S.basket.count; o.basketDrawn = S.basket.slots(S.basket.count).length; o.stolen = S.stolen; o.held = S.sh ? S.sh.drawnBuns() : 0; o.shBunRects = S.sh ? S.sh.bunRects().length : 0; }
      if (S.phase) o.phase = S.phase;
      if (S.stations) o.stations = S.stations.map(s => ({ started: s.started, done: s.done, X0: s.X0, E: s.E, lit: s.lamps ? s.lamps.filter(l => l.lit).length : null, rack: s.rack ? s.rack.count() : null }));
      if (S.windows) o.windows = S.windows.filter(w => w.lit).length;
      o.bubbles = G.bubbles.map(b => b.text);
      o.demo = !!S.demo;
    }
    return o;
  },
  setVel(vx, vy) { const S = G.scene; if (S && S.isPlay) { S.p.vx = vx; S.p.vy = vy; S.p.onGround = false; } },
  // аудит «ничего не висит в воздухе»: низ каждого предмета против поверхности под ним (допуск 2px)
  groundAudit() {
    const S = G.scene; if (!S || !S.isPlay) return null;
    const L = S.L, out = [], TOL = 2;
    const pad = (im, h) => (im ? 1.5 * h / im.height : 0); // прозрачная кромка спрайтов (1–2 px исходника)
    const props = L.props || [];
    const surf = (x, y) => {
      let best = supportBelow(L, x, y - 12);
      for (const pr of props) if (x >= pr.x0 && x <= pr.x1 && pr.y >= y - 12 && pr.y < best.y) best = { y: pr.y, t: 'prop:' + pr.name };
      return best;
    };
    const add = (kind, x, bottom, opts = {}) => {
      const xs = opts.feet ? [x - opts.feet, x, x + opts.feet] : [x];
      const ss = xs.map(xx => surf(xx, bottom));
      const sy = Math.min(...ss.map(q => q.y));
      const lo = opts.embed ? -TOL : -TOL, hi = opts.embed ? opts.embed : TOL;
      const diff = Math.round((bottom - sy) * 10) / 10; // >0 утоплен, <0 висит
      const allFeet = ss.every(q => Math.abs(q.y - sy) <= TOL); // все точки опоры на одной поверхности
      out.push({ kind, x: Math.round(x), bottom: Math.round(bottom * 10) / 10, surface: sy, onto: String(ss[1] ? ss[1].t : ss[0].t), diff, ok: diff >= lo && diff <= hi && allFeet && sy <= L.pxH });
    };
    for (const e of L.ents) {
      const n = e.constructor.name;
      if (e.audit) { e.audit(add, out, L); continue; }
      if (n === 'Lantern') { const im = e.lit ? IMG.t_lamp_on : IMG.t_lamp_off; add('фонарь', e.x, e.y + 2 - pad(im, e.h), { feet: 12 }); }
      else if (n === 'NPC') { if (e.alpha > 0 && !(e.cheerT > 0) && !(e.hop > 0)) add(NPC_NAME[e.kind] || e.kind, e.x, e.y + 2 - pad(e.im, e.drawH), { feet: 14 }); }   // прыжок «ура» длится 1 с и приземляется
      else if (n === 'BakeRack') add('тележка с булочками (колёса)', e.x, e.y, { feet: e.W / 2 - 34 });
      else if (n === 'Flag') add(e.finish ? 'флаг финиша' : 'флажок', e.x - 10, e.y + 2 - pad(IMG.t_flag, e.finish ? 190 : 112));
      else if (n === 'Basket') add('корзина', e.x, e.y - pad(IMG.t_basket, 157), { feet: 40 });
      else if (n === 'Gate') add('ворота', e.x, e.y);
      else if (n === 'Bouncer') add(e.kind === 'loaf' ? 'каравай на доске' : e.kind === 'sack' ? 'мешок муки' : 'стог сена', e.x, e.y, { feet: e.w / 2 - 14 });
      else if (n === 'GoldLantern') { const im = IMG.t_lamp_on, hh = e.h * im.height / 231; add('золотой фонарь', e.x, e.y + 2 - pad(im, hh), { feet: 10 }); }
      else if (n === 'Puddle') add('лужа', e.x, e.y, { feet: (e.x1 - e.x0) / 2 - 8 });
      else if (n === 'GustZone') add('ветровой рукав (столбик)', e.x, e.yG);
      else if (n === 'StationWall') add('стена с фонарями', e.x, e.ground, { feet: (e.x1 - e.x0) / 2 - 10 });
      else if (n === 'Raft') {
        // плот держится на воде: середина брёвен на уровне воды, под ним нет земли, он между берегами
        const wy = L.pxH - 46, lc = e.logCenterY(), x0 = e.x - e.w / 2, x1 = e.x + e.w / 2;
        let clear = true; for (let xx = x0 + 4; xx <= x1 - 4; xx += 16) { const sb = supportBelow(L, xx, e.topY() - 4); if (sb.t !== 'water') clear = false; }
        const okR = Math.abs(lc - wy) <= 6 && clear && e.x >= e.xa - 0.5 && e.x <= e.xb + 0.5;
        out.push({ kind: 'плот', x: Math.round(e.x), bottom: Math.round(lc), surface: wy, onto: 'вода (середина брёвен ' + Math.round(lc - wy) + ' px от уровня воды)', diff: Math.round((lc - wy) * 10) / 10, ok: okR });
      } else if (n === 'Lift') {
        // корзина висит на верёвке: блок прикручен к стене маяка, верёвка натянута, корзина ровно под блоком
        const cx = tc(13) - 32, top = tx(12), bot = tx(44), wHalf = 180 + (230 - 180) * (e.pulleyY - top) / (bot - top);
        const rope = e.ringY() - (e.pulleyY + 17);
        const okL = Math.abs(e.x - cx) < 1 && e.pulleyY > top && e.pulleyY < bot && Math.abs(e.x - cx) < wHalf && rope >= 8 && e.yy >= e.yTop - 0.5 && e.yy <= e.yBot + 0.5;
        out.push({ kind: 'корзина подъёмника', x: Math.round(e.x), bottom: Math.round(e.yy), surface: Math.round(e.pulleyY), onto: 'верёвка ' + Math.round(rope) + ' px от блока на стене маяка', diff: 0, ok: okL });
      }
    }
    for (const d of L.deco) { const im = IMG[d.img]; add(d.img === 't_bush' ? 'куст' : 'забор', d.x, d.y + (d.dy || 0) - pad(im, d.w * im.height / im.width), { embed: 10 }); }
    // ящики и каменные блоки: под ними должна быть опора
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const t = L.get(x, y);
      if (t === T_CRATE) { const b = L.get(x, y + 1); out.push({ kind: 'ящик', x: x * TILE, bottom: (y + 1) * TILE, surface: (y + 1) * TILE, onto: String(b), diff: 0, ok: isSolidT(b) }); }
    }
    // доски: у каждой не меньше двух свай, и каждая свая доходит до опоры
    const runs = plankRuns(L), sup = plankSupports(L);
    for (const r of runs) {
      const ss = sup.filter(q => q.run.x0 === r.x0 && q.run.row === r.row);
      const reach = ss.every(q => q.bottom >= q.ground);
      out.push({ kind: 'доска ' + r.x0 + '–' + r.x1 + ' ряд ' + r.row, x: r.x0 * TILE, bottom: r.row * TILE, surface: ss.length ? Math.max(...ss.map(q => q.ground)) : null, onto: ss.length + ' кам. опор(ы) → ' + [...new Set(ss.map(q => String(q.onto)))].join(','), diff: 0, ok: ss.length >= (r.x1 - r.x0 <= 2 ? 1 : 2) && reach && ss.every(q => q.x > r.x0 * TILE && q.x < r.x1 * TILE) });
    }
    // каменные уступы без опоры снизу должны держаться на подкосах (уровень 4)
    const struts = S.struts || [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_STONE || L.get(x - 1, y) === T_STONE) continue;
      let x2 = x; while (L.get(x2, y) === T_STONE) x2++;
      let grounded = false; for (let k = x; k < x2; k++) { const b = L.get(k, y + 1); if (isSolidT(b) || b === T_STONE) grounded = true; }
      const held = struts.filter(q => q.x >= x * TILE - 2 && q.x <= x2 * TILE + 2 && Math.abs(q.y - (y + 1) * TILE) < 3).length;
      out.push({ kind: 'камень ' + x + '–' + x2 + ' ряд ' + y, x: x * TILE, bottom: (y + 1) * TILE, surface: null, onto: grounded ? 'опора снизу' : held + ' подкоса', diff: 0, ok: grounded || held >= 1 });
    }
    // блоки с ответами: висят на цепочках на раме, рама стоит на двух столбах на земле
    for (const e of L.ents) if (e instanceof NumBlock && !e.dead) {
      const f = e.frame;
      if (!f) { out.push({ kind: 'блок ' + e.value + ' БЕЗ РАМЫ', x: e.x, bottom: e.y, surface: null, onto: '-', diff: 0, ok: false }); continue; }
      const sL = supportBelow(L, f.xL, f.beamY + 40).y, sR = supportBelow(L, f.xR, f.beamY + 40).y;
      const ok = Math.abs(f.gL - sL) <= TOL && Math.abs(f.gR - sR) <= TOL && Math.abs(f.gL - f.gR) <= TOL && f.gL <= L.pxH && f.beamY + 24 < e.y && e.x > f.xL && e.x < f.xR;
      out.push({ kind: 'блок ' + e.value + ' на цепочках', x: Math.round(e.x), bottom: Math.round(e.y), surface: f.gL, onto: 'рама: столбы ' + Math.round(f.xL) + '/' + Math.round(f.xR) + ' стоят на ' + sL + '/' + sR + ', цепочки ' + Math.round(e.y - f.beamY - 24) + 'px', diff: Math.round((f.gL - sL) * 10) / 10, ok });
    }
    // булочки лежат на противнях, противни стоят на поверхности
    for (const e of L.ents) if (e instanceof BunTray) add('противень', e.x, e.y, { feet: (e.x1 - e.x0) / 2 - 12 });
    for (const e of L.ents) if (e instanceof Bun && !e.taken) {
      const tray = L.ents.find(t => t instanceof BunTray && e.x >= t.x0 && e.x <= t.x1);
      const surf0 = tray ? tray.top : supportBelow(L, e.x, e.y - 12).y;
      const diff = Math.round((e.y - surf0) * 10) / 10;
      out.push({ kind: 'булочка', x: Math.round(e.x), bottom: e.y, surface: surf0, onto: tray ? 'противень' : 'поверхность', diff, ok: Math.abs(diff) <= TOL });
    }
    if (S.ovenX) { add('печка', S.ovenX, tx(10), { feet: 100 }); for (const sx of [tx(16) + 30, tx(16) + 76, tx(54) + 30, tx(81) + 20, tx(101) + 40]) add('мешок муки', sx, tx(10), { feet: 26 }); }
    // Искра стоит на земле
    if (S.p.onGround && !S.p.ride) add('Искра', S.p.x, S.p.y + 1 - pad(IMG.iskra_idle, ISKRA_H), { feet: 10 });
    return { level: S.n + 1, items: out, fails: out.filter(o => !o.ok) };
  },
  teleport(x, y) { const S = G.scene; if (!S || !S.isPlay) return; S.p.x = x; S.p.y = y; S.p.vx = 0; S.p.vy = 0; S.p.ride = null; S.p.carry = 0; },
  teleportTile(c, r) { this.teleport(c * TILE + TILE / 2, r * TILE); },
  answer(v) { const S = G.scene; if (!S || !S.q) return false; const b = S.q.blocks.find(b => b.value === v); if (!b) return false; S.onBump(b.tx, b.ty); return true; },
  solve() { const S = G.scene; if (!S || !S.q) return false; return this.answer(S.q.answer); },
  wrong() { const S = G.scene; if (!S || !S.q) return false; const v = S.q.choices.find(c => c !== S.q.answer); return this.answer(v); },
  start(n) { G.trans = null; goScene(() => new PlayScene(n)); },
  scene(name) { goScene(() => name === 'map' ? new MapScene() : name === 'finale' ? new FinaleScene() : name === 'prologue' ? new PlayScene(PROLOGUE) : new TitleScene()); },
  unlockAll() { try { localStorage.setItem('vz_plat_progress', String(LEVELS.length)); } catch (_) { } },
  resetProgress() { try { localStorage.removeItem('vz_plat_progress'); } catch (_) { } Prog.reset(); },
  setProgress(n, stars, secrets, seen, ff, ffMax) { try { localStorage.setItem('vz_plat_progress', String(n)); if (ff) localStorage.setItem('vz_plat_ff', JSON.stringify(ff)); if (ffMax) localStorage.setItem('vz_plat_ffmax', JSON.stringify(ffMax)); if (stars) localStorage.setItem('vz_plat_stars', JSON.stringify(stars)); if (secrets) localStorage.setItem('vz_plat_secret', JSON.stringify(secrets)); if (seen !== undefined) localStorage.setItem('vz_plat_seen', String(seen)); } catch (_) { } },
  ffPositions() { const S = G.scene; return S && S.fflies ? S.fflies.filter(f => !f.dead).map(f => f.pos()) : []; },
  goldPos() { const S = G.scene; return S && S.gold ? { x: S.gold.x, y: S.gold.y, found: S.gold.found } : null; },
  bouncers() { const S = G.scene; return S && S.bouncers ? S.bouncers.map(b => ({ x: b.x, y: b.y, top: b.topY(), n: b.n })) : []; },
  hold(key, ms) { return new Promise(r => { Input.k[key] = true; if (key === 'jump') Input.jumpPresses++; setTimeout(() => { Input.k[key] = false; r(); }, ms); }); },
  setTimeScale(s) { G.timeScale = s; },
  lightAll() { const S = G.scene; if (S && S.lamps) for (const l of S.lamps) if (!l.lit) S.teleportLamp = l; },
  ui() { return G.ui.map(u => ({ x: u.x, y: u.y, w: u.w, h: u.h, id: u.id })); },
  toScreen(x, y) { return { x: x * G.scale + G.ox, y: y * G.scale + G.oy }; },
  worldToScreen(x, y) { const S = G.scene; return this.toScreen((x - S.cam.x) * G.zoom, (y - S.cam.y) * G.zoom); },
  lampPositions() { const S = G.scene; return S && S.lamps ? S.lamps.map(l => ({ x: l.x, y: l.y, lit: l.lit })) : []; },
  bunPositions() { const S = G.scene; return S && S.buns ? S.buns.map(b => ({ x: b.x, y: b.y, taken: b.taken })) : []; },
  trays() { const S = G.scene; return S && S.trays ? S.trays.map(t => ({ x0: t.x0, x1: t.x1, y: t.y })) : []; },
  basketPos() { const S = G.scene; return S && S.basket ? { x: S.basket.x, y: S.basket.y } : null; },
  flagPos() { const S = G.scene; return S && S.flag ? { x: S.flag.x, y: S.flag.y } : (S && S.bigLamp ? { x: S.bigLamp.x, y: S.bigLamp.y } : null); },
  ledges() { const S = G.scene; return S && S.ledges ? S.ledges.map(l => ({ row: l.row, x0: l.x0, x1: l.x1 })) : null; },
  // проверка видимости считаемого прямо сейчас (без записи в FAILS) + журнал проверок, которые игра делает сама
  visCheck() { const S = G.scene; if (!S || !S.isPlay) return null; const r = S.visCheck(false); return { settled: !!S.cam.settled, zoom: G.zoom, res: r }; },
  visLog() { return (G.visLog || []).slice(); },
  voice() { return { missing: Voice.missing.slice(), played: Voice.played.slice(), cur: Voice.cur, paused: Voice.el ? Voice.el.paused : null, src: Voice.el ? Voice.el.src : null, muted: G.muted }; },
  stations() { const S = G.scene; return S && S.stations ? S.stations.map(s => ({ x0: s.x0 })) : null; },
};
// ---------- Старт ----------
function loadOptionalLogo() {
  // если рядом лежит assets/logo.png — берём его для заголовка, иначе рисуем буквы шрифтом
  if (typeof HAS_LOGO === 'undefined' || !HAS_LOGO) return Promise.resolve();
  return new Promise(res => { const im = new Image(); im.onload = () => { IMG.logo = im; res(); }; im.onerror = () => res(); im.src = 'assets/logo.png'; });
}
(async function boot() {
  try {
    await Promise.all([loadImages(), loadOptionalLogo(), document.fonts ? Promise.all([document.fonts.load(font(40, 400)), document.fonts.load(font(40, 900)), document.fonts.load('400 40px "Pangolin"', 'Десять 0123456789')]).then(() => document.fonts.ready) : Promise.resolve()]);
    if (document.fonts && !document.fonts.check('40px "Pangolin"')) console.error('шрифт Pangolin не загрузился');
  } catch (e) { console.error(e); }
  G.scene = URLP.get('level') === 'p' ? new PlayScene(PROLOGUE) : URLP.has('level') ? new PlayScene(clamp(+URLP.get('level') - 1, 0, LEVELS.length - 1)) : new TitleScene();
  window.__game.ready = true;
  requestAnimationFrame(frame);
})();
