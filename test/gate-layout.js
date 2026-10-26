/* Layout and real-tap gate, forked from the v0.5.5 tap gate. Sample (b) seeded at Week 5, clock pinned to Fri Oct 23.
   Usage: node gate-layout.js <webkit|chromium> [url]. Exit 1 on any failure. */
const L = require("./lib");
/* v0.1.3.3: below 820px wide everything uses the cover pattern; the cover screen in landscape is the Counter (gate-v0133.js) */
const SIZES = [[390, 844], [430, 932], [382, 644], [669, 835], [951, 669], [475, 669], [334, 835]];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SEED = L.seedFor("b-4day-upper-lower", { seen: ["seed"], done: { "w4-upperA": "done", "w4-lowerA": "done", "w5-upperA": "done" },
  lifts: [{ id: "l1", liftId: "back-squat", lift: "Back squat", weight: "225", wu: "lb", reps: "5", date: "2026-10-20" }],
  body: [{ id: "b1", date: "2026-10-19", weight: "180", wu: "lb", waist: "34", lu: "in" }] });
const { rows, rec, fails } = L.makeRec(); let transient = 0;
const NAV = () => {
  const ih = innerHeight, sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0;
  const g = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
  window.scrollTo(0, 0); const at0 = { strip: g("weekStrip"), plan: g("openPlan"), done: g("todayDone") };
  window.scrollTo(0, 1e6); const st = g("weekStrip"), bk = g("backToday"), pl = g("openPlan");
  const zone = ih - 50 - sb;
  const row = bk && Math.abs(bk.top - pl.top) < 1 && bk.right <= pl.left + 0.5;
  const order = bk ? (st.bottom <= bk.top + 0.5 && (row || bk.bottom <= pl.top + 0.5)) : st.bottom <= pl.top + 0.5;
  const clear = pl.top >= 0 && pl.bottom <= zone + 0.5 && (!bk || (bk.top >= 0 && bk.bottom <= zone + 0.5));
  // v0.1.3.2: the group no longer pins over the card, so at scroll 0 it follows the card's end in the flow
  const follows = !!at0.done && at0.strip.top >= at0.done.bottom - 0.5 && getComputedStyle(document.getElementById("navGroup")).position !== "sticky";
  window.scrollTo(0, 0);
  return { order, clear, follows, zone, pl: Math.round(pl.bottom), bk: bk && Math.round(bk.bottom), at0: Math.round(at0.plan.bottom), done0: at0.done && Math.round(at0.done.bottom), strip0: Math.round(at0.strip.top) };
};
(async () => {
  const T = await L.target(process.argv.slice(2)); const engine = T.engine;
  const b = await L.launch(engine);
  for (const [w, h] of SIZES) {
    const size = `${w}x${h}`;
    const ctx = await L.context(b, engine, w, h, { seed: SEED });
    const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(350);
    const ls = k => L.ls(p, k);
    async function tap(sel, name, { minSize = 44 } = {}) {
      const loc = p.locator(sel).first();
      if (!(await loc.count()) || !(await loc.isVisible())) { rec(size, name, false, "not visible: " + sel); return false; }
      try { await loc.scrollIntoViewIfNeeded({ timeout: 8000 }); } catch (e) { rec(size, name, false, "scrollIntoView did not settle: " + sel); return false; }
      await p.waitForTimeout(60);
      const bb = await loc.boundingBox();
      const hit = await loc.evaluate((el, pt) => { const t = document.elementFromPoint(pt[0], pt[1]); return t === el || el.contains(t) ? "ok" : (t ? (t.id || t.className || t.tagName) : "none"); }, [bb.x + bb.width / 2, bb.y + bb.height / 2]);
      if (hit !== "ok" && /toast/i.test(hit)) { await p.waitForSelector("#toast:not(.show)", { timeout: 11000 }).catch(() => {}); transient++; return tap(sel, name, { minSize }); }
      if (hit !== "ok") { rec(size, name, false, "overlay at tap point: " + hit); return false; }
      if (bb.width < minSize - 0.5 || bb.height < minSize - 0.5) rec(size, name + " size >= 44", false, `${Math.round(bb.width)}x${Math.round(bb.height)}`);
      await loc.tap(); await p.waitForTimeout(120); return true;
    }
    const outer = w < 820; /* v0.1.3.3: was w < 600 */
    const sheetOpen = () => p.evaluate(() => document.getElementById("app").classList.contains("sheet-open"));
    rec(size, "seeded plan opens the app, not the empty state", await p.isVisible("#app") && !(await p.isVisible("#emptyState")));
    rec(size, "no dialog on a normal open", !(await p.isVisible("#dlg")));
    rec(size, "header names the plan and week", /Upper lower, 12 weeks/.test(await p.textContent("#header")) && /WEEK\s*5/i.test(await p.textContent("#header")));
    // every visible button and input is at least 44px (spine pills, strip, toggles, More)
    const small = await p.evaluate(() => [...document.querySelectorAll("#app button, #app select, #app input")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== "hidden" && (r.width < 43.5 || r.height < 43.5); }).map(e => (e.id || e.className || e.tagName) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)));
    rec(size, "every visible control >= 44px", small.length === 0, small.slice(0, 6).join(", "));
    if (w === 334) {
      const sc = await p.evaluate(() => { const cells = [...document.querySelectorAll(".wstrip .wd")].map(e => e.getBoundingClientRect()); let minW = 1e9, minGap = 1e9;
        cells.forEach((a, i) => { minW = Math.min(minW, a.width, a.height); cells.forEach((b, j) => { if (i >= j) return; const dx = Math.max(0, b.left - a.right, a.left - b.right), dy = Math.max(0, b.top - a.bottom, a.top - b.bottom); minGap = Math.min(minGap, Math.max(dx, dy)); }); });
        return { minW: +minW.toFixed(1), minGap: +minGap.toFixed(1), inside: cells.every(c => c.left >= 0 && c.right <= innerWidth) }; });
      rec(size, "334 strip: every day cell >= 44px, >= 8px spacing, all on screen", sc.minW >= 44 && sc.minGap >= 8 && sc.inside, JSON.stringify(sc));
    }
    for (let i = 0; i < 7; i++) {
      if (await tap(`[data-strip="${i}"]`, `strip day ${DAYS[i]}`)) {
        const t = await p.evaluate(() => { const c = document.getElementById("today"); const r = c.getBoundingClientRect(); return { h2: c.querySelector("h2").textContent, vis: r.bottom > 0 && r.top < innerHeight }; });
        const want = [2, 5, 6].includes(i) ? "Rest" : DAYS[i];
        rec(size, `strip day ${DAYS[i]} shows that day`, t.vis && t.h2.startsWith(want), t.h2);
      }
    }
    /* v0.1.3: two panes have one Back to today, in the card header (#backInline); the cover pattern keeps it under the strip (v0.1.3.3: inner portrait too) */
    const BACK = w >= 820 ? "#backInline" : "#backToday";
    if (await tap(BACK, "Back to today")) rec(size, "Back to today returns", (await p.textContent("#today h2")).startsWith("Fri") && !(await p.locator(BACK).count()));
    if (w >= 820) rec(size, "two panes: no Showing bar under the strip (v0.1.3)", await p.evaluate(() => getComputedStyle(document.getElementById("outerNav")).display === "none"));
    const key = "w5-lowerB", st = async () => (await ls("done"))[key];
    if (await tap("#todayDone", "Mark day done")) rec(size, "Done marks day", (await st()) === "done");
    if (await tap("#todayDone", "Done tap 1 (arm)")) rec(size, "one tap does not clear", (await st()) === "done" && await p.locator("#todayDone.is-armed").count() === 1);
    await p.waitForTimeout(3300);
    rec(size, "arming expires, day stays done", (await st()) === "done" && await p.locator("#todayDone.is-armed").count() === 0);
    await tap("#todayDone", "Done tap 1 again");
    if (await tap("#todayDone", "Done tap 2 (clear)")) rec(size, "two taps clear", (await st()) === undefined);
    if (await tap("#toastUndo", "Undo clear")) rec(size, "Undo restores done", (await st()) === "done");
    await tap("#todayDone", "arm"); await tap("#todayDone", "clear"); await p.waitForTimeout(100);
    if (await tap("[data-skip]:visible", "Skip")) { rec(size, "Skip marks skip", (await st()) === "skip"); if (await tap("#toastUndo", "Undo skip")) rec(size, "Undo restores", (await st()) === undefined); }
    if (outer) {
      const r = await p.evaluate(() => ({ planHidden: getComputedStyle(document.getElementById("planPane")).visibility === "hidden", docH: document.documentElement.scrollHeight, ih: innerHeight }));
      rec(size, "plan hidden until opened", r.planHidden);
      for (const view of ["today", "other day"]) {
        if (view === "other day") await tap('[data-strip="2"]', "strip Wed for nav");
        await p.waitForTimeout(150);
        const n = await p.evaluate(NAV);
        rec(size, `nav order ${view}: strip, ${view === "today" ? "" : "Back to today, "}Week and progress`, n.order && (view === "today" ? n.bk === null : n.bk !== null), JSON.stringify(n));
        rec(size, `nav ${view}: clear of the 50px toolbar zone at scroll end`, n.clear, JSON.stringify(n));
        if (view === "today") rec(size, "today: strip and Week and progress follow Mark day done in the flow at scroll 0, never pinned over the card", n.follows, `done bottom ${n.done0}, strip top ${n.strip0}`);
        if (view === "other day") await tap("#backToday", "Back to today after nav check");
      }
      if (await tap("#openPlan", "Open plan sheet")) { await p.waitForTimeout(320); rec(size, "sheet opens", await sheetOpen() && (await p.getAttribute("#openPlan", "aria-expanded")) === "true"); }
    }
    if (await tap('.spine-pill[data-week="3"]', "week grid W3")) rec(size, "week grid selects W3", (await ls("week")) === 3);
    if (await tap('.spine-pill[data-week="5"]', "week grid W5")) rec(size, "week grid selects W5", (await ls("week")) === 5);
    if (await tap('.tab[data-tab="progress"]', "Progress tab")) rec(size, "Progress tab", (await ls("tab")) === "progress");
    if (await tap('.tab[data-tab="train"]', "Train tab")) rec(size, "Train tab", (await ls("tab")) === "train");
    const od0 = !!(await ls("openDays"))["w5-lowerA"];
    if (await tap('[data-toggle="1"]', "day row Tue")) rec(size, "day row toggles open", !!(await ls("openDays"))["w5-lowerA"] === !od0 && (await p.getAttribute('[data-toggle="1"]', "aria-expanded")) === String(!od0));
    const odF = (await p.getAttribute('[data-toggle="4"]', "aria-expanded")) === "true";
    if (await tap('[data-toggle="4"]', "day row Fri (today)")) rec(size, "today's day row toggles too", (await ls("openDays"))["w5-lowerB"] === !odF && (await p.getAttribute('[data-toggle="4"]', "aria-expanded")) === String(!odF));
    const d0 = (await ls("done"))["w5-upperB"];
    if (await tap('[data-check="3"]', "day status Thu")) { const d1 = (await ls("done"))["w5-upperB"]; rec(size, "day status cycles", d1 !== d0, `${d0} -> ${d1}`); await tap('[data-check="3"]', "day status Thu 2"); await tap('[data-check="3"]', "day status Thu 3"); }
    // More: Update plan, Export, Import with confirm and Undo
    rec(size, "Export and Import hidden until More", !(await p.locator("#btnImport").isVisible()) && !(await p.locator("#btnExport").isVisible()));
    if (await tap("#btnMore", "More")) rec(size, "More shows Update plan, Export, Import and the replace note", await p.locator("#btnImport").isVisible() && await p.locator("#btnExport").isVisible() && await p.locator("#btnUpdate").isVisible() && /Import replaces all logged data/.test(await p.textContent("#moreRow")));
    try { const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 9000 }), tap("#btnExport", "Export")]); rec(size, "Export downloads workout-tracker-2026-10-23.json", dl.suggestedFilename() === "workout-tracker-2026-10-23.json", dl.suggestedFilename()); } catch (e) { rec(size, "Export downloads", false, e.message.split("\n")[0]); }
    const imp = L.seedFor("b-4day-upper-lower", { week: 2, done: { "w2-upperA": "done" }, lifts: [{ id: "z9", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-20" }] });
    const file = { name: "gate-import.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, version: "x", exportedAt: "2026-10-20T00:00:00Z", data: imp })) };
    const before = await L.dump(p);
    const pick = async n => { try { const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 9000 }), tap("#btnImport", n)]); await fc.setFiles(file); await p.waitForSelector('#dlg[data-kind="import"]:not([hidden])', { timeout: 3000 }); return true; } catch (e) { rec(size, n + " opens picker and confirm", false, e.message.split("\n")[0]); return false; } };
    if (await pick("Import")) {
      rec(size, "Import needs confirm: nothing replaced on file pick", (await L.dump(p)) === before && /gate-import\.json/.test(await p.textContent("#dlgTitle")));
      if (await tap("#icCancel", "Import Cancel")) rec(size, "Cancel keeps all data", (await L.dump(p)) === before && await p.locator("#dlg").isHidden());
    }
    if (await pick("Import again")) {
      const cg = await p.evaluate(() => { const sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0, zone = innerHeight - 50 - sb; const c = document.getElementById("dlg").getBoundingClientRect(); const bs = ["icCancel", "icReplace"].map(id => document.getElementById(id).getBoundingClientRect());
        const rp = getComputedStyle(document.getElementById("icReplace")); const bg = rp.backgroundColor;
        return { top: Math.round(c.top), bottom: Math.round(c.bottom), zone, btnBottom: Math.round(Math.max(...bs.map(b => b.bottom))), btnTop: Math.round(Math.min(...bs.map(b => b.top))), minH: Math.round(Math.min(...bs.map(b => b.height))), undoLine: /You can undo this for 10 seconds\./.test(document.getElementById("dlg").textContent), outlined: (bg === "transparent" || /rgba\(0, 0, 0, 0\)/.test(bg)) && parseFloat(rp.borderTopWidth) >= 1 }; });
      /* v0.1.3.3: below 820px the confirm attaches to Import (just above or below it, 8px away, or filling the room), never above the top clear zone */
      const ia = await p.evaluate(() => { const d = document.getElementById("dlg"), b = document.getElementById("btnImport").getBoundingClientRect(), r = d.getBoundingClientRect(), tb = parseFloat(getComputedStyle(document.getElementById("clearProbe")).top) || 0; return { at: d.dataset.at || "", gap: Math.round(Math.min(Math.abs(b.top - r.bottom), Math.abs(r.top - b.bottom))), top: Math.round(r.top), clear: Math.round(document.getElementById("clearProbe").getBoundingClientRect().top), w: Math.round(r.width), W: innerWidth }; });
      const near = w >= 820 ? cg.top <= 90 : (ia.top >= ia.clear - 0.5 && ia.w <= ia.W - 32 + 0.5 && ((["above", "below"].includes(ia.at) && ia.gap <= 16) || ia.at === "clamped"));
      rec(size, `Import confirm ${w >= 820 ? "near the top" : "attached to Import"}, buttons >= 44px and clear of the toolbar zone`, near && cg.btnTop >= 0 && cg.btnBottom <= cg.zone + 0.5 && cg.minH >= 44, JSON.stringify(Object.assign(cg, ia)));
      rec(size, "Import confirm says it can be undone for 10 seconds; Replace is outlined", cg.undoLine && cg.outlined, JSON.stringify(cg));
      if (w >= 820) { const r = await p.locator("#dlg").boundingBox(); rec(size, "Import confirm opens in the pane of the Import button (right), off the hinge", r.x >= w / 2 + 15 && r.x + r.width <= w, JSON.stringify(r)); }
      if (await tap("#icReplace", "Replace all data")) {
        rec(size, "Replace imports", (await ls("week")) === 2 && (await ls("lifts"))[0].id === "z9");
        await p.waitForSelector("#toast.show", { timeout: 2000 }).catch(() => {});
        const t = await p.evaluate(() => { const sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0; const r = document.getElementById("toast").getBoundingClientRect(), u = document.getElementById("toastUndo").getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), zone: innerHeight - 50 - sb, undo: [Math.round(u.width), Math.round(u.height)], right: Math.round(r.right) }; });
        /* v0.1.3: at 820px and up (two panes, no bottom browser toolbar) the strip and Undo row pin flush with the pane bottom; the 50px toolbar zone applies below 820px */
        rec(size, "Undo toast clears the toolbar zone (below 820px) or the bottom edge and safe area (820px and up), Undo >= 44px", t.top >= 0 && t.bottom <= (w >= 820 ? t.zone + 50 - 8 : t.zone) + 0.5 && t.undo[0] >= 44 && t.undo[1] >= 44 && (w < 820 || t.right <= w / 2 + 0.5), JSON.stringify(t));
        await p.locator("#toastUndo").tap(); await p.waitForTimeout(200);
        rec(size, "Undo restores every ct1- key byte for byte", (await L.dump(p)) === before);
      }
    }
    if (outer) {
      const r = await p.evaluate(() => { const pl = document.getElementById("planPane"); pl.scrollTop = 1e5; const b = document.getElementById("moreRow").getBoundingClientRect(); return { bottom: Math.round(b.bottom), ih: innerHeight }; });
      rec(size, "sheet: More row clears the toolbar zone at scroll end", r.bottom <= r.ih - 50, JSON.stringify(r));
      if (await tap("#closePlan", "Close sheet")) { await p.waitForTimeout(320); rec(size, "Close closes sheet", !(await sheetOpen())); }
      await tap("#openPlan", "Open plan sheet again"); await p.waitForTimeout(320);
      const sb = await p.evaluate(() => document.getElementById("planPane").getBoundingClientRect().top);
      if (w / h >= 9 / 17) { /* v0.1.1: the outer cover screen gets a full-screen page, so there is no backdrop to tap */
        rec(size, "full-screen page: no backdrop strip above it", sb === 0, String(sb));
        await tap("#closePlan", "Close full-screen page"); await p.waitForTimeout(320);
      } else {
        await p.touchscreen.tap(Math.round(w / 2), Math.max(2, Math.round(sb / 2))); await p.waitForTimeout(320);
        rec(size, "backdrop tap closes sheet", !(await sheetOpen()));
      }
      await tap("#openPlan", "Open for Escape"); await p.waitForTimeout(320); await p.keyboard.press("Escape"); await p.waitForTimeout(320);
      rec(size, "Escape closes sheet", !(await sheetOpen()));
    }
    if (w >= 600 && w < 820) { /* v0.1.3.3: inner portrait uses the cover pattern (was: today, strip, grid, tabs, settings in one column) */
      const o = await p.evaluate(() => { scrollTo(0, 0); const t = s => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY); return { order: ["#today", "#weekStrip", "#openPlan", "#toastSlot"].map(t), planHidden: getComputedStyle(document.getElementById("planPane")).visibility === "hidden" }; });
      rec(size, "inner portrait, cover pattern: today, strip, Week and progress, Undo slot; plan behind Week and progress", o.order.every((v, i) => i === 0 || v > o.order[i - 1]) && o.planHidden, JSON.stringify(o));
    }
    if (w >= 820) {
      const r = await p.evaluate(() => {
        const Lp = document.getElementById("paneToday"), R = document.getElementById("planPane"); const lr = Lp.getBoundingClientRect(), rr = R.getBoundingClientRect();
        const docScroll = document.scrollingElement.scrollHeight - innerHeight; const lBefore = Lp.scrollTop; R.scrollTop = 1e5; const lTop = Lp.scrollTop - lBefore;
        const fr = document.querySelector(".io-row").getBoundingClientRect(); const footerIn = !!document.querySelector(".footer").closest("#planPane");
        R.scrollTop = 0; return { lRight: Math.round(lr.right), rLeft: Math.round(rr.left), lh: Math.round(lr.height), rh: Math.round(rr.height), rScrolls: R.scrollHeight > R.clientHeight, docScroll, lTop, footerIn, ioBottom: Math.round(fr.bottom), ih: innerHeight }; });
      rec(size, "two panes: nothing crosses the 40px fold gap", r.lRight <= w / 2 - 15 && r.rLeft >= w / 2 + 15, `${r.lRight} | ${r.rLeft}`);
      rec(size, "both panes fill the height", r.lh >= h - 1 && r.rh >= h - 1, `${r.lh}/${r.rh}`);
      rec(size, "page itself does not scroll", r.docScroll <= 0, String(r.docScroll));
      rec(size, "right pane scrolls on its own (the left pane does not move)", r.rScrolls && r.lTop === 0, JSON.stringify([r.rScrolls, r.lTop]));
      rec(size, "settings in right pane, above the toolbar zone", r.footerIn && r.ioBottom <= r.ih - 50, JSON.stringify(r));
    }
    rec(size, "no horizontal overflow", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    for (const big of [false, true]) {
      const tagT = big ? "200% text" : "100% text";
      if (big) { await p.addStyleTag({ content: "html{font-size:200%!important}" }); await p.waitForTimeout(250); }
      const clip = await p.evaluate(() => { const card = document.getElementById("today"); const cr = card.getBoundingClientRect(); const bad = [];
        [card, ...card.querySelectorAll("*")].forEach(e => { const cs = getComputedStyle(e); if ((cs.overflowY !== "visible" || cs.overflowX !== "visible") && e.scrollHeight > e.clientHeight + 1) bad.push((e.className || e.tagName) + " clipped"); });
        card.querySelectorAll(".set-row, .today-actions, .today-hero").forEach(e => { const r = e.getBoundingClientRect(); if (r.bottom > cr.bottom + 0.5 || r.top < cr.top - 0.5) bad.push(e.className + " outside card"); }); return bad; });
      rec(size, `${tagT}: no clipped row in today card`, clip.length === 0, clip.join(", "));
      const cover = await p.evaluate(async () => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; const max = sc.scrollHeight - sc.clientHeight; const bad = [];
        for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) { sc.scrollTop = Math.round(max * f); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const bar = document.querySelector(".today-actions").getBoundingClientRect();
          document.querySelectorAll("#today .set-row, #today h2, #today .sub, #weekStrip .wd, #openPlan, #header h1").forEach(e => { const r = e.getBoundingClientRect(); if (!r.height) return;
            const x0 = Math.max(r.left, bar.left), x1 = Math.min(r.right, bar.right), y0 = Math.max(r.top, bar.top, 0), y1 = Math.min(r.bottom, bar.bottom, innerHeight); if (x1 - x0 < 2 || y1 - y0 < 2) return;
            const t = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2); if (t && t.closest(".today-actions") && !e.contains(t)) bad.push(`${f}:${String(e.className || e.tagName).slice(0, 20)}`); }); }
        sc.scrollTop = 0; return bad; });
      rec(size, `${tagT}: no content under the Done bar at 6 scroll offsets`, cover.length === 0, cover.slice(0, 6).join(", "));
    }
    const keys = await p.evaluate(() => Object.keys(localStorage).sort());
    rec(size, "only ct1- data keys in localStorage", keys.every(k => k.startsWith("ct1-") && (k === "ct1-gate" || ["schema","plan","seen","week","startDate","done","openDays","lifts","body","tab","progView"].includes(k.slice(4)))), keys.join(",").replace(/^/, ""));
    rec(size, "no page or console errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  // ---- top buffer and safe areas: no content in the status bar zone; nothing important in the bottom 50px + safe area ----
  const CLEAR = t => Math.max(t, 50) + 12;
  const TOP = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))).then(() => {
    const vis = e => { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden") return false; const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0; };
    const first = root => { let m = 1e9, who = ""; for (const e of root.querySelectorAll("*")) { if (!vis(e)) continue; let a = e, skip = false; while (a && a !== root) { const c = getComputedStyle(a); if (c.display === "none" || c.position === "fixed") { skip = true; break; } a = a.parentElement; } if (skip) continue; const t = e.getBoundingClientRect().top; if (t < m) { m = t; who = e.id || String(e.className).split(" ")[0] || e.tagName; } } return { top: Math.round(m * 10) / 10, who }; };
    const wide = innerWidth >= 820, o = { wide, fixed: {} };
    if (wide) { for (const id of ["paneToday", "planPane"]) document.getElementById(id).scrollTop = 0; o.left = first(document.getElementById("paneToday")); o.right = first(document.getElementById("planPane")); }
    else { scrollTo(0, 0); o.page = first(document.getElementById(document.getElementById("app").hidden ? "emptyState" : "app")); }
    const full = matchMedia("(max-width:819px) and (min-aspect-ratio:9/17)").matches; o.full = full;
    for (const id of ["toast", "dlg", "planPane"]) { if (full && id === "planPane") continue; const e = document.getElementById(id); const c = getComputedStyle(e); if (c.position === "fixed" && c.top !== "auto") o.fixed[id] = parseFloat(c.top); }
    o.stickyTop = [...document.querySelectorAll("*")].filter(e => getComputedStyle(e).position === "sticky" && getComputedStyle(e).top !== "auto" && !e.closest("#planPane")).map(e => e.id || e.className);
    const sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0; o.zone = innerHeight - 50 - sb;
    return o;
  });
  for (const inset of [0, 47, 59]) for (const [w, h] of SIZES) for (const empty of [false, true]) {
    const cl = CLEAR(inset), size = `${w}x${h} top inset ${inset}`, nm = empty ? "empty state" : "W5 Fri";
    const ctx = await L.context(b, engine, w, h, { seed: empty ? { schema: 1 } : SEED });
    const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(T.url); await p.waitForTimeout(250);
    await p.addStyleTag({ content: `:root{--safe-t:${inset}px!important}` }); await p.waitForTimeout(100);
    const a = await p.evaluate(TOP);
    if (a.wide && !empty) { rec(size, `${nm}: left pane first content top >= ${cl}`, a.left.top >= cl - 0.5, JSON.stringify(a.left)); rec(size, `${nm}: right pane first content top >= ${cl}`, a.right.top >= cl - 0.5, JSON.stringify(a.right)); }
    else rec(size, `${nm}: first content top >= ${cl}`, (a.page || a.left).top >= cl - 0.5, JSON.stringify(a.page || a.left));
    rec(size, `${nm}: toast, dialog and sheet sit at or below ${cl}`, Object.values(a.fixed).every(v => v >= cl - 0.5), JSON.stringify(a.fixed));
    rec(size, `${nm}: no sticky element pinned to the top`, a.stickyTop.length === 0, JSON.stringify(a.stickyTop));
    if (empty) {
      // empty state: Use this plan and Import reachable, >= 44px, never in the bottom zone at scroll end
      const e = await p.evaluate(() => { scrollTo(0, 1e6); const sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b")) || 0, zone = innerHeight - 50 - sb; const r = ["esUse", "esImport"].map(id => document.getElementById(id).getBoundingClientRect()); const doc = document.scrollingElement; const out = { zone, btn: r.map(q => [Math.round(q.top), Math.round(q.bottom), Math.round(q.height)]), canScroll: doc.scrollHeight > innerHeight }; scrollTo(0, 0); return out; });
      rec(size, "empty state: Use this plan and Import >= 44px and above the bottom zone at scroll end", e.btn.every(q => q[2] >= 44 && q[1] <= e.zone + 0.5 && q[0] >= 0), JSON.stringify(e));
    } else if (w < 820) {
      const n = await p.evaluate(NAV);
      rec(size, `${nm}: nav clear of the bottom zone`, n.clear, JSON.stringify(n));
      await p.locator("#openPlan").tap(); await p.waitForTimeout(350);
      const sh = await p.evaluate(() => { const pl = document.getElementById("planPane"); pl.scrollTop = 400; return new Promise(r => requestAnimationFrame(() => r({ sheet: Math.round(pl.getBoundingClientRect().top), head: Math.round(document.querySelector("#planPane .sheet-title").getBoundingClientRect().top) }))); });
      if (a.full) rec(size, `${nm}: full-screen page fills the top edge, its title stays at or below ${cl} when scrolled`, sh.sheet === 0 && sh.head >= cl - 0.5, JSON.stringify(sh));
      else rec(size, `${nm}: open sheet and its head stay at or below ${cl} when scrolled`, sh.sheet >= cl - 0.5 && sh.head >= cl - 0.5, JSON.stringify(sh));
    }
    rec(size, `${nm}: no errors`, W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  for (const reduce of [false, true]) { // motion budget
    const ctx = await L.context(b, engine, 382, 644, { seed: SEED, reduce }); const p = await ctx.newPage(); await p.goto(T.url); await p.waitForTimeout(250);
    const m = await p.evaluate(() => { let max = 0; const bad = []; for (const e of document.querySelectorAll("*")) { const cs = getComputedStyle(e); const ds = (cs.transitionDuration + "," + cs.animationDuration).split(",").map(s => parseFloat(s) * (/ms/.test(s) ? 1 : 1000)); const d = Math.max(...ds.filter(x => !isNaN(x))); /* the Designer's reduced-motion fade on the full-screen page is the one allowed motion (opacity only) */ const fadeOk = e.id === "planPane" && matchMedia("(prefers-reduced-motion: reduce)").matches && cs.transitionProperty.split(",").every(x => /opacity|visibility/.test(x)); if (fadeOk) { if (d > 240) bad.push("planPane"); continue; } if (d > max) max = d; if (d > 240) bad.push(e.id || e.className); } return { max, bad: bad.slice(0, 4) }; });
    rec("382x644", `motion ${reduce ? "with reduced motion is 0" : "is 240ms or less"}`, reduce ? m.max === 0 : m.max <= 240, JSON.stringify(m));
    await ctx.close();
  }
  await b.close(); T.close();
  console.log(rows.join("\n"));
  console.log(`layout ${engine} ${fails() ? "FAILED " + fails() : "ALL PASS"} (${rows.length} checks, ${transient} waits for the toast)`);
  process.exit(fails() ? 1 : 0);
})().catch(e => { console.log(rows.join("\n")); console.error(e); process.exit(1); });
