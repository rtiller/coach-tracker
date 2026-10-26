  function ringSvg(value, max, size, cls) {
    size = size || 44;
    const sw = size >= 80 ? 8 : size >= 60 ? 6 : 4, r = (size - sw) / 2, circ = 2 * Math.PI * r;
    const fs = Math.round(size * 0.3);
    const pct = Math.max(0, Math.min(1, max ? value / max : 0));
    const complete = value >= max && max > 0;
    const col = complete ? "var(--jade)" : "var(--ember)";
    const cx = size / 2, cy = size / 2;
    /* Full circle: do NOT use dash + round linecap; that leaves a C-gap / ghost arc at 100%. */
    const progress = complete
      ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" />'
      : '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw +
        '" stroke-linecap="round" class="ring-fill" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' +
        (circ * (1 - pct)).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" />';
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" class="' + (cls || "") + '" style="display:block;overflow:visible;flex-shrink:0">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '" />' +
        progress +
        '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" style="font-family:var(--mono);font-size:' + fs + 'px;font-weight:700;fill:var(--bone)">' + value + "</text>" +
      "</svg>"
    );
  }

  function checkIcon() {
    return '<svg class="check-mark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  function skipIcon() {
    return '<svg class="skip-mark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"/></svg>';
  }
  function statusIcons() {
    return checkIcon() + skipIcon();
  }

