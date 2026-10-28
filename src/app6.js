
  /* ================= Dialog ================= */
  /* One pinned dialog for start date, replace plan, import and errors. Buttons: [{ label, cls, fn, id }]. */
  let dlgReturn = null, dlgCancel = null;
  /* Two panes (inner landscape): a dialog opens in the pane that holds the control that was tapped, never across the
     hinge. A control that spans both panes uses the side of the tap point. Dialogs nobody tapped for open on the left. */
  let lastSide = "l";
  function sideOf(node, x) {
    const W = window.innerWidth; if (OUTER_MQ.matches) return "l";
    const r = node && node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    if (r && r.width) { if (r.left >= W / 2) return "r"; if (r.right <= W / 2) return "l"; }
    return x != null && x >= W / 2 ? "r" : "l";
  }
  /* the control last tapped (or activated from the keyboard), and where: a dialog it opens is placed next to it */
  let lastTap = null;
  document.addEventListener("pointerdown", function (e) {
    const t = e.target && e.target.closest ? (e.target.closest("button, a, label, input, textarea, select, summary, [role=button]") || e.target) : null;
    lastSide = sideOf(t, e.clientX);
    lastTap = { el: t, x: e.clientX, at: performance.now() };
  }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { lastSide = sideOf(document.activeElement, null); lastTap = { el: document.activeElement, x: null, at: performance.now() }; } }, true);
  function recentTap(ms) { return lastTap && performance.now() - lastTap.at < ms && lastTap.el && lastTap.el.isConnected && lastTap.el !== document.body ? lastTap : null; }

  /* ================= Popover placement (v0.1.3.3) ================= */
  /* Cover pattern only (phones, the cover screen in portrait and landscape, inner portrait). A dialog opened from a control
     sits next to it: just above it, or just below when there is no room above, 8px away; centered on the tap point (or the
     control's center from the keyboard) and clamped 16px (or the safe area) inside the screen; at most 560px and the screen
     width less 32px wide. It never goes above the top clear zone, max(safe-area top, 50px) + 12px (#clearProbe measures it),
     and keeps out of the bottom toolbar zone (50px + safe area) unless the keyboard is up. Taller than the room: it fills the
     room and scrolls inside. No control (a link, a load): it sits at the top clear zone. While the keyboard is up it follows
     the visual viewport. Two panes (inner landscape) keep the CSS per-pane rule, unchanged. Positions are set before the
     first frame, so the fade-in still paints full size (only opacity and the 8px rise animate). */
  const POP_GAP = 8;
  /* a short landscape window (the Counter's shape), from the window CSS lays out with */
  const KB_LAND_MQ = window.matchMedia("(orientation: landscape) and (max-height: 499.98px)");
  function popLimits(kbUp) {
    const pr = document.getElementById("clearProbe").getBoundingClientRect();
    const vv = window.visualViewport, ih = window.innerHeight;
    const vTop = vv ? Math.max(0, vv.offsetTop) : 0, vH = vv ? vv.height : ih;
    const W = document.documentElement.clientWidth || window.innerWidth;
    const safeB = Math.max(0, ih - pr.bottom), kb = kbUp || vH < ih - 80;
    /* the 50px zone is Safari's bottom toolbar in portrait; in landscape (the Counter) Safari keeps its bars at the top.
       v0.1.3.3: with the keyboard up in the Counter there is no status band to clear (a phone in landscape shows none),
       so the panel may rise to the safe area (padding-top of #clearProbe is the resolved top inset) and use the room */
    /* v0.1.4.3: the same in the single column in a short landscape window (200% text under 700 wide, Designer option 3):
       it is the Counter's window without the Counter, so the keyboard leaves it the same ~170px */
    const top = kb && (counterOn || KB_LAND_MQ.matches) ? Math.max(8, parseFloat(getComputedStyle(document.getElementById("clearProbe")).paddingTop) || 0) : pr.top;
    return { top: vTop + top, bottom: vTop + vH - (kb ? 8 : (counterOn ? 0 : 50) + safeB + 8), left: Math.max(16, pr.left), right: W - Math.max(16, W - pr.right), W: W };
  }
  function placePop(box, anchor, x) {
    const s = box.style;
    if (!OUTER_MQ.matches || box.hidden) { s.top = s.left = s.right = s.width = s.maxHeight = ""; box.removeAttribute("data-at"); return; }
    const L = popLimits(box.classList.contains("typing"));
    const w = Math.max(0, Math.min(560, L.W - 32, L.right - L.left));
    s.right = "auto"; s.width = w + "px"; s.maxHeight = Math.max(80, Math.floor(L.bottom - L.top)) + "px";
    const h = box.offsetHeight;
    let a = anchor && anchor.isConnected ? anchor.getBoundingClientRect() : null;
    if (a && !a.width && !a.height) a = null;
    let top = L.top, at = "top";
    if (a) {
      const above = a.top - POP_GAP - h, below = a.bottom + POP_GAP;
      if (above >= L.top && a.top - POP_GAP <= L.bottom) { top = above; at = "above"; }
      else if (below >= L.top && below + h <= L.bottom) { top = below; at = "below"; }
      else { top = a.top - L.top > L.bottom - a.bottom ? above : below; at = "clamped"; }
    }
    top = Math.max(L.top, Math.min(top, L.bottom - h));
    const cx = x != null ? x : a ? a.left + a.width / 2 : L.W / 2;
    const left = Math.max(L.left, Math.min(cx - w / 2, L.right - w));
    s.top = Math.round(top) + "px"; s.left = Math.round(left) + "px";
    box.setAttribute("data-at", at);
  }
  let dlgAnchor = null, dlgX = null, placeUpd = null, closeUpdQuiet = null;
  function placeDlg() { const d = document.getElementById("dlg"); if (!d.hidden) placePop(d, dlgAnchor, dlgX); }
  (function () {
    const again = function () { placeDlg(); if (typeof placeUpd === "function") placeUpd(); };
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", again); window.visualViewport.addEventListener("scroll", again); }
    window.addEventListener("resize", again);
    if (OUTER_MQ.addEventListener) OUTER_MQ.addEventListener("change", again); else OUTER_MQ.addListener(again);
    /* content that grows or shrinks after opening (an inline error, a status line) re-places the panel, so it never
       spills into the bottom zone or off its control; same size in, same place out, so this settles in one pass */
    if (window.ResizeObserver) { const ro = new ResizeObserver(function () { requestAnimationFrame(again); }); ["dlg", "updBox"].forEach(function (id) { const e = document.getElementById(id); if (e) ro.observe(e); }); }
  })();
  function openDialog(o) {
    const d = document.getElementById("dlg");
    dlgReturn = document.activeElement;
    d.className = "dlg" + (o.warn ? " warn" : "") + (lastSide === "r" ? " pane-r" : "");
    d.dataset.kind = o.kind || "";
    document.getElementById("dlgTitle").textContent = o.title;
    document.getElementById("dlgBody").textContent = o.body || "";
    /* extra is either static markup from this file, or DOM nodes built with textContent (anything carrying plan or error text) */
    const ex = document.getElementById("dlgExtra");
    ex.innerHTML = typeof o.extra === "string" ? o.extra : "";
    if (o.extra && typeof o.extra !== "string") [].concat(o.extra).forEach(function (n) { ex.appendChild(n); });
    const row = document.getElementById("dlgBtns");
    row.innerHTML = "";
    let first = null;
    o.buttons.forEach(function (b) {
      const el = document.createElement("button");
      el.type = "button"; el.className = "btn " + (b.cls == null ? "ghost" : b.cls); el.textContent = b.label; if (b.id) el.id = b.id;
      el.addEventListener("click", function () { if (b.keep !== true) closeDialog(); if (b.fn) b.fn(); });
      row.appendChild(el);
      if (!first) first = el;
    });
    dlgCancel = o.onCancel || null;
    /* placed next to the control that opened it (o.anchor, else a control tapped in the last 1.5s), before it paints */
    const tap = recentTap(1500);
    dlgAnchor = o.anchor || (tap && !d.contains(tap.el) ? tap.el : null);
    dlgX = !o.anchor && tap && tap.el === dlgAnchor ? tap.x : null;
    d.hidden = false;
    placePop(d, dlgAnchor, dlgX);
    document.getElementById("dlgScrim").hidden = false;
    const f = o.focus ? document.getElementById(o.focus) : first;
    if (f) f.focus({ preventScroll: true });
  }
  function closeDialog() {
    const d = document.getElementById("dlg");
    d.hidden = true; placePop(d, null, null); dlgAnchor = null; dlgX = null;
    document.getElementById("dlgScrim").hidden = true;
    dlgCancel = null;
    if (dlgReturn && dlgReturn.focus && document.contains(dlgReturn)) dlgReturn.focus({ preventScroll: true });
    dlgReturn = null;
  }
  function dialogOpen() { return !document.getElementById("dlg").hidden; }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && dialogOpen() && dlgCancel) { const f = dlgCancel; closeDialog(); f(); }
  });
  /* The technical lines sit behind a closed disclosure, with Copy, so a person sees plain words first. */
  let detSeq = 0;
  /* DOM helper: text only, never markup */
  function el(tag, cls, text, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  /* the same X as the toast's close button, built as DOM */
  function xIcon() {
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), path = document.createElementNS(ns, "path");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "18"); svg.setAttribute("height", "18"); svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2.4"); svg.setAttribute("stroke-linecap", "round");
    path.setAttribute("d", "M6 6l12 12M18 6L6 18"); svg.appendChild(path); return svg;
  }
  function errorDetails(err) {
    const lines = ["Problem: " + err.title].concat(err.details || []);
    const id = "errDet" + (++detSeq);
    const d = el("details", "err-more");
    d.appendChild(el("summary", null, "Details for your coach"));
    d.appendChild(el("pre", "err-text", lines.join("\n"), { id: id, tabindex: "0" }));
    const row = el("div", "err-copy-row");
    row.appendChild(el("button", "btn ghost err-copy", "Copy details", { type: "button", "data-copy": id }));
    row.appendChild(el("span", "err-copied", null, { role: "status", "aria-live": "polite" }));
    d.appendChild(row);
    return d;
  }
  document.addEventListener("click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-copy]") : null;
    if (!b) return;
    const pre = document.getElementById(b.dataset.copy), msg = b.parentNode.querySelector(".err-copied");
    const text = pre ? pre.textContent : "";
    function selectAll() {
      try { const r = document.createRange(); r.selectNodeContents(pre); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (x) {}
      let ok = false; try { ok = document.execCommand("copy"); } catch (x) {}
      msg.textContent = ok ? "Copied" : "Selected. Use Copy from your phone\u2019s menu.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { msg.textContent = "Copied"; }, selectAll);
    else selectAll();
  });
  const LINK_REASON = {
    corrupt: "It may have been cut off when it was copied. Ask your coach to send it again.",
    invalid: "Something in the plan needs fixing. Send the details below to your coach.",
    version: "It was made for a newer tracker. Ask your coach for a link to the current one.",
    large: "It is much bigger than any training plan, so it was not loaded."
  };
  function showPlanError(err, where) {
    if (!(err instanceof PlanError)) err = errCorrupt();
    const link = where === "link";
    openDialog({ kind: "error", warn: true, title: link ? "This plan link didn\u2019t work" : err.title,
      body: link ? "The tracker could not use it. " + (LINK_REASON[err.kind] || LINK_REASON.corrupt) : err.body,
      extra: [el("p", "dlg-note", "Nothing on this device was changed." + (link && PLAN ? " Your current plan is still loaded." : "")), errorDetails(err)],
      buttons: [{ label: "OK", cls: "ghost", id: "dlgOk" }], onCancel: function () {} });
  }
  function inlineError(id, err) {
    const box = document.getElementById(id);
    if (!err) { box.hidden = true; box.textContent = ""; return; }
    if (!(err instanceof PlanError)) err = errCorrupt();
    box.textContent = "";
    box.appendChild(el("b", null, err.title));
    box.appendChild(document.createTextNode(err.body));
    box.appendChild(el("div", "err-nochange", "Nothing was changed."));
    box.appendChild(errorDetails(err));
    box.hidden = false;
  }

  /* ================= Plan intake ================= */
  function samePlan(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  /* Swap the plan only. Data keys (done, lifts, body) are never touched; marks map by day key and lift id. */
  function applyPlan(plan, fp, msg) {
    const first = !PLAN;
    const snap = snapshotKeys();
    markSeen(fp);
    setPlan(plan);
    lsSet("plan", plan);
    state.week = autoWeek(state.week);
    persist();
    setView(null);
    showApp();
    if (first) { if (!state.startDate) askStartDate(); else showUndo("Plan loaded", null, 4000); }
    else showUndo(msg || "Plan updated", function () { restoreKeys(snap); reloadAll(); }, 10000);
  }
  function reloadAll() { loadState(); setView(null); if (PLAN) showApp(); else showEmpty(); }

  function readHashCode() {
    const h = window.location.hash || "";
    if (!/^#p=/.test(h) && h.indexOf("&p=") < 0) return null;
    return h.slice(1);
  }
  function clearHash() {
    try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
  }
  /* v0.1.4 (Security Q2, approved by the maintainer): off iOS there is no navigator.standalone (Android, desktop). There a
     Home Screen shortcut shares this storage, so keeping the plan in the address bar buys nothing and leaves it in the
     shortcut, history and sync. Once the link's plan is confirmed written (the stored plan reads back as that plan and the seen list
     holds the link), #p= is removed with replaceState (never a new history entry), and only if the address bar still holds
     this same link. iOS Safari keeps today's flow (KEEP_LINK_IN_TAB): its Home Screen app starts with storage of its own. */
  function clearSavedLink(code, fp, plan) {
    if ("standalone" in window.navigator) return;
    const h = readHashCode();
    if (!h || fnv(extractCode(h)) !== fp) return;
    let ok = false;
    try { const seen = JSON.parse(localStorage.getItem(LS_PREFIX + "seen")); ok = Array.isArray(seen) && seen.indexOf(fp) >= 0 && localStorage.getItem(LS_PREFIX + "plan") === JSON.stringify(plan); } catch (e) { ok = false; }
    if (ok) clearHash();
  }
  async function handleLink(raw) {
    const code = extractCode(raw);
    const fp = fnv(code);
    if (isStandalone() || !KEEP_LINK_IN_TAB) clearHash();
    if (PLAN && state.seen.indexOf(fp) >= 0) { /* this link was already handled on this device */
      if (!("standalone" in window.navigator) && readHashCode()) { try { const r = await decodePlan(code); clearSavedLink(code, fp, r.plan); } catch (e) {} }
      return;
    }
    let res;
    try { res = await decodePlan(code); }
    catch (err) { showPlanError(err, "link"); return; }
    if (!PLAN) { applyPlan(res.plan, fp); clearSavedLink(code, fp, res.plan); return; }
    if (samePlan(PLAN, res.plan)) { markSeen(fp); persist(); clearSavedLink(code, fp, res.plan); showUndo("This plan is already loaded", null, 4000); return; }
    openDialog({ kind: "replace", warn: true, title: "Use the plan from this link?",
      body: "It replaces \u201c" + PLAN.meta.name + "\u201d with \u201c" + res.plan.meta.name + "\u201d. Your logged days, lifts and weigh-ins stay.",
      extra: '<p class="dlg-note">' + res.plan.meta.weeks + "\u00a0weeks, " + res.plan.days.filter(function (d) { return !d.rest; }).length + "\u00a0training days a week. You can undo this for 10 seconds.</p>",
      buttons: [
        { label: "Keep current plan", cls: "ghost", id: "dlgKeep", fn: function () { markSeen(fp); persist(); } },
        { label: "Use new plan", cls: "ic-replace", id: "dlgUse", fn: function () { applyPlan(res.plan, fp, "New plan in use"); clearSavedLink(code, fp, res.plan); } }
      ],
      onCancel: function () { markSeen(fp); persist(); } });
  }

  /* Start date: asked once a plan is loaded. Default is the coming Monday (today if today is Monday). */
  function askStartDate() {
    try { sessionStorage.setItem("ct-start-asked", "1"); } catch (e) {} /* asked once per visit, however it was opened */
    const nextMon = isoOf(comingMonday());
    const thisMon = isoOf(mondayOf(parseISO(todayISO())));
    const CHECK = '<svg class="qp-check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    /* On iPhone a Home Screen app has its own storage. In a tab the #p= link stays in the address bar, so an icon added
       later still gets the plan, but not the date or log saved here. A pasted plan leaves no link, so the icon gets nothing. */
    /* v0.1.4: iOS only. Off iOS the shortcut shares this storage (and the link leaves the address bar once saved) */
    const hs = isStandalone() || !("standalone" in window.navigator) ? "" : readHashCode()
      ? "Adding this page to your Home Screen later starts fresh. Add it first, then set your date there."
      : "Adding this page to your Home Screen later starts fresh, with no plan. Add it first, then paste your plan code there.";
    openDialog({ kind: "start", title: "When do you start Week 1?",
      body: "Pick the Monday you start. Any other day counts from the Monday of that week.",
      extra: '<div class="qp-row" role="group" aria-label="Quick picks">' +
          '<button type="button" class="qp" id="dlgNextMon" data-date="' + nextMon + '" aria-pressed="false">' + CHECK + "<span>Next Monday, " + fmtDate(comingMonday(), false) + "</span></button>" +
          '<button type="button" class="qp" id="dlgThisWk" data-date="' + thisMon + '" aria-pressed="false">' + CHECK + "<span>This week, from " + fmtDate(parseISO(thisMon), false) + "</span></button>" +
        "</div>" +
        '<label class="field"><span>Or pick a date</span><input type="date" id="dlgStart" value="' + escapeHtml(state.startDate || nextMon) + '" /></label>' +
        (hs ? '<p class="dlg-note" id="dlgHsNote">' + hs + "</p>" : ""),
      buttons: [
        { label: "Not now", cls: "text", id: "dlgLater" },
        { label: "Save start date", cls: "primary", id: "dlgSaveStart", keep: true, fn: function () {
          const v = document.getElementById("dlgStart").value;
          if (!parseISO(v)) { document.getElementById("dlgStart").focus(); return; }
          closeDialog();
          const prev = state.startDate;
          state.startDate = v;
          clearWeekPick();
          state.week = autoWeek(state.week);
          persist(); setView(null); renderAll();
          showUndo(prev ? "Start date changed" : "Start date saved", null, 3000);
        } }
      ], focus: "dlgSaveStart", onCancel: function () {} });
    const input = document.getElementById("dlgStart");
    const picks = Array.prototype.slice.call(document.querySelectorAll("#dlg .qp"));
    function sync() { picks.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.date === input.value)); }); }
    picks.forEach(function (b) { b.addEventListener("click", function () { input.value = b.dataset.date; sync(); }); });
    input.addEventListener("input", sync); input.addEventListener("change", sync);
    sync();
  }

  /* ================= More: Update plan, Export, Import ================= */
  let ioBound = false, pendingImport = null, importFrom = null;
  function setupIO() {
    if (ioBound) return; ioBound = true;
    const more = document.getElementById("btnMore"), moreRow = document.getElementById("moreRow");
    more.addEventListener("click", function () {
      const open = moreRow.hidden;
      moreRow.hidden = !open;
      more.setAttribute("aria-expanded", String(open));
    });
    /* Update plan: a panel pinned near the top. Paste code reads the clipboard, so most people never see the keyboard;
       the field is the fallback, and while it has focus the panel follows the visual viewport so the field
       and Use this plan stay above the keyboard. */
    const upd = document.getElementById("btnUpdate"), box = document.getElementById("updBox"), scr = document.getElementById("updScrim");
    const code = document.getElementById("updCode"), use = document.getElementById("updUse"), pmsg = document.getElementById("updPasteMsg");
    const PASTE_HINT = "Or paste it into the box.";
    let updX = null;
    function fitUpd() {
      const vv = window.visualViewport, root = document.documentElement.style;
      /* v0.1.3.3: cover pattern: the panel sits next to Update plan (placePop) and follows the visual viewport while typing */
      if (OUTER_MQ.matches && !box.hidden) {
        root.removeProperty("--vv-top"); root.removeProperty("--vv-h");
        placePop(box, upd, updX);
        /* bring Use this plan up, but never scroll the field's top edge out of the panel */
        if (document.activeElement === code) { const b = box.getBoundingClientRect(), r = use.getBoundingClientRect(), f = code.getBoundingClientRect(); if (r.bottom > b.bottom) box.scrollTop += Math.max(0, Math.min(r.bottom - b.bottom + 8, f.top - b.top - 2)); }
        return;
      }
      placePop(box, null, null);
      /* v0.1.2: only while typing does the panel follow the visual viewport. Before, its max-height followed it from the
         first frame, so opening it while the keyboard was still closing (right after a weigh-in) painted a clipped sliver. */
      if (box.hidden || !vv || !box.classList.contains("typing")) { root.removeProperty("--vv-top"); root.removeProperty("--vv-h"); return; }
      root.setProperty("--vv-top", Math.max(0, vv.offsetTop) + "px");
      root.setProperty("--vv-h", vv.height + "px");
      if (document.activeElement === code) {
        /* keep the field and its button inside the panel's visible part */
        const b = box.getBoundingClientRect(), r = use.getBoundingClientRect();
        if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
      }
    }
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", fitUpd); window.visualViewport.addEventListener("scroll", fitUpd); }
    window.addEventListener("resize", fitUpd);
    function setTyping(on) {
      box.classList.toggle("typing", on);
      use.classList.toggle("ghost", !on && !code.value.trim());
      box.scrollTop = 0; fitUpd();
    }
    code.addEventListener("focus", function () { setTyping(true); requestAnimationFrame(fitUpd); setTimeout(fitUpd, 300); });
    code.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== code) setTyping(false); }, 0); });
    code.addEventListener("input", function () { use.classList.toggle("ghost", !code.value.trim() && !box.classList.contains("typing")); });
    placeUpd = fitUpd;
    closeUpdQuiet = function () { if (!box.hidden) setUpd(false); };
    function setUpd(open) {
      if (open) { box.classList.toggle("pane-r", lastSide === "r"); const tp = recentTap(1500); updX = tp && tp.el === upd ? tp.x : null; }
      box.hidden = !open; scr.hidden = !open; upd.setAttribute("aria-expanded", String(open));
      inlineError("updErr", null); document.getElementById("updOk").hidden = true;
      pmsg.textContent = PASTE_HINT;
      if (open) { setTyping(false); fitUpd(); document.getElementById("updPaste").focus({ preventScroll: true }); }
      else { code.value = ""; box.classList.remove("typing"); fitUpd(); }
    }
    upd.addEventListener("click", function () { setUpd(box.hidden); });
    function closeUpd() { setUpd(false); upd.focus({ preventScroll: true }); }
    document.getElementById("updCancel").addEventListener("click", closeUpd);
    scr.addEventListener("click", closeUpd);
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeUpd(); } });
    async function useCode() {
      const v = code.value;
      inlineError("updErr", null); document.getElementById("updOk").hidden = true;
      let res;
      try { res = await decodePlan(v); } catch (err) { inlineError("updErr", err); return; }
      if (samePlan(PLAN, res.plan)) { const ok = document.getElementById("updOk"); ok.textContent = "This plan is already loaded. Nothing changed."; ok.hidden = false; return; }
      setUpd(false);
      applyPlan(res.plan, res.fp, "Plan updated. Your log is kept.");
    }
    use.addEventListener("click", useCode);
    document.getElementById("updPaste").addEventListener("click", async function () {
      let text = null;
      try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) { text = null; }
      if (text == null) { pmsg.textContent = "This browser did not share the clipboard. Tap the box below, then paste."; return; }
      if (!text.trim()) { pmsg.textContent = "The clipboard is empty. Copy the code from your coach first, or paste it into the box."; return; }
      code.value = text.trim(); use.classList.remove("ghost");
      await useCode();
    });
    document.getElementById("btnExport").addEventListener("click", doExport);
    setupAbout();
    document.getElementById("btnImport").addEventListener("click", function () { importFrom = this; document.getElementById("importFile").click(); });
    document.getElementById("esImport").addEventListener("click", function () { importFrom = this; document.getElementById("importFile").click(); });
    document.getElementById("esExport").addEventListener("click", doExport);
    document.getElementById("importFile").addEventListener("change", onImportFile);
    document.getElementById("esUse").addEventListener("click", async function () {
      inlineError("esErr", null);
      let res;
      try { res = await decodePlan(document.getElementById("esCode").value); } catch (err) { inlineError("esErr", err); return; }
      document.getElementById("esCode").value = "";
      applyPlan(res.plan, res.fp);
    });
  }
  function exportPayload() {
    const data = {}, bad = {};
    DATA_KEYS.forEach(function (k) { const raw = lsRaw(k); if (raw != null) { try { data[k] = JSON.parse(raw); } catch (e) { bad[k] = raw; } } });
    const out = { app: APP_ID, schema: STORE_SCHEMA, version: APP_VERSION, exportedAt: new Date().toISOString(), data: data };
    /* a key that no longer parses is kept as stored text; Import ignores it */
    if (Object.keys(bad).length) out.data_raw = bad;
    return out;
  }
  /* ================= About and your data, and Get your own copy (v0.1.3.3) ================= */
  const REPO_URL = "https://github.com/rtiller/coach-tracker";
  /* The pristine built page, rebuilt from the copy tools/build.sh embeds in #app-src (never the live DOM, so no plan
     or log can get in, and never a network request). #app-src holds the page with every "~" as "~0" and every "<" as
     "~1", and in that copy the marker line stands where the encoded text goes; putting the encoded text back in place
     of the marker gives the shipped file byte for byte. */
  function ownCopy() {
    const enc = document.getElementById("app-src").textContent.slice(1); /* drop the newline after the start tag */
    const page = enc.replace(/~([01])/g, function (m, c) { return c === "0" ? "~" : "<"; });
    const mark = "\n@@APP_" + "SRC@@\n", i = page.indexOf(mark);
    if (i < 0) return null;
    return page.slice(0, i + 1) + enc + page.slice(i + mark.length);
  }
  function getOwnCopy() {
    const text = ownCopy(); if (!text) return;
    const blob = new Blob([text], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coach-tracker.html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  let aboutFrom = null;
  function setupAbout() {
    const page = document.getElementById("aboutPage"), btn = document.getElementById("btnAbout"), close = document.getElementById("aboutClose");
    document.getElementById("aboutSrc").href = REPO_URL;
    document.getElementById("aboutVer").textContent = APP_VERSION;
    /* one muted line for checking a device: what the page measures (the window) next to what the browser reports as the
       screen, and the layout that follows (the layout uses only the window) */
    const diag = document.getElementById("aboutDiag");
    function setDiag() {
      const r = document.documentElement.classList, m = window.LAYOUT.mode;
      const lay = m === "duo" ? "two panes" : m === "innerp" ? "inner portrait" : r.contains("counter") ? "Counter" : "phone";
      const de = document.documentElement, qy = function (q) { try { return window.matchMedia(q).matches ? "y" : "n"; } catch (e) { return "?"; } };
      diag.textContent = "Window " + window.innerWidth + "\u00d7" + window.innerHeight + " \u00b7 CSS " + de.clientWidth + "\u00d7" + de.clientHeight +
        " \u00b7 queries: landscape " + qy("(orientation: landscape)") + ", inner " + qy("(min-width: 520px) and (min-height: 520px)") +
        ", split " + qy("(orientation: landscape) and (min-width: 560px) and (max-height: 499.98px)") +
        (typeof weekRoomLast !== "undefined" && weekRoomLast ? ", week " + Math.round(weekRoomLast.box) + "/" + Math.round(weekRoomLast.need) + "px (12ch) " + (weekRoomLast.ok ? "y" : "n") : "") +
        " \u00b7 reported screen " + screen.width + "\u00d7" + screen.height + " \u00b7 layout: " + lay +
        (mutedErrors ? " \u00b7 ignored browser script errors: " + mutedErrors : "");
    }
    window.addEventListener("resize", function () { if (!page.hidden) setDiag(); });
    function setAbout(open) {
      if (open) setDiag();
      page.hidden = !open; document.documentElement.classList.toggle("about-open", open);
      if (open) { aboutFrom = document.activeElement; page.scrollTop = 0; close.focus({ preventScroll: true }); }
      else if (aboutFrom && aboutFrom.isConnected) aboutFrom.focus({ preventScroll: true });
    }
    btn.addEventListener("click", function () { setAbout(true); });
    close.addEventListener("click", function () { setAbout(false); });
    page.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); setAbout(false); } });
    document.getElementById("aboutCopy").addEventListener("click", getOwnCopy);
  }
  function doExport() {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workout-tracker-" + todayISO() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    showUndo("Export saved. Keep the file somewhere safe.", null, 4000);
  }
  function importError(title, body) {
    openDialog({ kind: "error", warn: true, anchor: importFrom && importFrom.isConnected ? importFrom : null, title: title, body: body, extra: '<p class="dlg-note">Nothing on this device was changed.</p>', buttons: [{ label: "OK", cls: "ghost", id: "dlgOk" }], onCancel: function () {} });
  }
  /* Checks an Export file. Returns { data } or an error title and body. */
  function checkImport(obj) {
    if (!obj || typeof obj !== "object" || obj.app !== APP_ID || !obj.data || typeof obj.data !== "object") return { title: "This is not a tracker backup", body: "Pick a file made with Export in this tracker." };
    if (typeof obj.schema !== "number" || obj.schema > STORE_SCHEMA) return { title: "This backup needs a newer tracker", body: "It was saved by a newer version. Open the current tracker link and import it there." };
    const d = obj.data;
    /* a stored schema newer than this tracker would lock the device on the next load */
    if ("schema" in d && (typeof d.schema !== "number" || d.schema > STORE_SCHEMA)) return { title: "This backup needs a newer tracker", body: "It was saved by a newer version. Open the current tracker link and import it there." };
    if (!d.plan) return { title: "This backup has no plan", body: "Pick a file made with Export after a plan was loaded." };
    const v = validatePlan(d.plan);
    if (!v.ok) return { title: "The plan in this backup has mistakes", body: v.error.details.slice(0, 3).join(" ") };
    const bad = Object.keys(d).filter(function (k) { return DATA_KEYS.indexOf(k) < 0; });
    if (bad.length) return { title: "This backup has unknown parts", body: "It may come from a different app." };
    const shapes = { done: "object", openDays: "object", lifts: "array", body: "array", seen: "array" };
    for (const k in shapes) if (k in d && (shapes[k] === "array" ? !Array.isArray(d[k]) : (typeof d[k] !== "object" || Array.isArray(d[k]) || d[k] === null))) return { title: "This backup is damaged", body: "Part of it (" + k + ") is not in the expected shape." };
    return { data: d };
  }
  function onImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (READONLY) { e.target.value = ""; importError("Import is off on this device", "This device has data from a newer tracker. Open the newest tracker link from your coach and import there."); return; }
    if (file.size > MAX_IMPORT_BYTES) { e.target.value = ""; importError("This file is too large", "A tracker backup is much smaller. Pick the file made with Export."); return; }
    const reader = new FileReader();
    reader.onload = function () {
      e.target.value = "";
      let obj = null;
      try { obj = JSON.parse(reader.result); } catch (err) { obj = null; }
      const c = obj ? checkImport(obj) : { title: "This file could not be read", body: "It is not a tracker backup. Pick the file made with Export." };
      if (!c.data) { importError(c.title, c.body); return; }
      pendingImport = c.data;
      openDialog({ kind: "import", warn: true, anchor: importFrom && importFrom.isConnected ? importFrom : null, title: "Replace all data on this device with " + file.name + "?",
        body: "Your current plan and log on this device are replaced by the backup.",
        extra: '<p class="dlg-note">You can undo this for 10 seconds.</p>',
        buttons: [
          { label: "Cancel", cls: "ghost", id: "icCancel", fn: function () { pendingImport = null; } },
          { label: "Replace all data", cls: "ic-replace", id: "icReplace", fn: doImport }
        ], onCancel: function () { pendingImport = null; } });
    };
    reader.readAsText(file);
  }
  function doImport() {
    if (READONLY || !pendingImport) return;
    const d = pendingImport; pendingImport = null;
    const snap = snapshotKeys(); /* in memory only */
    /* all or nothing: if any key does not fit, the old bytes go back and the import says so */
    let ok = true;
    try {
      appKeys().forEach(function (k) { localStorage.removeItem(k); });
      DATA_KEYS.forEach(function (k) { if (ok && k in d) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(d[k])); } catch (err) { ok = false; } } });
      if (ok && !("schema" in d)) { try { localStorage.setItem(LS_PREFIX + "schema", JSON.stringify(STORE_SCHEMA)); } catch (err) { ok = false; } }
    } catch (err) { ok = false; }
    if (!ok) {
      restoreKeys(snap); reloadAll();
      importError("Not enough space on this device", "The backup did not fit, so it was not imported. Your old data is back as it was.");
      return;
    }
    reloadAll();
    showUndo("Data imported", function () { restoreKeys(snap); reloadAll(); }, 10000);
  }

  /* ================= Screens ================= */
  function showEmpty() {
    document.getElementById("app").hidden = true;
    document.getElementById("emptyState").hidden = false;
    document.documentElement.classList.add("no-plan");
    /* a damaged plan or newer-tracker data still leaves a way to get the log out */
    document.getElementById("esSaved").hidden = appKeys().length === 0;
  }
  let appSetup = false;
  function showApp() {
    document.getElementById("emptyState").hidden = true;
    document.getElementById("app").hidden = false;
    document.documentElement.classList.remove("no-plan");
    if (!appSetup) { appSetup = true; setupTabs(); setupSheet(); setupLayoutMemory(); }
    renderAll();
    detectLargeText();
  }
  /* No start date yet: the ask sits above the today card in every layout, so it is never hidden in the closed sheet */
  function renderStartNudge() {
    const el = document.getElementById("startNudge");
    if (state.startDate) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = '<div class="banner" data-anchor><div style="flex:1;min-width:0">' +
      '<div class="btitle">Set your start date</div>' +
      '<div class="bbody">The tracker needs the Monday you start Week 1 to know which day is today.</div>' +
      '<button type="button" class="btn ghost" id="setStartBanner">Set start date</button></div></div>';
    document.getElementById("setStartBanner").addEventListener("click", function () { askStartDate(); });
  }
  /* One calm line under the header: before the start, after the end, or last week's open sessions. */
  function renderWeekNote() {
    const box = document.getElementById("weekNote");
    const raw = rawWeekFrom(state.startDate), cal = currentWeekFrom(state.startDate);
    /* built with textContent: only numbers, dates and fixed words reach it, but no markup is parsed either way */
    let note = null;
    const line = function (bold, rest) { const p = el("p"); p.appendChild(el("b", null, bold)); p.appendChild(document.createTextNode(rest)); return p; };
    if (state.startDate && raw < 1) {
      note = el("div", "wk-note", null, { "data-kind": "before" });
      note.appendChild(line("Starts " + mondayOf(parseISO(state.startDate)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(/ /g, "\u00a0") + ".", " Preview your Week\u00a01 sessions until then."));
    } else if (state.startDate && raw > TOTAL_WEEKS) {
      note = el("div", "wk-note", null, { "data-kind": "complete" });
      note.appendChild(line("Plan complete.", " You reached the end of all " + TOTAL_WEEKS + "\u00a0weeks. Tell your coach, so they can send your next plan."));
    } else if (state.startDate && cal >= 2 && state.week === cal && !weekPick()) {
      const prev = cal - 1, left = nTrain() - weekResolvedCount(prev);
      /* the X hides the line for the rest of this calendar week; a new week (or a new start date) forgets it */
      const hid = lsGet("weekNoteHidden", null);
      const hiddenNow = hid && hid.week === cal && hid.start === state.startDate;
      if (hid && !hiddenNow && !READONLY) { try { localStorage.removeItem(LS_PREFIX + "weekNoteHidden"); } catch (e) {} }
      if (left > 0 && !hiddenNow) {
        note = el("div", "wk-note", null, { "data-kind": "leftover" });
        const row = el("div", "wk-row");
        row.appendChild(el("p", null, "Week\u00a0" + prev + " has " + left + "\u00a0" + (left === 1 ? "session" : "sessions") + " left."));
        row.appendChild(el("button", "btn ghost", "Stay on week\u00a0" + prev, { type: "button", id: "stayWeek", "data-week": String(prev) }));
        const x = el("button", "wk-x", null, { type: "button", id: "hideWeekNote", "aria-label": "Hide this until next week" });
        x.appendChild(xIcon());
        x.addEventListener("click", function () { lsSet("weekNoteHidden", { week: cal, start: state.startDate }); renderWeekNote(); });
        row.appendChild(x);
        note.appendChild(row);
        note.appendChild(el("button", "btn text wk-push", "Push my plan back a week", { type: "button", id: "pushBack" }));
      }
    }
    box.textContent = ""; box.hidden = !note;
    if (note) box.appendChild(note);
    const stay = document.getElementById("stayWeek");
    if (stay) stay.addEventListener("click", function () { pickWeek(parseInt(stay.dataset.week, 10)); });
    const push = document.getElementById("pushBack");
    if (push) push.addEventListener("click", askPushBack);
  }
  function askPushBack() {
    const old = parseISO(state.startDate), next = addDays(mondayOf(old), 7);
    const cal = currentWeekFrom(state.startDate);
    openDialog({ kind: "pushback", title: "Push your plan back a week?",
      body: "Week\u00a01 will start " + fmtDate(next, false) + " instead of " + fmtDate(mondayOf(old), false) + ", so this week becomes week\u00a0" + (cal - 1) + " again. All your logged days, lifts and weigh-ins stay.",
      extra: '<p class="dlg-note">You can undo this for 10 seconds.</p>',
      buttons: [
        { label: "Keep my dates", cls: "text", id: "dlgPushKeep" },
        { label: "Push back a week", cls: "primary", id: "dlgPushYes", fn: function () {
          const snap = snapshotKeys();
          state.startDate = isoOf(next); clearWeekPick(); state.week = autoWeek(state.week);
          persist(); setView(null); renderAll();
          showUndo("Plan pushed back a week", function () { restoreKeys(snap); clearWeekPick(); reloadAll(); }, 10000);
        } }
      ], focus: "dlgPushYes", onCancel: function () {} });
  }
  function renderAll() {
    if (!PLAN) return;
    renderHeader();
    renderStartNudge();
    renderWeekNote();
    renderSpine();
    applyTab();
    renderDuo();    if (typeof syncCounter === "function") syncCounter(); if (counterOn) fitCounter();
  }

  /* ================= Counter (v0.1.3.3): the cover screen in landscape ================= */
  /* One type scale for every day: --cs is the largest step from CS_MAX down to CS_MIN at which the plan's longest day
     (every training day of one week per block and deload kind, measured in the real card) fits the card with no scroll,
     and (v0.1.4.1) never more than the step v0.1.3.4's layout fitted (the ceiling pass, .fit-ceil in the CSS).
     The floors are in the CSS (max()): exercise names 0.875rem (14px), sets, focus and labels 0.8125rem (13px), tags
     0.625rem (10px); 0.73 is where the names reach theirs. A day that does not fit at CS_MIN (or at 200% text) scrolls
     inside the card; nothing is clipped. Re-run on plan load, resize and text-size change. */
  const CS_MAX = 1.3, CS_MIN = 0.73, CS_STEP = 0.03;
  let fitTs = -1, fitDone = ""; /* see fitKey */
  function fitCounter() {
    const root = document.documentElement, card = document.getElementById("today");
    if (!counterOn || !PLAN || !card || !DAYS.length) { root.style.removeProperty("--cs"); root.classList.remove("counter-scroll"); return; }
    counterRows();
    /* v0.1.4: measure without the pill's strip and the list's end room (the --end-pad spacer; layoutMore puts them back after). Since (c) a list
       can take "more-on" at normal text, and a fit measured with them on would count the strip's 44px against the plan.
       Defensive: no gated case changed with it (s06's longest day overflows at CS_MIN either way). */
    card.classList.remove("more-on"); card.querySelectorAll(".set-rows").forEach(function (l) { l.style.removeProperty("--end-pad"); });
    const saveV = viewIdx, saveW = state.week, saveArm = armedKey, saveTop = card.scrollTop;
    const weeks = [], seen = {};
    for (let w = 1; w <= TOTAL_WEEKS; w++) { const m = weekMeta(w), k = m.block + "|" + !!m.deload; if (!seen[k]) { seen[k] = 1; weeks.push(w); } }
    const days = [];
    weeks.forEach(function (w) { DAYS.forEach(function (d, i) { if (!d.rest) days.push([w, i]); }); });
    const show = function (wd) { state.week = wd[0]; viewIdx = wd[1]; armedKey = null; renderToday(); };
    /* v0.1.3.4: the exercise list scrolls on its own (the card does not), so a day fits when neither overflows; a day's
       full height is the card's plus whatever its list hides */
    const exl = function () { return card.querySelector(".set-rows"); };
    const over = function () { const l = exl(); return card.scrollHeight - card.clientHeight > 0.5 || (!!l && l.scrollHeight - l.clientHeight > 0.5); };
    const tall = function () { const l = exl(); return card.scrollHeight + (l ? l.scrollHeight - l.clientHeight : 0); };
    let cs = CS_MAX, fits = true;
    const pane = document.getElementById("paneToday");
    try {
      /* v0.1.4.1: the ceiling. The search first runs with the bar reserving the Undo slot, as every bar did in v0.1.3.4, so
         the scale never grows past what that layout fitted (the room the slot gave back goes to long days, not bigger type) */
      if (pane) pane.classList.add("fit-ceil");
      root.style.setProperty("--cs", String(cs));
      /* the tallest day at the largest step goes first; each failure moves the search to the day that failed */
      let worst = null, wh = -1;
      days.forEach(function (wd) { show(wd); const t = tall(); if (t > wh) { wh = t; worst = wd; } });
      for (;;) {
        if (worst) { show(worst); if (over()) { if (cs <= CS_MIN) { fits = false; break; } cs = Math.max(CS_MIN, Math.round((cs - CS_STEP) * 100) / 100); root.style.setProperty("--cs", String(cs)); continue; } }
        const bad = days.find(function (wd) { show(wd); return over(); });
        if (!bad) break;
        worst = bad;
      }
      /* then the real layout: every day must fit at that scale with the slot given back, or the steps go on down to CS_MIN */
      if (pane) pane.classList.remove("fit-ceil");
      fits = true;
      for (;;) {
        const bad = days.find(function (wd) { show(wd); return over(); });
        if (!bad) break;
        if (cs <= CS_MIN) { fits = false; break; }
        cs = Math.max(CS_MIN, Math.round((cs - CS_STEP) * 100) / 100); root.style.setProperty("--cs", String(cs));
      }
    } finally {
      if (pane) pane.classList.remove("fit-ceil");
      state.week = saveW; viewIdx = saveV; armedKey = saveArm; renderToday(); }
    root.classList.toggle("counter-scroll", !fits || over());
    card.scrollTop = Math.min(saveTop, card.scrollHeight);
    layoutMore();
    fitDone = fitKey(fitTs);
  }
  /* v0.1.4.1: one fit per layout. A turn runs a fit from the resize handler, and the layout that fit makes trips app7's
     ResizeObserver a frame later, which ran a second full fit of the same layout (two passes now, about 170-360ms each
     in WebKit) and kept a turn busy past 600ms. The key is the viewport, the root font size, the card's box and the
     root's classes, set only by a fit from those two frame callbacks; a fit from anywhere else (a plan or content
     change, through renderAll) clears it, so the next callback fits again. */
  function fitKey(ts) {
    if (ts < 0) return "";
    const card = document.getElementById("today"), root = document.documentElement;
    return innerWidth + "x" + innerHeight + "|" + getComputedStyle(root).fontSize + "|" + (card ? card.clientWidth + "x" + card.clientHeight : "") + "|" + root.className;
  }
  function fitFresh(ts) { const k = fitKey(ts); return k !== "" && k === fitDone; }
  /* The week rows share the right column's height (repeat(7, 1fr)). When a row would be under 44px with 12px top and
     bottom padding (644x382 with a 21px bottom inset gives 42.9), the bottom padding goes (counter-tight: 44.1); measured
     with the 12px padding every time, so it comes back off when the room returns. */
  function counterRows() {
    const root = document.documentElement, list = document.querySelector("#weekStrip .wstrip");
    root.classList.remove("counter-tight", "counter-short");
    if (!counterOn || !list) return;
    if (list.clientHeight / 7 < 44 - 0.01) root.classList.add("counter-tight");
    if (list.clientHeight / 7 < 44 - 0.01) { root.classList.add("counter-short"); if (typeof counterReveal === "function") counterReveal(); }
  }
  let counterHold = 0, fitRaf = 0;
  function textEntry() { const a = document.activeElement; return !!a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && !/^(button|checkbox|radio|file|submit|reset|range|color)$/i.test(a.type))); }
  /* v0.1.4.3: short landscape from a media query (the viewport the CSS lays out with), not window.innerWidth/innerHeight,
     which a Home Screen app can report differently; its change event re-checks even when no resize fires */
  /* v0.1.4.3 (Designer A+): from 560px wide (the owner's cover screen gives the app a 594x466 window; the status column
     takes the rest), and only while the week column's content box holds 12ch in the day-name style at the current text
     size, measured in the split layout itself (so 200% text at 594x466 keeps the single column) */
  const COUNTER_MQ = window.matchMedia("(orientation: landscape) and (min-width: 560px) and (max-height: 499.98px)");
  const WEEK_CH = 12;
  let weekRoomLast = null;
  function weekRoom() {
    const root = document.documentElement, ws = document.getElementById("weekStrip");
    if (!ws) return true;
    const had = root.classList.contains("counter"), keep = ["counter-tight", "counter-short"].filter(function (c) { return root.classList.contains(c); });
    if (!had) root.classList.add("counter");
    keep.forEach(function (c) { root.classList.remove(c); });
    const row = document.createElement("div"), name = document.createElement("span");
    row.className = "wd"; row.setAttribute("aria-hidden", "true"); row.style.cssText = "visibility:hidden;height:0;min-height:0;pointer-events:none";
    name.className = "ss"; name.style.cssText = "position:absolute;width:" + WEEK_CH + "ch;flex:none";
    row.appendChild(name); ws.appendChild(row);
    const cs = getComputedStyle(row), box = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), need = name.getBoundingClientRect().width;
    row.remove();
    keep.forEach(function (c) { root.classList.add(c); });
    if (!had) root.classList.remove("counter");
    /* not laid out (no plan yet, or hidden): keep the last answer, or the query's */
    if (!(box > 0) || !(need > 0)) return weekRoomLast == null ? true : weekRoomLast.ok;
    weekRoomLast = { ok: box >= need - 0.01, box: box, need: need };
    return weekRoomLast.ok;
  }
  /* v0.1.4.3 (Designer, option 3): 200% text (a 32px root) in a landscape window under 700 wide always gets the single
     column, in every engine; otherwise (150%, or 200% from 700 wide) the 12ch measurement decides */
  const NARROW_MQ = window.matchMedia("(max-width: 699.98px)");
  function bigNarrow() { return NARROW_MQ.matches && parseFloat(getComputedStyle(document.documentElement).fontSize) >= 32 - 0.01; }
  /* v0.1.4.3 (Designer ruling C): the week header holds "This week ▾" + 12px + Back to today's full label, or else + "Today"
     (the accessible name stays "Back to today"); if neither fits, the single column. Measured in the split, like weekRoom */
  const HEAD_GAP = 12;
  let headRoomLast = null;
  function headRoom() {
    const root = document.documentElement, row = document.getElementById("navRow"), op = document.getElementById("openPlan"), slot = document.getElementById("backSlot");
    if (!row || !op || !slot) return "full";
    const had = root.classList.contains("counter");
    if (!had) root.classList.add("counter");
    const sd = slot.style.display; slot.style.setProperty("display", "flex", "important");
    const oc = op.cloneNode(true); oc.removeAttribute("id"); oc.setAttribute("aria-hidden", "true"); oc.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    const lab = oc.querySelector("span"); if (lab) lab.textContent = "This week";
    const bt = document.createElement("span"); bt.className = "back-today"; bt.setAttribute("aria-hidden", "true"); bt.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    const b = document.createElement("b"); b.textContent = "Back to today"; bt.appendChild(b);
    row.appendChild(oc); slot.appendChild(bt);
    const cs = getComputedStyle(row), box = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ow = oc.getBoundingClientRect().width, full = bt.getBoundingClientRect().width;
    b.textContent = "Today"; const short = bt.getBoundingClientRect().width;
    oc.remove(); bt.remove(); slot.style.display = sd;
    if (!had) root.classList.remove("counter");
    if (!(box > 0) || !(ow > 0) || !(full > 0)) return headRoomLast == null ? "full" : headRoomLast.fit;
    headRoomLast = { fit: ow + HEAD_GAP + full <= box + 0.01 ? "full" : ow + HEAD_GAP + short <= box + 0.01 ? "short" : "none", box: box, op: ow, full: full, short: short };
    return headRoomLast.fit;
  }
  function wantCounter() { return OUTER_MQ.matches && COUNTER_MQ.matches && !bigNarrow() && weekRoom() && headRoom() !== "none"; }
  function syncBackLabel() {
    const s = counterOn && !!headRoomLast && headRoomLast.fit === "short";
    if (s === btShort) return;
    btShort = s;
    const b = document.querySelector("#backToday > b"); if (b) b.textContent = s ? "Today" : "Back to today";
  }
  /* the split's week heading is short ("This week"); the single column keeps "Week and progress" */
  function counterHeading(on) { const s = document.querySelector("#openPlan > span:first-child"); if (s) s.textContent = on ? "This week" : "Week and progress"; }
  /* the layout never flips while a text field has focus (the keyboard shrinks the viewport) or just after */
  function syncCounter(force) {
    if (!force && (textEntry() || performance.now() < counterHold)) return;
    const on = wantCounter();
    if (on === counterOn && !force) { syncBackLabel(); return; }
    const flip = on !== counterOn;
    counterOn = on;
    document.documentElement.classList.toggle("counter", on);
    counterHeading(on);
    syncBackLabel();
    if (!PLAN) return;
    if (flip) {
      /* a flip moves every control: a panel attached to one closes the way Cancel does (nothing changes); a prompt from
         a link (start date, replace plan, link error) has no control and stays, placed again by the resize handler */
      if (typeof closeUpdQuiet === "function") closeUpdQuiet();
      if (dialogOpen() && dlgAnchor) { const f = dlgCancel; closeDialog(); if (f) f(); }
    }
    fitCounter();
    if (flip) requestAnimationFrame(function () { if (counterOn) counterReveal(); else revealCard(); });
    else if (counterOn) counterReveal();
  }
  function queueCounter() { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(function (ts) { fitTs = ts; try { const was = counterOn; syncCounter(); if (counterOn && was && !fitFresh(ts)) fitCounter(); } finally { fitTs = -1; } }); }
  window.addEventListener("resize", queueCounter);
  [COUNTER_MQ, NARROW_MQ].forEach(function (q) { if (q.addEventListener) q.addEventListener("change", queueCounter); else q.addListener(queueCounter); });
  document.addEventListener("focusout", function (e) { const t = e.target; if (!t || !(t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !/^(button|checkbox|radio|file|submit|reset|range|color)$/i.test(t.type)))) return; counterHold = performance.now() + 700; setTimeout(queueCounter, 750); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (counterOn) fitCounter(); });
