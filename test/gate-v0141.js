/* v0.1.4.1 gate: node test/gate-v0141.js <webkit|chromium> [url]
   The Counter's long days. Plans: test/fixtures/legs-priority.json and every sample; weeks 1 and the last; sizes 644x382
   and 678x396, landscape-left (--safe-l 47, --safe-b 21) and landscape-right (--safe-r 47, --safe-b 21), dark, Mon 08:10.
   (f) 100% text, every training day (so the longest by rows plus tag lines): the list and the card do not scroll, no
       counter-scroll and no "more" control, every row wholly inside the list's visible box; names >= 13px, sets >= 12px;
       the sets right-aligned on every row (their right edge at the row's right edge).
   (g) the fitted scale (--cs) is never more than v0.1.3.4's (ce0e540, served here) for the same plan and size.
   (h) 200% text (changed on Designer request, 2026-10-27: at 812x375 and 844x390, where the 200% split shows; 644x382
       and 678x396 at 200% are the single column), every training day, at rest and after each tap on the control until it hides: the visible chip is at most
       24px tall, the button still at least 44x44, and neither rect intersects any text rect on screen (text clipped to the
       list's visible box), nor Skip or Done.
   Mutations (each must fail its check): v0.1.4's row and tag padding; no ceiling pass; a 30px chip; the control over the
   rows; 12px names. */
