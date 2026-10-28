/* v0.1.3.3 slab-phone gate: node test/gate-slab.js <webkit|chromium> [url]
   Single-screen phones get the phone layouts only: the cover pattern in portrait and the Counter in short landscape.
   Two panes and the inner-portrait density (html.duo-inner, __DUO__, __INNERP__) are for big screens only, decided by
   the device screen (tools/build.sh). WebKit runs as an iPhone, Chromium as an Android phone; each context sets the
   device screen (Playwright's screen option, which drives screen.width/height and the device-width media features).
   For every size, portrait and landscape (both rotations), default and 200% text, with that phone's safe areas:
   every day of every sample, Undo, Week and progress (both tabs), More, Update plan with the keyboard up and down,
   Import confirm, About, the start date prompt and the replace plan prompt. Each state must have: nothing clipped,
   no two controls or text runs overlapping, nothing in the safe areas that scrolling cannot move out, targets at least
   44x44, body text at least 15px, no horizontal scroll, dialogs and Undo fully inside the clear zone, and only the
   phone modes. The Duo controls (inner 669x951, cover 382x678) must still get their modes. Mutation: the v0.1.3.2
   width-only table must fail the mode check. */
const L = require("./lib");
const http = require("http");
const { rows, rec, fails } = L.makeRec();
const B = "b-4day-upper-lower", A = "a-3day-beginner-full-body";
const AUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
/* [name, portrait w, h, portrait insets {t,b}, landscape inset {side, b}] CSS px, full screen */
const IPHONE = [["se", 375, 667, { t: 20, b: 0 }, { s: 0, b: 0 }], ["13mini", 375, 812, { t: 50, b: 34 }, { s: 50, b: 21 }],
  ["14", 390, 844, { t: 47, b: 34 }, { s: 47, b: 21 }], ["16", 393, 852, { t: 59, b: 34 }, { s: 59, b: 21 }],
  ["16pro", 402, 874, { t: 62, b: 34 }, { s: 62, b: 21 }], ["air", 420, 912, { t: 59, b: 34 }, { s: 59, b: 21 }],
  ["16promax", 440, 956, { t: 62, b: 34 }, { s: 62, b: 21 }]];
const ANDROID = [["galaxy-s", 360, 800, { t: 24, b: 0 }, { s: 0, b: 0, t: 24 }], ["galaxy", 360, 780, { t: 24, b: 0 }, { s: 0, b: 0, t: 24 }],
  ["pixel", 412, 915, { t: 24, b: 0 }, { s: 0, b: 0, t: 24 }]];
/* the layout rule lives in the head script, between the WANT and END markers; mutations swap its body */
const MQ = {};
const WANT = /\/\*WANT\*\/[\s\S]*?\/\*END\*\//g;
const withRule = (html, body) => html.replace(WANT, () => "/*WANT*/" + body + "/*END*/");
const J = o => JSON.stringify(o, (k, v) => typeof v === "number" ? Math.round(v * 10) / 10 : v);

