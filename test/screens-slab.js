/* v0.1.3.3 slab-phone screenshots: node test/screens-slab.js [url]  ->  screens/v0.1.3.3/slab/ + CONTACT-SHEET.png
   iPhones in WebKit (iPhone UA), Android in Chromium (Android UA); the device screen is set, so the layout is the one the
   phone gets. Each shot is the whole CSS viewport (full screen at the device's CSS size, DPR 2), with that phone's safe
   areas applied: <device>-<orient>-<screen>-<dark|light>.png, screens today, update (Update plan from More), more, about.
   Extra: 200% text for SE and Galaxy portrait, a light set on iPhone 16 portrait, SE portrait Update plan with the
   keyboard up (the viewport shrunk by the keyboard). Sample b-4day-upper-lower, clock Fri Oct 23 2026. */
const L = require("./lib");
const { fs, path } = L, { execSync } = require("child_process");
const OUT = path.join(L.ROOT, "screens", "v0.1.3.3", "slab");
const AUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
/* [device, engine, w, h, portrait insets, landscape inset (side, bottom, top), orientations] */
const DEV = [["iphone-se", "webkit", 375, 667, { t: 20, b: 0 }, { s: 0, b: 0 }, ["portrait", "landscape"]],
  ["iphone-13-mini", "webkit", 375, 812, { t: 50, b: 34 }, { s: 50, b: 21 }, ["portrait"]],
  ["iphone-16", "webkit", 393, 852, { t: 59, b: 34 }, { s: 59, b: 21 }, ["portrait", "landscape"]],
  ["iphone-16-pro", "webkit", 402, 874, { t: 62, b: 34 }, { s: 62, b: 21 }, ["portrait"]],
  ["iphone-air", "webkit", 420, 912, { t: 59, b: 34 }, { s: 59, b: 21 }, ["portrait"]],
  ["iphone-16-pro-max", "webkit", 440, 956, { t: 62, b: 34 }, { s: 62, b: 21 }, ["portrait", "landscape"]],
  ["pixel", "chromium", 412, 915, { t: 24, b: 0 }, { s: 0, b: 0, t: 24 }, ["portrait"]],
  ["galaxy", "chromium", 360, 780, { t: 24, b: 0 }, { s: 0, b: 0, t: 24 }, ["portrait", "landscape"]]];
const seed = L.seedFor("b-4day-upper-lower", { done: { "w5-upperA": "done" }, body: [{ id: "b1", date: "2026-10-20", weight: "180", wu: "lb" }] });
(async () => {
  const argv = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
  const shots = [], br = {};
  for (const [dev, engine, pw0, ph0, pins, lins, orients] of DEV) {
    const T = await L.target([engine, argv[0]]); br[engine] = br[engine] || await L.launch(engine); const b = br[engine];
    const runs = [];
    for (const o of orients) runs.push([o, false, true]);
    if (dev === "iphone-se" || dev === "galaxy") runs.push(["portrait", true, true]);
    if (dev === "iphone-16") runs.push(["portrait", false, false]);
    for (const [orient, big, dark] of runs) {
      const land = orient === "landscape", w = land ? ph0 : pw0, h = land ? pw0 : ph0;
      const ins = land ? { t: lins.t || 0, b: lins.b, l: lins.s, r: 0 } : { t: pins.t, b: pins.b, l: 0, r: 0 };
      const ctx = await L.context(b, engine, w, h, { seed, dark, screen: { width: w, height: h }, ua: engine === "chromium" ? AUA : undefined }), p = await ctx.newPage(); const W = L.watch(p);
      await p.goto(T.url); await p.waitForTimeout(400);
      await p.addStyleTag({ content: `:root{--safe-t:${ins.t}px !important;--safe-b:${ins.b}px !important;--safe-l:${ins.l}px !important;--safe-r:${ins.r}px !important}` + (big ? "html{font-size:200%!important}" : "") });
      await p.evaluate(() => dispatchEvent(new Event("resize"))); await p.waitForTimeout(400);
      const tag = `${dev}-${orient}`, tail = `${big ? "-200" : ""}-${dark ? "dark" : "light"}`;
      const shot = async (scr, what) => { const file = path.join(OUT, `${tag}-${scr}${tail}.png`); await p.screenshot({ path: file });
        const m = await p.evaluate(() => ({ counter: document.documentElement.classList.contains("counter"), duoInner: document.documentElement.classList.contains("duo-inner") }));
        shots.push({ file: path.relative(L.ROOT, file), device: dev, size: `${w}x${h}`, orient, insets: ins, text: big ? "200%" : "default", scheme: dark ? "dark" : "light", what, mode: m.counter ? "counter" : "cover", errors: W.errs.slice() }); };
      const tap = async s => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }); await l.tap({ timeout: 4000 }); await p.waitForTimeout(300); };
      await shot("today", "today");
      await tap("#openPlan"); await p.waitForTimeout(200); await tap("#btnMore");
      await p.evaluate(() => document.getElementById("moreRow").scrollIntoView({ block: "center" })); await p.waitForTimeout(250);
      await shot("more", "More open on the Week and progress page");
      await tap("#btnUpdate"); await p.waitForTimeout(250); await shot("update", "Update plan opened from More");
      if (dev === "iphone-se" && orient === "portrait" && !big) {
        await p.focus("#updCode"); await p.waitForTimeout(150); const kb = 260; await p.setViewportSize({ width: w, height: h - kb }); await p.waitForTimeout(500);
        await shot("update-keyboard", `Update plan with the keyboard up (viewport ${w}x${h - kb}: a ${kb}px keyboard)`);
        await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(900);
      }
      await tap("#updCancel"); await tap("#btnMore").catch(() => {});
      if ((await p.evaluate(() => document.getElementById("btnMore").getAttribute("aria-expanded"))) !== "true") await tap("#btnMore");
      await tap("#btnAbout"); await p.waitForTimeout(250); await shot("about", "About");
      await ctx.close();
    }
    T.close();
  }
  for (const k in br) await br[k].close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ note: "Each PNG is the full CSS viewport at DPR 2 (not full page). Safe areas applied as CSS custom properties.", shots }, null, 1));
  const files = shots.map(s => path.relative(OUT, path.join(L.ROOT, s.file)));
  execSync(`montage ${files.map(f => `-label '${path.basename(f, ".png")}' '${f}'`).join(" ")} -geometry 300x300+8+8 -tile 8x -background '#202421' -fill '#ddd' -pointsize 11 CONTACT-SHEET.png`, { cwd: OUT });
  console.log(shots.length + " shots; errors: " + shots.filter(s => s.errors.length).length + "; modes " + JSON.stringify(shots.map(s => s.device + "-" + s.orient + ":" + s.mode).filter((v, i, a) => a.indexOf(v) === i)));
})().catch(e => { console.error(e); process.exit(1); });
