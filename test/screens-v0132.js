/* v0.1.3.2 review screenshots: node test/screens-v0132.js [webkit|chromium] [url]  ->  screens/v0.1.3.2/ + report.json
   The phone re-test of v0.1.3.1: a picked day (Fri, Lower B, four exercises; the clock is a Saturday so Fri is not
   today) at the cover's Safari visible height 382x560 (34px safe inset), dark. A before/after pair: before is the
   v0.1.3.1 build (git show 4034d2d:index.html, served here), after is this build (or [url]). After shots also at inner
   portrait 669x751 and inner landscape 951x585 (Safari heights, 34px inset), the cover at 200% text (at rest and at the
   end), and the cover with Undo showing in its slot at the end. Each shot reports the rows, Mark day done, the strip,
   the row and the slot. Manifest paths are repo-relative. */
const L = require("./lib");
const { fs, path } = L;
const http = require("http"), { execSync } = require("child_process");
const OUT = path.join(L.ROOT, "screens", "v0.1.3.2");
const B = "b-4day-upper-lower", SAT = "2026-10-24T12:00:00-05:00", FRI = 4;
function serveOld() {
  const html = execSync("git show 4034d2d:index.html", { cwd: L.ROOT });
  const srv = http.createServer((req, res) => { const u = req.url.split("?")[0];
    if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}
(async () => {
  const argv = process.argv.slice(2); if (!argv[0]) argv[0] = "webkit";
  const T = await L.target(argv), OLD = await serveOld(), b = await L.launch(T.engine), shots = [], errs = [];
  fs.mkdirSync(OUT, { recursive: true });
  const rel = f => path.relative(L.ROOT, f);
  const done = { "w5-upperA": "done", "w5-lowerA": "done" };
  const measure = p => p.evaluate(() => {
    const box = n => { if (!n || !n.getClientRects().length || getComputedStyle(n).visibility === "hidden") return null; const r = n.getBoundingClientRect(); return r.height ? [Math.round(r.top), Math.round(r.bottom)] : null; };
    const id = x => box(document.getElementById(x));
    return { vh: innerHeight, rows: [...document.querySelectorAll("#today .set-row")].map(box), done: id("todayDone"), strip: id("weekStrip"), row: id("navRow"), slot: id("toastSlot"),
      pinned: document.getElementById("navGroup").classList.contains("is-pinned"), version: (document.getElementById("appVer") || {}).textContent || "" };
  });
  /* [name, url, w, h, 200% text, at the end, Undo showing, what] */
  const S = [
    ["pair-cover-selected-day-1-before", OLD.url, 382, 560, false, false, false, "before (v0.1.3.1): cover at the Safari visible height, Fri picked; the pinned strip, row and slot cover the last exercise and Mark day done"],
    ["pair-cover-selected-day-2-after", T.url, 382, 560, false, false, false, "after (v0.1.3.2): the same; the whole card, Mark day done included, then the strip and the row in the flow"],
    ["after-inner-portrait-selected-day", T.url, 669, 751, false, false, false, "after: inner portrait at the Safari visible height, Fri picked"],
    ["after-inner-landscape-selected-day", T.url, 951, 585, false, false, false, "after: inner landscape at the Safari visible height, Fri picked"],
    ["after-cover-200text-selected-day", T.url, 382, 560, true, false, false, "after: cover at 200% text, Fri picked, at rest (the card starts at its top; the rest is a scroll away)"],
    ["after-cover-200text-selected-day-end", T.url, 382, 560, true, true, false, "after: cover at 200% text, Fri picked, at the end: Mark day done, the strip and the row clear"],
    ["after-cover-selected-day-undo-end", T.url, 382, 560, false, true, true, "after: cover, Fri picked, skipped, at the end: Undo in its slot below the row"],
  ];
  for (const [nm, url, w, h, big, end, undo, what] of S) {
    const ctx = await L.context(b, T.engine, w, h, { dark: true, now: SAT, seed: L.seedFor(B, { done }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: ":root{--safe-b:34px !important}" + (big ? "html{font-size:200%!important}" : "") }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await p.waitForTimeout(300);
    /* the reader scrolls the strip into view and taps Fri */
    await p.evaluate(d => document.querySelector('[data-strip="' + d + '"]').scrollIntoView({ block: "nearest" }), FRI); await p.waitForTimeout(150);
    await p.evaluate(d => document.querySelector('[data-strip="' + d + '"]').click(), FRI); await p.waitForTimeout(400);
    if (undo) { await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(350); }
    if (end) { await p.evaluate(() => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = sc.scrollHeight; }); await p.waitForTimeout(300); }
    await L.settle(p);
    const m = await measure(p);
    const f = path.join(OUT, `${nm}-${w}x${h}-dark.png`); await p.screenshot({ path: f });
    shots.push({ file: rel(f), build: url === OLD.url ? "v0.1.3.1 (4034d2d)" : "this build", viewport: w + "x" + h, safeB: 34, text: big ? "200%" : "100%", what, ...m, bytes: fs.statSync(f).size });
    if (W.errs.length) errs.push(nm + ": " + W.errs.join(" | "));
    await ctx.close();
  }
  await b.close(); T.close(); OLD.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ version: "v0.1.3.2-preview", engine: T.engine, url: argv[1] || "local", clock: SAT, scheme: "dark, Fri (Lower B) picked from the strip", shots, errors: errs }, null, 2) + "\n");
  shots.forEach(s => console.log(s.file, s.build, "rows", JSON.stringify(s.rows), "done", JSON.stringify(s.done), "strip", JSON.stringify(s.strip), "row", JSON.stringify(s.row), "slot", JSON.stringify(s.slot), "pinned", s.pinned));
  console.log(shots.length + " shots, " + errs.length + " errors"); if (errs.length) console.log(errs.join("\n"));
})().catch(e => { console.error(e); process.exit(2); });
