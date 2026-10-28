/* v0.1.4 gate (../review/DESIGNER-v0.1.4-SPECS.md): node test/gate-v014.js <webkit|chromium> [url]
   Plan: test/fixtures/legs-priority.json (5 training days, 2 rest), week 1 from Mon Oct 26 2026, clock Mon 08:10, plus every
   sample for (c). The device's measured sizes: s06 678x466 app (safe 16/79/35), s09 669x951 app (82/20), s07 466x678 app (67/85/20),
   s01 669x867 Safari tab, s751 669x751.
   (a) Week view: one column under an 820px list (669x751, 720x960, s01, s09, s07, 390x844, 951x669, 200% text); every row
       full width with the same left edge, Mon to Sun top to bottom, each top below the previous bottom, no empty column;
       collapsed rows >= 64px, status targets >= 44x44; one day open at a time, the opened day keeps its place and its top
       ends under the page head; the open grows in < 250ms with no bounce, at once under Reduce Motion; a list >= 820px
       wide has two columns with the open day across both, row flow (never dense). Mutation: the v0.1.3.4 two-column grid fails.
   (c) Counter at s06 and 644x382 (100%), and at 200% 812x375 / 844x390 (changed on Designer request, 2026-10-27: 200%
       under 700 wide is the single column, checked at s06, 644x382 and 678x396): every training day of every sample: the list runs to the
       buttons (no reserved slot), the pill only with overflow and then on its own 44px strip, never over a row, tag or
       sets text; N = rows wholly below; hidden while Undo shows and recounted after; hidden only with the list's end in
       view; the focus line shows at normal text. s06 100%: 5 rows fit, no pill, Seated calf raise's ACCESSORY tag whole.
   (d) Inner portrait home (s751, s09, s01, 720x960; 100% and 200%). v0.1.4.3 (owner): no Up next card; the home is
       Today, strip, Week and progress in that order, Week and progress within 16px under the strip (no gap left where
       Up next was), never needing a scroll (at s751 200% as in v0.1.3.4); Week and progress full width at the card
       edges, >= 44px, chevron in 44x44; (the gap under it < 25% of the viewport: RETIRED on Designer ruling 2026-10-27,
       specific to Up next; replaced at s01, s09, 720x960 by calm space: rows not stretched, Today top-anchored, plain
       background under Week and progress, with a flex-grow mutation); no Up next on the days that used to show
       next week's day or "Plan complete after today"; no Up next on s07, phones, the Counter and two panes (rects as in
       v0.1.3.4). */
