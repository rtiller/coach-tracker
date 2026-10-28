/* v0.1.4 Android address bar gate (Security Q2 and Q4, reviews/android-homescreen-security.md):
   node test/gate-android.js <webkit|chromium> [url]
   chromium (Android: no navigator.standalone):
     1. a fresh link loads, saves and then leaves the address bar with replaceState (no new history entry, no "#" left);
        the same link again, the same plan in another encoding, Use new plan: cleared once saved; a bad link, the replace
        prompt still open, Keep current plan and a failed save keep it.
     2. Q4: no <link rel="manifest"> in the HTML or added by script, no manifest request, and no off-device request URL
        (raw CDP Network events, which also see data: URLs: the URL as sent, any subresource's urlFragment, the Referer) contains "#".
        CDP lists the page's own navigation fragment as urlFragment; the browser never sends it (the server log checks the
        request lines and Referers too).
   webkit (iOS Safari: navigator.standalone false in a tab): the #p= link stays in the address bar after the save and the
     start date, as in v0.1.3.4; the Home Screen app still clears it; no manifest link or request.
   Both: the CSP is byte-identical to v0.1.3.4-preview. Mutations (served copies of this build): clearing before the save,
   pushState instead of replaceState, and no iOS test must each fail. */
const L = require("./lib");
const http = require("http"), { execSync } = require("child_process");
const { rows, rec, fails } = L.makeRec();
const A = "a-3day-beginner-full-body", B = "b-4day-upper-lower";
const HTML = L.fs.readFileSync(L.path.join(L.ROOT, "index.html"), "utf8");
const CSP = h => (h.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [""])[0];
function serveHtml(html) {
  const log = [];
  const srv = http.createServer((req, res) => { log.push({ url: req.url, headers: req.headers }); const u = req.url.split("?")[0];
    if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", log, close: () => srv.close() })));
}
/* split/join: the page carries its own source a second time (Get your own copy), so every copy is changed */
const MUT = {
  "clear before the save": h => h.split('if (isStandalone() || !KEEP_LINK_IN_TAB) clearHash();').join('if (isStandalone() || !KEEP_LINK_IN_TAB || !("standalone" in window.navigator)) clearHash();'),
  "pushState instead of replaceState": h => h.split('history.replaceState(null, "", window.location.pathname + window.location.search)').join('history.pushState(null, "", window.location.pathname + window.location.search)'),
  "no iOS test": h => h.split('if ("standalone" in window.navigator) return;').join("")
};
(async () => {
  const T = await L.target(process.argv.slice(2)), engine = T.engine, b = await L.launch(engine);
  const codeA = L.code(L.norm(L.readSample(A))), codeB = L.code(L.norm(L.readSample(B))), codeBgz = L.code(L.norm(L.readSample(B)), true);
  const dlgKind = p => p.evaluate(() => { const d = document.getElementById("dlg"); return d.hidden ? null : d.dataset.kind; });
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(200); };
  const st = p => p.evaluate(() => ({ url: location.href, hash: location.hash, len: history.length - window.__len0, push: window.__push, plan: (JSON.parse(localStorage.getItem("ct1-plan") || "null") || { meta: {} }).meta.name || null }));
  async function page(opts = {}) {
    const ctx = await L.context(b, engine, 390, 844, opts), p = await ctx.newPage(), W = L.watch(p), cdp = [];
    await ctx.addInitScript(() => { window.__len0 = history.length; window.__push = 0; const ps = history.pushState; history.pushState = function () { window.__push++; return ps.apply(this, arguments); }; });
    if (engine === "chromium") { const s = await ctx.newCDPSession(p); await s.send("Network.enable"); s.on("Network.requestWillBeSent", e => cdp.push({ url: e.request.url, frag: e.request.urlFragment || "", referer: (e.request.headers || {}).Referer || "", type: e.type })); }
    return { ctx, p, W, cdp };
  }
  /* the Android checks against a served build; returns the failures (the real build must have none) */
  async function android(u, tag) {
    const out = []; const R = (name, ok, info) => { if (tag) rec("chromium", name, ok, info); if (!ok) out.push(name); };
    { const { ctx, p, W, cdp } = await page(); await p.goto(u + "#p=" + codeB); await p.waitForTimeout(600);
      const s = await st(p);
      R("fresh link: the plan is saved and asks for the start date", s.plan === "Upper lower, 12 weeks" && (await dlgKind(p)) === "start", JSON.stringify(s));
      R("fresh link: #p= gone from the address bar once saved, no '#' left", s.hash === "" && !s.url.includes("#"), s.url.slice(-30));
      R("fresh link: replaceState, no new history entry", s.len === 0 && s.push === 0, JSON.stringify([s.len, s.push]));
      await tap(p, "#dlgThisWk"); await tap(p, "#dlgSaveStart");
      R("start date saved, address bar still clean", (await L.ls(p, "startDate")) === "2026-10-19" && !(await st(p)).url.includes("#"));
      await p.goto(u + "#p=" + codeB); await p.waitForTimeout(600); let t = await st(p);
      R("the same link again (already handled): cleared, no dialog, plan kept", !t.url.includes("#") && (await dlgKind(p)) === null && t.plan === "Upper lower, 12 weeks", t.url.slice(-30));
      await p.goto(u + "#p=" + codeBgz); await p.waitForTimeout(600); t = await st(p);
      R("the same plan in another encoding: cleared", !t.url.includes("#"), t.url.slice(-30));
      await p.goto(u + "#p=" + codeA); await p.waitForTimeout(600); t = await st(p);
      R("a different plan: kept while the replace prompt is open (nothing saved yet)", (await dlgKind(p)) === "replace" && t.hash === "#p=" + codeA, t.url.slice(-30));
      await tap(p, "#dlgKeep"); t = await st(p);
      R("Keep current plan: kept (the link's plan was not saved)", t.hash === "#p=" + codeA && t.plan === "Upper lower, 12 weeks", t.url.slice(-30));
      await p.goto(u); await p.waitForTimeout(300); await p.goto(u + "#p=" + codeA + "x"); await p.waitForTimeout(600);
      const codeA2 = L.code(Object.assign({}, L.norm(L.readSample(A)), { meta: Object.assign({}, L.norm(L.readSample(A)).meta, { name: "Full body v2" }) }));
      await p.goto(u); await p.waitForTimeout(300); await p.goto(u + "#p=" + codeA2); await p.waitForTimeout(600);
      R("another plan: replace prompt", (await dlgKind(p)) === "replace");
      await tap(p, "#dlgUse"); t = await st(p);
      R("Use new plan: saved, then cleared", t.plan === "Full body v2" && !t.url.includes("#"), JSON.stringify(t).slice(0, 120));
      R("no errors", W.errs.length === 0, W.errs.join(" | "));
      /* Q4 */
      const dom = await p.evaluate(() => ({ link: !!document.querySelector('link[rel~="manifest" i]'), any: document.documentElement.outerHTML.toLowerCase().includes('rel="manifest"') }));
      R("Q4: no manifest link in the DOM after load, links, prompts and a replace", !dom.link && !dom.any, JSON.stringify(dom));
      const off = cdp.filter(r => !/^(data|blob|about):/.test(r.url));
      R("Q4: no manifest request (CDP, every URL incl. data:)", !cdp.some(r => r.type === "Manifest" || /manifest/i.test(r.url)), JSON.stringify(cdp.map(r => r.type + " " + r.url.slice(0, 60))));
      R("Q4: no off-device request URL or Referer contains '#' (CDP url, urlFragment, Referer)", off.length > 0 && off.every(r => !r.url.includes("#") && (r.type === "Document" || !r.frag) && !r.referer.includes("#")), JSON.stringify(off.filter(r => r.url.includes("#") || (r.type !== "Document" && r.frag) || r.referer.includes("#")).map(r => [r.url.slice(0, 50), r.frag.slice(0, 20), r.referer.slice(-30)])));
      await ctx.close(); }
    { const { ctx, p } = await page(); await p.goto(u + "#p=" + codeB + "!!"); await p.waitForTimeout(600); const t = await st(p);
      R("a bad link: kept (nothing saved), the error shows", t.hash.startsWith("#p=") && t.plan === null && (await dlgKind(p)) !== null, JSON.stringify(t).slice(0, 120));
      await ctx.close(); }
    { const { ctx, p } = await page(); await ctx.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "ct1-plan") throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); }; });
      await p.goto(u + "#p=" + codeB); await p.waitForTimeout(600); const t = await st(p);
      R("a failed save (storage full): the link stays in the address bar", t.hash === "#p=" + codeB && t.plan === null, JSON.stringify(t).slice(0, 120));
      await ctx.close(); }
    return out;
  }
  const S = await serveHtml(HTML);
  rec(engine, "CSP byte-identical to v0.1.3.4-preview", CSP(HTML) && CSP(HTML) === CSP(execSync("git show v0.1.3.4-preview:index.html", { cwd: L.ROOT }).toString()), CSP(HTML));
  rec(engine, "Q4: no manifest link in the shipped HTML", !/rel\s*=\s*["']?manifest/i.test(HTML) && !/manifest-src/.test(HTML));
  if (engine === "chromium") {
    await android(S.url, true);
    rec("chromium", "Q4: the server saw no manifest request and no '#' in any request line or Referer", !S.log.some(r => /manifest/i.test(r.url) || r.url.includes("#") || (r.headers.referer || "").includes("#")), JSON.stringify(S.log.map(r => r.url)));
    for (const [name, f] of Object.entries(MUT)) { if (name === "no iOS test") continue; /* an iOS mutation: checked in webkit */
      const h = f(HTML); if (h === HTML) { rec("mutation", name + ": applied", false, "pattern not found"); continue; }
      const M = await serveHtml(h); const bad = await android(M.url, false); M.close();
      rec("mutation", name + ": must fail the Android checks (" + bad.length + " fail)", bad.length > 0, "nothing failed");
    }
  } else {
    async function ios(u, tag) {
      const out = []; const R = (name, ok, info) => { if (tag) rec("webkit", name, ok, info); if (!ok) out.push(name); };
      { const { ctx, p, W } = await page(); await p.goto(u + "#p=" + codeB); await p.waitForTimeout(600);
        R("iOS emulation: navigator.standalone is false in a tab", await p.evaluate(() => "standalone" in navigator && navigator.standalone === false));
        let t = await st(p);
        R("iOS Safari tab: the plan is saved and #p= stays in the address bar", t.plan === "Upper lower, 12 weeks" && t.hash === "#p=" + codeB, t.url.slice(-30));
        R("iOS Safari tab: the start prompt keeps its Home Screen line", /Add it first, then set your date there/.test(await p.evaluate(() => (document.getElementById("dlgHsNote") || {}).textContent || "")));
        await tap(p, "#dlgThisWk"); await tap(p, "#dlgSaveStart"); t = await st(p);
        R("iOS Safari tab: still there after the start date is saved", t.hash === "#p=" + codeB);
        await p.reload(); await p.waitForTimeout(600); t = await st(p);
        R("iOS Safari tab: still there after a reload (link already handled)", t.hash === "#p=" + codeB && (await dlgKind(p)) === null);
        const dom = await p.evaluate(() => !!document.querySelector('link[rel~="manifest" i]'));
        R("Q4: no manifest link in the DOM", !dom); R("no errors", W.errs.length === 0, W.errs.join(" | "));
        await ctx.close(); }
      { const { ctx, p } = await page({ standalone: true }); await p.goto(u + "#p=" + codeB); await p.waitForTimeout(600); const t = await st(p);
        R("iOS Home Screen app: loads the plan and clears #p= (unchanged)", t.plan === "Upper lower, 12 weeks" && t.hash === "", t.url.slice(-30));
        await ctx.close(); }
      return out;
    }
    await ios(S.url, true);
    rec("webkit", "Q4: the server saw no manifest request and no '#' in any request line or Referer", !S.log.some(r => /manifest/i.test(r.url) || r.url.includes("#") || (r.headers.referer || "").includes("#")), JSON.stringify(S.log.map(r => r.url)));
    const M = await serveHtml(MUT["no iOS test"](HTML)); const bad = await ios(M.url, false); M.close();
    rec("mutation", "no iOS test: must fail the iOS checks", bad.length > 0, bad.join(" | ") || "nothing failed");
  }
  S.close(); await b.close(); T.close();
  console.log(rows.join("\n")); console.log(`\n${rows.length} checks, ${fails()} failed (${engine})`); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