/* one probe for every state: atoms are controls (and day rows) and runs of text outside controls */
function probe(arg) {
  const { ins, scope, kb, box, mq } = arg, W = innerWidth, H = innerHeight;
  const vv = window.visualViewport, vb = vv ? vv.offsetTop + vv.height : H;
  const zone = { l: ins.l, r: W - ins.r, t: ins.t, b: kb ? Math.min(H, vb) : H - ins.b };
  const root = document.querySelector(scope) || document.body;
  const CTRL = "button, a[href], input:not([type=hidden]):not([type=file]), select, textarea, [role=button], [role=tab], [data-strip], [data-skip]";
  const shown = e => { if (!e.getClientRects().length) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === "hidden" || c.display === "none" || parseFloat(c.opacity) === 0) return false; } return true; };
  const clipOf = e => { let r = { l: 0, t: 0, r: W, b: H }, hard = null; const mine = e.getBoundingClientRect();
    for (let x = e.parentElement; x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x); if (c.position === "fixed") { /* stop at the fixed box after applying it */ }
      if (/(hidden|clip|auto|scroll)/.test(c.overflowX + c.overflowY)) { const b = x.getBoundingClientRect(); r = { l: Math.max(r.l, b.left + x.clientLeft), t: Math.max(r.t, b.top + x.clientTop), r: Math.min(r.r, b.left + x.clientLeft + x.clientWidth), b: Math.min(r.b, b.top + x.clientTop + x.clientHeight) };
        if (/(hidden|clip)/.test(c.overflowX + c.overflowY) && !/(auto|scroll)/.test(c.overflowX + c.overflowY) && !hard) { if (mine.left < b.left - 1 || mine.right > b.right + 1 || mine.top < b.top - 1 || mine.bottom > b.bottom + 1) hard = x.id || x.className || x.tagName; } }
      if (c.position === "fixed") break; }
    return { r, hard }; };
  /* how far scrolling could still move this element (up, down) */
  const slack = e => { let up = 0, down = 0, fixed = false; for (let x = e.parentElement; x; x = x.parentElement) { const c = getComputedStyle(x);
      if (c.position === "fixed") { fixed = true; }
      const sc = x === document.body ? null : (/(auto|scroll)/.test(c.overflowY) || x === document.scrollingElement) ? x : null;
      if (sc && !(fixed && x === document.scrollingElement)) { up += sc.scrollTop; down += sc.scrollHeight - sc.clientHeight - sc.scrollTop; }
      if (c.position === "fixed") break; }
    return { up, down }; };
  const textRect = e => { let u = null; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) { if (!r.width || !r.height) continue; u = u ? { l: Math.min(u.l, r.left), t: Math.min(u.t, r.top), r: Math.max(u.r, r.right), b: Math.max(u.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom }; } } return u; };
  const name = e => (e.id ? "#" + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")) + " '" + (e.textContent || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 18) + "'";
  /* the one designed truncation: the Counter kicker at large text ends in an ellipsis before Back to today shrinks
     (Designer, v0.1.3.3 Counter spec). Reported separately, never counted as clipping. */
  const designedEllipsis = e => !!e.closest("html.counter.lg-text #paneToday .today-top .kicker");
  /* scrolled content passing under a pinned header is covered by the header's own surface, not an overlap */
  const pinnedOf = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === "sticky" || p === "fixed") return x; } return null; };
  const atoms = [];
  const srOnly = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x), b = x.getBoundingClientRect();
      if ((c.clip && c.clip !== "auto") || (c.clipPath && c.clipPath !== "none" && /inset\(50%|inset\(100%/.test(c.clipPath)) || (c.position === "absolute" && b.width <= 1 && b.height <= 1)) return true; } return false; };
  for (const e of root.querySelectorAll("*")) {
    if (!shown(e) || srOnly(e)) continue;
    const ctl = e.matches(CTRL), inCtl = e.parentElement && e.parentElement.closest(CTRL);
    if (inCtl && root.contains(inCtl)) continue;
    let r = null, kind = null;
    if (ctl) { const b = e.getBoundingClientRect(); r = { l: b.left, t: b.top, r: b.right, b: b.bottom }; kind = "ctl"; }
    else { r = textRect(e); kind = "text"; }
    if (!r || r.r - r.l < 1 || r.b - r.t < 1) continue;
    const cl = clipOf(e), v = { l: Math.max(r.l, cl.r.l), t: Math.max(r.t, cl.r.t), r: Math.min(r.r, cl.r.r), b: Math.min(r.b, cl.r.b) };
    if (v.r - v.l < 1 || v.b - v.t < 1) continue; /* scrolled out of its box or off screen */
    atoms.push({ e, kind, r, v, hard: cl.hard });
  }
  const bad = { clip: [], overlap: [], inset: [], target: [], small: [] };
  for (const a of atoms) {
    const e = a.e, c = getComputedStyle(e);
    if (a.hard && !designedEllipsis(e)) bad.clip.push(name(e) + " in " + a.hard);
    if (/(hidden|clip)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 1 && a.kind === "text" && !designedEllipsis(e)) bad.clip.push(name(e) + " truncated");
    /* the safe areas: sideways never; up and down only where scrolling can move it out */
    const s = slack(e);
    if (a.v.l < zone.l - 0.5 || a.v.r > zone.r + 0.5) bad.inset.push(name(e) + " x " + Math.round(a.v.l) + "-" + Math.round(a.v.r));
    if (a.r.t < zone.t - 0.5 && s.up < zone.t - a.r.t - 1) bad.inset.push(name(e) + " top " + Math.round(a.r.t));
    if (a.r.b > zone.b + 0.5 && s.down < a.r.b - zone.b - 1) bad.inset.push(name(e) + " bottom " + Math.round(a.r.b) + ">" + Math.round(zone.b));
    if (a.kind === "ctl" && (a.r.r - a.r.l < 43.5 || a.r.b - a.r.t < 43.5)) bad.target.push(name(e) + " " + Math.round(a.r.r - a.r.l) + "x" + Math.round(a.r.b - a.r.t));
    const fs = parseFloat(c.fontSize), txt = (e.textContent || "").trim();
    /* reading text: a run of words (25+ characters). Small print is exempt: field labels, the page footer, the About
       footer and version line, exercise names (the Counter's fitted floor is 14px) */
    const print = e.closest("footer, .about-foot, .field > span, .ex-name, .ex-sets");
    if (a.kind === "text" && txt.length >= 25 && /\s\S+\s/.test(txt) && fs < 15 - 0.05 && !print) bad.small.push(name(e) + " " + fs);
  }
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const a = atoms[i], b = atoms[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ox = Math.min(a.v.r, b.v.r) - Math.max(a.v.l, b.v.l), oy = Math.min(a.v.b, b.v.b) - Math.max(a.v.t, b.v.t);
    /* line boxes of stacked text and a control's padding touch by a few px: count an overlap only past a quarter of the smaller atom */
    const mh = Math.min(a.v.b - a.v.t, b.v.b - b.v.t), mw = Math.min(a.v.r - a.v.l, b.v.r - b.v.l);
    if (!(ox > Math.max(1, mw * 0.25) && oy > Math.max(1, mh * 0.25))) continue;
    const pa = pinnedOf(a.e), pb = pinnedOf(b.e);
    if (pa !== pb) { const cx = (Math.max(a.v.l, b.v.l) + Math.min(a.v.r, b.v.r)) / 2, cy = (Math.max(a.v.t, b.v.t) + Math.min(a.v.b, b.v.b)) / 2, hit = document.elementFromPoint(cx, cy);
      const under = (pin, other) => { if (!(pin && !pin.contains(other.e) && hit && pin.contains(hit) && !other.e.contains(hit))) return false; const s = slack(other.e); return s.up > 0 || s.down > 0; }; /* a pinned top header or a pinned bottom bar (the Counter actions): scrolling brings the covered run out */
      if (under(pa, b) || under(pb, a)) continue; }
    bad.overlap.push(name(a.e) + " / " + name(b.e));
  }
  let boxOk = null;
  if (box) { const e = document.querySelector(box), r = e && shown(e) ? e.getBoundingClientRect() : null;
    boxOk = r ? { in: r.left >= zone.l - 0.5 && r.right <= zone.r + 0.5 && r.top >= zone.t - 0.5 && r.bottom <= zone.b + 0.5, r: [r.left, r.top, r.right, r.bottom], zone } : { in: false, missing: box }; }
  const h = document.documentElement, cs = getComputedStyle(h);
  const mode = { counter: h.classList.contains("counter"), duoInner: h.classList.contains("duo-inner"), duo: h.classList.contains("L-duo"), innerp: h.classList.contains("L-innerp"),
    twoPane: (() => { const a = document.getElementById("paneToday"), b = document.getElementById("planPane"); if (!a || !b) return false; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return shown(b) && y.width > 0 && x.width > 0 && Math.abs(x.top - y.top) < 60 && (y.left >= x.right - 1 || x.left >= y.right - 1); })() };
  return { n: atoms.length, bad, boxOk, mode, hs: document.scrollingElement.scrollWidth - innerWidth, W, H, zone };
}

