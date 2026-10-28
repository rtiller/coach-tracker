/* v0.1.4.2 gate (v0.1.4.3: Up next is gone on the inner screen): node test/gate-v0142.js <webkit|chromium> [url]
   The owner's flow on the inner portrait home: open Week and progress, browse ahead to week 5 on the spine, leave Week and
   progress; and picking a day on the strip. Plan b-4day-upper-lower, week 2 (start Mon 2026-10-19), w1 all done, w2 Mon and
   Tue done, Fri skipped, Mon 2026-10-26 20:50, dark. Sizes: s09 Home Screen app 669x951 (safe top 82, bottom 34), the same
   at 200% text, s09 tab 669x951, s01 669x867, s751 669x751, 720x951 (tabs). Each size twice: a clean launch, and a "late viewport" launch
   (the viewport reads 466x678 for the first 300ms and no resize event follows, as on the owner's Home Screen launch).
   Safe insets are set before the app runs (no resize event), taps are finger taps with no test scrolling.
   (A) layout: the late-viewport launch settles on the clean launch's layout, and the layout never changes during the flow.
   (A) Up next: never after a day is picked or a week is browsed, and never for the day the card shows. v0.1.4.3 (owner:
       "hide the Up next card on the inner screen"): not on the normal Today home either, and with it gone Week and
       progress sits right under the strip (within 16px), as on the owner's normal screenshot.
   (B) scroll: after each step the Today card's top is at or below the top limit (the page's scroll-padding-top, the
       limit the day pick uses), and Skip is wholly below the safe top. Also in the current week: Thu, then today picked
       on the strip (in v0.1.4.2 Up next came back here and the page grew while the reader was at the top).
   Must fail on a5966af (v0.1.4.1); the v0.1.4.3 checks also fail on 344d60a (v0.1.4.2); passes on v0.1.4.3. */
const L = require("./lib");
const { rows, rec, fails } = L.makeRec();
const PLAN = L.norm(L.readSample("b-4day-upper-lower"));
const NOW = "2026-10-26T20:50:00-05:00";
const SEED = { schema: 1, plan: PLAN, seen: [], week: 2, startDate: "2026-10-19", openDays: {}, lifts: [], body: [], tab: "train", progView: "body",
  done: { "w1-upperA": "done", "w1-lowerA": "done", "w1-upperB": "done", "w1-lowerB": "done", "w2-upperA": "done", "w2-lowerA": "done", "w2-lowerB": "skip" } };
const SIZES = [["s09", 669, 951, { app: true, safe: [82, 0, 34] }], ["s09 200%", 669, 951, { app: true, safe: [82, 0, 34], big: true }],
  ["s09 tab", 669, 951, {}], ["s01", 669, 867, {}], ["s751", 669, 751, {}], ["720x951", 720, 951, {}]];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const J = o => JSON.stringify(o, (k, v) => typeof v === "number" ? Math.round(v * 10) / 10 : v);
