/* v0.1.3.3 gate: node test/gate-v0133.js <webkit|chromium> [url] [--old <url>]
   1. Inner portrait (669x751, 669x835) uses the cover pattern: today card, strip, Back to today / Week and progress row,
      Undo slot, plan hidden in its page; default and 200% text.
   2. Inner portrait Week and progress page: full width, Body and Lifts cards in two columns (an odd last card spans both),
      grid and tabs above at full width; cover sheets stay one column; 200% text: no horizontal overflow.
   3. Inner landscape (951x585, 951x669) rects match v0.1.3.2 (git show 7b783ea:index.html, served here) within 1px.
   4. Popovers attach to their control on inner portrait and the cover: Update plan, Import confirm, Import error, Push
      back; link prompts (start date, replace plan) and the crash panel sit below the top clear zone; width <= W-32, on
      screen; default and 200% text, keyboard up and down, a 59px top inset.
   5. Old inner portrait expectations (v0.1.3.2: plan in the page flow, no Showing row, no sheet) as a mutation check:
      each must FAIL here (and passes on v0.1.3.2).
   6. Counter (the cover screen in landscape, 678x396 Safari visible and 678x466 full, 21px safe area): every day of
      every sample fits with no card scroll, one type scale for all days, nothing intersects, targets >= 44px; 200% text
      reachable with no clipping or overlap; orientation flips keep the day and log, close a control's popover, keep a
      link prompt, and land on a sane scroll; a focused text field never flips the layout.
   8. v0.1.3.4 (designer must-fix; v0.1.3.4b adds snap and the pill strip): at 200% text (644x382 with and without the 21px inset, 678x396) the exercise list is its
      own scroll area with an "N more" pill (N correct, >= 44px, named, tap scrolls, hides at the end, never over Skip, Done
      or the Undo slot, no mask or fade); overflowing at 200%: snap (y mandatory, a start point at each row's top), a tap brings
      exactly the next row's top to the list's top, N = rows entirely below, the pill hidden once the last row is reached,
      on its own strip clear of every row, the top edge never cuts a line of text (at rest, after taps, at the end, after a
      scroll settles); at default text no pill and every Counter rect identical to 3af3491; mutations (no scroll area, no
      pill, a fade, no snap, a partial row at the top, N counting partial rows, the pill over the rows) must fail. */
