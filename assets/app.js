/* EquationMotion — client-side animated equation renderer.
   No uploads: everything renders in the browser. */

const state = {
  steps: [
    { tex: String.raw`\text{Why does } e^{i\pi} = -1\text{?}`, accent: false },
    { tex: String.raw`e^{i\theta} = \cos\theta + i\sin\theta`, accent: false },
    { tex: String.raw`\theta = \pi \;\Rightarrow\; e^{i\pi} = \cos\pi + i\sin\pi`, accent: false },
    { tex: String.raw`= -1 + 0i`, accent: false },
    { tex: String.raw`\boxed{e^{i\pi} + 1 = 0}`, accent: true }
  ],
  fontSize: 64,
  width: 1920,
  height: 1080,
  theme: 'dark',            // dark | light | transparent
  accent: '#5ee0c8',
  mode: 'cumulative',       // cumulative | replace
  writeDur: 1.5,
  holdDur: 0.9,
  reveal: 'write',          // write | fade | slide
  title: '',
  watermark: true,
  dim: false
};

/* ---------------- MathJax → glyph paths ---------------- */

const glyphCache = new Map();   // tex -> parsed equation
let measureSvg = null;

function ensureMeasureSvg() {
  if (measureSvg) return measureSvg;
  const ns = 'http://www.w3.org/2000/svg';
  measureSvg = document.createElementNS(ns, 'svg');
  measureSvg.setAttribute('width', '0');
  measureSvg.setAttribute('height', '0');
  measureSvg.style.cssText = 'position:absolute;left:-9999px;top:0;';
  document.body.appendChild(measureSvg);
  return measureSvg;
}

const bboxCache = new Map();
function pathBBox(d) {
  if (bboxCache.has(d)) return bboxCache.get(d);
  const svg = ensureMeasureSvg();
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  let bb;
  try { bb = p.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: 0, height: 0 }; }
  svg.removeChild(p);
  const box = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
  bboxCache.set(d, box);
  return box;
}

function looksLikeTex(s) {
  return /[\\^_{}]/.test(s) || /\\[a-zA-Z]+/.test(s);
}

