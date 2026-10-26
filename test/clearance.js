/* Clearance gate (v0.1.3, v0.1.3.1, v0.1.3.2): the Undo toast and pinned parts never cover what the reader needs.
   Part of gate-flow (section 17); also runs alone for mutation tests: node clearance.js <webkit|chromium> [url] */
const L = require("./lib");
const B = "b-4day-upper-lower";
const SIZES = [[382, 644], [669, 835], [951, 669], [390, 844]];
/* real Safari visible heights: the bottom 50px toolbar and a 34px safe area taken off the screen height, with the
   34px safe-area inset applied too; the cover, inner portrait and inner landscape plus the 334 and 475 splits, in dark */
const SAFARI = [[382, 644], [669, 835], [951, 669], [334, 835], [475, 669]].map(([w, h]) => [w, h - 50 - 34]);
const SETS = [{ sizes: SIZES, safe: 0, dark: false, tag: "" }, { sizes: SAFARI, safe: 34, dark: true, tag: " safari dark" }];
const CONTENT = ["#header", "#weekNote .wk-note", "#today", "#today .today-top", "#today .today-hero", "#today .set-row", "#todayDone", "#paneToday > .outer-nav"];
/* geometry in the page: what pins, what it covers, and the scroller */
function probe(CONTENT) {
  const ROW = ["#navRow", "#backToday", "#openPlan", "#backInline"];
  const vh = innerHeight, wide = innerWidth >= 820;
  const sc = wide ? document.getElementById("paneToday") : document.scrollingElement;
  const bx = n => { const r = n.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
  const grp = document.getElementById("navGroup"), t = document.getElementById("toast"), strip = document.getElementById("weekStrip");
  const toastOn = t.classList.contains("show") && t.getBoundingClientRect().height > 20 && getComputedStyle(t).visibility !== "hidden";
  const covers = [["strip", bx(strip)]];
  if (grp.classList.contains("is-sticky")) covers.push(["group", bx(grp)]);
  if (toastOn) covers.push(["toast", bx(t)]);
  const content = [];
  CONTENT.forEach(s => document.querySelectorAll(s).forEach((n, i) => { if (n.closest("[hidden]") || !n.getClientRects().length) return; const r = bx(n); if (r.h < 1) return; content.push([s + (i ? "#" + i : ""), r]); }));
  const hit = (a, c) => Math.min(a.r, c.r) - Math.max(a.l, c.l) > 1 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 1;
  const inView = r => r.b > 0 && r.t < vh;
  const overlaps = [];
  covers.forEach(([cn, c]) => content.forEach(([n, r]) => { if (inView(r) && hit(c, r) && !(cn === "group" && n === "#paneToday > .outer-nav")) overlaps.push(cn + "/" + n); }));
  /* a pinned group sits flush at the visible bottom: nothing from the card shows beneath it */
  const pinned = grp.classList.contains("is-pinned"), g = bx(grp), beneath = [];
  /* the group's opaque page-background fill below it (::after) hides what scrolls under it; "beneath" is what shows below that */
  const fillB = g.b + Math.max(8, parseFloat(getComputedStyle(grp, "::after").height) || 0);
  if (pinned) content.forEach(([n, r]) => { if (Math.min(r.b, vh) - Math.max(r.t, fillB) > 1 && r.l < g.r && r.r > g.l) beneath.push(n); });
  const done = bx(document.getElementById("todayDone")), rows = document.querySelectorAll("#today .set-row"), last = rows.length ? bx(rows[rows.length - 1]) : null;
  const full = r => !!r && r.t >= -0.5 && r.b <= vh + 0.5;
  const clear = r => !!r && !covers.some(([cn, c]) => (cn !== "group" || pinned) && hit(c, r));
  const colGap = sc.scrollHeight - sc.clientHeight - sc.scrollTop; /* v0.1.3.3: one column below 820px, so the column end is the page end */
  return { st: Math.round(sc.scrollTop), max: sc.scrollHeight - sc.clientHeight, colGap: Math.round(colGap), toastOn, pinned, overlaps, beneath, doneOk: full(done) && clear(done), lastOk: full(last) && clear(last),
    grpH: g.h, stripOk: [...strip.querySelectorAll("[data-strip], [data-strip] *")].every(n => { const r = n.getBoundingClientRect(); if (r.height < 1) return true;
      const s = strip.getBoundingClientRect(); return r.top >= -0.5 && r.bottom <= vh + 0.5 && r.top >= s.top - 0.5 && r.bottom <= s.bottom + 0.5 && n.scrollHeight <= n.clientHeight + 1; }),
    toastFlow: (() => { if (!toastOn) return true; const c = getComputedStyle(t); return c.position === "static" && c.transform === "none" && ["Top", "Bottom", "Left", "Right"].every(k => parseFloat(c["margin" + k]) >= 0); })(),
    toastStrip: toastOn && hit(bx(t), bx(strip)),
    /* v0.1.3.1: the Back to today and Week and progress row (#navRow, in #navGroup on the cover) and its buttons, and the
       card's own Back to today on inner screens: the toast never intersects them */
    toastRow: toastOn ? ROW.map(s => document.querySelector(s)).filter(n => n && n.getClientRects().length && getComputedStyle(n).visibility !== "hidden" && n.getBoundingClientRect().height > 0)
      .filter(n => hit(bx(t), bx(n))).map(n => n.id) : [], toastR: toastOn ? [Math.round(bx(t).t), Math.round(bx(t).b)] : null, stripR: [Math.round(bx(strip).t), Math.round(bx(strip).b)],
    done: [Math.round(done.t), Math.round(done.b)], covers: covers.map(([n, c]) => n + ":" + Math.round(c.t) + "-" + Math.round(c.b)), vh };
}
/* v0.1.3.2, the picked day fits: every exercise row and Mark day done (a rest day: its hero) is fully visible and on
   top (elementFromPoint at its centre and 3px inside its top and bottom edges hits it), or partly or wholly past the
   visible top or bottom edge (the page scrolls to it),
   and never intersects the week strip, the Back to today / Week and progress row or the Undo slot. The visible area is
   the window, and the left pane's box at 820 and up. */
function fitProbe(safe) {
  const wide = innerWidth >= 820, pane = document.getElementById("paneToday");
  const v = wide ? pane.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const bx = n => n.getBoundingClientRect();
  const shown = n => !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden" && bx(n).height > 0 && bx(n).width > 0;
  const hit = (a, c) => Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1;
  const blockers = ["weekStrip", "navRow", "toastSlot"].map(id => document.getElementById(id)).filter(shown);
  const card = document.getElementById("today");
  const items = [...card.querySelectorAll(".set-row, #todayDone")];
  if (!items.length) items.push(...card.querySelectorAll(".today-hero"));
  const out = items.map((n, i) => {
    const r = bx(n), name = (n.id || n.className.split(" ")[0]) + "#" + i;
    const inter = blockers.filter(c => hit(r, bx(c))).map(c => c.id);
    const full = r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const on = full ? [r.top + 3, r.top + r.height / 2, r.bottom - 3].every(y => { const e = document.elementFromPoint(x, y); return !!e && (n === e || n.contains(e)); }) : null;
    return { name, t: Math.round(r.top), b: Math.round(r.bottom), full, on, inter };
  });
  const c = bx(card);
  /* room for the card: the visible height less the scroller's top clearance (scroll-padding-top), the safe area and 8px */
  const padT = parseFloat(getComputedStyle(wide ? pane : document.documentElement).scrollPaddingTop) || 0;
  return { items: out, card: [Math.round(c.top), Math.round(c.bottom)], v: [Math.round(v.top), Math.round(v.bottom)], fitsView: c.height <= v.bottom - v.top - padT - (safe || 0) - 8,
    label: (card.querySelector(".today-hero h2") || {}).textContent || "", blockers: blockers.map(n => n.id + ":" + Math.round(bx(n).top) + "-" + Math.round(bx(n).bottom)) };
}
/* v0.1.3.1: Back to today and Week and progress stay visible and tappable while the toast shows: the point at each
   button's center hits that button (or a descendant). Buttons scrolled out of view are listed apart; the caller decides */
function taps() {
  const out = { hit: [], miss: [], away: [] };
  ["backToday", "openPlan", "backInline"].forEach(id => {
    const n = document.getElementById(id); if (!n || !n.getClientRects().length || getComputedStyle(n).visibility === "hidden") return;
    const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) { out.away.push(id); return; }
    const e = document.elementFromPoint(x, y); (e && n.contains(e) ? out.hit : out.miss).push(id + (e && !n.contains(e) ? "->" + (e.id || e.className || e.tagName) : ""));
  });
  return out;
}
/* v0.1.3.1: what must not move when the toast shows or goes: the scroll position and the row and strip rects */
function still() {
  const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement;
  const r = id => { const n = document.getElementById(id); if (!n || !n.getClientRects().length) return null; const x = n.getBoundingClientRect(); return [x.top, x.bottom, x.left, x.right]; };
  return { st: sc.scrollTop, row: r("navRow"), strip: r("weekStrip"), shown: document.getElementById("toast").classList.contains("show") };
}
const same = (a, b) => Math.abs(a.st - b.st) <= 1 && ["row", "strip"].every(k => (a[k] === null && b[k] === null) || (a[k] && b[k] && a[k].every((v, i) => Math.abs(v - b[k][i]) <= 1)));
/* the end of the today column: the pane's end at 820 and up, else the page end (v0.1.3.3: inner portrait is the cover pattern) */
const toEnd = p => p.evaluate(() => {
  if (innerWidth >= 820) { const sc = document.getElementById("paneToday"); sc.scrollTop = sc.scrollHeight; return; }
  const se = document.scrollingElement; se.scrollTop = se.scrollHeight - innerHeight;
});
/* the reader's thumb: small steps down until the column end or nothing moves */
const thumbToEnd = p => p.evaluate(() => {
  const wide = innerWidth >= 820, sc = wide ? document.getElementById("paneToday") : document.scrollingElement;
  const stop = () => sc.scrollHeight - sc.clientHeight;
  for (let i = 0; i < 400; i++) { const was = sc.scrollTop, lim = stop(); if (was >= lim - 0.5) break; sc.scrollTop = Math.min(lim, was + 40); if (sc.scrollTop === was) break; }
});
const midScroll = p => p.evaluate(() => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = Math.round((sc.scrollHeight - sc.clientHeight) * 0.5); });
const toTop = p => p.evaluate(() => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = 0; });

