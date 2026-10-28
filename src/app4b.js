
  /* ---- Header ---- */
  function renderHeader() {
    const m = weekMeta(state.week);
    document.getElementById("header").innerHTML =
      '<div class="phase">Training plan</div>' +
      "<h1>" + escapeHtml(PLAN.meta.name) + "</h1>" +
      '<div class="meta">' +
        '<span class="hi">WEEK ' + state.week + "</span> OF " + TOTAL_WEEKS +
        (N_BLOCKS > 1 ? " · BLOCK " + m.block : "") +
        " · " + (m.deload ? "DELOAD" : "WORK") +
      "</div>";
  }

  /* ---- Spine: one row per block ---- */
  function renderSpine() {
    const el = document.getElementById("spine");
    const cur = currentWeekFrom(state.startDate);
    const compact = N_BLOCKS >= 2 && BLOCK_WEEKS <= 4;
    let html = '<div class="spine-groups' + (compact ? " compact" : "") + '" style="--nb:' + Math.min(N_BLOCKS, 3) + '">';
    for (let b = 1; b <= N_BLOCKS; b++) {
      const first = (b - 1) * BLOCK_WEEKS + 1, last = Math.min(TOTAL_WEEKS, b * BLOCK_WEEKS);
      const n = last - first + 1;
      html += '<div class="spine-group"><div class="spine-bars" style="--cols-w:' + Math.min(BLOCK_WEEKS, 6) + ";--cols-n:" + Math.min(BLOCK_WEEKS, 4) + '">';
      for (let w = first; w <= last; w++) {
        const m = weekMeta(w);
        const full = weekComplete(w);
        const isSel = w === state.week;
        const isCur = cur >= 1 && w === cur;
        const cls = ["spine-pill", m.deload ? "deload" : "", full ? "done" : "", isSel ? "selected" : "", isSel && isCur ? "current" : "", isCur ? "pulse" : ""].filter(Boolean).join(" ");
        html += '<button type="button" class="' + cls + '" data-week="' + w + '" aria-label="Week ' + w + (m.deload ? " deload" : "") + (full ? " done" : "") + '">' + w + "</button>";
      }
      html += '</div><div class="spine-label">' + (N_BLOCKS > 1 ? "B" + pad2(b) : "All") + "</div></div>";
      void n;
    }
    html += "</div>";
    const anyDeload = (function () { for (let w = 1; w <= TOTAL_WEEKS; w++) if (weekMeta(w).deload) return true; return false; })();
    html +=
      '<div class="spine-legend">' +
        '<div class="leg"><i class="work"></i><span>work</span></div>' +
        (anyDeload ? '<div class="leg"><i class="dl"></i><span>deload</span></div>' : "") +
        '<div class="leg"><i class="dn"></i><span>done</span></div>' +
      "</div>";
    el.innerHTML = html;
    el.querySelectorAll(".spine-pill").forEach(function (btn) {
      btn.addEventListener("click", function () { pickWeek(parseInt(btn.dataset.week, 10)); });
    });
  }

  /* The heading already says Deload week, so a note that starts with it drops the repeat. */
  function deloadBody(t) {
    if (!t) return "";
    const s = String(t).replace(/^\s*deload(\s+week)?\s*[:.\u00b7-]\s*/i, "");
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }
  function startLabel() {
    const s = parseISO(state.startDate);
    return s ? fmtDate(mondayOf(s), false) : "";
  }

  /* ---- Train ---- */
  /* v0.1.4 (a): a day that opens grows to its full height in 200ms (ease-out, no bounce; at once under Reduce Motion). When
     closing the day above it moved its top out of view (under the page head or off screen), the page scrolls so the
     card's top sits just under the head. */
  function revealDay(idx, opening) {
    const card = document.querySelector('#panel-train .day[data-day="' + idx + '"]');
    if (!card) return;
    let sc = card.parentElement;
    while (sc && sc !== document.body && !(/(auto|scroll)/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) sc = sc.parentElement;
    if (!sc || sc === document.body) sc = document.scrollingElement;
    const doc = sc === document.scrollingElement;
    let head = doc ? 0 : sc.getBoundingClientRect().top;
    const sh = sc.querySelector(".sheet-head");
    if (sh && sh.getClientRects().length && /sticky|fixed/.test(getComputedStyle(sh).position)) head = Math.max(head, sh.getBoundingClientRect().bottom);
    const bottom = doc ? window.innerHeight : sc.getBoundingClientRect().bottom;
    const top = card.getBoundingClientRect().top;
    /* opening the page at that day (Up next): also when the day's end is below the screen */
    const cb = card.getBoundingClientRect().bottom;
    if (top < head - 0.5 || top > bottom - 44 || (opening && cb > bottom)) sc.scrollTop += top - head - 8;
    const body = card.querySelector(".day-body");
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (!body || reduce || opening || typeof body.animate !== "function") return;
    const h = body.getBoundingClientRect().height;
    if (h > 0) body.animate([{ height: "0px", opacity: 0, overflow: "hidden" }, { height: h + "px", opacity: 1, overflow: "hidden" }], { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  }

  /* v0.1.4 (a), Designer addendum (owner-approved): two columns only when the layout viewport is wider than tall AND the week
     list itself is at least 820px wide; one column everywhere else (every portrait view). Landscape follows the layout
     classes (the 520 rule, frozen while a text field has focus); outside inner it is the layout viewport's own shape. A
     ResizeObserver on the Train panel and resize / orientationchange re-check. */
  function landscapeLayout() {
    const r = document.documentElement;
    if (r.classList.contains("L-innerp")) return false;
    if (r.classList.contains("L-duo")) return true;
    return r.clientWidth > r.clientHeight;
  }
  function syncDayCols() {
    const w = document.querySelector("#panel-train .day-wrap");
    if (w) w.classList.toggle("cols2", landscapeLayout() && w.getBoundingClientRect().width >= 820);
  }
  /* v0.1.4: the sticky page head's height is the pane's scroll padding, so a control brought into view (keyboard focus,
     scrollIntoView) never ends up under the head (closing the day above can leave the next card's status there) */
  (function watchSheetHead() {
    const pane = document.getElementById("planPane"), head = pane && pane.querySelector(".sheet-head");
    if (!head || typeof ResizeObserver !== "function") return;
    let raf = 0; /* next frame, like watchDayCols: no work inside the observer callback */
    new ResizeObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { pane.style.setProperty("--head-h", head.offsetHeight + "px"); }); }).observe(head);
  })();
  (function watchDayCols() {
    const p = document.getElementById("panel-train");
    /* in the next frame: toggling .cols2 inside the observer changes the panel's own height, which WebKit reports as a
       "ResizeObserver loop completed with undelivered notifications" error */
    let raf = 0;
    if (p && typeof ResizeObserver === "function") new ResizeObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncDayCols); }).observe(p);
    else window.addEventListener("resize", syncDayCols);
    window.addEventListener("orientationchange", function () { requestAnimationFrame(syncDayCols); });
    if (typeof ResizeObserver === "function") window.addEventListener("resize", function () { requestAnimationFrame(syncDayCols); });
  })();

  function renderTrain() {
    const panel = document.getElementById("panel-train");
    const m = weekMeta(state.week);
    const block = BLOCKS[m.block] || {};
    const cur = currentWeekFrom(state.startDate);
    const wr = weekResolvedCount(state.week);
    let html = '<div class="fade">';

    html +=
      '<div class="week-sum">' +
        '<div class="week-sum-left">' +
          ringSvg(wr, nTrain()) +
          "<div>" +
            "<h2>Week " + state.week + "</h2>" +
            '<div class="sub">' + weekSubLabel(state.week) + "</div>" +
            '<div class="sub tap-hint" style="margin-top:2px;color:var(--mist)">Tap status: Done, then Skip, then clear</div>' +
          "</div>" +
        "</div>" +
        (cur < 1
          ? '<span class="pill-jump" style="border-color:var(--line);color:var(--mist)">' + (state.startDate ? "Starts " + startLabel() : "No start date") + "</span>"
          : state.week !== cur
          ? '<button type="button" class="pill-jump" id="jumpThisWeek">This week</button>'
          : weekComplete(state.week)
          ? '<span class="pill-jump" style="border-color:var(--jade);color:var(--jade);background:var(--jade-dim)">Week complete</span>'
          : '<span class="pill-jump" style="border-color:var(--ember);color: var(--ember-text)">This week</span>') +
      "</div>";


    if (m.deload) {
      html +=
        '<div class="banner">' +
          '<span class="moon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></span>' +
          "<div>" +
            '<div class="btitle">Deload week</div>' +
            '<div class="bbody">' + escapeHtml(deloadBody(PLAN.meta.deloadNote) || "A lighter week. Do about half the sets, keep technique sharp, and stop well short of failure.") + "</div>" +
          "</div>" +
        "</div>";
    }

    /* v0.1.4 (a): the week list is its own size container; one column under 820px (two above it, the open day full width) */
    html += '<div class="day-wrap"><div class="day-grid">';
    DAYS.forEach(function (day, idx) {
      const today = isTodaySession(state.week, idx);
      if (day.rest) {
        html +=
          '<div class="day rest-day" data-anchor>' +
            '<div class="day-head">' +
              '<div class="day-badge muted">' + escapeHtml(day.short) + "</div>" +
              '<span style="color:var(--mist);margin-right:4px" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></span>' +
              '<span style="color:var(--mist);font-size:0.9rem">' + escapeHtml(day.label || "Rest") + (day.note ? " · " + escapeHtml(day.note) : "") + "</span>" +
            "</div>" +
          "</div>";
        return;
      }
      const key = dayKey(state.week, idx);
      const status = dayStatus(key);
      const isDone = status === "done", isSkip = status === "skip";
      const isOpen = state.openDays[key] != null ? !!state.openDays[key] : today;
      const classes = ["day", isOpen ? "open" : "", isDone ? "done-day" : "", isSkip ? "skip-day" : "", today ? "today" : ""].filter(Boolean).join(" ");
      html += '<div class="' + classes + '" data-day="' + idx + '" data-anchor>';
      html += '<div class="day-head">';
      html += '<div class="day-badge' + (today ? " today" : "") + '">' + escapeHtml(day.short) + "</div>";
      html +=
        '<button type="button" class="day-toggle" data-toggle="' + idx + '" aria-expanded="' + isOpen + '">' +
          '<div class="title-row">' +
            '<span class="name">' + escapeHtml(day.label) + "</span>" +
            (isDone ? '<span class="st-word done">Done</span>' : isSkip ? '<span class="st-word">Skipped</span>' : "") +
            (day.priority ? '<span class="prio">' + escapeHtml(tagLabel("priority")) + "</span>" : "") +
          "</div>" +
          '<div class="focus">' + escapeHtml(day.focus) + ' <span class="chev">▾</span></div>' +
        "</button>";
      const weekFull = weekComplete(state.week);
      html +=
        '<button type="button" class="check-btn' + (isDone ? " done" : "") + (isSkip ? " skip" : "") + (isDone && weekFull ? " week-done" : "") +
        '" data-check="' + idx + '" aria-label="' + escapeHtml(day.short) + " status: " + (status || "open") + '. Tap to cycle Done, Skip, clear">' +
        statusIcons() + "</button>";
      html += "</div>";
      html += '<div class="day-body">';
      (block[day.key] || []).forEach(function (ex) {
        html += '<div class="ex"><div class="ex-left">';
        html += '<span class="ex-name">' + escapeHtml(ex.name) + "</span>";
        (ex.tags || []).forEach(function (t) { html += '<span class="tag ' + t + '">' + escapeHtml(tagLabel(t)) + "</span>"; });
        html += '</div><span class="ex-sets">' + escapeHtml(ex.sets) + (m.deload ? " · deload" : "") + "</span>";
        if (ex.note) html += '<div class="ex-hint" style="flex-basis:100%;margin-top:0">' + escapeHtml(ex.note) + "</div>";
        html += "</div>";
      });
      if (HINTS[day.key]) html += '<div class="ex-hint">' + escapeHtml(HINTS[day.key]) + "</div>";
      html += "</div></div>";
    });
    html += "</div></div>";
    html +=
      '<div class="stat-bar" data-anchor>' +
        '<span class="lbl">Total across ' + TOTAL_WEEKS + "\u00a0weeks</span>" +
        '<span class="val"><em>' + totalDone() + "</em> / " + (TOTAL_WEEKS * nTrain()) + "</span>" +
      "</div>";
    if (PLAN.meta.notes) {
      html += '<div class="notes-card" data-anchor><div class="vt">Notes from your coach</div><p>' + escapeHtml(PLAN.meta.notes) + "</p></div>";
    }
    html += "</div>";
    panel.innerHTML = html;
    syncDayCols();

    const jump = document.getElementById("jumpThisWeek");
    if (jump) jump.addEventListener("click", function () { clearWeekPick(); state.week = autoWeek(state.week); setView(null); persist(); renderAll(); });
    panel.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.dataset.toggle, 10), key = dayKey(state.week, idx);
        const wasOpen = btn.getAttribute("aria-expanded") === "true";
        /* v0.1.4 (a): one day open at a time; opening one closes the other (every card stays in its place in the week) */
        if (!wasOpen) DAYS.forEach(function (d, i) { if (!d.rest && i !== idx) state.openDays[dayKey(state.week, i)] = false; });
        state.openDays[key] = !wasOpen;
        persist();
        /* the re-render must not move the page: keep the scroll so the cards above stay put (revealDay then fixes a top
           that left the view) */
        const pane = document.getElementById("planPane"), keepPane = pane ? pane.scrollTop : 0, keepWin = window.scrollY;
        renderTrain();
        renderDuo();
        if (pane && pane.scrollTop !== keepPane) pane.scrollTop = keepPane;
        if (window.scrollY !== keepWin) window.scrollTo(window.scrollX, keepWin);
        if (!wasOpen) revealDay(idx);
      });
    });
    panel.querySelectorAll("[data-check]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.check, 10);
        const key = dayKey(state.week, idx);
        const cur = dayStatus(key);
        if (cur === "") state.done[key] = "done";
        else if (cur === "done") state.done[key] = "skip";
        else delete state.done[key];
        persist();
        hideToast(); /* a new status change ends the last Undo */
        refreshStatus();
        if (cur === "done") showUndo(DAYS[idx].label + " set to Skip", function () { setStatus(key, "done"); });
      });
    });
  }