function normalizeTex(s) {
  const t = (s || '').trim();
  if (!t) return null;
  if (looksLikeTex(t)) return t;
  // plain text → render as upright text, escaping TeX specials
  const esc = t.replace(/([\\{}^_$%&#])/g, '\\$1');
  return String.raw`\text{${esc}}`;
}

/* Minimal SVG transform-list parser → 2D affine matrix {a,b,c,d,e,f}.
   DOMMatrix cannot parse SVG attribute syntax, so we do it ourselves. */
const IDENT = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function mul(m, n) {
  // m · n  (apply n first, then m)
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f
  };
}

function parseTransform(str) {
  let m = { ...IDENT };
  if (!str) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let hit;
  while ((hit = re.exec(str))) {
    const args = hit[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let t = { ...IDENT };
    switch (hit[1]) {
      case 'matrix':
        t = { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] };
        break;
      case 'translate':
        t.e = args[0] || 0; t.f = args[1] || 0;
        break;
      case 'scale': {
        const sx = args[0], sy = args.length > 1 ? args[1] : sx;
        t.a = sx; t.d = sy;
        break;
      }
      case 'rotate': {
        const rad = (args[0] || 0) * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        t = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
        if (args.length === 3) {
          const cx = args[1], cy = args[2];
          t = mul({ ...IDENT, e: cx, f: cy }, mul(t, { ...IDENT, e: -cx, f: -cy }));
        }
        break;
      }
      case 'skewX':
        t.c = Math.tan((args[0] || 0) * Math.PI / 180);
        break;
      case 'skewY':
        t.b = Math.tan((args[0] || 0) * Math.PI / 180);
        break;
    }
    m = mul(m, t);
  }
  return m;
}

function ctm(el, root) {
  let m = { ...IDENT };
  let node = el;
  while (node && node !== root) {
    const t = node.getAttribute && node.getAttribute('transform');
    if (t) m = mul(parseTransform(t), m);
    node = node.parentNode;
  }
  return m;
}

function parseTex(tex) {
  if (glyphCache.has(tex)) return glyphCache.get(tex);
  const node = MathJax.tex2svg(tex, { display: true, em: 16, ex: 8 });
  const svg = node.querySelector('svg');
  if (!svg) throw new Error('MathJax produced no svg');
  const vb = (svg.getAttribute('viewBox') || '0 0 1000 1000').split(/[\s,]+/).map(Number);
  const defs = new Map();
  svg.querySelectorAll('defs path').forEach(p => defs.set(p.id, p.getAttribute('d')));

  const glyphs = [];
  svg.querySelectorAll('use').forEach(u => {
    const href = u.getAttribute('href') || u.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || u.getAttribute('xlink:href') || '';
    const id = href.replace(/^#/, '');
    const d = defs.get(id);
    if (!d) return;
    const m = ctm(u, svg);
    const bb = pathBBox(d);
    glyphs.push({ d, m, bb });
  });

  // reading order: left → right, then top → bottom (in rendered space)
  const sx = g => g.m.e + g.m.a * g.bb.x + g.m.c * g.bb.y;
  const sy = g => g.m.f + g.m.b * g.bb.x + g.m.d * g.bb.y;
  glyphs.sort((a, b) => (sx(a) - sx(b)) || (sy(a) - sy(b)));

  const res = {
    glyphs,
    vbX: vb[0], vbY: vb[1], vbW: vb[2], vbH: vb[3],
    path2d: new Map()
  };
  glyphCache.set(tex, res);
  return res;
}

function path2dOf(eq, d) {
  let p = eq.path2d.get(d);
  if (!p) { p = new Path2D(d); eq.path2d.set(d, p); }
  return p;
}

/* ---------------- timeline ---------------- */

function timeline() {
  const out = [];
  let t = 0;
  for (let i = 0; i < state.steps.length; i++) {
    const start = t;
    const write = state.writeDur;
    const hold = state.holdDur;
    out.push({ start, writeEnd: start + write, end: start + write + hold });
    t += write + hold;
  }
  return out;
}
const totalDuration = () => {
  const tl = timeline();
  return tl.length ? tl[tl.length - 1].end : 0;
};

function stepProgress(tl, i, t) {
  const s = tl[i];
  if (!s) return 0;
  if (t <= s.start) return 0;
  return Math.min(1, (t - s.start) / (s.writeEnd - s.start));
}
function stepVisible(tl, i, t) {
  return t > tl[i].start;
}
function currentStep(tl, t) {
  for (let i = tl.length - 1; i >= 0; i--) if (t >= tl[i].start) return i;
  return 0;
}

/* ---------------- renderer ---------------- */

const THEMES = {
  dark: { bg: '#0b0d12', ink: '#f2f6ff', sub: '#8ea0bb' },
  light: { bg: '#fbfaf7', ink: '#13161c', sub: '#5c6472' },
  transparent: { bg: null, ink: '#f2f6ff', sub: '#8ea0bb' }
};

function themeOf() { return THEMES[state.theme] || THEMES.dark; }

function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

function measureAll() {
  return state.steps.map(s => {
    const tex = normalizeTex(s.tex);
    if (!tex) return null;
    try {
      const eq = parseTex(tex);
      const scale = state.fontSize / 1000;      // MathJax SVG: 1000 units = 1em
      return { eq, scale, w: eq.vbW * scale, h: eq.vbH * scale };
    } catch (e) {
      return { error: e.message, tex };
    }
  });
}

function drawFrame(ctx, W, H, t) {
  const th = themeOf();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (th.bg) { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }
  ctx.restore();

  const metas = measureAll();
  const tl = timeline();
  const pad = Math.round(W * 0.07);
  const maxW = W - pad * 2;
  const cur = currentStep(tl, t);

  // per-step fit
  const items = [];
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    if (!m || m.error) continue;
    const k = Math.min(1, maxW / Math.max(1, m.w));
    items.push({ i, m, k, w: m.w * k, h: m.h * k });
  }
  if (!items.length) return;

  const gap = state.fontSize * 0.55;
  const visible = state.mode === 'cumulative'
    ? items.filter(o => stepVisible(tl, o.i, t))
    : items.filter(o => o.i === cur);

  const totalH = visible.reduce((a, o) => a + o.h, 0) + gap * Math.max(0, visible.length - 1);

  // camera: fit visible block, blend in after each step start
  const availH = H * 0.74;
  // never zoom past 1:1 (keeps the type size the user chose); only shrink to fit
  const fit = h => Math.max(0.35, Math.min(1, availH / Math.max(1, h)));
  const camTarget = fit(totalH);
  const s = tl[cur] ? Math.min(1, ((t - tl[cur].start) / 0.45)) : 1;
  const camPrev = state.mode === 'cumulative' && cur > 0
    ? fit(itemHeight(metas, tl, cur - 1, gap, maxW))
    : camTarget;
  const cam = camPrev + (camTarget - camPrev) * easeInOut(Math.min(1, s));

  let y = (H - totalH * cam) / 2;
  const cx = W / 2;

  for (const o of visible) {
    const p = stepProgress(tl, o.i, t);
    const alphaIn = state.mode === 'replace'
      ? (1 - Math.max(0, (t - tl[o.i].writeEnd - state.holdDur * 0.15) / (state.holdDur * 0.6)))
      : 1;
    const alpha = Math.max(0, Math.min(1, alphaIn));
    // dim earlier steps slightly in cumulative mode
    const dim = (state.mode === 'cumulative' && state.dim) ? (o.i === cur ? 1 : 0.55) : 1;
    drawStep(ctx, t, o, cx, y, cam, p, alpha * dim, th, pad);
    y += (o.h * cam) + gap * cam;
  }

  if (state.title) {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = th.sub;
    ctx.font = `600 ${Math.round(H * 0.032)}px -apple-system, "Segoe UI", "PingFang SC", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(state.title, pad, Math.round(H * 0.09));
    ctx.restore();
  }
  if (state.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = th.sub;
    ctx.font = `500 ${Math.round(H * 0.019)}px -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('equationmotion', W - pad, H - Math.round(H * 0.05));
    ctx.restore();
  }
}

function itemHeight(metas, tl, upto, gap, maxW) {
  let h = 0, n = 0;
  for (let i = 0; i <= upto; i++) {
    const m = metas[i];
    if (!m || m.error) continue;
    const k = Math.min(1, maxW / Math.max(1, m.w));
    h += m.h * k; n++;
  }
  return h + gap * Math.max(0, n - 1);
}

function drawStep(ctx, t, o, cx, topY, cam, progress, alpha, th, pad) {
  const eq = o.m.eq;
  const scale = o.m.scale * o.k * cam;
  const x0 = cx - (o.m.w * o.k * cam) / 2;
  const originX = x0 - eq.vbX * scale;
  const originY = topY - eq.vbY * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = state.steps[o.i].accent ? state.accent : th.ink;

  // reveal styles
  let wipe = 1, dy = 0, fade = 1;
  if (state.reveal === 'write') wipe = progress;
  else if (state.reveal === 'fade') fade = easeInOut(progress);
  else if (state.reveal === 'slide') { fade = Math.min(1, progress * 1.8); dy = (1 - easeInOut(progress)) * 26 * cam; }

  ctx.globalAlpha = alpha * fade;
  ctx.translate(0, dy);

  const wipeEdge = x0 + (o.m.w * o.k * cam) * wipe;

  for (const g of eq.glyphs) {
    // screen bbox
    const bx0 = originX + g.bb.x * scale;
    const bx1 = originX + (g.bb.x + g.bb.w) * scale;
    const by0 = originY + g.bb.y * scale;
    const by1 = originY + (g.bb.y + g.bb.h) * scale;

    if (wipe < 1) {
      if (bx0 >= wipeEdge) continue;
      if (bx1 > wipeEdge) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, wipeEdge, ctx.canvas.height);
        ctx.clip();
        fillGlyph(ctx, eq, g, originX, originY, scale);
        ctx.restore();
        continue;
      }
    }
    fillGlyph(ctx, eq, g, originX, originY, scale);
    void by0; void by1;
  }
  ctx.restore();
}