(async () => {
  const argv = process.argv.slice(2), only = (process.env.ONLY || "").split(",").filter(Boolean), on = n => !only.length || only.includes(n);
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine);
  async function page(w, h, o, late) {
    const ctx = await L.context(b, engine, w, h, { seed: SEED, dark: true, now: NOW, standalone: !!o.app });
    const css = (o.safe ? `:root{--safe-t:${o.safe[0]}px !important;--safe-r:${o.safe[1]}px !important;--safe-b:${o.safe[2]}px !important}` : "") + (o.big ? "html{font-size:200%!important}" : "");
    /* init scripts can run before <html> exists: wait for it (synchronously, before any page script runs) */
    if (css) await ctx.addInitScript(c => { const go = () => { const s = document.createElement("style"); s.textContent = c; document.documentElement.appendChild(s); };
      if (document.documentElement) go(); else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); go(); } }); mo.observe(document, { childList: true }); } }, css);
    if (late) await ctx.addInitScript(() => { let fake = true;
      Object.defineProperty(window, "innerWidth", { get: () => fake ? 466 : document.documentElement.clientWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { get: () => fake ? 678 : (window.visualViewport ? Math.round(visualViewport.height) : document.documentElement.clientHeight), configurable: true });
      setTimeout(() => { fake = false; }, 300); });
    /* every layout change, from the start (a record of the modes the home went through) */
    await ctx.addInitScript(() => { window.__cls = [];
      new MutationObserver(() => { const h = document.documentElement; if (!h) return; const m = h.classList.contains("L-innerp") ? "innerp" : h.classList.contains("L-duo") ? "duo" : "phone"; if (window.__cls[window.__cls.length - 1] !== m) window.__cls.push(m); })
        .observe(document, { attributes: true, subtree: true, childList: true, attributeFilter: ["class"] }); });
    const p = await ctx.newPage(), W = L.watch(p); await p.goto(url); await p.waitForTimeout(3000);
    return { ctx, p, W };
  }
  const probe = (p, safeT) => p.evaluate(([safeT, SHORT]) => {
    const q = s => document.querySelector(s), vis = e => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
    const h = document.documentElement, card = q("#today"), cr = card.getBoundingClientRect(), un = q("#upNext");
    /* the Skip on screen (at 200% text it sits at the card's foot; the top one is display:none there) */
    const skip = Array.from(card.querySelectorAll("button")).find(x => /^\s*(Skip|Skipped|Unskip)\b/i.test(x.textContent) && x.getBoundingClientRect().height > 0);
    const sk = skip ? skip.getBoundingClientRect() : null;
    const title = (card.querySelector("h2, .day-title, .today-title") || {}).textContent || card.textContent;
    const shownDay = SHORT.find(d => new RegExp("\\b" + d + "\\b").test(title)) || "";
    const upKick = vis(un) ? ((un.querySelector(".un-kick") || {}).textContent || "") : "";
    const upDay = upKick && !/Next week/i.test(upKick) ? (SHORT.find(d => new RegExp("\\b" + d + "\\b").test(upKick)) || "") : "";
    const kick = ((card.querySelector(".kicker, .today-top") || {}).textContent || "").replace(/\s+/g, " ").trim();
    return { mode: h.classList.contains("L-innerp") ? "innerp" : h.classList.contains("L-duo") ? "duo" : "phone", sy: Math.round(scrollY), kick, shownDay,
      up: vis(un) || Array.from(document.querySelectorAll('.up-next, [aria-label^="Up next"]')).some(vis), upKick, gap: (a => a && q("#weekStrip") ? a.top - q("#weekStrip").getBoundingClientRect().bottom : null)(vis(q("#openPlan")) ? q("#openPlan").getBoundingClientRect() : null), upDay, cardTop: cr.top, topLim: parseFloat(getComputedStyle(h).scrollPaddingTop) || 0, skipTop: sk ? sk.top : null, safeT };
  }, [safeT, SHORT]);
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.waitFor({ state: "visible", timeout: 5000 }); const r = await l.boundingBox();
    await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(600); };
  const scrollOk = g => g.cardTop >= g.topLim - 0.5 && g.skipTop != null && g.skipTop >= g.safeT - 0.5;
  for (const [sz, w, h, o] of SIZES) {
    const safeT = o.safe ? o.safe[0] : 0;
    /* the clean launch's layout and normal home, for comparison */
    let clean = null;
    for (const late of [false, true]) {
      const tag = sz + (late ? " late-viewport launch" : " clean launch");
      if (!on(late ? "late" : "clean")) continue;
      const { ctx, p, W } = await page(w, h, o, late);
      const g0 = await probe(p, safeT);
      if (!late) { clean = g0; rec(tag, "(v0.1.4.3) the normal Today home is inner portrait and shows no Up next", g0.mode === "innerp" && !g0.up, J(g0));
        rec(tag, "(v0.1.4.3) no gap where Up next was: Week and progress starts within 16px under the strip", g0.gap != null && g0.gap >= -0.5 && g0.gap <= 16.5, J({ gap: g0.gap })); }
      else if (clean) rec(tag, "(A) the home settles on the clean launch's layout (no Week and progress needed to fix it)", g0.mode === clean.mode && g0.up === clean.up, J({ late: [g0.mode, g0.up], clean: [clean.mode, clean.up] }));
      await p.evaluate(m => { window.__cls = [m]; }, g0.mode);
      /* the owner's flow */
      try { await tap(p, "#openPlan"); await p.waitForTimeout(400); await tap(p, '#spine [data-week="5"]'); await p.waitForTimeout(600); }
      catch (e) { const st = await probe(p, safeT).catch(() => ({}));
        rec(tag, "(A) the owner's flow runs: Week and progress opens and week 5 can be picked on its spine", false, (e.message || String(e)).split("\n")[0] + " " + J(st) + " flips " + J(await p.evaluate(() => window.__cls).catch(() => null)));
        if (st.topLim != null) rec(tag, "(B) where the flow stopped: the card's top at or below the top limit, Skip below the safe top", scrollOk(st), J({ cardTop: st.cardTop, topLim: st.topLim, skip: st.skipTop, safeT, sy: st.sy }));
        await ctx.close(); continue; }
      if (await p.locator("#closePlan").isVisible().catch(() => false)) { const r = await p.locator("#closePlan").boundingBox(); if (r && r.y >= 0 && r.y < h) await tap(p, "#closePlan"); }
      await p.waitForTimeout(1500);
      const g1 = await probe(p, safeT), flips = await p.evaluate(() => window.__cls.slice());
      rec(tag, "(A) the layout does not change during the flow", flips.length === 1 && g1.mode === g0.mode, J({ flips, before: g0.mode, after: g1.mode }));
      rec(tag, "(A) after browsing to week 5 and leaving Week and progress: no Up next", /W5\b/.test(g1.kick) && !g1.up, J({ kick: g1.kick, up: g1.upKick }));
      rec(tag, "(A) Up next never names the day the card shows", !g1.upDay || g1.upDay !== g1.shownDay, J([g1.shownDay, g1.upKick]));
      rec(tag, "(B) after leaving: the card's top at or below the top limit, Skip below the safe top", scrollOk(g1), J({ cardTop: g1.cardTop, topLim: g1.topLim, skip: g1.skipTop, safeT, sy: g1.sy }));
      /* back to the home, then pick each day on the strip */
      if (late) { rec(tag, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); continue; }
      const bad = [];
      for (const d of [1, 3, 4, 0]) {
        const sel = `#weekStrip [data-strip="${d}"]`;
        if (!(await p.locator(sel).count())) { bad.push("no strip day " + d); continue; }
        await tap(p, sel); await p.waitForTimeout(500);
        const g = await probe(p, safeT);
        if (g.up) bad.push(`day ${d}: Up next shown (${g.upKick})`);
        if (g.upDay && g.upDay === g.shownDay) bad.push(`day ${d}: Up next for the shown day`);
        if (!scrollOk(g)) bad.push(`day ${d}: card top ${Math.round(g.cardTop)} lim ${g.topLim} skip ${g.skipTop && Math.round(g.skipTop)} sy ${g.sy}`);
      }
      rec(tag, "(A)(B) a day picked on the strip (Thu, Sat, Fri, Mon of the browsed week): no Up next, the card's top at or below the top limit, Skip below the safe top", bad.length === 0, bad.join("; "));
      rec(tag, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
      /* the current week: pick Thu, then today (Mon) on the strip. In v0.1.4.2 Up next returned here and the page grew; the end is kept in view only as far as the top limit (at 669x951 and 720x951 in a tab the whole
         end gap put the card's top 22px above it) */
      { const { ctx, p, W } = await page(w, h, o, false); const bad2 = []; let gm = null;
        for (const d of [3, 0]) { await tap(p, `#weekStrip [data-strip="${d}"]`); await p.waitForTimeout(500); const g = await probe(p, safeT); gm = g;
          if (d === 3 && g.up) bad2.push("Thu: Up next shown (" + g.upKick + ")");
          if (g.upDay && g.upDay === g.shownDay) bad2.push(`day ${d}: Up next for the shown day`);
          if (!scrollOk(g)) bad2.push(`day ${d}: card top ${Math.round(g.cardTop)} lim ${g.topLim} skip ${g.skipTop && Math.round(g.skipTop)} sy ${g.sy}`); }
        rec(sz + " clean launch", "(A)(B) the current week, Thu then today (Mon) picked on the strip: no Up next on Thu, the card's top at or below the top limit and Skip below the safe top after each pick", bad2.length === 0, bad2.join("; "));
        rec(sz + " clean launch", "(v0.1.4.3) back on today: still no Up next, as on the normal home", !!gm && !gm.up && !clean.up, J({ up: gm && gm.upKick, normal: clean.upKick }));
        rec(sz + " clean launch", "no errors (current week picks)", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
    }
  }
  await b.close(); T.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
