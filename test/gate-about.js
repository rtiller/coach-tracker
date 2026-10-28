/* v0.1.3.3 About and your data, Get your own copy, zero requests, repo intake files.
   node test/gate-about.js <webkit|chromium> [url]
   With a url (the published page) it also runs a cold load with a plan in the link and fails on ANY request other than
   the page itself (a host-injected script, pixel or font fails it), or on a request URL holding the # payload or plan text.
   1. About opens from More only (never from the main screen) in every layout, holds every sentence, closes cleanly.
   2. After a seeded session (plan, logs, Skip + Undo) Get your own copy downloads the shipped index.html byte for byte
      (no normalization), with no stored key or value and none of the fixture's data in it.
   3. A whole session (link load, About, Get your own copy, Export, Import, Undo) makes exactly one request, the page,
      and no fetch/XHR/beacon/socket call and no CSP violation inside the page. A build whose copy button calls
      fetch(location.href) must fail this check (mutation).
   4. The CSP meta is byte-identical to v0.1.3.2; the only absolute URLs in the file are the SVG namespace and the repo link.
   5. The issue forms parse (python3 yaml), carry the required privacy checkbox, have no upload field and no prompt for
      files or exports; config.yml has blank_issues_enabled false and no contact_links; SECURITY.md is 5 lines. */
const L = require("./lib");
const http = require("http"), { execFileSync } = require("child_process");
const { fs, path } = L;
const B = "b-4day-upper-lower";
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'" />`;
const REPO = "https://github.com/rtiller/coach-tracker";
/* v0.1.4.2: the exact version this build ships (was: any "v<digit>" string), shown in About and in the file's head comment */
const VERSION = "v0.1.4.3-preview";
const COPY = ["About", "Your data stays here",
  "Your plan and logs stay in this browser's storage on this device. Nothing leaves it unless you export or share your link.",
  "No accounts and no analytics. This site only delivers the blank page, and your plan fills it in right here.",
  "Your plan lives after the # in your link. Browsers never send that part to the server.",
  "Clearing site data, or closing a private window, deletes your plan and logs. Export now and then to keep a backup.",
  "Your own copy", "Get your own copy", "Downloads this whole app as one file, with no plan and no data in it.",
  "Host it yourself: put the file on any static host, such as GitHub Pages, or open it straight from your device.",
  "A new address starts empty. Use Export here first, then Import on your copy.",
  "Source code on GitHub", "Provided as is, with no support guaranteed."];
/* in-page record of every way a page could reach out, plus CSP violations (a CSP-blocked fetch never shows as a request) */
const HOOK = () => { const log = window.__net = []; const wrap = (o, k) => { const f = o[k]; if (typeof f !== "function") return; o[k] = function () { log.push(k + " " + String(arguments[0])); return f.apply(this, arguments); }; };
  wrap(window, "fetch"); wrap(navigator, "sendBeacon"); const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u) { log.push("xhr " + u); return xo.apply(this, arguments); };
  ["WebSocket", "EventSource"].forEach(k => { const C = window[k]; if (C) window[k] = function (u) { log.push(k + " " + u); return new C(u); }; });
  document.addEventListener("securitypolicyviolation", e => log.push("csp " + e.violatedDirective + " " + e.blockedURI)); };