const L = require("./lib");
const http = require("http"), { execSync } = require("child_process");
const { rows, rec, fails } = L.makeRec();
const PREV_SHA = "ce0e540";
function serveHtml(html) {
  const srv = http.createServer((req, res) => { const u = req.url.split("?")[0];
    if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}
const FIX = L.norm(JSON.parse(L.fs.readFileSync(L.path.join(L.ROOT, "test", "fixtures", "legs-priority.json"), "utf8")));
const PLANS = [["legs-priority", FIX]].concat(L.SAMPLES.map(s => [s, L.norm(L.readSample(s))]));
const NOW = "2026-10-26T08:10:00-05:00";
const seedOf = (plan, week) => ({ schema: 1, plan, seen: [], week, startDate: "2026-10-26", done: {}, openDays: {}, lifts: [], body: [], tab: "train", progView: "body" });
const SIZES = [[644, 382, "left", ":root{--safe-l:47px !important;--safe-b:21px !important}"], [644, 382, "right", ":root{--safe-r:47px !important;--safe-b:21px !important}"],
  [678, 396, "left", ":root{--safe-l:47px !important;--safe-b:21px !important}"], [678, 396, "right", ":root{--safe-r:47px !important;--safe-b:21px !important}"]];
const J = o => JSON.stringify(o, (k, v) => typeof v === "number" ? Math.round(v * 10) / 10 : v);
const weeksOf = plan => { const n = (plan.meta && plan.meta.weeks) || 1; return n > 1 ? [1, n] : [1]; };
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(n);
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine), PREV = await serveHtml(execSync(`git show ${PREV_SHA}:index.html`, { cwd: L.ROOT }));
  async function page(w, h, o) {
    const ctx = await L.context(b, engine, w, h, { seed: seedOf(o.plan, o.week || 1), dark: true, now: NOW });
    const p = await ctx.newPage(); await p.goto(o.url || url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: o.css + (o.big ? "html{font-size:200%!important}" : "") + (o.mut || "") });
    await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(500);
    return { ctx, p };
  }
  /* every training day of the shown week at 100%: rows, tag lines, fit and type */
  const fitProbe = p => p.evaluate(async () => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), out = [];
    const root = document.documentElement, counter = root.classList.contains("counter");
    for (const bt of Array.from(document.querySelectorAll("#weekStrip [data-strip]"))) {
      bt.click(); await new Promise(r => setTimeout(r, 140));
      const card = q("#today"), l = card && card.querySelector(".set-rows"); if (!l) continue;
      const rs = Array.from(l.querySelectorAll(".set-row")); if (!rs.length) continue;
      const lr = rc(l), vt = lr.top + l.clientTop, vb = vt + l.clientHeight, pill = q("#morePill");
      const tagLines = rs.reduce((a, r) => { const n = r.querySelector(".ex-name"); if (!n) return a; const nb = rc(n);
        return a + new Set(Array.from(r.querySelectorAll(".tag")).map(rc).filter(t => t.top >= nb.bottom - 2).map(t => Math.round(t.top))).size; }, 0);
      const names = rs.map(r => r.querySelector(".ex-name")).filter(Boolean), sets = rs.map(r => r.querySelector(".ex-sets")).filter(Boolean);
      out.push({ day: bt.dataset.strip, rows: rs.length, tagLines, listOver: l.scrollHeight - l.clientHeight, cardOver: card.scrollHeight - card.clientHeight,
        cut: rs.filter(r => rc(r).top < vt - 0.5 || rc(r).bottom > vb + 0.5).length, moreOn: card.classList.contains("more-on"),
        pill: !!pill && !pill.hidden && pill.getClientRects().length > 0 && getComputedStyle(pill).visibility === "visible",
        nameMin: Math.min(...names.map(n => parseFloat(getComputedStyle(n).fontSize))), setsMin: Math.min(...sets.map(n => parseFloat(getComputedStyle(n).fontSize))),
        setsRight: rs.every(r => { const s = r.querySelector(".ex-sets"); return !s || Math.abs(rc(s).right - rc(r).right) <= 1; }) });
    }
    return { counter, scroll: root.classList.contains("counter-scroll"), cs: parseFloat(getComputedStyle(root).getPropertyValue("--cs")), days: out };
  });
  const csAt = async (w, h, o) => { const { ctx, p } = await page(w, h, o); const v = await p.evaluate(() => ({ counter: document.documentElement.classList.contains("counter"), cs: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cs")) })); await ctx.close(); return v; };
  const fitBad = g => [].concat(g.counter ? [] : ["not the Counter"], g.scroll ? ["counter-scroll"] : [],
    ...g.days.map(d => (d.listOver > 0.5 || d.cardOver > 0.5 || d.cut || d.moreOn || d.pill) ? [`d${d.day} r${d.rows}+tl${d.tagLines} list+${Math.round(d.listOver)} card+${Math.round(d.cardOver)} cut${d.cut}${d.moreOn ? " more-on" : ""}${d.pill ? " pill" : ""}`] : []));
  const typeBad = g => g.days.filter(d => d.nameMin < 13 - 0.01 || d.setsMin < 12 - 0.01).map(d => `d${d.day} name ${d.nameMin} sets ${d.setsMin}`);
  /* the control at 200%: chip and button rects against every text rect on screen */
  const moreProbe = p => p.evaluate(() => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), pane = q("#paneToday"), card = q("#today"), l = card.querySelector(".set-rows"), pill = q("#morePill");
    const shown = !!pill && !pill.hidden && pill.getClientRects().length > 0 && getComputedStyle(pill).display !== "none" && getComputedStyle(pill).visibility === "visible";
    if (!shown) return { shown, end: l.scrollTop + l.clientHeight >= l.scrollHeight - 1 };
    const chip = pill.querySelector(".mp-chip"), pr = rc(pill), cr = chip ? rc(chip) : pr, lr = rc(l), vt = lr.top + l.clientTop, vb = vt + l.clientHeight;
    const X = (a, c) => a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    const texts = [], wk = document.createTreeWalker(pane, NodeFilter.SHOW_TEXT);
    for (let n; (n = wk.nextNode());) {
      if (!n.nodeValue.trim() || pill.contains(n)) continue;
      const e = n.parentElement; if (!e || getComputedStyle(e).visibility !== "visible") continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of Array.from(rg.getClientRects())) { if (r.width < 0.5 || r.height < 0.5) continue;
        let t = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        if (l.contains(n)) { t.top = Math.max(t.top, vt); t.bottom = Math.min(t.bottom, vb); if (t.bottom - t.top < 0.5) continue; }
        texts.push([(e.className || e.tagName) + ":" + n.nodeValue.trim().slice(0, 14), t]); }
    }
    const blocks = [["Done", q("#todayDone")], ["Skip", card.querySelector(".skip-bottom")]].filter(x => x[1] && x[1].getClientRects().length);
    const hits = texts.filter(t => X(pr, t[1]) || X(cr, t[1])).map(t => t[0]).concat(blocks.filter(x => X(pr, rc(x[1]))).map(x => x[0]));
    return { shown, chipH: cr.height, chipIn: !!chip && cr.top >= pr.top - 0.5 && cr.bottom <= pr.bottom + 0.5, btnW: pr.width, btnH: pr.height, hits, texts: texts.length };
  });
  const moreWalk = async p => {
    const days = await p.evaluate(() => Array.from(document.querySelectorAll("#weekStrip [data-strip]")).map(b => b.dataset.strip)), bad = []; let seen = 0, maxH = 0;
    for (const d of days) {
      await p.evaluate(d => document.querySelector(`#weekStrip [data-strip="${d}"]`).click(), d); await p.waitForTimeout(250);
      if (!(await p.evaluate(() => !!document.querySelector("#today .set-rows .set-row")))) continue;
      for (let k = 0; k < 12; k++) {
        const g = await moreProbe(p); if (!g.shown) break; seen++; maxH = Math.max(maxH, g.chipH);
        if (g.chipH > 24 + 0.01) bad.push(`d${d} tap${k} chip ${g.chipH}px`);
        if (!g.chipIn) bad.push(`d${d} tap${k} chip outside its button`);
        if (g.btnW < 44 - 0.5 || g.btnH < 44 - 0.5) bad.push(`d${d} tap${k} target ${g.btnW}x${g.btnH}`);
        if (g.hits.length) bad.push(`d${d} tap${k} over ${g.hits.slice(0, 3).join(",")}`);
        await p.evaluate(() => document.getElementById("morePill").click()); await p.waitForTimeout(650);
      }
    }
    return { bad, seen, maxH };
  };

  const longest = {};
  if (on("f") || on("g")) for (const [pn, plan] of PLANS) for (const [w, h, rot, css] of SIZES) {
    const size = `${pn} ${w}x${h} ${rot}`;
    for (const week of weeksOf(plan)) {
      const { ctx, p } = await page(w, h, { plan, week, css }); const g = await fitProbe(p); await ctx.close();
      const top = g.days.slice().sort((a, c) => (c.rows + c.tagLines) - (a.rows + a.tagLines))[0];
      if (top && (!longest[pn] || top.rows + top.tagLines > longest[pn].n)) longest[pn] = { n: top.rows + top.tagLines, day: top.day, week, rows: top.rows, tagLines: top.tagLines };
      if (on("f")) {
        rec(size + " W" + week, "(f) 100% text: every training day (the longest included) fits with no scroll, every row whole, no more control", g.days.length > 0 && !fitBad(g).length, J(fitBad(g).slice(0, 4)));
        rec(size + " W" + week, "(f) 100% text: exercise names >= 13px, sets >= 12px, sets right-aligned on every row", !typeBad(g).length && g.days.every(d => d.setsRight), J(typeBad(g).concat(g.days.filter(d => !d.setsRight).map(d => "d" + d.day + " sets not right"))));
      }
      if (on("g") && week === 1) { const prev = await csAt(w, h, { plan, week, css, url: PREV.url });
        rec(size, "(g) the fitted scale is not more than v0.1.3.4's", prev.counter && g.cs <= prev.cs + 1e-6, J({ cs: g.cs, prev: prev.cs })); }
    }
  }
  if (on("f")) console.log("LONGEST " + J(longest));
  /* changed on Designer request, 2026-10-27 (v0.1.4.3, option 3): 200% text under 700 wide is the single column, so (h)
     runs where the 200% split still shows (812x375 and 844x390, landscape-left insets) and the old sizes check the single column */
  if (on("h")) for (const [w, h, rot, css] of SIZES.filter(s => s[2] === "left")) { const { ctx, p } = await page(w, h, { plan: FIX, css, big: true });
    const c = await p.evaluate(() => document.documentElement.classList.contains("counter")); await ctx.close();
    rec(`${w}x${h} 200%`, "(h) 200% text under 700 wide: the single column (changed on Designer request, 2026-10-27)", !c); }
  const SIZES200 = SIZES.filter(s => s[2] === "left").map((s, k) => [[812, 375], [844, 390]][k] ? [...[[812, 375], [844, 390]][k], s[2], s[3]] : s);
  if (on("h")) for (const [pn, plan] of PLANS) for (const [w, h, rot, css] of SIZES200) {
    const size = `${pn} ${w}x${h} 200%`;
    const { ctx, p } = await page(w, h, { plan, css, big: true }); const r = await moreWalk(p); await ctx.close();
    rec(size, "(h) 200% text, every training day, at rest and after each tap: the chip <= 24px, the target >= 44x44, over no text, Skip or Done", !r.bad.length, J(r.bad.slice(0, 4)));
    if (pn === "legs-priority") rec(size, "(h) the more control was exercised (the longest day overflows at 200% text)", r.seen > 0, J(r));
  }
  /* mutations: each must make its check fail */
  if (on("m")) {
    const legs = FIX, A = PLANS.find(x => x[0] === "a-3day-beginner-full-body")[1], css = SIZES[0][3];
    const MUT = [
      ["v0.1.4's row and tag padding (the longest day overflows)", "f", legs, "html.counter #paneToday .set-row{padding:calc(0.2rem*var(--cs,1)) 0 !important} html.counter #paneToday .set-row .tag{padding:2px 7px !important;line-height:inherit !important}"],
      ["no ceiling pass (the scale grows past v0.1.3.4's)", "g", A, "html.counter #paneToday.fit-ceil .today-actions{padding:2px 16px 4px !important} html.counter #paneToday.fit-ceil .set-rows{padding-top:0 !important} html.counter #paneToday.fit-ceil .set-row{padding:calc(0.1rem*var(--cs,1)) 0 !important} html.counter #paneToday.fit-ceil .set-row .tag{padding:1px 6px !important;line-height:1.2 !important} html.counter #paneToday.fit-ceil .set-row .ex-left{flex:1 1 8ch !important;align-items:baseline !important}"],
      ["a 30px chip", "h", legs, "html.counter #paneToday .more-pill .mp-chip{height:30px !important}"],
      ["the control over the rows", "h", legs, "html.counter #paneToday .today.more-on .more-pill:not([hidden]){margin:-70px 16px 26px 0 !important}"],
      ["12px names", "t", legs, "html.counter #paneToday{--c-name:12px !important}"]];
    let failed = 0;
    for (const [name, k, plan, mut] of MUT) {
      let caught;
      if (k === "f" || k === "t") { const { ctx, p } = await page(644, 382, { plan, css, mut }); const g = await fitProbe(p); await ctx.close(); caught = k === "f" ? fitBad(g).length > 0 : typeBad(g).length > 0; }
      else if (k === "g") { const { ctx, p } = await page(644, 382, { plan, css, mut }); const g = await fitProbe(p); await ctx.close(); const prev = await csAt(644, 382, { plan, css, url: PREV.url }); caught = g.cs > prev.cs + 1e-6; }
      else { const { ctx, p } = await page(812, 375, { plan, css, mut, big: true }); const r = await moreWalk(p); await ctx.close(); caught = r.bad.length > 0; }
      rec("mutation", "(m) " + name + " fails its check", caught); if (caught) failed++;
    }
    console.log(`MUTATION v0.1.4.1: fails ${failed}/${MUT.length}`);
  }
  await b.close(); T.close(); PREV.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