function serveHtml(html) {
  const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}

(async () => {
  const argv = process.argv.slice(2), T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine);
  const android = engine === "chromium", DEV = android ? ANDROID : IPHONE, ua = android ? AUA : L.UA;
  const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
  const BIG = "html{font-size:200%!important}";
  async function page(u, w, h, scr, ins, big, opts = {}) {
    const ctx = await L.context(b, engine, w, h, Object.assign({ seed: L.seedFor(B), screen: scr, ua, dark: true }, opts));
    const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(u + (opts.hash || "")); await p.waitForTimeout(350);
    const css = `:root{--safe-t:${ins.t}px !important;--safe-b:${ins.b}px !important;--safe-l:${ins.l}px !important;--safe-r:${ins.r}px !important}` + (big ? BIG : "");
    await p.addStyleTag({ content: css }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(350);
    return { ctx, p, W };
  }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(220); };
  const safeTap = async (p, s) => { try { await tap(p, s); return true; } catch (e) { return false; } };
  const openMore = async p => {
    if (!(await p.evaluate(() => document.getElementById("app").classList.contains("sheet-open")))) { await safeTap(p, "#openPlan"); await p.waitForTimeout(350); }
    if ((await p.evaluate(() => document.getElementById("btnMore").getAttribute("aria-expanded"))) !== "true") { await safeTap(p, "#btnMore"); await p.waitForTimeout(220); } };
  const okBackup = Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21" } }));
  const imp = async (p, buf) => { const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 6000 }), tap(p, "#btnImport")]); await fc.setFiles({ name: "backup.json", mimeType: "application/json", buffer: buf }); await p.waitForTimeout(450); };
  const toTop = p => p.evaluate(() => { document.scrollingElement.scrollTop = 0; document.querySelectorAll("*").forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); });

  const summary = [], uniq = {}, undoAway = [];
  for (const [dev, pw0, ph0, pins, lins] of DEV) for (const orient of ["portrait", "landscape-left", "landscape-right"]) for (const big of [false, true]) {
    if (ONLY.length && !ONLY.includes(dev)) continue;
    const land = orient !== "portrait", w = land ? ph0 : pw0, h = land ? pw0 : ph0, scr = { width: w, height: h };
    const ins = land ? { t: lins.t || 0, b: lins.b, l: orient === "landscape-left" ? lins.s : 0, r: orient === "landscape-right" ? lins.s : 0 } : { t: pins.t, b: pins.b, l: 0, r: 0 };
    const size = `${dev} ${w}x${h} ${orient}${big ? " 200%" : ""}`;
    const fl = {}; let states = 0;
    const note = (state, g, extra) => { states++;
      for (const k of Object.keys(g.bad)) if (g.bad[k].length) { (fl[k] = fl[k] || []).push(state + ": " + g.bad[k].slice(0, 3).join("; ")); for (const x of g.bad[k]) { const key = k + " " + x.replace(/ [\d.x>-]+$/, ""); uniq[key] = uniq[key] || size + " / " + state + " / " + x; } }
      if (g.hs > 0) (fl.hscroll = fl.hscroll || []).push(state + ": " + g.hs);
      const m = g.mode, okMode = !m.duoInner && !m.duo && !m.innerp && !m.twoPane && (land && !(big && w < 700) ? m.counter : !m.counter); /* changed on Designer request, 2026-10-27: 200% text under 700 wide is the single column */
      if (!okMode) (fl.mode = fl.mode || []).push(state + ": " + J(m));
      if (g.boxOk && !g.boxOk.in) (fl.box = fl.box || []).push(state + ": " + J(g.boxOk));
      if (extra) (fl[extra[0]] = fl[extra[0]] || []).push(state + ": " + extra[1]); };
    const P = (p, state, scope, o = {}) => p.evaluate(probe, { ins, scope: scope || "#app", kb: !!o.kb, box: o.box || null, mq: MQ }).then(g => { note(state, g); return g; });
    let err = [];
    { const { ctx, p, W } = await page(url, w, h, scr, ins, big);
      /* every day of every sample */
      for (const s of L.SAMPLES) {
        await p.evaluate(sd => { localStorage.clear(); for (const k in sd) localStorage.setItem("ct1-" + k, JSON.stringify(sd[k])); }, L.seedFor(s));
        await p.reload(); await p.waitForTimeout(300);
        await p.addStyleTag({ content: `:root{--safe-t:${ins.t}px !important;--safe-b:${ins.b}px !important;--safe-l:${ins.l}px !important;--safe-r:${ins.r}px !important}` + (big ? BIG : "") });
        await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(250);
        const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length);
        for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
          await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120); await toTop(p); await P(p, `${s.split("-")[0]} day ${i}`); }
      }
      /* Undo: Skip on the selected day, the toast must sit fully in the clear zone and be tappable */
      await p.evaluate(() => { const t = document.querySelector('#weekStrip [data-strip="4"]'); t && t.scrollIntoView({ block: "nearest" }); }); await safeTap(p, '#weekStrip [data-strip="4"]');
      /* the cover pattern never scrolls on show (LEARNINGS: a pinned bottom group always covers the card); the slot
         follows the card, so it may sit a short scroll away. Record whether it showed in view, then scroll it in. */
      await safeTap(p, "#today [data-skip]:visible"); await p.waitForTimeout(400);
      /* v0.1.4: "in view" is the whole toast, not only its button: a toast whose button shows but whose
         bottom pokes out of the clear zone is a short scroll away too. The assertion below is unchanged. */
      const inView = await p.evaluate(ins => { const t = document.getElementById("toastUndo"); if (!t || !t.getClientRects().length) return false; const s = t.closest(".toast") || t, r = s.getBoundingClientRect(); return r.top >= ins.t - 0.5 && r.bottom <= innerHeight - ins.b + 0.5; }, ins);
      if (!inView) { undoAway.push(size); await p.evaluate(() => document.getElementById("toastSlot").scrollIntoView({ block: "nearest" })); await p.waitForTimeout(250); }
      const u = await p.evaluate(ins => { const t = document.getElementById("toastUndo"); if (!t || !t.getClientRects().length) return null; const r = t.getBoundingClientRect(), s = document.querySelector(".toast.show") || t.closest("[class*=toast]"), sr = s.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { r: [r.left, r.top, r.right, r.bottom], toast: [sr.left, sr.top, sr.right, sr.bottom], top: !!hit && (hit === t || t.contains(hit)), W: innerWidth, H: innerHeight }; }, ins);
      const uOk = !!u && u.top && u.toast[0] >= ins.l - 0.5 && u.toast[2] <= u.W - ins.r + 0.5 && u.toast[1] >= ins.t - 0.5 && u.toast[3] <= u.H - ins.b + 0.5 && u.r[2] - u.r[0] >= 43.5 && u.r[3] - u.r[1] >= 43.5;
      if (!uOk) (fl.undo = fl.undo || []).push(J(u));
      await P(p, "undo showing");
      await p.locator("#toastUndo").tap().catch(() => {}); await p.waitForTimeout(200);
      /* Week and progress, both tabs */
      await safeTap(p, "#openPlan"); await p.waitForTimeout(400); await toTop(p); await P(p, "week page", ".pane-plan");
      await safeTap(p, '#tabs [data-tab="progress"]'); await p.waitForTimeout(250); await toTop(p); await P(p, "progress tab", ".pane-plan");
      await safeTap(p, '#tabs [data-tab="train"]'); await p.waitForTimeout(200);
      /* More */
      await openMore(p); await p.evaluate(() => document.getElementById("moreRow").scrollIntoView({ block: "nearest" })); await p.waitForTimeout(150); await P(p, "more", ".pane-plan");
      /* Update plan, keyboard down, up, down */
      await safeTap(p, "#btnUpdate"); await p.waitForTimeout(350); await P(p, "update plan", "#updBox", { box: "#updBox" });
      const kb = land ? Math.round(h * 0.55) : Math.round(h * 0.42);
      await p.focus("#updCode"); await p.waitForTimeout(150); await p.setViewportSize({ width: w, height: h - kb }); await p.waitForTimeout(500);
      const k = await p.evaluate(() => { const vv = visualViewport, lo = vv.offsetTop, hi = vv.offsetTop + vv.height, f = document.getElementById("updCode").getBoundingClientRect(), u = document.getElementById("updUse").getBoundingClientRect();
        return { lo, hi, field: [f.top, f.bottom], use: [u.top, u.bottom], counter: document.documentElement.classList.contains("counter") }; });
      if (!(k.field[0] >= k.lo - 0.5 && k.field[1] <= k.hi + 0.5 && k.use[1] <= k.hi + 0.5 && k.counter === (land && !(big && w < 700)))) (fl.keyboard = fl.keyboard || []).push(J(k));
      await P(p, "update plan, keyboard up", "#updBox", { kb: true });
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(900);
      await P(p, "update plan, keyboard down", "#updBox", { box: "#updBox" });
      await safeTap(p, "#updCancel"); await p.waitForTimeout(250);
      /* Import confirm */
      await openMore(p); await imp(p, okBackup);
      const kind = await p.evaluate(() => document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind);
      if (kind !== "import") (fl.dialogs = fl.dialogs || []).push("import confirm did not open: " + kind); else await P(p, "import confirm", "#dlg", { box: "#dlg" });
      await p.keyboard.press("Escape"); await p.waitForTimeout(250);
      /* About */
      await openMore(p); await safeTap(p, "#btnAbout"); await p.waitForTimeout(350);
      const ab = await p.evaluate(() => document.documentElement.classList.contains("about-open"));
      if (!ab) (fl.dialogs = fl.dialogs || []).push("About did not open"); else { await toTop(p); await P(p, "about", "#aboutPage");
        await p.evaluate(() => { const a = document.getElementById("aboutPage"); a.scrollTop = a.scrollHeight; }); await p.waitForTimeout(100); await P(p, "about, end", "#aboutPage"); }
      await safeTap(p, "#aboutClose"); await p.waitForTimeout(200);
      err = err.concat(W.errs); await ctx.close(); }
    { const { ctx, p, W } = await page(url, w, h, scr, ins, big, { seed: L.seedFor(B, { startDate: null }) });
      const kind = await p.evaluate(() => document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind);
      if (kind !== "start") (fl.dialogs = fl.dialogs || []).push("start date prompt: " + kind); else await P(p, "start date prompt", "#dlg", { box: "#dlg" });
      err = err.concat(W.errs); await ctx.close(); }
    { const { ctx, p, W } = await page(url, w, h, scr, ins, big, { hash: "#p=" + L.code(L.norm(L.readSample(A))) });
      await p.waitForTimeout(250);
      const kind = await p.evaluate(() => document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind);
      if (kind !== "replace") (fl.dialogs = fl.dialogs || []).push("replace prompt: " + kind); else await P(p, "replace plan prompt", "#dlg", { box: "#dlg" });
      err = err.concat(W.errs); await ctx.close(); }
    if (err.length) fl.errors = err.slice(0, 3);
    const names = { mode: "phone modes only (cover in portrait, the Counter in landscape; no duo-inner, __DUO__, __INNERP__ or two panes)", inset: "nothing in the safe areas that scrolling cannot move out",
      clip: "nothing clipped or truncated", overlap: "no two controls or text runs overlap", target: "targets >= 44x44", small: "body text >= 15px", hscroll: "no horizontal scroll",
      box: "dialogs fully on screen, inside the clear zone", undo: "Undo fully inside the clear zone, on top, >= 44x44", keyboard: "Update plan with the keyboard up: field and Use this plan in the visible viewport, no layout flip",
      dialogs: "every dialog and page opens", errors: "no errors" };
    for (const k of Object.keys(names)) rec(size, `${names[k]} (${states} states)`, !fl[k], fl[k] ? J(fl[k].slice(0, 4)) : "");
    summary.push([size, Object.keys(fl).filter(k => fl[k]).join(",") || "ok"]);
  }

  /* the Duo controls: the same build still gives the Duo its modes when the screen says Duo */
  for (const [w, h, scr, want] of [[669, 951, { width: 669, height: 951 }, "inner portrait: duo-inner + __INNERP__, one column"], [951, 669, { width: 951, height: 669 }, "inner landscape: duo-inner + two panes"],
    [951, 585, { width: 951, height: 669 }, "inner landscape, Safari visible: duo-inner + two panes"], [382, 678, { width: 382, height: 678 }, "cover portrait: cover"], [678, 382, { width: 678, height: 382 }, "cover landscape: the Counter"]]) {
    const { ctx, p } = await page(url, w, h, scr, { t: 0, b: 0, l: 0, r: 0 }, false, { ua: undefined });
    const g = await p.evaluate(probe, { ins: { t: 0, b: 0, l: 0, r: 0 }, scope: "#app", kb: false, box: null, mq: MQ }), m = g.mode;
    const ok = w === 669 ? m.duoInner && m.innerp && !m.duo && !m.counter : w === 951 ? m.duoInner && m.duo && m.twoPane && !m.counter : w === 382 ? !m.duoInner && !m.duo && !m.counter : !m.duoInner && !m.duo && m.counter;
    rec(`duo ${w}x${h} screen ${scr.width}x${scr.height}`, want, ok, J(m)); await ctx.close();
  }

  /* the Duo inner screen when Safari misreports the device screen (the real-device v0.1.3.3 bug): the cover's screen, a
     phone's screen, or a stale rotation. The inner sizes must still get their modes from the window alone. */
  const MIS = [[951, 669], [951, 585], [669, 951], [669, 751], [669, 835]], SCR = [{ width: 382, height: 678 }, { width: 678, height: 382 }, { width: 393, height: 852 }];
  const misCheck = async (u, tag) => { let bad = []; for (const [w, h] of MIS) for (const scr of SCR) {
      const { ctx, p } = await page(u, w, h, scr, { t: 0, b: 0, l: 0, r: 0 }, false, { ua: undefined });
      const m = (await p.evaluate(probe, { ins: { t: 0, b: 0, l: 0, r: 0 }, scope: "#app", kb: false, box: null, mq: MQ })).mode;
      const ok = w === 669 ? m.duoInner && m.innerp && !m.duo && !m.counter : m.duoInner && m.duo && m.twoPane && !m.counter;
      if (tag) rec(`duo ${w}x${h} screen misreported ${scr.width}x${scr.height}`, w === 669 ? "inner portrait: duo-inner + __INNERP__" : "inner landscape: two panes", ok, J(m));
      if (!ok) bad.push(`${w}x${h}@${scr.width}x${scr.height}`); await ctx.close(); } return bad; };
  await misCheck(url, true);
  {     const S = await serveHtml(withRule(L.fs.readFileSync(L.path.join(L.ROOT, "index.html"), "utf8"), 'var s = Math.min(screen.width, screen.height); return s >= 600 ? (w >= 820 ? "duo" : (ht > w && w >= 600 ? "innerp" : "phone")) : "phone";'));
    const bad = await misCheck(S.url, false); S.close();
    rec("mutation", `the v0.1.3.3 device-screen rule fails the misreported-screen check (${bad.length}/${MIS.length * SCR.length}: ${bad.slice(0, 4).join(" ")})`, bad.length > 0 && bad.some(x => x.startsWith("951x669")));
    console.log(`MUTATION device-screen-only rule: fails ${bad.length}/${MIS.length * SCR.length}`); }

  /* opened folded, then unfolded (and back), on one page: the layout follows live; and it freezes while a text field
     has focus, switching only after the field lets go (plus 700ms) */
  { const Z = { t: 0, b: 0, l: 0, r: 0 }, cls = p => p.evaluate(() => ["duo-inner", "L-duo", "L-innerp", "counter"].filter(c => document.documentElement.classList.contains(c)).join(",") || "phone");
    const { ctx, p } = await page(url, 382, 678, { width: 382, height: 678 }, Z, false, { ua: undefined });
    const steps = [[951, 585, "duo-inner,L-duo"], [669, 751, "duo-inner,L-innerp"], [382, 678, "phone"], [678, 382, "counter"], [951, 669, "duo-inner,L-duo"]];
    for (const [w, h, want] of steps) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(450);
      const got = await cls(p), two = (await p.evaluate(probe, { ins: Z, scope: "#app", kb: false, box: null, mq: MQ })).mode.twoPane;
      rec("duo fold/unfold", `opened folded at 382x678, now ${w}x${h}: ${want}${want.includes("L-duo") ? ", two panes" : ""}`, got === want && (want.includes("L-duo") ? two : !two), got + " twoPane=" + two); }
    await p.evaluate(() => { const i = document.createElement("input"); i.id = "freezeProbe"; document.body.appendChild(i); i.focus(); });
    await p.setViewportSize({ width: 382, height: 678 }); await p.waitForTimeout(450);
    rec("duo fold/unfold", "a focused text field freezes the layout through a fold (still two panes)", (await cls(p)) === "duo-inner,L-duo", await cls(p));
    await p.evaluate(() => document.getElementById("freezeProbe").blur()); await p.waitForTimeout(300);
    const mid = await cls(p); await p.waitForTimeout(700); let after = await cls(p); for (let k = 0; k < 10 && after !== "phone"; k++) { await p.waitForTimeout(200); after = await cls(p); } /* timers run late on a loaded machine */
    rec("duo fold/unfold", "after the field lets go: unchanged for 700ms, then the phone layout", mid === "duo-inner,L-duo" && after === "phone", mid + " -> " + after);
    await ctx.close(); }

  /* mutation: the v0.1.3.2 width-only table (COVER max-width 819, DUO min-width 820) must fail the mode check */
  { const mut = withRule(L.fs.readFileSync(L.path.join(L.ROOT, "index.html"), "utf8"), 'return w >= 820 ? "duo" : (w >= 600 && ht > w ? "innerp" : "phone");');
    const S = await serveHtml(mut); let n = 0, f = 0; const which = [];
    for (const [dev, pw0, ph0] of DEV) for (const land of [false, true]) { const w = land ? ph0 : pw0, h = land ? pw0 : ph0;
      const { ctx, p } = await page(S.url, w, h, { width: w, height: h }, { t: 0, b: 0, l: 0, r: 0 }, false);
      const m = (await p.evaluate(probe, { ins: { t: 0, b: 0, l: 0, r: 0 }, scope: "#app", kb: false, box: null, mq: { DUO: "(min-width: 820px)", INNERP: "(min-width: 600px) and (max-width: 819px) and (orientation: portrait)" } })).mode;
      n++; if (m.duo || m.twoPane || m.innerp || (land && !m.counter)) { f++; which.push(`${w}x${h}`); } await ctx.close(); }
    S.close();
    rec("mutation", `the v0.1.3.2 width-only table fails the phone-mode check (${f}/${n} sizes: ${which.join(" ")})`, f > 0 && which.includes(android ? "915x412" : "844x390"));
    console.log(`MUTATION width-only table: fails ${f}/${n} (${which.join(" ")})`);
  }
  console.log(`UNDO below the fold after Skip (scrolled in, then checked): ${undoAway.length} configs: ${undoAway.join(", ")}`);
  console.log(rows.filter(r => r.startsWith("FAIL")).join("\n"));
  if (process.env.FULL) console.log("UNIQUE\n" + Object.entries(uniq).map(([k, v]) => k + "  <=  " + v).join("\n"));
  console.log("SUMMARY\n" + summary.map(s => s.join("  ")).join("\n"));
  console.log(`${rows.length} checks, ${fails()} failed (${engine})`);
  await b.close(); T.close(); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