function serve(html) {
  const srv = http.createServer((req, res) => { const u = req.url.split("?")[0]; if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); } else { res.writeHead(404); res.end(); } });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", close: () => srv.close() })));
}
(async () => {
  const argv = process.argv.slice(2), remote = !!argv[1];
  const T = await L.target(argv), engine = T.engine, url = T.url, b = await L.launch(engine);
  const { rows, rec, fails } = L.makeRec();
  const shipped = fs.readFileSync(path.join(L.ROOT, "index.html"));
  const html = shipped.toString("utf8");
  const tap = async (p, s) => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(220); };
  const toMore = async p => { if (!(await p.locator("#btnMore").isVisible())) await tap(p, "#openPlan"); await p.waitForTimeout(250); if (!(await p.locator("#btnAbout").isVisible())) await tap(p, "#btnMore"); };
  const fixture = { done: { "w5-upperA": "done" }, body: [{ id: "b1", date: "2026-10-20", weight: "181.7", wu: "lb" }], lifts: [{ id: "x1", liftId: "bench-press", lift: "Bench press", weight: "193.5", wu: "lb", reps: "7", date: "2026-10-12" }] };
  const plan = L.norm(L.readSample(B)), codeB = L.code(plan);

  // ---- 4. static ----
  { const m = html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/g) || [];
    rec("static", "the CSP meta is byte-identical to v0.1.3.2 (and the only one; the embedded copy has '<' written as ~1)", m.length === 1 && m[0] === CSP, J(m));
    const urls = [...new Set(html.match(/\bhttps?:\/\/[^\s"'`<>)\\]+/g) || [])];
    rec("static", "the only absolute URLs in the page are the SVG namespace and the repo link", urls.every(u => u === "http://www.w3.org/2000/svg" || u === REPO), J(urls));
    const appJs = html.slice(html.lastIndexOf("<script>"));
    rec("static", "the app's script has no fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource or import()", !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\s*\(/.test(appJs));
    rec("static", "the shipped file holds no stored key name (only the bare ct1- prefix constant)", !/ct1-[A-Za-z0-9]/.test(html));
    rec("static", "About's copy is in the page source", COPY.every(c => html.includes(c.replace(/'/g, "'"))));
  }

  // ---- 1. About from More in every layout ----
  const LAYOUTS = [[382, 560, 34, "cover portrait"], [669, 751, 34, "inner portrait"], [951, 585, 34, "inner landscape"], [678, 396, 21, "Counter"], [644, 382, 21, "Counter"], [678, 396, 21, "Counter size at 200% (the single column, changed on Designer request 2026-10-27)"]];
  if (!remote) for (const [w, h, sb, name] of LAYOUTS) {
    const size = `${w}x${h} ${name}`;
    const ctx = await L.context(b, engine, w, h, { seed: L.seedFor(B), dark: true }), p = await ctx.newPage(), W = L.watch(p);
    await p.goto(url); await p.waitForTimeout(400);
    await p.addStyleTag({ content: `:root{--safe-b:${sb}px !important}` + (/200/.test(name) ? "html{font-size:200%!important}" : "") }); await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(300);
    const main = await p.evaluate(() => { const vis = e => e && e.getClientRects().length > 0; const ctl = Array.from(document.querySelectorAll('[aria-controls="aboutPage"], a[href="#about"]'));
      return { n: ctl.length, inMore: ctl.every(e => e.closest("#moreRow")), shown: ctl.some(vis), page: vis(document.getElementById("aboutPage")) }; });
    rec(size, "About has one control, inside More, and nothing on the main screen opens it", main.n === 1 && main.inMore && !main.shown && !main.page, J(main));
    await toMore(p); await tap(p, "#btnAbout"); await p.waitForTimeout(250);
    const g = await p.evaluate(COPY => { const pg = document.getElementById("aboutPage"), r = pg.getBoundingClientRect(), t = pg.innerText.replace(/\s+/g, " ").replace(/’/g, "'");
      const a = document.getElementById("aboutSrc"), c = document.getElementById("aboutCopy").getBoundingClientRect(), x = document.getElementById("aboutClose").getBoundingClientRect();
      const missing = COPY.filter(s => !t.toLowerCase().includes(s.toLowerCase()));
      const foot = Array.from(pg.querySelectorAll(".about-foot")).pop(); foot.scrollIntoView({ block: "nearest" }); const fr = foot.getBoundingClientRect();
      const hit = document.elementFromPoint(fr.left + 4, fr.top + fr.height / 2); pg.scrollTop = 0;
      return { open: !pg.hidden, full: r.left <= 0.5 && r.top <= 0.5 && r.right >= innerWidth - 0.5 && r.bottom >= innerHeight - 0.5, missing, ver: document.getElementById("aboutVer").textContent,
        link: [a.getAttribute("href"), a.target, a.rel], copyBtn: [Math.round(c.width), Math.round(c.height)], close: [Math.round(x.width), Math.round(x.height)], footReach: !!hit && foot.contains(hit) && fr.bottom <= innerHeight + 0.5,
        ovx: pg.scrollWidth - pg.clientWidth, focus: document.activeElement && document.activeElement.id }; }, COPY);
    rec(size, "About opens as a full page from More, holds every sentence of its copy and the version, the footer scrolls into reach, no sideways scroll",
      g.open && g.full && !g.missing.length && /^v\d/.test(g.ver) && g.footReach && g.ovx <= 1, J(g));
    rec(size, "About shows the version " + VERSION, g.ver.trim() === VERSION, J(g.ver));
    rec(size, "the repo link is the hard-coded GitHub address, opens in a new tab with noopener noreferrer; Get your own copy and Close are >= 44px tall",
      g.link[0] === REPO && g.link[1] === "_blank" && g.link[2] === "noopener noreferrer" && g.copyBtn[1] >= 44 && g.close[0] >= 44 && g.close[1] >= 44, J(g));
    await tap(p, "#aboutClose");
    const c1 = await p.evaluate(() => ({ hidden: document.getElementById("aboutPage").hidden, focus: document.activeElement && document.activeElement.id, lock: document.documentElement.classList.contains("about-open") }));
    await tap(p, "#btnAbout"); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    const c2 = await p.evaluate(() => document.getElementById("aboutPage").hidden);
    rec(size, "Close and Escape close it; focus returns to the About button; the page scroll lock is released", c1.hidden && c1.focus === "btnAbout" && !c1.lock && c2, J({ c1, c2 }));
    rec(size, "no errors", W.errs.length === 0, W.errs.join(" | "));
    await ctx.close();
  }

  // ---- 2 + 3. seeded session: copy bytes, then a whole session's requests ----
  async function session(u, label) {
    const ctx = await L.context(b, engine, 382, 560, { dark: true }), p = await ctx.newPage(), W = L.watch(p);
    await ctx.addInitScript(HOOK);
    /* every request in the context (pages, workers, downloads), with what started it */
    const reqs = [], step = { now: "load" }; ctx.on("request", r => reqs.push({ url: r.url(), type: r.resourceType(), nav: r.isNavigationRequest(), step: step.now }));
    await p.goto(u + "#p=" + codeB); await p.waitForTimeout(500);
    await tap(p, "#dlgThisWk"); await tap(p, "#dlgSaveStart");
    /* logs: the fixture's lift and weigh-in, a Done mark, then Skip and Undo */
    await p.evaluate(f => { for (const k in f) localStorage.setItem("ct1-" + k, JSON.stringify(f[k])); }, fixture); step.now = "reload"; await p.reload(); await p.waitForTimeout(400);
    await tap(p, "#todayDone"); await p.locator("#today [data-skip]:visible").first().tap().catch(() => {}); await p.waitForTimeout(250); await p.locator("#toastUndo").tap().catch(() => {}); await p.waitForTimeout(200);
    const stored = await L.dump(p);
    step.now = "about"; await toMore(p); await tap(p, "#btnAbout"); step.now = "copy";
    const [dl] = await Promise.all([p.waitForEvent("download"), tap(p, "#aboutCopy")]);
    const got = fs.readFileSync(await dl.path()); await tap(p, "#aboutClose");
    step.now = "export"; const [ex] = await Promise.all([p.waitForEvent("download"), tap(p, "#btnExport")]); const exFile = path.join("/tmp", "ct-about-export-" + engine + ".json"); await ex.saveAs(exFile);
    step.now = "import"; const [fc] = await Promise.all([p.waitForEvent("filechooser"), tap(p, "#btnImport")]); await fc.setFiles(exFile); await p.waitForTimeout(300); await tap(p, "#icReplace"); await p.locator("#toastUndo").tap().catch(() => {}); await p.waitForTimeout(300);
    const net = await p.evaluate(() => window.__net.slice());
    const reload = await p.evaluate(() => performance.getEntriesByType("navigation").length);
    await ctx.close();
    return { got, dlName: dl.suggestedFilename(), stored: JSON.parse(stored), reqs, net, errs: W.errs, reload };
  }
  if (!remote) {
    const s = await session(url, "local"), txt = s.got.toString("utf8");
    rec("copy", "the file's head comment names the same version (" + VERSION + ")", shipped.toString("utf8").split("\n").slice(0, 3).some(l => l.includes("<!-- coach-tracker " + VERSION + " ")), J(shipped.toString("utf8").split("\n")[1].slice(0, 60)));
    rec("copy", "Get your own copy saves coach-tracker.html, byte-identical to the shipped index.html (no normalization) after a seeded session", s.dlName === "coach-tracker.html" && Buffer.compare(s.got, shipped) === 0, J({ got: s.got.length, want: shipped.length }));
    const vals = []; s.stored.forEach(([k, v]) => { vals.push(k); if (v.length > 6 && !html.includes(v)) vals.push(v); try { (function walk(o) { if (o && typeof o === "object") Object.values(o).forEach(walk); else if (typeof o === "string" && o.length > 4 && !html.includes(o)) vals.push(o); })(JSON.parse(v)); } catch (e) {} });
    const fx = [codeB, "181.7", "193.5", plan.meta.name].concat(plan.days.map(d => d.title || "").filter(x => x.length > 5 && !html.includes(x)));
    const leaked = vals.concat(fx).filter(v => txt.includes(v));
    rec("copy", "the copy holds no stored key or value, no ct1- key name, and none of the fixture (plan name, link code, lift and weigh-in values)", !leaked.length && !/ct1-[A-Za-z0-9]/.test(txt), J(leaked.slice(0, 5)));
    const page = url.replace(/#.*$/, "");
    const netOk = (r, pg = page) => r.length === 2 && r.every((q, i) => q.url === pg && q.type === "document" && q.nav && q.step === ["load", "reload"][i]);
    rec("network", "a whole session (link load, start date, logs, reload, Skip + Undo, About, Get your own copy, Export, Import + Undo) requests only the page: the first load and the gate's own reload, nothing else of any kind", netOk(s.reqs), J(s.reqs));
    rec("network", "no request URL holds the # payload or plan text", s.reqs.every(r => !r.url.includes("#") && !r.url.includes(codeB.slice(0, 24)) && !r.url.includes(encodeURIComponent(plan.meta.name))), J(s.reqs));
    rec("network", "inside the page: no fetch, XHR, beacon, socket or event-source call and no CSP violation", s.net.length === 0, J(s.net));
    rec("network", "no errors", s.errs.length === 0, s.errs.join(" | "));
    /* mutation: a copy button that reaches for the network */
    const at = html.lastIndexOf("function getOwnCopy() {"), bad = at < 0 ? html : html.slice(0, at) + "function getOwnCopy() { fetch(location.href).catch(function () {});" + html.slice(at + "function getOwnCopy() {".length); /* the running copy, not the embedded one */
    if (bad === html) rec("mutation", "mutant built", false);
    else { const S = await serve(bad); const m = await session(S.url, "mutant"); S.close();
      const caught = !(netOk(m.reqs, S.url) && m.net.length === 0);
      rec("mutation", "a build whose Get your own copy calls fetch(location.href) fails the network check", caught, J({ reqs: m.reqs, net: m.net }));
      console.log(`MUTATION fetch-on-copy: network check ${caught ? "FAILS (caught)" : "passes (missed)"}; reqs ${m.reqs.length}, in-page ${J(m.net).slice(0, 90)}…`); }
  }

  // ---- remote: cold load of the published page with a plan in the link ----
  if (remote) {
    const ctx = await L.context(b, engine, 390, 844, { dark: true }), p = await ctx.newPage(); await ctx.addInitScript(HOOK);
    const reqs = []; ctx.on("request", r => reqs.push(r.url()));
    await p.goto(url + "#p=" + codeB, { waitUntil: "load" }); await p.waitForTimeout(3000);
    const net = await p.evaluate(() => window.__net.slice());
    const origin = new URL(url).origin;
    rec("published", "cold load with a plan in the link: one request, the page itself; nothing else from any origin (no injected script, pixel or font)", reqs.length === 1 && reqs[0] === url, J(reqs));
    rec("published", "every request stays on the page's origin and none holds the # payload or plan text", reqs.every(r => new URL(r).origin === origin && !r.includes("#") && !r.includes(codeB.slice(0, 24))), J(reqs));
    rec("published", "inside the page: no fetch, XHR, beacon or socket call and no CSP violation", net.length === 0, J(net));
    const live = await p.evaluate(() => Array.from(document.querySelectorAll("script[src], link[href], img[src], iframe, object, embed, video, audio, source")).map(e => e.outerHTML.slice(0, 120)).filter(x => !/href="data:,"/.test(x)));
    rec("published", "the served page has no element that loads anything (script src, link, img, iframe)", live.length === 0, J(live));
    await ctx.close();
  }

  // ---- 5. repo intake files ----
  if (!remote) {
    const Y = f => JSON.parse(execFileSync("python3", ["-c", "import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))", path.join(L.ROOT, f)]).toString());
    let forms = {}, ok = true; try { for (const f of ["config", "bug", "feature"]) forms[f] = Y(`.github/ISSUE_TEMPLATE/${f}.yml`); } catch (e) { ok = false; }
    rec("repo", "the issue forms and config parse as YAML", ok && forms.bug && forms.feature && forms.config);
    if (ok) {
      rec("repo", "config.yml: blank_issues_enabled is false and there are no contact_links", forms.config.blank_issues_enabled === false && !("contact_links" in forms.config), J(forms.config));
      for (const f of ["bug", "feature"]) { const body = forms[f].body || [];
        const box = body.some(x => x.type === "checkboxes" && (x.attributes.options || []).some(o => o.label === "I removed personal, health, and plan data." && o.required === true));
        const upload = body.filter(x => x.type === "upload" || x.type === "file" || /upload|attach|export|backup|\.json|screenshot|file/i.test(JSON.stringify(x.attributes || {}).replace(/exports, backups/g, "")) && x.type !== "markdown");
        rec("repo", `${f}.yml: the required privacy checkbox; no upload field and no field asking for files, exports or backups`, box && upload.length === 0, J(upload)); }
      const ids = (forms.bug.body || []).map(x => x.id);
      rec("repo", "bug.yml asks for the app version, device and browser, steps, and expected vs actual", ["version", "device", "steps", "happened", "expected"].every(i => ids.includes(i)), J(ids));
    }
    const sec = fs.readFileSync(path.join(L.ROOT, "SECURITY.md"), "utf8").trimEnd().split("\n");
    rec("repo", "SECURITY.md is 5 lines, points to private vulnerability reporting, promises no reply time, says don't post plan or health data", sec.length === 5 && /private vulnerability reporting/i.test(sec.join(" ")) && /no promised fix or reply time/i.test(sec.join(" ")) && /Don't post your plan or health data/.test(sec.join(" ")));
    const all = ["README.md", "SECURITY.md", "LICENSE", ".github/ISSUE_TEMPLATE/bug.yml", ".github/ISSUE_TEMPLATE/feature.yml", ".github/ISSUE_TEMPLATE/config.yml"].map(f => fs.readFileSync(path.join(L.ROOT, f), "utf8")).join("\n");
    rec("repo", "no email address in the README, SECURITY.md, LICENSE or the forms", !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(all));
    rec("repo", "LICENSE is MIT with the holder 'Coach Template contributors'", /^MIT License/.test(fs.readFileSync(path.join(L.ROOT, "LICENSE"), "utf8")) && /Copyright \(c\) 2026 Coach Template contributors/.test(all));
  }
  console.log(rows.join("\n"));
  console.log(`${rows.length} checks, ${fails()} failed (${engine}${remote ? " " + url : ""})`);
  await b.close(); T.close(); process.exit(fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
function J(x) { return JSON.stringify(x); }
