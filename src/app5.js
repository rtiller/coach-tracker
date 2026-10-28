  /* ---- v0.3.0 Duo layout: Today card, week strip, week ring, side header ---- */
  /* Layout only. Reads and writes the same state.done values ("done" / "skip" / cleared). */
  function refreshStatus() {
    renderHeader();
    renderSpine();
    renderTrain();
    renderDuo();
  }


  /* Which day the Today card shows: today's session in the current week, else the next open training day. */
  var viewIdx = null; /* UI only: a day picked from the week strip */
  /* The picked day survives a reload for the rest of today. sessionStorage only, never a data key. */
  var VIEW_SS = "ct-view";
  function localDay() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function setView(idx) {
    viewIdx = idx;
    try {
      if (idx == null) sessionStorage.removeItem(VIEW_SS);
      else sessionStorage.setItem(VIEW_SS, JSON.stringify({ day: localDay(), week: state.week, idx: idx }));
    } catch (e) { /* private mode: memory only */ }
  }
  function restoreView() {
    try {
      const v = JSON.parse(sessionStorage.getItem(VIEW_SS) || "null");
      if (v && v.day === localDay() && v.week === state.week && v.idx >= 0 && v.idx < 7) viewIdx = v.idx;
      else sessionStorage.removeItem(VIEW_SS);
    } catch (e) { /* ignore */ }
  }
  function focusDay() {
    if (viewIdx != null) {
      const isRest = !!DAYS[viewIdx].rest;
      return { idx: viewIdx, today: isTodaySession(state.week, viewIdx), rest: isRest, picked: true };
    }
    const cur = currentWeekFrom(state.startDate);
    const train = trainingIdxList();
    if (state.week === cur) {
      for (let i = 0; i < DAYS.length; i++) {
        if (isTodaySession(state.week, i)) {
          if (!DAYS[i].rest) return { idx: i, today: true };
          break;
        }
      }
    }
    for (let j = 0; j < train.length; j++) {
      if (!dayStatus(dayKey(state.week, train[j]))) return { idx: train[j], today: false };
    }
    if (state.week === cur) {
      for (let i = 0; i < DAYS.length; i++) {
        if (isTodaySession(state.week, i)) return { idx: i, today: true, rest: true };
      }
    }
    return { idx: train[train.length - 1], today: false, closed: true };
  }


  /* Undo toast (v0.1.3.1): its own slot, #toastSlot, at the end of the nav group: below the Back to today and Week and
     progress row on phones and the cover screen, directly below the strip on inner screens. The slot's height is always
     reserved, so showing or hiding Undo changes no layout. With the sheet open it is a row in the sheet head; inner
     portrait with the slot scrolled out of view floats it low. The visible time is the Undo window. */
  var toastTimer = null;
  var undoFn = null;
  function placeToast() {
    const t = document.getElementById("toast"), app = document.getElementById("app"), slot = document.getElementById("toastSlot");
    const appOn = app && !app.hidden;
    let host = document.body, before = document.body.firstChild;
    if (appOn) {
      if (OUTER_MQ.matches && app.classList.contains("sheet-open")) { host = document.querySelector("#planPane .sheet-head"); before = null; }
      else { host = slot; before = null; }
    }
    /* v0.1.3.3: inner portrait uses the cover pattern (More lives in the Week and progress page), so the toast no longer
       floats low there: it is in the slot or in the page head, like the cover screen */
    if (t.parentNode !== host) host.insertBefore(t, before);
    t.classList.toggle("in-slot", host === slot);
    t.classList.toggle("in-head", host !== document.body && host !== slot);
    reserveSpace();
  }
  /* v0.1.3 safety net: a toast that floats over the page (not a row in the flow) reserves its own height at the end
     of the page, so the last content can always be scrolled clear of it. Rows in the flow reserve themselves. */
  function reserveSpace() {
    const t = document.getElementById("toast");
    const floats = t.classList.contains("show") && !t.classList.contains("in-slot") && !t.classList.contains("in-head");
    const r = t.getBoundingClientRect();
    const pad = Math.max(0, floats && r.height ? Math.ceil(window.innerHeight - r.top + 8) : 0) + "px";
    const root = document.documentElement, el = endScroller();
    if (root.style.getPropertyValue("--pin-pad") === pad) return;
    const wasEnd = el && el.scrollHeight - el.clientHeight - el.scrollTop <= 24;
    root.style.setProperty("--pin-pad", pad);
    if (wasEnd) el.scrollTop = el.scrollHeight;
  }
  function endScroller() { return !OUTER_MQ.matches && !document.getElementById("app").hidden ? document.getElementById("paneToday") : document.scrollingElement; }
  function hideToast() {
    const t = document.getElementById("toast");
    if (!t.classList.contains("show")) return;
    clearTimeout(toastTimer); undoFn = null;
    t.classList.remove("show");
    t.setAttribute("aria-hidden", "true");
    undoRoom();
    reserveSpace();
    if (typeof syncMorePill === "function") syncMorePill(); /* v0.1.4 (c): the pill comes back, recounted */
    if (typeof queueNav === "function") { queueNav(); setTimeout(queueNav, 220); }
  }
  /* v0.1.4: Undo never covers list text. In the Counter the slot overlays the list's bottom (spec (c)), so while Undo
     shows the actions bar takes the slot's height back (#paneToday.undo-on) and the list ends above the toast; with no
     Undo the list still runs to the buttons. */
  function undoRoom() {
    const pane = document.getElementById("paneToday"), t = document.getElementById("toast");
    if (pane) pane.classList.toggle("undo-on", t.classList.contains("show") && t.classList.contains("in-slot"));
  }
  function showUndo(msg, fn, ms) {
    const t = document.getElementById("toast");
    placeToast();
    document.getElementById("toastMsg").textContent = msg;
    undoFn = fn || null;
    document.getElementById("toastUndo").hidden = !fn;
    t.removeAttribute("aria-hidden");
    t.classList.add("show");
    undoRoom();
    reserveSpace();
    if (typeof syncMorePill === "function") syncMorePill(); /* v0.1.4 (c): the pill goes while Undo shows */
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 10000);
    if (typeof queueNav === "function") { queueNav(); setTimeout(queueNav, 220); }
  }
  (function bindToast() {
    const t = document.getElementById("toast");
    document.getElementById("toastClose").addEventListener("click", hideToast);
    /* v0.1.2: Undo outlives tab switches, scrolling and the Week and progress page. Only the timer, the X, a swipe
       on the toast, or the next status change (which replaces it) end it. */
    let x0 = null, y0 = null;
    t.addEventListener("touchstart", function (e) { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; }, { passive: true });
    t.addEventListener("touchmove", function (e) {
      if (x0 == null) return;
      const p = e.touches[0], dx = p.clientX - x0, dy = p.clientY - y0;
      if (dy > 24 || Math.abs(dx) > 40) { x0 = null; hideToast(); }
    }, { passive: true });
    t.addEventListener("touchend", function () { x0 = null; }, { passive: true });
  })();

  function setStatus(key, val) {
    hideToast(); /* a new status change ends the last Undo; a change that offers its own Undo raises it right after */
    if (val) state.done[key] = val;
    else delete state.done[key];
    persist();
    refreshStatus();
  }

  var armedKey = null, armTimer = null;
  function bindBack() {
    const b = document.getElementById("backToday");
    const go = function () { setView(null); renderDuo(); };
    if (b) b.onclick = go;
    const bi = document.getElementById("backInline");
    if (bi) bi.onclick = go;
  }
  /* Layout mode, one definition (src/head.html, window.LAYOUT): OUTER_MQ.matches is every layout but two panes: phones, the
     cover screen in portrait and landscape and the inner screen in portrait (today, strip, Back to today and Week and progress row, Undo slot; the plan opens as a page);
     everything else is the inner screen in landscape, two panes. Every layout test in this file reads OUTER_MQ. */
  var OUTER_MQ = window.LAYOUT;
  /* v0.1.3.3 Counter: the cover screen in landscape and phones in short landscape (cover pattern, at least 600px wide, wider than tall, under 500px tall) shows the
     selected day on the left and the week as rows on the right, no page scroll. Set in JS (html.counter, syncCounter in
     app6) rather than a media query so a keyboard that shrinks the viewport while typing never flips the layout. */
  var counterOn = false;
  /* v0.1.4.3 (Designer ruling C): the Counter header shows "Today" when "Back to today" does not fit beside "This week ▾" (syncCounter) */
  var btShort = false;
  function renderToday() {
    const el = document.getElementById("today");
    const m = weekMeta(state.week);
    const f = focusDay();
    const day = DAYS[f.idx];
    const wr = weekResolvedCount(state.week);
    const train = trainingIdxList();
    const pos = train.indexOf(f.idx) + 1;
    const kicker = '<span class="k-seg">W' + state.week + "\u00a0of\u00a0" + TOTAL_WEEKS + "</span>" + (N_BLOCKS > 1 ? '<span class="k-blk"><span class="k-c">, </span><span class="k-seg">Block\u00a0' + m.block + "</span></span>" : "") + (m.deload ? '<span class="k-tail">, Deload</span>' : "");
    const backHtml = f.picked
      ? '<button type="button" class="back-today" id="backToday" aria-label="Showing ' + escapeHtml(day.short) + ", " + escapeHtml(day.label) + '. Back to today"><span class="bt-label">Showing ' + escapeHtml(day.short) + ", " + escapeHtml(day.label) + "</span><b>" + (counterOn && btShort ? "Today" : "Back to today") + "</b></button>"
      : '<span class="back-today bt-ph" aria-hidden="true"><b>Back to today</b></span>';
    /* Back to today has one home on every screen: directly under the week strip */
    document.getElementById("backSlot").innerHTML = backHtml;
    const back = "";

    if (f.rest) {
      el.className = "today";
      el.innerHTML = back +
        '<div class="today-top">' + ringSvg(wr, train.length, 40) +
          '<div class="tt-text"><div class="kicker">' + kicker + '</div><div class="dayx">Rest day</div></div>' +
          /* v0.1.3: inner screens' one way back, as on a training day (a fixed string, no data) */
          (f.picked ? '<button type="button" class="back-inline" id="backInline">Back to today</button>' : "") +
        "</div>" +
        '<div class="today-hero"><h2>Rest</h2><div class="sub">' + escapeHtml(day.note || "Recover. Easy walking is fine.") + "</div></div>" +
        '<div class="today-rest">' + weekSubLabel(state.week) + "</div>";
      bindBack();
      return;
    }

    const key = dayKey(state.week, f.idx);
    const status = dayStatus(key);
    const exercises = ((BLOCKS[m.block] || {})[day.key] || []);
    let rows = "";
    exercises.forEach(function (ex) {
      rows += '<li class="set-row"><i class="snap-top" aria-hidden="true"></i><div class="ex-left"><span class="ex-name">' + snapWords(ex.name) + "</span>";
      (ex.tags || []).forEach(function (t) { rows += '<span class="tag ' + t + '">' + escapeHtml(tagLabel(t)) + "</span>"; });
      rows += '</div><span class="ex-sets">' + snapWords(ex.sets) + (m.deload ? '<span class="ex-dl"> · deload</span>' : "") + "</span></li>";
    });
    const label = f.today ? "Today" : f.picked ? "Selected" : f.closed ? "Week closed" : "Next up";
    el.className = "today" + (status === "done" ? " is-done" : "");
    const armed = status === "done" && armedKey === key;
    const doneLong = armed ? "Tap again to clear" : status === "done" ? "Day done" : "Mark day done";
    const doneShort = armed ? "Clear?" : "Done";
    const doneAria = armed ? "Tap again to clear this day" : status === "done" ? "Day done. Tap twice to clear" : "Mark day done";
    el.innerHTML = back +
      '<div class="today-top">' + ringSvg(wr, train.length, 40) +
        '<div class="tt-text"><div class="kicker">' + kicker + '</div>' +
        '<div class="dayx">' + (f.picked ? '<span class="dx-lbl">' + label + ' · </span><span class="dx-day">' + escapeHtml(day.short) + ' · </span>' : label + ' · ') + '<span class="nowrap">Day&nbsp;' + pos + "&nbsp;of&nbsp;" + train.length + "</span></div></div>" +
        (f.picked ? '<button type="button" class="back-inline" id="backInline">Back to today</button>' : "") +
        '<button type="button" class="btn-skip" id="todaySkip" data-skip aria-pressed="' + (status === "skip") + '">' +
          (status === "skip" ? "Skipped" : "Skip") + "</button>" +
      "</div>" +
      '<div class="today-hero"><h2>' + escapeHtml(day.short) + " · " + escapeHtml(day.label) + '</h2><div class="sub">' + escapeHtml(day.focus) + "</div></div>" +
      '<ul class="set-rows">' + rows + "</ul>" +
      /* Counter only (hidden elsewhere): the list's "N more" pill, shown while exercise rows are below its visible end */
      '<button type="button" class="more-pill" id="morePill" hidden></button>' +
      '<div class="today-actions">' +
        '<div class="act-row">' +
        '<button type="button" class="btn-skip skip-bottom" data-skip aria-pressed="' + (status === "skip") + '">' +
          (status === "skip" ? "Skipped" : "Skip") + "</button>" +
        '<button type="button" class="btn-done' + (armed ? " is-armed" : status === "done" ? " is-done" : "") + '" id="todayDone" aria-label="' + doneAria + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
          '<span class="lbl-long">' + doneLong + '</span><span class="lbl-short">' + doneShort + "</span>" +
        "</button>" +
      "</div></div>";

    document.getElementById("todayDone").addEventListener("click", function () {
      const prev = dayStatus(key);
      if (prev !== "done") {
        armedKey = null;
        setStatus(key, "done");
        const b = document.getElementById("todayDone");
        if (b) b.classList.add("pop");
        return;
      }
      /* Clearing a done day is deliberate: first tap arms, second tap clears, then Undo. */
      if (armedKey !== key) {
        armedKey = key;
        clearTimeout(armTimer);
        armTimer = setTimeout(function () { armedKey = null; renderToday(); }, 3000);
        renderToday();
        return;
      }
      armedKey = null;
      clearTimeout(armTimer);
      setStatus(key, "");
      showUndo(day.label + " cleared", function () { setStatus(key, "done"); });
    });
    bindBack();
    el.querySelectorAll("[data-skip]").forEach(function (sb) {
      sb.addEventListener("click", function () {
        const prev = dayStatus(key);
        if (prev === "skip") { setStatus(key, ""); return; }
        setStatus(key, "skip");
        showUndo(day.label + " skipped", function () { setStatus(key, prev); });
      });
    });
    const list = el.querySelector(".set-rows"), pill = document.getElementById("morePill");
    list.addEventListener("scroll", syncMorePill, { passive: true });
    pill.addEventListener("click", moreRows);
    layoutMore();
    measureBar();
  }

  /* v0.1.3.4 Counter: the exercise list is its own scroll area between the title block and the pinned actions. While rows
     are below its visible end, an "N more" control sits under the list (v0.1.4.1: a 22px chip in a 44px tap target) (N = rows not fully visible below);
     a tap scrolls the next rows into view. Hidden at the end of the list, when nothing overflows, and outside the Counter. */
  /* Counter (every text size since v0.1.4): each word of an exercise name or its sets in its own span, so the start of every
     line can be a snap point. Plain text everywhere else (spans shift Chromium's text widths by a fraction of a pixel) */
  function snapCounter() { return counterOn; }
  function snapWords(t) {
    if (!snapCounter()) return escapeHtml(t);
    return String(t).split(/\s+/).filter(Boolean).map(function (w) { return '<span class="w">' + escapeHtml(w) + "</span>"; }).join(" ");
  }
  function moreOn() { const c = document.getElementById("today"); return !!c && c.classList.contains("more-on"); }
  /* v0.1.3.4b, and v0.1.4 (c) at every text size: when the list overflows, the card takes "more-on": the pill gets its own
     44px strip under the list (at 200% text the focus line goes to pay for it; at normal text it stays), the list snaps (mandatory) to each row's top and to every line inside
     a row taller than the list (a row taller than its scroll window is not a snap area itself: browsers let an oversized
     snap area stop anywhere inside it, which is how a line was cut at the list's top), and an end padding lets the last
     snap point reach the top. Measured with the focus line and no strip; re-run on every render and after fitCounter. */
  function layoutMore() {
    const card = document.getElementById("today"), list = card && card.querySelector(".set-rows"), pill = document.getElementById("morePill");
    if (!card || !list || !pill) return;
    const lg = snapCounter();
    /* rendered before the layout changed: the words have the wrong markup, so render again (once: the new markup matches) */
    if (lg !== !!list.querySelector(".w") && list.querySelector(".set-row")) { renderToday(); return; }
    if (card.classList.contains("more-on") || list.style.getPropertyValue("--end-pad")) {
      card.classList.remove("more-on"); list.style.removeProperty("--end-pad");
      list.querySelectorAll(".set-row.tall").forEach(function (r) { r.classList.remove("tall"); });
    }
    if (lg && list.scrollHeight - list.clientHeight > 0.5) {
      const top = list.scrollTop;
      card.classList.add("more-on"); pill.hidden = false;
      const ch = list.clientHeight, lt = list.getBoundingClientRect().top + list.clientTop - list.scrollTop;
      let last = 0;
      list.querySelectorAll(".set-row").forEach(function (r) {
        if (r.getBoundingClientRect().height > ch + 0.5) r.classList.add("tall");
        /* a snap point at the start of each line only: a tag beside a name is not one (its top is mid-line) */
        let lineB = -Infinity;
        r.querySelectorAll(".w, .tag, .ex-dl").forEach(function (u) {
          const b = u.getBoundingClientRect(), on = b.top >= lineB - 1;
          u.classList.toggle("sn", on);
          if (on) { lineB = b.bottom; last = Math.max(last, b.top - lt); } else lineB = Math.max(lineB, b.bottom);
        });
        last = Math.max(last, r.getBoundingClientRect().top - lt);
      });
      const base = list.scrollHeight;
      const pad = Math.max(0, Math.ceil(last + ch - base));
      /* v0.1.4: the end room is a spacer after the rows (.set-rows::after), not the list's padding: a flex item cannot
         shrink below its own padding, so a padded list could not give Undo's height back (spec (c) amendment) */
      if (pad) list.style.setProperty("--end-pad", pad + "px");
      list.scrollTop = top;
    }
    syncMorePill();
  }
  function hiddenRows() {
    const list = document.querySelector("#today .set-rows");
    if (!counterOn || !list || list.scrollHeight - list.clientHeight <= 0.5) return [];
    const rows = list.querySelectorAll(".set-row");
    if (moreOn()) { /* rows entirely below the visible area (v0.1.4.3: the area ends at the clip, a row boundary) */
      const vb = listVisBottom(list);
      return Array.prototype.filter.call(rows, function (r) { return r.getBoundingClientRect().top >= vb - 1; });
    }
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) return [];
    const lb = list.getBoundingClientRect().bottom - list.clientTop;
    return Array.prototype.filter.call(rows, function (r) { return r.getBoundingClientRect().bottom > lb + 1; });
  }
  /* v0.1.4 (c): the list's end is in view: the last row's bottom is inside the visible area (the end padding below it,
     which lets the last snap point reach the top, does not count) */
  function listAtEnd() {
    const l = document.querySelector("#today .set-rows"), rows = l && l.querySelectorAll(".set-row");
    if (!l || !rows.length || l.scrollTop + l.clientHeight >= l.scrollHeight - 1) return true;
    return rows[rows.length - 1].getBoundingClientRect().bottom <= l.getBoundingClientRect().top + l.clientTop + l.clientHeight + 1;
  }
  function undoInSlot() { const t = document.getElementById("toast"); return !!t && t.classList.contains("show") && t.classList.contains("in-slot"); }
  /* v0.1.4.3 (Designer nit, 200% text): the overflowing list (.more-on) ends at a row boundary: a row that would show only
     partly at the bottom is clipped away whole (clip-path, so nothing moves) and counts as hidden in "N more". A row taller
     than the list keeps its last whole line instead. */
  function listVisBottom(list) { const lt = list.getBoundingClientRect().top + list.clientTop; return lt + list.clientHeight - (parseFloat(list.dataset.clipB) || 0); }
  function clipRows() {
    const list = document.querySelector("#today .set-rows");
    if (!list) return;
    let cut = 0;
    if (counterOn && moreOn() && list.scrollHeight - list.clientHeight > 0.5) {
      const lt = list.getBoundingClientRect().top + list.clientTop, vb = lt + list.clientHeight;
      let edge = -Infinity;
      list.querySelectorAll(".set-row").forEach(function (r) { const b = r.getBoundingClientRect(); if (b.bottom > lt + 1 && b.bottom <= vb + 0.5) edge = Math.max(edge, b.bottom); });
      if (edge === -Infinity) list.querySelectorAll(".set-row .sn").forEach(function (u) { const b = u.getBoundingClientRect(); if (b.bottom > lt + 1 && b.bottom <= vb + 0.5) edge = Math.max(edge, b.bottom); });
      if (edge > -Infinity && vb - edge > 0.5) cut = Math.floor((vb - edge) * 2) / 2;
    }
    if (cut) { list.dataset.clipB = String(cut); list.style.clipPath = "inset(0 0 " + cut + "px 0)"; }
    else if (list.dataset.clipB) { delete list.dataset.clipB; list.style.clipPath = ""; }
  }
  function syncMorePill() {
    const pill = document.getElementById("morePill");
    clipRows();
    if (!pill) return;
    const n = hiddenRows().length, strip = moreOn();
    /* v0.1.4 (c): Undo overlays the list's bottom and the pill's strip, so the pill goes while it shows (recounted after) */
    pill.classList.toggle("under-undo", strip && undoInSlot());
    /* the pill goes only when the list's end is in view: with no row wholly below but the last one not yet whole, it
       stays as "More" (one tap brings the end into view) */
    if (!n && strip && !listAtEnd()) {
      if (pill.getAttribute("aria-label") !== "Show the rest of the list") {
        pill.setAttribute("aria-label", "Show the rest of the list");
        pill.innerHTML = '<span class="mp-chip"><span>More</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
      }
      pill.classList.remove("at-end"); pill.hidden = false; return;
    }
    if (!n) {
      if (!pill.hidden && !pill.classList.contains("at-end") && document.activeElement === pill) { const d = document.getElementById("todayDone"); if (d) d.focus({ preventScroll: true }); }
      /* with the strip the pill only goes invisible, so the list never changes height while it scrolls */
      if (strip) pill.classList.add("at-end"); else pill.hidden = true;
      return;
    }
    const label = n + " more exercise" + (n === 1 ? "" : "s");
    if (pill.getAttribute("aria-label") !== label) {
      pill.setAttribute("aria-label", label);
      pill.innerHTML = '<span class="mp-chip"><span>' + n + ' more</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
    }
    pill.classList.remove("at-end");
    pill.hidden = false;
  }
  /* with the strip (200% text): exactly one exercise, the next row's top to the list's top. Otherwise: the first row not
     fully visible comes to the top; when it already starts there, the list moves on by its own height less 8px */
  function moreRows() {
    const list = document.querySelector("#today .set-rows"), rows = hiddenRows();
    if (!list || (!rows.length && !(moreOn() && !listAtEnd()))) return;
    const lt = list.getBoundingClientRect().top + list.clientTop, max = list.scrollHeight - list.clientHeight;
    if (moreOn()) {
      const next = Array.prototype.find.call(list.querySelectorAll(".set-row"), function (r) { return r.getBoundingClientRect().top > lt + 1; });
      list.scrollTop = next ? Math.min(max, list.scrollTop + next.getBoundingClientRect().top - lt) : max;
      syncMorePill();
      return;
    }
    const rt = rows[0].getBoundingClientRect().top;
    const step = rt > lt + 8 ? rt - lt : Math.max(24, list.clientHeight - 8);
    const to = Math.min(list.scrollTop + step, max);
    list.scrollTop = max - to <= 4 ? max : to;
    syncMorePill();
  }

  function bindTail(t) { return String(t).replace(/ ([A-Za-z]|[0-9]+)$/, "\u00a0$1"); }
  function stripIcon(kind) {
    if (kind === "done") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (kind === "skip") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"/></svg>';
    return "";
  }

  function renderWeekStrip() {
    const el = document.getElementById("weekStrip");
    let html = '<div class="wstrip" role="list" aria-label="Week ' + state.week + ' days">';
    DAYS.forEach(function (day, idx) {
      const st = day.rest ? "rest" : (dayStatus(dayKey(state.week, idx)) || "plan");
      const today = isTodaySession(state.week, idx);
      const word = st === "done" ? "Done" : st === "skip" ? "Skip" : st === "rest" ? "Rest" : today ? "Today" : "Plan";
      const viewing = viewIdx === idx;
      html += '<button type="button" class="wd' + (today ? " is-today" : "") + (viewing ? " is-view" : "") + '" data-strip="' + idx + '" aria-pressed="' + viewing + '" aria-label="' + escapeHtml(day.short) + ": " + word + (today ? ", today" : "") + '. Show this day">' +
        '<span class="d">' + escapeHtml(day.short) + "</span>" +
        /* Counter rows also name the session (hidden in the strip) */
        /* v0.1.4.3: a trailing single letter or number stays with the word before it when the name wraps ("Full" / "body A");
           the rendered name only, never the plan data */
        '<span class="ss">' + escapeHtml(day.rest ? "Rest" : bindTail(day.label)) + "</span>" +
        '<span class="dot ' + st + (today ? " today" : "") + '">' + stripIcon(st) + "</span>" +
        '<span class="s">' + word + "</span></button>";
    });
    el.innerHTML = html + "</div>";
    el.querySelectorAll("[data-strip]").forEach(function (btn) {
      btn.addEventListener("click", function () { showDay(parseInt(btn.dataset.strip, 10)); });
    });
  }

  /* Tap a day in the strip: show that day in the today card. Tapping the picked day again returns to today. */
  function showDay(idx) {
    armedKey = null;
    const f = focusDay();
    /* tapping today's own cell always returns to today (no Back to today on today) */
    const home = (function () { const v = viewIdx; viewIdx = null; const h = focusDay(); viewIdx = v; return h; })();
    setView((viewIdx === idx || (home.idx === idx && !home.picked && isTodaySession(state.week, idx))) ? null : idx);
    renderDuo();
    revealCard();
  }

  /* v0.1.3.2: after a day is picked, its whole card (Mark day done included) is in view when it fits, and as much of
     the strip, the row and the Undo slot after it as fits too (so Undo, which never scrolls the page, is seen); the card's top never goes above the top clearance (a card taller than
     the screen starts at its top). The scroller's scroll-padding-top is the top clearance; its scroll-padding-bottom
     less the toolbar allowance (page: 50px + 16px, pane: 16px) is the safe area, and the group may end 8px above it. */
  function viewLimits() {
    const sc = endScroller(), page = sc === document.scrollingElement, cs = getComputedStyle(page ? document.documentElement : sc);
    const box = page ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect();
    const safeB = Math.max(0, (parseFloat(cs.scrollPaddingBottom) || 0) - (page ? 66 : 16));
    return { sc: sc, topLim: box.top + (parseFloat(cs.scrollPaddingTop) || 0), botLim: box.bottom - safeB - 8 };
  }
  function revealCard() {
    if (counterOn) { counterReveal(); return; }
    const card = document.getElementById("today"), v = viewLimits(), sc = v.sc, topLim = v.topLim, botLim = v.botLim;
    const r = card.getBoundingClientRect();
    let endB = r.bottom;
    [OUTER_MQ.matches ? "navRow" : "weekStrip", "toastSlot"].forEach(function (id) { const n = document.getElementById(id); if (n && n.getClientRects().length) endB = Math.max(endB, n.getBoundingClientRect().bottom); });
    const delta = r.top < topLim ? r.top - topLim : Math.min(Math.max(0, endB - botLim), r.top - topLim);
    if (Math.abs(delta) >= 1) sc.scrollTop += delta;
  }

  /* Counter: nothing scrolls the page; the card starts at its top and the picked (else today's) row is in the list's view */
  function counterReveal() {
    const card = document.getElementById("today"), list = document.getElementById("weekStrip");
    if (card) card.scrollTop = 0;
    const exl = card && card.querySelector(".set-rows");
    if (exl) { exl.scrollTop = 0; syncMorePill(); }
    const row = list && (list.querySelector(".wd.is-view") || list.querySelector(".wd.is-today"));
    if (!row) return;
    /* v0.1.4.3 (Designer, ruling (a)): the smallest scroll from the list's top that shows the row whole, so a Sat or Sun row
       that needs one ends at the list's bottom edge (Monday may then be partly hidden); the picked row wins over today's */
    const r = row.getBoundingClientRect(), b = list.getBoundingClientRect(), end = r.bottom - b.top - list.clientTop + list.scrollTop;
    list.scrollTop = Math.max(0, Math.ceil(end - list.clientHeight - 0.01));
  }

  function renderSheetHead() {
    const m = weekMeta(state.week);
    document.getElementById("sheetTitle").textContent = "Week\u00a0" + state.week + "\u00a0of\u00a0" + TOTAL_WEEKS;
    document.getElementById("sheetSub").textContent = (N_BLOCKS > 1 ? "Block\u00a0" + m.block + ", " : "") + (m.deload ? "deload" : "work");
  }

  /* Outer screen: one tap opens the plan as a bottom sheet; Close, the backdrop or Escape closes it. */
  function setupSheet() {
    const app = document.getElementById("app"), openBtn = document.getElementById("openPlan");
    const closeBtn = document.getElementById("closePlan"), scrim = document.getElementById("scrim");
    const plan = document.getElementById("planPane"), today = document.getElementById("paneToday");
    const outer = OUTER_MQ;
    function sync() {
      const open = app.classList.contains("sheet-open") && outer.matches;
      document.documentElement.classList.toggle("sheet-lock", open);
      openBtn.setAttribute("aria-expanded", String(open));
      if (outer.matches) {
        plan.setAttribute("role", "dialog");
        plan.setAttribute("aria-modal", "true");
        if (open) { today.setAttribute("inert", ""); today.setAttribute("aria-hidden", "true"); }
        else { today.removeAttribute("inert"); today.removeAttribute("aria-hidden"); }
      } else {
        plan.removeAttribute("role"); plan.removeAttribute("aria-modal");
        today.removeAttribute("inert"); today.removeAttribute("aria-hidden");
      }
    }
    function setOpen(open) {
      app.classList.toggle("sheet-open", open);
      sync();
      /* a live Undo follows into the page header and back to the bottom group */
      if (document.getElementById("toast").classList.contains("show")) { placeToast(); if (typeof queueNav === "function") queueNav(); }
      if (open) { plan.scrollTop = 0; closeBtn.focus({ preventScroll: true }); }
      else openBtn.focus({ preventScroll: true });
    }
    openBtn.addEventListener("click", function () { setOpen(true); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && app.classList.contains("sheet-open")) setOpen(false);
    });
    /* any layout change (fold, unfold, rotate, split) closes the outer sheet; its scroll is left alone */
    /* v0.1.3.3: an orientation change while a text field has focus is the keyboard (Android resizes the page), not a turn */
    function onLayout(e) { if (e && /orientation/.test(e.media || "") && textEntry()) return; app.classList.remove("sheet-open"); sync(); if (document.getElementById("toast").classList.contains("show")) placeToast(); }
    [outer, window.matchMedia("(orientation: landscape)")].forEach(function (q) {
      if (q.addEventListener) q.addEventListener("change", onLayout); else q.addListener(onLayout);
    });
    sync();
  }

  function measureBar() {
    const bar = document.querySelector(".today-actions");
    if (bar) document.documentElement.style.setProperty("--barh", Math.ceil(bar.getBoundingClientRect().height) + "px");
  }
  function detectLargeText() {
    const big = parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24;
    document.documentElement.classList.toggle("lg-text", big);
    measureBar();
  }
  /* v0.1.3.2: the strip, the Back to today and Week and progress row and the Undo slot never pin. A pinned group sits
     over the end of the card by construction (it pins only while its place, right after the card, is below the visible
     bottom), so on short screens it hid the last exercises and Mark day done. The group follows the card in the flow. */
  var navRaf = 0;
  function syncNav() {
    const nav = document.getElementById("outerNav"), grp = document.getElementById("navGroup"), end = document.getElementById("navEnd");
    if (!nav || !grp || !end) return;
    /* the cover screen has the row in the group, above the Undo slot; inner screens hide it (Back to today is in the card) */
    const slot = document.getElementById("toastSlot");
    if (OUTER_MQ.matches) { if (nav.parentNode !== grp || nav.nextElementSibling !== slot) grp.insertBefore(nav, slot); }
    else if (nav.parentNode !== grp.parentNode || nav.nextElementSibling !== end) grp.parentNode.insertBefore(nav, end);
    const back = document.getElementById("backToday"), plan = document.getElementById("openPlan");
    let row = false;
    if (OUTER_MQ.matches && back) {
      const b = back.getBoundingClientRect(), o = plan.getBoundingClientRect();
      row = Math.abs(b.top - o.top) < 1 && b.right <= o.left;
    }
    nav.classList.toggle("is-row", row);
  }
  function queueNav() { cancelAnimationFrame(navRaf); navRaf = requestAnimationFrame(syncNav); }
  window.addEventListener("resize", queueNav);
  /* v0.1.3: when the group or a floating toast changes height while the reader is at (or within 24px of) the end,
     keep the end in view in the same frame. Anywhere else the scroll position is left alone. */
  (function keepEnd() {
    /* how much of the today column is still below the visible bottom: the left pane's end with two panes, else the page's end */
    function endGap() {
      const el = endScroller(); if (!el) return 0;
      return el.scrollHeight - el.clientHeight - el.scrollTop;
    }
    let atEnd = false, lastH = -1, holdUntil = 0, padRaf = 0;
    document.addEventListener("scroll", function () { if (performance.now() > holdUntil) atEnd = endGap() <= 24; }, { passive: true, capture: true });
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(function () {
      const grp = document.getElementById("navGroup"); if (!grp) return;
      const h = grp.getBoundingClientRect().height;
      if (lastH < 0) atEnd = endGap() <= 24;
      else if (h !== lastH && atEnd) {
        const g = endGap();
        /* our own scroll must not read as the reader leaving the end while the row is still growing */
        /* v0.1.4.2: never past the top limit the day pick uses (revealCard): a reader at the top of a home that only
           just overflows counts as "at the end", and scrolling the whole gap put the card's top (Skip) under the status bar */
        let d = g;
        if (!counterOn) { const card = document.getElementById("today"); if (card && card.getClientRects().length) d = Math.min(d, Math.max(0, card.getBoundingClientRect().top - viewLimits().topLim)); }
        if (d >= 1) { endScroller().scrollTop += d; holdUntil = performance.now() + 400; }
      }
      lastH = h;
      /* v0.1.4.3: deferred a frame. --pin-pad sizes #navEnd, which this observer watches, so setting it inside the callback
         resized an observed element during delivery (WebKit: "ResizeObserver loop completed with undelivered notifications",
         a floating toast during a resize) */
      cancelAnimationFrame(padRaf); padRaf = requestAnimationFrame(function () { if (document.getElementById("toast").classList.contains("show")) reserveSpace(); });
    });
    ["navGroup", "toast", "navEnd"].forEach(function (id) { const n = document.getElementById(id); if (n) ro.observe(n); });
  })();

  function renderDuo() {
    renderToday();
    renderWeekStrip();
    renderSheetHead();
    bindBack();
    syncNav();
  }

  /* Keep the reading position through rotation, fold changes and resizes.
     UI-only memory lives in sessionStorage so the data keys stay untouched. */
  function setupLayoutMemory() {
    const SS = "ct-anchor";
    let anchor = null, settling = 0;
    function anchors() { return Array.prototype.slice.call(document.querySelectorAll("[data-anchor]")); }
    function capture() {
      if (settling) return;
      /* two panes scroll on their own; keep the last one column anchor */
      if (!OUTER_MQ.matches) return;
      const list = anchors();
      let best = null, bestTop = Infinity;
      list.forEach(function (n, i) {
        const r = n.getBoundingClientRect();
        if (r.height === 0) return;
        if (r.bottom > 0 && r.top < bestTop) { best = { i: i, off: r.top }; bestTop = r.top; }
      });
      if (window.scrollY < 4) best = { i: -1, off: 0 };
      anchor = best;
      try { sessionStorage.setItem(SS, JSON.stringify(anchor)); } catch (e) {}
    }
    function restore() {
      if (!anchor) return;
      if (anchor.i < 0) { window.scrollTo(0, 0); return; }
      const n = anchors()[anchor.i];
      if (!n) return;
      window.scrollBy(0, n.getBoundingClientRect().top - anchor.off);
    }
    let raf = 0;
    window.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; capture(); });
    }, { passive: true });
    function onLayoutChange() {
      clearTimeout(settling);
      settling = setTimeout(function () { settling = 0; capture(); }, 350);
      requestAnimationFrame(restore);
    }
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("orientationchange", onLayoutChange);
    try { anchor = JSON.parse(sessionStorage.getItem(SS) || "null"); } catch (e) { anchor = null; }
    if (anchor) requestAnimationFrame(restore);
    else capture();
  }
