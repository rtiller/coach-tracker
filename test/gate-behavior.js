/* Behavior gate: plan links, Update plan, Export and Import, Undo, bad input, empty state, hash handling, persistence, privacy.
   Usage: node gate-behavior.js <webkit|chromium> [url]. Clock pinned to Fri Oct 23 2026, 12:00 CDT. */
const L = require("./lib");
const { rows, rec, fails } = L.makeRec();
const S = n => L.readSample(n), C = (p, gz) => L.code(p, gz);
const A = "a-3day-beginner-full-body", B = "b-4day-upper-lower", Cc = "c-5day-split-deload", D = "d-2day-home", E = "e-6day-ppl";
const allCodes = new Set();
const codeOf = (p, gz) => { const c = C(p, gz); allCodes.add(c); return c; };
(async () => {
  const T = await L.target(process.argv.slice(2)); const engine = T.engine, url = T.url;
  const b = await L.launch(engine);
  const reqsAll = [];
  async function page(opts = {}, w = 390, h = 844) {
    const ctx = await L.context(b, engine, w, h, opts); const p = await ctx.newPage(); const W = L.watch(p); W.reqs.ctx = ctx; reqsAll.push(W.reqs);
    return { ctx, p, W };
  }
  const visible = (p, s) => p.locator(s).first().isVisible();
  const dlgKind = p => p.evaluate(() => { const d = document.getElementById("dlg"); return d.hidden ? null : d.dataset.kind; });
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 8000 }); await l.tap(); await p.waitForTimeout(150); };
  const keys = p => p.evaluate(() => Object.keys(localStorage).sort());
  const KEYSET = ["schema", "plan", "seen", "week", "startDate", "done", "openDays", "lifts", "body", "tab", "progView", "weekNoteHidden"].map(k => "ct1-" + k);

  // ---- 1. Empty state on a fresh device ----
  { const { ctx, p, W } = await page(); await p.goto(url); await p.waitForTimeout(300);
    rec("empty", "fresh device shows the empty state, not the app", await visible(p, "#emptyState") && !(await visible(p, "#app")));
    rec("empty", "empty state writes nothing to storage", (await keys(p)).length === 0, (await keys(p)).join(","));
    rec("empty", "no dialog on the empty state", (await dlgKind(p)) === null);
    await p.fill("#esCode", "this is not a plan"); await tap(p, "#esUse");
    rec("empty", "pasting junk shows a friendly inline error and writes nothing", await visible(p, "#esErr") && /damaged/.test(await p.textContent("#esErr")) && (await keys(p)).length === 0, await p.textContent("#esErr"));
    await p.fill("#esCode", JSON.stringify(Object.assign(S(A), { schema: 2 }))); await tap(p, "#esUse");
    rec("empty", "pasting a newer-format plan says it needs a newer tracker", /newer tracker/.test(await p.textContent("#esErr")) && (await keys(p)).length === 0);
    await p.fill("#esCode", codeOf(S(A))); await tap(p, "#esUse"); await p.waitForTimeout(200);
    rec("empty", "pasting a code loads the plan and asks for the start date", await visible(p, "#app") && (await dlgKind(p)) === "start");
    rec("empty", "start date defaults to the coming Monday (Oct 26)", (await p.inputValue("#dlgStart")) === "2026-10-26");
    await tap(p, "#dlgLater");
    rec("empty", "Not now leaves a Set start date banner, no start date stored", await visible(p, "#setStartBanner") && (await L.ls(p, "startDate")) === null);
    await p.reload(); await p.waitForTimeout(300);
    rec("empty", "reload in the same tab does not ask again", (await dlgKind(p)) === null && await visible(p, "#app"));
    await tap(p, "#setStartBanner"); rec("empty", "Set start date banner opens the start dialog", (await dlgKind(p)) === "start");
    await tap(p, "#dlgThisWk"); rec("empty", "This week picks Mon Oct 19", (await p.inputValue("#dlgStart")) === "2026-10-19");
    await tap(p, "#dlgSaveStart");
    rec("empty", "start date saved, week 1, today is Fri of week 1", (await L.ls(p, "startDate")) === "2026-10-19" && (await L.ls(p, "week")) === 1 && /^Fri/.test(await p.textContent("#today h2")));
    rec("empty", "no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close(); }

  // ---- 2. Link on a fresh device, hash kept in a tab, idempotent, persistence ----
  const codeB = codeOf(S(B));
  { const { ctx, p, W } = await page(); await p.goto(url + "#p=" + codeB); await p.waitForTimeout(500);
    rec("link", "link on a fresh device loads the plan and asks for the start date", await visible(p, "#app") && (await dlgKind(p)) === "start");
    rec("link", "the plan is stored under ct1-plan", ((await L.ls(p, "plan")) || {}).meta.name === "Upper lower, 12 weeks");
    await tap(p, "#dlgThisWk"); await tap(p, "#dlgSaveStart");
    if (engine === "webkit") rec("link", "iOS Safari tab: the #p= link stays in the address bar (for Add to Home Screen)", p.url().endsWith("#p=" + codeB));
    else rec("link", "Android tab (v0.1.4): #p= is cleared once the plan is saved", !p.url().includes("#") && (await L.ls(p, "plan") || {}).meta.name === "Upper lower, 12 weeks", p.url().slice(-40));
    await tap(p, "#todayDone");
    const before = await L.dump(p);
    await p.reload(); await p.waitForTimeout(500);
    rec("link", "reload with the same link: no dialog, no change (idempotent)", (await dlgKind(p)) === null && (await L.dump(p)) === before);
    rec("link", "data persists across reload (Done mark kept)", ((await L.ls(p, "done")) || {})["w1-lowerB"] === "done");
    const p2 = await ctx.newPage(); L.watch(p2); await p2.goto(url + "#p=" + codeB); await p2.waitForTimeout(500);
    rec("link", "same link in a new tab: no dialog, nothing changed", (await dlgKind(p2)) === null && (await L.dump(p2)) === before);
    await p2.close();
    // same plan, different encoding (gzip): already loaded, nothing replaced
    await p.goto(url + "#p=" + codeOf(S(B), true)); await p.waitForTimeout(500);
    rec("link", "same plan as a gzip link: says already loaded, plan and log unchanged", (await dlgKind(p)) === null && /already loaded/.test(await p.textContent("#toast")) && JSON.stringify(await L.ls(p, "done")) === JSON.stringify(JSON.parse(JSON.parse(before).find(r => r[0] === "ct1-done")[1])));
    // a different plan asks before replacing
    const before2 = await L.dump(p);
    await p.goto(url + "#p=" + codeOf(S(Cc))); await p.waitForTimeout(500);
    rec("link", "different plan link on a device with a plan asks before replacing", (await dlgKind(p)) === "replace" && /Upper lower, 12 weeks/.test(await p.textContent("#dlg")) && /Five day split/.test(await p.textContent("#dlg")));
    rec("link", "nothing replaced while the question is open", JSON.stringify(await L.ls(p, "plan")) === JSON.parse(before2).find(r => r[0] === "ct1-plan")[1]);
    await tap(p, "#dlgKeep");
    rec("link", "Keep current plan keeps the plan and log", JSON.stringify(await L.ls(p, "plan")) === JSON.parse(before2).find(r => r[0] === "ct1-plan")[1] && JSON.stringify(await L.ls(p, "done")) === JSON.parse(before2).find(r => r[0] === "ct1-done")[1]);
    await p.reload(); await p.waitForTimeout(500);
    rec("link", "after Keep, a reload with that link does not ask again", (await dlgKind(p)) === null);
    const before3 = await L.dump(p);
    await p.goto(url + "#p=" + codeOf(S(E))); await p.waitForTimeout(500);
    await tap(p, "#dlgUse");
    rec("link", "Use new plan replaces the plan and keeps the log", ((await L.ls(p, "plan")) || {}).meta.name === "Push pull legs, six days" && JSON.stringify(await L.ls(p, "done")) === JSON.parse(before3).find(r => r[0] === "ct1-done")[1] && (await L.ls(p, "startDate")) === "2026-10-19");
    rec("link", "replace shows a 10s Undo", await visible(p, "#toastUndo"));
    await tap(p, "#toastUndo");
    const after3 = JSON.parse(await L.dump(p)).filter(r => r[0] !== "ct1-seen"), b3 = JSON.parse(before3).filter(r => r[0] !== "ct1-seen");
    rec("link", "Undo restores the old plan and log byte for byte", JSON.stringify(after3) === JSON.stringify(b3));
    rec("link", "only ct1- data keys exist", (await keys(p)).every(k => KEYSET.includes(k)), (await keys(p)).join(","));
    rec("link", "no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close(); }

  // ---- 3. Standalone (Home Screen app) clears the hash; inline inflate fallback ----
  { const { ctx, p, W } = await page({ standalone: true }); await p.goto(url + "#p=" + codeB); await p.waitForTimeout(500);
    rec("standalone", "Home Screen mode loads the plan and clears #p= with replaceState", await visible(p, "#app") && !/#/.test(p.url()) && (await p.evaluate(() => location.hash)) === "", p.url().slice(-40));
    rec("standalone", "no Add to Home Screen note inside the Home Screen app", !/Home Screen first/.test(await p.textContent("#dlg")));
    rec("standalone", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }
  { const { ctx, p, W } = await page(); await p.goto(url); await p.waitForTimeout(200);
    const ds = await p.evaluate(() => { try { return typeof DecompressionStream === "function" && !!new DecompressionStream("deflate-raw"); } catch (e) { return "throws " + e.message; } });
    rec("codec", `this engine has DecompressionStream("deflate-raw"): ${ds}`, true);
    const v = await p.evaluate(c => window.__ct.decodePlan(c), codeB);
    rec("codec", `decoder path in this engine: ${v.via}`, v.ok && /^stream/.test(v.via), JSON.stringify(v));
    await ctx.close(); }
  { const { ctx, p, W } = await page({ noStream: true }); await p.goto(url + "#p=" + codeB); await p.waitForTimeout(500);
    const v = await p.evaluate(c => window.__ct.decodePlan(c), codeB);
    rec("codec", "with no DecompressionStream the built-in inflate loads the link", await visible(p, "#app") && v.ok && /^inline/.test(v.via), JSON.stringify(v));
    const g = await p.evaluate(c => window.__ct.decodePlan(c), codeOf(S(B), true));
    rec("codec", "built-in inflate also reads gzip links", g.ok && /^inline/.test(g.via), JSON.stringify(g));
    rec("codec", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  // ---- 4. Bad links: friendly error, nothing overwritten (fresh device and device with a plan) ----
  const mut = f => { const x = S(B); f(x); return codeOf(x); };
  const bad = [
    ["truncated link", codeB.slice(0, Math.floor(codeB.length * 0.6)), /damaged/],
    ["one character cut off", codeB.slice(0, -1), /damaged/],
    ["no main lift on a day", mut(x => { x.blocks["1"].upperA[0].tags = []; }), /mistakes/],
    ["unknown tag", mut(x => { x.blocks["1"].upperA[1].tags = ["forearm"]; }), /mistakes/],
    ["newer plan format", mut(x => { x.schema = 2; }), /newer tracker/],
    ["too large", "A".repeat(45000), /too large/],
    ["decompresses too large", require("zlib").deflateRawSync(Buffer.from('{"meta":"' + "x".repeat(400000) + '"}')).toString("base64url"), /too large/],
    ["not base64", "%%%%", /damaged/]
  ];
  for (const withPlan of [false, true]) {
    const tag = withPlan ? "bad link, with a plan" : "bad link, fresh device";
    const seed = withPlan ? L.seedFor(B, { done: { "w5-upperA": "done" } }) : null;
    const { ctx, p, W } = await page(seed ? { seed } : {}); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p);
    for (const [nm, c, re] of bad) {
      await p.goto(url + "#p=" + c); await p.waitForTimeout(400);
      const t = ((await p.textContent("#dlgTitle")) || "").trim(), det = (await p.locator("#dlg .err-text").first().textContent({ timeout: 2000 }).catch(() => "")) || "";
      rec(tag, `${nm}: friendly error, details say "${det.split("\n")[0]}"`, (await dlgKind(p)) === "error" && /^This plan link didn.t work$/.test(t) && re.test(det) && /Nothing on this device was changed/.test(await p.textContent("#dlg")), t + " / " + det);
      rec(tag, `${nm}: nothing overwritten`, (await L.dump(p)) === before && (withPlan ? await visible(p, "#app") : await visible(p, "#emptyState")));
      const g = await p.evaluate(() => { const r = document.getElementById("dlg").getBoundingClientRect(), o = document.getElementById("dlgOk").getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ok: [o.width, o.height, o.bottom], ih: innerHeight }; });
      if (nm === "unknown tag") rec(tag, "error dialog near the top, OK >= 44px, above the bottom zone; details list the problem", g.top <= 90 && g.ok[0] >= 44 && g.ok[1] >= 44 && g.ok[2] <= g.ih - 50 && /forearm/.test(await p.textContent("#dlg")), JSON.stringify(g));
      await tap(p, "#dlgOk");
    }
    rec(tag, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }
  // stored data from a newer tracker, or a damaged stored plan
  { const seed = L.seedFor(B, { schema: 2 }); const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p);
    rec("storage", "data from a newer tracker: friendly error, nothing shown or written", (await dlgKind(p)) === "error" && /newer tracker/.test(await p.textContent("#dlgTitle")));
    await tap(p, "#dlgOk"); await p.goto(url + "#p=" + codeOf(S(A))); await p.waitForTimeout(400);
    rec("storage", "a link cannot overwrite newer data", (await L.dump(p)) === before);
    await ctx.close(); }
  /* v0.1.3 (Security nit): on a read-only device, pasting a plan and picking a past start date shows the leftover line
     in memory, but must not delete the newer tracker's hidden-line flag (or write anything else) */
  { const seed = L.seedFor(B, { schema: 2, weekNoteHidden: { week: 1, start: "2026-01-05" } }); const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p);
    await tap(p, "#dlgOk"); await p.fill("#esCode", codeOf(S(B))); await tap(p, "#esUse"); await p.waitForTimeout(300);
    let saw = false;
    if ((await dlgKind(p)) === "start") { await p.fill("#dlgStart", "2026-09-21"); await tap(p, "#dlgSaveStart"); await p.waitForTimeout(400); saw = await visible(p, "#weekNote .wk-row"); }
    rec("storage", "read-only device: the leftover line can show, but the stored hidden-line flag and all data stay byte for byte", saw && (await L.dump(p)) === before && W.errs.length === 0, JSON.stringify({ saw, same: (await L.dump(p)) === before, errs: W.errs }));
    await ctx.close(); }
  { const seed = L.seedFor(B); seed.plan = { meta: { name: "x" } }; const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p);
    rec("storage", "damaged saved plan: friendly error, log kept", (await dlgKind(p)) === "error" && /could not be read/.test(await p.textContent("#dlgTitle")) && (await L.dump(p)) === before);
    await ctx.close(); }

  // ---- 5. Update plan keeps data, maps by stable day and lift ids, archives removed parts; Undo ----
  for (const [w, h] of [[390, 844], [951, 669]]) {
    const size = `update ${w}x${h}`;
    const seed = L.seedFor(B, { progView: "lifts", done: { "w5-upperA": "done", "w5-lowerA": "skip", "w5-upperB": "done", "w3-lowerB": "done" }, openDays: { "w5-upperA": true },
      lifts: [{ id: "l1", liftId: "front-squat", lift: "Front squat", weight: "155", wu: "lb", reps: "5", date: "2026-10-06" }, { id: "l2", liftId: "back-squat", lift: "Back squat", weight: "225", wu: "lb", reps: "5", date: "2026-10-20" }],
      body: [{ id: "b1", date: "2026-10-19", weight: "180", wu: "lb", waist: "34", lu: "in" }] });
    const { ctx, p, W } = await page({ seed }, w, h); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p), get = (d, k) => JSON.parse(d).find(r => r[0] === "ct1-" + k)[1];
    const v2 = S(B); v2.meta.name = "Upper lower, version 2";
    v2.days[3] = { key: "rest", label: "Rest", short: "Thu", rest: true, note: "Mobility" };     // Upper B removed
    v2.days[5] = Object.assign({}, S(B).days[4], { short: "Sat" }); v2.days[4] = { key: "rest", label: "Rest", short: "Fri", rest: true }; // Lower B moves Fri -> Sat
    for (const bl of Object.values(v2.blocks)) { delete bl.upperB; bl.upperA[1].name = "Cable row"; }
    v2.lifts = v2.lifts.filter(x => x !== "Front squat");
    if (w < 820) { await tap(p, "#openPlan"); await p.waitForTimeout(320); }
    await tap(p, "#btnMore"); await tap(p, "#btnUpdate");
    await p.fill("#updCode", "garbage!!"); await tap(p, "#updUse");
    rec(size, "bad code in Update plan: inline error, nothing changed", await visible(p, "#updErr") && (await L.dump(p)) === before);
    await p.fill("#updCode", codeOf(S(B))); await tap(p, "#updUse");
    rec(size, "same plan in Update plan: says already loaded, nothing changed", /already loaded/.test(await p.textContent("#updOk")) && (await L.dump(p)) === before);
    const ub = await p.evaluate(() => { const r = document.getElementById("updUse").getBoundingClientRect(); return [r.width, r.height, r.bottom, innerHeight]; });
    rec(size, "Update plan buttons >= 44px and above the bottom zone", ub[0] >= 44 && ub[1] >= 44 && ub[2] <= ub[3] - 50, JSON.stringify(ub));
    await p.fill("#updCode", "https://example.org/tracker/#p=" + codeOf(v2)); await tap(p, "#updUse"); await p.waitForTimeout(200);
    const after = await L.dump(p);
    rec(size, "Update plan applies the new plan", (JSON.parse(get(after, "plan")).meta.name) === "Upper lower, version 2");
    rec(size, "Update plan keeps every logged day, lift and weigh-in byte for byte", ["done", "openDays", "lifts", "body", "startDate", "week"].every(k => get(after, k) === get(before, k)));
    rec(size, "moved day keeps its marks (Lower B now on Sat)", /Lower B/.test(await p.textContent("#panel-train")) && (await p.evaluate(() => { const r = [...document.querySelectorAll("#panel-train .day")].find(d => /Lower B/.test(d.textContent)); return r && /SAT/i.test(r.textContent); })));
    rec(size, "removed day is not counted (3 training days now)", /of\s3\ssessions/.test(await p.textContent("#panel-train")), String((await p.textContent("#panel-train")).match(/\d\sof\s\d\ssessions/)));
    rec(size, "Update plan shows a 10s Undo", await visible(p, "#toastUndo"));
    await p.locator("#toastUndo").tap().catch(() => {}); await p.waitForTimeout(200);
    const undone = JSON.parse(await L.dump(p)).filter(r => !["ct1-seen", "ct1-tab", "ct1-progView"].includes(r[0])), bb = JSON.parse(before).filter(r => !["ct1-seen", "ct1-tab", "ct1-progView"].includes(r[0]));
    rec(size, "Undo restores the old plan and log byte for byte", JSON.stringify(undone) === JSON.stringify(bb));
    /* v0.1.1: any other tap dismisses the Undo toast, so the Archived check re-applies v2 by link after the Undo check */
    await p.goto(url + "#p=" + codeOf(v2)); await p.waitForTimeout(500); await tap(p, "#dlgUse"); await p.waitForTimeout(200);
    await tap(p, '.tab[data-tab="progress"]'); await p.waitForTimeout(100);
    if (await p.locator('[data-pview="lifts"]').count()) await tap(p, '[data-pview="lifts"]');
    const prog = await p.textContent("#panel-progress");
    rec(size, "removed lift entry stays and shows Archived", /Front squat/.test(prog) && /Archived/.test(prog), prog.slice(0, 160));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close();
  }

  { // a plan with fewer weeks and days: week clamps, every log entry stays (spec must-test 4)
    const seed = L.seedFor(B, { week: 10, startDate: "2026-08-17", done: { "w10-upperA": "done", "w2-lowerB": "skip" }, lifts: [{ id: "l2", liftId: "bench-press", lift: "Bench press", weight: "185", wu: "lb", reps: "5", date: "2026-10-20" }] });
    const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(300);
    const before = await L.dump(p), get = (d, k) => JSON.parse(d).find(r => r[0] === "ct1-" + k)[1];
    await tap(p, "#openPlan"); await p.waitForTimeout(320); await tap(p, "#btnMore"); await tap(p, "#btnUpdate");
    await p.fill("#updCode", codeOf(S(A))); await tap(p, "#updUse"); await p.waitForTimeout(200);
    const after = await L.dump(p);
    rec("update 12w to 8w", "week clamps to the new last week (8) with the plan-complete note, log entries kept", (await L.ls(p, "week")) === 8 && /Plan complete/.test(await p.textContent("#weekNote")) && ["done", "lifts", "body", "startDate"].every(k => get(after, k) === get(before, k)));
    rec("update 12w to 8w", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  // ---- 6. Export then Import is byte-exact; bad files change nothing ----
  { const seed = L.seedFor(B, { done: { "w5-upperA": "done", "w4-upperB": "skip" }, lifts: [{ id: "l2", liftId: "back-squat", lift: "Back squat", weight: "225", wu: "lb", reps: "5", date: "2026-10-20" }], body: [{ id: "b1", date: "2026-10-19", weight: "180", wu: "lb", waist: "", lu: "in" }], seen: ["abc"] });
    const { ctx, p, W } = await page({ seed }); await p.goto(url); await p.waitForTimeout(300);
    await tap(p, "#openPlan"); await p.waitForTimeout(320); await tap(p, "#btnMore");
    const exported = await L.dump(p);
    const [dl] = await Promise.all([p.waitForEvent("download"), tap(p, "#btnExport")]);
    const file = L.path.join("/tmp", "ct-gate-export-" + engine + ".json"); await dl.saveAs(file);
    const ex = JSON.parse(L.fs.readFileSync(file, "utf8"));
    rec("export", "Export file is a tracker backup with every data key", ex.app === "coach-tracker" && ex.schema === 1 && Object.keys(ex.data).length === JSON.parse(exported).length);
    rec("export", "Export file holds only the stored data keys and app fields, nothing else", JSON.stringify(Object.keys(ex).sort()) === '["app","data","exportedAt","schema","version"]' &&
      JSON.stringify(Object.entries(ex.data).map(([k, v]) => ["ct1-" + k, JSON.stringify(v)]).sort()) === exported);
    // change things, then import the export
    await p.evaluate(() => { localStorage.setItem("ct1-week", "9"); localStorage.setItem("ct1-done", "{}"); }); await p.reload(); await p.waitForTimeout(300);
    const changed = await L.dump(p);
    await tap(p, "#openPlan"); await p.waitForTimeout(320); await tap(p, "#btnMore");
    const [fc] = await Promise.all([p.waitForEvent("filechooser"), tap(p, "#btnImport")]); await fc.setFiles(file); await p.waitForTimeout(300);
    rec("export", "Import asks first and names the file", (await dlgKind(p)) === "import" && /ct-gate-export/.test(await p.textContent("#dlgTitle")) && (await L.dump(p)) === changed);
    await tap(p, "#icReplace"); await p.waitForTimeout(200);
    rec("export", "Export then Import is byte-exact", (await L.dump(p)) === exported);
    await p.locator("#toastUndo").tap(); await p.waitForTimeout(200);
    rec("export", "Undo after Import restores the previous data byte for byte", (await L.dump(p)) === changed);
    for (const [nm, buf, re] of [["not JSON", "hello", /could not be read/], ["another app's file", JSON.stringify({ version: 1, week: 2 }), /not a tracker backup/], ["newer backup", JSON.stringify(Object.assign({}, ex, { schema: 9 })), /newer tracker/], ["damaged plan", JSON.stringify(Object.assign({}, ex, { data: Object.assign({}, ex.data, { plan: { meta: {} } }) })), /mistakes/]]) {
      const [fc2] = await Promise.all([p.waitForEvent("filechooser"), tap(p, "#btnImport")]); await fc2.setFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from(buf) }); await p.waitForTimeout(300);
      rec("export", `Import of ${nm}: friendly error, nothing changed`, (await dlgKind(p)) === "error" && re.test(await p.textContent("#dlgTitle")) && (await L.dump(p)) === changed, await p.textContent("#dlgTitle"));
      await tap(p, "#dlgOk");
    }
    rec("export", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  // ---- 7. Logging: weigh-in and top set in the plan's units, delete with Undo, survives reload ----
  { const seed = L.seedFor(Cc); const { ctx, p, W } = await page({ seed }, 951, 669); await p.goto(url); await p.waitForTimeout(300);
    await tap(p, '.tab[data-tab="progress"]'); await tap(p, '[data-pview="body"]');
    rec("log", "weigh-in uses the plan's units (kg)", /Weight \(kg\)/.test(await p.textContent("#panel-progress")));
    await p.fill("#bodyWeight", "82.5"); await tap(p, "#addBody");
    const bd = await L.ls(p, "body");
    rec("log", "Log weigh-in stores one row in kg", bd.length === 1 && bd[0].weight === "82.5" && bd[0].wu === "kg" && bd[0].date === "2026-10-23", JSON.stringify(bd));
    await tap(p, '[data-pview="lifts"]');
    const opts = await p.evaluate(() => [...document.querySelectorAll("#liftName option")].map(o => o.value + "=" + o.textContent));
    rec("log", "lift picker lists the plan's lifts by id", opts.join(",") === "bench-press=Bench press,back-squat=Back squat,deadlift=Deadlift,overhead-press=Overhead press,pull-up=Pull-up", opts.join(","));
    await p.selectOption("#liftName", "deadlift"); await p.fill("#liftWeight", "140"); await p.fill("#liftReps", "5"); await tap(p, "#addLift");
    const lf = await L.ls(p, "lifts");
    rec("log", "Add top set stores lift id, name, weight, unit, reps and date", lf.length === 1 && lf[0].liftId === "deadlift" && lf[0].lift === "Deadlift" && lf[0].weight === "140" && lf[0].wu === "kg" && lf[0].reps === "5", JSON.stringify(lf));
    await tap(p, "[data-del-lift]");
    rec("log", "delete top set, then Undo brings it back", (await L.ls(p, "lifts")).length === 0 && await visible(p, "#toastUndo"));
    await tap(p, "#toastUndo"); rec("log", "Undo restored the top set", (await L.ls(p, "lifts")).length === 1);
    await p.reload(); await p.waitForTimeout(300);
    rec("log", "weigh-in and top set survive a reload, Progress tab remembered", (await L.ls(p, "lifts")).length === 1 && (await L.ls(p, "body")).length === 1 && (await L.ls(p, "tab")) === "progress");
    rec("log", "no errors", W.errs.length === 0, W.errs.join(" | ")); await ctx.close(); }

  // ---- 8. Every sample loads from its link and lays out at slab, Duo outer and Duo inner ----
  for (const s of L.SAMPLES) for (const [w, h] of [[334, 835], [390, 844], [382, 644], [951, 669]]) {
    const size = `${s} ${w}x${h}`;
    const { ctx, p, W } = await page({}, w, h); await p.goto(url + "#p=" + codeOf(S(s))); await p.waitForTimeout(500);
    await tap(p, "#dlgThisWk"); await tap(p, "#dlgSaveStart");
    const r = await p.evaluate(() => { const small = [...document.querySelectorAll("#app button, #app select, #app input")].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.height && getComputedStyle(e).visibility !== "hidden" && (q.width < 43.5 || q.height < 43.5); }).map(e => e.className + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height));
      return { small, ov: document.documentElement.scrollWidth - innerWidth, pills: document.querySelectorAll(".spine-pill").length, strip: document.querySelectorAll("[data-strip]").length }; });
    const n = L.norm(S(s));
    rec(size, "loads, week grid has every week, strip has 7 days", await visible(p, "#app") && r.pills === n.meta.weeks && r.strip === 7, JSON.stringify(r));
    rec(size, "every control >= 44px, no horizontal overflow", r.small.length === 0 && r.ov <= 0, JSON.stringify(r));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }
  { // deload week banner (sample c, week 5)
    const { ctx, p } = await page({ seed: L.seedFor(Cc, { week: 5 }) }); await p.goto(url); await p.waitForTimeout(300); await tap(p, "#openPlan"); await p.waitForTimeout(320);
    rec("deload", "sample c week 5 shows its deload note", /cut every exercise to two sets/.test(await p.textContent("#panel-train"))); await ctx.close(); }

  // ---- 9. Privacy: no request carries plan data ----
  const flat = reqsAll.flat();
  const leaks = flat.filter(r => [...allCodes].some(c => r.url.includes(c.slice(0, 40)) || r.body.includes(c.slice(0, 40)) || r.referer.includes(c.slice(0, 40))) || /p=/.test(r.url.split("#")[0]) || r.body.length);
  rec("privacy", `no request URL, body or referrer carries plan data (${flat.length} requests checked)`, leaks.length === 0, leaks.slice(0, 3).map(r => r.method + " " + r.url.slice(0, 80)).join(" | "));
  const hosts = [...new Set(flat.map(r => { try { return new URL(r.url).host; } catch (e) { return r.url.slice(0, 20); } }))];
  rec("privacy", `requests go only to the tracker's own host (${hosts.join(", ")})`, hosts.length === 1 && hosts[0] === new URL(url).host, hosts.join(","));
  if (T.log) { const sl = T.log.filter(r => [...allCodes].some(c => (r.url + r.body).includes(c.slice(0, 40)))); rec("privacy", `server log: ${T.log.length} requests, none with plan data, none with a Referer`, sl.length === 0 && T.log.every(r => !r.headers.referer), JSON.stringify(sl.slice(0, 2))); }

  await b.close(); T.close();
  console.log(rows.join("\n"));
  console.log(`behavior ${engine} ${fails() ? "FAILED " + fails() : "ALL PASS"} (${rows.length} checks)`);
  process.exit(fails() ? 1 : 0);
})().catch(e => { console.log(rows.join("\n")); console.error(e); process.exit(1); });
