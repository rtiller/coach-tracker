/* v0.1.4.3 gate: node test/gate-v0143-top.js <webkit|chromium> [url]
   The top of a Home Screen app in portrait (navigator.standalone, viewport-fit=cover): no text and no control starts
   under the status bar. A video review of the owner's recording said the top line ('3 W2 OF 12, BLOCK 1') drew under
   the status bar; the frames checked so far do not show it, so the app is unchanged and this gate guards it.
   Bars (the safe-area top the page is given, CSS px): 375x812 50, 390x844 47, 393x852 59, 402x874 62, 440x956 62,
   669x951 82 (Duo inner), 466x678 0 with the island on the right (59), 382x678 67 (the owner's cover screen as the
   Home Screen app gets it, 2026-10-27 About readout: the status column is outside the window), and "inset 0 under a
   59px bar": 393x852 and 402x874 where env(safe-area-inset-top) reads 0 but the bar is 59px (in case iOS reports no
   inset while drawing the page under its bar). 100% and 200% text. Plan b-4day-upper-lower, week 2, dark.
   (T) at rest (scroll 0): every visible text line, button and the Today card start at or below the bar.
   (T) after a day is picked on the strip, the Today card's top is at or below the bar.
   (T) Week and progress opened: its head (title, Close) starts at or below the bar.
   (M) mutations, each must fail: no 50px floor (--top-floor: 0), and the top padding from the inset alone (--top-buf:
       var(--safe-t)).
   v0.1.4.3 makes no app change here; this passes on a5966af and 344d60a unless the app regresses (see the release notes). */
const L = require("./lib");
const { rows, rec, fails } = L.makeRec();
const PLAN = L.norm(L.readSample("b-4day-upper-lower"));
const NOW = "2026-10-27T17:05:00-05:00";
const SEED = { schema: 1, plan: PLAN, seen: [], week: 2, startDate: "2026-10-19", openDays: {}, lifts: [], body: [], tab: "train", progView: "body",
  done: { "w1-upperA": "done", "w1-lowerA": "done", "w1-upperB": "done", "w1-lowerB": "done", "w2-upperA": "done" } };
/* [name, w, h, safe t/r/b/l given to the page, bar height on screen] */
const SIZES = [["375x812", 375, 812, [50, 0, 34, 0], 50], ["390x844", 390, 844, [47, 0, 34, 0], 47], ["393x852", 393, 852, [59, 0, 34, 0], 59],
  ["402x874", 402, 874, [62, 0, 34, 0], 62], ["440x956", 440, 956, [62, 0, 34, 0], 62], ["669x951", 669, 951, [82, 0, 34, 0], 82],
  ["466x678 cover", 466, 678, [0, 59, 0, 0], 0], ["382x678 owner cover portrait", 382, 678, [67, 0, 20, 0], 67], ["393x852 inset 0 under a 59px bar", 393, 852, [0, 0, 34, 0], 59], ["402x874 inset 0 under a 59px bar", 402, 874, [0, 0, 34, 0], 59]];
const J = o => JSON.stringify(o);
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(n);
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine);
  async function page(w, h, safe, big, mut) {
    const ctx = await L.context(b, engine, w, h, { seed: SEED, dark: true, now: NOW, standalone: true, screen: { width: w, height: h } });
    const css = `:root{--safe-t:${safe[0]}px !important;--safe-r:${safe[1]}px !important;--safe-b:${safe[2]}px !important;--safe-l:${safe[3]}px !important}` + (big ? "html{font-size:200%!important}" : "") + (mut || "");
    await ctx.addInitScript(c => { const go = () => { const s = document.createElement("style"); s.textContent = c; document.documentElement.appendChild(s); };
      if (document.documentElement) go(); else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); go(); } }); mo.observe(document, { childList: true }); } }, css);
    const p = await ctx.newPage(), W = L.watch(p); await p.goto(url); await p.waitForTimeout(2500);
    return { ctx, p, W };
  }
  /* the highest visible text line or control top inside the given root (the viewport's top band only) */
  const high = (p, sel) => p.evaluate(sel => { const root = document.querySelector(sel) || document.body, out = [];
    const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (x.hidden || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; };
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { if (!n.textContent.trim() || !vis(n.parentElement)) continue; const r = document.createRange(); r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight) out.push({ t: q.top, s: n.textContent.trim().slice(0, 24) }); }
    for (const e of root.querySelectorAll("button, a, input, [role=button]")) { if (!vis(e)) continue; const q = e.getBoundingClientRect(); if (q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight) out.push({ t: q.top, s: "<" + e.tagName.toLowerCase() + "> " + (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 20) }); }
    out.sort((a, b) => a.t - b.t); const c = document.querySelector("#today"); return { top: out[0] || null, card: c ? c.getBoundingClientRect().top : null, sy: Math.round(scrollY) }; }, sel);
  const ok = (g, bar) => !!g.top && g.top.t >= bar - 0.5 && (g.card === null || g.card >= bar - 0.5);
  async function run(tag, w, h, safe, bar, big, mut) {
    const bad = []; const { ctx, p, W } = await page(w, h, safe, big, mut);
    const g0 = await high(p, "#app"); if (!ok(g0, bar)) bad.push("rest " + J(g0));
    const day = p.locator('#weekStrip [data-strip="3"]');
    if (await day.count()) { await day.first().click(); await p.waitForTimeout(500); const g1 = await high(p, "#app"); if (!(g1.card === null || g1.card >= bar - 0.5)) bad.push("strip pick " + J(g1)); }
    const op = p.locator("#openPlan"); if (await op.count() && await op.first().isVisible()) { await op.first().click(); await p.waitForTimeout(600);
      const g2 = await high(p, "#planPane .sheet-head, #planPane"); if (!g2.top || g2.top.t < bar - 0.5) bad.push("Week and progress " + J(g2)); }
    const errs = W.errs.slice(); await ctx.close(); return { bad, errs };
  }
  if (on("T")) for (const [sz, w, h, safe, bar] of SIZES) for (const big of [false, true]) {
    const tag = sz + (big ? " 200%" : ""), r = await run(tag, w, h, safe, bar, big);
    rec(tag, `(T) at rest, after a strip pick and in Week and progress: nothing starts under the ${bar}px bar`, r.bad.length === 0, r.bad.join(" ; "));
    rec(tag, "no errors", r.errs.length === 0, r.errs.join(" | "));
  }
  if (on("M")) { let caught = 0; const MUT = [["no 50px floor", ":root{--top-floor:0px !important}"], ["the top padding from the inset alone", ":root{--top-buf:var(--safe-t) !important}"]];
    for (const [name, css] of MUT) { const r = await run("mutation", 393, 852, [0, 0, 34, 0], 59, false, css); const c = r.bad.length > 0; if (c) caught++;
      rec("mutation", `(M) ${name}, 393x852 inset 0 under a 59px bar: (T) fails`, c, r.bad.join(" ; ").slice(0, 300)); }
    console.log(`MUTATION v0.1.4.3 top: fails ${caught}/${MUT.length}`); }
  await b.close(); T.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
