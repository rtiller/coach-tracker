(function () {
  "use strict";

  /* ================= Constants ================= */
  const APP_ID = "coach-tracker";
  const APP_VERSION = "v0.1.4.3-preview";
  /* Storage prefix is per app, never per person. STORE_SCHEMA bumps only with a written migration. */
  const LS_PREFIX = "ct1-";
  const STORE_SCHEMA = 1;
  const PLAN_SCHEMA = 1;
  const DATA_KEYS = ["schema", "plan", "seen", "week", "startDate", "done", "openDays", "lifts", "body", "tab", "progView"];
  const MAX_CODE_CHARS = 40000;     /* a pasted code or link fragment */
  const MAX_PLAN_BYTES = 200000;    /* decompressed plan JSON */
  const MAX_IMPORT_BYTES = 5000000; /* an Export file */
  const DAY_MS = 86400000;
  const TAGS = ["anchor", "priority", "optional", "accessory"];
  const DEFAULT_LABELS = { anchor: "Main lift", priority: "Focus", optional: "If time", accessory: "Accessory" };
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  /* In a browser tab the #p= fragment stays in the address bar, so Add to Home Screen saves a URL that still
     carries the plan (the Home Screen app on iOS starts with empty storage of its own). Processing is idempotent:
     a link already seen on this device is ignored. In a Home Screen app the fragment is cleared after load.
     v0.1.4: this is the iOS flow only. Off iOS (no navigator.standalone) the fragment is cleared once the plan is saved
     (clearSavedLink, src/app6.js). */
  const KEEP_LINK_IN_TAB = true;

  /* ================= Storage ================= */
  function lsRaw(key) { try { return localStorage.getItem(LS_PREFIX + key); } catch (e) { return null; } }
  function lsGet(key, fallback) {
    const raw = lsRaw(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  let saveWarned = false, READONLY = false;
  function lsSet(key, val) {
    if (READONLY) return;
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); }
    catch (e) { if (!saveWarned) { saveWarned = true; showUndo("Could not save on this device. Storage may be full or blocked.", null, 8000); } }
  }
  function appKeys() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(LS_PREFIX) === 0) out.push(k); } } catch (e) {}
    return out;
  }
  /* Exact copy of every ct1- key as stored, so Undo puts back the same bytes. Memory only. */
  function snapshotKeys() { const snap = {}; appKeys().forEach(function (k) { snap[k] = localStorage.getItem(k); }); return snap; }
  function restoreKeys(snap) {
    appKeys().forEach(function (k) { if (!(k in snap)) localStorage.removeItem(k); });
    Object.keys(snap).forEach(function (k) { try { localStorage.setItem(k, snap[k]); } catch (e) {} });
  }
  /* ================= Safety net =================
     If boot or a render throws, a small panel offers the raw saved data and a reload. Nothing is parsed, nothing is written. */
  function rawExport() {
    const raw = {};
    appKeys().forEach(function (k) { try { raw[k] = localStorage.getItem(k); } catch (e) {} });
    const blob = new Blob([JSON.stringify({ app: APP_ID, schema: "raw", version: APP_VERSION, exportedAt: new Date().toISOString(), raw: raw }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workout-tracker-raw-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  let fatalShown = false;
  let mutedErrors = 0;
  function errorIsOurs(ev) {
    if (ev.error && typeof ev.error === "object" && ev.error.stack) return true;
    const f = String(ev.filename || "");
    if (!f) return false;
    try { return new URL(f, location.href).origin === location.origin; } catch (e) { return false; }
  }
  function showFatal(err) {
    if (fatalShown || !document.body) return;
    fatalShown = true;
    const box = document.createElement("div");
    box.className = "fatal"; box.id = "fatal";
    box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "fatalTitle");
    const t = document.createElement("p"); t.className = "dlg-title"; t.id = "fatalTitle"; t.textContent = "Something went wrong";
    const b = document.createElement("p"); b.className = "dlg-body"; b.textContent = "Your data is still on this device. Download it to keep a copy, then reload.";
    const row = document.createElement("div"); row.className = "ic-row";
    const dl = document.createElement("button"); dl.type = "button"; dl.className = "btn primary"; dl.id = "fatalDownload"; dl.textContent = "Download raw data";
    const re = document.createElement("button"); re.type = "button"; re.className = "btn ghost"; re.id = "fatalReload"; re.textContent = "Reload";
    dl.addEventListener("click", rawExport);
    re.addEventListener("click", function () { location.reload(); });
    const small = document.createElement("p"); small.className = "fatal-err";
    small.textContent = String((err && (err.message || err.reason)) || err || "Unknown error").slice(0, 300);
    row.appendChild(re); row.appendChild(dl);
    box.appendChild(t); box.appendChild(b); box.appendChild(row); box.appendChild(small);
    document.body.appendChild(box);
    try { dl.focus({ preventScroll: true }); } catch (e) {}
  }
  if (window.addEventListener) {
    window.addEventListener("error", function (ev) {
      const m = String((ev && ev.message) || "");
      if (/ResizeObserver loop/.test(m) || !ev.error && !m) return; /* benign browser noise, or a resource load */
      /* v0.1.4: only an error we can attribute shows the panel: an error object with a stack, or a source file on this
         page's origin. A muted cross-origin error ("Script error.", no file, line 0) is never ours: every script here is
         inline and the CSP loads nothing else, so it comes from script the browser or an extension injected (Safari's
         page menu, Hide Distracting Items, Translate, content blockers). It is counted (About shows the count), not shown. */
      if (!errorIsOurs(ev)) { mutedErrors++; return; }
      showFatal(ev.error || m);
    });
    window.addEventListener("unhandledrejection", function (ev) { showFatal(ev && ev.reason); });
  }

  /* One-way migrations, keyed by the schema they upgrade from. None yet. */
  const MIGRATIONS = {};
  function storeSchema() {
    const v = lsGet("schema", null);
    if (v == null) return appKeys().length ? 1 : 0;
    return typeof v === "number" ? v : -1;
  }

  /* ================= Small helpers ================= */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function isoOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function parseISO(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d) ? null : d; }
  function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  function comingMonday() { const t = parseISO(todayISO()); return t.getDay() === 1 ? t : addDays(mondayOf(t), 7); }
  function fmtDate(d, long) { return d.toLocaleDateString("en-US", long ? { weekday: "long", month: "short", day: "numeric" } : { month: "short", day: "numeric" }).replace(/ /g, "\u00a0"); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "lift"; }
  function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
  function isStandalone() {
    try { if (window.navigator.standalone === true) return true; } catch (e) {}
    try { return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches; } catch (e) { return false; }
  }

  /* ================= Plan code decoding ================= */
  /* A plan code is base64url of: deflate-raw (preferred), gzip, zlib, or plain JSON bytes. The format is detected from the bytes,
     so a coach without our encoder can use any gzip tool. DecompressionStream is used where present (Safari 16.4+, Chrome 103+),
     else the small inflate below. */
  function PlanError(kind, title, body, details) { this.kind = kind; this.title = title; this.body = body; this.details = details || []; }
  function errCorrupt(why) { return new PlanError("corrupt", "This plan link or code is damaged", "It may have been cut off when it was copied. Ask your coach to send it again, or copy the whole thing.", why ? [why] : []); }
  function errLarge() { return new PlanError("large", "This plan is too large", "The code is bigger than any real training plan should be, so it was not loaded.", []); }
  function errVersion(v) { return new PlanError("version", "This plan needs a newer tracker", "It was made for plan format " + v + ". This tracker reads format " + PLAN_SCHEMA + ". Ask your coach for a link to the current tracker.", []); }
  function errInvalid(list) { return new PlanError("invalid", "This plan has mistakes", "The tracker could not use it. Send these details to your coach.", list.slice(0, 6).concat(list.length > 6 ? ["and " + (list.length - 6) + " more"] : [])); }

  function extractCode(input) {
    let s = String(input || "").trim();
    const hi = s.indexOf("#");
    if (hi >= 0) s = s.slice(hi + 1);
    if (/^p=/.test(s)) s = s.slice(2);
    else if (s.indexOf("&p=") >= 0) s = s.slice(s.indexOf("&p=") + 3);
    const amp = s.indexOf("&"); if (amp >= 0 && s.charAt(0) !== "{") s = s.slice(0, amp);
    if (s.charAt(0) !== "{") { try { s = decodeURIComponent(s); } catch (e) {} s = s.replace(/\s+/g, ""); }
    return s;
  }
  function b64urlToBytes(s) {
    if (!/^[A-Za-z0-9_\-+/]+=*$/.test(s)) throw errCorrupt("The code has characters a plan code never uses.");
    let b = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (b.length % 4 === 1) throw errCorrupt("The code is cut off.");
    while (b.length % 4) b += "=";
    let bin;
    try { bin = atob(b); } catch (e) { throw errCorrupt("The code is not valid base64url."); }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* --- Small inflate (RFC 1951), after Mark Adler's puff. Used only when DecompressionStream is missing. --- */
  const LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const CLORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  function inflateRaw(src, maxOut) {
    let pos = 0, bitbuf = 0, bitcnt = 0;
    let out = new Uint8Array(Math.min(maxOut, Math.max(1024, src.length * 6))), olen = 0;
    function fail(m) { throw errCorrupt(m || "The compressed data is damaged."); }
    function bits(n) {
      let v = bitbuf;
      while (bitcnt < n) { if (pos >= src.length) fail("The code is cut off."); v |= src[pos++] << bitcnt; bitcnt += 8; }
      bitbuf = v >>> n; bitcnt -= n;
      return v & ((1 << n) - 1);
    }
    function put(b) {
      if (olen >= out.length) { if (out.length >= maxOut) throw errLarge(); const n = new Uint8Array(Math.min(maxOut, out.length * 2)); n.set(out); out = n; }
      out[olen++] = b;
    }
    function build(lengths, n) {
      const count = new Uint16Array(16), offs = new Uint16Array(16), symbol = new Uint16Array(n);
      for (let i = 0; i < n; i++) count[lengths[i]]++;
      count[0] = 0;
      for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + count[len];
      for (let s = 0; s < n; s++) if (lengths[s]) symbol[offs[lengths[s]]++] = s;
      return { count: count, symbol: symbol };
    }
    function decode(h) {
      let code = 0, first = 0, index = 0;
      for (let len = 1; len <= 15; len++) {
        code |= bits(1);
        const c = h.count[len];
        if (code - c < first) return h.symbol[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      fail();
    }
    function codes(lc, dc) {
      for (;;) {
        let sym = decode(lc);
        if (sym < 256) put(sym);
        else if (sym === 256) return;
        else {
          sym -= 257; if (sym >= 29) fail();
          const len = LBASE[sym] + bits(LEXT[sym]);
          const ds = decode(dc); if (ds >= 30) fail();
          const dist = DBASE[ds] + bits(DEXT[ds]);
          if (dist > olen) fail();
          for (let i = 0; i < len; i++) put(out[olen - dist]);
        }
      }
    }
    let fixedL = null, fixedD = null;
    let last;
    do {
      last = bits(1);
      const type = bits(2);
      if (type === 0) {
        bitbuf = 0; bitcnt = 0;
        if (pos + 4 > src.length) fail("The code is cut off.");
        const len = src[pos] | (src[pos + 1] << 8), nlen = src[pos + 2] | (src[pos + 3] << 8); pos += 4;
        if (len !== (~nlen & 0xffff)) fail();
        if (pos + len > src.length) fail("The code is cut off.");
        for (let i = 0; i < len; i++) put(src[pos++]);
      } else if (type === 1) {
        if (!fixedL) {
          const l = new Uint8Array(288); let i = 0;
          for (; i < 144; i++) l[i] = 8; for (; i < 256; i++) l[i] = 9; for (; i < 280; i++) l[i] = 7; for (; i < 288; i++) l[i] = 8;
          fixedL = build(l, 288); const d = new Uint8Array(30).fill(5); fixedD = build(d, 30);
        }
        codes(fixedL, fixedD);
      } else if (type === 2) {
        const nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4;
        if (nlen > 286 || ndist > 30) fail();
        const lengths = new Uint8Array(320);
        for (let i = 0; i < ncode; i++) lengths[CLORDER[i]] = bits(3);
        for (let i = ncode; i < 19; i++) lengths[CLORDER[i]] = 0;
        const lencode = build(lengths, 19);
        let idx = 0; const all = new Uint8Array(nlen + ndist);
        while (idx < nlen + ndist) {
          let sym = decode(lencode);
          if (sym < 16) all[idx++] = sym;
          else {
            let len = 0, rep;
            if (sym === 16) { if (idx === 0) fail(); len = all[idx - 1]; rep = 3 + bits(2); }
            else if (sym === 17) rep = 3 + bits(3);
            else rep = 11 + bits(7);
            if (idx + rep > nlen + ndist) fail();
            while (rep--) all[idx++] = len;
          }
        }
        codes(build(all.subarray(0, nlen), nlen), build(all.subarray(nlen), ndist));
      } else fail();
    } while (!last);
    return out.subarray(0, olen);
  }
  function gzipBody(b) {
    if (b.length < 18 || b[0] !== 0x1f || b[1] !== 0x8b || b[2] !== 8) throw errCorrupt("The compressed data is damaged.");
    const flg = b[3]; let p = 10;
    if (flg & 4) p += 2 + (b[p] | (b[p + 1] << 8));
    if (flg & 8) { while (p < b.length && b[p]) p++; p++; }
    if (flg & 16) { while (p < b.length && b[p]) p++; p++; }
    if (flg & 2) p += 2;
    if (p >= b.length) throw errCorrupt("The code is cut off.");
    return b.subarray(p);
  }
  function detectFormat(b) {
    if (!b.length) return "empty";
    if (b[0] === 0x7b) return "json";
    if (b[0] === 0x1f && b[1] === 0x8b) return "gzip";
    if (b.length > 2 && (b[0] & 0x0f) === 8 && (b[0] >> 4) <= 7 && ((b[0] << 8) | b[1]) % 31 === 0) return "deflate";
    return "deflate-raw";
  }
  async function viaStream(fmt, bytes, max) {
    const ds = new DecompressionStream(fmt);
    const reader = new Blob([bytes]).stream().pipeThrough(ds).getReader();
    const parts = []; let total = 0;
    for (;;) {
      let r;
      try { r = await reader.read(); } catch (e) { throw errCorrupt("The compressed data is damaged or cut off."); }
      if (r.done) break;
      total += r.value.length;
      if (total > max) { try { reader.cancel(); } catch (e) {} throw errLarge(); }
      parts.push(r.value);
    }
    const out = new Uint8Array(total); let o = 0;
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }
  function streamOK(fmt) {
    if (typeof DecompressionStream !== "function" || window.__ctNoStream) return false;
    try { new DecompressionStream(fmt); return true; } catch (e) { return false; }
  }
  async function inflateAny(bytes) {
    const fmt = detectFormat(bytes);
    if (fmt === "empty") throw errCorrupt("The code is empty.");
    if (fmt === "json") return { bytes: bytes, via: "plain" };
    if (streamOK(fmt)) return { bytes: await viaStream(fmt, bytes, MAX_PLAN_BYTES), via: "stream-" + fmt };
    if (fmt === "gzip") return { bytes: inflateRaw(gzipBody(bytes), MAX_PLAN_BYTES), via: "inline-gzip" };
    if (fmt === "deflate") return { bytes: inflateRaw(bytes.subarray(2), MAX_PLAN_BYTES), via: "inline-deflate" };
    return { bytes: inflateRaw(bytes, MAX_PLAN_BYTES), via: "inline-deflate-raw" };
  }
  /* Returns { plan, fp, via } or throws PlanError. Never writes anything. */
  async function decodePlan(input) {
    const code = extractCode(input);
    if (!code) throw errCorrupt("No plan code was found.");
    if (code.length > MAX_CODE_CHARS) throw errLarge();
    let text, via;
    if (code.charAt(0) === "{") { text = code; via = "pasted-json"; if (text.length > MAX_PLAN_BYTES) throw errLarge(); }
    else {
      const r = await inflateAny(b64urlToBytes(code));
      via = r.via;
      if (r.bytes.length > MAX_PLAN_BYTES) throw errLarge();
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(r.bytes); } catch (e) { throw errCorrupt("The plan text is not valid."); }
    }
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw errCorrupt("The plan text is not valid JSON."); }
    const v = validatePlan(obj);
    if (!v.ok) throw v.error;
    return { plan: v.plan, fp: fnv(code), via: via };
  }
