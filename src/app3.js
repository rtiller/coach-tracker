
  /* ================= Plan and state ================= */
  let PLAN = null, DAYS = [], BLOCKS = {}, TOTAL_WEEKS = 1, BLOCK_WEEKS = 1, N_BLOCKS = 1, LIFTS = [], LABELS = DEFAULT_LABELS, HINTS = {};
  function setPlan(p) {
    PLAN = p;
    if (!p) { DAYS = []; BLOCKS = {}; LIFTS = []; return; }
    DAYS = p.days; BLOCKS = p.blocks; TOTAL_WEEKS = p.meta.weeks; BLOCK_WEEKS = p.meta.blockWeeks;
    N_BLOCKS = Math.ceil(TOTAL_WEEKS / BLOCK_WEEKS); LIFTS = p.lifts; LABELS = p.labels; HINTS = p.labels.hints || {};
  }
  function unitW() { return PLAN && PLAN.meta.units === "kg" ? "kg" : "lb"; }
  function unitL() { return PLAN && PLAN.meta.units === "kg" ? "cm" : "in"; }
  function weekMeta(w) {
    const block = Math.ceil(w / BLOCK_WEEKS);
    const rule = PLAN ? PLAN.meta.deload : "none";
    const deload = rule === "last" ? (w % BLOCK_WEEKS === 0) : Array.isArray(rule) ? rule.indexOf(w) >= 0 : false;
    return { block: block, deload: deload };
  }
  function tagLabel(t) { return LABELS[t] || DEFAULT_LABELS[t] || t; }

  const state = { week: 1, startDate: null, done: {}, openDays: {}, lifts: [], body: [], tab: "train", progView: "body", seen: [] };
  function loadState() {
    const sp = lsGet("plan", null);
    let plan = null;
    if (sp) { const v = validatePlan(sp); plan = v.ok ? v.plan : null; storedPlanBad = !v.ok; }
    setPlan(plan);
    state.startDate = lsGet("startDate", null);
    if (state.startDate && !parseISO(state.startDate)) state.startDate = null;
    /* shape guards: a hand-edited or damaged key falls back instead of breaking every render */
    const isObj = function (x) { return !!x && typeof x === "object" && !Array.isArray(x); };
    const objOr = function (x) { return isObj(x) ? x : {}; };
    const listOf = function (x) { return Array.isArray(x) ? x.filter(function (e) { return isObj(e) && typeof e.date === "string"; }) : []; };
    state.done = objOr(lsGet("done", {}));
    state.openDays = objOr(lsGet("openDays", {}));
    state.lifts = listOf(lsGet("lifts", []));
    state.body = listOf(lsGet("body", []));
    state.tab = lsGet("tab", "train");
    if (state.tab !== "train" && state.tab !== "progress") state.tab = "train";
    state.progView = lsGet("progView", "body");
    if (state.progView !== "body" && state.progView !== "lifts") state.progView = "body";
    state.seen = Array.isArray(lsGet("seen", [])) ? lsGet("seen", []) : [];
    state.week = lsGet("week", null);
    if (plan) state.week = autoWeek(state.week);
  }
  let storedPlanBad = false;
  function persist() {
    if (!PLAN) return;
    lsSet("schema", STORE_SCHEMA);
    lsSet("week", state.week);
    lsSet("startDate", state.startDate);
    lsSet("done", state.done);
    lsSet("openDays", state.openDays);
    lsSet("lifts", state.lifts);
    lsSet("body", state.body);
    lsSet("tab", state.tab);
    lsSet("progView", state.progView);
    lsSet("seen", state.seen);
  }
  function markSeen(fp) {
    if (!fp || state.seen.indexOf(fp) >= 0) return;
    state.seen.push(fp);
    if (state.seen.length > 20) state.seen = state.seen.slice(-20);
  }

  function weekStart(w) { const s = parseISO(state.startDate); return s ? addDays(mondayOf(s), (w - 1) * 7) : null; }
  function currentWeekFrom(start) {
    const s = parseISO(start);
    if (!s) return 0;
    const days = Math.round((parseISO(todayISO()) - mondayOf(s)) / DAY_MS); /* round: DST days are 23 or 25 hours */
    if (days < 0) return 0; /* not started yet */
    return clamp(Math.floor(days / 7) + 1, 1, TOTAL_WEEKS);
  }
  /* Unclamped calendar week: 0 before the start, above TOTAL_WEEKS after the end. */
  function rawWeekFrom(start) {
    const s = parseISO(start);
    if (!s) return 0;
    const days = Math.round((parseISO(todayISO()) - mondayOf(s)) / DAY_MS);
    return days < 0 ? 0 : Math.floor(days / 7) + 1;
  }
  /* A week the person picks on purpose holds for the rest of the visit (sessionStorage, today only, same start date).
     Otherwise the tracker opens on the calendar week, clamped to the plan. */
  const WEEK_SS = "ct-week-pick";
  function weekPick() {
    try {
      const v = JSON.parse(sessionStorage.getItem(WEEK_SS) || "null");
      if (v && v.day === localDay() && v.start === state.startDate && Number.isInteger(v.week) && v.week >= 1 && v.week <= TOTAL_WEEKS) return v.week;
    } catch (e) {}
    return 0;
  }
  function clearWeekPick() { try { sessionStorage.removeItem(WEEK_SS); } catch (e) {} }
  function autoWeek(stored) {
    const p = weekPick(); if (p) return p;
    if (state.startDate) { const c = currentWeekFrom(state.startDate); return c >= 1 ? c : 1; }
    return Number.isInteger(stored) && stored >= 1 && stored <= TOTAL_WEEKS ? stored : 1;
  }
  function pickWeek(w) {
    if (state.startDate && w === autoWeekNoPick()) clearWeekPick();
    else try { sessionStorage.setItem(WEEK_SS, JSON.stringify({ week: w, start: state.startDate, day: localDay() })); } catch (e) {}
    state.week = w; setView(null); persist(); renderAll();
  }
  function autoWeekNoPick() { const c = currentWeekFrom(state.startDate); return c >= 1 ? c : 1; }
  function isTodaySession(week, dayIdx) {
    const ws = weekStart(week);
    if (!ws || week !== currentWeekFrom(state.startDate)) return false;
    return isoOf(addDays(ws, dayIdx)) === todayISO();
  }

  /* Done keys use the stable day key from the plan, so a plan update that moves or renames days keeps the marks. */
  function dayKey(week, dayIdx) { return "w" + week + "-" + DAYS[dayIdx].key; }
  function trainingIdxList() { const out = []; DAYS.forEach(function (d, i) { if (!d.rest) out.push(i); }); return out; }
  function nTrain() { return trainingIdxList().length; }
  function dayStatus(key) {
    const v = state.done[key];
    if (v === true || v === "done") return "done";
    if (v === "skip") return "skip";
    return "";
  }
  function weekSessionCount(w) { let n = 0; trainingIdxList().forEach(function (i) { if (dayStatus(dayKey(w, i)) === "done") n++; }); return n; }
  function weekSkipCount(w) { let n = 0; trainingIdxList().forEach(function (i) { if (dayStatus(dayKey(w, i)) === "skip") n++; }); return n; }
  function weekResolvedCount(w) { return weekSessionCount(w) + weekSkipCount(w); }
  function weekComplete(w) { return weekResolvedCount(w) >= nTrain(); }
  function totalDone() { let n = 0; for (let w = 1; w <= TOTAL_WEEKS; w++) n += weekSessionCount(w); return n; }
  function weekSubLabel(w) {
    const d = weekSessionCount(w), s = weekSkipCount(w), t = nTrain();
    let line = d + "\u00a0of\u00a0" + t + "\u00a0sessions done";
    if (s) line += " · " + s + "\u00a0skipped";
    if (d + s >= t) line += " · week closed";
    return line;
  }
