/* v0.1.4.3 gate: node test/gate-v0143.js <webkit|chromium> [url]
   The split (the Counter, short landscape) when window.innerWidth/innerHeight disagree with the viewport the CSS lays
   out with. The owner's report (2026-10-27, Home Screen app on the 466x678 cover screen at 3x): in landscape the page
   laid out 678 wide, in the phone layout, and the split never showed over 4 relaunches and about 10 turns. Up to
   v0.1.4.2 the layout (src/head.html) and the split (src/app6.js wantCounter) were picked from innerWidth/innerHeight;
   v0.1.4.3 picks both from media queries and re-checks on their change events.
   Plan b-4day-upper-lower, week 2, Tue 2026-10-27 16:55, dark. Home Screen app (navigator.standalone) unless "tab".
   Launch kinds: clean; inner sizes read the size turned (portrait) for 300ms then right (no resize after); and three
   mismatches that last the whole visit: the size turned, the height read as 510, the width read as 590.
   (S) the split shows at the iPhone landscape sizes 812x375, 844x390, 852x393, 874x402, 926x428, 932x430, 956x440 (side
       insets 59, bottom 21, both rotations), and at the Duo cover sizes 678x466 (safe 16/79/35, the owner's screenshot),
       644x382 and 678x396. On a clean launch, a turn to portrait hides it and the turn back shows it.
   (N) no split and the right layout where the viewport is not short landscape, even when the inner sizes say it is:
       466x678 and 393x852 portrait (phone), 951x669 (two panes), 669x951 (inner portrait).
   (M) mutations (every copy in the file, the live script and the self-copy), each must fail: the split picked from innerWidth/innerHeight (v0.1.4.2's rule), and the layout picked
       from innerWidth/innerHeight (v0.1.4.2's rule).
   (A) Designer A+ (2026-10-27): the owner's cover screen gives the Home Screen app a 594x466 window in landscape (382x678
       in portrait; the status column is outside the window) and v0.1.4.2 needed 600. Standalone with the owner's insets
       (landscape top 16, bottom 35; portrait top 67, bottom 20; the side column is outside the window). At 560x466,
       580x430, 594x466 and 644x382 (100% text), every training day of every plan, weeks 1 and last: the split shows; the
       heading ("This week") does not overflow and keeps 8px spare, var(--gap) >= 12px before Back to today; no day name
       is truncated (no ellipsis, scrollWidth <= clientWidth, inside its row); week rows >= 44px; Back to today is absent
       with today selected and present and fully visible otherwise. 594x466 at 200% text and 382x678: no split.
       Also 560x466 with no insets. Back to today's label ends within 1px of the status circles' right edge (10px in). No
       line of a day name holds a single character (a trailing letter or number is bound to its word: "Full" / "body A").
       Designer option 3: 200% text in landscape under 700 wide is the single column (594x466, 644x382, 678x396, 699x420);
       150% at 594x466 and 200% at 812x375 follow the 12ch measurement (split).
   (AM) mutations: "Week and progress" back in the split heading fails the 560 heading check; the day-name ellipsis
       back fails the Full body check; the v0.1.4.2 600px minimum fails at 594x466; a normal space before the trailing
       letter fails the one-character-line check at 560x466 (no insets).
   Fails on a5966af (v0.1.4.1) and 344d60a (v0.1.4.2); passes on v0.1.4.3. */
const L = require("./lib");
const { rows, rec, fails } = L.makeRec();
const PLAN = L.norm(L.readSample("b-4day-upper-lower"));
const NOW = "2026-10-27T16:55:00-05:00";
const SEED = { schema: 1, plan: PLAN, seen: [], week: 2, startDate: "2026-10-19", openDays: {}, lifts: [], body: [], tab: "train", progView: "body",
  done: { "w1-upperA": "done", "w1-lowerA": "done", "w1-upperB": "done", "w1-lowerB": "done", "w2-upperA": "done" } };
