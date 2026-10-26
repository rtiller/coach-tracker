
  /* ---- Progress (Body + Lifts) ---- */
  function renderProgress() {
    const panel = document.getElementById("panel-progress");
    let html = '<div class="fade">';
    html +=
      '<div class="prog-subtabs">' +
        '<button type="button" class="prog-sub' + (state.progView === "body" ? " active" : "") + '" data-pview="body">Body</button>' +
        '<button type="button" class="prog-sub' + (state.progView === "lifts" ? " active" : "") + '" data-pview="lifts">Lifts</button>' +
      "</div>";
    html += '<div class="prog-grid">' + (state.progView === "body" ? renderBodySection() : renderLiftsSection()) + "</div>";
    html += "</div>";
    panel.innerHTML = html;
    bindProgress();
  }
  const X_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:block;margin:auto"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function renderBodySection() {
    let html = "";
    html += '<div class="card" data-anchor>';
    html += '<p class="section-title" style="margin-top:0">Program start</p>';
    html += '<label class="field"><span>Week 1 start date (counts from that Monday)</span><input type="date" id="startDate" value="' + escapeHtml(state.startDate || "") + '" /></label>';
    html += '<button type="button" class="btn ghost" id="saveStart" style="margin-top:12px;width:100%">Save start date</button>';
    html += "</div>";
    html += '<div class="card" data-anchor>';
    html += '<p class="section-title" style="margin-top:0">Log weigh-in</p>';
    html += '<label class="field"><span>Date</span><input type="date" id="bodyDate" /></label>';
    html += '<label class="field"><span>Weight (' + unitW() + ')</span><input type="number" id="bodyWeight" step="0.1" inputmode="decimal" placeholder="' + unitW() + '" /></label>';
    html += '<label class="field"><span>Body fat % <em style="font-style:normal;color:var(--mist);font-weight:400">(optional)</em></span><input type="number" id="bodyBf" step="0.1" inputmode="decimal" placeholder="%" /></label>';
    html += '<label class="field"><span>Waist (' + unitL() + ') <em style="font-style:normal;color:var(--mist);font-weight:400">(optional)</em></span><input type="number" id="bodyWaist" step="0.1" inputmode="decimal" placeholder="' + unitL() + '" /></label>';
    html += '<button type="button" class="btn" id="addBody">Log weigh-in</button>';
    html += "</div>";
    const sorted = state.body.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    html += '<div class="card" data-anchor>';
    html += '<p class="section-title muted">Check-ins</p>';
    if (!sorted.length) html += '<p class="empty">No weigh-ins yet.</p>';
    else sorted.forEach(function (row) {
      const extras = [];
      if (row.bf) extras.push("BF " + row.bf + "%");
      if (row.waist) extras.push("Waist " + row.waist + "\u00a0" + (row.lu || unitL()));
      html +=
        '<div class="list-item"><div class="info">' +
          '<div class="title">' + escapeHtml(String(row.weight)) + "\u00a0" + escapeHtml(row.wu || unitW()) + "</div>" +
          '<div class="sub">' + escapeHtml(row.date || "") + (extras.length ? " · " + escapeHtml(extras.join(" · ")) : "") + "</div>" +
        "</div>" +
        '<button type="button" class="btn danger" data-del-body="' + escapeHtml(row.id) + '" aria-label="Delete weigh-in">' + X_ICON + "</button></div>";
    });
    html += "</div>";
    return html;
  }
  function liftName(id) { for (let i = 0; i < LIFTS.length; i++) if (LIFTS[i].id === id) return LIFTS[i].name; return null; }
  function renderLiftsSection() {
    let html = "";
    html += '<div class="card" data-anchor>';
    html += '<p class="section-title" style="margin-top:0">Log a top set</p>';
    if (!LIFTS.length) html += '<p class="empty">This plan has no lifts to log.</p>';
    else {
      html += '<label class="field"><span>Lift</span><select id="liftName">' +
        LIFTS.map(function (l) { return '<option value="' + escapeHtml(l.id) + '">' + escapeHtml(l.name) + "</option>"; }).join("") + "</select></label>";
      html += '<label class="field"><span>Date</span><input type="date" id="liftDate" /></label>';
      html += '<div class="field-grid two">';
      html += '<label class="field"><span>Weight (' + unitW() + ')</span><input type="number" id="liftWeight" step="0.5" inputmode="decimal" placeholder="' + unitW() + '" /></label>';
      html += '<label class="field"><span>Reps</span><input type="number" id="liftReps" step="1" inputmode="numeric" placeholder="reps" /></label>';
      html += "</div>";
      html += '<button type="button" class="btn" id="addLift">Add top set</button>';
    }
    html += "</div>";
    /* entries for lifts the current plan no longer lists stay, marked Archived */
    const sorted = state.lifts.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    html += '<div class="card" data-anchor>';
    html += '<p class="section-title muted">History</p>';
    if (!sorted.length) html += '<p class="empty">No top sets logged yet.</p>';
    else sorted.forEach(function (row) {
      const cur = liftName(row.liftId);
      html +=
        '<div class="list-item"><div class="info">' +
          '<div class="title">' + escapeHtml(cur || row.lift || row.liftId) + " · " + escapeHtml(String(row.weight)) + "\u00a0" + escapeHtml(row.wu || unitW()) + " × " + escapeHtml(String(row.reps)) +
            (cur ? "" : '<span class="arch">Archived</span>') + "</div>" +
          '<div class="sub">' + escapeHtml(row.date || "") + "</div>" +
        "</div>" +
        '<button type="button" class="btn danger" data-del-lift="' + escapeHtml(row.id) + '" aria-label="Delete top set">' + X_ICON + "</button></div>";
    });
    html += "</div>";
    return html;
  }
  function bindProgress() {
    document.querySelectorAll("[data-pview]").forEach(function (btn) {
      btn.addEventListener("click", function () { state.progView = btn.dataset.pview; persist(); renderProgress(); });
    });
    const saveStart = document.getElementById("saveStart");
    if (saveStart) saveStart.addEventListener("click", function () {
      const v = document.getElementById("startDate").value;
      if (v && parseISO(v)) { state.startDate = v; clearWeekPick(); state.week = autoWeek(state.week); persist(); setView(null); renderAll(); showUndo("Start date saved", null, 3000); }
    });
    const bodyDate = document.getElementById("bodyDate");
    if (bodyDate && !bodyDate.value) bodyDate.value = todayISO();
    const addBody = document.getElementById("addBody");
    if (addBody) addBody.addEventListener("click", function () {
      const weight = document.getElementById("bodyWeight").value;
      if (!weight) return;
      state.body.push({ id: uid(), date: document.getElementById("bodyDate").value, weight: weight, wu: unitW(),
        bf: document.getElementById("bodyBf").value || "", waist: document.getElementById("bodyWaist").value || "", lu: unitL() });
      persist(); renderProgress();
    });
    document.querySelectorAll("[data-del-body]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.delBody, before = state.body.slice();
        state.body = state.body.filter(function (r) { return r.id !== id; });
        persist(); renderProgress();
        showUndo("Weigh-in deleted", function () { state.body = before; persist(); renderProgress(); });
      });
    });
    const liftDate = document.getElementById("liftDate");
    if (liftDate && !liftDate.value) liftDate.value = todayISO();
    const addLift = document.getElementById("addLift");
    if (addLift) addLift.addEventListener("click", function () {
      const id = document.getElementById("liftName").value;
      const weight = document.getElementById("liftWeight").value, reps = document.getElementById("liftReps").value;
      if (!weight || !reps) return;
      state.lifts.push({ id: uid(), liftId: id, lift: liftName(id) || id, weight: weight, wu: unitW(), reps: reps, date: document.getElementById("liftDate").value });
      persist(); renderProgress();
    });
    document.querySelectorAll("[data-del-lift]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.delLift, before = state.lifts.slice();
        state.lifts = state.lifts.filter(function (r) { return r.id !== id; });
        persist(); renderProgress();
        showUndo("Top set deleted", function () { state.lifts = before; persist(); renderProgress(); });
      });
    });
  }

  /* ---- Tabs ---- */
  let tabsBound = false;
  function setupTabs() {
    if (!tabsBound) {
      tabsBound = true;
      document.querySelectorAll(".tab").forEach(function (tab) {
        tab.addEventListener("click", function () { state.tab = tab.dataset.tab; persist(); applyTab(); });
      });
    }
  }
  function applyTab() {
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === state.tab); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    const panel = document.getElementById("panel-" + state.tab);
    if (panel) panel.classList.add("active");
    if (state.tab === "progress") renderProgress();
    if (state.tab === "train") renderTrain();
  }
