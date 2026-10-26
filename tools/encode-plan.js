#!/usr/bin/env node
/* Plan encoder for the workout tracker. No npm dependencies (Node 18 or newer).
   It validates with the same code the app runs: it loads the validator and decoder from ../index.html.

   Encode:  node tools/encode-plan.js plan.json [--url https://you.github.io/tracker/] [--gzip] [--json]
   Verify:  node tools/encode-plan.js --verify plan.json [--url ...]     encode, then decode with the app's own
                                                                         decoder (stream and inline paths) and compare
   Decode:  node tools/encode-plan.js --decode "<code or full link>"    print the plan the app would load
   Check:   node tools/encode-plan.js --check plan.json                 validate only

   Output: the link is {url}#p=<code>. The code alone is what a person pastes into More, then Update plan. */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function usage(msg) {
  if (msg) console.error("Error: " + msg);
  console.error("Usage: encode-plan.js <plan.json> [--url URL] [--gzip] [--json] | --verify <plan.json> | --decode <code|link> | --check <plan.json>");
  process.exit(2);
}
const args = process.argv.slice(2);
const opt = { url: "https://rtiller.github.io/coach-tracker/", gzip: false, json: false, mode: "encode", app: path.join(__dirname, "..", "index.html") };
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--url") opt.url = args[++i];
  else if (a === "--gzip") opt.gzip = true;
  else if (a === "--json") opt.json = true;
  else if (a === "--app") opt.app = args[++i];
  else if (a === "--verify") opt.mode = "verify";
  else if (a === "--decode") opt.mode = "decode";
  else if (a === "--check") opt.mode = "check";
  else if (a === "-h" || a === "--help") usage();
  else rest.push(a);
}
if (!rest.length) usage("missing input");

/* Load the app's validator and decoder: the script from "use strict" up to the Plan and state section. */
function loadApp(file) {
  const html = fs.readFileSync(file, "utf8");
  const a = html.lastIndexOf('"use strict";'), b = html.lastIndexOf("/* ================= Plan and state");
  if (a < 0 || b < 0) throw new Error("could not find the plan code in " + file);
  const body = html.slice(a, b);
  const window = { __ctNoStream: false };
  const f = new Function("window", body + "\nreturn { validatePlan, decodePlan, extractCode, PLAN_SCHEMA, MAX_CODE_CHARS, MAX_PLAN_BYTES, PlanError };");
  const api = f(window);
  api.window = window;
  return api;
}
const app = loadApp(opt.app);

function readPlan(file) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { usage("cannot read " + file); }
  try { return JSON.parse(text); } catch (e) { console.error("Error: " + file + " is not valid JSON: " + e.message); process.exit(1); }
}
function check(plan) {
  const v = app.validatePlan(plan);
  if (!v.ok) {
    console.error("Plan check FAILED: " + v.error.title);
    (v.error.details.length ? v.error.details : [v.error.body]).forEach(function (d) { console.error("  - " + d); });
    process.exit(1);
  }
  return v.plan;
}
function encode(plan, gzip) {
  const raw = Buffer.from(JSON.stringify(plan), "utf8");
  const bytes = gzip ? zlib.gzipSync(raw, { level: 9 }) : zlib.deflateRawSync(raw, { level: 9 });
  return { code: bytes.toString("base64url"), jsonBytes: raw.length, compressedBytes: bytes.length };
}
function link(code) { return opt.url + "#p=" + code; }

(async function () {
  if (opt.mode === "decode") {
    try {
      const r = await app.decodePlan(rest[0]);
      console.log(JSON.stringify(r.plan, null, 2));
      console.error("Decoded with " + r.via + ". Fingerprint " + r.fp + ".");
    } catch (e) {
      console.error("Decode FAILED: " + (e.title || e.message));
      (e.details || []).forEach(function (d) { console.error("  - " + d); });
      process.exit(1);
    }
    return;
  }
  const plan = readPlan(rest[0]);
  const norm = check(plan);
  if (opt.mode === "check") { console.log("Plan check OK: " + norm.meta.name + ", " + norm.meta.weeks + " weeks, " + norm.days.filter(d => !d.rest).length + " training days."); return; }
  const enc = encode(plan, opt.gzip);
  if (enc.code.length > app.MAX_CODE_CHARS) { console.error("Error: the code is " + enc.code.length + " characters; the app accepts at most " + app.MAX_CODE_CHARS + "."); process.exit(1); }
  const out = { link: link(enc.code), code: enc.code, format: opt.gzip ? "gzip" : "deflate-raw", jsonBytes: enc.jsonBytes, compressedBytes: enc.compressedBytes, codeLength: enc.code.length, linkLength: link(enc.code).length };
  if (opt.mode === "verify") {
    const results = [];
    for (const noStream of [false, true]) {
      app.window.__ctNoStream = noStream;
      for (const input of [enc.code, out.link, encode(plan, !opt.gzip).code]) {
        const r = await app.decodePlan(input).catch(e => ({ err: e.title || String(e) }));
        const same = !r.err && JSON.stringify(r.plan) === JSON.stringify(norm);
        results.push({ path: r.via || "error", ok: same, err: r.err });
      }
    }
    app.window.__ctNoStream = false;
    out.verify = results;
    const ok = results.every(r => r.ok);
    if (!opt.json) {
      results.forEach(r => console.error((r.ok ? "PASS " : "FAIL ") + r.path + (r.err ? " :: " + r.err : "")));
      console.error(ok ? "Verify OK: the app decodes this code to the same plan on every path." : "Verify FAILED");
    }
    if (!ok) { if (opt.json) console.log(JSON.stringify(out, null, 2)); process.exit(1); }
  }
  if (opt.json) { console.log(JSON.stringify(out, null, 2)); return; }
  console.log("Plan: " + norm.meta.name + " (" + norm.meta.weeks + " weeks)");
  console.log("Code (" + out.codeLength + " characters, " + out.format + "):");
  console.log(out.code);
  console.log("");
  console.log("Link (" + out.linkLength + " characters):");
  console.log(out.link);
})();
