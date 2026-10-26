/* v0.1.1 review screenshots, light: node test/screens-v011.js [webkit|chromium] [url]  ->  screens/v0.1.1/ + report.json */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.1");
const B = "b-4day-upper-lower", C = "c-5day-split-deload";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [], errs = [];
  fs.mkdirSync(OUT, { recursive: true });
  const done = { "w5-upperA": "done", "w5-lowerA": "done", "w4-upperA": "done", "w4-lowerA": "done" };
  async function page(w, h, opts = {}) { const ctx = await L.context(b, T.engine, w, h, opts); const p = await ctx.newPage(); const W = L.watch(p); return { ctx, p, W }; }
  const tap = async (p, s) => { await p.locator(s).first().tap(); await p.waitForTimeout(200); };
  async function shot(p, W, name, meta) { await L.settle(p); await p.waitForTimeout(300); const f = path.join(OUT, name + ".png"); await p.screenshot({ path: f });
    const vp = p.viewportSize(); shots.push(Object.assign({ file: path.relative(L.ROOT, f), viewport: vp.width + "x" + vp.height, bytes: fs.statSync(f).size }, meta)); if (W.errs.length) errs.push(name + ": " + W.errs.join(" | ")); }
  const code = L.code(L.norm(L.readSample(B)));
  for (const [nm, w, h] of [["slab", 390, 844], ["duo-outer", 382, 644]]) {
    const { ctx, p, W } = await page(w, h); await p.goto(T.url + "#p=" + code); await p.waitForTimeout(500); await tap(p, "#dlgThisWk");
    await shot(p, W, `prompt-${nm}-${w}x${h}`, { what: "start date prompt, This week selected" }); await ctx.close();
  }
  { const { ctx, p, W } = await page(390, 844); await p.goto(T.url + "#p=not-a-plan"); await p.waitForTimeout(500);
    await shot(p, W, "error-slab-390x844-collapsed", { what: "bad link error, details closed" });
    await tap(p, "#dlg summary"); await shot(p, W, "error-slab-390x844-expanded", { what: "bad link error, details open" }); await ctx.close(); }
  { const { ctx, p, W } = await page(382, 644, { seed: L.seedFor(C, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await shot(p, W, "c-duo-outer-382x644", { what: "sample c at rest, pinned group with fade" }); await ctx.close(); }
  for (const [nm, w, h] of [["slab", 390, 844], ["duo-inner-landscape", 951, 669]]) {
    const { ctx, p, W } = await page(w, h, { seed: L.seedFor(B, { done: { "w4-upperA": "done", "w4-lowerA": "done" } }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await shot(p, W, `leftover-${nm}-${w}x${h}`, { what: "week 5 with 2 sessions left in week 4" }); await ctx.close();
  }
  { const { ctx, p, W } = await page(382, 644, { seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await tap(p, "#todaySkip"); await p.waitForTimeout(150); await shot(p, W, "toast-duo-outer-382x644", { what: "Undo toast after Skip, a row above the strip" }); await ctx.close(); }
  for (const dark of [false, true]) {
    const { ctx, p, W } = await page(382, 644, { dark, seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await tap(p, "#openPlan"); await p.waitForTimeout(400);
    await shot(p, W, "week-progress-duo-outer-382x644" + (dark ? "-dark" : ""), { what: "Week and progress, full-screen page" + (dark ? " (dark check)" : "") }); await ctx.close();
  }
  { const { ctx, p, W } = await page(390, 844, { seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await tap(p, "#openPlan"); await p.waitForTimeout(400); await shot(p, W, "week-progress-slab-390x844", { what: "Week and progress, rounded sheet edge to edge, no border" }); await ctx.close(); }
  for (const [nm, w, h, kb] of [["duo-inner-portrait", 669, 835, 360], ["duo-inner-landscape", 951, 669, 330]]) {
    const { ctx, p, W } = await page(w, h, { seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await tap(p, "#btnMore"); await tap(p, "#btnUpdate");
    await shot(p, W, `update-${nm}-${w}x${h}`, { what: "Update plan opened, Paste code first" });
    await p.setViewportSize({ width: w, height: h - kb }); await p.focus("#updCode"); await p.waitForTimeout(450);
    await shot(p, W, `update-focused-${nm}-${w}x${h - kb}`, { what: `Update plan box focused, viewport reduced by ${kb}px for the keyboard` }); await ctx.close();
  }
  await b.close(); T.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ version: "v0.1.1-preview", engine: T.engine, url: argv[1] || "local", clock: L.NOW, scheme: "light (one dark check)", shots, errors: errs }, null, 2) + "\n");
  console.log(shots.length + " shots, " + errs.length + " errors"); if (errs.length) console.log(errs.join("\n"));
})().catch(e => { console.error(e); process.exit(2); });
