/* Screenshots for review: node test/screens.js [webkit|chromium] [url]  ->  screens/v0.1.0/ */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.0");
const SIZES = { "duo-outer": [382, 644], "duo-inner-landscape": [951, 669], "slab": [390, 844] };
const PICK = ["a-3day-beginner-full-body", "b-4day-upper-lower", "c-5day-split-deload"];
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [], errs = [];
  fs.mkdirSync(OUT, { recursive: true });
  const seedDone = { "w5-upperA": "done", "w5-lowerA": "done", "w5-upperB": "skip", "w4-upperA": "done", "w4-lowerA": "done" };
  async function page(w, h, dark, opts = {}) {
    const ctx = await L.context(b, T.engine, w, h, Object.assign({ dark }, opts)); const p = await ctx.newPage(); const W = L.watch(p);
    return { ctx, p, W };
  }
  const tap = (p, s) => p.locator(s).first().tap();
  async function openMore(p) { if (!(await p.locator("#btnMore").isVisible())) { await tap(p, "#openPlan"); await p.waitForTimeout(320); } await tap(p, "#btnMore"); await p.waitForTimeout(150); }
  async function shot(p, W, name, meta) { await L.settle(p); await p.waitForTimeout(260); const f = path.join(OUT, name + ".png"); await p.screenshot({ path: f });
    shots.push(Object.assign({ file: path.relative(L.ROOT, f), bytes: fs.statSync(f).size }, meta)); if (W.errs.length) errs.push(name + ": " + W.errs.join(" | ")); }
  for (const dark of [false, true]) {
    const mode = dark ? "dark" : "light";
    for (const s of PICK) for (const [sz, [w, h]] of Object.entries(SIZES)) {
      const { ctx, p, W } = await page(w, h, dark, { seed: L.seedFor(s, { done: s.startsWith("b") ? seedDone : {} }) });
      await p.goto(T.url); await p.waitForTimeout(400);
      await shot(p, W, `${s.slice(0, 1)}-${sz}-${w}x${h}-${mode}`, { kind: "sample", sample: s, size: `${w}x${h}`, mode }); await ctx.close();
    }
    for (const [sz, [w, h]] of [["slab", SIZES.slab], ["duo-inner-landscape", SIZES["duo-inner-landscape"]]]) {
      const tag = `${sz}-${w}x${h}-${mode}`;
      { const { ctx, p, W } = await page(w, h, dark); await p.goto(T.url); await p.waitForTimeout(400);
        await shot(p, W, `empty-${tag}`, { kind: "empty state", size: `${w}x${h}`, mode }); await ctx.close(); }
      { const bad = L.readSample("b-4day-upper-lower"); bad.blocks["1"].upperA[1].tags = ["forearm"];
        const { ctx, p, W } = await page(w, h, dark, { seed: L.seedFor("b-4day-upper-lower") });
        await p.goto(T.url + "#p=" + L.code(bad)); await p.waitForTimeout(500);
        await shot(p, W, `error-bad-link-${tag}`, { kind: "error (bad link, nothing changed)", size: `${w}x${h}`, mode }); await ctx.close(); }
      { const { ctx, p, W } = await page(w, h, dark, { seed: L.seedFor("b-4day-upper-lower", { done: seedDone }) });
        await p.goto(T.url); await p.waitForTimeout(400); await openMore(p); await tap(p, "#btnUpdate"); await p.waitForTimeout(200);
        await p.fill("#updCode", L.code(L.norm(L.readSample("c-5day-split-deload"))).slice(0, 60) + "...");
        await shot(p, W, `update-plan-${tag}`, { kind: "Update plan", size: `${w}x${h}`, mode }); await ctx.close(); }
      { const { ctx, p, W } = await page(w, h, dark, { seed: L.seedFor("b-4day-upper-lower", { done: seedDone }) });
        await p.goto(T.url); await p.waitForTimeout(400); await openMore(p);
        const [dl] = await Promise.all([p.waitForEvent("download"), tap(p, "#btnExport")]); const f = path.join(require("os").tmpdir(), dl.suggestedFilename()); await dl.saveAs(f);
        await p.waitForFunction(() => !document.getElementById("toast").classList.contains("show"), null, { timeout: 12000 }).catch(() => {}); /* let the export toast pass */
        if (!(await p.locator("#btnImport").isVisible())) await openMore(p);
        const [fc] = await Promise.all([p.waitForEvent("filechooser"), tap(p, "#btnImport")]); await fc.setFiles(f);
        await p.waitForSelector('#dlg[data-kind="import"]:not([hidden])');
        await shot(p, W, `import-confirm-${tag}`, { kind: "Import confirm", size: `${w}x${h}`, mode }); await ctx.close(); }
    }
  }
  const rep = { version: "v0.1.0-preview", engine: T.engine, url: argv[1] || "local build", clock: L.NOW, startDate: "2026-09-21 (week 5, Friday)", deviceScaleFactor: 2,
    indexBytes: fs.statSync(path.join(L.ROOT, "index.html")).size, count: shots.length, errors: errs, shots };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(rep, null, 2) + "\n");
  console.log(`screens ${shots.length} written to screens/v0.1.0, errors ${errs.length}`); errs.forEach(e => console.log("  " + e));
  await b.close(); T.close();
})().catch(e => { console.error(e); process.exit(1); });