const IP = [[812, 375], [844, 390], [852, 393], [874, 402], [926, 428], [932, 430], [956, 440]];
const ON = [].concat(...IP.map(([w, h], i) => [[`iPhone ${w}x${h} ${i % 2 ? "right" : "left"}`, w, h, { app: true, safe: [0, i % 2 ? 59 : 0, 21, i % 2 ? 0 : 59] }]]),
  [["s06 app", 678, 466, { app: true, safe: [16, 79, 35, 0] }], ["s06 tab", 678, 466, {}], ["644x382 app", 644, 382, { app: true, safe: [0, 59, 21, 0] }], ["678x396 tab", 678, 396, {}]]);
const OFF = [["466x678 app", 466, 678, { app: true, safe: [0, 59, 0, 0] }, "phone"], ["393x852 app", 393, 852, { app: true, safe: [59, 0, 34, 0] }, "phone"],
  ["951x669 tab", 951, 669, {}, "duo"], ["669x951 app", 669, 951, { app: true, safe: [82, 0, 34, 0] }, "innerp"]];
const J = o => JSON.stringify(o);
const FIX = L.norm(JSON.parse(L.fs.readFileSync(L.path.join(L.ROOT, "test", "fixtures", "legs-priority.json"), "utf8")));
const PLANS = [["legs-priority", FIX]].concat(L.SAMPLES.map(n => [n, L.norm(L.readSample(n))]));
const seedOf = (plan, week) => ({ schema: 1, plan, seen: [], week, startDate: "2026-10-26", done: {}, openDays: {}, lifts: [], body: [], tab: "train", progView: "body" });
const OWN_L = [16, 0, 35, 0], OWN_P = [67, 0, 20, 0], A_NOW = "2026-10-26T08:10:00-05:00";
const A_ON = [[560, 466, OWN_L], [580, 430, OWN_L], [594, 466, OWN_L], [644, 382, OWN_L], [560, 466, [0, 0, 0, 0]]];
const MUT_HEAD = ['on ? "This week" : "Week and progress"', 'on ? "Week and progress" : "Week and progress"'];
const MUT_ELL = ["white-space: normal; overflow-wrap: anywhere; overflow: visible; text-overflow: clip; }", "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }"];
const MUT_NBSP = ['"\\u00a0$1"', '" $1"'];
const MUT_600 = ["(orientation: landscape) and (min-width: 560px) and (max-height: 499.98px)", "(orientation: landscape) and (min-width: 600px) and (max-height: 499.98px)"];
const MUT_SPLIT = ["wantCounter() { return OUTER_MQ.matches && COUNTER_MQ.matches && !bigNarrow() && weekRoom() && headRoom() !== \"none\"; }", "wantCounter() { return OUTER_MQ.matches && window.innerWidth >= 600 && window.innerWidth > window.innerHeight && window.innerHeight < 500; }"];
const MUT_MODE = [/\/\*WANT\*\/[\s\S]*?\/\*END\*\//g, '/*WANT*/return Math.min(w, ht) >= 520 ? (w > ht ? "duo" : "innerp") : "phone";/*END*/'];
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(n);
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine);
  async function page(w, h, o, fake, muts) {
    const ctx = await L.context(b, engine, w, h, { seed: SEED, dark: true, now: NOW, standalone: !!o.app, screen: { width: w, height: h } });
    if (muts) await ctx.route(u => u.href.split(/[?#]/)[0] === url, async r => { const res = await r.fetch(); let s = await res.text();
      for (const [a, z] of muts) { const n = typeof a === "string" ? s.split(a).join(z) : s.replace(a, () => z); if (n === s) { await r.abort(); return; } s = n; } await r.fulfill({ response: res, body: s }); });
    const css = o.safe ? `:root{--safe-t:${o.safe[0]}px !important;--safe-r:${o.safe[1]}px !important;--safe-b:${o.safe[2]}px !important;--safe-l:${o.safe[3]}px !important}` : "";
    if (css) await ctx.addInitScript(c => { const go = () => { const s = document.createElement("style"); s.textContent = c; document.documentElement.appendChild(s); };
      if (document.documentElement) go(); else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); go(); } }); mo.observe(document, { childList: true }); } }, css);
    if (fake) await ctx.addInitScript(([fw, fh, ms]) => { let f = true;
      Object.defineProperty(window, "innerWidth", { get: () => f ? fw : document.documentElement.clientWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { get: () => f ? fh : (window.visualViewport ? Math.round(visualViewport.height) : document.documentElement.clientHeight), configurable: true });
      if (ms) setTimeout(() => { f = false; }, ms); }, fake);
    const p = await ctx.newPage(), W = L.watch(p); await p.goto(url); await p.waitForTimeout(3000);
    return { ctx, p, W };
  }
  const probe = p => p.evaluate(() => { const h = document.documentElement, pt = document.querySelector("#paneToday");
    return { counter: h.classList.contains("counter"), mode: h.classList.contains("L-duo") ? "duo" : h.classList.contains("L-innerp") ? "innerp" : "phone",
      pane: !!pt && pt.getClientRects().length > 0 && getComputedStyle(pt).display !== "none", inner: innerWidth + "x" + innerHeight, css: h.clientWidth + "x" + h.clientHeight }; });
  const shown = g => g.counter && g.pane && g.mode === "phone";
  const kinds = (w, h) => [["clean launch", null], ["late 300ms (turned)", [h, w, 300]], ["mismatch: turned", [h, w, 0]], ["mismatch: height 510", [w, 510, 0]], ["mismatch: width 590", [590, h, 0]]];
  if (on("S")) for (const [sz, w, h, o] of ON) for (const [kn, fake] of kinds(w, h)) {
    const { ctx, p, W } = await page(w, h, o, fake); const g = await probe(p);
    rec(`${sz} ${kn}`, "(S) the split shows", shown(g), J(g));
    if (!fake) { await p.setViewportSize({ width: h, height: w }); await p.waitForTimeout(900); const g2 = await probe(p);
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(900); const g3 = await probe(p);
      rec(`${sz} ${kn}`, "(S) a turn to portrait hides it and the turn back shows it", !g2.counter && shown(g3), J({ portrait: g2.counter, back: g3.counter })); }
    rec(`${sz} ${kn}`, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (on("N")) for (const [sz, w, h, o, mode] of OFF) for (const [kn, fake] of [["clean launch", null], ["mismatch: inner reads 678x466", [678, 466, 0]], ["late 300ms (inner 678x466)", [678, 466, 300]]]) {
    const { ctx, p, W } = await page(w, h, o, fake); const g = await probe(p);
    rec(`${sz} ${kn}`, `(N) no split, layout ${mode}`, !g.counter && g.mode === mode, J(g));
    rec(`${sz} ${kn}`, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  async function pageA(w, h, plan, week, safe, big, muts) {
    const ctx = await L.context(b, engine, w, h, { seed: seedOf(plan, week), dark: true, now: A_NOW, standalone: true, screen: { width: 466, height: 678 } });
    if (muts) await ctx.route(u => u.href.split(/[?#]/)[0] === url, async r => { const res = await r.fetch(); let s = await res.text();
      for (const [a, z] of muts) { const n = s.split(a).join(z); if (n === s) { await r.abort(); return; } s = n; } await r.fulfill({ response: res, body: s }); });
    const css = `:root{--safe-t:${safe[0]}px !important;--safe-r:${safe[1]}px !important;--safe-b:${safe[2]}px !important;--safe-l:${safe[3]}px !important}` + (big ? `html{font-size:${big === 1.5 ? 150 : 200}%!important}` : "");
    await ctx.addInitScript(c => { const go = () => { const s = document.createElement("style"); s.textContent = c; document.documentElement.appendChild(s); };
      if (document.documentElement) go(); else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); go(); } }); mo.observe(document, { childList: true }); } }, css);
    const p = await ctx.newPage(), W = L.watch(p); await p.goto(url); await p.waitForTimeout(900);
    return { ctx, p, W };
  }
  /* every day cell of the shown week: heading, names, rows, Back to today (training days only) */
  const probeA = p => p.evaluate(async () => {
    const q = s => document.querySelector(s), rc = e => e.getBoundingClientRect(), root = document.documentElement, out = [];
    if (!root.classList.contains("counter")) return { counter: false, days: out };
    const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility === "visible" && getComputedStyle(e).display !== "none";
    const cells = Array.from(document.querySelectorAll("#weekStrip [data-strip]"));
    const todayIdx = cells.findIndex(c => c.classList.contains("is-today"));
    const look = (d, rest, isToday) => {
      const op = q("#openPlan"), lab = op.querySelector("span"), chev = op.querySelector(".chev-box"), row = q("#navRow"), bt = q("#backToday");
      const col = rc(q("#weekStrip")), names = Array.from(document.querySelectorAll("#weekStrip .wd .ss"));
      const btOn = vis(bt), br = btOn ? rc(bt) : null, cx = br ? document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2) : null;
      const back = br ? { full: br.left >= col.left - 0.5 && br.right <= col.right + 0.5 && br.top >= 0 && br.bottom <= innerHeight + 0.5, hit: !!cx && bt.contains(cx), w: Math.round(br.width), h: Math.round(br.height) } : null;
      const dotR = Math.max(...Array.from(document.querySelectorAll("#weekStrip .wd .dot")).map(e => rc(e).right));
      let edge = null; if (br) { const rg = document.createRange(); rg.selectNodeContents(bt); const rs = Array.from(rg.getClientRects()).filter(r => r.width > 0); if (rs.length) edge = Math.max(...rs.map(r => r.right)) - dotR; }
      /* line boxes of each day name: characters grouped by their line's top; a line of one character is a widow */
      const lone = names.filter(n => { const t = n.firstChild; if (!t || t.nodeType !== 3) return false; const lines = new Map(), rg = document.createRange();
        for (let i = 0; i < t.length; i++) { if (/\s/.test(t.data[i])) continue; rg.setStart(t, i); rg.setEnd(t, i + 1); const r = rg.getClientRects()[0]; if (!r) continue; const k = Math.round(r.top);
          lines.set(k, (lines.get(k) || 0) + 1); }
        return lines.size > 1 && [...lines.values()].some(v => v === 1); }).map(n => n.textContent);
      return { d, rest, isToday, edge, lone, text: lab.textContent, over: lab.scrollWidth - lab.clientWidth, ell: getComputedStyle(lab).textOverflow, spare: (e => (btOn ? Math.min(br.left, e - br.width) : e))(rc(row).left + row.clientLeft + row.clientWidth - parseFloat(getComputedStyle(row).paddingRight)) - rc(chev).right, /* v0.1.4.3 (Designer ruling B): from the chevron to Back to today at its home on the header row's right edge (its left, or the edge minus its width if a long heading pushed it out), or to the edge when Back is absent; the link sizes to its content, so its own right edge no longer measures the room */
        gap: parseFloat(getComputedStyle(row).columnGap) || 0, back,
        badNames: names.filter(n => n.scrollWidth > n.clientWidth + 0.5 || (getComputedStyle(n).textOverflow === "ellipsis" && getComputedStyle(n).overflowX !== "visible") || rc(n).bottom > rc(n.closest(".wd")).bottom + 0.5 || rc(n).top < rc(n.closest(".wd")).top - 0.5).map(n => n.textContent),
        minRow: Math.min(...Array.from(document.querySelectorAll("#weekStrip .wd")).map(r => rc(r).height)) };
    };
    out.push(Object.assign(look("load", false, true), { load: true }));
    for (let i = 0; i < cells.length; i++) { const c = cells[i]; const rest = /: rest\b/i.test(c.getAttribute("aria-label") || "");
      c.click(); await new Promise(r => setTimeout(r, 150)); out.push(look(c.dataset.strip, rest, i === todayIdx)); }
    /* a rest today: its cell picks the next training day (Back shows), the same as any other rest cell, so it is skipped */
    if (todayIdx >= 0 && !/^Rest$/.test(cells[todayIdx].querySelector(".ss").textContent.trim())) { cells[todayIdx].click(); await new Promise(r => setTimeout(r, 150)); out.push(Object.assign(look(cells[todayIdx].dataset.strip, false, true), { again: true })); }
    return { counter: true, todayIdx, days: out };
  });
  const headOk = d => d.over <= 0 && d.ell !== "ellipsis" && d.spare >= 8 - 0.01 && (!d.back || d.gap >= 12 - 0.01);
  const backOk = d => d.isToday ? !d.back : !!d.back && d.back.full && d.back.hit && d.back.w >= 44 - 0.5 && d.back.h >= 44 - 0.5 && d.edge != null && Math.abs(d.edge) <= 1;
  if (on("A")) {
    for (const [w, h, safe] of A_ON) { let n = 0; const bad = { split: [], head: [], names: [], lone: [], rows: [], back: [] }; let minSpare = 1e9, errs = [];
      for (const [pn, plan] of PLANS) for (const wk of (plan.meta && plan.meta.weeks > 1 ? [1, plan.meta.weeks] : [1])) {
        const { ctx, p, W } = await pageA(w, h, plan, wk, safe, false); const g = await probeA(p); errs = errs.concat(W.errs); await ctx.close();
        if (!g.counter) { bad.split.push(`${pn} w${wk}`); continue; }
        for (const d of g.days) { if (d.rest) continue; n++; minSpare = Math.min(minSpare, d.spare);
          /* "today" is the home card: the state at launch, and today's own cell when it is a training day (the seeded week
             is the current one). A rest day is not checked: on a rest today the home card is the next training day. */
          d.isToday = d.load || d.isToday;
          const tag = `${pn} w${wk} d${d.d}${d.again ? " (today again)" : ""}`;
          if (!headOk(d)) bad.head.push(`${tag} "${d.text}" over ${d.over} spare ${Math.round(d.spare)} gap ${d.gap}`);
          if (d.badNames.length) bad.names.push(`${tag} ${d.badNames.slice(0, 3).join("|")}`);
          if (d.lone.length) bad.lone.push(`${tag} ${d.lone.slice(0, 3).join("|")}`);
          if (d.minRow < 44 - 0.5) bad.rows.push(`${tag} ${Math.round(d.minRow)}`);
          if (d.edge != null) bad.edgeMax = Math.max(bad.edgeMax || 0, Math.abs(d.edge));
          if (!backOk(d)) bad.back.push(`${tag} today ${d.isToday} back ${J(d.back)} edge ${d.edge == null ? "-" : Math.round(d.edge * 10) / 10}`); } }
      const sz = `${w}x${h} app 100%${safe[0] ? "" : " insets 0"}`;
      rec(sz, "(A) the split shows for every plan and week", !bad.split.length, bad.split.join(", "));
      rec(sz, `(A) heading fits with >= 8px spare and >= 12px gap (${n} days, min spare ${Math.round(minSpare)}px)`, !bad.head.length, bad.head.slice(0, 4).join("; "));
      rec(sz, "(A) no day name truncated", !bad.names.length, bad.names.slice(0, 4).join("; "));
      rec(sz, "(A) no line of a day name holds one character (a trailing letter or number stays with its word)", !bad.lone.length, bad.lone.slice(0, 4).join("; "));
      rec(sz, "(A) week rows >= 44px", !bad.rows.length, bad.rows.slice(0, 4).join("; "));
      rec(sz, "(A) Back to today absent on today, present and fully visible otherwise, its label's right edge within 1px of the status circles'", !bad.back.length, "max |edge| " + Math.round((bad.edgeMax || 0) * 100) / 100 + "px; " + bad.back.slice(0, 4).join("; "));
      rec(sz, "no errors", !errs.length, errs.slice(0, 3).join(" | ")); }
    /* Designer option 3 (2026-10-27): 200% text in landscape under 700 wide is always the single column; 150%, and 200% from
       700 wide, follow the 12ch measurement */
    for (const [sz, w, h, safe, big, want] of [["594x466 app 200%", 594, 466, OWN_L, 2, false], ["644x382 app 200%", 644, 382, [0, 47, 21, 0], 2, false], ["678x396 app 200%", 678, 396, [0, 0, 21, 47], 2, false],
      ["699x420 app 200%", 699, 420, [0, 0, 0, 0], 2, false], ["382x678 app", 382, 678, OWN_P, 0, false], ["382x678 app 200%", 382, 678, OWN_P, 2, false],
      ["594x466 app 150% (12ch)", 594, 466, OWN_L, 1.5, true], ["812x375 app 200% (12ch)", 812, 375, [0, 0, 21, 59], 2, true]]) {
      const { ctx, p, W } = await pageA(w, h, PLANS[0][1], 1, safe, big); const g = await probe(p); await ctx.close();
      rec(sz, want ? "(A) the split (the 12ch measurement holds)" : "(A) no split (the single column)", want ? shown(g) : (!g.counter && g.mode === "phone" && g.pane), J(g)); rec(sz, "no errors", !W.errs.length, W.errs.join(" | ")); }
  }
  if (on("AM")) { const src = await (await fetch(url)).text(); let caught = 0;
    const AM = [["\"Week and progress\" in the split heading", [MUT_HEAD], 560, 466, "legs-priority", g => g.days.some(d => !headOk(d))],
      ["the day-name ellipsis", [MUT_ELL], 560, 466, "a-3day-beginner-full-body", g => g.days.some(d => d.badNames.some(t => /Full body/.test(t)))],
      ["the v0.1.4.2 600px minimum", [MUT_600], 594, 466, "legs-priority", g => !g.counter],
      ["a normal space before a trailing letter", [MUT_NBSP], 560, 466, "a-3day-beginner-full-body", g => g.days.some(d => d.lone.length), [0, 0, 0, 0]]];
    for (const [name, muts, w, h, pn, failed, msafe] of AM) {
      if (!muts.every(([a]) => src.includes(a))) { rec("mutation", `(AM) ${name}: the build has the v0.1.4.3 rule to mutate`, false, "not in this build"); continue; }
      const plan = PLANS.find(x => x[0] === pn)[1]; const { ctx, p } = await pageA(w, h, plan, 1, msafe || OWN_L, false, muts); const g = await probeA(p); await ctx.close();
      const c = failed(g); if (c) caught++; rec("mutation", `(AM) ${name}, ${w}x${h} ${pn}: its check fails`, c, J({ counter: g.counter, d: g.days.slice(0, 2).map(d => [d.text, d.over, Math.round(d.spare), d.badNames, d.lone]) })); }
    console.log(`MUTATION v0.1.4.3 A+: fails ${caught}/${AM.length}`); }
  if (on("M")) { const src = await (await fetch(url)).text(); let caught = 0;
    const M = [["the split from innerWidth/innerHeight", [MUT_SPLIT], ["s06 app", 678, 466, ON[7][3]], [466, 678, 0], true],
      ["the split from innerWidth/innerHeight", [MUT_SPLIT], ["iPhone 852x393", 852, 393, ON[2][3]], [852, 510, 0], true],
      ["the layout from innerWidth/innerHeight", [MUT_MODE], ["951x669 tab", 951, 669, {}], [678, 466, 0], false]];
    for (const [name, muts, [sz, w, h, o], fake, wantSplit] of M) {
      /* each mutation's own anchor must be in the build (a string, or the head's WANT..END rule) */
      if (!muts.every(([x]) => typeof x === "string" ? src.includes(x) : new RegExp(x.source).test(src))) { rec("mutation", `(M) ${name}: the build has the v0.1.4.3 rule to mutate`, false, "not in this build"); continue; }
      const { ctx, p } = await page(w, h, o, fake, muts); const g = await probe(p); await ctx.close();
      const c = wantSplit ? !shown(g) : (g.counter || g.mode !== "duo"); if (c) caught++;
      rec("mutation", `(M) ${name}, ${sz} inner ${fake[0]}x${fake[1]}: its check fails`, c, J(g)); }
    console.log(`MUTATION v0.1.4.3 split: fails ${caught}/${M.length}`); }
  await b.close(); T.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