function fillGlyph(ctx, eq, g, originX, originY, scale) {
  ctx.save();
  ctx.transform(scale, 0, 0, scale, originX, originY);
  ctx.transform(g.m.a, g.m.b, g.m.c, g.m.d, g.m.e, g.m.f);
  ctx.fill(path2dOf(eq, g.d));
  ctx.restore();
}

/* ---------------- UI wiring ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let canvas, ctx, playing = false, playStart = 0, playT0 = 0, rafId = 0, curTime = 0;

function initCanvas() {
  canvas = $('#stage');
  ctx = canvas.getContext('2d', { alpha: true });
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); requestRender(); });
}

function resizeCanvas() {
  const W = state.width, H = state.height;
  canvas.width = W; canvas.height = H;
  const wrapW = canvas.parentElement.clientWidth || 800;
  canvas.style.width = wrapW + 'px';
  canvas.style.height = (wrapW * H / W) + 'px';
}

function requestRender() { drawFrame(ctx, canvas.width, canvas.height, curTime); syncTransport(); }

function syncTransport() {
  const total = totalDuration();
  $('#total').textContent = fmt(total);
  $('#now').textContent = fmt(curTime);
  $('#seek').value = String(total ? Math.round((curTime / total) * 1000) : 0);
}

function fmt(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}

function play() {
  if (playing) return;
  playing = true;
  playStart = performance.now();
  playT0 = curTime >= totalDuration() ? 0 : curTime;
  curTime = playT0;
  $('#play').textContent = 'Pause';
  tick();
}
function pause() {
  playing = false;
  cancelAnimationFrame(rafId);
  $('#play').textContent = 'Play';
}
function tick() {
  if (!playing) return;
  const el = (performance.now() - playStart) / 1000;
  curTime = playT0 + el;
  const total = totalDuration();
  if (curTime > total) { curTime = total; drawFrame(ctx, canvas.width, canvas.height, curTime); syncTransport(); pause(); return; }
  drawFrame(ctx, canvas.width, canvas.height, curTime);
  syncTransport();
  rafId = requestAnimationFrame(tick);
}

function renderStepsUI() {
  const box = $('#steps');
  box.innerHTML = '';
  state.steps.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'step';
    el.innerHTML = `
      <div class="idx">${i + 1}</div>
      <textarea rows="2" spellcheck="false"></textarea>
      <div class="tools">
        <button class="icon-btn" title="Toggle accent colour" data-act="accent" style="color:${s.accent ? state.accent : ''}">◆</button>
        <button class="icon-btn" title="Duplicate" data-act="dup">＋</button>
        <button class="icon-btn danger" title="Delete" data-act="del">✕</button>
      </div>`;
    const ta = el.querySelector('textarea');
    ta.value = s.tex;
    ta.addEventListener('input', () => { s.tex = ta.value; requestRender(); });
    el.querySelector('[data-act=accent]').addEventListener('click', (e) => {
      s.accent = !s.accent;
      e.currentTarget.style.color = s.accent ? state.accent : '';
      requestRender();
    });
    el.querySelector('[data-act=dup]').addEventListener('click', () => {
      state.steps.splice(i + 1, 0, { tex: s.tex, accent: s.accent });
      renderStepsUI(); requestRender();
    });
    el.querySelector('[data-act=del]').addEventListener('click', () => {
      if (state.steps.length <= 1) return;
      state.steps.splice(i, 1);
      renderStepsUI(); requestRender();
    });
    box.appendChild(el);
  });
}

function bindControls() {
  $('#addStep').addEventListener('click', () => {
    state.steps.push({ tex: '', accent: false });
    renderStepsUI();
    const box = $('#steps');
    box.scrollTop = box.scrollHeight;
    box.lastElementChild.querySelector('textarea').focus();
  });

  $('#fontSize').addEventListener('input', e => { state.fontSize = +e.target.value; $('#fontSizeVal').textContent = e.target.value; requestRender(); });
  $('#writeDur').addEventListener('input', e => { state.writeDur = +e.target.value; $('#writeVal').textContent = (+e.target.value).toFixed(1) + 's'; requestRender(); });
  $('#holdDur').addEventListener('input', e => { state.holdDur = +e.target.value; $('#holdVal').textContent = (+e.target.value).toFixed(1) + 's'; requestRender(); });
  $('#accentColor').addEventListener('input', e => { state.accent = e.target.value; renderStepsUI(); requestRender(); });
  $('#titleInput').addEventListener('input', e => { state.title = e.target.value; requestRender(); });
  $('#revealSel').addEventListener('change', e => { state.reveal = e.target.value; requestRender(); });
  $('#modeSel').addEventListener('change', e => { state.mode = e.target.value; requestRender(); });
  $('#watermark').addEventListener('change', e => { state.watermark = e.target.checked; requestRender(); });
  $('#dimPrev').addEventListener('change', e => { state.dim = e.target.checked; requestRender(); });

  $$('[data-theme]').forEach(b => b.addEventListener('click', () => {
    state.theme = b.dataset.theme;
    $$('[data-theme]').forEach(x => x.classList.toggle('primary', x === b));
    requestRender();
  }));

  $$('[data-res]').forEach(b => b.addEventListener('click', () => {
    const [w, h] = b.dataset.res.split('x').map(Number);
    state.width = w; state.height = h;
    $$('[data-res]').forEach(x => x.classList.toggle('primary', x === b));
    resizeCanvas(); requestRender();
  }));

  $('#play').addEventListener('click', () => playing ? pause() : play());
  $('#seek').addEventListener('input', e => {
    pause();
    curTime = totalDuration() * (+e.target.value / 1000);
    drawFrame(ctx, canvas.width, canvas.height, curTime);
    syncTransport();
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('textarea,input,select')) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') { pause(); curTime = Math.min(totalDuration(), curTime + 0.2); requestRender(); }
    if (e.code === 'ArrowLeft') { pause(); curTime = Math.max(0, curTime - 0.2); requestRender(); }
  });

  $('#copyLink').addEventListener('click', async () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    const url = location.origin + location.pathname + '#s=' + payload;
    try { await navigator.clipboard.writeText(url); setStatus('Share link copied (contains your steps).'); }
    catch { setStatus('Copy failed — select the URL from the address bar after loading #s=…'); }
    location.hash = 's=' + payload;
  });

  $('#resetDemo').addEventListener('click', () => {
    location.href = location.pathname;
  });
}

function setStatus(msg) { $('#status').textContent = msg; }

function loadFromHash() {
  const m = location.hash.match(/^#s=(.+)$/);
  if (!m) return;
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    Object.assign(state, obj);
  } catch (e) { /* ignore */ }
}