const L = require("./lib");
const http = require("http"), { execSync } = require("child_process");
const { rows, rec, fails } = L.makeRec();
const B = "b-4day-upper-lower", A = "a-3day-beginner-full-body";
const OLD_SHA = "7b783ea", PREV_SHA = "3af3491"; /* PREV: v0.1.3.4 before the snap and pill strip (normal-text rects must match it) */
function serveOld(sha) { return serveHtml(execSync(`git show ${sha || OLD_SHA}:index.html`, { cwd: L.ROOT })); }
function serveHtml(html) {
  const srv = http.createServer((req, res) => { const u = req.url.split("?")[0];
    if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(String(n));
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine), OLD = await serveOld(), PREV = await serveOld(PREV_SHA);
  const BIG = "html{font-size:200%!important}";
  async function page(u, w, h, opts = {}) {
    const ctx = await L.context(b, engine, w, h, Object.assign({ seed: L.seedFor(B) }, opts)); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(u + (opts.hash || "")); await p.waitForTimeout(400);
    let css = "";
    if (opts.safeB != null) css += `:root{--safe-b:${opts.safeB}px !important}`;
    if (opts.safeT != null) css += `:root{--safe-t:${opts.safeT}px !important}`;
    if (opts.big) css += BIG;
    if (css) { await p.addStyleTag({ content: css }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(400); }
    return { ctx, p, W };
  }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(200); };
  const safeTap = async (p, s) => { try { await tap(p, s); return true; } catch (e) { return false; } };
  const R = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, s);
  const J = o => JSON.stringify(o, (k, v) => typeof v === "number" ? Math.round(v * 10) / 10 : v);

  // ---- 1. inner portrait: the cover pattern ----
  if (on(1)) for (const [w, h] of [[669, 751], [669, 835]]) for (const big of [false, true]) {
    const size = `${w}x${h}${big ? " 200%" : ""}`;
    const { ctx, p, W } = await page(url, w, h, { big });
    const g = await p.evaluate(() => {
      const r = id => { const e = document.getElementById(id); return e && e.getClientRects().length ? e.getBoundingClientRect() : null; };
      const t = r("today"), s = r("weekStrip"), n = r("navRow"), sl = r("toastSlot"), pl = document.getElementById("planPane"), pr = pl.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(document.getElementById("toastSlot")).fontSize);
      return { counter: document.documentElement.classList.contains("counter"), order: [t, s, n, sl].map(x => x ? [Math.round(x.top + scrollY), Math.round(x.bottom + scrollY)] : null),
        planHidden: getComputedStyle(pl).visibility === "hidden" || pr.top >= innerHeight - 1 || pl.hidden, slotH: sl ? sl.height : 0, slotMin: Math.max(56, 2.5 * fs + 12),
        open: (document.getElementById("openPlan").textContent || "").trim(), ow: document.scrollingElement.scrollWidth, iw: innerWidth };
    });
    const o = g.order, ordered = o.every(Boolean) && o.every((v, i) => i === 0 || v[0] >= o[i - 1][1] - 0.5);
    rec(size, "inner portrait, cover pattern: today card, then strip, then the Back to today / Week and progress row, then the Undo slot", !g.counter && ordered, J(g));
    rec(size, "inner portrait: the plan is in its page, closed at rest; Week and progress opens it", g.planHidden && /Week and progress/.test(g.open), J(g));
    rec(size, "inner portrait: the Undo slot reserves max(56px, 2.5em + 12px)", g.slotH >= g.slotMin - 0.5, J(g));
    rec(size, "inner portrait: no horizontal overflow", g.ow <= g.iw + 1, J(g));
    await safeTap(p, '#weekStrip [data-strip="3"]');
    const k = await p.evaluate(() => { const t = document.getElementById("today").getBoundingClientRect(), bt = document.getElementById("backToday"); return { top: t.top, ih: innerHeight, back: !!(bt && bt.getClientRects().length) }; });
    rec(size, "inner portrait: picking a day reveals its card and shows Back to today under the strip", k.back && k.top < k.ih && k.top > -1e4, J(k));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }

  // ---- 2. inner portrait page: full width, two columns ----
  const progSeed = L.seedFor(B, { body: [{ id: "b1", date: "2026-10-20", weight: "180", wu: "lb" }, { id: "b2", date: "2026-10-13", weight: "181", wu: "lb" }],
    lifts: [{ id: "x1", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-12" }, { id: "x2", liftId: "squat", lift: "Squat", weight: "225", wu: "lb", reps: "5", date: "2026-10-13" }] });
  const openProgress = async (p, view) => { await safeTap(p, "#openPlan"); await p.waitForTimeout(350); await safeTap(p, '#planPane [data-tab="progress"]'); await p.waitForTimeout(200); await safeTap(p, `#planPane [data-pview="${view}"]`); await p.waitForTimeout(250); };
  const progProbe = p => p.evaluate(() => {
    const pl = document.getElementById("planPane"), g = pl.querySelector(".prog-grid"), gut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gut")) || 16;
    const cards = g ? Array.from(g.children).filter(c => c.getClientRects().length).map(c => { const r = c.getBoundingClientRect(); return [r.left, r.top, r.right, r.width]; }) : [];
    const gr = g ? g.getBoundingClientRect() : null, sp = document.getElementById("spine").getBoundingClientRect(), tb = pl.querySelector(".tabs").getBoundingClientRect(), pr = pl.getBoundingClientRect();
    const cols = g ? getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
    return { W: innerWidth, gut, page: [pr.left, pr.right], grid: gr ? [gr.left, gr.right, gr.top] : null, spine: [sp.left, sp.right, sp.top, sp.bottom], tabs: [tb.left, tb.right, tb.top, tb.bottom], cards, cols,
      over: Math.max(pl.scrollWidth - pl.clientWidth, document.scrollingElement.scrollWidth - innerWidth) };
  });
  if (on(2)) for (const [w, h] of [[669, 751], [669, 835]]) for (const big of [false, true]) for (const view of ["body", "lifts"]) {
    const size = `${w}x${h}${big ? " 200%" : ""} ${view}`;
    const { ctx, p, W } = await page(url, w, h, { big, seed: progSeed });
    await openProgress(p, view); const g = await progProbe(p);
    const lo = g.gut, hi = g.W - g.gut, full = x => x && Math.abs(x[0] - lo) <= 2 && Math.abs(x[1] - hi) <= 2;
    const pair = g.cards.some((a, i) => g.cards.some((c, j) => j > i && Math.abs(a[1] - c[1]) <= 1 && Math.abs(a[0] - c[0]) > g.W / 3));
    const odd = g.cards.length % 2 === 1 ? Math.abs(g.cards[g.cards.length - 1][3] - (hi - lo)) <= 2 : true;
    rec(size, "inner portrait page: full width (page edge to edge, content box = viewport less the gutters, +-2px)", g.page[0] <= 0.5 && g.page[1] >= g.W - 0.5 && full(g.grid), J(g));
    rec(size, "inner portrait page: the week grid and the tabs sit above the cards at full width", full(g.spine) && full(g.tabs) && g.tabs[3] <= g.grid[2] + 0.5 && g.spine[3] <= g.tabs[2] + 0.5, J(g));
    if (!big) rec(size, "inner portrait page: cards in two columns (two share a top within 1px, lefts more than W/3 apart); an odd last card spans both", g.cols === 2 && pair && odd, J(g));
    else rec(size, "inner portrait page at 200% text: two columns kept (documented: no one-column fallback needed at 669px), no horizontal overflow", g.cols === 2 && g.over <= 1, J(g));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (on(2)) for (const [w, h, safeB] of [[382, 644], [678, 396, 21]]) {
    const size = `${w}x${h} cover sheet`;
    const { ctx, p, W } = await page(url, w, h, { seed: progSeed, safeB });
    await openProgress(p, "body"); const g = await progProbe(p);
    rec(size, "cover sheets stay one column", g.cols <= 1 || (g.cards.length > 1 && g.cards.every(c => Math.abs(c[0] - g.cards[0][0]) < 1)), J(g));
    rec(size, "no horizontal overflow", g.over <= 1, J(g));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }

  // ---- 3. inner landscape matches v0.1.3.2 ----
  const RECTS = ["#paneToday", "#planPane", "#header", "#today", "#weekStrip", "#todayDone", "#spine", ".tabs", "#toastSlot", "#today .set-row:nth-child(1)", "#today .set-row:nth-child(4)", "#today .today-top", "#btnMore"];
  const rects = p => p.evaluate(S => S.map(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return [s, null]; const r = e.getBoundingClientRect(); return [s, [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10)]; }), RECTS);
  if (on(3)) for (const [w, h] of [[951, 585], [951, 669]]) for (const pick of [false, true]) for (const big of [false, true]) {
    const size = `${w}x${h}${big ? " 200%" : ""}${pick ? " picked" : ""}`, got = [];
    for (const u of [url, OLD.url]) { const { ctx, p } = await page(u, w, h, { big, dark: true }); if (pick) await safeTap(p, '#weekStrip [data-strip="3"]'); got.push(await rects(p)); await ctx.close(); }
    const diff = got[0].filter((x, i) => { const y = got[1][i][1]; return !x[1] !== !y || (x[1] && x[1].some((v, k) => Math.abs(v - y[k]) > 1)); }).map((x, i) => [x[0], x[1], got[1].find(z => z[0] === x[0])[1]]);
    rec(size, "inner landscape: rects match v0.1.3.2 within 1px", diff.length === 0, J(diff));
  }

  // ---- 4. popovers attach to their control ----
  const clear = p => p.evaluate(() => { const c = document.getElementById("clearProbe"); const st = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-t")) || 0; return { top: c ? c.getBoundingClientRect().top : Math.max(st, 50) + 12, st, W: innerWidth, H: innerHeight }; });
  async function placed(p, boxSel, anchorSel, name, size, anchored) {
    const c = await clear(p), r = await R(p, boxSel), a = anchorSel ? await R(p, anchorSel) : null;
    const at = await p.evaluate(s => { const e = document.querySelector(s); return e ? e.dataset.at || "" : ""; }, boxSel);
    const want = Math.max(c.st, 50) + 12;
    const base = !!r && r.t >= want - 0.5 && r.t >= c.st && r.w <= c.W - 32 + 0.5 && r.l >= -0.5 && r.r <= c.W + 0.5;
    let ok = base, how = "below the top clear zone";
    if (anchored) { const gap = a ? Math.min(Math.abs(a.t - r.b), Math.abs(r.t - a.b)) : 99; ok = base && a && ((["above", "below"].includes(at) && Math.abs(gap - 8) <= 1.5) || at === "clamped" || at === "top"); how = "attached to its control (8px gap above, else below, else clamped)"; }
    rec(size, `${name}: ${how}, width <= W-32, on screen`, ok, J({ r, a, at, clear: want, W: c.W }));
  }
  const imp = async (p, buf) => { const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 6000 }), tap(p, "#btnImport")]); await fc.setFiles({ name: "backup.json", mimeType: "application/json", buffer: buf }); await p.waitForTimeout(450); };
  const okBackup = Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21" } }));
  const openMore = async p => {
    if (!(await p.evaluate(() => document.getElementById("app").classList.contains("sheet-open")))) { await safeTap(p, "#openPlan"); await p.waitForTimeout(350); }
    if ((await p.evaluate(() => document.getElementById("btnMore").getAttribute("aria-expanded"))) !== "true") { await safeTap(p, "#btnMore"); await p.waitForTimeout(200); } };
  if (on(4)) for (const [w, h, safeT] of [[382, 644], [669, 751], [669, 835], [382, 644, 59]]) for (const big of [false, true]) {
    const size = `${w}x${h}${big ? " 200%" : ""}${safeT ? " top inset " + safeT : ""}`;
    { const { ctx, p, W } = await page(url, w, h, { big, safeT });
      await openMore(p); await safeTap(p, "#btnUpdate"); await p.waitForTimeout(300);
      await placed(p, "#updBox", "#btnUpdate", "Update plan", size, true);
      const kb = Math.round(h * 0.42); await p.focus("#updCode"); await p.waitForTimeout(150); await p.setViewportSize({ width: w, height: h - kb }); await p.waitForTimeout(500);
      const k = await p.evaluate(() => { const vv = visualViewport, lo = vv.offsetTop, hi = vv.offsetTop + vv.height, f = document.getElementById("updCode").getBoundingClientRect(), u = document.getElementById("updUse").getBoundingClientRect(), bx = document.getElementById("updBox").getBoundingClientRect();
        return { lo, hi, box: [bx.top, bx.bottom], field: [f.top, f.bottom], use: [u.top, u.bottom], counter: document.documentElement.classList.contains("counter") }; });
      rec(size, `Update plan, keyboard up (${kb}px): follows the visual viewport, the field and Use this plan in view, no layout flip`, k.box[0] >= k.lo - 0.5 && k.field[0] >= k.lo && k.field[1] <= k.hi && k.use[1] <= k.hi + 0.5 && !k.counter, J(k));
      /* keyboard down: the viewport comes back first, then the field loses focus */
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(900);
      await placed(p, "#updBox", "#btnUpdate", "Update plan, keyboard down again", size, true);
      await safeTap(p, "#updCancel"); await p.waitForTimeout(200);
      await openMore(p); await imp(p, okBackup);
      const kind = await p.evaluate(() => document.getElementById("dlg").dataset.kind);
      rec(size, "Import confirm opens", kind === "import", kind);
      await placed(p, "#dlg", "#btnImport", "Import confirm", size, true);
      await p.keyboard.press("Escape"); await p.waitForTimeout(250);
      await openMore(p); await imp(p, Buffer.from("{ not json"));
      rec(size, "Import error opens", (await p.evaluate(() => document.getElementById("dlg").dataset.kind)) === "error");
      await placed(p, "#dlg", "#btnImport", "Import error", size, true);
      rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
    { const seed = L.seedFor(B, { week: 4, done: { "w4-upperA": "done", "w4-lowerA": "skip" } });
      const { ctx, p, W } = await page(url, w, h, { big, safeT, seed });
      if (await safeTap(p, "#pushBack")) { rec(size, "Push back asks", (await p.evaluate(() => document.getElementById("dlg").dataset.kind)) === "pushback"); await placed(p, "#dlg", "#pushBack", "Push back", size, true); }
      else rec(size, "Push my plan back a week is reachable", false);
      rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
    { const { ctx, p, W } = await page(url, w, h, { big, safeT, seed: L.seedFor(B, { startDate: null }) });
      const kind = await p.evaluate(() => document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind);
      rec(size, "start date prompt opens", kind === "start", String(kind));
      await placed(p, "#dlg", null, "Start date prompt (no control: the top clear zone)", size, false);
      rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
    { const { ctx, p, W } = await page(url, w, h, { big, safeT, hash: "#p=" + L.code(L.norm(L.readSample(A))) });
      await p.waitForTimeout(300);
      const kind = await p.evaluate(() => document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind);
      rec(size, "replace plan prompt opens for a new plan link", kind === "replace", String(kind));
      await placed(p, "#dlg", null, "Replace plan prompt", size, false);
      rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
    { const { ctx, p } = await page(url, w, h, { big, safeT });
      await p.evaluate(() => { const x = document.createElement("i"); x.addEventListener("click", () => { throw new Error("gate: forced error"); }); x.click(); }); await p.waitForTimeout(300);
      await placed(p, "#fatal", null, "Crash panel", size, false);
      const f = await p.evaluate(() => { const e = document.getElementById("fatal"); if (!e) return null; const r = e.getBoundingClientRect(), sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0; return { b: r.bottom, zone: innerHeight - 50 - sb, sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e).overflowY }; });
      rec(size, "Crash panel ends above the bottom toolbar zone, scrolls inside when taller", !!f && f.b <= f.zone + 0.5 && (f.sh <= f.ch + 1 || f.ov === "auto"), J(f)); await ctx.close(); }
  }

  // ---- 5. old inner portrait expectations must fail ----
  const mut = { here: 0, old: 0, n: 0 };
  if (on(5)) for (const [w, h] of [[669, 751], [669, 835]]) for (const [tag, u] of [["v0.1.3.3", url], ["v0.1.3.2", OLD.url]]) {
    const { ctx, p } = await page(u, w, h);
    const checks = await p.evaluate(() => {
      const top = s => { const e = document.querySelector(s); return e && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      const o = ["#today", "#weekStrip", "#spine", ".tabs", ".footer"].map(top);
      const pl = document.getElementById("planPane"), pr = pl.getBoundingClientRect();
      return [["portrait order: today, strip, grid, tabs, settings in the page flow", o.every((v, i) => v != null && (i === 0 || v > o[i - 1]))],
        ["inner: no Showing / Week and progress row under the strip", getComputedStyle(document.getElementById("outerNav")).display === "none"],
        ["the plan is in the page flow (static and visible, not a closed page)", getComputedStyle(pl).visibility !== "hidden" && getComputedStyle(pl).position === "static"],
        ["no Week and progress button (nothing to open)", getComputedStyle(document.getElementById("openPlan")).display === "none"]];
    });
    for (const [name, ok] of checks) { mut.n += tag === "v0.1.3.3" ? 1 : 0; if (!ok) mut[tag === "v0.1.3.3" ? "here" : "old"]++;
      rec(`${w}x${h} mutation ${tag}`, `old expectation "${name}" ${tag === "v0.1.3.3" ? "FAILS on this build" : "passes on v0.1.3.2"}`, tag === "v0.1.3.3" ? !ok : ok); }
    await ctx.close();
  }

  // ---- 6. Counter ----
  /* 644x382 is the cover screen in landscape as measured on the phone (with and without a 21px bottom inset) */
  const CW = [[644, 382, 0], [644, 382, 21], [678, 396, 21], [678, 466, 21]];
  /* v0.1.3.3 (owner review): the week column fills the right side, seven equal rows >= 44px, nothing clipped (SUN
     included), inside the viewport less the safe areas; names and labels on one line (no truncation at default text);
     the list ends level with the left column; the header has no filter, mask or overlay and its kicker is one line */
  const weekProbe = (p, big) => p.evaluate(big => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), cs = e => getComputedStyle(e), root = cs(document.documentElement), ih = innerHeight, iw = innerWidth;
    const px = n => parseFloat(root.getPropertyValue(n)) || 0, safe = { t: px("--safe-t"), b: px("--safe-b"), l: px("--safe-l"), r: px("--safe-r") };
    const list = q("#weekStrip"), lr = rc(list), rows = Array.from(list.querySelectorAll("[data-strip]")), rr = rows.map(rc);
    const inBox = (r, c) => r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5 && r.left >= c.left - 0.5 && r.right <= c.right + 0.5;
    const view = { top: safe.t, bottom: ih - safe.b, left: safe.l, right: iw - safe.r };
    const rowsOut = rr.map((r, i) => inBox(r, lr) && inBox(r, view) ? null : i).filter(i => i !== null);
    let rowHits = 0; rr.forEach((a, i) => rr.slice(i + 1).forEach(c => { if (a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5 && a.left < c.right - 0.5 && c.left < a.right - 0.5) rowHits++; }));
    const trunc = [], wrap = [], iconHit = [];
    rows.forEach((e, i) => { const n = e.querySelector(".ss"), d = e.querySelector(".d"), dot = e.querySelector(".dot");
      [n, d].forEach(t => { if (!t) return; const lh = parseFloat(cs(t).lineHeight) || parseFloat(cs(t).fontSize) * 1.2;
        if (t.scrollWidth > t.clientWidth + 0.5 && (big ? cs(t).textOverflow !== "ellipsis" : true)) trunc.push(i + (t === n ? "n" : "d"));
        if (rc(t).height > lh * 1.5 || cs(t).whiteSpace !== "nowrap") wrap.push(i + (t === n ? "n" : "d")); });
      if (n && dot && rc(n).right > rc(dot).left + 0.5) iconHit.push(i); });
    const leftB = Math.max(rc(q("#today")).bottom, rc(q("#toastSlot")).bottom);
    /* header: no filter, backdrop, mask or opacity from the header up to the root; the kicker and Back to today are on top */
    const top = q("#today .today-top"), fx = [];
    for (let e = top; e; e = e.parentElement) { const c = cs(e); if ((c.filter && c.filter !== "none") || (c.backdropFilter && c.backdropFilter !== "none") || (c.webkitBackdropFilter && c.webkitBackdropFilter !== "none") || (c.maskImage && c.maskImage !== "none") || (c.webkitMaskImage && c.webkitMaskImage !== "none") || parseFloat(c.opacity) < 1) fx.push(e.id || e.className || e.tagName); }
    const covered = Array.from(top.querySelectorAll(".kicker, #backInline, svg")).filter(e => e.getClientRects().length).filter(e => { const r = rc(e), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit && (hit === e || e.contains(hit) || top.contains(hit))); }).map(e => e.className.baseVal != null ? "ring" : e.className || e.id);
    const k = q("#today .kicker"), klh = parseFloat(cs(k).lineHeight), dayx = q("#today .dayx");
    return { n: rows.length, rowsOut, rowHits, rowMin: Math.min(...rr.map(r => r.height)), rowMax: Math.max(...rr.map(r => r.height)), listScroll: list.scrollHeight - list.clientHeight, trunc, wrap, iconHit,
      fill: Math.round(Math.abs(lr.bottom - leftB) * 10) / 10, fx, covered, kLines: Math.round(rc(k).height / klh * 10) / 10, kText: k.textContent, dayx: !!dayx && dayx.getClientRects().length > 0,
      size: { row: Math.round(rr[0].height * 10) / 10, name: parseFloat(cs(rows[0].querySelector(".ss")).fontSize), day: parseFloat(cs(rows[0].querySelector(".d")).fontSize), dot: rows[0].querySelector(".dot").offsetWidth,
        cols: [Math.round(rc(q("#today")).width), Math.round(lr.width)], tight: document.documentElement.classList.contains("counter-tight") } };
  }, big);
  const weekOk = (g, big) => g.n === 7 && !g.rowsOut.length && !g.rowHits && g.rowMin >= 44 - 0.05 && (big || g.listScroll <= 0.5) && !g.trunc.length && !g.wrap.length && !g.iconHit.length && g.fill <= 1;
  const headOk = g => !g.fx.length && !g.covered.length && g.kLines <= 1.05 && !g.dayx;
  const counterProbe = p => p.evaluate(() => {
    const q = s => document.querySelector(s), box = e => { if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const card = q("#today"), cr = box(card), ih = innerHeight, iw = innerWidth;
    const onTop = e => { const r = e.getBoundingClientRect(), x = Math.min(Math.max(r.left + Math.min(12, r.width / 2), 0), iw - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), ih - 1), hit = document.elementFromPoint(x, y); return !!hit && (hit === e || e.contains(hit) || hit.contains(e)); };
    const inside = (r, c) => r && c && r.t >= c.t - 0.5 && r.b <= c.b + 0.5 && r.l >= c.l - 0.5 && r.r <= c.r + 0.5;
    const parts = ["#today .today-top", "#today .today-hero"].map(s => q(s)).concat(Array.from(document.querySelectorAll("#today .set-row")), [q("#todayDone"), q("#today .today-rest")]).filter(Boolean);
    const vis = parts.map(e => ({ c: e.className || e.id, ok: inside(box(e), cr) && inside(box(e), { l: 0, t: 0, r: iw, b: ih }) && onTop(e) }));
    const blocks = { card: cr, list: box(q("#weekStrip")), link: box(q("#openPlan")), slot: box(q("#toastSlot")) };
    const names = Object.keys(blocks), hits = [];
    /* two panels (v0.1.3.3 design review): the Undo slot is inside the Today panel, over the reserved top of the actions
       bar and above Skip and Mark day done; it may meet the card only there */
    const bar = box(q("#today .today-actions")), done = box(q("#todayDone")), slotInBar = !!blocks.slot && (bar && done ? inside(blocks.slot, bar) && blocks.slot.b <= done.t + 0.5 : !bar && inside(blocks.slot, cr)); /* a rest day has no actions bar: the reserved slot then sits inside the empty bottom of the panel */
    names.forEach((a, i) => names.slice(i + 1).forEach(c => { const x = blocks[a], y = blocks[c]; if (x && y && x.l < y.r - 0.5 && y.l < x.r - 0.5 && x.t < y.b - 0.5 && y.t < x.b - 0.5 && !(a + "x" + c === "cardxslot" && slotInBar)) hits.push(a + "x" + c); }));
    const fz = s => { const e = q(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const nav = box(q("#outerNav")), top = box(q("#today .today-top")), back = q("#backSlot .back-today"), bt = box(back);
    const panels = { topsEq: !!(nav && cr) && Math.abs(nav.t - cr.t) <= 1, bottomsEq: !!(blocks.list && cr) && Math.abs(blocks.list.b - cr.b) <= 1, headEq: !!(nav && top) && Math.abs(nav.h - top.h) <= 1,
      barAtBottom: bar ? Math.abs(bar.b - cr.b) <= 2 : !done, slotInBar,
      back: back ? { ph: back.classList.contains("bt-ph"), vis: getComputedStyle(back).visibility, inHead: !!nav && inside(bt, { l: nav.l, t: nav.t - 12, r: nav.r, b: nav.b }), right: nav ? Math.round(nav.r - bt.r) : null, w: Math.round(bt.w) } : null,
      planW: Math.round(blocks.link ? blocks.link.w : 0), linkDeco: getComputedStyle(q("#openPlan")).textDecorationLine,
      scale: { name: fz("#today .ex-name"), wname: fz("#weekStrip .ss"), sets: fz("#today .ex-sets"), wday: fz("#weekStrip .d") },
      kTrunc: (k => k ? k.scrollWidth > k.clientWidth + 1 : true)(q("#today .kicker")), doneOnTop: done ? onTop(q("#todayDone")) : false, scroll: document.documentElement.classList.contains("counter-scroll") };
    const allIn = names.every(n => blocks[n] && inside(blocks[n], { l: 0, t: 0, r: iw, b: ih }));
    const sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0, maxB = Math.max(...names.map(n => blocks[n] ? blocks[n].b : 0));
    const tg = ["#todayDone", "#openPlan", "#backInline"].map(s => [s, box(q(s))]).filter(x => x[1]).map(x => [x[0], Math.round(x[1].w), Math.round(x[1].h)]);
    const rowsH = Array.from(document.querySelectorAll("#weekStrip [data-strip]")).map(e => e.getBoundingClientRect().height);
    const fs = s => { const e = q(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const ls = q("#weekStrip");
    return { counter: document.documentElement.classList.contains("counter"), cs: getComputedStyle(document.documentElement).getPropertyValue("--cs").trim(), cardOver: card.scrollHeight - card.clientHeight,
      cardOvX: card.scrollWidth - card.clientWidth, vis: vis.filter(v => !v.ok).map(v => v.c), n: vis.length, hits, allIn, bottomOk: maxB <= ih - sb + 0.5, tg, rowsMin: Math.min(...rowsH), nRows: rowsH.length,
      font: { name: fs("#today .ex-name"), sets: fs("#today .ex-sets"), sub: fs("#today .today-hero .sub"), h2: fs("#today .today-hero h2") }, listScrolls: ls.scrollHeight > ls.clientHeight + 1, scrollY: scrollY, panels,
      h2: (q("#today .today-hero h2") || {}).textContent || "" };
  });
  const summary = {}, sizes = {}, planW = {};
  if (on(6)) for (const [w, h, safeB] of CW) for (const s of L.SAMPLES) {
    const size = `${w}x${h} ${s.split("-")[0]}`;
    const { ctx, p, W } = await page(url, w, h, { dark: true, safeB, seed: L.seedFor(s), now: "2026-10-24T12:00:00-05:00" });
    const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length), cs = new Set(), nameFs = new Set(); let bad = [], scrolls = false; const wbad = [], hbad = [];
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
      await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120);
      const g = await counterProbe(p); cs.add(g.cs); if (g.font.name) nameFs.add(g.font.name); scrolls = scrolls || g.listScrolls;
      /* WebKit (the phone's engine) must fit every day whole. Chromium here has wider fallback fonts than any phone, so
         there a day may scroll inside the panel, with Mark day done kept in view (sticky) */
      const fits = g.counter && ((g.cardOver <= 0.5 && g.vis.length === 0) || (engine === "chromium" && g.panels.scroll && g.panels.doneOnTop)), sep = g.hits.length === 0 && g.allIn && g.bottomOk, tgt = g.tg.every(t => t[1] >= 44 && t[2] >= 44) && g.rowsMin >= 44 - 0.5 && g.nRows === 7;
      /* one type scale (design review): names clamp(17, 0.40 x row, 22) in both panels, sets and day labels clamp(13, 0.30 x row, 16) */
      const sc = g.panels.scale, mins = !g.font.name || (g.font.name >= 17 - 0.05 && g.font.sets >= 13 - 0.05 && g.font.sub >= 13 - 0.05 && Math.abs(sc.name - sc.wname) <= 0.1 && Math.abs(sc.sets - sc.wday) <= 0.1);
      const pn = g.panels, bk = pn.back, picked = await p.evaluate(() => !!document.getElementById("backToday"));
      const panelsOk = pn.topsEq && pn.bottomsEq && pn.headEq && pn.barAtBottom && pn.slotInBar && !pn.kTrunc && pn.linkDeco === "none" && !!bk && bk.inHead && bk.right <= 8 && (picked ? !bk.ph && bk.vis === "visible" : bk.ph && bk.vis === "hidden");
      if (planW[size] == null) planW[size] = pn.planW; const keepW = Math.abs(planW[size] - pn.planW) <= 1;
      if (!(fits && sep && tgt && mins && panelsOk && keepW && g.scrollY === 0)) bad.push([i, { fits, sep, tgt, mins, panelsOk, keepW }, g]);
      const wk = await weekProbe(p, false); if (!weekOk(wk, false)) wbad.push([i, wk]); if (!headOk(wk)) hbad.push([i, wk]); sizes[w + "x" + h + "/" + safeB] = wk.size;
    }
    rec(size, "Counter week column: 7 equal rows >= 44px fill the right side (SUN unclipped), inside the list and the viewport less the safe areas, no row over another, no list scroll, names and day labels on one line and not truncated, clear of the status icon, list bottom within 16px of the left column's", wbad.length === 0, J(wbad.slice(0, 2)));
    rec(size, "Counter header: no filter, backdrop, mask or fade on it or above it; kicker, ring and Back to today on top (elementFromPoint); the kicker is one line; no 'Selected · Day N of N' line", hbad.length === 0, J(hbad.slice(0, 2)));
    rec(size, "Counter: every day: header, every exercise row and Mark day done fully visible with no card scroll (WebKit); nothing intersects (card, week list, link; the Undo slot only inside the actions bar, above the buttons); targets >= 44px; type at or above its floor and one scale across both panels; two panels: tops, bottoms and header heights equal, actions at the bottom, kicker not cut, plain week label, Back to today in the week header (right, its space kept: hidden while today is selected)", bad.length === 0, J(bad.slice(0, 2)));
    rec(size, "Counter: all days at the same scale (one --cs, one exercise-name size)", cs.size === 1 && nameFs.size <= 1, J([...cs, ...nameFs]));
    summary[size] = { cs: [...cs][0], name: [...nameFs][0], listScrolls: scrolls };
    if (s === B) {
      await p.evaluate(() => document.querySelector('#weekStrip [data-strip="0"]').scrollIntoView({ block: "nearest" })); await p.locator('#weekStrip [data-strip="0"]').tap(); await p.waitForTimeout(150);
      await p.locator("#today [data-skip]:visible").first().tap(); await p.waitForTimeout(350);
      const u = await p.evaluate(() => { const t = document.getElementById("toast"), sl = document.getElementById("toastSlot"), r = t.getBoundingClientRect(), s = sl.getBoundingClientRect(), d = document.getElementById("todayDone").getBoundingClientRect(), l = document.getElementById("weekStrip").getBoundingClientRect();
        const x = (a, c) => a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom; return { show: t.classList.contains("show"), inSlot: sl.contains(t) && r.top >= s.top - 0.5 && r.bottom <= s.bottom + 0.5, overDone: x(r, d), overList: x(r, l), undo: document.getElementById("toastUndo").getBoundingClientRect().height }; });
      rec(size, "Counter: Undo shows in its own slot (in the Today panel, right above the buttons), never over Mark day done or the list", u.show && u.inSlot && !u.overDone && !u.overList && u.undo >= 44, J(u));
    }
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (on(6)) for (const [w, h, safeB] of CW) for (const s of L.SAMPLES) {
    const size = `${w}x${h} 200% ${s.split("-")[0]}`;
    const { ctx, p, W } = await page(url, w, h, { dark: true, safeB, big: true, seed: L.seedFor(s), now: "2026-10-24T12:00:00-05:00" });
    const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length); const bad = [], wbad = [];
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
      await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120);
      const g = await p.evaluate(() => {
        const card = document.getElementById("today"), list = document.getElementById("weekStrip"), ih = innerHeight, iw = innerWidth;
        const rc = e => e.getBoundingClientRect(), cr = rc(card);
        const parts = Array.from(card.querySelectorAll(".today-top, .today-hero h2, .today-hero .sub, .set-row, #todayDone, .skip-bottom, #backInline, .today-rest")).filter(e => e.getClientRects().length && getComputedStyle(e).display !== "none");
        const unreach = [];
        /* v0.1.3.4: exercise rows scroll inside the list (its own scroll area), so a row's box is the list, not the card */
        const exl = card.querySelector(".set-rows");
        /* v0.1.3.4b: a list that snaps (200% text, overflowing) is reached the way a user reaches a row there, at the row's own
           snap point (its top at the list's top): scrollIntoView("nearest") aims the row's bottom at the list's bottom, and
           both engines then take the nearest snap point, which can be a line of the row before */
        const snaps = !!exl && /mandatory/.test(getComputedStyle(exl).scrollSnapType || "");
        parts.forEach(e => { if (snaps && e.classList.contains("set-row")) exl.scrollTop += rc(e).top - rc(exl).top - exl.clientTop; else e.scrollIntoView({ block: "nearest" }); const r = rc(e), sc = e.classList.contains("set-row") && exl ? exl : card, c = rc(sc); const hold = r.height <= sc.clientHeight + 0.5 ? r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5 : r.top <= c.top + sc.clientTop + 1; /* a part taller than its scroll area: its top reaches the scrollport (inside the border) */
          const hit = document.elementFromPoint(Math.min(r.left + 8, iw - 1), Math.min(Math.max(r.top + Math.min(r.height / 2, 10), c.top + 1), ih - 1));
          if (!hold || r.left < c.left - 0.5 || r.right > c.right + 0.5 || !(hit && (hit === e || e.contains(hit) || hit.contains(e)))) unreach.push(e.className || e.id); });
        card.scrollTop = 0; if (exl) exl.scrollTop = 0;
        const rowsBad = Array.from(list.querySelectorAll("[data-strip]")).filter(e => { e.scrollIntoView({ block: "nearest" }); const r = rc(e), l = rc(list); return r.top < l.top - 0.5 || r.bottom > l.bottom + 0.5 || r.height < 44 - 0.5 || r.right > l.right + 0.5; }).length;
        const blocks = [cr, rc(list), rc(document.getElementById("openPlan")), rc(document.getElementById("toastSlot"))];
        const barE = card.querySelector(".today-actions"), bar = barE ? rc(barE) : cr, sl = blocks[3], slotInBar = sl.top >= bar.top - 0.5 && sl.bottom <= (barE ? rc(document.getElementById("todayDone")).top : cr.bottom) + 0.5 && sl.left >= bar.left - 0.5 && sl.right <= bar.right + 0.5;
        let hits = 0; blocks.forEach((a, i) => blocks.slice(i + 1).forEach(c => { if (a === cr && c === sl && slotInBar) return; if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) hits++; }));
        const out = blocks.some(r => r.left < -0.5 || r.right > iw + 0.5 || r.top < -0.5 || r.bottom > ih + 0.5);
        return { counter: document.documentElement.classList.contains("counter"), unreach, rowsBad, hits, out, ovx: card.scrollWidth - card.clientWidth, cardScroll: getComputedStyle(card).overflowY, docX: document.scrollingElement.scrollWidth - iw };
      });
      if (!(g.counter && !g.unreach.length && !g.rowsBad && !g.hits && !g.out && g.ovx <= 1 && g.docX <= 1)) bad.push([i, g]);
      const wk = await weekProbe(p, true); if (!weekOk(wk, true) || wk.fx.length || wk.covered.length || wk.kLines > 2.1) wbad.push([i, wk]); sizes[w + "x" + h + "/" + safeB + " 200%"] = wk.size;
    }
    rec(size, "Counter week column at 200% text: 7 rows >= 44px, all inside the list and the safe viewport, one line each with an ellipsis (never wrapping or over the icon); the kicker at most two lines, nothing over the header", wbad.length === 0, J(wbad.slice(0, 2)));
    rec(size, "Counter at 200% text: the exercise list scrolls inside the card (v0.1.3.4: the list, not the card); every part reachable, never clipped or covered; week rows reachable in the list; nothing overlaps", bad.length === 0, J(bad.slice(0, 2)));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (on(6)) for (const [pw, ph, lw, lh] of [[382, 644, 678, 396], [382, 560, 678, 466]]) {
    const size = `flip ${pw}x${ph} <-> ${lw}x${lh}`;
    const { ctx, p, W } = await page(url, pw, ph, { dark: true, now: "2026-10-24T12:00:00-05:00" });
    await safeTap(p, '#weekStrip [data-strip="0"]'); await p.locator("#today [data-skip]:visible").first().tap(); await p.waitForTimeout(200);
    await safeTap(p, '#weekStrip [data-strip="3"]');
    const st = () => p.evaluate(() => ({ counter: document.documentElement.classList.contains("counter"), h2: (document.querySelector("#today .today-hero h2") || {}).textContent || "", mon: (document.querySelector('#weekStrip [data-strip="0"] .dot') || {}).className || "",
      upd: !document.getElementById("updBox").hidden, dlg: document.getElementById("dlg").hidden ? null : document.getElementById("dlg").dataset.kind, sheet: document.getElementById("app").classList.contains("sheet-open"),
      sy: scrollY, max: document.scrollingElement.scrollHeight - innerHeight, card: (r => [r.top, r.bottom])(document.getElementById("today").getBoundingClientRect()), ih: innerHeight, cardTop: document.getElementById("today").scrollTop, log: localStorage.getItem("ct1-done") }));
    const a = await st();
    await p.setViewportSize({ width: lw, height: lh }); await p.waitForTimeout(600); const l1 = await st();
    rec(size, "portrait to landscape: Counter on, the picked day (Thu) and the logged skip (Mon) kept, page not scrolled, card at its top", l1.counter && /Thu/.test(l1.h2) && /skip/.test(l1.mon) && l1.log === a.log && l1.sy === 0 && l1.cardTop === 0, J(l1));
    await p.setViewportSize({ width: pw, height: ph }); await p.waitForTimeout(600); const p1 = await st();
    rec(size, "landscape to portrait: cover pattern, day and log kept, the card in view", !p1.counter && /Thu/.test(p1.h2) && /skip/.test(p1.mon) && p1.log === a.log && p1.card[0] < p1.ih && p1.card[1] > 0 && p1.sy <= p1.max + 1, J(p1));
    /* a popover attached to a control (Update plan, Import confirm) closes the way Cancel does */
    await openMore(p); await safeTap(p, "#btnUpdate"); await p.waitForTimeout(250); const u0 = await st();
    await p.setViewportSize({ width: lw, height: lh }); await p.waitForTimeout(600); const u1 = await st();
    rec(size, "flip with Update plan open: it closes cleanly (nothing changes), the page closes, Counter on", u0.upd && !u1.upd && !u1.sheet && u1.counter && u1.log === a.log, J({ u0: u0.upd, u1 }));
    await openMore(p); await imp(p, okBackup); const i0 = await st();
    await p.setViewportSize({ width: pw, height: ph }); await p.waitForTimeout(600); const i1 = await st();
    rec(size, "flip with Import confirm open: it closes as Cancel (the plan is unchanged), cover pattern", i0.dlg === "import" && i1.dlg === null && !i1.counter && (await L.ls(p, "plan")).meta.name === L.norm(L.readSample(B)).meta.name, J({ i0: i0.dlg, i1 }));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (on(6)) { const size = "flip with a link prompt";
    const { ctx, p, W } = await page(url, 382, 644, { hash: "#p=" + L.code(L.norm(L.readSample(A))) });
    await p.setViewportSize({ width: 678, height: 396 }); await p.waitForTimeout(600);
    const g = await p.evaluate(() => { const d = document.getElementById("dlg"), r = d.getBoundingClientRect(); return { kind: d.hidden ? null : d.dataset.kind, t: r.top, b: r.bottom, l: r.left, r: r.right, W: innerWidth, H: innerHeight, counter: document.documentElement.classList.contains("counter") }; });
    rec(size, "a link prompt (replace plan) stays open through the flip, on screen and width <= W-32", g.kind === "replace" && g.counter && g.t >= 0 && g.l >= 0 && g.r <= g.W && g.r - g.l <= g.W - 32 + 0.5, J(g));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
  if (on(6)) { const size = "669x751 typing";
    const { ctx, p, W } = await page(url, 669, 751, { seed: progSeed });
    await openProgress(p, "body");
    const f = await p.evaluate(() => { const e = document.querySelector('#planPane input[type="text"], #planPane input[inputmode], #planPane input:not([type="date"]):not([type="button"])'); if (!e) return null; e.focus(); return e.id || e.className; });
    await p.setViewportSize({ width: 669, height: 400 }); await p.waitForTimeout(600);
    const g = await p.evaluate(() => ({ counter: document.documentElement.classList.contains("counter"), sheet: document.getElementById("app").classList.contains("sheet-open"), focus: document.activeElement && document.activeElement.tagName }));
    rec(size, "a focused text field never flips the layout when the keyboard makes the viewport wider than tall", !!f && !g.counter && g.sheet, J({ f, g }));
    await p.setViewportSize({ width: 669, height: 751 }); await p.waitForTimeout(400);
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(1000);
    rec(size, "after the keyboard closes: still the inner portrait cover pattern", !(await p.evaluate(() => document.documentElement.classList.contains("counter"))));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  // ---- 7. Counter in both landscape rotations (camera cut-out left or right), and the old capped list as a mutation ----
  const mut7 = { n: 0, fail: 0 };
  if (on(7)) for (const [w, h] of [[644, 382], [678, 396], [678, 466]]) for (const [side, css] of [["landscape-left", ":root{--safe-l:47px !important;--safe-b:21px !important}"], ["landscape-right", ":root{--safe-r:47px !important;--safe-b:21px !important}"]]) {
    const size = `${w}x${h} ${side}`;
    const { ctx, p, W } = await page(url, w, h, { dark: true, seed: L.seedFor(B), now: "2026-10-24T12:00:00-05:00" });
    await p.addStyleTag({ content: css }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(400);
    const bad = [];
    for (let i = 0; i < 7; i++) {
      await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120);
      const g = await p.evaluate(() => { const root = getComputedStyle(document.documentElement), px = n => parseFloat(root.getPropertyValue(n)) || 0, sl = px("--safe-l"), sr = innerWidth - px("--safe-r"), st = px("--safe-t"), sb = innerHeight - px("--safe-b");
        const els = Array.from(document.querySelectorAll("#paneToday *")).filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.closest(".toast:not(.show)"));
        const out = els.filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.left < sl - 0.5 || r.right > sr + 0.5 || r.top < st - 0.5 || r.bottom > sb + 0.5); }).map(e => e.id || String(e.className.baseVal != null ? e.className.baseVal : e.className)).slice(0, 6);
        return { counter: document.documentElement.classList.contains("counter"), out }; });
      const wk = await weekProbe(p, false);
      if (!(g.counter && !g.out.length && weekOk(wk, false) && headOk(wk))) bad.push([i, g, wk]);
    }
    rec(size, "Counter with the camera cut-out on this side (47px inset, 21px bottom): every day, no element inside a safe area, the week column and header rules hold", bad.length === 0, J(bad.slice(0, 2)));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  /* mutation: the v0.1.3.3 first cut capped the list above a right-column Undo slot (SUN clipped, the list scrolled) */
  if (on(7)) for (const [w, h, safeB] of CW) {
    const { ctx, p } = await page(url, w, h, { dark: true, safeB, seed: L.seedFor(B), now: "2026-10-24T12:00:00-05:00" });
    await p.addStyleTag({ content: "html.counter #paneToday #weekStrip{grid-row:2 / 3 !important;overflow-y:auto !important;margin-bottom:64px !important}html.counter #paneToday .wstrip{height:auto !important;grid-template-rows:repeat(7,44px) !important}" }); await p.waitForTimeout(300);
    const wk = await weekProbe(p, false); mut7.n++; if (!weekOk(wk, false)) mut7.fail++;
    rec(`${w}x${h}/${safeB} mutation`, "the old capped week list (shorter than the column, scrolling) fails the week column rule", !weekOk(wk, false), J({ rowsOut: wk.rowsOut, listScroll: wk.listScroll, fill: wk.fill }));
    await ctx.close();
  }

  // ---- 8. v0.1.3.4: at 200% text the exercise list is its own scroll area with an "N more" pill ----
  /* Designer must-fix: at 644x382 the Today panel showed only the first exercise name above a blank band (the opaque sticky
     actions bar, whose top is the reserved Undo slot, painted over the card's scrolled rows). Spec: the list scrolls by
     itself between the title block and the pinned actions; while rows are below its visible end, a solid "N more" pill
     (N = rows not fully visible) sits on its bottom edge, >= 44px, named "N more exercises"; a tap scrolls the next rows in;
     it hides at the end and when nothing overflows; no mask, fade or gradient; it never covers Skip, Done or the Undo slot. */
  const listProbe = p => p.evaluate(() => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), cs = (e, ps) => getComputedStyle(e, ps || null);
    const card = q("#today"), list = card.querySelector(".set-rows"), pill = q("#morePill"), ih = innerHeight, iw = innerWidth;
    if (!list) return { rest: true };
    const lr = rc(list), cr = rc(card), lb = lr.bottom - list.clientTop, rows = Array.from(list.querySelectorAll(".set-row"));
    /* 200% text with an overflowing list (v0.1.3.4b, .more-on): N = rows entirely below the visible area; otherwise N = rows
       whose bottom is below the list's visible end, none at the end (1px: WebKit scrolls in whole pixels) */
    const more = card.classList.contains("more-on"), lt = lr.top + list.clientTop, vb = lt + list.clientHeight;
    const over = list.scrollHeight - list.clientHeight > 0.5, atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    const n = !over ? 0 : more ? rows.filter(r => rc(r).top >= vb - 1).length : !atEnd ? rows.filter(r => rc(r).bottom > lb + 1).length : 0;
    /* the list's top edge: the first visible row's top, rows cut by it, and lines of text cut by it (text ranges, any row) */
    const firstVis = rows.find(r => rc(r).bottom > lt + 1), topOff = firstVis ? rc(firstVis).top - lt : 0;
    const partialAbove = rows.filter(r => rc(r).top < lt - 1 && rc(r).bottom > lt + 1).length;
    /* lines of text cut by the top edge: each word (span.w), tag and deload note is one line's box (line-height at least the
       font's content height); text ranges would flag a font's ascent and descent space, which Chromium makes taller than the line */
    const cut = Array.from(list.querySelectorAll(".set-row .w, .set-row .tag, .set-row .ex-dl")).map(u => [u.textContent.trim().slice(0, 12), rc(u)]).filter(x => x[1].height > 0 && x[1].top < lt - 1 && x[1].bottom > lt + 1).map(x => [x[0], Math.round((lt - x[1].top) * 10) / 10, Math.round((x[1].bottom - lt) * 10) / 10]);
    /* snap: the list snaps (y mandatory) and every row's top is a start snap point (the row, or its 1px marker for a row taller than the list) */
    const snapType = cs(list).scrollSnapType || "", rowSnap = rows.map(r => { if (/start/.test(cs(r).scrollSnapAlign || "")) return true; const m = r.querySelector(".snap-top"); return !!m && /start/.test(cs(m).scrollSnapAlign || "") && m.getClientRects().length > 0 && Math.abs(rc(m).top - rc(r).top) <= 0.5; });
    const last = rows[rows.length - 1], lastReached = !!last && rc(last).top < vb - 1, lastAtTop = !!last && Math.abs(rc(last).top - lt) <= 1;
    const shown = !!pill && !pill.hidden && pill.getClientRects().length > 0 && cs(pill).display !== "none" && cs(pill).visibility === "visible";
    const pr = shown ? rc(pill) : null;
    const X = (a, c) => !!a && !!c && a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    const IN = (a, c) => a.top >= c.top - 0.5 && a.bottom <= c.bottom + 0.5 && a.left >= c.left - 0.5 && a.right <= c.right + 0.5;
    const onTop = e => { const r = rc(e), x = Math.min(Math.max(r.left + r.width / 2, 0), iw - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), ih - 1), h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); };
    /* the header (kicker row, title, focus line) and the actions are whole, on screen and on top */
    const fixed = [".today-top", ".today-hero h2", ".today-hero .sub", "#todayDone", ".skip-bottom"].map(s => card.querySelector(s)).filter(e => e && e.getClientRects().length && cs(e).display !== "none");
    const view = { top: 0, bottom: ih, left: 0, right: iw };
    const fixedBad = fixed.filter(e => !(IN(rc(e), cr) && IN(rc(e), view) && onTop(e))).map(e => e.id || e.className || e.tagName);
    const done = q("#todayDone"), skip = card.querySelector(".skip-bottom"), slot = q("#toastSlot"), toast = q("#toast"), bar = card.querySelector(".today-actions"), top = card.querySelector(".today-top"), hero = card.querySelector(".today-hero");
    /* no mask, fade or gradient on the list, the pill, or any ancestor (and the list's own pseudo-elements) */
    const fx = [];
    const look = (e, ps) => { const c = cs(e, ps), name = (e.id || e.className || e.tagName) + (ps || "");
      if (c.maskImage && c.maskImage !== "none") fx.push(name + " mask-image"); if (c.webkitMaskImage && c.webkitMaskImage !== "none") fx.push(name + " -webkit-mask-image");
      if (c.filter && c.filter !== "none") fx.push(name + " filter"); if (/gradient/.test(c.backgroundImage || "")) fx.push(name + " gradient"); };
    for (let e = list; e; e = e.parentElement) look(e); look(list, "::before"); look(list, "::after"); if (pill) { look(pill); look(pill, "::before"); look(pill, "::after"); }
    /* the pill against every row, rows clipped to the list's visible box (what is on screen) */
    const clip = r => { const a = rc(r); return { left: Math.max(a.left, lr.left), right: Math.min(a.right, lr.right), top: Math.max(a.top, lt), bottom: Math.min(a.bottom, vb) }; };
    const rowHits = shown ? rows.map((r, i) => [i, clip(r)]).filter(x => x[1].bottom > x[1].top && X(pr, x[1])).map(x => x[0]) : [];
    const ar = bar ? rc(bar) : null, strip = !!pr && more ? pr.top >= lr.bottom - 0.5 && (!ar || pr.bottom <= ar.top + 0.5) && Math.abs(pr.right - (lr.right - 16)) <= 1 : null;
    const pillHits = shown ? [["Done", done], ["Skip", skip], ["Undo slot", slot], ["Undo toast", toast && toast.classList.contains("show") ? toast : null], ["header", top], ["title", hero], ["week list", q("#weekStrip")], ["week header", q("#outerNav")]].filter(x => x[1] && X(pr, rc(x[1]))).map(x => x[0]) : [];
    const blockHits = [["header/list", X(rc(hero), lr) || X(rc(top), lr)], ["list/actions", !!bar && lr.bottom > rc(bar).top + 0.5], ["list/week", X(lr, rc(q("#weekStrip")))]].filter(x => x[1]).map(x => x[0]);
    return { rows: rows.length, over, n, shown, label: shown ? pill.getAttribute("aria-label") || "" : "", tag: pill ? pill.tagName : "", text: shown ? pill.textContent.trim() : "",
      pill: pr ? { w: pr.width, h: pr.height, inList: IN(pr, lr), bottomEdge: Math.abs(lb - pr.bottom) <= 12, onTop: onTop(pill) } : null,
      oy: cs(list).overflowY, cardOver: card.scrollHeight - card.clientHeight, st: list.scrollTop, end: list.scrollTop + list.clientHeight >= list.scrollHeight - 1, fixedBad, fx, pillHits, blockHits,
      tg: [done, skip].filter(Boolean).map(e => [Math.round(rc(e).width), Math.round(rc(e).height)]), lh: list.clientHeight, sh: list.scrollHeight,
      more, topOff, partialAbove, cut, snapType, rowSnap: rowSnap.every(Boolean), lastReached, lastAtTop, rowHits, strip, max: list.scrollHeight - list.clientHeight };
  });
  /* the rules, by name; each probe result passes or fails each one */
  const LR = {
    "the list is its own scroll area (overflow-y auto) and the card itself does not scroll": g => g.rest || ((g.oy === "auto" || g.oy === "scroll") && g.cardOver <= 0.5),
    "header (kicker, title, focus) and Skip / Done whole, on screen and on top": g => g.rest || !g.fixedBad.length,
    "the pill shows exactly when rows overflow, with N = rows not fully visible, as a button named 'N more exercise(s)'": g => g.rest || (g.n > 0 ? g.shown && g.tag === "BUTTON" && g.label === `${g.n} more exercise${g.n === 1 ? "" : "s"}` && g.text.startsWith(g.n + " more") : !g.shown),
    "the pill sits on the list's bottom edge, inside the list, on top, at least 44x44 (200% text, overflowing: on its own strip under the rows, right side, above the actions)": g => g.rest || !g.shown || ((g.more ? g.strip : g.pill.inList && g.pill.bottomEdge) && g.pill.onTop && g.pill.h >= 44 - 0.5 && g.pill.w >= 44 - 0.5),
    "200% text, overflowing list: scroll-snap-type y mandatory, a start snap point at every row's top": g => g.rest || !g.more || (/y/.test(g.snapType) && /mandatory/.test(g.snapType) && g.rowSnap),
    "200% text, overflowing list: the top edge cuts no line of text": g => g.rest || !g.more || !g.cut.length,
    "the pill's rect intersects no row (rows clipped to the list's view)": g => g.rest || !g.shown || !g.rowHits.length,
    "200% text, overflowing list: the pill is hidden once the last row is reached": g => g.rest || !g.more || !g.lastReached || !g.shown,
    "nothing overlaps: the pill clear of Skip, Done, the Undo slot, the header and the week panel; the list clear of the header, actions and week list": g => g.rest || (!g.pillHits.length && !g.blockHits.length),
    "no mask, fade, filter or gradient on the list, the pill or any ancestor": g => g.rest || !g.fx.length,
    "Skip and Done at least 44x44": g => g.rest || g.tg.every(t => t[0] >= 44 && t[1] >= 44),
  };
  const lrBad = g => Object.keys(LR).filter(k => !LR[k](g));
  /* tap the pill until it hides: each tap scrolls the list down, N never grows, it hides only at the end */
  async function walkPill(p) {
    const steps = []; let g = await listProbe(p), ok = true, why = "";
    for (let k = 0; k < 40 && g.shown; k++) {
      const st = g.st, n = g.n; await p.locator("#morePill").tap(); await p.waitForTimeout(150); g = await listProbe(p);
      steps.push([Math.round(g.st), g.n, g.shown]);
      if (!(g.st > st + 0.5)) { ok = false; why = "tap did not scroll"; break; }
      if (g.n > n) { ok = false; why = "N grew"; break; }
      if (lrBad(g).length) { ok = false; why = "rule broke after a tap: " + lrBad(g).join("; "); break; }
      if (g.more && (Math.abs(g.topOff) > 1 || g.partialAbove)) { ok = false; why = "after a tap the first visible row's top is not the list's top: " + J({ topOff: g.topOff, partialAbove: g.partialAbove }); break; }
    }
    if (ok && g.shown) { ok = false; why = "still shown after 40 taps"; }
    if (ok && !g.more && !g.end) { ok = false; why = "hid before the end"; }
    if (ok && g.more && !g.lastAtTop) { ok = false; why = "hid before the last row reached the list's top"; }
    return { ok, why, taps: steps.length, steps: steps.slice(-4), g };
  }
  const C8 = [[644, 382, 0], [644, 382, 21], [678, 396, 21]], pillSum = {}, SETTLE = [0.13, 0.37, 0.61, 0.89];
  /* a scroll that stops at an arbitrary offset (Playwright's mobile WebKit has no wheel; a scrollTop write snaps the same way) */
  const settle = async (p, f) => { await p.evaluate(f => { const l = document.querySelector("#today .set-rows"); l.scrollTop = Math.round(f * (l.scrollHeight - l.clientHeight)); }, f); await p.waitForTimeout(600); return listProbe(p); };
  if (on(8)) for (const [w, h, safeB] of C8) for (const s of L.SAMPLES) {
    const size = `${w}x${h}/${safeB} 200% ${s.split("-")[0]}`;
    const { ctx, p, W } = await page(url, w, h, { dark: true, safeB, big: true, seed: L.seedFor(s), now: "2026-10-24T12:00:00-05:00" });
    const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length); const bad = [], walk = [], seen = [], settleBad = []; let longest = null, moreDays = 0;
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
      await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(150);
      const g = await listProbe(p); if (g.rest) continue;
      seen.push([i, g.n, g.over]); if (!longest || g.sh > longest.sh) longest = { i, sh: g.sh, n: g.n };
      const b0 = lrBad(g); if (b0.length) bad.push([i, "at rest", b0, g]);
      const wk = await walkPill(p); if (!wk.ok) walk.push([i, wk]);
      const b1 = lrBad(wk.g); if (b1.length) bad.push([i, "at the end", b1, wk.g]);
      if (g.more) { moreDays++; for (const f of SETTLE) { const gs = await settle(p, f); const bs = lrBad(gs); if (bs.length) settleBad.push([i, f, bs, { st: gs.st, cut: gs.cut, topOff: gs.topOff }]); } }
    }
    rec(size, "200% text: a scroll that settles anywhere (scrollTop at " + SETTLE.join(", ") + " of the range, 600ms) leaves the snap rules holding: no cut line at the top, N and the pill right", settleBad.length === 0, J(settleBad.slice(0, 2)));
    if (s === B) rec(size, "the snap and pill-strip rules were exercised (some day overflows at 200% text)", moreDays > 0, J({ moreDays }));
    rec(size, "every training day at rest and after walking the pill to the end: " + Object.keys(LR).join("; "), bad.length === 0, J(bad.slice(0, 2)));
    rec(size, "tapping the pill scrolls the list each time, N never grows, and it hides only at the end of the list", walk.length === 0, J(walk.slice(0, 2)));
    if (s === B) rec(size, "the longest day overflows at 200% text and shows the pill", !!longest && longest.n > 0, J(longest));
    /* Undo after Skip on the longest day: the toast shows in its slot and the pill stays clear of it */
    if (longest) {
      await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), longest.i);
      await p.locator(`#weekStrip [data-strip="${longest.i}"]`).tap(); await p.waitForTimeout(150);
      await p.locator("#today [data-skip]:visible").first().tap(); await p.waitForTimeout(400);
      const g = await listProbe(p), u = await p.evaluate(() => document.getElementById("toast").classList.contains("show"));
      rec(size, "longest day with Undo showing: the rules hold and the pill is clear of the toast and every row", u && !lrBad(g).length, J({ u, bad: lrBad(g), hits: g.pillHits, rowHits: g.rowHits }));
    }
    pillSum[size] = { longest, days: seen };
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  /* default text: nothing changes, the pill never shows (WebKit fits every day; Chromium's wider fonts may scroll a day, then the pill rules hold) */
  if (on(8)) for (const [w, h, safeB] of C8) for (const s of L.SAMPLES) {
    const size = `${w}x${h}/${safeB} ${s.split("-")[0]}`;
    const { ctx, p, W } = await page(url, w, h, { dark: true, safeB, seed: L.seedFor(s), now: "2026-10-24T12:00:00-05:00" });
    const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length); const bad = [];
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
      await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120);
      const g = await listProbe(p); if (g.rest) continue;
      if ((engine === "webkit" && (g.over || g.shown)) || lrBad(g).length) bad.push([i, lrBad(g), g]);
    }
    rec(size, "default text: every row fits with no list scroll and no pill (WebKit); the list rules hold (both engines)", bad.length === 0, J(bad.slice(0, 2)));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  /* normal text: the Counter is the same as v0.1.3.4 before the snap and pill strip (3af3491, served here). Every element in
     the Today panel and the week column (the new word spans and row markers excluded: they have no box at normal text),
     every day, at rest and with Undo showing, rects within 0.01px */
  const rectsOf = p => p.evaluate(() => { const out = [];
    for (const root of [document.getElementById("today"), document.getElementById("weekStrip"), document.getElementById("toastSlot")]) { if (!root) continue;
      for (const e of [root, ...root.querySelectorAll("*")]) { if (e.matches("span.w, i.snap-top") || e.closest("svg") && e.tagName.toLowerCase() !== "svg") continue;
        const r = e.getBoundingClientRect(); out.push([e.tagName + "." + (typeof e.className === "string" ? e.className : ""), r.left, r.top, r.width, r.height]); } }
    return out; });
  const sameRects = (a, c) => { if (a.length !== c.length) return "count " + a.length + " vs " + c.length; for (let k = 0; k < a.length; k++) { if (a[k][0] !== c[k][0]) return "element " + k + ": " + a[k][0] + " vs " + c[k][0]; for (let j = 1; j < 5; j++) if (Math.abs(a[k][j] - c[k][j]) > 0.01) return a[k][0] + " " + J(a[k]) + " vs " + J(c[k]); } return ""; };
  if (on(8)) for (const [w, h, safeB] of [...C8, [678, 466, 21]]) for (const s of L.SAMPLES) {
    const size = `${w}x${h}/${safeB} ${s.split("-")[0]}`, got = [];
    for (const u of [url, PREV.url]) {
      const { ctx, p } = await page(u, w, h, { dark: true, safeB, seed: L.seedFor(s), now: "2026-10-24T12:00:00-05:00" });
      const n = await p.evaluate(() => document.querySelectorAll("#weekStrip [data-strip]").length), all = [];
      for (let i = 0; i < n; i++) {
        await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i);
        await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(120); all.push(await rectsOf(p));
      }
      if (await safeTap(p, "#today [data-skip]:visible")) { await p.waitForTimeout(300); all.push(await rectsOf(p)); }
      got.push(all); await ctx.close();
    }
    let diff = got[0].length !== got[1].length ? "states " + got[0].length + " vs " + got[1].length : "";
    for (let k = 0; !diff && k < got[0].length; k++) { const d = sameRects(got[0][k], got[1][k]); if (d) diff = "state " + k + ": " + d; }
    rec(size, "normal text: every Counter element rect (every day, and with Undo showing) is identical to 3af3491", !diff, diff);
  }
  /* mutations: each must fail the rules above. CSS ones are added to the page; source ones are served from this build's
     index.html with one change (no snap; a tap that goes 30px past the next row's top, so that row is partly above the top; N
     counting partly hidden rows; the pill back over the rows) */
  const mut8 = [];
  const HERE = require("fs").readFileSync(require("path").join(L.ROOT, "index.html"), "utf8");
  const SRC_MUT = [
    ["no snap", "scroll-snap-type: y mandatory;", "scroll-snap-type: none;"],
    ["a partial row at the top after a tap (each tap goes 30px past the next row's top)", "list.scrollTop + next.getBoundingClientRect().top - lt)", "list.scrollTop + next.getBoundingClientRect().top - lt + 30)"],
    ["N counts partly visible rows", "return r.getBoundingClientRect().top >= vb - 1;", "return r.getBoundingClientRect().bottom > vb + 1;"],
    ["the pill over the rows (no strip)", ".today.more-on .more-pill:not([hidden]) { margin: 0 16px 0 0; }", ".today.more-on .more-pill:not([hidden]) { margin: -45px 16px 1px 0; }"]];
  for (const m of SRC_MUT) if (!HERE.includes(m[1])) throw new Error("mutation anchor missing: " + m[0]);
  const mutServers = on(8) ? await Promise.all(SRC_MUT.map(m => serveHtml(HERE.split(m[1]).join(m[2])))) : [];
  if (on(8)) for (const [w, h, safeB] of [[644, 382, 21], [678, 396, 21]]) for (const [name, css, srv] of [
    ["no scroll area (the list at full height, the card scrolls)", "html.counter #paneToday .set-rows{flex:0 0 auto !important;overflow-y:visible !important}"],
    ["no pill", "html.counter #paneToday .more-pill{display:none !important}"],
    ["a fade on the list", "html.counter #paneToday .set-rows{-webkit-mask-image:linear-gradient(#000 70%,transparent) !important;mask-image:linear-gradient(#000 70%,transparent) !important}"],
    ...SRC_MUT.map((m, k) => [m[0], "", mutServers[k]])]) {
    const { ctx, p } = await page(srv ? srv.url : url, w, h, { dark: true, safeB, big: true, seed: L.seedFor(B), now: "2026-10-24T12:00:00-05:00" });
    if (css) { await p.addStyleTag({ content: css }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(400); }
    await p.locator('#weekStrip [data-strip="0"]').tap(); await p.waitForTimeout(200);
    const g = await listProbe(p), b0 = lrBad(g), wk = await walkPill(p), sb = [];
    for (const f of SETTLE) { await p.locator('#weekStrip [data-strip="0"]').tap(); await p.waitForTimeout(150); const gs = await settle(p, f); if (lrBad(gs).length) sb.push(f); }
    const failed = b0.length > 0 || !wk.ok || sb.length > 0;
    mut8.push(failed);
    rec(`${w}x${h}/${safeB} 200% mutation`, `${name}: the list checks fail`, failed, J({ bad: b0, walk: wk.why, settle: sb }));
    await ctx.close();
  }
  mutServers.forEach(m => m.close());

  console.log(rows.join("\n"));
  if (on(5)) console.log(`MUTATION old inner portrait expectations: ${mut.n} checks; fail on this build ${mut.here}/${mut.n}; fail on v0.1.3.2 ${mut.old}/${mut.n}`);
  if (on(6)) console.log("COUNTER " + JSON.stringify(summary));
  if (on(6)) console.log("WEEKCOL " + JSON.stringify(sizes));
  if (on(7)) console.log(`MUTATION capped week list: fails ${mut7.fail}/${mut7.n}`);
  if (on(8)) console.log("PILL " + JSON.stringify(pillSum));
  if (on(8)) console.log(`MUTATION list scroll and pill: fails ${mut8.filter(Boolean).length}/${mut8.length}`);
  console.log(`${rows.length} checks, ${fails()} failed (${engine})`);
  await b.close(); OLD.close(); PREV.close(); T.close(); process.exit(fails() ? 1 : 0);
})().catch(e => { /* a crash (say this gate pointed at v0.1.3.2) still reports what ran, plus one FAIL for the crash */
  rec("crash", "the gate ran to the end", false, String(e && e.message || e).split("\n")[0]);
  console.log(rows.join("\n")); console.log(`${rows.length} checks, ${fails()} failed (crashed)`); process.exit(1); });
