/* v0.1.3 review screenshots: node test/screens-v013.js [webkit|chromium] [url]  ->  screens/v0.1.3/ + report.json
   The Undo toast showing. Dark: cover 382, inner portrait 669 and inner landscape 951, today and another day (Thursday),
   at scroll top and at max scroll, plus the cover at 200% text. Light: one set of three. Manifest paths are repo-relative. */
const L = require("./lib");
const { fs, path } = L;
const OUT = path.join(L.ROOT, "screens", "v0.1.3");
const B = "b-4day-upper-lower";
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), b = await L.launch(T.engine), shots = [], errs = [];
  fs.mkdirSync(OUT, { recursive: true });
  const rel = f => path.relative(L.ROOT, f);
  const done = { "w5-upperA": "done", "w5-lowerA": "done" };
  /* the end of the today column: the pane's end at 820 and up, the page's end on phones, the left column's end on inner portrait */
  const toEnd = p => p.evaluate(() => {
    if (innerWidth >= 820) { const sc = document.getElementById("paneToday"); sc.scrollTop = sc.scrollHeight; return; }
    const se = document.scrollingElement, max = se.scrollHeight - innerHeight;
    if (innerWidth < 600) { se.scrollTop = max; return; }
    se.scrollTop = Math.max(0, Math.min(max, Math.ceil(document.getElementById("navEnd").getBoundingClientRect().bottom + scrollY - innerHeight)));
  });
  /* [name, w, h, another day, at max scroll, 200% text, what] */
  const where = { 382: "cover screen", 669: "inner portrait", 951: "inner landscape" };
  const DARK = [], LIGHT = [];
  for (const [w, h] of [[382, 644], [669, 835], [951, 669]]) for (const other of [false, true]) for (const end of [false, true])
    DARK.push([`${w < 600 ? "cover" : w < 820 ? "duo-inner-portrait" : "duo-inner-landscape"}-${other ? "thu" : "today"}-${end ? "max" : "top"}`, w, h, other, end, false,
      `${where[w]}, ${other ? "Thursday shown (another day)" : "today"}, ${end ? "at max scroll" : "at scroll top"}, Undo showing`]);
  DARK.push(["cover-200text-thu-top", 382, 644, true, false, true, "cover screen at 200% text, Thursday shown, scroll top, Undo showing"]);
  DARK.push(["cover-200text-thu-max", 382, 644, true, true, true, "cover screen at 200% text, Thursday shown, max scroll, Undo showing"]);
  LIGHT.push(["cover-today-top", 382, 644, false, false, false, "cover screen, today, scroll top, Undo showing"]);
  LIGHT.push(["duo-inner-portrait-today-max", 669, 835, false, true, false, "inner portrait, today, max scroll, Undo showing"]);
  LIGHT.push(["duo-inner-landscape-thu-max", 951, 669, true, true, false, "inner landscape, Thursday shown, max scroll, Undo showing"]);
  for (const dark of [true, false]) for (const [nm, w, h, other, end, big, what] of (dark ? DARK : LIGHT)) {
    const ctx = await L.context(b, T.engine, w, h, { dark, seed: L.seedFor(B, { done }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(400);
    if (big) { await p.addStyleTag({ content: "html{font-size:200%!important}" }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await p.waitForTimeout(300); }
    if (other) { await p.evaluate(() => document.querySelector('[data-strip="3"]').click()); await p.waitForTimeout(250); }
    await p.evaluate(() => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = 0; });
    await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(450);
    if (end) { await toEnd(p); await p.waitForTimeout(300); }
    await L.settle(p);
    const f = path.join(OUT, `${nm}-${w}x${h}-${dark ? "dark" : "light"}.png`); await p.screenshot({ path: f });
    shots.push({ file: rel(f), viewport: w + "x" + h, scheme: dark ? "dark" : "light", what, bytes: fs.statSync(f).size });
    if (W.errs.length) errs.push(nm + ": " + W.errs.join(" | "));
    await ctx.close();
  }
  await b.close(); T.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ version: "v0.1.3-preview", engine: T.engine, url: argv[1] || "local", clock: L.NOW, scheme: "dark and light, the Undo toast showing", shots, errors: errs }, null, 2) + "\n");
  console.log(shots.length + " shots, " + errs.length + " errors"); if (errs.length) console.log(errs.join("\n"));
})().catch(e => { console.error(e); process.exit(2); });
