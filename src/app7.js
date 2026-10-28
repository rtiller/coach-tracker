
  /* ================= Boot ================= */
  document.getElementById("appVer").textContent = APP_VERSION;
  document.getElementById("toastUndo").addEventListener("click", function () {
    const f = undoFn; hideToast();
    if (f) f();
  });
  if (OUTER_MQ.addEventListener) OUTER_MQ.addEventListener("change", function () { if (PLAN) renderDuo(); }); else OUTER_MQ.addListener(function () { if (PLAN) renderDuo(); });
  /* theme-color follows the page backdrop token in each mode */
  (function () {
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    function sync() {
      const bg = getComputedStyle(document.body).backgroundColor;
      metas.forEach(function (m) { m.setAttribute("content", bg); m.removeAttribute("media"); });
    }
    sync();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", sync); else mq.addListener(sync);
  })();
  window.addEventListener("resize", detectLargeText);
  /* deferred a frame so a class change never re-enters the observer in the same frame (WebKit logs a loop error) */
  var lgRaf = 0;
  if (window.ResizeObserver) new ResizeObserver(function () { cancelAnimationFrame(lgRaf); lgRaf = requestAnimationFrame(function (ts) { detectLargeText(); syncCounter(); if (PLAN) syncNav(); if (counterOn && !fitFresh(ts)) { fitTs = ts; try { fitCounter(); } finally { fitTs = -1; } } }); }).observe(document.documentElement);

  /* back from the background on a new day: follow the calendar unless a week was picked on purpose */
  let shownDay = localDay();
  function onResume() {
    if (document.visibilityState !== "visible" || !PLAN || READONLY || dialogOpen() || localDay() === shownDay) return;
    shownDay = localDay();
    const w = autoWeek(state.week);
    if (w !== state.week) state.week = w;
    setView(null); persist();
    renderAll();
    /* both date fields default to the new today */
    ["bodyDate", "liftDate"].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = todayISO(); });
  }
  document.addEventListener("visibilitychange", onResume);
  window.addEventListener("pageshow", onResume);
  setupIO();
  const START_SS = "ct-start-asked";
  function maybeAskStart() {
    if (!PLAN || state.startDate || dialogOpen()) return;
    try { if (sessionStorage.getItem(START_SS)) return; sessionStorage.setItem(START_SS, "1"); } catch (e) {}
    askStartDate();
  }
  try {
  const ss = storeSchema();
  if (ss > STORE_SCHEMA || ss < 0) {
    /* data from a newer tracker: read nothing, write nothing */
    READONLY = true;
    showEmpty();
    openDialog({ kind: "error", warn: true, title: "This device has data from a newer tracker",
      body: "Open the newest tracker link from your coach. This page will not change that data.", buttons: [{ label: "OK", cls: "ghost", id: "dlgOk" }], onCancel: function () {} });
  } else {
    for (let v = ss; v > 0 && v < STORE_SCHEMA; v++) if (MIGRATIONS[v]) MIGRATIONS[v]();
    loadState();
    restoreView();
    syncCounter(true);
    if (PLAN) showApp(); else showEmpty();
    if (storedPlanBad) openDialog({ kind: "error", warn: true, title: "The saved plan could not be read",
      body: "Your log is still on this device. Paste your plan code again, or use More, then Update plan.", buttons: [{ label: "OK", cls: "ghost", id: "dlgOk" }], onCancel: function () {} });
    const code = readHashCode();
    Promise.resolve(code ? handleLink(code) : null).then(maybeAskStart);
    window.addEventListener("hashchange", function () { const c = readHashCode(); if (c) handleLink(c).then(maybeAskStart); });
  }
  } catch (e) { showFatal(e); }
  window.__ct = { version: APP_VERSION, prefix: LS_PREFIX, decodePlan: function (s) { return decodePlan(s).then(function (r) { return { ok: true, via: r.via, name: r.plan.meta.name }; }, function (e) { return { ok: false, kind: e.kind, title: e.title }; }); } };
})();
</script>
</body>
</html>
