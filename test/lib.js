/* Shared gate helpers. Engine and URL come from argv: node <gate>.js <webkit|chromium> [url] */
const pw = require("playwright");
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const app = new Function("window", html.slice(html.lastIndexOf('"use strict";'), html.lastIndexOf("/* ================= Plan and state")) + "\nreturn { validatePlan, DATA_KEYS: typeof DATA_KEYS !== 'undefined' ? DATA_KEYS : null, PREFIX: LS_PREFIX };")({});
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const NOW = process.env.GATE_NOW || "2026-10-23T12:00:00-05:00"; /* a Friday */
const SAMPLES = fs.readdirSync(path.join(ROOT, "samples")).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")).sort();
const readSample = s => JSON.parse(fs.readFileSync(path.join(ROOT, "samples", s + ".json"), "utf8"));
const norm = p => { const v = app.validatePlan(p); if (!v.ok) throw new Error("sample invalid: " + JSON.stringify(v.error.details)); return v.plan; };
const code = (p, gzip) => (gzip ? zlib.gzipSync : zlib.deflateRawSync)(Buffer.from(JSON.stringify(p)), { level: 9 }).toString("base64url");
function seedFor(sample, extra = {}) {
  const plan = norm(readSample(sample));
  return Object.assign({ schema: 1, plan, seen: [], week: 5, startDate: "2026-09-21", done: {}, openDays: {}, lifts: [], body: [], tab: "train", progView: "body" }, extra);
}
function makeRec() {
  const rows = []; let fails = 0;
  return { rows, rec(size, name, ok, info) { rows.push(`${ok ? "PASS" : "FAIL"} ${size} ${name}${!ok && info ? " :: " + info : ""}`); if (!ok) fails++; }, fails: () => fails };
}
async function launch(engine) { return pw[engine].launch(engine === "chromium" ? { executablePath: "/usr/bin/google-chrome" } : {}); }
/* v0.1.3.3: the layout follows the device SCREEN (tools/build.sh), so every context sets one. The Duo inner viewports
   (669 wide portrait, 951 wide landscape) sit on a 669x951 screen; every other size is its own screen unless opts.screen says. */
function screenFor(w, h) {
  if (w === 669) return { width: 669, height: 951 };
  if (w === 951) return { width: 951, height: 669 };
  return { width: w, height: h };
}
async function context(b, engine, w, h, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, screen: opts.screen || screenFor(w, h), isMobile: engine === "webkit", hasTouch: true, deviceScaleFactor: 2,
    userAgent: opts.ua || (engine === "webkit" ? UA : undefined), acceptDownloads: true, colorScheme: opts.dark ? "dark" : "light", reducedMotion: opts.reduce ? "reduce" : "no-preference" });
  await ctx.clock.setFixedTime(new Date(opts.now || NOW));
  if (opts.seed) await ctx.addInitScript(s => { if (!sessionStorage.getItem("gate-seeded")) { sessionStorage.setItem("gate-seeded", "1"); localStorage.clear(); for (const k in s) localStorage.setItem("ct1-" + k, JSON.stringify(s[k])); } }, opts.seed);
  if (opts.standalone) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, "standalone", { get: () => true, configurable: true }); });
  /* v0.1.4: WebKit stands for iOS Safari, which has navigator.standalone (false in a tab); Playwright's WebKit has none.
     Chromium stands for Android and has none. The app's iOS-only paths test "standalone" in navigator. */
  else if (engine === "webkit" && !opts.noIOS) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, "standalone", { get: () => false, configurable: true }); });
  if (opts.noStream) await ctx.addInitScript(() => { window.__ctNoStream = true; });
  return ctx;
}
function watch(p, url) {
  const errs = [], reqs = [];
  p.on("pageerror", e => errs.push("pageerror " + e.message));
  p.on("console", m => { const u = (m.location() || {}).url || ""; if (m.type() === "error" && !/brand-mark-favicon|favicon\.ico/.test(u + m.text())) errs.push(m.text() + " @ " + u); });
  p.on("request", r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() || "", referer: r.headers().referer || "" }));
  p.on("response", r => { if (r.status() >= 400 && !/favicon|brand-mark/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  return { errs, reqs };
}
const dump = p => p.evaluate(() => { const o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("ct1-")) o.push([k, localStorage.getItem(k)]); } return JSON.stringify(o.sort()); });
const ls = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem("ct1-" + k)), k);
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function target(argv) {
  const [engine, url] = argv;
  if (!["webkit", "chromium"].includes(engine)) { console.error("usage: <gate>.js <webkit|chromium> [url]"); process.exit(2); }
  if (url) return { engine, url: url.replace(/[?#].*$/, ""), close() {}, log: null };
  const S = await require("./server")();
  return { engine, url: S.url, close: S.close, log: S.log };
}
module.exports = { pw, fs, path, ROOT, app, UA, NOW, SAMPLES, readSample, norm, code, seedFor, makeRec, launch, context, watch, dump, ls, settle, target };
