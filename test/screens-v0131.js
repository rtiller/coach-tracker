/* v0.1.3.1 review screenshots: node test/screens-v0131.js [webkit|chromium] [url]  ->  screens/v0.1.3.1/ + report.json
   Dark, the Undo toast showing in its own slot, today and Thursday, at scroll top and at max scroll: the cover 382x644
   and its Safari visible height 382x560 (34px safe inset), inner portrait 669x751 and inner landscape 951x585 (Safari
   heights, 34px safe inset), plus the cover at 200% text. A before/after pair at 382x560 shows the row without and with
   the toast. Each shot reports the toast's bottom-to-visible-bottom gap. Manifest paths are repo-relative. */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.3.1");
const B = "b-4day-upper-lower";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [], errs = [];
  fs.mkdirSync(OUT, { recursive: true });
  const rel = f => path.relative(L.ROOT, f);
  const done = { "w5-upperA": "done", "w5-lowerA": "done" };
  const toEnd = p => p.evaluate(() => {
    if (innerWidth >= 820) { const sc = document.getElementById("paneToday"); sc.scrollTop = sc.scrollHeight; return; }
    const se = document.scrollingElement, max = se.scrollHeight - innerHeight;
    if (innerWidth < 600) { se.scrollTop = max; return; }
    se.scrollTop = Math.max(0, Math.min(max, Math.ceil(document.getElementById("navEnd").getBoundingClientRect().bottom + scrollY - innerHeight)));
  });
  const measure = p => p.evaluate(() => {
    const box = id => { const n = document.getElementById(id); if (!n || !n.getClientRects().length || getComputedStyle(n).visibility === "hidden") return null; const r = n.getBoundingClientRect(); return r.height ? [Math.round(r.top), Math.round(r.bottom)] : null; };
    const t = document.getElementById("toast"), shown = t.classList.contains("show") && getComputedStyle(t).visibility !== "hidden";
    const tr = t.getBoundingClientRect(), hit = id => { const n = document.getElementById(id); if (!n || !shown) return false; const r = n.getBoundingClientRect(); return r.height > 0 && Math.min(r.bottom, tr.bottom) - Math.max(r.top, tr.top) > 1 && Math.min(r.right, tr.right) - Math.max(r.left, tr.left) > 1; };
    return { vh: innerHeight, shown, toast: shown ? [Math.round(tr.top), Math.round(tr.bottom)] : null, gap: shown ? Math.round(innerHeight - tr.bottom) : null,
      strip: box("weekStrip"), row: box("navRow"), done: box("todayDone"), overlaps: ["weekStrip", "navRow", "todayDone", "today"].filter(hit) };
  });
  /* [name, w, h, safe, another day, at max scroll, 200% text, with toast, what] */
  const where = { "382x644": "cover screen", "382x560": "cover screen at the Safari visible height", "669x751": "inner portrait at the Safari visible height", "951x585": "inner landscape at the Safari visible height" };
  const L0 = [];
  for (const [w, h, safe] of [[382, 644, 0], [382, 560, 34], [669, 751, 34], [951, 585, 34]]) for (const other of [false, true]) for (const end of [false, true])
    L0.push([`${w < 600 ? "cover" : w < 820 ? "duo-inner-portrait" : "duo-inner-landscape"}${safe ? "-safari" : ""}-${other ? "thu" : "today"}-${end ? "max" : "top"}`, w, h, safe, other, end, false, true,
      `${where[w + "x" + h]}, ${other ? "Thursday shown (another day)" : "today"}, ${end ? "at max scroll" : "at scroll top"}, Undo showing`]);
  for (const other of [false, true]) for (const end of [false, true])
    L0.push([`cover-200text-${other ? "thu" : "today"}-${end ? "max" : "top"}`, 382, 644, 0, other, end, true, true, `cover screen at 200% text, ${other ? "Thursday shown" : "today"}, ${end ? "max scroll" : "scroll top"}, Undo showing`]);
  L0.push(["pair-cover-safari-today-top-1-without-toast", 382, 560, 34, false, false, false, false, "before/after pair, before: cover at the Safari visible height, today, scroll top, no toast"]);
  L0.push(["pair-cover-safari-today-top-2-with-toast", 382, 560, 34, false, false, false, true, "before/after pair, after: the same page with the Undo toast in its slot below the row"]);
  for (const [nm, w, h, safe, other, end, big, toast, what] of L0) {
    const ctx = await L.context(b, T.engine, w, h, { dark: true, seed: L.seedFor(B, { done }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400);
    if (safe) { await p.addStyleTag({ content: `:root{--safe-b:${safe}px !important}` }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await p.waitForTimeout(250); }
    if (big) { await p.addStyleTag({ content: "html{font-size:200%!important}" }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await p.waitForTimeout(300); }
    if (other) { await p.evaluate(() => document.querySelector('[data-strip="3"]').click()); await p.waitForTimeout(250); }
    await p.evaluate(() => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = 0; });
    if (toast) { await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(450); }
    else { /* the same card as the "with" shot: skipped, then the toast dismissed with the X */
      await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById("toastClose").click()); await p.waitForTimeout(350); }
    if (end) { await toEnd(p); await p.waitForTimeout(300); }
    await L.settle(p);
    const m = await measure(p);
    const f = path.join(OUT, `${nm}-${w}x${h}-dark.png`); await p.screenshot({ path: f });
    shots.push({ file: rel(f), viewport: w + "x" + h, safeB: safe, what, ...m, bytes: fs.statSync(f).size });
    if (W.errs.length) errs.push(nm + ": " + W.errs.join(" | "));
    await ctx.close();
  }
  await b.close(); T.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ version: "v0.1.3.1-preview", engine: T.engine, url: argv[1] || "local", clock: L.NOW, scheme: "dark, the Undo toast in its own slot", shots, errors: errs }, null, 2) + "\n");
  shots.forEach(s => console.log(s.file, "gap", s.gap, "toast", JSON.stringify(s.toast), "row", JSON.stringify(s.row), "strip", JSON.stringify(s.strip), "overlaps", JSON.stringify(s.overlaps)));
  console.log(shots.length + " shots, " + errs.length + " errors"); if (errs.length) console.log(errs.join("\n"));
})().catch(e => { console.error(e); process.exit(2); });