async function run({ b, engine, url, rec }) {
  const wait = (p, ms) => p.waitForTimeout(ms);
  const frame = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const geo = p => p.evaluate(probe, CONTENT);
  await (async () => {})();
  const grpAt = {};
  for (const S of SETS) for (const [w, h] of S.sizes) for (const viewDay of [false, true]) for (const toast of [false, true]) {
    const size = `${w}x${h}${S.tag}${viewDay ? " Thu" : ""}${toast ? " +toast" : ""}`;
    const ctx = await L.context(b, engine, w, h, { dark: S.dark, seed: L.seedFor(B, { done: { "w5-upperA": "done", "w5-lowerA": "done" } }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(url); await wait(p, 400);
    if (S.safe) { await p.addStyleTag({ content: `:root{--safe-b:${S.safe}px !important}` }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await wait(p, 250); }
    if (viewDay) { await p.evaluate(() => document.querySelector('[data-strip="3"]').click()); await wait(p, 250); }
    const raise = async () => { await p.evaluate(() => document.getElementById("todaySkip").click()); await wait(p, 320); };
    if (toast) await raise();
    /* at rest and mid scroll: a pinned group is flush at the bottom, nothing of the card visible beneath it */
    await toTop(p); await wait(p, 150); let g = await geo(p);
    rec(size, "clearance: at rest a pinned group has nothing of the card beneath it", g.beneath.length === 0 && (!toast || g.toastOn), JSON.stringify(g));
    if (toast) {
      const tp = await p.evaluate(taps), sticky = await p.evaluate(() => document.getElementById("navGroup").classList.contains("is-sticky"));
      rec(size, "clearance: at rest, with the toast showing, Back to today and Week and progress are tappable where visible (elementFromPoint); in view when the group pins", tp.miss.length === 0 && g.toastRow.length === 0 && (w >= 820 || !sticky || (tp.hit.includes("openPlan") && (!viewDay || tp.hit.includes("backToday")))), JSON.stringify([tp, g.toastRow]));
    }
    await midScroll(p); await wait(p, 150); g = await geo(p);
    rec(size, "clearance: mid scroll, a pinned group has nothing of the card beneath it", g.beneath.length === 0, JSON.stringify(g));
    /* from mid scroll the thumb reaches the last exercise and Mark day done, clear of the strip and toast */
    await thumbToEnd(p); await wait(p, 200); g = await geo(p);
    rec(size, "clearance: from mid scroll, scrolling reaches the last exercise row and Mark day done, both fully visible and clear", g.lastOk && g.doneOk && (!toast || g.toastOn), JSON.stringify(g));
    /* at the end: no pinned part or toast overlaps any visible content */
    await toEnd(p); await wait(p, 200); g = await geo(p);
    rec(size, "clearance: at max scroll the toast and pinned parts overlap no visible content; Mark day done fully visible", g.overlaps.length === 0 && g.doneOk && g.beneath.length === 0, JSON.stringify(g));
    rec(size, "clearance: at max scroll the strip is fully visible, labels included", g.stripOk, JSON.stringify(g));
    if (toast) {
      rec(size, "clearance: at max scroll the toast does not intersect the Back to today / Week and progress row", g.toastRow.length === 0, JSON.stringify([g.toastR, g.toastRow]));
      const tp = await p.evaluate(taps);
      rec(size, "clearance: at max scroll, with the toast showing, Back to today and Week and progress are visible and tappable (elementFromPoint)", tp.miss.length === 0 && (w >= 820 || (tp.hit.includes("openPlan") && (!viewDay || tp.hit.includes("backToday")))), JSON.stringify(tp));
    }
    if (toast) {
      /* Test: the Undo toast never intersects the week strip, at any scroll offset (sweep top to end) */
      const bad = [];
      for (let i = 0; i <= 16; i++) {
        await p.evaluate(f => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = Math.round((sc.scrollHeight - sc.clientHeight) * f); }, i / 16);
        await frame(p); const q = await geo(p); if (!q.toastOn || q.toastStrip || q.toastRow.length) bad.push(i + ":" + (q.toastOn ? JSON.stringify([q.toastR, q.stripR, q.toastRow]) : "toast gone"));
      }
      rec(size, "clearance: the Undo toast never intersects the week strip or the Back to today / Week and progress row at any scroll offset (17 stops, top to end)", bad.length === 0, bad.join(" "));
      await toEnd(p); await wait(p, 150);
    }
    if (toast) {
      /* v0.1.3.1, no layout jump: at the top, mid scroll and the end, the scroll position and the row and strip rects are
         the same (within 1px) with the toast and after the X, and again when it shows. The show compares the same card:
         un-skip and skip in one task, so the only change the page can paint is the toast. The toast is in normal flow. */
      const jumps = [];
      for (const [nm, go] of [["top", toTop], ["mid", midScroll], ["end", toEnd]]) {
        await go(p); await wait(p, 200);
        if (!(await p.evaluate(still)).shown) { await p.evaluate(() => { const b = document.getElementById("todaySkip"); b.click(); if (!document.getElementById("toast").classList.contains("show")) b.click(); }); await wait(p, 320); }
        const s0 = await p.evaluate(still); await p.evaluate(() => document.getElementById("toastClose").click()); await wait(p, 320);
        /* a temporary spacer at the scroller's end, in the same task, stops the browser clamping the scroll while the
           un-skipped card is a few px shorter; it is gone before the next paint, so the page is the same again */
        const s1 = await p.evaluate(still); await p.evaluate(() => { const host = innerWidth >= 820 ? document.getElementById("paneToday") : document.body, sp = document.createElement("div");
          sp.style.height = "400px"; host.appendChild(sp); const b = document.getElementById("todaySkip"); b.click(); document.getElementById("todaySkip").click(); void host.offsetHeight; sp.remove(); }); await wait(p, 320);
        const s2 = await p.evaluate(still);
        if (!s0.shown || s1.shown || !s2.shown || !same(s0, s1) || !same(s1, s2)) jumps.push(nm + ":" + JSON.stringify([s0, s1, s2]));
      }
      rec(size, "clearance: no layout jump: scrollTop, the row and the strip stay put (within 1px) when the toast shows and when it is dismissed (top, mid, end)", jumps.length === 0, jumps.join(" "));
      g = await geo(p);
      rec(size, "clearance: the toast is in normal flow (static, no transform, no negative margin)", g.toastFlow && g.toastOn, JSON.stringify(g));
    }
    if (!toast) {
      /* the toast appears while the reader is at the end: the end stays in view in the same frame, Mark day done clear */
      await raise(); await frame(p); g = await geo(p);
      rec(size, "clearance: Undo raised at the end keeps the end in view; nothing covered", g.toastOn && g.overlaps.length === 0 && g.doneOk && g.colGap <= 24, JSON.stringify(g));
      /* away from the end the scroll is never moved */
      await p.evaluate(() => document.getElementById("toastClose").click()); await wait(p, 320);
      await midScroll(p); await wait(p, 200); const st0 = (await geo(p)).st; await raise(); g = await geo(p);
      rec(size, "clearance: Undo raised away from the end does not move the scroll", Math.abs(g.st - st0) <= 1, st0 + " -> " + g.st);
    }
    rec(size, "clearance: no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  /* the slot (v0.1.3.1): on the cover screen the toast fades in in its own slot below the Back to today and Week and
     progress row, which stays visible; the group height is unchanged within 1px; inner screens have one way back (in the card) and no Showing bar; Mark day done
     is the card's last element; the strip pins only while its place is below the visible bottom */
  for (const [w, h] of [[382, 644], [334, 751], [475, 585], [390, 844], [669, 835], [669, 751], [951, 669]]) for (const viewDay of [false, true]) for (const reduce of [false, true]) {
    const size = `${w}x${h} slot${viewDay ? " Thu" : ""}${reduce ? " reduced motion" : ""}`;
    const ctx = await L.context(b, engine, w, h, { dark: true, reduce, seed: L.seedFor(B, { done: { "w5-upperA": "done", "w5-lowerA": "done" } }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(url); await wait(p, 400);
    if (viewDay) { await p.evaluate(() => document.querySelector('[data-strip="3"]').click()); await wait(p, 250); }
    const sw = () => p.evaluate(() => { const r = id => { const n = document.getElementById(id); if (!n) return null; const x = n.getBoundingClientRect(); return { t: x.top, b: x.bottom, l: x.left, r: x.right, h: x.height }; };
      const t = document.getElementById("toast"), nav = document.getElementById("outerNav"), today = document.getElementById("today"), done = document.getElementById("todayDone");
      const vis = n => !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden" && parseFloat(getComputedStyle(n).opacity) > 0.01;
      const dur = s => Math.max(0, ...s.split(",").map(x => parseFloat(x) * (/ms/.test(x) ? 1 : 1000) || 0));
      return { grp: r("navGroup"), nav: r("outerNav"), strip: r("weekStrip"), toast: r("toast"), host: t.parentNode.id, shown: t.classList.contains("show"),
        navCtl: [...nav.children].filter(n => n !== t).some(vis), navShown: vis(nav) && nav.getBoundingClientRect().height > 0, showing: !!document.getElementById("backToday") && vis(document.getElementById("backToday")),
        inline: vis(document.getElementById("backInline")), lastIsDone: !!done && today.lastElementChild && today.lastElementChild.contains(done) && done.getBoundingClientRect().bottom <= today.getBoundingClientRect().bottom + 0.5,
        tDur: dur(getComputedStyle(t).transitionDuration), pinned: document.getElementById("navGroup").classList.contains("is-pinned"),
        markIn: document.getElementById("navMark").getBoundingClientRect().top <= innerHeight + 0.5 && !document.getElementById("navGroup").classList.contains("is-pinned") };
    });
    const a = await sw();
    await p.evaluate(() => document.getElementById("todaySkip").click()); await wait(p, 320); const c = await sw();
    rec(size, "slot: Mark day done is the card's last element", a.lastIsDone, JSON.stringify(a));
    if (w < 820) { /* v0.1.3.3: was w < 600 */
      rec(size, "slot: the toast sits in its own slot below the Back to today and Week and progress row, which stays visible; group height the same within 1px", c.shown && c.host === "toastSlot" && Math.abs(c.grp.h - a.grp.h) <= 1 && c.toast.t >= c.nav.b - 0.5 && c.navCtl, JSON.stringify([a.grp, c]));
      rec(size, "slot: the fade " + (reduce ? "is instant under reduced motion" : "is at most 240ms"), reduce ? c.tDur === 0 : c.tDur > 0 && c.tDur <= 240, String(c.tDur));
      await p.evaluate(() => document.getElementById("toastClose").click()); await wait(p, 320); const d = await sw();
      rec(size, "slot: after the X the row's controls are still there, group height unchanged", !d.shown && d.navCtl && Math.abs(d.grp.h - a.grp.h) <= 1, JSON.stringify(d));
    } else {
      rec(size, "slot: two panes have no Showing bar under the strip" + (viewDay ? "; Back to today is in the card header" : ""), !a.navShown && !a.showing && (!viewDay || a.inline) && !c.navShown, JSON.stringify(a));
      rec(size, "slot: the Undo slot sits directly below the strip", c.shown && c.host === "toastSlot" && c.toast.t >= (c.strip ? c.strip.b : 0) - 0.5, JSON.stringify(c));
    }
    /* at the end the strip's own place is in view, so it does not pin */
    await toEnd(p); await wait(p, 250); const e = await sw();
    rec(size, "slot: at the end of the column the strip is in its place, not pinned", !e.pinned, JSON.stringify(e));
    rec(size, "slot: no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  /* v0.1.3.3 (replaces the v0.1.3.1 floating Undo on inner portrait): inner portrait is the cover pattern, so Undo raised
     from the plan is raised inside the Week and progress page, as a row in its head covering nothing; nothing floats */
  for (const [w, h] of [[669, 835], [700, 1024]]) {
    const size = `${w}x${h} page Undo`;
    const ctx = await L.context(b, engine, w, h, { seed: L.seedFor(B, { done: { "w5-upperA": "done", "w5-lowerA": "done" } }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(url); await wait(p, 400);
    await p.evaluate(() => document.getElementById("openPlan").click()); await wait(p, 400);
    await p.evaluate(() => document.querySelector('#panel-train [data-check="0"]').click()); await wait(p, 320);
    const g = await p.evaluate(() => {
      const t = document.getElementById("toast"), tr = t.getBoundingClientRect(), hits = [];
      document.querySelectorAll("#planPane button, #planPane p, #planPane .card, #planPane h2, #planPane h3").forEach(n => { if (t.contains(n) || n.closest("[hidden]") || !n.getClientRects().length) return;
        const r = n.getBoundingClientRect(); if (r.height < 1 || r.bottom <= 0 || r.top >= innerHeight) return;
        if (Math.min(r.right, tr.right) - Math.max(r.left, tr.left) > 1 && Math.min(r.bottom, tr.bottom) - Math.max(r.top, tr.top) > 1) hits.push(n.id || n.className || n.tagName); });
      return { float: t.classList.contains("float-low") || getComputedStyle(t).position === "fixed", shown: t.classList.contains("show"), host: t.parentNode.id || t.parentNode.className, hits, tr: [Math.round(tr.top), Math.round(tr.bottom)] };
    });
    rec(size, "clearance: Undo raised in the Week and progress page is a row in its head, not floating, covering nothing", !g.float && g.shown && /sheet-head/.test(g.host) && g.hits.length === 0, JSON.stringify(g));
    rec(size, "clearance: no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  /* v0.1.3.2, the picked day fits (from the phone re-test of v0.1.3.1: picking Fri, Lower B on the cover left the last
     exercise and Mark day done under the pinned strip): every sample's week 5, every day picked from the strip, on the
     cover and inner portrait and landscape at their Safari visible heights (34px safe inset), dark, default and 200%
     text. The clock is a Saturday, so Fri is a picked day, not today. Before each pick the strip is scrolled into view
     (where the reader taps it). At rest after the pick: nothing intersects the strip, the row or the slot, everything on
     screen is fully visible and on top, and a card that fits the visible height is all in view. Then a 17-stop sweep
     top to end: never an intersection, and each row and Mark day done is fully visible and on top at some stop. */
  for (const sample of L.SAMPLES) for (const [w, h, where, safe = 34] of [[382, 560, "cover"], [669, 751, "inner portrait"], [951, 585, "inner landscape"]]) for (const big of [false, true]) {
    const base = `${w}x${h} fit ${sample} ${where}${big ? " 200% text" : ""}`;
    const ctx = await L.context(b, engine, w, h, { dark: true, now: "2026-10-24T12:00:00-05:00", seed: L.seedFor(sample, { done: {} }) }); const p = await ctx.newPage(); const W = L.watch(p);
    await p.goto(url); await wait(p, 400);
    await p.addStyleTag({ content: ":root{--safe-b:" + safe + "px !important}" + (big ? "html{font-size:200%!important}" : "") }); await p.evaluate(() => window.dispatchEvent(new Event("resize"))); await wait(p, 300);
    const n = await p.evaluate(() => document.querySelectorAll("[data-strip]").length);
    for (let d = 0; d < n; d++) {
      await p.evaluate(d => { const s = document.querySelector('[data-strip="' + d + '"]'); s.scrollIntoView({ block: "nearest" }); }, d); await wait(p, 120);
      await p.evaluate(d => document.querySelector('[data-strip="' + d + '"]').click(), d); await wait(p, 300); await frame(p);
      const g = await p.evaluate(fitProbe, safe), size = base + " day " + d + " (" + g.label + ")";
      const restBad = g.items.filter(it => it.inter.length || (it.full && !it.on) || (g.fitsView && !it.full));
      rec(size, "fit: at rest after picking the day, every exercise row and Mark day done on screen is fully visible, on top and clear of the strip, the row and the Undo slot; a card that fits is all in view", restBad.length === 0, JSON.stringify(Object.assign({}, g, { items: restBad })));
      const seen = {}, bad = [];
      for (let i = 0; i <= 16; i++) {
        await p.evaluate(f => { const sc = innerWidth >= 820 ? document.getElementById("paneToday") : document.scrollingElement; sc.scrollTop = Math.round((sc.scrollHeight - sc.clientHeight) * f); }, i / 16);
        await frame(p); const q = await p.evaluate(fitProbe, safe);
        q.items.forEach(it => { if (it.inter.length) bad.push(i + ":" + it.name + "x" + it.inter.join("+") + "@" + it.t + "-" + it.b); if (it.full && it.on) seen[it.name] = 1; });
      }
      const unseen = g.items.map(it => it.name).filter(nm => !seen[nm]);
      rec(size, "fit: scrolling top to end (17 stops), no exercise row or Mark day done ever intersects the strip, the row or the Undo slot, and each is fully visible and on top at some stop", bad.length === 0 && unseen.length === 0, JSON.stringify({ bad: bad.slice(0, 12), unseen, blockers: g.blockers }));
    }
    rec(base, "fit: no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
}
module.exports = run;
if (require.main === module) (async () => {
  const { rows, rec, fails } = L.makeRec(); const T = await L.target(process.argv.slice(2)); const b = await L.launch(T.engine);
  await run({ b, engine: T.engine, url: T.url, rec }); await b.close(); T.close();
  rows.forEach(r => console.log(r)); console.log(`clearance ${T.engine} ${fails() ? fails() + " FAIL" : "ALL PASS"} (${rows.length} checks)`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
