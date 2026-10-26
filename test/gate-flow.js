/* Flow gate (v0.1.1, v0.1.2 adds the hinge, leftover X and contrast sections, v0.1.3 the clearance section): start date prompt, bad-link error, pinned fade, auto-advance, hyphen spacing, deload label.
   Usage: node gate-flow.js <webkit|chromium> [url]. Clock pinned to Fri Oct 23 2026, 12:00 CDT (week 5 of the seed start, Sep 21). */
const L = require("./lib");
const { rows, rec, fails } = L.makeRec();
const A = "a-3day-beginner-full-body", B = "b-4day-upper-lower", Cc = "c-5day-split-deload", D = "d-2day-home", E = "e-6day-ppl";
/* v0.1.3.3: below 820px wide is the cover pattern; the cover screen in landscape is the Counter (gate-v0133.js) */
const SIZES = [[390, 844], [430, 932], [382, 644], [669, 835], [951, 669], [475, 669], [334, 835]];
(async () => {
  const T = await L.target(process.argv.slice(2)); const engine = T.engine, url = T.url;
  const b = await L.launch(engine);
  async function page(opts = {}, w = 390, h = 844) { const ctx = await L.context(b, engine, w, h, opts); const p = await ctx.newPage(); const W = L.watch(p); return { ctx, p, W }; }
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 6000 }); await l.tap({ timeout: 6000 }); await p.waitForTimeout(150); };
  const safeTap = async (p, s) => { try { await tap(p, s); return true; } catch (e) { return false; } };
  const vis = (p, s) => p.locator(s).first().isVisible().catch(() => false);
  const dlgKind = p => p.evaluate(() => { const d = document.getElementById("dlg"); return d.hidden ? null : d.dataset.kind; });
  const txt = (p, s) => p.locator(s).first().textContent({ timeout: 2000 }).catch(() => "");
  const shownWeek = p => p.evaluate(() => { const m = /W(\d+)\s*of/.exec((document.querySelector("#today") || {}).textContent || ""); return m ? +m[1] : null; });
  const code = n => L.code(L.norm(L.readSample(n)));
  const boxOf = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom, ih: innerHeight }; }, s);

  // ---- 1. Start date prompt at every size: one filled primary, a visible selected quick pick, a quiet Not now ----
  for (const [w, h] of SIZES) {
    const size = `${w}x${h}`;
    const { ctx, p, W } = await page({}, w, h); await p.goto(url + "#p=" + code(B)); await p.waitForTimeout(500);
    const ok = (await dlgKind(p)) === "start"; rec(size, "prompt: link on a fresh device opens the start date prompt", ok);
    if (ok) {
      const look = () => p.evaluate(() => {
        const probe = document.createElement("i"); probe.style.background = "var(--ember)"; document.body.appendChild(probe);
        const accent = getComputedStyle(probe).backgroundColor; probe.remove();
        const btns = Array.from(document.querySelectorAll("#dlg button")).filter(b => b.getBoundingClientRect().width > 0);
        const filled = btns.filter(b => getComputedStyle(b).backgroundColor === accent).map(b => b.id);
        const qp = ["dlgNextMon", "dlgThisWk"].map(id => { const b = document.getElementById(id), cs = getComputedStyle(b); return { id, pressed: b.getAttribute("aria-pressed"), bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor }; });
        const later = getComputedStyle(document.getElementById("dlgLater"));
        const small = btns.filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(b => b.id || b.textContent);
        const r = document.getElementById("dlg").getBoundingClientRect();
        return { filled, qp, laterBg: later.backgroundColor, laterBorder: later.borderTopStyle === "none" || later.borderTopWidth === "0px", small, dlgBottom: r.bottom, ih: innerHeight, input: document.getElementById("dlgStart").value, note: (document.getElementById("dlgHsNote") || {}).textContent || "" };
      });
      let g = await look();
      rec(size, "prompt: Save start date is the one filled button", g.filled.length === 1 && g.filled[0] === "dlgSaveStart", JSON.stringify(g.filled));
      rec(size, "prompt: Not now is a quiet text button (no fill, no border)", /rgba\(0, 0, 0, 0\)|transparent/.test(g.laterBg) && g.laterBorder, g.laterBg);
      rec(size, "prompt: quick picks carry aria-pressed; the default date (next Monday) shows as selected", g.qp[0].pressed === "true" && g.qp[1].pressed === "false" && g.input === "2026-10-26", JSON.stringify(g.qp));
      rec(size, "prompt: the selected quick pick looks different from the other", g.qp[0].bg !== g.qp[1].bg && (g.qp[0].bw !== g.qp[1].bw || g.qp[0].bc !== g.qp[1].bc), JSON.stringify(g.qp));
      await safeTap(p, "#dlgThisWk"); g = await look();
      rec(size, "prompt: tapping This week selects it, sets Oct 19 and unselects Next Monday", g.qp[1].pressed === "true" && g.qp[0].pressed === "false" && g.input === "2026-10-19" && (await dlgKind(p)) === "start");
      await p.fill("#dlgStart", "2026-11-09"); await p.waitForTimeout(80); g = await look();
      rec(size, "prompt: another date in the field leaves no quick pick selected", g.qp.every(q => q.pressed === "false"));
      rec(size, "prompt: every control >= 44px; the prompt ends above the bottom zone", g.small.length === 0 && g.dlgBottom <= g.ih - 50, JSON.stringify([g.small, g.dlgBottom, g.ih]));
      rec(size, "prompt: Home Screen line for a link reads exactly: Adding this page to your Home Screen later starts fresh. Add it first, then set your date there.", g.note.trim() === "Adding this page to your Home Screen later starts fresh. Add it first, then set your date there.", g.note);
      await safeTap(p, "#dlgThisWk"); await safeTap(p, "#dlgSaveStart");
      rec(size, "prompt: Save start date stores the date and closes", (await L.ls(p, "startDate")) === "2026-10-19" && (await dlgKind(p)) === null);
    }
    rec(size, "prompt: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  { const { ctx, p, W } = await page({ standalone: true }); await p.goto(url + "#p=" + code(B)); await p.waitForTimeout(500);
    rec("prompt", "Home Screen app: no Home Screen line", (await dlgKind(p)) === "start" && !(await vis(p, "#dlgHsNote")));
    await ctx.close(); }
  { const { ctx, p, W } = await page(); await p.goto(url); await p.waitForTimeout(300); await p.fill("#esCode", code(A)); await safeTap(p, "#esUse"); await p.waitForTimeout(200);
    rec("prompt", "pasted plan (no link): the line says the Home Screen app starts with no plan", /starts fresh, with no plan/.test(await txt(p, "#dlgHsNote")), await txt(p, "#dlgHsNote"));
    await ctx.close(); }

  // ---- 2. Bad link: plain headline, details closed with Copy ----
  const badTag = (() => { const x = L.readSample(B); x.blocks["1"].upperA[1].tags = ["forearm"]; return L.code(x); })();
  for (const [w, h] of [[390, 844], [382, 644], [951, 669], [334, 835]]) {
    const size = `${w}x${h}`;
    const { ctx, p, W } = await page({ seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) }, w, h); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p);
    await p.goto(url + "#p=" + badTag); await p.waitForTimeout(500);
    const t = (await txt(p, "#dlgTitle")).trim(), all = await txt(p, "#dlg");
    rec(size, "error: headline is This plan link didn\u2019t work", (await dlgKind(p)) === "error" && /^This plan link didn.t work$/.test(t), t);
    rec(size, "error: keeps The tracker could not use it. and Nothing on this device was changed.", /The tracker could not use it\./.test(all) && /Nothing on this device was changed\./.test(all));
    const closed = await p.evaluate(() => { const d = document.querySelector("#dlg details.err-more"); return d ? { open: d.open, sum: (d.querySelector("summary") || {}).textContent } : null; });
    rec(size, "error: Details for your coach is present and closed by default", !!closed && closed.open === false && /^Details for your coach$/.test((closed.sum || "").trim()), JSON.stringify(closed));
    rec(size, "error: the technical line is hidden until opened", !(await p.locator("#dlg .err-text").isVisible().catch(() => false)) && !(await p.locator("#dlg li").first().isVisible().catch(() => false)));
    const sb = await boxOf(p, "#dlg summary"); rec(size, "error: the disclosure is a 44px target", !!sb && sb.h >= 44, JSON.stringify(sb));
    await safeTap(p, "#dlg summary");
    rec(size, "error: opened, the details name the problem", (await vis(p, "#dlg .err-text")) && /blocks\.1\.upperA\[1\].*forearm/.test(await txt(p, "#dlg .err-text")));
    const cb = await boxOf(p, "#dlg .err-copy"); rec(size, "error: Copy is present, >= 44px, above the bottom zone", !!cb && cb.h >= 44 && cb.w >= 44 && cb.bottom <= cb.ih - 50, JSON.stringify(cb));
    await safeTap(p, "#dlg .err-copy"); await p.waitForTimeout(300);
    const st = (await txt(p, "#dlg .err-copied")).trim();
    rec(size, "error: Copy confirms (Copied, or Selected with the fallback)", /^Copied$|^Selected/.test(st), st);
    const ob = await boxOf(p, "#dlgOk"); rec(size, "error: OK stays >= 44px and above the bottom zone when opened", !!ob && ob.h >= 44 && ob.bottom <= ob.ih - 50, JSON.stringify(ob));
    await safeTap(p, "#dlgOk");
    rec(size, "error: nothing overwritten", (await L.dump(p)) === before);
    await p.goto(url + "#p=" + code(B).slice(0, 300)); await p.waitForTimeout(500);
    rec(size, "error: a cut-off link gets the same headline and a plain reason", /^This plan link didn.t work$/.test((await txt(p, "#dlgTitle")).trim()) && /cut off/.test(await txt(p, "#dlgBody")));
    rec(size, "error: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }

  // ---- 3. Pinned group: 12px page-background fade on its top edge, only while pinned; hairline only while pinned; no shadow, no motion ----
  for (const [w, h, s] of [[382, 644, B], [382, 644, E], [334, 835, E], [390, 844, E]]) {
    const size = `${w}x${h} ${s.slice(0, 1)}`;
    const { ctx, p, W } = await page({ seed: L.seedFor(s, { done: { "w4-upperA": "done" } }) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    const probe = () => p.evaluate(() => {
      const g = document.querySelector(".nav-group"); if (!g) return null;
      const cs = getComputedStyle(g), be = getComputedStyle(g, "::before");
      const probe = document.createElement("i"); probe.style.background = "var(--ink)"; document.body.appendChild(probe); const ink = getComputedStyle(probe).backgroundColor; probe.remove();
      return { sticky: g.classList.contains("is-sticky"), pinned: g.classList.contains("is-pinned"), before: be.content, bh: be.height, bimg: be.backgroundImage, bpe: be.pointerEvents,
        hair: /linear-gradient/.test(cs.backgroundImage), shadow: cs.boxShadow, tr: cs.transitionDuration, an: be.animationName, ink, bimgHasInk: be.backgroundImage.indexOf(ink) >= 0 };
    });
    let g = await probe();
    if (!g || !g.sticky) { rec(size, "fade: layout keeps the strip in flow here (not sticky), so no fade", !!g && g.before === "none" || (g && g.before === ""), JSON.stringify(g)); await ctx.close(); continue; }
    if (g.pinned) {
      rec(size, "fade: pinned at rest shows a 12px fade above the strip", g.before !== "none" && g.bh === "12px" && /linear-gradient/.test(g.bimg) && g.bimgHasInk && g.bpe === "none", JSON.stringify(g));
      rec(size, "fade: hairline while pinned, no shadow, no motion", g.hair && g.shadow === "none" && /^0s/.test(g.tr) && (g.an === "none" || g.an === ""), JSON.stringify(g));
    } else rec(size, "fade: not pinned at rest has no fade and no hairline", (g.before === "none" || g.before === "") && !g.hair, JSON.stringify(g));
    await p.evaluate(() => window.scrollTo(0, 1e6)); await p.waitForTimeout(250); g = await probe();
    rec(size, "fade: at the end of the page (not pinned) no fade and no hairline", !g.pinned && (g.before === "none" || g.before === "") && !g.hair, JSON.stringify(g));
    rec(size, "fade: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }

  // ---- 4. Auto-advance to the calendar week, with a safety net ----
  const AW = "advance";
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { week: 2 }) }); await p.goto(url); await p.waitForTimeout(400);
    rec(AW, "a stale stored week (2) opens on the calendar week from the start date (5)", (await shownWeek(p)) === 5, String(await shownWeek(p)));
    rec(AW, "week 4 untouched: the line says Week 4 has 4 sessions left", /^Week\s4 has 4\ssessions left\.$/.test((await txt(p, "#weekNote p")).trim()), await txt(p, "#weekNote"));
    await ctx.close(); }
  { const seed = L.seedFor(B, { week: 4, done: { "w4-upperA": "done", "w4-lowerA": "skip", "w2-upperA": "done" }, lifts: [{ id: "x1", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-12" }], body: [{ id: "b1", date: "2026-10-12", weight: "180", unit: "lb" }] });
    const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(400);
    rec(AW, "opens on week 5; one calm line under the header: Week 4 has 2 sessions left.", (await shownWeek(p)) === 5 && /^Week\s4 has 2\ssessions left\.$/.test((await txt(p, "#weekNote p")).trim()), await txt(p, "#weekNote"));
    const nb = await boxOf(p, "#stayWeek"), pb = await boxOf(p, "#pushBack");
    rec(AW, "Stay on week 4 and Push my plan back a week are >= 44px", !!nb && !!pb && nb.h >= 44 && pb.h >= 44 && /^Stay on week\s4$/.test((await txt(p, "#stayWeek")).trim()) && /^Push my plan back a week$/.test((await txt(p, "#pushBack")).trim()), JSON.stringify([nb, pb]));
    await safeTap(p, "#stayWeek");
    rec(AW, "Stay on week 4 shows week 4 and the line goes away", (await shownWeek(p)) === 4 && !(await vis(p, "#weekNote")));
    await p.reload(); await p.waitForTimeout(400);
    rec(AW, "the stay holds for the rest of the visit (reload)", (await shownWeek(p)) === 4);
    const p2 = await ctx.newPage(); await p2.goto(url); await p2.waitForTimeout(400);
    rec(AW, "a new visit (new tab) opens on the calendar week again", (await shownWeek(p2)) === 5); await p2.close();
    await ctx.close(); }
  { const seed = L.seedFor(B, { done: { "w4-upperA": "done", "w4-lowerA": "skip", "w3-lowerB": "done" }, lifts: [{ id: "x1", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-12" }], body: [{ id: "b1", date: "2026-10-12", weight: "180", unit: "lb" }] });
    const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(400);
    const before = JSON.parse(await L.dump(p)), get = (d, k) => (d.find(r => r[0] === "ct1-" + k) || [])[1];
    await safeTap(p, "#pushBack");
    rec(AW, "Push my plan back a week asks first and names the new start", (await dlgKind(p)) === "pushback" && /Sep\s28/.test(await txt(p, "#dlgBody")) && (await L.ls(p, "startDate")) === "2026-09-21", await txt(p, "#dlgBody"));
    await safeTap(p, "#dlgPushKeep");
    rec(AW, "Keep my dates changes nothing", (await L.ls(p, "startDate")) === "2026-09-21" && (await shownWeek(p)) === 5);
    await safeTap(p, "#pushBack"); await safeTap(p, "#dlgPushYes"); await p.waitForTimeout(150);
    const after = JSON.parse(await L.dump(p));
    rec(AW, "Push back moves the start date 7 days later and this week becomes week 4", (await L.ls(p, "startDate")) === "2026-09-28" && (await shownWeek(p)) === 4);
    rec(AW, "Push back keeps every log (done, lifts, weigh-ins)", ["done", "lifts", "body", "plan"].every(k => get(after, k) === get(before, k)));
    rec(AW, "Push back offers Undo, and Undo restores the start date", await (async () => { const u = await vis(p, "#toastUndo"); if (!u) return false; await safeTap(p, "#toastUndo"); await p.waitForTimeout(200); return (await L.ls(p, "startDate")) === "2026-09-21" && (await shownWeek(p)) === 5; })());
    rec(AW, "push back: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B) }); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#openPlan"); await p.waitForTimeout(320); await safeTap(p, '.spine-pill[data-week="7"]'); await p.waitForTimeout(200);
    await p.reload(); await p.waitForTimeout(400);
    rec(AW, "a week picked in the grid (7) holds for the visit", (await shownWeek(p)) === 7, String(await shownWeek(p)));
    await safeTap(p, "#openPlan"); await p.waitForTimeout(320); await safeTap(p, "#jumpThisWeek"); await p.reload(); await p.waitForTimeout(400);
    rec(AW, "This week goes back to the calendar week and clears the pick", (await shownWeek(p)) === 5);
    await ctx.close(); }
  { const done = {}; ["upperA", "lowerA", "upperB", "lowerB"].forEach((k, i) => done["w4-" + k] = i % 2 ? "skip" : "done");
    const { ctx, p } = await page({ seed: L.seedFor(B, { done }) }); await p.goto(url); await p.waitForTimeout(400);
    rec(AW, "no line when last week is closed", !(await vis(p, "#weekNote"))); await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { startDate: "2026-11-02", week: 3 }) }); await p.goto(url); await p.waitForTimeout(400);
    rec(AW, "before the start date: shows week 1 with a Starts Mon, Nov 2 note", (await shownWeek(p)) === 1 && /Starts Mon,\sNov\s2\./.test(await txt(p, '#weekNote [data-kind="before"]')), await txt(p, "#weekNote"));
    await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { startDate: "2026-07-06", week: 3 }) }); await p.goto(url); await p.waitForTimeout(400);
    const t = await txt(p, '#weekNote [data-kind="complete"]');
    rec(AW, "after the end: shows the last week (12) with a plan-complete note that says to tell the coach", (await shownWeek(p)) === 12 && /Plan complete/.test(t) && /coach/.test(t), t);
    rec(AW, "clamp: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
  { const { ctx, p } = await page({ seed: L.seedFor(B, { startDate: "2026-10-19", week: 1 }) }); await p.goto(url); await p.waitForTimeout(400);
    rec(AW, "week 1: no leftover line", (await shownWeek(p)) === 1 && !(await vis(p, "#weekNote"))); await ctx.close(); }

  // ---- 5. Hyphens: no space-padded hyphen, no widened hyphen glyph, in any sample or panel ----
  /* a hyphen is measured against the same font with default numerals; tabular figures widen it in WebKit */
  const hyph = p => p.evaluate(() => {
    const bad = [], padded = [], probe = document.createElement("span"); probe.textContent = "a-a"; probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-variant-numeric:normal;font-feature-settings:normal";
    document.body.appendChild(probe);
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) {
      const el = n.parentElement; if (!el || !n.data || /^(SCRIPT|STYLE|TEXTAREA)$/.test(el.tagName) || el === probe) continue;
      if (!el.getClientRects().length) continue;
      if (/[A-Za-z]\s-\s[A-Za-z]/.test(n.data)) padded.push(n.data.trim().slice(0, 60));
      const cs = getComputedStyle(el); if (/mono|Menlo|Consolas/i.test(cs.fontFamily.split(",")[0])) continue;
      const re = /[A-Za-z]-[A-Za-z]/g; let m;
      while ((m = re.exec(n.data))) {
        const r = document.createRange(); r.setStart(n, m.index + 1); r.setEnd(n, m.index + 2);
        const rect = r.getBoundingClientRect(); if (!rect.width) continue;
        probe.style.font = cs.font; probe.style.letterSpacing = cs.letterSpacing; probe.style.fontVariantNumeric = "normal";
        /* measure the probe the same way (a Range over its hyphen): WebKit snaps text range widths to whole pixels */
        const pr = document.createRange(); pr.setStart(probe.firstChild, 1); pr.setEnd(probe.firstChild, 2); const base = pr.getBoundingClientRect().width;
        /* WebKit snaps range widths to whole pixels, so 1px is noise; tabular figures add 2px or more */
        if (rect.width > base + 1.5 || /tabular/.test(cs.fontVariantNumeric)) bad.push(n.data.trim().slice(0, 40) + " (" + rect.width.toFixed(2) + "px vs " + base.toFixed(2) + "px, " + cs.fontVariantNumeric + ")");
      }
    }
    probe.remove();
    return { bad: Array.from(new Set(bad)).slice(0, 6), padded: Array.from(new Set(padded)).slice(0, 6) };
  });
  for (const s of [A, B, Cc, D, E]) for (const [w, h] of [[390, 844], [951, 669]]) {
    const size = `${w}x${h} ${s.slice(0, 1)}`;
    const { ctx, p, W } = await page({ seed: L.seedFor(s) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    if (w < 820) { await safeTap(p, "#openPlan"); await p.waitForTimeout(320); }
    await p.evaluate(() => { document.querySelectorAll("[data-toggle]").forEach(() => {}); const m = document.getElementById("moreRow"); if (m) m.hidden = false; const u = document.getElementById("updBox"); if (u) u.hidden = false; document.querySelectorAll("details").forEach(d => d.open = true); });
    const all = [];
    for (let wk = 1; wk <= 2; wk++) { const r = await hyph(p); all.push(r); if (wk === 1) { await safeTap(p, "#tabProgress"); await safeTap(p, '[data-tab="progress"]'); await p.waitForTimeout(150); } }
    const bad = Array.from(new Set(all.flatMap(r => r.bad))), padded = Array.from(new Set(all.flatMap(r => r.padded)));
    rec(size, "hyphens: no space-padded hyphen in rendered text", padded.length === 0, padded.join(" | "));
    rec(size, "hyphens: no widened hyphen glyph (same width as with default numerals)", bad.length === 0, bad.join(" | "));
    await ctx.close();
  }
  { const { ctx, p } = await page(); await p.goto(url); await p.waitForTimeout(300); const r = await hyph(p);
    rec("empty", "hyphens: empty state has no space-padded or widened hyphen", r.padded.length === 0 && r.bad.length === 0, JSON.stringify(r)); await ctx.close(); }

  // ---- 6. Deload week: the heading is not repeated in the body ----
  for (const [w, h] of [[390, 844], [951, 669], [382, 644]]) {
    const size = `${w}x${h} c`;
    const { ctx, p, W } = await page({ seed: L.seedFor(Cc) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    if (w < 820) { await safeTap(p, "#openPlan"); await p.waitForTimeout(320); }
    const r = await p.evaluate(() => Array.from(document.querySelectorAll(".banner")).filter(b => /deload week/i.test(b.textContent)).map(b => ({ title: (b.querySelector(".btitle") || {}).textContent || "", body: (b.querySelector(".bbody") || {}).textContent || "", n: (b.textContent.match(/deload week/gi) || []).length })));
    rec(size, "deload: week 5 shows the Deload week banner", r.length >= 1, JSON.stringify(r));
    rec(size, "deload: the body does not repeat Deload week", r.length >= 1 && r.every(x => x.n === 1 && !/^\s*deload/i.test(x.body)), JSON.stringify(r));
    rec(size, "deload: the coach's note is kept, starting with a capital", r.length >= 1 && r.every(x => /^Keep the weights, cut every exercise to two sets\.$/.test(x.body.trim())), JSON.stringify(r));
    await ctx.close();
  }


  const openMore = async (p, w) => { if (w < 820) { await safeTap(p, "#openPlan"); await p.waitForTimeout(320); } await safeTap(p, "#btnMore"); };

  // ---- 7. Undo toast: reserved space, never over a control or the strip; dismissal ----
  try {
  const probeToast = p => p.evaluate(() => {
    const t = document.getElementById("toast"), tr = t.getBoundingClientRect();
    const grp = document.getElementById("navGroup"), gr = grp.getBoundingClientRect();
    /* the scroller that holds the group: the left pane at 820px and up (v0.1.3: pinned there at rest), else the page */
    const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement;
    const remaining = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
    const hits = [];
    document.querySelectorAll("button, a, [role=button], .wd, input, textarea, select, summary").forEach(e => {
      if (t.contains(e)) return; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (getComputedStyle(e).visibility === "hidden" || e.closest("[hidden]")) return;
      const ix = Math.min(r.right, tr.right) - Math.max(r.left, tr.left), iy = Math.min(r.bottom, tr.bottom) - Math.max(r.top, tr.top);
      if (ix <= 1 || iy <= 1) return;
      /* content scrolled under the pinned group, the same rule as under the pinned strip: allowed only when the page can scroll it clear */
      if (document.getElementById("app").classList.contains("sheet-open") && !e.closest("#planPane")) return; /* beneath the open page */
      const under = grp.contains(t) && !grp.contains(e) && r.bottom - gr.top <= remaining + 1;
      if (!under) hits.push(e.id || e.getAttribute("aria-label") || e.className || e.tagName);
    });
    const cs = getComputedStyle(t);
    return { shown: t.classList.contains("show") && tr.height > 20 && cs.visibility !== "hidden", tr: [Math.round(tr.top), Math.round(tr.bottom)], hits, host: t.parentNode.id || t.parentNode.className,
      strip: Math.round(document.getElementById("weekStrip").getBoundingClientRect().top), stripB: Math.round(document.getElementById("weekStrip").getBoundingClientRect().bottom), grpH: Math.round(gr.height), pinned: grp.classList.contains("is-pinned"), sticky: grp.classList.contains("is-sticky"),
      x: (() => { const c = document.getElementById("toastClose"); if (!c) return [0, 0]; const r = c.getBoundingClientRect(); return [r.width, r.height]; })(), dur: cs.transitionDuration };
  });
  /* synthetic touch drag on the toast; WebKit has no Touch constructor, so plain events carry touch lists */
  const swipe = (p, dx, dy) => p.evaluate(([dx, dy]) => { const t = document.getElementById("toast"), r = t.getBoundingClientRect(), x = r.left + 60, y = r.top + 12;
    const fire = (type, px, py) => { const e = new Event(type, { bubbles: true, cancelable: true }); const pt = [{ identifier: 1, target: t, clientX: px, clientY: py, pageX: px, pageY: py }];
      Object.defineProperty(e, "touches", { value: type === "touchend" ? [] : pt }); Object.defineProperty(e, "changedTouches", { value: pt }); Object.defineProperty(e, "targetTouches", { value: type === "touchend" ? [] : pt }); t.dispatchEvent(e); };
    fire("touchstart", x, y); fire("touchmove", x + dx / 2, y + dy / 2); fire("touchmove", x + dx, y + dy); fire("touchend", x + dx, y + dy); return "ok"; }, [dx, dy]);
  const status = (p, k) => p.evaluate(k => (JSON.parse(localStorage.getItem("ct1-done") || "{}"))[k] || "", k);
  for (const [w, h] of SIZES) {
    const size = `${w}x${h}`;
    const { ctx, p, W } = await page({ seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    const pre = await probeToast(p), preCard = (await boxOf(p, "#today")).bottom;
    await safeTap(p, "#todaySkip"); await p.waitForTimeout(320);
    let g = await probeToast(p); const postCard = (await boxOf(p, "#today")).bottom;
    rec(size, "toast: Skip shows the Undo toast", g.shown, JSON.stringify(g));
    rec(size, "toast: covers no button, link or strip cell", g.shown && g.hits.length === 0, JSON.stringify(g.hits) + " host " + g.host);
    if (w < 820) { /* v0.1.3.3: was w < 600; inner portrait and cover landscape use the cover pattern */
      /* v0.1.3.1: its own slot below the Back to today and Week and progress row; the row stays; the group keeps its height */
      const rowB = (await boxOf(p, "#navRow")).bottom;
      rec(size, "toast: phones put it in its own slot below the row under the strip, group height the same within 1px", g.host === "toastSlot" && g.tr[0] >= rowB - 0.5 && Math.abs(g.grpH - pre.grpH) <= 1, JSON.stringify([pre.grpH, rowB, g]));
      rec(size, "toast: while it shows, Week and progress stays visible", await p.evaluate(() => getComputedStyle(document.getElementById("openPlan")).visibility === "visible"));
      /* v0.1.3.2: the strip follows the card in the flow, so a card that grows with its new status (Skipped) moves it;
         against the card's end it must not move */
      rec(size, "toast: the strip does not move against the card's end when it shows", Math.abs((g.strip - postCard) - (pre.strip - preCard)) <= 1, [pre.strip, preCard, g.strip, postCard].map(Math.round).join(" "));
    } else rec(size, "toast: two panes put it in the Undo slot directly below the strip (v0.1.3.1), the strip does not move against the card's end (v0.1.3.2)", g.host === "toastSlot" && g.tr[0] >= g.stripB - 0.5 && g.tr[0] - g.stripB <= 12 && Math.abs((g.strip - postCard) - (pre.strip - preCard)) <= 1 && g.hits.length === 0, JSON.stringify([pre.strip, preCard, postCard, g]));
    rec(size, "toast: a close X of at least 44px", g.x[0] >= 44 && g.x[1] >= 44, JSON.stringify(g.x));
    if (w < 820) { /* the pinned state: scroll part way so the group is stuck to the bottom, then raise the toast again */
      await safeTap(p, "#toastClose"); await p.waitForTimeout(300);
      await p.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * 0.4)));
      await p.waitForTimeout(200);
      if ((await status(p, "w5-lowerB")) === "skip") { await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(250); }
      await p.evaluate(() => document.getElementById("todaySkip").click()); await p.waitForTimeout(320);
      const gp = await probeToast(p);
      rec(size, "toast: " + (gp.pinned ? "pinned group" : "in-flow group (page too short to pin)") + " after scrolling, still covers no control", gp.shown && gp.hits.length === 0, JSON.stringify(gp));
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    }
    await safeTap(p, "#toastClose"); await p.waitForTimeout(320); let g2 = await probeToast(p);
    rec(size, "toast: the X dismisses it and the group keeps its height", !g2.shown && Math.abs(g2.grpH - pre.grpH) <= 1 && (await status(p, "w5-lowerB")) === "skip", JSON.stringify([pre.grpH, g2.grpH]));
    if (size === "390x844" || size === "382x644" || size === "951x669") {
      /* raise the Skip toast from a known state: Lower B (today) not skipped, then Skip */
      const raise = async () => { await p.evaluate(() => window.scrollTo(0, 0)); if ((await status(p, "w5-lowerB")) === "skip") { await safeTap(p, "#todaySkip"); await p.waitForTimeout(250); } await safeTap(p, "#todaySkip"); await p.waitForTimeout(300); return (await probeToast(p)).shown; };
      let up = await raise();
      const hb = await boxOf(p, "#today h2"); const hw = await p.evaluate(() => { const r = document.querySelector("#today h2").getBoundingClientRect(); return [r.left + 8, r.top + r.height / 2]; });
      await p.touchscreen.tap(Math.round(hw[0]), Math.round(hw[1])); await p.waitForTimeout(320);
      rec(size, "toast: a tap elsewhere (plain text) does NOT end Undo, and changes nothing", up && (await probeToast(p)).shown && (await status(p, "w5-lowerB")) === "skip", JSON.stringify(hb));
      await p.evaluate(() => window.scrollTo(0, 300)); await p.waitForTimeout(250); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250);
      rec(size, "toast: scrolling does NOT end Undo", (await probeToast(p)).shown);
      await p.keyboard.press("Escape"); await p.waitForTimeout(250);
      rec(size, "toast: Escape does NOT end Undo", (await probeToast(p)).shown);
      /* visit Progress and come back (on phones the tabs live in the Week and progress page) */
      const phone = w < 820;
      /* phones (v0.1.3): Week and progress is hidden while Undo stands in its place, so open the page first and raise
         Undo inside it (Mon, done, set to Skip) */
      let SK = "w5-lowerB", SV = "";
      if (phone) { await safeTap(p, "#toastClose"); await p.waitForTimeout(320); await safeTap(p, "#openPlan"); await p.waitForTimeout(320);
        SK = "w5-upperA"; SV = await status(p, SK); await safeTap(p, '#panel-train [data-check="0"]'); await p.waitForTimeout(320); }
      const inHead = phone ? (await probeToast(p)) : null;
      if (phone) rec(size, "toast: opening Week and progress keeps Undo, now a row in the page header covering nothing", inHead.shown && /sheet-head/.test(inHead.host) && inHead.hits.length === 0, JSON.stringify(inHead));
      await safeTap(p, '.tab[data-tab="progress"]'); await p.waitForTimeout(300);
      const onProg = (await probeToast(p)).shown && await vis(p, "#panel-progress");
      await safeTap(p, '.tab[data-tab="train"]'); await p.waitForTimeout(300);
      if (phone) { await safeTap(p, "#closePlan"); await p.waitForTimeout(320); }
      const back = await probeToast(p);
      rec(size, "toast: Undo survives a visit to Progress and back" + (phone ? " (and the page closing)" : ""), onProg && back.shown && (phone ? back.host === "toastSlot" : true), JSON.stringify(back));
      await safeTap(p, "#toastUndo"); await p.waitForTimeout(250);
      rec(size, "toast: Undo still works after Progress and back", (await status(p, SK)) === SV && !(await probeToast(p)).shown, await status(p, SK));
      let t1;
      if (phone) { await safeTap(p, "#openPlan"); await p.waitForTimeout(320); await safeTap(p, '#panel-train [data-check="0"]'); await p.waitForTimeout(320); up = (await probeToast(p)).shown; t1 = await txt(p, "#toastMsg"); }
      else { up = await raise(); t1 = await txt(p, "#toastMsg"); }
      await safeTap(p, '#panel-train [data-check="1"]'); await p.waitForTimeout(320);
      const plain = !(await probeToast(p)).shown; /* open to Done offers no Undo: the old one simply ends */
      await safeTap(p, '#panel-train [data-check="1"]'); await p.waitForTimeout(320);
      const t2 = await txt(p, "#toastMsg");
      rec(size, "toast: another status tap ends it; one that offers Undo replaces it (one toast, new message)", up && plain && (await probeToast(p)).shown && t1 !== t2 && (await p.evaluate(() => document.querySelectorAll(".toast").length)) === 1, [t1, t2].join(" -> "));
      await safeTap(p, "#toastUndo"); await p.waitForTimeout(250);
      if (phone) { await safeTap(p, "#closePlan"); await p.waitForTimeout(320); }
      up = await raise(); const sw = await swipe(p, 4, 40); await p.waitForTimeout(320);
      rec(size, "toast: a swipe down dismisses it", up && !(await probeToast(p)).shown, sw);
      up = await raise(); await swipe(p, 70, 0); await p.waitForTimeout(320);
      rec(size, "toast: a swipe sideways dismisses it", up && !(await probeToast(p)).shown);
      up = await raise(); const mid = await status(p, "w5-lowerB");
      await safeTap(p, "#toastUndo"); await p.waitForTimeout(250);
      rec(size, "toast: Undo puts the day back and closes the toast", up && mid === "skip" && (await status(p, "w5-lowerB")) === "" && !(await probeToast(p)).shown, [mid, await status(p, "w5-lowerB")].join(" / "));
    }
    if (size === "382x644") {
      await p.evaluate(() => window.scrollTo(0, 0));
      await safeTap(p, "#todaySkip"); await p.waitForTimeout(300);
      const was = await status(p, "w5-lowerB");
      await p.waitForTimeout(5300);
      const g5 = await probeToast(p);
      await p.waitForTimeout(5000);
      const gg = await probeToast(p);
      rec(size, "toast: Undo lasts 10s (still up at 5.3s, gone at 10.3s)", g5.shown && !gg.shown && (await status(p, "w5-lowerB")) === was);
      // inside the open sheet: a row in the sheet head, Close stays clear
      await safeTap(p, "#openPlan"); await p.waitForTimeout(320);
      /* cycle Mon until a change that offers Undo (open to Done offers none); earlier steps leave Mon in any state */
      for (let k = 0; k < 3; k++) { await safeTap(p, '#panel-train [data-check="0"]'); await p.waitForTimeout(320); if ((await probeToast(p)).shown) break; }
      const gs = await probeToast(p);
      rec(size, "toast: with the sheet open it is a row in the sheet head, covering nothing", gs.shown && /sheet-head/.test(gs.host) && gs.hits.length === 0, JSON.stringify(gs));
    }
    rec(size, "toast: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  { const { ctx, p } = await page({ reduce: true, seed: L.seedFor(B) }, 382, 644); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#todaySkip"); await p.waitForTimeout(60); const g = await probeToast(p);
    rec("382x644 reduce", "toast: no motion under reduced motion", g.shown && /^0s/.test(g.dur), g.dur); await ctx.close(); }

  } catch (e) { rec("section " + 7, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 8. Week and progress: full-screen page on the outer screen, no stray hairline anywhere ----
  try {
  for (const [w, h] of [[382, 644], [475, 669], [390, 844], [430, 932], [334, 835], [669, 835], [669, 751], [678, 466], [678, 396]]) { /* v0.1.3.3: inner portrait and cover landscape get the same page */
    const size = `${w}x${h}`;
    const { ctx, p, W } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#openPlan"); await p.waitForTimeout(400);
    const g = await p.evaluate(() => { const e = document.getElementById("planPane"), r = e.getBoundingClientRect(), cs = getComputedStyle(e), hd = document.querySelector("#planPane .sheet-title").getBoundingClientRect();
      return { r: [r.top, r.left, r.right, r.bottom].map(Math.round), iw: innerWidth, ih: innerHeight, bw: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth], bs: [cs.borderTopStyle, cs.borderRightStyle, cs.borderLeftStyle], rad: cs.borderTopLeftRadius, bg: cs.backgroundColor, head: Math.round(hd.top) }; });
    const noBorder = g.bw.every((x, i) => x === "0px") || g.bs.every(x => x === "none");
    rec(size, "sheet: no border segment at all (nothing touches or stops short of an edge)", noBorder, JSON.stringify(g));
    const full = w / h >= 9 / 17;
    if (full) {
      rec(size, "sheet: outer screen gets a full-screen page, every edge filled, no top radius", g.r[0] === 0 && g.r[1] === 0 && g.r[2] === g.iw && g.r[3] === g.ih && g.rad === "0px", JSON.stringify(g));
      rec(size, "sheet: the header starts at the top buffer", g.head >= 50, String(g.head));
    } else rec(size, "sheet: slab phones keep a rounded sheet that runs edge to edge", g.r[1] === 0 && g.r[2] === g.iw && g.r[3] === g.ih && g.rad !== "0px", JSON.stringify(g));
    await safeTap(p, "#closePlan"); await p.waitForTimeout(320);
    rec(size, "sheet: Close still closes it", !(await p.evaluate(() => document.getElementById("app").classList.contains("sheet-open"))));
    rec(size, "sheet: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  { const { ctx, p } = await page({ reduce: true, seed: L.seedFor(B) }, 382, 644); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#openPlan"); await p.waitForTimeout(400);
    const g = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById("planPane")); return [cs.transform, cs.transitionProperty, cs.opacity]; });
    rec("382x644 reduce", "sheet: reduced motion opens with a fade, no rise", g[0] === "none" && /opacity/.test(g[1]) && g[2] === "1", JSON.stringify(g)); await ctx.close(); }

  } catch (e) { rec("section " + 8, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  const v2 = (() => { const x = L.readSample(B); x.meta.name = "Upper lower, version 2"; return L.code(L.norm(x)); })();
  // ---- 9. Update plan: Paste code first; with the keyboard up, the field and Use this plan stay in view ----
  try {
  for (const [w, h, kb] of [[951, 669, 330], [669, 835, 360], [669, 751, 330], [382, 644, 290], [390, 844, 340], [430, 932, 350], [475, 669, 300], [678, 466, 200], [678, 396, 180]]) {
    const size = `${w}x${h}`;
    let { ctx, p, W } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(400);
    await openMore(p, w); await safeTap(p, "#btnUpdate"); await p.waitForTimeout(200);
    const o = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.background = "var(--ember)"; document.body.appendChild(probe); const acc = getComputedStyle(probe).backgroundColor; probe.remove();
      const filled = Array.from(document.querySelectorAll("#updBox button")).filter(b => b.offsetParent && getComputedStyle(b).backgroundColor === acc).map(b => b.id);
      const r = document.getElementById("updBox").getBoundingClientRect(), a = document.getElementById("btnUpdate").getBoundingClientRect(), clear = document.getElementById("clearProbe").getBoundingClientRect().top;
      return { filled, focus: document.activeElement && document.activeElement.id, top: Math.round(r.top), bottom: Math.round(r.bottom), clear: Math.round(clear), at: document.getElementById("updBox").dataset.at || "", gap: Math.round(Math.min(Math.abs(a.top - r.bottom), Math.abs(r.top - a.bottom))), ph: document.getElementById("updPaste").getBoundingClientRect().height }; });
    /* v0.1.3.3: below 820px it attaches to Update plan (was: pinned near the top, top <= 90, at every size) */
    const placed = w >= 820 ? o.top <= 90 : o.top >= o.clear - 0.5 && ((["above", "below"].includes(o.at) && o.gap <= 16) || o.at === "clamped");
    rec(size, `update: opens ${w >= 820 ? "pinned near the top" : "attached to Update plan, below the top clear zone"} with Paste code as the one filled button, keyboard not raised`, o.filled.join() === "updPaste" && o.focus === "updPaste" && placed && o.ph >= 44, JSON.stringify(o));
    /* keyboard up: a new page at the shorter viewport on the SAME device screen. page.setViewportSize also shrinks the emulated
       screen (device-height), which a real keyboard never does, so it would turn the Duo inner screen into a phone. */
    { const scr = w === 951 ? { width: 951, height: 669 } : w === 669 ? { width: 669, height: 951 } : { width: w, height: h };
      if (W.errs.length) rec(size, "update: no errors before the keyboard", false, W.errs.join(" | "));
      /* v0.1.3.3: the keyboard rises AFTER the field takes focus, on the page already open at full size. Loading a fresh page
         at the short height read as a phone under the 520 rule (a page never loads with the keyboard up). The focus freeze
         keeps the layout; only the window shrinks. */
      void scr; await p.focus("#updCode"); await p.waitForTimeout(150); await p.setViewportSize({ width: w, height: h - kb }); await p.waitForTimeout(300); }
    await p.focus("#updCode"); await p.waitForTimeout(450);
    const k = await p.evaluate(() => { const vv = window.visualViewport, lo = vv.offsetTop, hi = vv.offsetTop + vv.height;
      const f = document.getElementById("updCode").getBoundingClientRect(), u = document.getElementById("updUse").getBoundingClientRect();
      return { lo, hi, field: [f.top, f.bottom].map(Math.round), use: [u.top, u.bottom].map(Math.round), uh: u.height }; });
    rec(size, `update: keyboard up (${kb}px), the field and Use this plan are fully in view`, k.field[0] >= k.lo && k.field[1] <= k.hi && k.use[0] >= k.lo && k.use[1] <= k.hi && k.uh >= 44, JSON.stringify(k));
    await p.fill("#updCode", v2); await safeTap(p, "#updUse"); await p.waitForTimeout(250);
    rec(size, "update: typed code still applies", (await L.ls(p, "plan")).meta.name === "Upper lower, version 2");
    await p.setViewportSize({ width: w, height: h });
    rec(size, "update: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  { // Paste code: clipboard granted (Chromium), denied, unsupported
    const { ctx, p, W } = await page({ seed: L.seedFor(B) }, 390, 844); await p.goto(url); await p.waitForTimeout(400);
    const before = await L.dump(p);
    await p.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { readText: () => Promise.reject(new Error("NotAllowedError")) } }); });
    await openMore(p, 390); await safeTap(p, "#btnUpdate"); await safeTap(p, "#updPaste"); await p.waitForTimeout(200);
    rec("paste", "denied clipboard: a plain hint to paste into the box, nothing changed", /did not share the clipboard/.test(await txt(p, "#updPasteMsg")) && (await L.dump(p)) === before, await txt(p, "#updPasteMsg"));
    await p.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }); });
    await safeTap(p, "#updPaste"); await p.waitForTimeout(200);
    rec("paste", "no clipboard API: the same hint, nothing changed", /did not share the clipboard/.test(await txt(p, "#updPasteMsg")) && (await L.dump(p)) === before);
    await p.evaluate(c => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { readText: () => Promise.resolve(c) } }); }, "  " + v2 + "\n");
    await safeTap(p, "#updPaste"); await p.waitForTimeout(300);
    rec("paste", "clipboard shared: Paste code applies the plan in one tap, log kept", (await L.ls(p, "plan")).meta.name === "Upper lower, version 2" && (await p.evaluate(() => document.getElementById("updBox").hidden)));
    rec("paste", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  if (engine === "chromium") { // the real clipboard API under the page's CSP
    const { ctx, p, W } = await page({ seed: L.seedFor(B) }, 390, 844); await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: url });
    await p.goto(url); await p.waitForTimeout(400); await p.evaluate(c => navigator.clipboard.writeText(c), v2);
    await openMore(p, 390); await safeTap(p, "#btnUpdate"); await safeTap(p, "#updPaste"); await p.waitForTimeout(400);
    rec("paste", "real clipboard (Chromium, granted): Paste code applies the plan", (await L.ls(p, "plan")).meta.name === "Upper lower, version 2", await txt(p, "#updPasteMsg"));
    await ctx.close();
  }

  } catch (e) { rec("section " + 9, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 10. Old browsers: no color-mix, dark tokens are plain values; CSP present and quiet ----
  try {
  { const { ctx, p, W } = await page({ dark: true, seed: L.seedFor(B) }); const csp = []; p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
    const res = await p.goto(url); const html = await res.text(); await p.waitForTimeout(400);
    rec("css", "no color-mix() anywhere in index.html", !/color-mix/.test(html));
    const t = await p.evaluate(() => { const o = {}; ["--panel", "--line", "--ember", "--faint", "--scrim"].forEach(k => o[k] = getComputedStyle(document.documentElement).getPropertyValue(k).trim()); return o; });
    rec("css", "dark tokens are fixed hex or rgba values", Object.values(t).every(v => /^#[0-9a-f]{6}$|^rgba\(/i.test(v)) && t["--panel"] === "#2d302d", JSON.stringify(t));
    rec("csp", "the CSP meta tag is present", /http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"/.test(html));
    await safeTap(p, "#todaySkip"); await safeTap(p, "#toastClose"); await p.waitForTimeout(250); await openMore(p, 390); const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 4000 }).catch(() => null), safeTap(p, "#btnExport")]);
    rec("csp", "under the CSP: Export still downloads, no violations", !!dl && csp.length === 0, csp.join(" | "));
    rec("csp", "under the CSP: the link decoder works on both paths", await p.evaluate(async c => { const a = await window.__ct.decodePlan(c); window.__ctNoStream = true; const b = await window.__ct.decodePlan(c); return a.ok && b.ok; }, v2) && csp.length === 0);
    rec("css", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  } catch (e) { rec("section " + 10, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 11. Resume on a new day: today, the week and both date fields move on ----
  try {
  { const { ctx, p, W } = await page({ now: "2026-10-22T23:58:00-05:00", seed: L.seedFor(B, { tab: "progress", progView: "body" }) }, 951, 669); await p.goto(url); await p.waitForTimeout(400);
    const d0 = await p.inputValue("#bodyDate").catch(() => "");
    await ctx.clock.setFixedTime(new Date("2026-10-23T07:58:00-05:00"));
    await p.evaluate(() => { document.dispatchEvent(new Event("visibilitychange")); }); await p.waitForTimeout(300);
    const d1 = await p.inputValue("#bodyDate").catch(() => "");
    rec("resume", "next morning: today moves to Friday and the weigh-in date resets", d0 === "2026-10-22" && d1 === "2026-10-23" && /Fri/.test(await txt(p, "#today h2")), d0 + " -> " + d1);
    await safeTap(p, '[data-pview="lifts"]'); await p.waitForTimeout(150);
    rec("resume", "the top-set date is today too", (await p.inputValue("#liftDate").catch(() => "")) === "2026-10-23");
    await ctx.close(); }
  { const { ctx, p, W } = await page({ now: "2026-10-25T21:00:00-05:00", seed: L.seedFor(B, { tab: "progress", progView: "lifts" }) }, 390, 844); await p.goto(url); await p.waitForTimeout(400);
    const w0 = await shownWeek(p), d0 = await p.inputValue("#liftDate").catch(() => "");
    await ctx.clock.setFixedTime(new Date("2026-10-26T08:00:00-05:00"));
    await p.evaluate(() => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); }); await p.waitForTimeout(300);
    rec("resume", "Sunday night to Monday morning: week 5 becomes week 6, the top-set date resets", w0 === 5 && (await shownWeek(p)) === 6 && d0 === "2026-10-25" && (await p.inputValue("#liftDate").catch(() => "")) === "2026-10-26", [w0, await shownWeek(p), d0].join(" "));
    rec("resume", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  } catch (e) { rec("section " + 11, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 12. Safety net: a crash offers the raw data; the empty and read-only screens offer Export ----
  try {
  for (const [nm, how] of [["boot throws", "boot"], ["unhandled rejection", "rej"], ["error after boot", "err"]]) {
    const ctx = await L.context(b, engine, 390, 844, { seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) });
    if (how === "boot") await ctx.addInitScript(() => { const g = Date.prototype.getDay; let n = 0; Date.prototype.getDay = function () { if (document.readyState === "loading" && ++n > 3) throw new Error("gate: forced boot failure"); return g.call(this); }; });
    const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(400);
    if (how === "rej") await p.evaluate(() => { Promise.reject(new Error("gate: forced rejection")); });
    /* a handler that throws after boot (the test clock swallows timer errors, so use an event listener) */
    if (how === "err") await p.evaluate(() => { const x = document.createElement("i"); x.addEventListener("click", () => { throw new Error("gate: forced error"); }); x.click(); });
    await p.waitForTimeout(300);
    const f = await p.evaluate(() => { const e = document.getElementById("fatal"); if (!e) return null; const bs = Array.from(e.querySelectorAll("button")).map(b => [b.id, b.getBoundingClientRect().height]); return { text: e.textContent, bs, visible: e.getBoundingClientRect().height > 0 }; });
    rec("safety", `${nm}: a small panel offers Download raw data and Reload`, !!f && f.visible && /Something went wrong/.test(f.text) && /still on this device/.test(f.text) && f.bs.length === 2 && f.bs.every(x => x[1] >= 44), JSON.stringify(f));
    if (f && how === "boot") {
      const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 4000 }).catch(() => null), p.locator("#fatalDownload").tap().catch(() => {})]);
      let raw = null; if (dl) { const fs = require("fs"); raw = JSON.parse(fs.readFileSync(await dl.path(), "utf8")); }
      rec("safety", "Download raw data saves every ct1- key as stored text", !!raw && raw.schema === "raw" && typeof raw.raw["ct1-done"] === "string" && /w5-upperA/.test(raw.raw["ct1-done"]), raw ? Object.keys(raw.raw).join(",") : "no download");
    }
    await ctx.close();
  }
  { const { ctx, p, W } = await page({ seed: Object.assign(L.seedFor(B, { tab: "progress", progView: "body" }), { body: [null, { date: 5 }, 7, { date: "2026-10-01", weight: { x: 1 } }], lifts: "x" }) }); await p.goto(url); await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ h: document.getElementById("panel-progress").getBoundingClientRect().height, fatal: !!document.getElementById("fatal") }));
    rec("safety", "damaged log rows are skipped: Progress renders, no crash", g.h > 0 && !g.fatal && W.errs.length === 0, JSON.stringify(g) + W.errs.join(" | ")); await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { plan: { meta: {} }, done: { "w5-upperA": "done" } }) }); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#dlgOk");
    rec("safety", "saved plan unreadable: the empty screen offers Export", (await vis(p, "#emptyState")) && (await vis(p, "#esExport")));
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 4000 }).catch(() => null), safeTap(p, "#esExport")]);
    let ok = false; if (dl) { const j = JSON.parse(require("fs").readFileSync(await dl.path(), "utf8")); ok = j.data && j.data.done && j.data.done["w5-upperA"] === "done"; }
    rec("safety", "that Export carries the log", ok); await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { schema: 9 }) }); await p.goto(url); await p.waitForTimeout(400);
    const before = await L.dump(p); await safeTap(p, "#dlgOk");
    rec("safety", "read-only (newer data): Export is offered and nothing is written", (await vis(p, "#esExport")) && (await L.dump(p)) === before);
    await p.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)) } })) }); await p.waitForTimeout(300);
    rec("safety", "read-only: Import is refused and the ct1- keys stay", (await dlgKind(p)) === "error" && (await L.dump(p)) === before);
    await ctx.close(); }
  { const { ctx, p } = await page(); await p.goto(url); await p.waitForTimeout(300);
    rec("safety", "fresh device: no saved-data Export card", !(await vis(p, "#esExport"))); await ctx.close(); }

  } catch (e) { rec("section " + 12, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 13. Import: a backup can not lock the device; a full device does not claim success ----
  try {
  const imp = async (p, obj) => { await p.setInputFiles("#importFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(obj)) }); await p.waitForTimeout(300); };
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) }); await p.goto(url); await p.waitForTimeout(400);
    const before = await L.dump(p);
    await imp(p, { app: "coach-tracker", schema: 1, data: { schema: 99, plan: L.norm(L.readSample(A)) } });
    rec("import", "a backup whose data says a newer schema is refused, nothing changed", (await dlgKind(p)) === "error" && /newer tracker/.test(await txt(p, "#dlgTitle")) && (await L.dump(p)) === before, await txt(p, "#dlgTitle"));
    await safeTap(p, "#dlgOk");
    await imp(p, { app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21", week: 5, body: [null, { date: 3 }, { date: "2026-10-02", weight: "180", wu: "lb" }], lifts: [5, { date: "2026-10-02", liftId: "x", weight: "1", reps: "1" }] } });
    await safeTap(p, "#icReplace"); await p.waitForTimeout(300);
    await safeTap(p, "#toastClose"); await p.waitForTimeout(250); /* the import's Undo ends first, as before (v0.1.3.1: Undo no longer hides Week and progress) */
    await safeTap(p, "#openPlan"); await p.waitForTimeout(320); /* the tabs live in the Week and progress page on phones */
    await safeTap(p, '[data-tab="progress"]'); await p.waitForTimeout(200);
    const g = await p.evaluate(() => ({ h: document.getElementById("panel-progress").getBoundingClientRect().height, fatal: !!document.getElementById("fatal"), body: localStorage.getItem("ct1-body") }));
    rec("import", "malformed backup rows: Progress still renders (bad rows skipped)", g.h > 0 && !g.fatal && W.errs.length === 0, JSON.stringify(g) + W.errs.join(" | "));
    await ctx.close(); }
  { const { ctx, p, W } = await page({ seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) }); await p.goto(url); await p.waitForTimeout(400);
    const before = await L.dump(p);
    await imp(p, { app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), body: [{ date: "2026-10-02", weight: "180", wu: "lb" }] } });
    await p.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/ct1-body/.test(k) && /2026-10-02/.test(v)) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; } return set.call(this, k, v); }; });
    await safeTap(p, "#icReplace"); await p.waitForTimeout(300);
    const t = await txt(p, "#dlgTitle"), toast = await txt(p, "#toastMsg");
    rec("import", "full device: the import says it did not fit and the old data is back byte for byte", (await dlgKind(p)) === "error" && /Not enough space/.test(t) && (await L.dump(p)) === before && !/Data imported/.test((await p.evaluate(() => document.getElementById("toast").classList.contains("show"))) ? toast : ""), t);
    rec("import", "full device: no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
  } catch (e) { rec("section " + 13, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  // ---- 14. The hinge (v0.1.2): no dialog, panel or toast content crosses the fold on inner screens, portrait or landscape ----
  try {
  /* every visible box and text run inside the overlay ends in the left pane, 15px clear of the fold */
  const hinge = (p, sel) => p.evaluate(sel => { const root = document.querySelector(sel); if (!root) return { ok: false, why: "missing " + sel };
    const rr = root.getBoundingClientRect(); if (!rr.width || !rr.height) return { ok: false, why: "not shown " + sel };
    const lim = innerWidth / 2 - 15, limR = innerWidth / 2 + 15; let maxR = rr.right, minL = rr.left, worst = sel;
    const take = (r, what) => { if (!r.width) return; if (r.right > maxR) { maxR = r.right; worst = what; } if (r.left < minL) minL = r.left; };
    root.querySelectorAll("*").forEach(e => { if (e.closest("[hidden]") || getComputedStyle(e).display === "none") return; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; take(r, e.id || e.className || e.tagName); });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim() || !n.parentElement || n.parentElement.closest("[hidden]")) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) take(r, "text: " + n.textContent.trim().slice(0, 24)); }
    const side = maxR <= lim && minL >= 0 ? "left" : minL >= limR && maxR <= innerWidth ? "right" : "crosses";
    return { ok: side !== "crosses", side, left: Math.round(minL), right: Math.round(maxR), lim: Math.round(lim), worst }; }, sel);
  for (const [w, h] of [[951, 669]]) { /* v0.1.3.3: 669x835 left this section: inner portrait is the cover pattern, one pane, no hinge rule */
    const size = `${w}x${h}`, fold = `${size} hinge`;
    { const { ctx, p } = await page({}, w, h); await p.goto(url + "#p=" + code(B)); await p.waitForTimeout(500);
      const g = await hinge(p, "#dlg"); rec(fold, "start date prompt stays in the left pane", (await dlgKind(p)) === "start" && g.ok, JSON.stringify(g)); await ctx.close(); }
    { const { ctx, p } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(300); await p.goto(url + "#p=" + badTag); await p.waitForTimeout(500);
      let g = await hinge(p, "#dlg"); rec(fold, "error (details closed) stays in the left pane", (await dlgKind(p)) === "error" && g.ok, JSON.stringify(g));
      await safeTap(p, "#dlg details.err-more summary"); await p.waitForTimeout(150);
      g = await hinge(p, "#dlg"); rec(fold, "error (details open) stays in the left pane", g.ok, JSON.stringify(g)); await ctx.close(); }
    { const { ctx, p } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(400);
      await openMore(p, w); await safeTap(p, "#btnUpdate"); await p.waitForTimeout(200);
      let g = await hinge(p, "#updBox"); rec(fold, "Update plan (text and Paste code) stays in the left pane", g.ok, JSON.stringify(g));
      await ctx.close(); /* keyboard up on the same device screen (setViewportSize would shrink the emulated screen too) */
      { const { ctx, p } = await page({ seed: L.seedFor(B), screen: { width: 951, height: 669 } }, w, h); await p.goto(url); await p.waitForTimeout(400);
        await openMore(p, w); await safeTap(p, "#btnUpdate"); await p.waitForTimeout(200); await p.focus("#updCode"); await p.waitForTimeout(150);
        await p.setViewportSize({ width: w, height: h - 360 }); await p.waitForTimeout(450); /* keyboard rises after focus (see section 9) */
        g = await hinge(p, "#updBox"); rec(fold, "Update plan with the keyboard up stays in the left pane", g.ok, JSON.stringify(g)); await ctx.close(); } }
    { const { ctx, p } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(400);
      await safeTap(p, "#todaySkip"); await p.waitForTimeout(320);
      const g = await hinge(p, "#toast");
      const q = await p.evaluate(() => { const b = s => { const r = document.querySelector(s).getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
        const t = b("#toast"), st = b("#weekStrip"), hd = b("#header"), kick = document.querySelector("#today .kicker") ? b("#today .kicker") : null;
        return { t, st, hd, kick, host: document.getElementById("toast").parentNode.id, vh: innerHeight }; });
      /* v0.1.3.2: the group follows the card and Undo never scrolls, so a slot below the visible bottom stays there */
      const below = q.t.t >= q.st.b - 0.5 && q.t.t - q.st.b <= 12, inView = q.st.t >= 0 && (q.t.b <= q.vh + 0.5 || q.t.t >= q.vh - 66);
      const clear = q.t.t >= q.hd.b - 0.5 && (!q.kick || q.t.b <= q.kick.t + 0.5 || q.t.t >= q.kick.b - 0.5);
      rec(fold, "Undo toast is in the Undo slot directly below the strip in the left pane's group (v0.1.3.1), in view or (v0.1.3.2) left below the visible bottom, clear of the header and kicker", g.side === "left" && q.host === "toastSlot" && below && inView && clear, JSON.stringify([g.side, q])); await ctx.close(); }
    { const { ctx, p } = await page({ seed: L.seedFor(B, { done: { "w5-upperA": "done" } }) }, w, h); await p.goto(url); await p.waitForTimeout(400);
      await p.setInputFiles("#importFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21" } })) }); await p.waitForTimeout(300);
      const g = await hinge(p, "#dlg"); rec(fold, "Import confirm (opened without a tap) stays in the left pane", (await dlgKind(p)) === "import" && g.side === "left", JSON.stringify(g)); await ctx.close(); }
    /* the pane of the dialog matches the pane of the control that opened it */
    { const { ctx, p } = await page({ seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(400);
      await safeTap(p, "#btnMore"); await p.waitForTimeout(200);
      const tapAt = async (sel, fx) => { await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const bb = await p.locator(sel).boundingBox(); await p.touchscreen.tap(Math.round(bb.x + bb.width * fx), Math.round(bb.y + bb.height / 2)); await p.waitForTimeout(300); };
      await tapAt("#btnUpdate", 0.8); let g = await hinge(p, "#updBox");
      rec(fold, "Update plan tapped on the right opens in the right pane", g.side === "right", JSON.stringify(g));
      await safeTap(p, "#updCancel"); await p.waitForTimeout(250);
      const spans = await p.evaluate(() => { const r = document.getElementById("btnUpdate").getBoundingClientRect(); return r.left < innerWidth / 2 && r.right > innerWidth / 2; });
      if (spans) { await tapAt("#btnUpdate", 0.2); g = await hinge(p, "#updBox"); rec(fold, "Update plan spans both panes: a tap on the left half opens it in the left pane", g.side === "left", JSON.stringify(g)); await safeTap(p, "#updCancel"); await p.waitForTimeout(250); }
      const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 4000 }).catch(() => null), tapAt("#btnImport", 0.8)]);
      if (fc) await fc.setFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21" } })) });
      await p.waitForTimeout(400); g = await hinge(p, "#dlg");
      rec(fold, "Import tapped on the right: its confirm opens in the right pane", !!fc && (await dlgKind(p)) === "import" && g.side === "right", JSON.stringify(g));
      await safeTap(p, "#icReplace"); await p.waitForTimeout(400);
      const tg = await hinge(p, "#toast"), tv = await p.evaluate(() => { const r = document.getElementById("toast").getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), vh: innerHeight, host: document.getElementById("toast").parentNode.id || "body" }; });
      rec(fold, "Import's Undo is in the left pane: in its slot below the strip (v0.1.3.2: in view, or below the visible bottom since Undo never scrolls), or low in the left half when the slot is scrolled away above", tg.side === "left" && tv.t >= 0 && (tv.host === "body" ? tv.b <= tv.vh - 50 : tv.host === "toastSlot"), JSON.stringify([tg, tv]));
      await ctx.close(); }
    { const ctx = await L.context(b, engine, w, h, { seed: L.seedFor(B) }); const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(400);
      await p.evaluate(() => { const x = document.createElement("i"); x.addEventListener("click", () => { throw new Error("gate: forced error"); }); x.click(); }); await p.waitForTimeout(300);
      const g = await hinge(p, "#fatal"); rec(fold, "crash panel stays in the left pane", g.ok, JSON.stringify(g)); await ctx.close(); }
  }
  } catch (e) { rec("section " + 14, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }

  // ---- 14b. First paint (v0.1.2): every animation frame from the tap shows nothing or the whole dialog at its final size ----
  try {
  const startFrames = (p, box, parts, dim) => p.evaluate(([box, parts, dim]) => { window.__fr = []; const t0 = performance.now();
    const step = () => { const b = document.querySelector(box), cs = getComputedStyle(b), shown = !b.hidden && cs.display !== "none" && cs.visibility !== "hidden";
      const f = { t: Math.round(performance.now() - t0), shown };
      if (shown) { const r = b.getBoundingClientRect(); f.w = r.width; f.h = r.height; f.op = +parseFloat(cs.opacity).toFixed(2);
        f.miss = parts.filter(s => { const e = document.querySelector(s); if (!e) return true; const q = e.getBoundingClientRect(); return !(q.height > 0 && q.top >= r.top - 0.5 && q.bottom <= r.bottom + 0.5 && q.left >= r.left - 0.5 && q.right <= r.right + 0.5); });
        const d = document.querySelector(dim); f.dim = !!d && !d.hidden && getComputedStyle(d).display !== "none"; }
      window.__fr.push(f); if (performance.now() - t0 < 900) requestAnimationFrame(step); };
    requestAnimationFrame(step); }, [box, parts, dim]);
  const judge = async (p, box) => { await p.waitForTimeout(950); return p.evaluate(box => { const r = document.querySelector(box).getBoundingClientRect(), fr = window.__fr.filter(f => f.shown);
    const bad = fr.filter(f => Math.abs(f.w - r.width) > 1 || Math.abs(f.h - r.height) > 1 || f.miss.length || !f.dim);
    const t0 = fr.length ? fr[0].t : 0, at = ms => fr.find(f => f.t - t0 >= ms) || null;
    return { n: fr.length, bad: bad.slice(0, 3), final: [Math.round(r.width), Math.round(r.height)], at: [0, 50, 100, 200].map(ms => { const f = at(ms); return f ? [ms, Math.round(f.w), Math.round(f.h), f.op] : [ms, null]; }) }; }, box); };
  const UPD_PARTS = ["#updTitle", "#updPaste", "#updCode", "#updUse", "#updCancel"];
  /* v0.1.3.3: the Counter opens the same Update plan from the same page; its first paint is held to the same rule */
  for (const [w, h] of SIZES.concat([[678, 396]])) for (const reduce of [false, true]) {
    const size = `${w}x${h}${reduce ? " reduced" : ""}`;
    const { ctx, p } = await page({ seed: L.seedFor(B), reduce }, w, h); await p.goto(url); await p.waitForTimeout(400);
    await openMore(p, w); await p.locator("#btnUpdate").scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    await startFrames(p, "#updBox", UPD_PARTS, "#updScrim"); await p.locator("#btnUpdate").tap();
    const j = await judge(p, "#updBox");
    rec(size, "first paint: Update plan is never partial (every frame full size with title, Paste code, field and buttons; dim on the same frame)", j.n > 0 && j.bad.length === 0, JSON.stringify(j));
    if (reduce) rec(size, "first paint: under reduced motion it appears at full opacity on its first frame", j.n > 0 && j.at[0][3] === 1, JSON.stringify(j.at));
    else if (w === 382 || w === 951) rec(size, "first paint: opacity rises over about 200ms", j.at[0][3] < 0.6 && j.at[3][3] === 1, JSON.stringify(j.at));
    await safeTap(p, "#updCancel"); await p.waitForTimeout(250);
    /* the shared dialog: Import's confirm */
    await startFrames(p, "#dlg", ["#dlgTitle", "#dlgBtns"], "#dlgScrim");
    await p.setInputFiles("#importFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "coach-tracker", schema: 1, data: { plan: L.norm(L.readSample(A)), startDate: "2026-09-21" } })) });
    const k = await judge(p, "#dlg");
    rec(size, "first paint: the confirm dialog is never partial either", k.n > 0 && k.bad.length === 0, JSON.stringify(k));
    await ctx.close();
  }
  { const { ctx, p } = await page({}, 390, 844); await p.goto(url + "#p=" + code(B));
    await startFrames(p, "#dlg", ["#dlgTitle", "#dlgSaveStart", "#dlgStart", "#dlgLater"], "#dlgScrim"); const j = await judge(p, "#dlg");
    rec("390x844", "first paint: the start date prompt is whole on every frame once shown", j.n > 0 && j.bad.length === 0, JSON.stringify(j)); await ctx.close(); }
  } catch (e) { rec("section 14b", "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }

  // ---- 15. Leftover line (v0.1.2): one row with Stay, a 44px X that hides it for the rest of the week ----
  try {
  const leftSeed = () => L.seedFor(B, { done: { "w4-upperA": "done", "w4-lowerA": "done" } });
  const rowOf = p => p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, w: r.width, h: r.height, l: r.left, r: r.right }; };
    return { p: q("#weekNote .wk-row p"), stay: q("#stayWeek"), x: q("#hideWeekNote"), label: (document.getElementById("hideWeekNote") || { getAttribute: () => "" }).getAttribute("aria-label"), iw: innerWidth }; });
  for (const [w, h] of [[382, 644], [390, 844], [334, 835], [430, 932], [475, 669], [669, 835], [951, 669]]) {
    const size = `${w}x${h} leftover`;
    const { ctx, p, W } = await page({ seed: leftSeed() }, w, h); await p.goto(url); await p.waitForTimeout(400);
    const g = await rowOf(p);
    rec(size, "the X is 44x44 with a label", !!g.x && g.x.w >= 44 && g.x.h >= 44 && /hide/i.test(g.label || ""), JSON.stringify(g.x));
    const one = !!g.p && !!g.stay && !!g.x && g.stay.t < g.p.b && g.p.t < g.stay.b && g.x.t < g.stay.b && g.stay.t < g.x.b && g.x.r <= g.iw;
    rec(size, "text, Stay and the X share one row", one, JSON.stringify(g));
    await safeTap(p, "#hideWeekNote"); await p.waitForTimeout(200);
    const k = await L.ls(p, "weekNoteHidden");
    rec(size, "the X hides the line and remembers the week in ct1- storage", !(await vis(p, "#weekNote .wk-row")) && !!k && k.week === 5 && k.start === "2026-09-21", JSON.stringify(k));
    if (w === 390) {
      await p.reload(); await p.waitForTimeout(400);
      rec(size, "still hidden after a reload the same week", !(await vis(p, "#weekNote .wk-row")));
      await ctx.clock.setFixedTime(new Date("2026-10-26T09:00:00-05:00"));
      await p.evaluate(() => { document.dispatchEvent(new Event("visibilitychange")); }); await p.waitForTimeout(400);
      const t = (await txt(p, "#weekNote p")).trim();
      rec(size, "a new week brings the line back and clears the key", (await vis(p, "#weekNote .wk-row")) && /^Week\s5 has 4\ssessions left\.$/.test(t) && (await L.ls(p, "weekNoteHidden")) == null, t);
    }
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  { const { ctx, p } = await page({ seed: leftSeed() }, 390, 844); await p.goto(url); await p.waitForTimeout(400);
    await safeTap(p, "#stayWeek"); await p.waitForTimeout(300);
    rec("leftover", "Stay still ends the line", !(await vis(p, "#weekNote .wk-row"))); await ctx.close(); }
  } catch (e) { rec("section " + 15, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }

  // ---- 16. Contrast (v0.1.2): WCAG AA for text (4.5:1, 3:1 at 24px or 18.66px bold) ----
  try {
  const contrast = (p, rootSel) => p.evaluate(rootSel => {
    const parse = c => { let m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
      m = /color\(srgb ([^)]+)\)/.exec(c); if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; } return null; };
    const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map(i => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat([a]); };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const bgOf = e => { const layers = []; let n = e, op = 1;
      while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } n = n.parentElement; }
      let out = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out); return out; };
    const root = document.querySelector(rootSel); if (!root) return { n: 0, fails: ["missing " + rootSel], skipped: 0 };
    const els = new Set(); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { const e = t.parentElement; if (!t.textContent.trim() || !e || e.closest("svg")) continue; els.add(e); }
    root.querySelectorAll("input, textarea").forEach(e => { if (e.value) els.add(e); });
    const fails = []; let n = 0, skipped = 0, min = 99;
    els.forEach(e => { if (e.closest("[hidden]") || !e.getClientRects().length) return; const cs = getComputedStyle(e); if (cs.visibility === "hidden" || e.disabled) return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      let op = 1; for (let a = e; a && a.nodeType === 1; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
      const bg = bgOf(e); let fg = parse(cs.color); if (!bg || !fg) { skipped++; return; }
      fg = over([fg[0], fg[1], fg[2], fg[3] * op], bg);
      const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const fs = parseFloat(cs.fontSize), large = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight, 10) >= 700), need = large ? 3 : 4.5; n++; min = Math.min(min, ratio);
      if (ratio < need) fails.push((e.id || e.className || e.tagName) + " '" + (e.value || e.textContent).trim().slice(0, 20) + "' " + ratio.toFixed(2) + "<" + need); });
    return { n, fails, skipped, min: +min.toFixed(2) }; }, rootSel);
  for (const dark of [true, false]) {
    const mode = dark ? "dark" : "light";
    { const { ctx, p } = await page({ dark, seed: L.seedFor(B, { done: { "w5-upperA": "done", "w5-lowerA": "skip" }, body: [{ date: "2026-10-20", weight: "180", wu: "lb" }], lifts: [] }) }, 382, 644); await p.goto(url); await p.waitForTimeout(400);
      await safeTap(p, "#openPlan"); await p.waitForTimeout(320);
      let c = await contrast(p, "#planPane"); rec(`382x644 ${mode}`, "contrast: Week and progress (week list) text meets AA", c.n > 5 && c.fails.length === 0, JSON.stringify(c));
      await safeTap(p, '.tab[data-tab="progress"]'); await p.waitForTimeout(250);
      c = await contrast(p, "#planPane"); rec(`382x644 ${mode}`, "contrast: Week and progress (Progress) text meets AA", c.n > 5 && c.fails.length === 0, JSON.stringify(c));
      await ctx.close(); }
    for (const [w, h] of [[390, 844], [382, 644]]) {
      const { ctx, p } = await page({ dark, seed: L.seedFor(B) }, w, h); await p.goto(url); await p.waitForTimeout(300); await p.goto(url + "#p=" + badTag); await p.waitForTimeout(500);
      const c = await contrast(p, "#dlg"); rec(`${w}x${h} ${mode}`, "contrast: the collapsed error screen meets AA", (await dlgKind(p)) === "error" && c.n >= 3 && c.fails.length === 0, JSON.stringify(c));
      await ctx.close();
    }
  }
  } catch (e) { rec("section " + 16, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }

  // ---- 17. Clearance (v0.1.3): the toast and pinned parts never cover what the reader needs (test/clearance.js) ----
  try { await require("./clearance")({ b, engine, url, rec }); }
  catch (e) { rec("section " + 17, "crashed: an element this section needs is missing", false, String(e.message).split("\n")[0]); }
  await b.close(); T.close();
  rows.forEach(r => console.log(r));
  console.log(`flow ${engine} ${fails() ? fails() + " FAIL" : "ALL PASS"} (${rows.length} checks)`);
  process.exit(fails() ? 1 : 0);
})().catch(e => { rows.forEach(r => console.log(r)); console.error(e); process.exit(2); });