/* ---------------- exports ---------------- */

const FPS = 30;

function makeOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function renderAt(c, t) {
  const cx = c.getContext('2d', { alpha: true });
  drawFrame(cx, c.width, c.height, t);
}

async function exportPngZip() {
  const btn = $('#exportPng');
  btn.disabled = true;
  setStatus('Rendering PNG frames…');
  const total = totalDuration();
  const frames = Math.max(1, Math.round(total * FPS));
  const c = makeOffscreen(state.width, state.height);
  const zip = new JSZip();
  for (let i = 0; i <= frames; i++) {
    const t = (i / frames) * total;
    renderAt(c, t);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    zip.file(`frame_${String(i).padStart(4, '0')}.png`, blob);
    if (i % 10 === 0) setStatus(`Rendering PNG frames… ${i}/${frames}`);
  }
  zip.file('README.txt', `EquationMotion frame sequence\n${state.width}x${state.height} @ ${FPS}fps, ${frames + 1} frames, ${total.toFixed(2)}s\nPNG frames keep alpha — drop them into Premiere / DaVinci / After Effects.\n`);
  setStatus('Zipping…');
  const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  download(out, `equationmotion_${state.width}x${state.height}_${FPS}fps.zip`);
  setStatus(`Done: ${frames + 1} PNG frames (with alpha).`);
  btn.disabled = false;
}

