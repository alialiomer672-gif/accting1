/* ============================================================
   المحاسب — تشغيل التطبيق والتوجيه
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.App;
  const U = global.U;

  const NAV = [
    { section: 'الرئيسية', items: [
      { key: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard', route: '#/dashboard' }
    ] },
    { section: 'المحاسبة', items: [
      { key: 'accounts', label: 'دليل الحسابات', icon: 'layers', route: '#/accounts' },
      { key: 'journal', label: 'القيود اليومية', icon: 'book', route: '#/journal' },
      { key: 'ledger', label: 'دفتر الأستاذ', icon: 'ledger', route: '#/ledger' },
      { key: 'trial', label: 'ميزان المراجعة', icon: 'scale', route: '#/trial' }
    ] },
    { section: 'المبيعات والمشتريات', items: [
      { key: 'invoices', label: 'الفواتير', icon: 'file', route: '#/invoices' },
      { key: 'customers', label: 'العملاء', icon: 'users', route: '#/contacts?type=customer' },
      { key: 'suppliers', label: 'الموردون', icon: 'truck', route: '#/contacts?type=supplier' }
    ] },
    { section: 'المخزون', items: [
      { key: 'items', label: 'الأصناف والمخزون', icon: 'box', route: '#/items' }
    ] },
    { section: 'الخزينة', items: [
      { key: 'receipts', label: 'سندات القبض', icon: 'receipt', route: '#/payments?type=receipt' },
      { key: 'payments', label: 'سندات الصرف', icon: 'card', route: '#/payments?type=payment' },
      { key: 'expenses', label: 'المصروفات', icon: 'expense', route: '#/expenses' }
    ] },
    { section: 'التقارير', items: [
      { key: 'reports', label: 'التقارير المالية', icon: 'reports', route: '#/reports' }
    ] },
    { section: 'النظام', items: [
      { key: 'settings', label: 'الإعدادات', icon: 'settings', route: '#/settings' }
    ] }
  ];

  const ROUTES = {
    dashboard: 'dashboard',
    accounts: 'accounts',
    journal: 'journal',
    'journal/new': 'journalNew',
    ledger: 'ledger',
    trial: 'trial',
    invoices: 'invoices',
    'invoice/new': 'invoiceNew',
    'invoice/view': 'invoiceView',
    contacts: 'contacts',
    items: 'items',
    payments: 'payments',
    'payment/new': 'paymentNew',
    expenses: 'expenses',
    reports: 'reports',
    settings: 'settings'
  };

  const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const viewEl = document.getElementById('view');
  const THEME_KEY = 'mohasib.theme';

  function parseHash() {
    let raw = (location.hash || '').replace(/^#\/?/, '');
    if (!raw) raw = 'dashboard';
    const qIdx = raw.indexOf('?');
    let qs = '';
    if (qIdx > -1) { qs = raw.slice(qIdx + 1); raw = raw.slice(0, qIdx); }
    const path = raw.replace(/\/$/, '') || 'dashboard';
    const params = {};
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      const i = pair.indexOf('=');
      const k = decodeURIComponent(i > -1 ? pair.slice(0, i) : pair);
      const v = i > -1 ? decodeURIComponent(pair.slice(i + 1)) : '';
      params[k] = v;
    });
    return { path: path, params: params };
  }

  function activeKey(path, params) {
    if (path.indexOf('journal') === 0) return 'journal';
    if (path.indexOf('invoice') === 0) return 'invoices';
    if (path === 'contacts') return params.type === 'supplier' ? 'suppliers' : 'customers';
    if (path === 'payments' || path === 'payment/new') return params.type === 'payment' ? 'payments' : 'receipts';
    return path;
  }

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = NAV.map(function (group) {
      return '<div class="nav-section">' + group.section + '</div>' +
        group.items.map(function (it) {
          return '<a class="nav-item" href="' + it.route + '" data-key="' + it.key + '">' +
            U.icon(it.icon) + '<span>' + it.label + '</span></a>';
        }).join('');
    }).join('');
  }

  function setActive(key) {
    U.$$('.nav-item').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-key') === key);
    });
  }

  function setHeader(title, sub) {
    document.getElementById('page-title').textContent = title || '';
    document.getElementById('page-sub').textContent = sub || '';
  }

  App.render = function () {
    const route = parseHash();
    const fnName = ROUTES[route.path] || 'dashboard';
    const fn = App.views[fnName] || App.views.dashboard;

    let result;
    try {
      result = fn(route.params) || { title: '', html: '' };
    } catch (err) {
      console.error(err);
      result = {
        title: 'حدث خطأ',
        sub: 'تعذر عرض الصفحة',
        html: '<div class="card">' + U.empty('حدث خطأ غير متوقع', err.message || String(err), 'warn') +
          '<div class="text-center" style="padding-bottom:24px"><a class="btn" href="#/dashboard">العودة للوحة التحكم</a></div></div>'
      };
    }

    viewEl.innerHTML = result.html || '';
    setHeader(result.title, result.sub);
    document.title = (result.title ? result.title + ' — ' : '') + 'المحاسب';
    setActive(activeKey(route.path, route.params));

    if (result.mount) {
      try { result.mount(viewEl); } catch (err) { console.error('mount error', err); }
    }
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };

  /* ---------------- المظهر ---------------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    const btn = document.getElementById('theme-btn');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    }
  }

  App.toggleTheme = function () {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    App.render();
  };

  /* ---------------- القائمة الجانبية (جوال) ---------------- */
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('show');
  }

  function initShell() {
    document.getElementById('theme-btn').addEventListener('click', App.toggleTheme);

    const menuBtn = document.getElementById('menu-btn');
    const scrim = document.getElementById('scrim');
    menuBtn.addEventListener('click', function () {
      const sb = document.getElementById('sidebar');
      sb.classList.toggle('open');
      scrim.classList.toggle('show', sb.classList.contains('open'));
    });
    scrim.addEventListener('click', closeSidebar);

    const now = new Date();
    const chip = document.getElementById('today-chip');
    chip.textContent = WEEKDAYS[now.getDay()] + '، ' + U.fmtDate(U.today());

    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { /* ignore */ }
    if (!theme) theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(theme);

    window.addEventListener('hashchange', App.render);
  }

  /* ---------------- الإقلاع ---------------- */
  function boot() {
    DB.load();
    Accounting.bootstrapDemo();
    renderNav();
    initShell();
    if (!location.hash) {
      location.replace('#/dashboard');
    }
    App.render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
