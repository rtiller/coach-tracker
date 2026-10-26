/* v0.1.3 Designer check: inner portrait at the real Safari visible height (835 - 50 toolbar - 34 safe = 751) with the
   34px safe inset, Undo showing, max scroll; reports toast-bottom to visible-bottom.  node test/screens-v013-safari-portrait.js [webkit|chromium] [url] */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.3");
const B = "b-4day-upper-lower";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), out = [];
  const done = { "w5-upperA": "done", "w5-lowerA": "done" };
  for (const other of [true, false]) for (const end of [true, false]) {
    const ctx = await L.context(b, T.engine, 669, 751, { dark: true, seed: L.seedFor(B, { done }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: ":root{--safe-b:34px !important}" }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await p.waitForTimeout(250);
    if (other) { await p.evaluate(() => document.querySelector('[data-strip="3"]').click()); await p.waitForTimeout(250); }
    await p.evaluate(() => { document.scrollingElement.scrollTop = 0; });
    await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(450);
    if (end) { await p.evaluate(() => { const se = document.scrollingElement, max = se.scrollHeight - innerHeight;
      se.scrollTop = Math.max(0, Math.min(max, Math.ceil(document.getElementById("navEnd").getBoundingClientRect().bottom + scrollY - innerHeight))); }); await p.waitForTimeout(300); }
    await L.settle(p);
    const m = await p.evaluate(() => { const t = document.getElementById("toast").getBoundingClientRect(); return { vh: innerHeight, toastTop: Math.round(t.top), toastBottom: Math.round(t.bottom), gap: Math.round(innerHeight - t.bottom), shown: document.getElementById("toast").classList.contains("show") }; });
    const nm = `duo-inner-portrait-${other ? "thu" : "today"}-${end ? "max" : "top"}-safari-669x751-dark.png`;
    await p.screenshot({ path: path.join(OUT, nm) });
    out.push({ file: "screens/v0.1.3/" + nm, ...m, errors: W.errs });
    await ctx.close();
  }
  await b.close(); T.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(2); });
