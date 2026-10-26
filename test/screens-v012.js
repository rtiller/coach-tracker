/* v0.1.2 review screenshots: node test/screens-v012.js [webkit|chromium] [url]  ->  screens/v0.1.2/ + report.json
   Designer set in dark and light; retakes from the v0.1.1 list in light. Frame strips are stitched by tools/strip.py. */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.2");
const B = "b-4day-upper-lower", C = "c-5day-split-deload";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [], errs = [], strips = [];
  fs.mkdirSync(OUT, { recursive: true });
  const done = { "w5-upperA": "done", "w5-lowerA": "done", "w4-upperA": "done", "w4-lowerA": "done" };
  async function page(w, h, opts = {}) { const ctx = await L.context(b, T.engine, w, h, opts); const p = await ctx.newPage(); const W = L.watch(p); return { ctx, p, W }; }
  const tap = async (p, s) => { await p.locator(s).first().tap(); await p.waitForTimeout(200); };
  async function shot(p, W, name, meta, settle = true) { if (settle) { await L.settle(p); await p.waitForTimeout(300); } const f = path.join(OUT, name + ".png"); await p.screenshot({ path: f });
    const vp = p.viewportSize(); shots.push(Object.assign({ file: path.relative(L.ROOT, f), viewport: vp.width + "x" + vp.height, bytes: fs.statSync(f).size }, meta)); if (W.errs.length) errs.push(name + ": " + W.errs.join(" | ")); return f; }
  const tapAt = async (p, sel, fx) => { await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const bb = await p.locator(sel).boundingBox(); await p.touchscreen.tap(Math.round(bb.x + bb.width * fx), Math.round(bb.y + bb.height / 2)); };
  const code = L.code(L.norm(L.readSample(B)));

  // ---- retakes from the v0.1.1 list (light) ----
  for (const [nm, w, h] of [["slab", 390, 844], ["duo-outer", 382, 644]]) {
    const { ctx, p, W } = await page(w, h); await p.goto(T.url + "#p=" + code); await p.waitForTimeout(500); await tap(p, "#dlgThisWk");
    await shot(p, W, `prompt-${nm}-${w}x${h}`, { what: "start date prompt, new Home Screen line" }); await ctx.close();
  }
  { const { ctx, p, W } = await page(382, 644, { seed: L.seedFor(C, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await shot(p, W, "c-duo-outer-382x644", { what: "sample c at rest (leftover line with Stay and X on one row)" }); await ctx.close(); }
  { const { ctx, p, W } = await page(390, 844, { seed: L.seedFor(B, { done: { "w4-upperA": "done", "w4-lowerA": "done" } }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await shot(p, W, "leftover-slab-390x844", { what: "leftover line: text, Stay and a 44px X on one row" }); await ctx.close(); }
  { const { ctx, p, W } = await page(382, 644, { seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
    await tap(p, "#todaySkip"); await p.waitForTimeout(150); await shot(p, W, "toast-duo-outer-382x644", { what: "Undo toast after Skip, a row above the strip" }); await ctx.close(); }

  // ---- Designer set, dark then light ----
  for (const dark of [true, false]) {
    const sx = dark ? "-dark" : "-light";
    for (const [nm, w, h] of [["duo-inner-landscape", 951, 669], ["duo-inner-portrait", 669, 835]]) {
      const { ctx, p, W } = await page(w, h, { dark, seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
      await tap(p, "#todaySkip"); await p.waitForTimeout(250);
      await shot(p, W, `toast-${nm}-${w}x${h}${sx}`, { what: "Undo toast: a row directly above the strip in the left pane's group" }); await ctx.close();
    }
    for (const [nm, w, h, kb, fx] of [["duo-inner-landscape", 951, 669, 330, 0.5], ["duo-inner-portrait", 669, 835, 360, 0.8]]) {
      const { ctx, p, W } = await page(w, h, { dark, seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
      await tap(p, "#btnMore"); await tapAt(p, "#btnUpdate", fx); await p.waitForTimeout(400);
      await shot(p, W, `update-${nm}-${w}x${h}${sx}`, { what: w > 820 ? "Update plan opened from the right pane, in the right pane" : "Update plan opened from the right half of More, in the right pane" });
      await p.setViewportSize({ width: w, height: h - kb }); await p.focus("#updCode"); await p.waitForTimeout(450);
      await shot(p, W, `update-focused-${nm}-${w}x${h - kb}${sx}`, { what: `Update plan box focused, viewport reduced by ${kb}px for the keyboard` }); await ctx.close();
    }
    /* frame strip: tap, then hold every running animation at 0, 50, 100 and 200ms */
    for (const [nm, w, h] of [["duo-outer", 382, 644], ["duo-inner-portrait", 669, 835], ["duo-inner-landscape", 951, 669]]) {
      const { ctx, p, W } = await page(w, h, { dark, seed: L.seedFor(B, { done }) }); await p.goto(T.url); await p.waitForTimeout(400);
      if (w < 600) { await tap(p, "#openPlan"); await p.waitForTimeout(300); }
      await tap(p, "#btnMore"); await p.locator("#btnUpdate").scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await p.evaluate(() => { document.getElementById("btnUpdate").click(); document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); });
      const files = [];
      for (const ms of [0, 50, 100, 200]) {
        await p.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), ms);
        files.push(await shot(p, W, `frame-${nm}-${w}x${h}-${String(ms).padStart(3, "0")}ms${sx}`, { what: `Update plan opening, animation held at ${ms}ms` + (ms === 0 ? " (first frame)" : ms === 200 ? " (settled)" : "") }, false));
      }
      strips.push({ out: path.join(OUT, `frames-${nm}-${w}x${h}${sx}.png`), files });
      await ctx.close();
    }
  }
  await b.close(); T.close();
  /* repo-relative paths only: run tools/strip.py from the repo root */
  const rel = f => path.relative(L.ROOT, f);
  fs.writeFileSync(path.join(OUT, "strips.json"), JSON.stringify(strips.map(s => ({ out: rel(s.out), files: s.files.map(rel) })), null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ version: "v0.1.2-preview", engine: T.engine, url: argv[1] || "local", clock: L.NOW, scheme: "Designer set in dark and light; retakes light", shots, strips: strips.map(s => path.relative(L.ROOT, s.out)), errors: errs }, null, 2) + "\n");
  console.log(shots.length + " shots, " + errs.length + " errors"); if (errs.length) console.log(errs.join("\n"));
})().catch(e => { console.error(e); process.exit(2); });
