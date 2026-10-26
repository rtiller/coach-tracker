/* v0.1.3.3 review screenshots: node test/screens-v0133.js [webkit|chromium] [url]  ->  screens/v0.1.3.3/ + report.json
   Dark. Counter (the cover screen in landscape) at its Safari visible size 678x396 with the 21px safe area: the plan's
   longest day, its shortest training day, the longest day at 200% text, and today with Undo showing. Inner portrait
   669x751: today, the Week and progress page (Progress, two-column cards), Update plan open from More. Cover portrait
   382x560: today and a selected day. Inner landscape 951x585: today and Update plan open. Sample: b-4day-upper-lower,
   clock Fri Oct 23 2026 (week 5). Counter at 644x382 (the phone's measured landscape size): longest, shortest, 200% text,
   each landscape rotation with a 47px side inset, and Fri Lower B picked (after; the before shot is the earlier build).
   v0.1.3.4: at 200% text (644x382 and 678x396) the longest day (by exercise-list height at 200%) at rest with the
   'N more' pill, after one tap on the pill, after tapping to the last exercise, and skipped with Undo showing.
   Manifest paths are repo-relative. */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.3.3");
const B = "b-4day-upper-lower";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [];
  fs.mkdirSync(OUT, { recursive: true });
  const seed = L.seedFor(B, { done: { "w5-upperA": "done" }, body: [{ id: "b1", date: "2026-10-20", weight: "180", wu: "lb" }, { id: "b2", date: "2026-10-13", weight: "181", wu: "lb" }],
    lifts: [{ id: "x1", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-12" }, { id: "x2", liftId: "squat", lift: "Squat", weight: "225", wu: "lb", reps: "5", date: "2026-10-13" }] });
  async function open(w, h, safeB, big, more = {}) {
    const ctx = await L.context(b, T.engine, w, h, Object.assign({ seed, dark: true }, more.now ? { now: more.now } : {})), p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: `:root{--safe-b:${safeB}px !important;--safe-l:${more.l || 0}px !important;--safe-r:${more.r || 0}px !important}` + (big ? "html{font-size:200%!important}" : "") }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(450);
    return { ctx, p, W };
  }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(250); };
  const pick = async (p, i) => { await p.evaluate(i => document.querySelector(`#weekStrip [data-strip="${i}"]`).scrollIntoView({ block: "nearest" }), i); await p.locator(`#weekStrip [data-strip="${i}"]`).tap(); await p.waitForTimeout(200); };
  async function shot(p, W, name, what, w, h) {
    const file = path.join(OUT, name + ".png"); await p.screenshot({ path: file });
    const info = await p.evaluate(() => ({ counter: document.documentElement.classList.contains("counter"), cs: getComputedStyle(document.documentElement).getPropertyValue("--cs").trim() || null,
      day: ((document.querySelector("#today .today-hero h2") || {}).textContent || "").trim(), version: (document.getElementById("appVer") || {}).textContent || "",
      pill: (b => b && !b.hidden && getComputedStyle(b).visibility === "visible" ? b.getAttribute("aria-label") : null)(document.getElementById("morePill")), listScrollTop: (l => l ? l.scrollTop : null)(document.querySelector("#today .set-rows")) }));
    shots.push(Object.assign({ file: path.relative(L.ROOT, file), size: `${w}x${h}`, what, errors: W.errs.slice() }, info));
  }
  /* the longest and shortest training days, measured at the one scale */
  const heights = p => p.evaluate(async () => { const out = []; for (const btn of document.querySelectorAll("#weekStrip [data-strip]")) { btn.click(); await new Promise(r => requestAnimationFrame(r)); const c = document.getElementById("today"); if (document.querySelector("#today .set-row")) out.push([+btn.dataset.strip, Array.from(c.children).reduce((s, e) => s + e.getBoundingClientRect().height, 0)]); } return out; });
  /* v0.1.3.4: the longest day at 200% text is the one with the tallest exercise list; shot at rest, then after one pill tap */
  const longest200 = p => p.evaluate(async () => { let best = null; for (const btn of document.querySelectorAll("#weekStrip [data-strip]")) { btn.click(); await new Promise(r => requestAnimationFrame(r)); const l = document.querySelector("#today .set-rows"); if (l && (!best || l.scrollHeight > best[1])) best = [+btn.dataset.strip, l.scrollHeight]; } return best[0]; });
  for (const [w, h] of [[644, 382], [678, 396]]) {
    const o = await open(w, h, 21, true); const d = await longest200(o.p); await pick(o.p, d);
    await shot(o.p, o.W, `counter-${w}x${h}-200text-longest-pill`, `Counter at ${w}x${h}, 200% text: the longest day at rest; the exercise list scrolls inside the card (snapping to whole lines) and the 'N more' pill has its own strip under it`, w, h);
    await o.p.locator("#morePill").tap(); await o.p.waitForTimeout(300);
    await shot(o.p, o.W, `counter-${w}x${h}-200text-longest-pill-tapped`, `Counter at ${w}x${h}, 200% text: the same day after one tap on the pill; the next exercise's top at the list's top, the header and Skip / Done unchanged`, w, h);
    for (let k = 0; k < 20 && await o.p.evaluate(() => getComputedStyle(document.getElementById("morePill")).visibility === "visible" && !document.getElementById("morePill").hidden); k++) { await o.p.locator("#morePill").tap(); await o.p.waitForTimeout(300); }
    await shot(o.p, o.W, `counter-${w}x${h}-200text-longest-pill-last`, `Counter at ${w}x${h}, 200% text: the same day after tapping to the last exercise; its top at the list's top, the pill hidden (its strip stays, so nothing moves)`, w, h);
    await o.p.evaluate(() => { document.querySelector("#today .set-rows").scrollTop = 0; }); await o.p.waitForTimeout(300);
    await o.p.locator("#today [data-skip]:visible").first().tap(); await o.p.waitForTimeout(400);
    await shot(o.p, o.W, `counter-${w}x${h}-200text-longest-pill-undo`, `Counter at ${w}x${h}, 200% text: the same day skipped, Undo in its reserved slot; the list, pill strip and buttons did not move`, w, h); await o.ctx.close(); }
  { const { ctx, p, W } = await open(678, 396, 21, false); const hs = await heights(p); hs.sort((a, c) => c[1] - a[1]);
    await pick(p, hs[0][0]); await shot(p, W, "counter-678x396-longest-day", "Counter, Safari visible size: the plan's longest day (one scale for all days)", 678, 396);
    await pick(p, hs[hs.length - 1][0]); await shot(p, W, "counter-678x396-shortest-day", "Counter: the plan's shortest training day, same scale", 678, 396);
    await p.reload(); await p.waitForTimeout(400); await p.addStyleTag({ content: ":root{--safe-b:21px !important}" }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(400);
    await p.locator("#today [data-skip]:visible").first().tap(); await p.waitForTimeout(400);
    await shot(p, W, "counter-678x396-today-undo", "Counter: today skipped, Undo in its slot under the card (left column)", 678, 396); await ctx.close();
    const o = await open(678, 396, 21, true); await pick(o.p, hs[0][0]); await shot(o.p, o.W, "counter-678x396-longest-day-200text", "Counter at 200% text: the longest day; the exercise list scrolls inside the card, with the N more pill", 678, 396); await o.ctx.close(); }
  /* 644x382: the cover screen in landscape as measured on the phone. Fri (Lower B) picked with Wednesday as today */
  { const wed = { now: "2026-10-21T12:00:00-05:00" };
    let o = await open(644, 382, 21, false); const hs = await heights(o.p); hs.sort((a, c) => c[1] - a[1]);
    await pick(o.p, hs[0][0]); await shot(o.p, o.W, "counter-644x382-longest-day", "Counter at 644x382 (21px bottom inset): the plan's longest day; seven week rows fill the right column", 644, 382);
    await pick(o.p, hs[hs.length - 1][0]); await shot(o.p, o.W, "counter-644x382-shortest-day", "Counter at 644x382: the plan's shortest training day", 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, true); await pick(o.p, hs[0][0]); await shot(o.p, o.W, "counter-644x382-longest-day-200text", "Counter at 644x382, 200% text: week names end in an ellipsis on one line; the exercise list scrolls inside the card, with the N more pill", 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, false, { l: 47 }); await shot(o.p, o.W, "counter-644x382-landscape-left-insets", "Counter at 644x382, cut-out on the left (47px left inset, 21px bottom): nothing inside the insets", 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, false, { r: 47 }); await shot(o.p, o.W, "counter-644x382-landscape-right-insets", "Counter at 644x382, cut-out on the right (47px right inset, 21px bottom): nothing inside the insets", 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, false, wed); await pick(o.p, 4); await shot(o.p, o.W, "counter-644x382-fri-after", "After: Fri Lower B picked at 644x382 (21px bottom): seven equal rows to the column bottom, SUN visible, one-line kicker", 644, 382); await o.ctx.close(); }
  { const { ctx, p, W } = await open(669, 751, 34, false);
    await shot(p, W, "inner-portrait-669x751-today", "Inner portrait (cover pattern): today, strip, Back to today / Week and progress row, Undo slot", 669, 751);
    await tap(p, "#openPlan"); await p.waitForTimeout(300); await tap(p, '#planPane [data-tab="progress"]'); await tap(p, '#planPane [data-pview="lifts"]');
    await shot(p, W, "inner-portrait-669x751-week-and-progress", "Inner portrait: the Week and progress page, full width, Lifts cards in two columns", 669, 751);
    await tap(p, '#planPane [data-tab="train"]'); await tap(p, "#btnMore"); await tap(p, "#btnUpdate"); await p.waitForTimeout(300);
    await shot(p, W, "inner-portrait-669x751-update-plan", "Inner portrait: Update plan open from More, attached to its button", 669, 751); await ctx.close(); }
  { const { ctx, p, W } = await open(382, 560, 34, false);
    await shot(p, W, "cover-382x560-today", "Cover portrait, Safari visible height: today", 382, 560);
    await pick(p, 3); await shot(p, W, "cover-382x560-selected-day", "Cover portrait: Thu picked", 382, 560); await ctx.close(); }
  { const { ctx, p, W } = await open(951, 585, 34, false);
    await shot(p, W, "inner-landscape-951x585-today", "Inner landscape (two panes, unchanged): today", 951, 585);
    await tap(p, "#btnMore"); await tap(p, "#btnUpdate"); await p.waitForTimeout(300);
    await shot(p, W, "inner-landscape-951x585-update-plan", "Inner landscape: Update plan open (per-pane rule, unchanged)", 951, 585); await ctx.close(); }
  /* device review round (folding phone): opened folded, then unfolded, with the browser still reporting the cover's
     screen size; the Counter in both landscape rotations (today, longest, shortest); a small iPhone in landscape */
  async function unfold(w, h, name, what, aboutToo) {
    const ctx = await L.context(b, T.engine, 382, 678, { seed, dark: true, screen: { width: 382, height: 678 } }), p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400); await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(900);
    await shot(p, W, name, what, w, h);
    if (aboutToo) { if (!(await p.locator("#btnMore").first().isVisible())) { await tap(p, "#openPlan"); await p.waitForTimeout(300); } await tap(p, "#btnMore"); await tap(p, "#btnAbout"); await p.waitForTimeout(300);
      await shot(p, W, name + "-about", what + "; About shows the window, the reported screen and the layout", w, h); }
    await ctx.close();
  }
  await unfold(951, 585, "unfold-inner-landscape-951x585", "Opened folded (382x678), then unfolded to 951x585 with the cover's screen size still reported: two panes", true);
  await unfold(669, 751, "unfold-inner-portrait-669x751", "Opened folded (382x678), then unfolded to 669x751 with the cover's screen size still reported: inner portrait", false);
  for (const [side, ins] of [["left", { l: 47 }], ["right", { r: 47 }]]) {
    let o = await open(644, 382, 21, false, ins); const hs2 = await heights(o.p); hs2.sort((a, c) => c[1] - a[1]); await o.ctx.close();
    o = await open(644, 382, 21, false, ins); await shot(o.p, o.W, `counter-644x382-${side}-today`, `Counter 644x382, cut-out on the ${side}: today selected (Back to today's space kept, hidden)`, 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, false, ins); await pick(o.p, hs2[0][0]); await shot(o.p, o.W, `counter-644x382-${side}-longest-picked`, `Counter 644x382, cut-out on the ${side}: the longest day picked (Back to today in the week header)`, 644, 382); await o.ctx.close();
    o = await open(644, 382, 21, false, ins); await pick(o.p, hs2[hs2.length - 1][0]); await shot(o.p, o.W, `counter-644x382-${side}-shortest-picked`, `Counter 644x382, cut-out on the ${side}: the shortest training day picked`, 644, 382); await o.ctx.close();
  }
  { let o = await open(667, 375, 0, false); await shot(o.p, o.W, "counter-667x375-se-today", "iPhone SE landscape 667x375: the Counter, today", 667, 375); await o.ctx.close();
    o = await open(667, 375, 0, false); await pick(o.p, 0); await shot(o.p, o.W, "counter-667x375-se-mon-picked", "iPhone SE landscape 667x375: Mon picked", 667, 375); await o.ctx.close(); }
  /* iPhone Pro Max sideways (16 Pro Max 956x440, 15/14 Pro Max 932x430): Dynamic Island side 62, home indicator 21 */
  for (const [w, h] of [[956, 440], [932, 430]]) { const ins = { l: 62, r: 0 };
    let o = await open(w, h, 21, false, ins); await shot(o.p, o.W, `counter-${w}x${h}-promax-today`, `iPhone Pro Max landscape ${w}x${h}: the Counter, today`, w, h); await o.ctx.close();
    o = await open(w, h, 21, false, ins); await pick(o.p, 0); await shot(o.p, o.W, `counter-${w}x${h}-promax-mon-picked`, `iPhone Pro Max landscape ${w}x${h}: Mon picked`, w, h); await o.ctx.close(); }
  /* About and your data, opened from More (More sits in the Week and progress page in the cover pattern) */
  async function about(w, h, safeB, big, name, what) {
    const { ctx, p, W } = await open(w, h, safeB, big);
    if (!(await p.locator("#btnMore").first().isVisible())) { await tap(p, "#openPlan"); await p.waitForTimeout(300); }
    await tap(p, "#btnMore"); await tap(p, "#btnAbout"); await p.waitForTimeout(300);
    await shot(p, W, name, what, w, h); await ctx.close();
  }
  await about(669, 751, 34, false, "about-669x751", "About and your data, inner portrait");
  await about(382, 560, 34, false, "about-382x560", "About and your data, cover portrait");
  await about(678, 396, 21, false, "about-counter-678x396", "About and your data in the Counter (a normal scrolling page)");
  await about(382, 560, 34, true, "about-382x560-200text", "About and your data, cover portrait at 200% text");
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ engine: T.engine, shots }, null, 2) + "\n");
  console.log(shots.map(s => `${s.file} ${s.counter ? "counter cs " + s.cs : ""} ${s.day} ${s.errors.length ? "ERR " + s.errors.join("|") : ""}`).join("\n"));
  await b.close(); T.close();
})().catch(e => { console.error(e); process.exit(1); });
