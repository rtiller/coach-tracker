/* v0.1.4 review screenshots: TAG=before|after node test/screens-v014.js [webkit|chromium] [url]  ->  screens/v0.1.4/<tag>-*.png
   + manifest-<tag>.json. Plan: test/fixtures/legs-priority.json, week 1 starting Mon Oct 26 2026, clock Mon 08:10.
   Sizes are the measured device sizes (CSS px plus safe areas):
     s06  678x466 home-screen app, cover landscape (Counter), safe top 16 right 79 bottom 35
     s09  669x951 home-screen app, inner portrait, safe top 82 bottom 20 (also the 10 size)
     s07  466x678 home-screen app, cover portrait, safe top 67 right 85 bottom 20
     s01  669x867 Safari tab, inner portrait (also the 02 size)
     s751 669x751 inner portrait (the spec's acceptance size)
     l951 951x669 inner landscape (two panes); c382 382x560 cover portrait (the addendum's cover size)
   Dark unless the name says light; "-200" is 200% text. Manifest paths are repo-relative. */
const L = require("./lib");
const { fs, path } = L;
const TAG = process.env.TAG || "after";
const OUT = path.join(L.ROOT, "screens", "v0.1.4");
const plan = L.norm(JSON.parse(fs.readFileSync(path.join(L.ROOT, "test", "fixtures", "legs-priority.json"), "utf8")));
const seed = { schema: 1, plan, seen: [], week: 1, startDate: "2026-10-26", done: {}, openDays: {}, lifts: [], tab: "train", progView: "body",
  body: [{ id: "b1", date: "2026-10-12", weight: "182", wu: "lb", waist: "34", lu: "in" }, { id: "b2", date: "2026-10-19", weight: "181", wu: "lb", waist: "33.8", lu: "in" }, { id: "b3", date: "2026-10-26", weight: "180.4", wu: "lb", waist: "33.6", lu: "in" }] };
