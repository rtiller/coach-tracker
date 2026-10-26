
  /* ================= Plan validation ================= */
  /* Checks the coach's plan and returns a normalized copy (defaults filled, lift ids set). See PLAN-SCHEMA.md. */
  function validatePlan(o) {
    const errs = [];
    const isObj = function (x) { return x && typeof x === "object" && !Array.isArray(x); };
    const str = function (x, max) { return typeof x === "string" && x.length <= (max || 200); };
    const optStr = function (x, max) { return x == null || str(x, max); };
    if (!isObj(o)) return { ok: false, error: errInvalid(["The plan must be a JSON object."]) };
    const sv = o.schema == null ? 1 : o.schema;
    if (typeof sv !== "number" || sv < 1 || Math.floor(sv) !== sv) return { ok: false, error: errInvalid(["schema must be a whole number."]) };
    if (sv > PLAN_SCHEMA) return { ok: false, error: errVersion(sv) };
    const meta = o.meta;
    if (!isObj(meta)) errs.push("meta is missing.");
    const m = isObj(meta) ? meta : {};
    if (!str(m.name, 80) || !m.name.trim()) errs.push("meta.name must be text, 1 to 80 characters.");
    const weeks = m.weeks;
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) errs.push("meta.weeks must be a whole number from 1 to 52.");
    const W = Number.isInteger(weeks) && weeks >= 1 && weeks <= 52 ? weeks : 1;
    const bw = m.blockWeeks == null ? W : m.blockWeeks;
    if (!Number.isInteger(bw) || bw < 1 || bw > W) errs.push("meta.blockWeeks must be a whole number from 1 to meta.weeks.");
    const BW = Number.isInteger(bw) && bw >= 1 && bw <= W ? bw : W;
    let deload = m.deload == null ? "none" : m.deload;
    if (Array.isArray(deload)) {
      if (!deload.every(function (w) { return Number.isInteger(w) && w >= 1 && w <= W; })) errs.push("meta.deload weeks must be week numbers from 1 to meta.weeks.");
      else deload = deload.slice().sort(function (a, b) { return a - b; }).filter(function (w, i, a) { return a.indexOf(w) === i; });
    } else if (deload !== "last" && deload !== "none") errs.push('meta.deload must be "last", "none", or a list of week numbers.');
    const units = m.units == null ? "lb" : m.units;
    if (units !== "lb" && units !== "kg") errs.push('meta.units must be "lb" or "kg".');
    if (!optStr(m.deloadNote, 300)) errs.push("meta.deloadNote must be text up to 300 characters.");
    if (!optStr(m.notes, 1500)) errs.push("meta.notes must be text up to 1500 characters.");
    if (m.start != null || m.startDate != null) errs.push("Leave the start date out of the plan. The tracker asks for it.");

    const days = [];
    if (!Array.isArray(o.days) || o.days.length !== 7) errs.push("days must list exactly seven days, Monday first.");
    const trainKeys = [];
    (Array.isArray(o.days) ? o.days.slice(0, 7) : []).forEach(function (d, i) {
      const at = "days[" + i + "] (" + WEEKDAYS[i] + ")";
      if (!isObj(d)) { errs.push(at + " must be an object."); return; }
      const rest = d.rest === true;
      if (d.rest != null && typeof d.rest !== "boolean") errs.push(at + ".rest must be true or false.");
      let key = d.key;
      if (!rest) {
        if (typeof key !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(key)) errs.push(at + ".key must be 1 to 32 letters, digits, - or _.");
        else if (trainKeys.indexOf(key) >= 0) errs.push(at + '.key "' + key + '" is used twice.');
        else trainKeys.push(key);
      } else if (key != null && (typeof key !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(key))) errs.push(at + ".key must be 1 to 32 letters, digits, - or _.");
      if (!str(d.label == null ? (rest ? "Rest" : "") : d.label, 40) || (!rest && !(d.label || "").trim())) errs.push(at + ".label must be text, 1 to 40 characters.");
      if (!optStr(d.short, 4)) errs.push(at + ".short must be up to 4 characters, like Mon.");
      if (!optStr(d.focus, 80)) errs.push(at + ".focus must be text up to 80 characters.");
      if (!optStr(d.note, 120)) errs.push(at + ".note must be text up to 120 characters.");
      if (d.priority != null && typeof d.priority !== "boolean") errs.push(at + ".priority must be true or false.");
      days.push({ key: rest ? (typeof key === "string" && key ? key : "rest") : key, label: d.label || (rest ? "Rest" : ""), short: d.short || WEEKDAYS[i],
        focus: d.focus || "", priority: !rest && d.priority === true, rest: rest, note: d.note || "" });
    });
    if (Array.isArray(o.days) && o.days.length === 7 && !trainKeys.length) errs.push("The plan needs at least one training day.");

    const nBlocks = Math.ceil(W / BW);
    const blocks = {};
    if (!isObj(o.blocks)) errs.push("blocks is missing.");
    else {
      Object.keys(o.blocks).forEach(function (b) {
        if (!/^\d+$/.test(b) || +b < 1 || +b > nBlocks) errs.push('blocks has "' + b + '", but this plan has blocks 1 to ' + nBlocks + ".");
      });
      for (let b = 1; b <= nBlocks; b++) {
        const blk = o.blocks[String(b)];
        if (!isObj(blk)) { errs.push("blocks." + b + " is missing."); continue; }
        blocks[b] = {};
        Object.keys(blk).forEach(function (k) {
          if (trainKeys.indexOf(k) < 0) errs.push("blocks." + b + '.' + k + " is not a training day key" + (days.some(function (d) { return d.rest && d.key === k; }) ? " (rest days have no exercises)." : "."));
        });
        trainKeys.forEach(function (k) {
          const list = blk[k];
          const at = "blocks." + b + "." + k;
          if (!Array.isArray(list) || !list.length) { errs.push(at + " needs at least one exercise."); return; }
          if (list.length > 20) errs.push(at + " has more than 20 exercises.");
          let anchors = 0;
          blocks[b][k] = list.map(function (ex, j) {
            const ea = at + "[" + j + "]";
            if (!isObj(ex)) { errs.push(ea + " must be an object."); return { name: "", sets: "", tags: [] }; }
            if (!str(ex.name, 80) || !ex.name.trim()) errs.push(ea + ".name must be text, 1 to 80 characters.");
            if (!str(ex.sets, 60)) errs.push(ea + ".sets must be text up to 60 characters, like 3 x 8-10.");
            const tags = ex.tags == null ? [] : ex.tags;
            if (!Array.isArray(tags)) errs.push(ea + ".tags must be a list.");
            (Array.isArray(tags) ? tags : []).forEach(function (t) { if (TAGS.indexOf(t) < 0) errs.push(ea + ' has unknown tag "' + String(t).slice(0, 20) + '". Use anchor, priority, optional or accessory.'); });
            if (Array.isArray(tags) && tags.indexOf("anchor") >= 0) anchors++;
            if (!optStr(ex.note, 160)) errs.push(ea + ".note must be text up to 160 characters.");
            if (ex.id != null && (typeof ex.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(ex.id))) errs.push(ea + ".id must be 1 to 40 letters, digits, - or _.");
            const out = { name: ex.name, sets: ex.sets, tags: Array.isArray(tags) ? tags.filter(function (t, i, a) { return a.indexOf(t) === i; }) : [] };
            if (ex.id) out.id = ex.id;
            if (ex.note) out.note = ex.note;
            return out;
          });
          if (anchors !== 1) errs.push(at + " must have exactly one anchor exercise (it has " + anchors + ").");
        });
      }
    }

    const lifts = [];
    const rawLifts = o.lifts == null ? [] : o.lifts;
    if (!Array.isArray(rawLifts)) errs.push("lifts must be a list.");
    else {
      if (rawLifts.length > 20) errs.push("lifts can list at most 20 lifts.");
      rawLifts.forEach(function (l, i) {
        let name, id;
        if (typeof l === "string") { name = l; id = slug(l); }
        else if (isObj(l)) { name = l.name; id = l.id || (typeof l.name === "string" ? slug(l.name) : ""); }
        if (!str(name, 60) || !String(name).trim()) { errs.push("lifts[" + i + "] must be a lift name, 1 to 60 characters."); return; }
        if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) { errs.push("lifts[" + i + "].id must be 1 to 40 letters, digits, - or _."); return; }
        if (lifts.some(function (x) { return x.id === id; })) { errs.push('lifts has "' + name + '" twice.'); return; }
        lifts.push({ id: id, name: name });
      });
    }
    if (!lifts.length && !errs.length) {
      /* no list: offer each anchor once */
      Object.keys(blocks).forEach(function (b) { Object.keys(blocks[b]).forEach(function (k) { blocks[b][k].forEach(function (ex) {
        if (ex.tags.indexOf("anchor") >= 0 && !lifts.some(function (x) { return x.id === slug(ex.name); }) && lifts.length < 20) lifts.push({ id: slug(ex.name), name: ex.name });
      }); }); });
    }

    const labels = Object.assign({}, DEFAULT_LABELS);
    const hints = {};
    if (o.labels != null) {
      if (!isObj(o.labels)) errs.push("labels must be an object.");
      else Object.keys(o.labels).forEach(function (k) {
        if (k === "hints") {
          const h = o.labels.hints;
          if (!isObj(h)) { errs.push("labels.hints must be an object of day key to text."); return; }
          Object.keys(h).forEach(function (dk) {
            if (trainKeys.indexOf(dk) < 0) errs.push('labels.hints has "' + dk + '", which is not a training day key.');
            else if (!str(h[dk], 240)) errs.push("labels.hints." + dk + " must be text up to 240 characters.");
            else hints[dk] = h[dk];
          });
        } else if (TAGS.indexOf(k) < 0) errs.push('labels has unknown tag "' + k.slice(0, 20) + '".');
        else if (!str(o.labels[k], 20) || !o.labels[k].trim()) errs.push("labels." + k + " must be text, 1 to 20 characters.");
        else labels[k] = o.labels[k];
      });
    }
    if (errs.length) return { ok: false, error: errInvalid(errs) };
    const plan = {
      schema: PLAN_SCHEMA,
      meta: { name: m.name.trim(), weeks: W, blockWeeks: BW, deload: deload, units: units },
      days: days, blocks: blocks, lifts: lifts, labels: Object.assign(labels, { hints: hints })
    };
    if (m.deloadNote) plan.meta.deloadNote = m.deloadNote;
    if (m.notes) plan.meta.notes = m.notes;
    return { ok: true, plan: plan };
  }
