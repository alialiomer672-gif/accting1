/* ============================================================
   المحاسب — رسوم بيانية خفيفة بـ SVG (بدون مكتبات خارجية)
   ============================================================ */
(function (global) {
  'use strict';

  const C = {};

  C.compact = function (n) {
    const v = U.num(n);
    const a = Math.abs(v);
    if (a >= 1000000000) return (v / 1000000000).toFixed(a >= 10000000000 ? 0 : 1) + ' مليار';
    if (a >= 1000000) return (v / 1000000).toFixed(a >= 10000000 ? 0 : 1) + ' م';
    if (a >= 1000) return (v / 1000).toFixed(a >= 10000 ? 0 : 1) + ' ألف';
    return String(Math.round(v));
  };

  C.niceMax = function (v) {
    if (v <= 0) return 10;
    const exp = Math.floor(Math.log10(v));
    const base = Math.pow(10, exp);
    const f = v / base;
    let m;
    if (f <= 1) m = 1;
    else if (f <= 2) m = 2;
    else if (f <= 2.5) m = 2.5;
    else if (f <= 5) m = 5;
    else m = 10;
    return m * base;
  };

  function esc(s) { return U.esc(s); }

  /* ---------------- أعمدة مجمّعة ---------------- */
  C.bars = function (el, cfg) {
    if (!el) return;
    const labels = cfg.labels || [];
    const series = (cfg.series || []).filter(function (s) { return s.data && s.data.length; });
    if (!labels.length || !series.length) {
      el.innerHTML = '<div class="chart-empty">لا توجد بيانات لعرضها</div>';
      return;
    }
    const W = 760, H = cfg.height || 270;
    const padTop = 14, padBottom = 36, padLeft = 10, padRight = 62;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;
    let max = 0;
    series.forEach(function (s) { s.data.forEach(function (v) { max = Math.max(max, U.num(v)); }); });
    max = C.niceMax(max || 10);

    let g = '';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = (max / steps) * i;
      const y = padTop + plotH - (plotH * i / steps);
      g += '<line class="grid-line" x1="' + padLeft + '" y1="' + y + '" x2="' + (W - padRight) + '" y2="' + y + '"/>';
      g += '<text class="axis-label" x="' + (W - padRight + 8) + '" y="' + (y + 3.5) + '" text-anchor="start">' + esc(C.compact(val)) + '</text>';
    }

    const n = labels.length;
    const step = plotW / n;
    const groupW = Math.min(step * 0.62, 58);
    const bw = Math.max(6, (groupW - (series.length - 1) * 4) / series.length);

    let bars = '';
    labels.forEach(function (lab, i) {
      const cx = W - padRight - step * i - step / 2;
      const groupStart = cx - groupW / 2;
      series.forEach(function (s, si) {
        const v = U.num(s.data[i]);
        const h = Math.max(0, (v / max) * plotH);
        const x = groupStart + si * (bw + 4);
        const y = padTop + plotH - h;
        if (h > 0) {
          bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
            '" rx="3.5" fill="' + (s.color || '#2563eb') + '">' +
            '<title>' + esc(lab + ' — ' + s.name + ': ' + U.money(v)) + '</title></rect>';
        }
      });
      bars += '<text class="axis-label" x="' + cx.toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });

    const legend = series.map(function (s) {
      return '<span class="k"><span class="sw" style="background:' + (s.color || '#2563eb') + '"></span>' + esc(s.name) + '</span>';
    }).join('');

    el.innerHTML =
      '<div class="chart-legend" style="margin-bottom:8px">' + legend + '</div>' +
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img">' +
        g + bars +
      '</svg>';
  };

  /* ---------------- دائرة نسب ---------------- */
  C.donut = function (el, data, cfg) {
    if (!el) return;
    const items = (data || []).filter(function (d) { return U.num(d.value) > 0; });
    const total = items.reduce(function (a, d) { return a + U.num(d.value); }, 0);
    if (!items.length || total <= 0) {
      el.innerHTML = '<div class="chart-empty">لا توجد بيانات لعرضها</div>';
      return;
    }
    const size = 230, r = 78, cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let arcs = '';
    items.forEach(function (d, i) {
      const frac = U.num(d.value) / total;
      const len = frac * circ;
      const color = d.color || U.colorFor(i);
      arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="26" ' +
        'stroke-dasharray="' + Math.max(0, len - 2.5) + ' ' + (circ - Math.max(0, len - 2.5)) + '" ' +
        'stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt">' +
        '<title>' + esc(d.label + ': ' + U.money(d.value) + ' (' + (frac * 100).toFixed(1) + '%)') + '</title></circle>';
      offset += len;
    });

    const legend = items.map(function (d, i) {
      const pct = (U.num(d.value) / total * 100).toFixed(1);
      return '<div class="legend-row">' +
        '<span class="sw" style="background:' + (d.color || U.colorFor(i)) + '"></span>' +
        '<span class="lbl">' + esc(d.label) + '</span>' +
        '<span class="pct">' + pct + '%</span>' +
        '<span class="val">' + esc(U.money(d.value)) + '</span>' +
      '</div>';
    }).join('');

    el.innerHTML =
      '<div class="donut-wrap">' +
        '<svg viewBox="0 0 ' + size + ' ' + size + '" class="donut-svg" role="img">' + arcs +
          '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="donut-total">' + esc(C.compact(total)) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" class="donut-sub">' + esc(cfg && cfg.centerLabel || 'الإجمالي') + '</text>' +
        '</svg>' +
        '<div class="donut-legend">' + legend + '</div>' +
      '</div>';
  };

  /* ---------------- خط بسيط ---------------- */
  C.line = function (el, cfg) {
    if (!el) return;
    const labels = cfg.labels || [];
    const series = (cfg.series || []).filter(function (s) { return s.data && s.data.length; });
    if (!labels.length || !series.length) {
      el.innerHTML = '<div class="chart-empty">لا توجد بيانات لعرضها</div>';
      return;
    }
    const W = 760, H = cfg.height || 240;
    const padTop = 14, padBottom = 34, padLeft = 14, padRight = 62;
    const plotW = W - padLeft - padRight, plotH = H - padTop - padBottom;
    let max = 0, min = 0;
    series.forEach(function (s) { s.data.forEach(function (v) { max = Math.max(max, U.num(v)); min = Math.min(min, U.num(v)); }); });
    max = C.niceMax(max || 10);
    if (min < 0) min = -C.niceMax(Math.abs(min));
    const range = max - min || 1;

    let g = '';
    for (let i = 0; i <= 4; i++) {
      const val = min + (range / 4) * i;
      const y = padTop + plotH - (plotH * (val - min) / range);
      g += '<line class="grid-line" x1="' + padLeft + '" y1="' + y + '" x2="' + (W - padRight) + '" y2="' + y + '"/>';
      g += '<text class="axis-label" x="' + (W - padRight + 8) + '" y="' + (y + 3.5) + '">' + esc(C.compact(val)) + '</text>';
    }

    const n = labels.length;
    const step = plotW / Math.max(1, n - 1);
    const xAt = function (i) { return W - padRight - step * i; };
    const yAt = function (v) { return padTop + plotH - (plotH * (U.num(v) - min) / range); };

    let paths = '';
    series.forEach(function (s, si) {
      let d = '';
      s.data.forEach(function (v, i) {
        d += (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1) + ' ';
      });
      paths += '<path d="' + d + '" fill="none" stroke="' + (s.color || U.colorFor(si)) + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      s.data.forEach(function (v, i) {
        paths += '<circle cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(v).toFixed(1) + '" r="3" fill="' + (s.color || U.colorFor(si)) + '">' +
          '<title>' + esc(labels[i] + ': ' + U.money(v)) + '</title></circle>';
      });
    });

    let xl = '';
    labels.forEach(function (lab, i) {
      xl += '<text class="axis-label" x="' + xAt(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });

    el.innerHTML = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + g + paths + xl + '</svg>';
  };

  global.Charts = C;
})(window);