const NOW = "2026-10-26T08:10:00-05:00";
const SZ = { s06: [678, 466, true, 16, 79, 35], s09: [669, 951, true, 82, 0, 20], s07: [466, 678, true, 67, 85, 20], s01: [669, 867, false, 0, 0, 0], s751: [669, 751, false, 0, 0, 0], l951: [951, 669, false, 0, 0, 0], c382: [382, 560, false, 0, 0, 0] };
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [];
  fs.mkdirSync(OUT, { recursive: true });
  async function open(sz, big, light) {
    const [w, h, app, t, r, bt] = SZ[sz];
    const ctx = await L.context(b, T.engine, w, h, { seed, dark: !light, now: NOW, standalone: app }), p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: `:root{--safe-t:${t}px !important;--safe-r:${r}px !important;--safe-b:${bt}px !important}` + (big ? "html{font-size:200%!important}" : "") });
    await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(500);
    return { ctx, p, W, w, h };
  }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(350); };
  async function shot(o, name, what) {
    const file = path.join(OUT, TAG + "-" + name + ".png"); await o.p.screenshot({ path: file });
    const info = await o.p.evaluate(() => ({ cls: document.documentElement.className, version: (document.getElementById("appVer") || {}).textContent || "",
      pill: (b => b && !b.hidden && getComputedStyle(b).visibility === "visible" ? b.getAttribute("aria-label") : null)(document.getElementById("morePill")),
      openDays: Array.from(document.querySelectorAll("#panel-train .day.open .day-toggle")).map(e => e.textContent.trim().slice(0, 12)) }));
    shots.push(Object.assign({ file: path.relative(L.ROOT, file), size: o.w + "x" + o.h, what, errors: o.W.errs.slice() }, info));
  }
  /* (a) the Week view with Mon expanded (today) and after tapping Thu */
  for (const [sz, big, light] of [["s01", 0, 0], ["s09", 0, 0], ["s751", 0, 0], ["s01", 1, 0], ["s09", 1, 0], ["s751", 1, 0], ["s07", 0, 0], ["l951", 0, 0], ["c382", 0, 0], ["c382", 1, 0], ["s01", 0, 1], ["s09", 0, 1]]) {
    const o = await open(sz, big, light), tagn = sz + (big ? "-200" : "") + (light ? "-light" : "");
    if (await o.p.locator("#openPlan").isVisible()) await tap(o.p, "#openPlan"); await tap(o.p, '#planPane [data-tab="train"]'); await o.p.waitForTimeout(300);
    await shot(o, "a-week-mon-" + tagn, "(a) Week view, Mon expanded (today)");
    await o.p.locator("#panel-train .day").nth(3).locator(".day-toggle").tap(); await o.p.waitForTimeout(600);
    await shot(o, "a-week-thu-" + tagn, "(a) Week view after tapping Thu (scrolled to Tue and Thu expanded)");
    await o.p.locator("#panel-train .day.open .day-toggle").first().tap(); await o.p.waitForTimeout(500);
    await o.p.evaluate(() => { const g = document.querySelector("#panel-train .day-grid"); if (g) g.scrollIntoView({ block: "start" }); }); await o.p.waitForTimeout(200);
    await shot(o, "a-week-collapsed-" + tagn, "(a) Week view, all days collapsed");
    await o.ctx.close();
  }
  /* (c) the Counter at the 06 size: at rest, with Undo, at the end of the list */
  for (const big of [0, 1]) {
    const o = await open("s06", big), tagn = "s06" + (big ? "-200" : "");
    await shot(o, "c-counter-rest-" + tagn, "(c) Counter at rest");
    await tap(o.p, "#today .skip-bottom"); await o.p.waitForTimeout(300);
    await shot(o, "c-counter-undo-" + tagn, "(c) Counter, Skip tapped, Undo showing");
    await o.ctx.close();
    const o2 = await open("s06", big);
    for (let i = 0; i < 8; i++) { const v = await o2.p.evaluate(() => { const b = document.getElementById("morePill"); return !!b && !b.hidden && getComputedStyle(b).visibility === "visible"; }); if (!v) break; await o2.p.locator("#morePill").tap(); await o2.p.waitForTimeout(500); }
    await o2.p.evaluate(() => { const l = document.querySelector("#today .set-rows"); if (l) l.scrollTop = l.scrollHeight; }); await o2.p.waitForTimeout(500);
    await shot(o2, "c-counter-end-" + tagn, "(c) Counter at the end of the list");
    await o2.ctx.close();
  }
  /* (d) home: inner portrait at the 09 size and 669x751, cover portrait at the 07 size (unchanged) */
  for (const [sz, big, light] of [["s09", 0, 0], ["s09", 1, 0], ["s09", 0, 1], ["s01", 0, 0], ["s01", 1, 0], ["s751", 0, 0], ["s751", 1, 0], ["s751", 0, 1], ["s07", 0, 0], ["s07", 1, 0], ["l951", 0, 0], ["c382", 0, 0], ["c382", 1, 0]]) {
    const o = await open(sz, big, light);
    await shot(o, "d-home-" + sz + (big ? "-200" : "") + (light ? "-light" : ""), /^(s07|c382)$/.test(sz) ? "cover portrait home (no Up next)" : sz === "l951" ? "inner landscape, two panes (no Up next)" : "(d) inner portrait home (v0.1.4.3: no Up next)");
    await o.ctx.close();
  }
  /* 02: Progress > Body at the Safari inner portrait size */
  for (const big of [0, 1]) {
    const o = await open("s01", big);
    await tap(o.p, "#openPlan"); await tap(o.p, '#planPane [data-tab="progress"]'); await tap(o.p, '#planPane [data-pview="body"]'); await o.p.waitForTimeout(300);
    await shot(o, "02-progress-body-s01" + (big ? "-200" : ""), "02 Progress > Body"); await o.ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "manifest-" + TAG + ".json"), JSON.stringify({ engine: T.engine, tag: TAG, shots }, null, 1) + "\n");
  console.log(TAG, shots.length, "shots;", shots.filter(s => s.errors.length).length, "with errors");
  await b.close(); T.close();
})().catch(e => { console.error(e); process.exit(1); });