const L = require("./lib");
const http = require("http"), { execSync } = require("child_process");
const { rows, rec, fails } = L.makeRec();
const PREV_SHA = "ce0e540"; /* v0.1.3.4-preview: (d) leaves every other layout's home rects as they were */
function serveHtml(html) {
  const srv = http.createServer((req, res) => { const u = req.url.split("?")[0];
    if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}
const FIX = L.norm(JSON.parse(L.fs.readFileSync(L.path.join(L.ROOT, "test", "fixtures", "legs-priority.json"), "utf8")));
const NOW = "2026-10-26T08:10:00-05:00";
const seedOf = (plan, extra) => Object.assign({ schema: 1, plan, seen: [], week: 1, startDate: "2026-10-26", done: {}, openDays: {}, lifts: [], body: [], tab: "train", progView: "body" }, extra || {});
const J = o => JSON.stringify(o, (k, v) => typeof v === "number" ? Math.round(v * 10) / 10 : v);
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(n);
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine), PREV = await serveHtml(execSync(`git show ${PREV_SHA}:index.html`, { cwd: L.ROOT }));
  async function page(w, h, o = {}) {
    const ctx = await L.context(b, engine, w, h, { seed: o.seed || seedOf(FIX), dark: true, now: o.now || NOW, standalone: !!o.app, reduce: !!o.reduce });
    const p = await ctx.newPage(), W = L.watch(p); await p.goto(o.url || url); await p.waitForTimeout(400);
    let css = "";
    if (o.safe) css += `:root{--safe-t:${o.safe[0]}px !important;--safe-r:${o.safe[1]}px !important;--safe-b:${o.safe[2]}px !important}`;
    if (o.big) css += "html{font-size:200%!important}";
    if (o.css) css += o.css;
    if (css) { await p.addStyleTag({ content: css }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(450); }
    return { ctx, p, W };
  }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(300); };

  // ---- (a) Week view ----
  const weekProbe = p => p.evaluate(() => {
    const rc = e => e.getBoundingClientRect(), grid = document.querySelector("#panel-train .day-grid"), wrap = document.querySelector("#panel-train .day-wrap");
    const days = Array.from(grid.children).map(e => { const r = rc(e), cb = e.querySelector(".check-btn"), c = cb ? rc(cb) : null;
      const tg = e.querySelector(".day-toggle");
      return { day: e.querySelector(".day-badge").textContent.trim(), open: e.classList.contains("open"), aria: tg ? tg.getAttribute("aria-expanded") === "true" : false, rest: e.classList.contains("rest-day"), l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height, cw: c && c.width, ch: c && c.height }; });
    const head = document.querySelector("#planPane .sheet-head"), hb = head && head.getClientRects().length ? rc(head).bottom : 0;
    return { days, gw: rc(grid).width, gl: rc(grid).left, wrapW: rc(wrap).width, cols: getComputedStyle(grid).gridTemplateColumns.split(" ").length, flow: getComputedStyle(grid).gridAutoFlow, hb, ih: innerHeight };
  });
  const oneCol = g => {
    const d = g.days, bad = [];
    d.forEach((x, i) => { if (Math.abs(x.l - d[0].l) > 0.5) bad.push(x.day + " left"); if (Math.abs((x.r - x.l) - g.gw) > 1) bad.push(x.day + " not full width"); if (i && x.t < d[i - 1].b - 0.5) bad.push(x.day + " top above previous bottom"); });
    return bad;
  };
  const ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  if (on("a")) {
    const SIZES = [["669x751", 669, 751, {}], ["720x960", 720, 960, {}], ["s01 669x867", 669, 867, {}], ["s09 669x951", 669, 951, { app: true, safe: [82, 0, 20] }],
      ["s07 466x678", 466, 678, { app: true, safe: [67, 85, 20] }], ["390x844", 390, 844, {}], ["951x669", 951, 669, {}], ["669x751 200%", 669, 751, { big: true }], ["s09 200%", 669, 951, { app: true, safe: [82, 0, 20], big: true }]];
    for (const [name, w, h, o] of SIZES) {
      const { ctx, p, W } = await page(w, h, o);
      if (await p.locator("#openPlan").isVisible()) await tap(p, "#openPlan");
      await tap(p, '#planPane [data-tab="train"]'); await p.waitForTimeout(250);
      let g = await weekProbe(p);
      rec(name, "(a) the week list is under 820px and one column", g.wrapW < 820 && g.cols === 1, J({ wrapW: g.wrapW, cols: g.cols }));
      rec(name, "(a) Mon to Sun, top to bottom", g.days.map(d => d.day.toUpperCase()).join() === ORDER.join(), g.days.map(d => d.day).join());
      let bad = oneCol(g);
      rec(name, "(a) Mon open: same left edge, full width, each top below the previous bottom, no empty column", bad.length === 0, bad.join(", "));
      rec(name, "(a) Mon is the open day", g.days.filter(d => d.open).map(d => d.day.toUpperCase()).join() === "MON", J(g.days.filter(d => d.open)));
      const small = g.days.filter(d => !d.open && d.h < 64 - 0.5).map(d => d.day + " " + Math.round(d.h));
      rec(name, "(a) collapsed rows >= 64px", small.length === 0, small.join(", "));
      const tgt = g.days.filter(d => d.cw != null && (d.cw < 44 - 0.5 || d.ch < 44 - 0.5)).map(d => d.day);
      rec(name, "(a) status targets >= 44x44", tgt.length === 0, tgt.join(", "));
      /* tap Thu, from a scroll that leaves Thu low on the screen */
      await p.evaluate(() => { const t = document.querySelectorAll("#panel-train .day")[3]; t.scrollIntoView({ block: "end" }); });
      await p.waitForTimeout(250);
      await p.locator("#panel-train .day").nth(3).locator(".day-toggle").tap(); await p.waitForTimeout(500);
      g = await weekProbe(p);
      const thu = g.days[3];
      rec(name, "(a) after tapping Thu: only Thu is open (Mon closed), aria-expanded matches", g.days.filter(d => d.open).map(d => d.day.toUpperCase()).join() === "THU" && g.days.every(d => d.rest || d.aria === d.open), J(g.days.filter(d => d.open).map(d => d.day)));
      bad = oneCol(g);
      rec(name, "(a) Thu open: order kept, same left edge, no overlap", bad.length === 0 && g.days.map(d => d.day.toUpperCase()).join() === ORDER.join(), bad.join(", "));
      rec(name, "(a) Thu's top is in view under the page head", thu.t >= g.hb - 1 && thu.t <= g.ih - 44, J({ top: thu.t, head: g.hb, ih: g.ih }));
      rec(name, "no errors", W.errs.length === 0, W.errs.join(" | "));
      await ctx.close();
    }
    /* animation: < 250ms, no bounce; Reduce Motion: instant. ease-out with every y control point in [0, 1] (no overshoot) */
    const bez = e => { if (/^(ease|ease-out|ease-in-out|linear)$/.test(e)) return true; const m = e.match(/^cubic-bezier\(([^)]*)\)$/); if (!m) return false; const v = m[1].split(",").map(Number); return v.length === 4 && v[1] >= 0 && v[1] <= 1 && v[3] >= 0 && v[3] <= 1; };
    for (const reduce of [false, true]) {
      const { ctx, p } = await page(669, 751, { reduce });
      await tap(p, "#openPlan"); await tap(p, '#planPane [data-tab="train"]');
      const a = await p.evaluate(() => new Promise(res => { document.querySelectorAll("#panel-train .day")[2].querySelector(".day-toggle").click();
        const an = document.getAnimations().filter(x => x.effect && x.effect.target && x.effect.target.closest && x.effect.target.closest("#panel-train"));
        res(an.map(x => { const t = x.effect.getTiming(), k = x.effect.getKeyframes(); return { d: t.duration, e: t.easing, frames: k.map(f => f.height) }; }).filter(x => x.frames.some(Boolean))); })); /* height animations only */
      if (!reduce) rec("669x751", "(a) the opening day grows in < 250ms, ease-out, from 0 to its height only (no overshoot frame)", a.length === 1 && a[0].d > 0 && a[0].d < 250 && bez(a[0].e) && a[0].frames.length === 2 && a[0].frames[0] === "0px", J(a));
      else rec("669x751 reduce", "(a) Reduce Motion: no animation", a.length === 0, J(a));
      await ctx.close();
    }
    /* a day whose top goes out of view on opening (the open Mon above it closes) lands just under the page head */
    for (const [name, w, h, o] of [["669x751", 669, 751, {}], ["669x751 200%", 669, 751, { big: true }], ["s09", 669, 951, { app: true, safe: [82, 0, 20] }]]) {
      const { ctx, p } = await page(w, h, o);
      await tap(p, "#openPlan"); await tap(p, '#planPane [data-tab="train"]');
      const pre = await p.evaluate(() => { const pane = document.getElementById("planPane"), d = document.querySelectorAll("#panel-train .day"), head = pane.querySelector(".sheet-head").getBoundingClientRect().bottom;
        const mb = d[0].querySelector(".day-body").getBoundingClientRect().height; pane.scrollTop += d[3].getBoundingClientRect().top - head - 60; return { mb, head }; });
      const preTop = await p.evaluate(() => document.querySelectorAll("#panel-train .day")[3].getBoundingClientRect().top);
      await p.waitForTimeout(250);
      await p.locator("#panel-train .day").nth(3).locator(".day-toggle").tap(); await p.waitForTimeout(500);
      const g = await weekProbe(p), top = g.days[3].t;
      /* spec: "if expanding would push the card's top off screen, scroll so its top sits under the header". Where the
         one-day toggle keeps the tapped day where it was (it stays in view), that is a pass too; it must never end under the head. */
      rec(name, "(a) opening a day with the open day above it closing: its top ends just under the page head (12px) or where it was (in view), never under the head", pre.mb > 60 && top >= g.hb - 0.5 && (top <= g.hb + 12 || Math.abs(top - preTop) <= 30), J({ mb: pre.mb, preTop, top, head: g.hb }));
      await ctx.close();
    }
    /* addendum 1 (owner-approved): two columns ONLY when the viewport is wider than tall AND the week list's
       container is at least 820px; one column everywhere else (1000x1300 portrait included) */
    for (const [lbl, w, h] of [["1000x1300 portrait", 1000, 1300], ["951x585 inner landscape", 951, 585], ["951x669 inner landscape", 951, 669], ["1800x1000 wide landscape", 1800, 1000], ["1300x1000 landscape", 1300, 1000]]) {
      for (const thu of [false, true]) { const { ctx, p } = await page(w, h, {});
        if (await p.locator("#openPlan").isVisible()) await tap(p, "#openPlan");
        await tap(p, '#planPane [data-tab="train"]');
        if (thu) { await p.locator("#panel-train .day").nth(3).locator(".day-toggle").tap(); await p.waitForTimeout(500); }
        const g = await weekProbe(p), open = g.days.find(d => d.open), land = w > h, want = land && g.wrapW >= 820 ? 2 : 1, name = lbl + " " + (thu ? "Thu" : "Mon") + " open";
        rec(name, `(a) addendum: ${want === 2 ? "landscape and list >= 820px: two columns, the open day spans both, row flow" : "one column (" + (land ? "list under 820px" : "portrait") + ")"}`,
          g.cols === want && (want === 1 ? oneCol(g).length === 0 : open && Math.abs((open.r - open.l) - g.gw) <= 1 && !/dense/.test(g.flow)), J({ cols: g.cols, wrapW: g.wrapW, bad: want === 1 ? oneCol(g) : null }));
        const seq = g.days.every((d, i) => !i || d.t > g.days[i - 1].t + 0.5 || (Math.abs(d.t - g.days[i - 1].t) <= 0.5 && d.l > g.days[i - 1].l));
        rec(name, "(a) Mon to Sun in reading order", seq && g.days.map(d => d.day.toUpperCase()).join() === ORDER.join(), J(g.days.map(d => [d.day, d.l, d.t])));
        await ctx.close(); }
    }
    /* addendum acceptance: 669x751 and 720 wide, all days collapsed: one left edge, Mon to Sun */
    for (const [lbl, w, h] of [["669x751", 669, 751], ["720x960", 720, 960]]) { const { ctx, p } = await page(w, h, { seed: seedOf(FIX, { openDays: { "w1-legsA": false } }) });
      if (await p.locator("#openPlan").isVisible()) await tap(p, "#openPlan");
      await tap(p, '#planPane [data-tab="train"]');
      if ((await weekProbe(p)).days.some(d => d.open)) { await p.locator("#panel-train .day.open .day-toggle").first().tap(); await p.waitForTimeout(400); }
      const g = await weekProbe(p);
      rec(lbl + " all collapsed", "(a) addendum: all days collapsed: one column, every left edge equal, Mon to Sun", !g.days.some(d => d.open) && g.cols === 1 && oneCol(g).length === 0 && g.days.map(d => d.day.toUpperCase()).join() === ORDER.join(), J({ cols: g.cols, bad: oneCol(g), open: g.days.filter(d => d.open).map(d => d.day) }));
      await ctx.close(); }
    /* mutation: the v0.1.3.4 inner portrait grid (two columns) must fail the one-column checks */
    { const { ctx, p } = await page(669, 751, { css: ".day-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}" });
      await tap(p, "#openPlan"); await tap(p, '#planPane [data-tab="train"]');
      const g = await weekProbe(p);
      rec("mutation", "(a) the v0.1.3.4 two-column grid fails the one-column check", oneCol(g).length > 0, J(oneCol(g)));
      await ctx.close(); }
  }

  // ---- (c) the Counter ----
  const cProbe = p => p.evaluate(() => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), cs = e => getComputedStyle(e);
    const card = q("#today"), list = card.querySelector(".set-rows"), pill = q("#morePill"), bar = card.querySelector(".today-actions");
    if (!list) return { rest: true };
    /* v0.1.4.3: the list's clip (it ends at a row boundary, Designer nit) ends the visible area */
    const clipB = (m => { if (!m) return 0; const v = m[1].trim().split(/\s+/).map(parseFloat); return (v.length >= 3 ? v[2] : v[0]) || 0; })(/^inset\(([^)]*)\)/.exec(cs(list).clipPath || ""));
    const lr = rc(list), lt = lr.top + list.clientTop, vb = lt + list.clientHeight - clipB, rows = Array.from(list.querySelectorAll(".set-row"));
    const over = list.scrollHeight - list.clientHeight > 0.5;
    const shown = !!pill && !pill.hidden && pill.getClientRects().length > 0 && cs(pill).display !== "none" && cs(pill).visibility === "visible";
    const pr = shown ? rc(pill) : null;
    const X = (a, c) => a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    const clip = a => ({ left: Math.max(a.left, lr.left), right: Math.min(a.right, lr.right), top: Math.max(a.top, lt), bottom: Math.min(a.bottom, vb) });
    const parts = []; rows.forEach((r, i) => { [r, ...r.querySelectorAll(".tag, .ex-sets, .ex-name")].forEach(e => { const c = clip(rc(e)); if (c.bottom > c.top && c.right > c.left) parts.push([i, e.className || "row", c]); }); });
    const hits = pr ? parts.filter(x => X(pr, x[2])).map(x => x[0] + ":" + x[1]) : [];
    const below = rows.filter(r => rc(r).top >= vb - 1).length;
    const last = rows[rows.length - 1], endInView = !over || rc(last).bottom <= vb + 1;
    const n = shown ? ((pill.getAttribute("aria-label") || "").match(/^(\d+) more/) || [0, -1])[1] * 1 : 0;
    const strip = card.classList.contains("more-on"), ar = bar ? rc(bar) : null;
    const sub = card.querySelector(".today-hero .sub"), subVis = !!sub && sub.getClientRects().length > 0 && cs(sub).display !== "none";
    const undo = q("#toast"), undoOn = !!undo && undo.classList.contains("show");
    const calf = rows.find(r => /Seated calf raise/.test(r.textContent)), calfTag = calf && calf.querySelector(".tag.accessory");
    const tagWhole = calfTag ? (t => t.top >= lt - 0.5 && t.bottom <= vb + 0.5)(rc(calfTag)) : null;
    const cut = []; rows.forEach((r, i) => r.querySelectorAll(".tag, .ex-sets, .ex-name").forEach(e => { const c = rc(e); if (c.top < lt - 0.5 && c.bottom > lt + 0.5) cut.push(i + ":" + e.className); }));
    const firstTop = rows.findIndex(r => rc(r).top >= lt - 1.5);
    const tst = undoOn ? rc(undo) : null;
    return { cut, firstTop, calfTop: !!calf && rows.indexOf(calf) === firstTop, toast: tst && { top: tst.top, bottom: tst.bottom }, toastTf: undoOn ? cs(undo).transform : null, barTop: ar && ar.top, btnTop: (b => b ? rc(b).top : null)(q("#todayDone")), listTop: list.scrollTop,
      listRect: { l: lr.left, t: lr.top, w: lr.width, h: lr.height }, over, shown, label: shown ? pill.getAttribute("aria-label") : null, n, below, hits, strip, endInView, undoOn, subVis, tagWhole, nrows: rows.length,
      gapToBar: ar ? ar.top - lr.bottom : null, stripOk: pr ? pr.top >= lr.bottom - 0.5 && (!ar || pr.bottom <= ar.top + 0.5) : null, pillH: pr && pr.height, pillW: pr && pr.width,
      lastToBar: ar && last ? ar.top - rc(last).bottom : null, stripGapTop: pr ? pr.top - lr.bottom : null, stripGapBar: pr && ar ? ar.top - pr.bottom : null,
      atBottom: list.scrollTop + list.clientHeight >= list.scrollHeight - 1, lg: document.documentElement.classList.contains("lg-text") };
  });
  if (on("c")) {
    const plans = [["legs-priority", FIX]].concat(L.SAMPLES.map(s => [s, L.norm(L.readSample(s))]));
    const CS = [["s06", 678, 466, { app: true, safe: [16, 79, 35] }], ["812x375 200%", 812, 375, { safe: [0, 0, 21], big: true }], ["844x390 200%", 844, 390, { safe: [0, 0, 21], big: true }], ["644x382", 644, 382, {}]];
    /* changed on Designer request, 2026-10-27 (v0.1.4.3, option 3): 200% text under 700 wide is the single column, so the
       old 200% split sizes (s06, 644x382, 678x396) check that, and the 200% split checks run at 812x375 and 844x390 */
    for (const [sz, w, h, o] of [["s06 200%", 678, 466, { app: true, safe: [16, 79, 35], big: true }], ["644x382 200%", 644, 382, { big: true }], ["678x396 200%", 678, 396, { safe: [0, 0, 21], big: true }]]) {
      const { ctx, p, W } = await page(w, h, Object.assign({ seed: seedOf(FIX) }, o)); const c = await p.evaluate(() => document.documentElement.classList.contains("counter")); await ctx.close();
      rec(sz, "(c) 200% text under 700 wide: the single column (changed on Designer request, 2026-10-27)", !c && !W.errs.length, W.errs.join(" | ")); }
    for (const [sz, w, h, o] of CS) {
      const agg = { days: 0, bad: [] }; let errs = [];
      for (const [pn, plan] of plans) {
        const { ctx, p, W } = await page(w, h, Object.assign({ seed: seedOf(plan) }, o));
        const train = plan.days.map((d, i) => d.rest ? -1 : i).filter(i => i >= 0);
        for (const i of train) {
          await p.evaluate(i => { const r = document.querySelectorAll("#paneToday .wstrip [data-strip], #weekStrip [data-strip]"); const e = Array.from(r).find(x => x.dataset.strip === String(i)); if (e) e.click(); }, i);
          await p.waitForTimeout(250);
          const tagD = pn + " d" + i; let g = await cProbe(p); agg.days++;
          if (g.rest) continue;
          const B = m => agg.bad.push(tagD + " " + m);
          if (g.shown !== (g.over && !g.endInView)) B("pill shown " + g.shown + " but over " + g.over + " endInView " + g.endInView);
          if (g.over && !g.strip) B("overflow without the strip");
          if (!g.over && g.strip) B("strip without overflow");
          if (g.hits.length) B("pill over " + g.hits.join(","));
          if (g.shown && !g.stripOk) B("pill not on its strip");
          if (g.shown && (g.pillH < 43.5 || g.pillW < 43.5)) B("pill < 44px");
          if (g.shown && g.n > 0 && g.n !== g.below) B("N " + g.n + " != rows wholly below " + g.below);
          if (!g.lg && !g.subVis) B("focus line hidden at normal text");
          if (!g.over && g.gapToBar != null && g.gapToBar > 1.5 && g.atBottom === false) B("gap to the buttons " + g.gapToBar);
          if (g.shown) {
            /* tap to the end: each tap brings the next exercise's top to the list's top, no partial line at the top,
               the pill over nothing, N = rows wholly below; the pill hides only once the end is in view */
            for (let k = 0; k < 10; k++) { const s = await cProbe(p); if (!s.shown) { if (!s.endInView) B("pill hidden before the end is in view"); break; }
              if (s.hits.length) B("pill over " + s.hits.join(",") + " after taps"); if (s.cut.length) B("partial line at the top: " + s.cut.join(","));
              /* (c): with no row wholly below and the end not yet in view the pill reads "More" (no N; cProbe gives -1) */
              const nOk = x => x.n === x.below || (x.n === -1 && x.below === 0 && !x.endInView && x.label === "Show the rest of the list");
              if (!nOk(s)) B("N " + s.n + " != below " + s.below + " after taps");
              await p.locator("#morePill").tap(); await p.waitForTimeout(450);
              const t = await cProbe(p); if (t.firstTop !== s.firstTop + 1 && !t.atBottom) B("tap " + k + ": row " + t.firstTop + " at the top, expected " + (s.firstTop + 1)); }
            const e = await cProbe(p); if (e.shown || !e.endInView) B("at the end: pill " + e.shown + " endInView " + e.endInView);
            if (e.calfTop && e.tagWhole === false) B("Seated calf raise at the top: its tag is cut");
            await p.evaluate(() => { const l = document.querySelector("#today .set-rows"); l.scrollTop = 0; l.dispatchEvent(new Event("scroll")); }); await p.waitForTimeout(300);
          }
          /* Undo: in its slot, ending at the buttons, opacity only; the pill hides, then comes back recounted.
             v0.1.4 spec (c) amendment (Fitness Coach, 2026-10-26; flagged to the Designer): Undo never covers list text, so
             while it shows the list's top and scroll position stay and only its bottom edge rises, to the toast's top at
             most; after Undo hides the list returns to its full height with the same scroll position. */
          { const pre = await cProbe(p);
            await p.locator("#today .skip-bottom").tap(); await p.waitForTimeout(450);
            const u = await cProbe(p);
            if (!u.undoOn) B("no Undo after Skip");
            else {
              if (Math.abs(u.toast.bottom - u.btnTop) > 6 || u.toast.top < u.listRect.top) B("Undo not in its slot above the buttons: " + J([u.toast, u.btnTop]));
              if (u.toastTf !== "none") B("Undo moves (transform " + u.toastTf + ")");
              if (u.listRect.t !== pre.listRect.t || u.listRect.l !== pre.listRect.l || u.listRect.w !== pre.listRect.w || u.listTop !== pre.listTop) B("list top or scroll moved with Undo: " + J([pre.listRect, pre.listTop, u.listRect, u.listTop]));
              if (u.listRect.t + u.listRect.h > u.toast.top + 0.5) B("list ends below the toast's top: " + J([u.listRect, u.toast]));
              if (u.shown) B("pill visible while Undo shows");
            }
            if (await p.locator("#toastUndo").isVisible()) await p.locator("#toastUndo").tap(); await p.waitForTimeout(500);
            const g2 = await cProbe(p);
            if (J(g2.listRect) !== J(pre.listRect) || g2.listTop !== pre.listTop) B("list not back to its full height and scroll after Undo: " + J([pre.listRect, pre.listTop, g2.listRect, g2.listTop]));
            if (g2.shown !== pre.shown || (pre.shown && !(g2.n === g2.below || (g2.n === -1 && g2.below === 0 && !g2.endInView && g2.label === "Show the rest of the list")))) B("pill not back / recounted after Undo: " + J([pre.shown, g2.shown, g2.n, g2.below]));
          }
        }
        errs = errs.concat(W.errs);
        if (pn === "legs-priority" && sz === "s06") {
          await p.evaluate(() => { const e = Array.from(document.querySelectorAll("#paneToday .wstrip [data-strip], #weekStrip [data-strip]")).find(x => x.dataset.strip === "0"); if (e) e.click(); }); await p.waitForTimeout(250);
          const g = await cProbe(p);
          rec(sz, "(c) the measured 06 size at 100%: the Counter is on; all 5 rows fit, no pill and no strip, Seated calf raise's ACCESSORY tag whole", /\bcounter\b/.test(await p.evaluate(() => document.documentElement.className)) && !g.over && !g.shown && !g.strip && g.nrows === 5 && g.tagWhole === true, J(g));
          rec(sz, "(c) the measured 06 size at 100%: the list runs to the buttons (last row ends within 6px of Skip's top)", g.lastToBar != null && g.lastToBar >= -0.5 && g.lastToBar <= 6, J({ lastToBar: g.lastToBar }));
        }
        if (pn === "legs-priority" && sz === "s06 200%") {
          await p.evaluate(() => { const e = Array.from(document.querySelectorAll("#paneToday .wstrip [data-strip], #weekStrip [data-strip]")).find(x => x.dataset.strip === "0"); if (e) e.click(); }); await p.waitForTimeout(250);
          const g = await cProbe(p);
          rec(sz, "(c) the measured 06 size at 200%: the pill is on its own 44px strip under the list, over no row, tag or sets text; N = rows wholly below; no partial line at the top", g.shown && g.stripOk && g.pillH >= 43.5 && g.hits.length === 0 && g.n === g.below && g.cut.length === 0, J(g));
          rec(sz, "(c) the measured 06 size at 200%: the list runs to the pill strip, the strip to the buttons (within 4px)", g.stripGapTop != null && Math.abs(g.stripGapTop) <= 4 && Math.abs(g.stripGapBar) <= 4, J({ a: g.stripGapTop, b: g.stripGapBar }));
        }
        await ctx.close();
      }
      rec(sz, `(c) every training day of every plan (${agg.days}): strip and pill rules, Undo hides and recounts, hides only at the end`, agg.bad.length === 0, agg.bad.slice(0, 12).join(" | "));
      rec(sz, "no errors", errs.length === 0, errs.join(" | "));
    }
  }

  // ---- (r) exercise rows (addendum 2): sets on the right, on the name's first line; the tag wraps under the name ----
  const rowProbe = (p, sel) => p.evaluate(sel => {
    const out = [];
    document.querySelectorAll(sel).forEach(row => { const rr = row.getBoundingClientRect(); if (!rr.width || !row.getClientRects().length) return;
      const cs = getComputedStyle(row), cl = rr.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), cr = rr.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
      const sets = row.querySelector(":scope > .ex-sets"), name = row.querySelector(".ex-name"), left = row.querySelector(":scope > .ex-left"); if (!sets || !name) return;
      const sr = sets.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(name); const nl = Array.from(rg.getClientRects()).filter(r => r.width > 0.5);
      const first = nl[0], ns = getComputedStyle(name), ch = (() => { const s = document.createElement("span"); s.textContent = "0"; s.style.cssText = "position:absolute;visibility:hidden;font:" + ns.font; name.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w; })();
      const sameLine = !!first && sr.top < first.bottom - 1 && sr.bottom > first.top + 1;
      const tag = row.querySelector(".ex-left > .tag"), tr = tag && tag.getBoundingClientRect(), nameLast = nl[nl.length - 1];
      out.push({ n: name.textContent.trim(), sets: sets.textContent.trim(), right: Math.abs(sr.right - cr), atLeft: sr.left <= cl + 1, sameLine, lines: Math.round(sr.height / parseFloat(getComputedStyle(sets).lineHeight || 16)) || 1,
        nowrap: getComputedStyle(sets).whiteSpace === "nowrap", tab: /tabular-nums/.test(getComputedStyle(sets).fontVariantNumeric), avail: cr - cl - sr.width - 12, ch8: 8 * ch,
        tagOk: !tag || (tr.top >= nameLast.top - 1 && (tr.left >= nameLast.right - 1 || tr.top >= nameLast.bottom - 1)), overlap: !!tag && sr.left < tr.right - 0.5 && tr.left < sr.right - 0.5 && sr.top < tr.bottom - 0.5 && tr.top < sr.bottom - 0.5 });
    });
    return out; }, sel);
  const rowBad = (rows, big) => { const bad = [];
    rows.forEach(r => { const m = [];
      if (r.right > 1) m.push("right edge off by " + Math.round(r.right * 10) / 10);
      if (r.atLeft) m.push("sets starts at the row's left edge");
      if (!r.nowrap) m.push("sets may wrap");
      if (!r.tab) m.push("no tabular numerals");
      if (!r.sameLine && !(big && r.avail < r.ch8 + 1)) m.push("sets not on the name's first line (name column would be " + Math.round(r.avail) + "px, 8ch " + Math.round(r.ch8) + "px)");
      if (!r.tagOk) m.push("tag not after the name or under it");
      if (r.overlap) m.push("sets over the tag");
      if (m.length) bad.push(r.n + ": " + m.join(", ")); });
    return bad; };
  if (on("r")) {
    /* the review rows (Designer spec, row 100% acceptance) as a plan: the same names, tags and set strings */
    const RAW = JSON.parse(L.fs.readFileSync(L.path.join(L.ROOT, "test", "fixtures", "legs-priority.json"), "utf8"));
    RAW.blocks["1"].legsA = [["Walking lunges", "3 x 10-12/leg", ["accessory"]], ["Romanian deadlift", "4 x 6-8", ["anchor"]], ["Standing calf raise (2s pause)", "4 x 8-12", ["priority"]], ["Hanging knee raise", "3 x 30-45s", ["optional"]]].map(([name, sets, tags]) => ({ name, sets, tags }));
    RAW.blocks["1"].upperA = [["Pull-up or lat pulldown", "4 x 6-10", ["anchor"]], ["Chest-supported row", "3 x 8-12", ["accessory"]], ["Seated cable row", "3 x 10-12", ["accessory"]], ["Machine chest press or dips", "3 x 8-12", ["accessory"]]].map(([name, sets, tags]) => ({ name, sets, tags }));
    const plans = [["legs-priority", FIX], ["review-rows", L.norm(RAW)]].concat(L.SAMPLES.map(s => [s, L.norm(L.readSample(s))]));
    const RS = [["669x751", 669, 751, {}], ["720x960", 720, 960, {}], ["382x560", 382, 560, {}], ["644x382 Counter", 644, 382, {}], ["669x867 Safari", 669, 867, {}], ["669x951 s09", 669, 951, { app: true, safe: [82, 0, 20] }], ["466x678 s07", 466, 678, { app: true, safe: [67, 85, 20] }]];
    const REVIEW8 = ["Walking lunges", "Chest-supported row", "Seated cable row", "Machine chest press or dips", "Hanging knee raise", "Romanian deadlift", "Pull-up or lat pulldown", "Standing calf raise (2s pause)"];
    for (const [sz0, w, h, o0] of RS) for (const big of [false, true]) {
      const sz = sz0 + (big ? " 200%" : ""), o = Object.assign({}, o0, { big });
      const bad = [], seen = new Set(); let nWeek = 0, nToday = 0, nUp = 0;
      for (const [pn, plan] of plans) {
        const { ctx, p } = await page(w, h, Object.assign({ seed: seedOf(plan, { openDays: {} }) }, o));
        const train = plan.days.map((d, i) => d.rest ? -1 : i).filter(i => i >= 0);
        /* Today card (and the Counter): every training day through the strip */
        for (const i of train) {
          await p.evaluate(i => { const e = Array.from(document.querySelectorAll("#paneToday .wstrip [data-strip], #weekStrip [data-strip]")).find(x => x.dataset.strip === String(i)); if (e) e.click(); }, i);
          await p.waitForTimeout(150);
          const rs = await rowProbe(p, "#today .set-row"); nToday += rs.length; rs.forEach(r => seen.add(r.n)); rowBad(rs, big).forEach(x => bad.push(pn + " today d" + i + " " + x));
          const us = await rowProbe(p, "#upNext .set-row"); nUp += us.length; rowBad(us, big).forEach(x => bad.push(pn + " up next " + x));
        }
        /* Week view: open each training day in turn */
        if (await p.locator("#openPlan").isVisible()) { await tap(p, "#openPlan").catch(() => {}); }
        if (await p.locator('#planPane [data-tab="train"]').isVisible()) {
          await tap(p, '#planPane [data-tab="train"]').catch(() => {});
          for (const i of train) {
            const t = p.locator(`#panel-train [data-toggle="${i}"]`);
            if (!(await t.count())) continue;
            if ((await t.getAttribute("aria-expanded")) !== "true") { await t.scrollIntoViewIfNeeded().catch(() => {}); await t.tap().catch(() => {}); await p.waitForTimeout(260); }
            const rs = await rowProbe(p, `#panel-train .day[data-day="${i}"] .ex`); nWeek += rs.length; rs.forEach(r => seen.add(r.n)); rowBad(rs, big).forEach(x => bad.push(pn + " week d" + i + " " + x));
          }
        }
        await ctx.close();
      }
      rec(sz, `(r) every exercise row (Today ${nToday}, Week ${nWeek}, Up next ${nUp}; all plans): sets right edge = row content right (1px), never at the left edge, no wrap, tabular, ${big ? "on the name's first line unless the name column would be under 8ch" : "on the name's first line"}; the tag after the name or under it`, bad.length === 0 && nToday > 0 && (sz0.startsWith("644") || nWeek > 0), bad.slice(0, 8).join(" | "));
      if (!big && sz0 === "669x751") rec(sz, "(r) the eight review rows from the spec are all in the sample", REVIEW8.every(n => seen.has(n)), REVIEW8.filter(n => !seen.has(n)).join(", "));
    }
    /* mutation: the v0.1.3.4 rows (ex-left sized to its content, wrapping rows) must fail */
    { const { ctx, p } = await page(382, 560, { css: ".ex > .ex-left, .set-row > .ex-left { flex: 0 1 auto !important; } .ex > .ex-sets, .set-row > .ex-sets { margin-left: 0 !important; }" });
      const rs = []; for (const i of [0, 1, 2, 3, 4]) { await p.evaluate(i => { const e = Array.from(document.querySelectorAll("#weekStrip [data-strip]")).find(x => x.dataset.strip === String(i)); if (e) e.click(); }, i); await p.waitForTimeout(150); rs.push(...await rowProbe(p, "#today .set-row")); }
      rec("mutation", "(r) v0.1.3.4 row flex (sets dropped to a left-aligned line) fails the row check", rowBad(rs, false).length > 0, rowBad(rs, false).slice(0, 2).join(" | ")); await ctx.close(); }
  }

  // ---- (d) Up next ----
  const dProbe = p => p.evaluate(() => {
    const q = s => document.querySelector(s), rc = e => e && e.getClientRects().length ? e.getBoundingClientRect() : null, cs = e => getComputedStyle(e);
    const un = q("#upNext"), t = rc(q("#today")), s = rc(q("#weekStrip")), u = rc(un), n = rc(q("#outerNav")), op = rc(q("#openPlan")), cb = rc(q("#openPlan .chev-box"));
    const btn = q("#upNextOpen");
    const after = (a, c) => !!a && !!c && a.top >= c.bottom - 0.5;
    const dom = Array.from(document.querySelectorAll("#today, #weekStrip, #upNext, #outerNav")).filter(e => e.id !== "upNext" || (e.getClientRects().length && !e.hidden)).map(e => e.id);
    /* v0.1.4.3: anything on screen named Up next (the card, its button, or a section labelled Up next) */
    const anyUp = Array.from(document.querySelectorAll('#upNext, .up-next, [aria-label^="Up next"]')).some(e => e.getClientRects().length && cs(e).display !== "none" && cs(e).visibility !== "hidden" && !e.hidden);
    return { visible: !!u && !un.hidden && cs(un).display !== "none", anyUp, order: after(s, t) && after(u, s) && after(n, u), order2: after(s, t) && after(n, s), dom: dom.join(), label: btn ? btn.getAttribute("aria-label") : un ? (un.textContent || "").trim() : "",
      kick: (q("#upNext .un-kick") || {}).textContent || "", title: (q("#upNext .un-title") || {}).textContent || "", rows: document.querySelectorAll("#upNext .set-row").length,
      more: (q("#upNext .un-more") || {}).textContent || "", controls: document.querySelectorAll("#upNext input, #upNext [data-check], #upNext .check-btn").length,
      fill: un && cs(un).backgroundColor, border: un && cs(un).borderLeftWidth, radius: un && cs(un).borderTopLeftRadius, todayRadius: cs(q("#today")).borderTopLeftRadius, pad: un && cs(un).paddingLeft,
      today: t, strip: s, up: u, nav: n, op, cb, ih: innerHeight, sh: document.scrollingElement.scrollHeight, sw: document.scrollingElement.scrollWidth, iw: innerWidth, cls: document.documentElement.className, line: (q("#upNext .un-line") || {}).textContent || "" };
  });
  const homeRects = p => p.evaluate(() => { const o = {}; ["#today", "#weekStrip", "#outerNav", "#todayDone", "#toastSlot"].forEach(s => { const e = document.querySelector(s); o[s] = e && e.getClientRects().length ? (r => [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10))(e.getBoundingClientRect()) : null; }); return o; });
  /* the page's scroll height in another build, same size and options */
  async function shAt(w, h, o, u) { const { ctx, p } = await page(w, h, Object.assign({}, o, { url: u })); const r = await p.evaluate(() => document.scrollingElement.scrollHeight); await ctx.close(); return r; }
  async function rectsAt(w, h, o, u) { const { ctx, p } = await page(w, h, Object.assign({}, o, { url: u })); const r = await homeRects(p); await ctx.close(); return r; }
  const upTap = async (p, wk, day) => { await tap(p, "#upNextOpen"); await p.waitForTimeout(500);
    return p.evaluate(() => ({ open: document.getElementById("openPlan").getAttribute("aria-expanded"), days: Array.from(document.querySelectorAll("#panel-train .day.open .day-badge")).map(e => e.textContent.trim()),
      /* the tabs are buttons with an "active" class (no tab role, no aria-selected in any version): the Train tab is the active one */
      tab: (e => e && String(e.classList.contains("active")))(document.querySelector('#planPane [data-tab="train"]')), title: ((document.querySelector("#planPane .sheet-head h2, #planPane .sheet-head .sheet-title") || {}).textContent || "").trim(),
      top: (e => e ? e.getBoundingClientRect().top : null)(document.querySelector("#panel-train .day.open")), ih: innerHeight })); };
  const upOk = (k, wk, day) => k.open === "true" && k.tab === "true" && k.days.join() === day && new RegExp("Week\\s" + wk + "\\b").test(k.title) /* the sheet title uses no-break spaces ("Week\u00a01\u00a0of\u00a06") */ && k.top != null && k.top >= 0 && k.top < k.ih - 44;
  /* (d) calm space (Designer ruling 2026-10-27, replaces the retired 25% gap check), at s01, s09 and 720x960:
     no stretch: each Today exercise row is within 2px of its intrinsic height, i.e. its content (the union of its
       children's margin boxes) plus its own padding and borders, floored by its own declared min-height (the 44px target);
     top-anchored: the Today card's top is the same (0.5px) with the gap and with it filled by a spacer after Week and
       progress (a centred or bottom-anchored home would move);
     plain background: every screen pixel from 1px under Week and progress to the bottom is the page background (2/255),
       and nothing drawn sits there in the DOM (no background, image, shadow, border, outline or pseudo-element).
     Mutation: the rows set to flex-grow (with the home, the Today card and its list as flex columns filling the
     screen, so the grow has room) must fail the no-stretch check. */
  const CALM = ["s09", "s01", "720x960"];
  const zlib = require("zlib");
  const pngPixels = buf => { let o = 8, w = 0, h = 0, ct = 0; const idat = [];
    while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
      if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8) throw new Error("png bit depth " + d[8]); }
      if (type === "IDAT") idat.push(d); o += 12 + len; }
    const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error("png colour type " + ct);
    const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(h * st);
    for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], src = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
      for (let x = 0; x < st; x++) { const a = x >= bpp ? out[y * st + x - bpp] : 0, b = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0;
        const pr = (() => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; })();
        out[y * st + x] = (src[x] + [0, a, b, (a + b) >> 1, pr][f]) & 255; } }
    return { w, h, bpp, px: out }; };
  const calmRows = p => p.evaluate(() => Array.from(document.querySelectorAll("#today .set-row")).filter(r => r.getClientRects().length).map(r => {
    const c = getComputedStyle(r), f = v => parseFloat(v) || 0, kids = Array.from(r.children).filter(k => k.getClientRects().length && getComputedStyle(k).position !== "absolute");
    const ks = kids.map(k => { const b = k.getBoundingClientRect(), kc = getComputedStyle(k); return [b.top - f(kc.marginTop), b.bottom + f(kc.marginBottom)]; });
    const content = ks.length ? Math.max(...ks.map(k => k[1])) - Math.min(...ks.map(k => k[0])) : 0;
    const own = f(c.paddingTop) + f(c.paddingBottom) + f(c.borderTopWidth) + f(c.borderBottomWidth);
    return { name: (r.textContent || "").trim().slice(0, 24), h: r.getBoundingClientRect().height, intrinsic: Math.max(content + own, f(c.minHeight)), grow: c.flexGrow }; }));
  const stretched = rs => rs.filter(r => Math.abs(r.h - r.intrinsic) > 2);
  async function calmChecks(p, sz, o, g, lim) {
    const rs = await calmRows(p), bad = stretched(rs);
    rec(sz, "(d, calm) no stretch: each Today exercise row is within 2px of its intrinsic content height plus its own padding", rs.length > 0 && bad.length === 0, J({ n: rs.length, bad: bad.slice(0, 3) }));
    const gap = Math.max(0, Math.round(lim - g.nav.bottom));
    const t2 = await p.evaluate(px => { const s = document.createElement("div"); s.id = "gateCalmSpacer"; s.style.cssText = `height:${px}px;flex:none`;
      document.querySelector("#paneToday").appendChild(s); const t = document.querySelector("#today").getBoundingClientRect().top; s.remove(); return t; }, gap);
    const t3 = await p.evaluate(() => document.querySelector("#today").getBoundingClientRect().top);
    rec(sz, "(d, calm) top-anchored: the Today card's top is the same with the gap and with it filled", gap > 0 && Math.abs(t2 - g.today.top) <= 0.5 && Math.abs(t3 - g.today.top) <= 0.5, J({ gap, top: g.today.top, filled: t2, after: t3 }));
    const y0 = Math.ceil(g.nav.bottom) + 1, y1 = g.ih;
    const dom = await p.evaluate(([y0, y1]) => { const bad = [], seen = new Set(), body = getComputedStyle(document.body).backgroundColor;
      const clear = v => v === "rgba(0, 0, 0, 0)" || v === "transparent";
      for (let y = y0 + 1; y < y1; y += 12) for (let x = 2; x < innerWidth; x += 24) for (const e of document.elementsFromPoint(x, y)) {
        if (seen.has(e) || e === document.documentElement || e === document.body) continue; seen.add(e); const c = getComputedStyle(e), r = e.getBoundingClientRect();
        if (!clear(c.backgroundColor) && c.backgroundColor !== body) bad.push(e.id || e.className + " background " + c.backgroundColor);
        if (c.backgroundImage !== "none") bad.push((e.id || e.className) + " image");
        if (c.boxShadow !== "none") bad.push((e.id || e.className) + " shadow");
        if (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) bad.push((e.id || e.className) + " outline");
        /* a border counts only where it is drawn: an edge inside the gap */
        for (const [side, pos] of [["Top", r.top], ["Bottom", r.bottom]]) if (parseFloat(c["border" + side + "Width"]) > 0 && c["border" + side + "Style"] !== "none" && !clear(c["border" + side + "Color"]) && pos > y0 && pos < y1) bad.push((e.id || e.className) + " border-" + side);
        for (const side of ["Left", "Right"]) if (parseFloat(c["border" + side + "Width"]) > 0 && c["border" + side + "Style"] !== "none" && !clear(c["border" + side + "Color"]) && r.bottom > y0) bad.push((e.id || e.className) + " border-" + side);
        for (const ps of ["::before", "::after"]) { const q = getComputedStyle(e, ps); if (q.content !== "none" && q.content !== "normal" && (!clear(q.backgroundColor) || q.backgroundImage !== "none" || q.boxShadow !== "none" || parseFloat(q.borderTopWidth) > 0 || parseFloat(q.borderBottomWidth) > 0)) bad.push((e.id || e.className) + ps); } }
      return { bad, body }; }, [y0, y1]);
    const shot = pngPixels(await p.screenshot({ clip: { x: 0, y: y0, width: g.iw, height: y1 - y0 } }));
    const bg = dom.body.match(/\d+/g).map(Number); let off = 0, first = null;
    for (let i = 0; i < shot.px.length; i += shot.bpp) if ([0, 1, 2].some(k => Math.abs(shot.px[i + k] - bg[k]) > 2)) { off++; if (!first) first = { x: (i / shot.bpp) % shot.w, y: Math.floor(i / shot.bpp / shot.w), rgb: [shot.px[i], shot.px[i + 1], shot.px[i + 2]] }; }
    rec(sz, "(d, calm) under Week and progress: plain page background (every pixel, and no card, border, rule, shadow or fade in the DOM)", off === 0 && dom.bad.length === 0, J({ y0, y1, off, first, dom: dom.bad.slice(0, 5) }));
  }
  if (on("d")) {
    /* v0.1.4.3 (owner: "hide the Up next card on the inner screen"): spec (d)'s Up next card is gone. Inner portrait was the
       only layout that showed it (the CSS hid it everywhere else), so the home is Today, strip, Week and progress there,
       and nothing named Up next shows on any layout. Week and progress keeps (d)'s full-width row. */
    const noUp = g => !g.visible && !g.anyUp;
    const DS = [["s751", 669, 751, {}], ["s09", 669, 951, { app: true, safe: [82, 0, 20] }], ["s01", 669, 867, {}], ["s751 200%", 669, 751, { big: true }], ["s09 200%", 669, 951, { app: true, safe: [82, 0, 20], big: true }], ["720x960", 720, 960, {}]];
    for (const [sz, w, h, o] of DS) {
      const { ctx, p, W } = await page(w, h, o); const g = await dProbe(p);
      rec(sz, "(d, v0.1.4.3) inner portrait home: Today, strip, Week and progress (on screen and in the reading order), no Up next", noUp(g) && g.order2 && g.dom === "today,weekStrip,outerNav", J({ v: g.visible, any: g.anyUp, o: g.order2, dom: g.dom }));
      rec(sz, "(d, v0.1.4.3) no gap left where Up next was: Week and progress starts within 16px under the strip", !!g.strip && !!g.nav && g.nav.top - g.strip.bottom >= -0.5 && g.nav.top - g.strip.bottom <= 16.5, J({ gap: g.strip && g.nav && g.nav.top - g.strip.bottom }));
      if (sz === "s751 200%") {
        /* this home already scrolls in v0.1.3.4 at 200% (Today alone is 588px of 751): Today, strip and Week and progress
           sit exactly as in v0.1.3.4 and the page height is v0.1.3.4's (unchanged check) */
        const prev = await rectsAt(w, h, o, PREV.url), cur = await homeRects(p), prevSh = await shAt(w, h, o, PREV.url);
        rec(sz, "(d) 200% text: no Up next, adds no scroll (page height as in v0.1.3.4) and Today, strip and Week and progress sit as in v0.1.3.4", noUp(g) && Math.abs(g.sh - prevSh) <= 0.5 && J(prev) === J(cur), J({ v: g.visible, sh: g.sh, prevSh, prev, cur }));
      } else {
        const lim = g.ih - (o.app ? o.safe[2] : 0) - (o.app ? 0 : 50);
        rec(sz, "(d) no scroll needed: Week and progress ends above the bottom zone", g.nav.bottom <= lim + 0.5, J({ nav: g.nav.bottom, lim }));
        /* retired on Designer ruling 2026-10-27: specific to Up next, which was removed from the inner screen */
        rows.push(`RETIRED ${sz} (d) the gap under Week and progress is under 25% of the viewport (retired on Designer ruling 2026-10-27: specific to Up next, which was removed from the inner screen; gap ${Math.round(g.ih - g.nav.bottom)} of ${g.ih}, not asserted)`);
        /* the replacement (Designer ruling 2026-10-27): the empty space under Week and progress is calm and top-anchored */
        if (CALM.includes(sz)) await calmChecks(p, sz, o, g, lim);
      }
      rec(sz, "(d) Week and progress: full width at the card edges, >= 44px, chevron in 44x44", Math.abs(g.op.left - g.today.left) <= 1 && Math.abs(g.op.right - g.today.right) <= 1 && g.op.height >= 43.5 && g.cb && Math.abs(g.cb.width - 44) <= 0.5 && Math.abs(g.cb.height - 44) <= 0.5, J({ op: g.op, today: [g.today.left, g.today.right], cb: g.cb }));
      rec(sz, "(d) no sideways overflow", g.sw <= g.iw + 0.5, J([g.sw, g.iw]));
      rec(sz, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
    }
    /* the days that used to show a next-week or plan-complete card (s09, where the whole card fit): no Up next either */
    const S09 = { app: true, safe: [82, 0, 20] };
    const edge = async (name, o) => { const { ctx, p, W } = await page(669, 951, Object.assign({}, S09, o)); const g = await dProbe(p);
      rec("s09 " + name, "(d, v0.1.4.3) no Up next, and Week and progress right under the strip", noUp(g) && g.order2 && g.nav.top - g.strip.bottom <= 16.5, J({ v: g.visible, any: g.anyUp, gap: g.nav.top - g.strip.bottom }));
      rec("s09 " + name, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); };
    await edge("Mon", {});
    await edge("Fri (was: next week's Mon)", { now: "2026-10-30T08:10:00-05:00" });
    { const done = {}; ["legsA", "upperA", "legsB", "upperB", "legsC"].forEach(k => done["w1-" + k] = "done");
      await edge("Wed, week all done (was: next week's Mon)", { seed: seedOf(FIX, { done }), now: "2026-10-28T08:10:00-05:00" }); }
    { const done = {}; ["legsA", "upperA", "legsB", "upperB"].forEach(k => done["w1-" + k] = "done");
      await edge("Sat (rest), Mon to Thu done (was: next week's Mon)", { seed: seedOf(FIX, { done }), now: "2026-10-31T08:10:00-05:00" }); }
    await edge("last day, week 6 Fri (was: Plan complete after today)", { seed: seedOf(FIX, { week: 6 }), now: "2026-12-04T08:10:00-06:00" });
    /* mutation (Designer ruling 2026-10-27): rows set to flex-grow, with room to grow, must fail the no-stretch check */
    { const MUT_GROW = "#paneToday{display:flex!important;flex-direction:column!important;min-height:100vh!important}#paneToday>#today{flex:1 0 auto!important;display:flex!important;flex-direction:column!important}#today .set-rows{flex:1 0 auto!important;display:flex!important;flex-direction:column!important}#today .set-row{flex-grow:1!important}";
      let caught = 0;
      for (const [sz, w, h, o] of DS.filter(d => CALM.includes(d[0]))) {
        const { ctx, p } = await page(w, h, Object.assign({}, o, { css: MUT_GROW })); const rs = await calmRows(p); await ctx.close();
        const c = rs.length > 0 && stretched(rs).length > 0; if (c) caught++;
        rec("mutation", `(d, calm) ${sz}: the rows set to flex-grow fail the no-stretch check`, c, J({ rows: rs.slice(0, 2) })); }
      console.log(`MUTATION v0.1.4.3 calm: fails ${caught}/${CALM.length}`); }
    /* every other layout: unchanged from v0.1.4 (no Up next, home rects identical to v0.1.3.4) */
    for (const [sz, w, h, o] of [["s07", 466, 678, { app: true, safe: [67, 85, 20] }], ["390x844", 390, 844, {}], ["951x669 two panes", 951, 669, {}], ["s06 Counter", 678, 466, { app: true, safe: [16, 79, 35] }]]) {
      const { ctx, p } = await page(w, h, o); const g = await dProbe(p), cur = await homeRects(p); await ctx.close();
      if (sz === "s06 Counter") { rec(sz, "(d) the Counter has no Up next", noUp(g), J([g.visible, g.anyUp])); continue; }
      const prev = await rectsAt(w, h, o, PREV.url);
      rec(sz, "(d) no Up next here, and Today, strip, Week and progress, Undo slot and Done rects identical to v0.1.3.4", noUp(g) && J(prev) === J(cur), J({ v: g.visible, prev, cur }));
    }
  }
  // ---- (x) the "Something went wrong" panel: only for errors we can attribute ----
  /* A muted cross-origin error ("Script error.", no file, line 0, no error object) comes from script the browser or an
     extension injects; every script here is inline and the CSP loads nothing else. It must never show the panel; our own
     real errors must. The panel's "Script error." line on a live phone was this case. */
  if (on("x")) {
    const SRC = L.fs.readFileSync(L.path.join(L.ROOT, "index.html"), "utf8"), HOOK = 'document.getElementById("todayDone").addEventListener("click", function () {';
    const THROW = await serveHtml(SRC.split(HOOK).join(HOOK + ' if (window.__gateThrow) throw new Error("gate: our own error");'));
    const muted = p => p.evaluate(() => { window.dispatchEvent(new ErrorEvent("error", { message: "Script error.", filename: "", lineno: 0, colno: 0 })); });
    const panel = p => p.evaluate(() => { const f = document.getElementById("fatal"); return f ? (f.querySelector(".fatal-err") || {}).textContent || "?" : null; });
    for (const [sz, w, h, o] of [["669x867", 669, 867, {}], ["s09", 669, 951, { app: true, safe: [82, 0, 20] }], ["382x560", 382, 560, {}]]) {
      { const { ctx, p } = await page(w, h, Object.assign({ url: PREV.url }, o)); await muted(p); await p.waitForTimeout(200);
        rec(sz, "(x) v0.1.3.4 reproduces the live panel: a muted Script error. shows it", (await panel(p)) === "Script error.", J(await panel(p))); await ctx.close(); }
      { const { ctx, p } = await page(w, h, o); await muted(p);
        await p.evaluate(() => { window.dispatchEvent(new ErrorEvent("error", { message: "Script error.", filename: "https://example.invalid/x.js", lineno: 0 }));
          window.dispatchEvent(new ErrorEvent("error", { message: "Script error.", filename: "", lineno: 0, error: null })); });
        await p.setViewportSize({ width: w, height: h - 120 }); await p.waitForTimeout(150); await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
        rec(sz, "(x) a muted Script error. (no file, line 0) and a foreign-file error show no panel", (await panel(p)) === null, J(await panel(p)));
        await p.evaluate(() => document.querySelector('[aria-controls="aboutPage"]').click()); await p.waitForTimeout(300); const diag = await p.evaluate(() => (document.getElementById("aboutDiag") || {}).textContent || "");
        rec(sz, "(x) About diagnostics count the ignored errors", /ignored browser script errors: 3/.test(diag), J(diag)); await ctx.close(); }
      { const { ctx, p } = await page(w, h, Object.assign({ url: THROW.url }, o)); await p.evaluate(() => { window.__gateThrow = true; });
        await p.evaluate(() => document.getElementById("todayDone").click()).catch(() => {}); await p.waitForTimeout(300);
        rec(sz, "(x) a real error thrown from our script still shows the panel", (await panel(p)) === "gate: our own error", J(await panel(p))); await ctx.close(); }
      { const { ctx, p } = await page(w, h, o); await p.evaluate(() => { const e = new TypeError("gate: thrown later"); window.dispatchEvent(new ErrorEvent("error", { message: "Script error.", filename: "", lineno: 0, error: e })); }); await p.waitForTimeout(300);
        rec(sz, "(x) an error object with a stack shows the panel, even with no file", (await panel(p)) === "gate: thrown later", J(await panel(p))); await ctx.close(); }
    }
    THROW.close();
  }
  await b.close(); T.close(); PREV.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