async function exportWebm() {
  const btn = $('#exportWebm');
  btn.disabled = true;
  if (!window.MediaRecorder) { setStatus('This browser has no MediaRecorder — use the PNG sequence.'); btn.disabled = false; return; }
  const total = totalDuration();
  const fps = FPS;
  const frames = Math.max(1, Math.round(total * fps));
  const c = makeOffscreen(state.width, state.height);
  const stream = c.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) { setStatus('No WebM encoder in this browser — use the PNG sequence.'); btn.disabled = false; return; }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise(res => { rec.onstop = res; });
  rec.start();
  for (let i = 0; i <= frames; i++) {
    renderAt(c, (i / frames) * total);
    if (track.requestFrame) track.requestFrame();
    if (i % 15 === 0) setStatus(`Encoding WebM… ${Math.round((i / frames) * 100)}%`);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }
  rec.stop();
  await done;
  download(new Blob(chunks, { type: mime }), `equationmotion_${state.width}x${state.height}.webm`);
  setStatus(`Done: WebM (${mime.replace('video/webm;codecs=', '')}) — background baked in, no alpha.`);
  btn.disabled = false;
}

async function exportGif() {
  const btn = $('#exportGif');
  btn.disabled = true;
  if (!window.GIF) { setStatus('GIF encoder not loaded — check your network and retry.'); btn.disabled = false; return; }
  const W = Math.min(state.width, 960), H = Math.round(W * state.height / state.width);
  const c = makeOffscreen(W, H);
  const total = totalDuration();
  const fps = 12, frames = Math.max(1, Math.round(total * fps));
  setStatus('Rendering GIF frames…');
  const gif = new GIF({ workers: 2, quality: 8, width: W, height: H, workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js', transparent: state.theme === 'transparent' ? '0x00ff00' : null });
  const tmp = makeOffscreen(W, H);
  for (let i = 0; i <= frames; i++) {
    const t = (i / frames) * total;
    const cx2 = tmp.getContext('2d');
    cx2.clearRect(0, 0, W, H);
    if (state.theme === 'transparent') { cx2.fillStyle = '#00ff00'; cx2.fillRect(0, 0, W, H); }
    // scale the frame down by drawing through an intermediate canvas
    renderAt(c, t);
    cx2.drawImage(c, 0, 0, W, H);
    gif.addFrame(cx2, { copy: true, delay: Math.round(1000 / fps) });
    if (i % 10 === 0) setStatus(`Rendering GIF frames… ${i}/${frames}`);
  }
  gif.on('finished', b => {
    download(b, `equationmotion_${W}x${H}.gif`);
    setStatus('Done: GIF.');
    btn.disabled = false;
  });
  gif.on('abort', () => { setStatus('GIF export aborted.'); btn.disabled = false; });
  setStatus('Encoding GIF…');
  gif.render();
}

function exportPoster() {
  const c = makeOffscreen(state.width, state.height);
  const last = state.steps.length - 1;
  const moment = timeline()[last] ? timeline()[last].writeEnd + 0.05 : totalDuration();
  renderAt(c, Math.min(moment, totalDuration()));
  c.toBlob(b => download(b, `equationmotion_poster_${state.width}x${state.height}.png`), 'image/png');
  setStatus('Poster PNG saved.');
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ---------------- boot ---------------- */

async function boot() {
  loadFromHash();
  if (!window.MathJax || !MathJax.startup) {
    document.addEventListener('MathJaxReady', boot, { once: true });
    return;
  }
  await MathJax.startup.promise;
  initCanvas();
  renderStepsUI();
  bindControls();
  $('#fontSize').value = state.fontSize;
  $('#fontSizeVal').textContent = state.fontSize;
  $('#writeDur').value = state.writeDur; $('#writeVal').textContent = state.writeDur.toFixed(1) + 's';
  $('#holdDur').value = state.holdDur; $('#holdVal').textContent = state.holdDur.toFixed(1) + 's';
  $('#accentColor').value = state.accent;
  $('#titleInput').value = state.title;
  $('#revealSel').value = state.reveal;
  $('#modeSel').value = state.mode;
  $('#watermark').checked = state.watermark;
  $('#dimPrev').checked = !!state.dim;
  $$('[data-theme]').forEach(x => x.classList.toggle('primary', x.dataset.theme === state.theme));
  $$('[data-res]').forEach(x => x.classList.toggle('primary', x.dataset.res === `${state.width}x${state.height}`));
  $('#exportPng').addEventListener('click', exportPngZip);
  $('#exportWebm').addEventListener('click', exportWebm);
  $('#exportGif').addEventListener('click', exportGif);
  $('#exportPoster').addEventListener('click', exportPoster);
  curTime = totalDuration();   // show the finished frame on load
  requestRender();
  window.__EM_READY__ = true;
}

window.addEventListener('error', e => {
  const el = document.getElementById('status');
  if (el) el.textContent = 'Error: ' + (e.message || e.error);
});
window.addEventListener('unhandledrejection', e => {
  const el = document.getElementById('status');
  if (el) el.textContent = 'Error: ' + (e.reason && e.reason.message || e.reason);
});
window.addEventListener('load', () => {
  if (window.MathJax && MathJax.startup) MathJax.startup.promise.then(boot);
  else setTimeout(boot, 200);
});
