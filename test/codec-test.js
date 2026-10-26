/* Codec and validator tests against the app's own code (loaded from index.html). node test/codec-test.js */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const body = html.slice(html.lastIndexOf('"use strict";'), html.lastIndexOf("/* ================= Plan and state"));
const win = { __ctNoStream: false };
const app = new Function("window", body + "\nreturn { validatePlan, decodePlan, inflateRaw, MAX_PLAN_BYTES, escapeHtml };")(win);
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) pass++; else { fail++; console.log("FAIL " + name + (info ? " :: " + info : "")); } }
const b64 = b => Buffer.from(b).toString("base64url");
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "samples", "b-4day-upper-lower.json"), "utf8"));
const raw = Buffer.from(JSON.stringify(sample));
(async () => {
  // escapeHtml covers all five HTML-special characters, single quote included (v0.1.2)
  ok("escapeHtml escapes & < > \" '", app.escapeHtml(`<a href="x" title='y'>&</a>`) === "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;", app.escapeHtml(`<a title='y'>`));
  ok("escapeHtml stringifies non-strings", app.escapeHtml(5) === "5");
  // inline inflate vs zlib on random data, every level and strategy (stored, fixed, dynamic blocks)
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let t = 0; t < 300; t++) {
    const n = Math.floor(rnd() * 70000);
    const alpha = 1 + Math.floor(rnd() * 255);
    const buf = Buffer.alloc(n); for (let i = 0; i < n; i++) buf[i] = rnd() < 0.3 && i > 10 ? buf[i - 1 - Math.floor(rnd() * 10)] : Math.floor(rnd() * alpha);
    const level = t % 10, strategy = [0, 1, 2, 3, 4][t % 5];
    const c = zlib.deflateRawSync(buf, { level, strategy });
    let out; try { out = Buffer.from(app.inflateRaw(new Uint8Array(c), 1 << 20)); } catch (e) { out = null; }
    ok("inflate random #" + t + " n=" + n + " level=" + level + " strategy=" + strategy, out && out.equals(buf));
  }
  for (const noStream of [false, true]) {
    win.__ctNoStream = noStream;
    const tag = noStream ? " [inline]" : " [stream]";
    const good = async (name, code) => { const r = await app.decodePlan(code).catch(e => ({ e })); ok(name + tag, !r.e && r.plan.meta.name === sample.meta.name, r.e && r.e.title); };
    const bad = async (name, code, kind) => { const r = await app.decodePlan(code).then(() => ({ kind: "none" }), e => e); ok(name + tag + " is " + kind, r.kind === kind, r.kind + " " + (r.title || "")); };
    await good("deflate-raw", b64(zlib.deflateRawSync(raw)));
    await good("gzip", b64(zlib.gzipSync(raw)));
    await good("zlib", b64(zlib.deflateSync(raw)));
    await good("plain base64url JSON (old browsers)", b64(raw));
    await good("standard base64 with padding", Buffer.from(zlib.deflateRawSync(raw)).toString("base64"));
    await good("full link", "https://x.example/tracker/#p=" + b64(zlib.deflateRawSync(raw)));
    await good("code with line breaks", b64(zlib.deflateRawSync(raw)).replace(/(.{60})/g, "$1\n"));
    await good("pasted JSON", JSON.stringify(sample));
    const code = b64(zlib.deflateRawSync(raw));
    await bad("truncated link", code.slice(0, Math.floor(code.length * 0.6)), "corrupt");
    await bad("truncated by one char", code.slice(0, -1), "corrupt");
    await bad("link with no #p=", "https://x.example/tracker/", "corrupt");
    await bad("empty", "", "corrupt");
    await bad("garbage chars", "hello world!!", "corrupt");
    await bad("not JSON", b64(zlib.deflateRawSync(Buffer.from("{not json"))), "corrupt");
    await bad("too large code", "A".repeat(50000), "large");
    await bad("zip bomb", b64(zlib.deflateRawSync(Buffer.from('{"a":"' + " ".repeat(5e6) + '"}'))), "large");
    const mut = f => { const p = JSON.parse(JSON.stringify(sample)); f(p); return b64(zlib.deflateRawSync(Buffer.from(JSON.stringify(p)))); };
    await bad("newer plan schema", mut(p => p.schema = 2), "version");
    await bad("unknown tag", mut(p => p.blocks["1"].upperA[1].tags = ["forearm"]), "invalid");
    await bad("six days", mut(p => p.days.pop()), "invalid");
    await bad("two anchors", mut(p => p.blocks["1"].upperA[1].tags = ["anchor"]), "invalid");
    await bad("no anchor", mut(p => p.blocks["2"].lowerB[0].tags = []), "invalid");
    await bad("missing block", mut(p => delete p.blocks["3"]), "invalid");
    await bad("block missing a day", mut(p => delete p.blocks["2"].upperB), "invalid");
    await bad("rest day with exercises", mut(p => p.blocks["1"].rest = [{ name: "x", sets: "1", tags: ["anchor"] }]), "invalid");
    await bad("bad units", mut(p => p.meta.units = "stone"), "invalid");
    await bad("start date in plan", mut(p => p.meta.startDate = "2026-01-05"), "invalid");
    await bad("duplicate day key", mut(p => p.days[3].key = "upperA"), "invalid");
  }
  console.log(`codec-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
