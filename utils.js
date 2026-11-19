/* ============================================================
   المحاسب — أدوات مساعدة (مساعدات عامة + واجهة)
   ============================================================ */
(function (global) {
  'use strict';

  const App = (global.App = global.App || {});
  App.views = App.views || {};

  const U = {};
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  /* ---------- معرفات وأرقام ---------- */
  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  U.pad = function (n, len) {
    return String(n).padStart(len || 4, '0');
  };

  U.round2 = function (n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  };

  U.num = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/٬/g, '').trim());
    return isFinite(n) ? n : 0;
  };

  /* ---------- تواريخ ---------- */
  U.today = function () {
    const d = new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1, 2) + '-' + U.pad(d.getDate(), 2);
  };

  U.parseDate = function (iso) {
    if (!iso) return new Date();
    const p = String(iso).split('-').map(Number);
    return new Date(p[0] || 2000, (p[1] || 1) - 1, p[2] || 1);
  };

  U.iso = function (d) {
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1, 2) + '-' + U.pad(d.getDate(), 2);
  };

  U.fmtDate = function (iso) {
    if (!iso) return '—';
    const d = U.parseDate(iso);
    return U.pad(d.getDate(), 2) + '/' + U.pad(d.getMonth() + 1, 2) + '/' + d.getFullYear();
  };

  U.startOfMonth = function (iso) {
    const d = U.parseDate(iso);
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1, 2) + '-01';
  };

  U.endOfMonth = function (iso) {
    const d = U.parseDate(iso);
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return U.iso(e);
  };

  U.startOfYear = function (iso) {
    return U.parseDate(iso || U.today()).getFullYear() + '-01-01';
  };

  U.addMonths = function (iso, n) {
    const d = U.parseDate(iso);
    d.setMonth(d.getMonth() + n);
    return U.iso(d);
  };

  U.addDays = function (iso, n) {
    const d = U.parseDate(iso);
    d.setDate(d.getDate() + n);
    return U.iso(d);
  };

  U.monthKey = function (iso) { return String(iso || '').slice(0, 7); };

  U.monthName = function (iso) {
    const d = U.parseDate(iso);
    return AR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };

  U.monthShort = function (iso) {
    const d = U.parseDate(iso + '-01');
    return AR_MONTHS[d.getMonth()].slice(0, 3);
  };

  U.daysBetween = function (a, b) {
    const d1 = U.parseDate(a), d2 = U.parseDate(b);
    return Math.round((d2 - d1) / 86400000);
  };

  U.lastMonths = function (count, endIso) {
    const out = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = U.parseDate(U.startOfMonth(endIso || U.today()));
      d.setMonth(d.getMonth() - i);
      out.push(U.iso(d).slice(0, 7));
    }
    return out;
  };

  /* ---------- تنسيق ---------- */
  U.money = function (n, decimals) {
    const v = U.num(n);
    const d = decimals === undefined ? 2 : decimals;
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (v < -0.004 ? '-' : '') + s;
  };

  U.money0 = function (n) { return U.money(n, 0); };

  U.qty = function (n) {
    const v = U.num(n);
    return (Math.abs(v - Math.round(v)) < 0.00001 ? Math.round(v) : v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  U.percent = function (n) {
    return U.num(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
  };

  U.esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  U.cur = function () {
    try { return (global.DB && DB.state && DB.state.settings.currency) || 'ر.س'; }
    catch (e) { return 'ر.س'; }
  };

  U.amount = function (n) {
    return U.money(n) + ' <span class="cur">' + U.esc(U.cur()) + '</span>';
  };

  U.colorFor = function (i) {
    const palette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#db2777', '#65a30d', '#ea580c', '#4f46e5'];
    return palette[i % palette.length];
  };

  /* ---------- تحويل الأرقام إلى كلمات ---------- */
  U.numToWords = function (num) {
    num = Math.floor(Math.abs(U.num(num)));
    if (!num) return 'صفر';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
      'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hund = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

    function under1000(n) {
      const parts = [];
      const h = Math.floor(n / 100), r = n % 100;
      if (h) parts.push(hund[h]);
      if (r) {
        if (r < 20) parts.push(ones[r]);
        else {
          const t = Math.floor(r / 10), o = r % 10;
          if (o) parts.push(ones[o]);
          parts.push(tens[t]);
        }
      }
      return parts.join(' و');
    }

    const scales = [
      { v: 1000000000, one: 'مليار', two: 'ملياران', few: 'مليارات' },
      { v: 1000000, one: 'مليون', two: 'مليونان', few: 'ملايين' },
      { v: 1000, one: 'ألف', two: 'ألفان', few: 'آلاف' }
    ];
    let rest = num;
    const parts = [];
    scales.forEach(function (sc) {
      if (rest >= sc.v) {
        const c = Math.floor(rest / sc.v);
        rest = rest % sc.v;
        if (c === 1) parts.push(sc.one);
        else if (c === 2) parts.push(sc.two);
        else if (c <= 10) parts.push(under1000(c) + ' ' + sc.few);
        else parts.push(under1000(c) + ' ' + sc.one);
      }
    });
    if (rest > 0) parts.push(under1000(rest));
    return parts.join(' و');
  };

  U.amountInWords = function (n) {
    const v = U.num(n);
    const whole = Math.floor(Math.abs(v));
    const cents = Math.round((Math.abs(v) - whole) * 100);
    let s = 'فقط ' + U.numToWords(whole) + ' ' + U.cur();
    if (cents) s += ' و' + U.numToWords(cents) + ' هللة';
    return s + ' لا غير';
  };

  /* ---------- DOM ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.on = function (el, ev, sel, fn) {
    if (typeof sel === 'function') { el.addEventListener(ev, sel); return; }
    el.addEventListener(ev, function (e) {
      const t = e.target.closest(sel);
      if (t && el.contains(t)) fn.call(t, e, t);
    });
  };

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 200);
    };
  };

  /* ---------- أيقونات ---------- */
  const svg = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };

  U.ICONS = {
    dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="11" width="7" height="10" rx="1.6"/><rect x="3" y="15" width="7" height="6" rx="1.6"/>'),
    layers: svg('<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>'),
    book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M8 7h7"/><path d="M8 11h5"/>'),
    ledger: svg('<path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z"/><path d="M9 8h5"/><path d="M9 12h5"/>'),
    scale: svg('<path d="M12 3v18"/><path d="M6 21h12"/><path d="M4 7h16"/><path d="m4 7-2 6a4 4 0 0 0 8 0L8 7"/><path d="m20 7-2 6a4 4 0 0 0 8 0l-2-6" transform="translate(-4 0)"/>'),
    file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>'),
    cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/>'),
    users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M18 14.5a5 5 0 0 1 3 4.5"/>'),
    truck: svg('<path d="M3 6h10v11H3z"/><path d="M13 9h4l3 3v5h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'),
    box: svg('<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>'),
    receipt: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6"/><path d="M9 12h6"/>'),
    card: svg('<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M3 10h18"/><path d="M7 15h4"/>'),
    expense: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>'),
    reports: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),
    wallet: svg('<rect x="3" y="6" width="18" height="13" rx="2.2"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2"/>'),
    plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    print: svg('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="7" rx="2"/><path d="M6 16h12v5H6z"/>'),
    check: svg('<path d="m4 12 5 5L20 6"/>'),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>'),
    download: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>'),
    upload: svg('<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 3h16"/>'),
    arrowUp: svg('<path d="M12 20V5"/><path d="m6 11 6-6 6 6"/>'),
    arrowDown: svg('<path d="M12 4v15"/><path d="m6 13 6 6 6-6"/>'),
    coins: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>'),
    trend: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    filter: svg('<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>'),
    copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    warn: svg('<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5"/><path d="M12 18h.01"/>')
  };

  U.icon = function (name) { return U.ICONS[name] || ''; };

  /* ---------- إشعارات ---------- */
  U.toast = function (msg, type, ms) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    const ico = type === 'error' ? '✕' : type === 'warn' ? '!' : '✓';
    el.innerHTML = '<span class="ico">' + ico + '</span><span>' + U.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(function () { el.remove(); }, 220);
    }, ms || 2800);
  };

  /* ---------- مودال ---------- */
  U.modal = function (opts) {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML =
      '<div class="modal ' + (opts.size ? 'modal-' + opts.size : '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<div><h3>' + U.esc(opts.title || '') + '</h3>' +
            (opts.sub ? '<div class="sub">' + U.esc(opts.sub) + '</div>' : '') + '</div>' +
          '<button class="icon-btn sm plain" type="button" data-close aria-label="إغلاق">' + U.icon('x') + '</button>' +
        '</div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';
    root.appendChild(wrap);

    const modalEl = wrap.querySelector('.modal');
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      wrap.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('mousedown', function (e) {
      if (e.target === wrap) close();
    });
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey);

    if (opts.onMount) opts.onMount(modalEl, close);
    setTimeout(function () {
      const f = modalEl.querySelector('input:not([type=hidden]), select, textarea');
      if (f) f.focus();
    }, 60);

    return { el: modalEl, close: close };
  };

  U.confirm = function (opts) {
    const o = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise(function (resolve) {
      const m = U.modal({
        title: o.title || 'تأكيد العملية',
        body: '<p style="font-size:14px;line-height:1.7">' + U.esc(o.message || '') + '</p>' +
              (o.detail ? '<p class="small muted" style="margin-top:8px">' + U.esc(o.detail) + '</p>' : ''),
        footer:
          '<div class="spacer"></div>' +
          '<button class="btn" data-close type="button">إلغاء</button>' +
          '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-ok type="button">' +
            U.esc(o.okText || 'تأكيد') + '</button>',
        onMount: function (el, close) {
          el.querySelector('[data-ok]').addEventListener('click', function () { close(); resolve(true); });
          el.addEventListener('click', function (e) {
            if (e.target.closest('[data-close]')) resolve(false);
          });
          el.parentElement.addEventListener('mousedown', function (e) {
            if (e.target === el.parentElement) resolve(false);
          });
        }
      });
      void m;
    });
  };

  /* ---------- طباعة ---------- */
  U.printHTML = function (html, title) {
    const area = document.getElementById('print-area');
    if (!area) return;
    area.innerHTML = html;
    const prev = document.title;
    if (title) document.title = title;
    window.print();
    setTimeout(function () {
      area.innerHTML = '';
      document.title = prev;
    }, 600);
  };

  U.printHeader = function (title, meta) {
    const s = (global.DB && DB.state && DB.state.settings) || {};
    const name = (s.company || '').trim();
    return '<div class="print-head">' +
      (name ? '<h2>' + U.esc(name) + '</h2>' : '') +
      '<div class="t">' + U.esc(title) + '</div>' +
      '<div class="m">' + U.esc(meta || '') + '</div>' +
      '</div>';
  };

  U.printFooter = function () {
    const s = (global.DB && DB.state && DB.state.settings) || {};
    return '<div class="print-foot"><span>' + U.esc(s.company || '') + (s.phone ? ' — ' + U.esc(s.phone) : '') + '</span>' +
      '<span>طُبع في ' + U.fmtDate(U.today()) + '</span></div>';
  };

  /* ---------- ملفات ---------- */
  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  U.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = reject;
      r.readAsText(file, 'utf-8');
    });
  };

  /* ---------- مكوّنات واجهة ---------- */
  U.empty = function (title, msg, icon) {
    return '<div class="empty">' + U.icon(icon || 'file') +
      '<h4>' + U.esc(title) + '</h4>' +
      (msg ? '<p>' + U.esc(msg) + '</p>' : '') + '</div>';
  };

  U.badge = function (text, cls) {
    return '<span class="badge ' + (cls || '') + '">' + U.esc(text) + '</span>';
  };

  U.payBadge = function (inv) {
    const total = global.Accounting ? Accounting.invoiceTotals(inv).total : 0;
    const paid = U.num(inv.paidAmount);
    if (inv.status !== 'posted') return U.badge('مسودة', 'gray');
    if (paid >= total - 0.01) return U.badge('مدفوعة', 'green');
    if (paid > 0.004) return U.badge('مدفوعة جزئياً', 'amber');
    return U.badge('غير مدفوعة', 'red');
  };

  /* ---------- أعمدة/صفوف مساعدة ---------- */
  U.options = function (list, selected, cfg) {
    const c = cfg || {};
    return list.map(function (item) {
      const v = c.value ? c.value(item) : item.id;
      const l = c.label ? c.label(item) : item.name;
      const sel = String(v) === String(selected) ? ' selected' : '';
      return '<option value="' + U.esc(v) + '"' + sel + '>' + U.esc(l) + '</option>';
    }).join('');
  };

  U.sum = function (arr, fn) {
    return arr.reduce(function (a, x) { return a + (fn ? U.num(fn(x)) : U.num(x)); }, 0);
  };

  U.sortBy = function (arr, fn, dir) {
    const d = dir === 'desc' ? -1 : 1;
    return arr.slice().sort(function (a, b) {
      const x = fn(a), y = fn(b);
      if (x < y) return -1 * d;
      if (x > y) return 1 * d;
      return 0;
    });
  };

  U.groupBy = function (arr, fn) {
    const out = {};
    arr.forEach(function (x) {
      const k = fn(x);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  };

  global.U = U;
})(window);
