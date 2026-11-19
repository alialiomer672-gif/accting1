/* ============================================================
   المحاسب — التقارير المالية والإعدادات
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.App;
  const h = App.h;

  function rrow(label, amount, o) {
    o = o || {};
    return '<div class="report-row ' + (o.cls || '') + '">' +
      '<span class="lbl ' + (o.indent ? 'indent-' + o.indent : '') + '">' +
        (o.code ? '<span class="mono muted small">' + U.esc(o.code) + '</span> ' : '') +
        U.esc(label) + '</span>' +
      '<span class="amt">' + (o.blank ? '' : U.money(amount)) + '</span>' +
    '</div>';
  }

  function prRow(label, amount, o) {
    o = o || {};
    return '<tr' + (o.bold ? ' style="font-weight:800;background:#f7f7f7"' : '') + '>' +
      '<td style="padding-right:' + (8 + (o.indent || 0) * 14) + 'px">' + U.esc(label) + '</td>' +
      '<td class="num">' + (o.blank ? '' : U.money(amount)) + '</td></tr>';
  }

  const REPORTS = [
    { id: 'income', label: 'قائمة الدخل' },
    { id: 'balance', label: 'الميزانية العمومية' },
    { id: 'trial', label: 'ميزان المراجعة' },
    { id: 'ledger', label: 'دفتر الأستاذ' },
    { id: 'aging', label: 'أعمار الديون' },
    { id: 'vat', label: 'الإقرار الضريبي' },
    { id: 'inventory', label: 'تقييم المخزون' },
    { id: 'journal', label: 'دفتر اليومية' }
  ];

  /* ---------------- قائمة الدخل ---------------- */
  function buildIncome(from, to) {
    const r = Accounting.incomeStatement(from, to);
    let html = '<div class="report-section"><h4>الإيرادات</h4>';
    let pr = '<table><thead><tr><th>البيان</th><th>المبلغ</th></tr></thead><tbody>';
    r.revenue.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    html += rrow('إجمالي الإيرادات التشغيلية', r.revenueTotal, { cls: 'subtotal' }) + '</div>';
    pr += prRow('إجمالي الإيرادات التشغيلية', r.revenueTotal, { bold: true });

    html += '<div class="report-section"><h4>تكلفة المبيعات</h4>';
    if (!r.cogs.length) html += rrow('لا توجد تكلفة مبيعات مسجلة', 0, { indent: 1, blank: true });
    r.cogs.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    html += rrow('إجمالي تكلفة المبيعات', r.cogsTotal, { cls: 'subtotal' });
    html += rrow('الربح الإجمالي', r.grossProfit, { cls: 'total' }) + '</div>';
    pr += prRow('إجمالي تكلفة المبيعات', r.cogsTotal, { bold: true });
    pr += prRow('الربح الإجمالي', r.grossProfit, { bold: true });

    html += '<div class="report-section"><h4>مصروفات التشغيل</h4>';
    if (!r.opex.length) html += rrow('لا توجد مصروفات تشغيل مسجلة', 0, { indent: 1, blank: true });
    r.opex.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    html += rrow('إجمالي مصروفات التشغيل', r.opexTotal, { cls: 'subtotal' });
    html += rrow('الربح التشغيلي', r.operatingProfit, { cls: 'total' }) + '</div>';
    pr += prRow('إجمالي مصروفات التشغيل', r.opexTotal, { bold: true });
    pr += prRow('الربح التشغيلي', r.operatingProfit, { bold: true });

    if (r.other.length) {
      html += '<div class="report-section"><h4>إيرادات أخرى</h4>';
      r.other.forEach(function (x) {
        html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
        pr += prRow(x.account.name, x.amount, { indent: 1 });
      });
      html += '</div>';
    }

    html += '<div class="report-section">' + rrow('صافي الربح / (الخسارة)', r.netProfit, { cls: 'total' }) + '</div>';
    html += '<div class="report-note">صافي هامش الربح: ' + (r.revenueTotal ? U.percent(r.netProfit / r.revenueTotal * 100) : '—') + ' من إجمالي الإيرادات التشغيلية.</div>';
    pr += prRow('صافي الربح / (الخسارة)', r.netProfit, { bold: true }) + '</tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'income-statement.csv',
        headers: ['البيان', 'المبلغ'],
        rows: r.revenue.map(function (x) { return [x.account.name, x.amount]; }).concat(
          [['إجمالي الإيرادات', r.revenueTotal]],
          r.cogs.map(function (x) { return [x.account.name, x.amount]; }),
          [['إجمالي تكلفة المبيعات', r.cogsTotal], ['الربح الإجمالي', r.grossProfit]],
          r.opex.map(function (x) { return [x.account.name, x.amount]; }),
          [['إجمالي مصروفات التشغيل', r.opexTotal], ['الربح التشغيلي', r.operatingProfit], ['صافي الربح', r.netProfit]]
        )
      }
    };
  }

  /* ---------------- الميزانية العمومية ---------------- */
  function buildBalance(asOf) {
    const b = Accounting.balanceSheet(asOf);
    let html = '<div class="grid grid-2" style="gap:0">';

    html += '<div class="report-section"><h4>الأصول</h4>';
    let pr = '<table><tbody>';
    b.assets.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    html += rrow('إجمالي الأصول', b.assetsTotal, { cls: 'total' }) + '</div>';
    pr += prRow('إجمالي الأصول', b.assetsTotal, { bold: true });

    html += '<div class="report-section"><h4>الالتزامات</h4>';
    b.liabilities.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    html += rrow('إجمالي الالتزامات', b.liabilitiesTotal, { cls: 'subtotal' });
    html += '<h4 style="margin-top:14px">حقوق الملكية</h4>';
    b.equity.forEach(function (x) {
      html += rrow(x.account.name, x.amount, { code: x.account.code, indent: 1 });
      pr += prRow(x.account.name, x.amount, { indent: 1 });
    });
    if (b.priorNet) {
      html += rrow('أرباح فترات سابقة غير مقفلة', b.priorNet, { indent: 1 });
      pr += prRow('أرباح فترات سابقة غير مقفلة', b.priorNet, { indent: 1 });
    }
    html += rrow('صافي ربح السنة الحالية', b.currentNet, { indent: 1 });
    pr += prRow('صافي ربح السنة الحالية', b.currentNet, { indent: 1 });
    html += rrow('إجمالي حقوق الملكية', b.equityTotal, { cls: 'subtotal' });
    html += rrow('إجمالي الالتزامات وحقوق الملكية', b.totalLiabilitiesEquity, { cls: 'total' }) + '</div>';
    pr += prRow('إجمالي الالتزامات', b.liabilitiesTotal, { bold: true });
    pr += prRow('إجمالي حقوق الملكية', b.equityTotal, { bold: true });
    pr += prRow('إجمالي الالتزامات وحقوق الملكية', b.totalLiabilitiesEquity, { bold: true }) + '</tbody></table>';

    html += '</div>';
    html += '<div class="report-section"><div class="balance-flag ' + (Math.abs(b.difference) < 0.01 ? 'ok' : 'bad') + '">' +
      (Math.abs(b.difference) < 0.01 ? '✓ الميزانية متوازنة' : '✕ فرق في الميزانية: ' + U.money(b.difference)) + '</div></div>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'balance-sheet.csv',
        headers: ['القسم', 'الحساب', 'المبلغ'],
        rows: b.assets.map(function (x) { return ['الأصول', x.account.name, x.amount]; })
          .concat([['الأصول', 'الإجمالي', b.assetsTotal]])
          .concat(b.liabilities.map(function (x) { return ['الالتزامات', x.account.name, x.amount]; }))
          .concat([['الالتزامات', 'الإجمالي', b.liabilitiesTotal]])
          .concat(b.equity.map(function (x) { return ['حقوق الملكية', x.account.name, x.amount]; }))
          .concat([['حقوق الملكية', 'صافي الربح', b.currentNet], ['حقوق الملكية', 'الإجمالي', b.equityTotal]])
      }
    };
  }

  /* ---------------- ميزان المراجعة ---------------- */
  function buildTrial(from, to) {
    const tb = Accounting.trialBalance(from, to);
    const t = tb.totals;
    let html = '<div class="table-wrap"><table class="data">' +
      '<thead><tr><th rowspan="2">الحساب</th><th colspan="2" class="text-center">افتتاحي</th><th colspan="2" class="text-center">الحركة</th><th colspan="2" class="text-center">ختامي</th></tr>' +
      '<tr><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>';
    let pr = '<table><thead><tr><th>الحساب</th><th>افتتاحي مدين</th><th>افتتاحي دائن</th><th>حركة مدين</th><th>حركة دائن</th><th>ختامي مدين</th><th>ختامي دائن</th></tr></thead><tbody>';
    tb.rows.forEach(function (r) {
      html += '<tr><td><span class="mono muted small">' + U.esc(r.account.code) + '</span> ' + U.esc(r.account.name) + '</td>' +
        '<td class="num">' + (r.openDebit ? U.money(r.openDebit) : '—') + '</td>' +
        '<td class="num">' + (r.openCredit ? U.money(r.openCredit) : '—') + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '—') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '—') + '</td>' +
        '<td class="num strong">' + (r.closeDebit ? U.money(r.closeDebit) : '—') + '</td>' +
        '<td class="num strong">' + (r.closeCredit ? U.money(r.closeCredit) : '—') + '</td></tr>';
      pr += '<tr><td>' + U.esc(r.account.code + ' ' + r.account.name) + '</td>' +
        '<td class="num">' + (r.openDebit ? U.money(r.openDebit) : '') + '</td>' +
        '<td class="num">' + (r.openCredit ? U.money(r.openCredit) : '') + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
        '<td class="num">' + (r.closeDebit ? U.money(r.closeDebit) : '') + '</td>' +
        '<td class="num">' + (r.closeCredit ? U.money(r.closeCredit) : '') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td>الإجمالي</td>' +
      '<td class="num">' + U.money(t.openDebit) + '</td><td class="num">' + U.money(t.openCredit) + '</td>' +
      '<td class="num">' + U.money(t.debit) + '</td><td class="num">' + U.money(t.credit) + '</td>' +
      '<td class="num">' + U.money(t.closeDebit) + '</td><td class="num">' + U.money(t.closeCredit) + '</td></tr></tfoot></table></div>';
    pr += '<tr><th>الإجمالي</th><th class="num">' + U.money(t.openDebit) + '</th><th class="num">' + U.money(t.openCredit) + '</th>' +
      '<th class="num">' + U.money(t.debit) + '</th><th class="num">' + U.money(t.credit) + '</th>' +
      '<th class="num">' + U.money(t.closeDebit) + '</th><th class="num">' + U.money(t.closeCredit) + '</th></tr></tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'trial-balance.csv',
        headers: ['الحساب', 'افتتاحي مدين', 'افتتاحي دائن', 'حركة مدين', 'حركة دائن', 'ختامي مدين', 'ختامي دائن'],
        rows: tb.rows.map(function (r) {
          return [r.account.code + ' ' + r.account.name, r.openDebit, r.openCredit, r.debit, r.credit, r.closeDebit, r.closeCredit];
        }).concat([['الإجمالي', t.openDebit, t.openCredit, t.debit, t.credit, t.closeDebit, t.closeCredit]])
      }
    };
  }

  /* ---------------- دفتر الأستاذ ---------------- */
  function buildLedger(accountId, from, to) {
    const acc = Accounting.account(accountId) || Accounting.leaves()[0];
    const data = acc ? Accounting.ledger(acc.id, from, to) : { opening: 0, rows: [], closing: 0 };
    let html = '';
    let pr = '';
    let dr = 0, cr = 0;
    data.rows.forEach(function (r) { dr += r.debit; cr += r.credit; });
    dr = U.round2(dr); cr = U.round2(cr);

    html += '<div class="grid grid-4" style="gap:12px;padding:16px 26px">' +
      '<div class="kpi-inline"><div class="k"><span>الرصيد الافتتاحي</span><strong>' + U.money(data.opening) + '</strong></div></div>' +
      '<div class="kpi-inline"><div class="k"><span>مدين</span><strong>' + U.money(dr) + '</strong></div></div>' +
      '<div class="kpi-inline"><div class="k"><span>دائن</span><strong>' + U.money(cr) + '</strong></div></div>' +
      '<div class="kpi-inline"><div class="k"><span>الرصيد الختامي</span><strong>' + U.money(data.closing) + '</strong></div></div>' +
    '</div>';

    html += '<div class="table-wrap"><table class="data"><thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">الرصيد</th></tr></thead><tbody>';
    pr = '<table><thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
    pr += '<tr><td colspan="5"><strong>رصيد افتتاحي</strong></td><td class="num">' + U.money(data.opening) + '</td></tr>';
    if (!data.rows.length) html += h.emptyRow(6, 'لا توجد حركات', 'ledger');
    data.rows.forEach(function (r) {
      html += '<tr><td class="nowrap">' + U.fmtDate(r.date) + '</td><td class="mono">' + U.esc(r.no) + '</td>' +
        '<td>' + U.esc(r.description) + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
        '<td class="num strong">' + U.money(r.balance) + '</td></tr>';
      pr += '<tr><td>' + U.fmtDate(r.date) + '</td><td>' + U.esc(r.no) + '</td><td>' + U.esc(r.description) + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
        '<td class="num">' + U.money(r.balance) + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td class="num">' + U.money(dr) + '</td><td class="num">' + U.money(cr) + '</td><td class="num">' + U.money(data.closing) + '</td></tr></tfoot></table></div>';
    pr += '<tr><th colspan="3">الإجمالي</th><th class="num">' + U.money(dr) + '</th><th class="num">' + U.money(cr) + '</th><th class="num">' + U.money(data.closing) + '</th></tr></tbody></table>';

    return {
      html: html, print: pr, account: acc,
      csv: {
        filename: 'ledger-' + (acc ? acc.code : '') + '.csv',
        headers: ['التاريخ', 'القيد', 'البيان', 'مدين', 'دائن', 'الرصيد'],
        rows: data.rows.map(function (r) { return [r.date, r.no, r.description, r.debit, r.credit, r.balance]; })
      }
    };
  }

  /* ---------------- أعمار الديون ---------------- */
  function buildAging() {
    const sale = Accounting.aging('sale');
    const purchase = Accounting.aging('purchase');
    const buckets = [
      { k: 'current', label: 'غير مستحقة' },
      { k: 'd30', label: '1–30 يوم' },
      { k: 'd60', label: '31–60 يوم' },
      { k: 'd90', label: '61–90 يوم' },
      { k: 'over', label: 'أكثر من 90 يوم' }
    ];

    function section(title, data, color) {
      let html = '<div class="report-section"><h4>' + title + '</h4>' +
        '<div class="grid grid-5" style="gap:10px;margin:10px 0 6px">' +
        buckets.map(function (b) {
          return '<div class="card" style="padding:12px 14px;border-radius:10px">' +
            '<div class="muted small">' + b.label + '</div>' +
            '<div class="strong mono" style="font-size:15px">' + U.money(data.buckets[b.k]) + '</div></div>';
        }).join('') + '</div>';
      html += '<div class="table-wrap"><table class="data"><thead><tr><th>الفاتورة</th><th>الطرف</th><th>تاريخ الاستحقاق</th><th class="num">أيام التأخير</th><th class="num">المتبقي</th></tr></thead><tbody>';
      if (!data.rows.length) html += h.emptyRow(5, 'لا توجد أرصدة مستحقة', 'scale');
      data.rows.forEach(function (r) {
        html += '<tr><td class="mono">' + U.esc(r.invoice.no) + '</td><td>' + U.esc(r.contact ? r.contact.name : '—') + '</td>' +
          '<td class="nowrap">' + U.fmtDate(r.invoice.dueDate || r.invoice.date) + '</td>' +
          '<td class="num ' + (r.days > 90 ? 'text-red strong' : r.days > 0 ? 'text-amber' : 'muted') + '">' + (r.days > 0 ? r.days : '—') + '</td>' +
          '<td class="num strong">' + U.money(r.outstanding) + '</td></tr>';
      });
      html += '</tbody><tfoot><tr><td colspan="4">الإجمالي</td><td class="num">' + U.money(data.total) + '</td></tr></tfoot></table></div></div>';
      return html;
    }

    let html = section('الذمم المدينة — العملاء', sale) + section('الذمم الدائنة — الموردون', purchase);
    let pr = '<table><thead><tr><th>النوع</th><th>الفاتورة</th><th>الطرف</th><th>الاستحقاق</th><th>أيام التأخير</th><th>المتبقي</th></tr></thead><tbody>';
    sale.rows.forEach(function (r) {
      pr += '<tr><td>عميل</td><td>' + U.esc(r.invoice.no) + '</td><td>' + U.esc(r.contact ? r.contact.name : '') + '</td>' +
        '<td>' + U.fmtDate(r.invoice.dueDate || r.invoice.date) + '</td><td class="num">' + (r.days > 0 ? r.days : 0) + '</td><td class="num">' + U.money(r.outstanding) + '</td></tr>';
    });
    purchase.rows.forEach(function (r) {
      pr += '<tr><td>مورد</td><td>' + U.esc(r.invoice.no) + '</td><td>' + U.esc(r.contact ? r.contact.name : '') + '</td>' +
        '<td>' + U.fmtDate(r.invoice.dueDate || r.invoice.date) + '</td><td class="num">' + (r.days > 0 ? r.days : 0) + '</td><td class="num">' + U.money(r.outstanding) + '</td></tr>';
    });
    pr += '</tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'aging.csv',
        headers: ['النوع', 'الفاتورة', 'الطرف', 'الاستحقاق', 'أيام التأخير', 'المتبقي'],
        rows: sale.rows.map(function (r) { return ['عميل', r.invoice.no, r.contact ? r.contact.name : '', r.invoice.dueDate, r.days, r.outstanding]; })
          .concat(purchase.rows.map(function (r) { return ['مورد', r.invoice.no, r.contact ? r.contact.name : '', r.invoice.dueDate, r.days, r.outstanding]; }))
      }
    };
  }

  /* ---------------- الإقرار الضريبي ---------------- */
  function buildVat(from, to) {
    const v = Accounting.vatReport(from, to);
    const net = v.net;
    let html = '<div class="grid grid-3" style="padding:16px 26px">' +
      h.stat({ label: 'ضريبة المخرجات (المبيعات)', value: v.output, icon: 'arrowUp', color: 'green' }) +
      h.stat({ label: 'ضريبة المدخلات (المشتريات والمصروفات)', value: v.input, icon: 'arrowDown', color: 'blue' }) +
      h.stat({ label: net >= 0 ? 'الصافي المستحق للسداد' : 'رصيد ضريبي قابل للاسترداد', value: Math.abs(net), icon: 'scale', color: net >= 0 ? 'amber' : 'green' }) +
    '</div>';

    html += '<div class="report-section"><h4>المبيعات الخاضعة للضريبة</h4>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th class="num">الوعاء</th><th class="num">الضريبة</th></tr></thead><tbody>';
    if (!v.salesRows.length) html += h.emptyRow(5, 'لا توجد مبيعات في الفترة', 'file');
    v.salesRows.forEach(function (r) {
      const c = Accounting.contact(r.inv.contactId);
      html += '<tr><td class="mono">' + U.esc(r.inv.no) + '</td><td class="nowrap">' + U.fmtDate(r.inv.date) + '</td>' +
        '<td>' + U.esc(c ? c.name : '—') + '</td><td class="num">' + U.money(r.base) + '</td><td class="num">' + U.money(r.tax) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div class="report-section"><h4>المشتريات والمصروفات الخاضعة للضريبة</h4>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>المستند</th><th>التاريخ</th><th>المورد</th><th class="num">الوعاء</th><th class="num">الضريبة</th></tr></thead><tbody>';
    if (!v.purchaseRows.length && !v.expensesTax) html += h.emptyRow(5, 'لا توجد مشتريات في الفترة', 'file');
    v.purchaseRows.forEach(function (r) {
      const c = Accounting.contact(r.inv.contactId);
      html += '<tr><td class="mono">' + U.esc(r.inv.no) + '</td><td class="nowrap">' + U.fmtDate(r.inv.date) + '</td>' +
        '<td>' + U.esc(c ? c.name : '—') + '</td><td class="num">' + U.money(r.base) + '</td><td class="num">' + U.money(r.tax) + '</td></tr>';
    });
    if (v.expensesTax) {
      html += '<tr><td>مصروفات</td><td>—</td><td>ضريبة مصروفات</td><td class="num">—</td><td class="num">' + U.money(v.expensesTax) + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="4">إجمالي ضريبة المدخلات</td><td class="num">' + U.money(v.input) + '</td></tr></tfoot></table></div></div>';

    html += '<div class="report-section" style="padding-bottom:20px">' +
      '<div class="report-row total"><span class="lbl">' + (net >= 0 ? 'صافي الضريبة المستحقة' : 'صافي الضريبة القابلة للاسترداد') + '</span>' +
      '<span class="amt">' + U.money(Math.abs(net)) + '</span></div></div>';

    const pr = '<table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>' +
      prRow('ضريبة المخرجات (المبيعات)', v.output, {}) +
      prRow('ضريبة المدخلات (المشتريات)', v.input, {}) +
      prRow(net >= 0 ? 'الصافي المستحق' : 'الصافي القابل للاسترداد', Math.abs(net), { bold: true }) +
      '</tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'vat-return.csv',
        headers: ['البند', 'المبلغ'],
        rows: [['ضريبة المخرجات', v.output], ['ضريبة المدخلات', v.input], ['الصافي', v.net]]
      }
    };
  }

  /* ---------------- تقييم المخزون ---------------- */
  function buildInventory() {
    const items = DB.state.items.filter(function (i) { return !i.service; })
      .sort(function (a, b) { return U.num(b.stock) * U.num(b.cost) - U.num(a.stock) * U.num(a.cost); });
    const tv = Accounting.stockValue();
    let html = '<div class="grid grid-3" style="padding:16px 26px">' +
      h.stat({ label: 'قيمة المخزون بالتكلفة', value: tv.cost, icon: 'box', color: 'violet' }) +
      h.stat({ label: 'قيمة المخزون بسعر البيع', value: tv.retail, icon: 'trend', color: 'green' }) +
      h.stat({ label: 'هامش الربح المتوقع', value: tv.margin, icon: 'coins', color: 'blue' }) +
    '</div>';
    html += '<div class="table-wrap"><table class="data"><thead><tr><th>الكود</th><th>الصنف</th><th class="num">الرصيد</th><th class="num">التكلفة</th><th class="num">القيمة</th><th class="num">سعر البيع</th><th class="num">قيمة البيع</th></tr></thead><tbody>';
    if (!items.length) html += h.emptyRow(7, 'لا توجد أصناف', 'box');
    items.forEach(function (i) {
      html += '<tr><td class="mono small">' + U.esc(i.code) + '</td><td>' + U.esc(i.name) + '</td>' +
        '<td class="num">' + U.qty(i.stock) + '</td><td class="num">' + U.money(i.cost) + '</td>' +
        '<td class="num strong">' + U.money(U.num(i.stock) * U.num(i.cost)) + '</td>' +
        '<td class="num">' + U.money(i.price) + '</td><td class="num">' + U.money(U.num(i.stock) * U.num(i.price)) + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td colspan="4">الإجمالي</td><td class="num">' + U.money(tv.cost) + '</td><td></td><td class="num">' + U.money(tv.retail) + '</td></tr></tfoot></table></div>';

    let pr = '<table><thead><tr><th>الكود</th><th>الصنف</th><th>الرصيد</th><th>التكلفة</th><th>القيمة</th><th>سعر البيع</th><th>قيمة البيع</th></tr></thead><tbody>';
    items.forEach(function (i) {
      pr += '<tr><td>' + U.esc(i.code) + '</td><td>' + U.esc(i.name) + '</td><td class="num">' + U.qty(i.stock) + '</td>' +
        '<td class="num">' + U.money(i.cost) + '</td><td class="num">' + U.money(U.num(i.stock) * U.num(i.cost)) + '</td>' +
        '<td class="num">' + U.money(i.price) + '</td><td class="num">' + U.money(U.num(i.stock) * U.num(i.price)) + '</td></tr>';
    });
    pr += '<tr><th colspan="4">الإجمالي</th><th class="num">' + U.money(tv.cost) + '</th><th></th><th class="num">' + U.money(tv.retail) + '</th></tr></tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'inventory.csv',
        headers: ['الكود', 'الصنف', 'الرصيد', 'التكلفة', 'القيمة', 'سعر البيع'],
        rows: items.map(function (i) { return [i.code, i.name, i.stock, i.cost, U.round2(U.num(i.stock) * U.num(i.cost)), i.price]; })
      }
    };
  }

  /* ---------------- دفتر اليومية ---------------- */
  function buildJournalBook(from, to) {
    const list = Accounting.journals().filter(function (je) {
      return (!from || je.date >= from) && (!to || je.date <= to);
    });
    let html = '<div class="table-wrap"><table class="data"><thead><tr><th>القيد</th><th>التاريخ</th><th>البيان</th><th>الحساب</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>';
    let pr = '<table><thead><tr><th>القيد</th><th>التاريخ</th><th>البيان</th><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>';
    if (!list.length) html += h.emptyRow(6, 'لا توجد قيود في الفترة', 'book');
    let dr = 0, cr = 0;
    list.forEach(function (je) {
      je.lines.forEach(function (l, i) {
        const acc = Accounting.account(l.accountId);
        dr += U.num(l.debit); cr += U.num(l.credit);
        html += '<tr>' +
          (i === 0 ? '<td class="mono strong" rowspan="' + je.lines.length + '">' + U.esc(je.no) + '<div class="muted small">' + U.esc(je.ref || '') + '</div></td>' +
            '<td class="nowrap" rowspan="' + je.lines.length + '">' + U.fmtDate(je.date) + '</td>' +
            '<td rowspan="' + je.lines.length + '">' + U.esc(je.description) + '</td>' : '') +
          '<td class="small">' + U.esc(acc ? acc.code + ' — ' + acc.name : '—') + '</td>' +
          '<td class="num">' + (l.debit ? U.money(l.debit) : '') + '</td>' +
          '<td class="num">' + (l.credit ? U.money(l.credit) : '') + '</td></tr>';
        pr += '<tr>' + (i === 0 ? '<td rowspan="' + je.lines.length + '">' + U.esc(je.no) + '</td><td rowspan="' + je.lines.length + '">' + U.fmtDate(je.date) + '</td><td rowspan="' + je.lines.length + '">' + U.esc(je.description) + '</td>' : '') +
          '<td>' + U.esc(acc ? acc.code + ' — ' + acc.name : '') + '</td>' +
          '<td class="num">' + (l.debit ? U.money(l.debit) : '') + '</td>' +
          '<td class="num">' + (l.credit ? U.money(l.credit) : '') + '</td></tr>';
      });
    });
    html += '</tbody><tfoot><tr><td colspan="4">الإجمالي</td><td class="num">' + U.money(dr) + '</td><td class="num">' + U.money(cr) + '</td></tr></tfoot></table></div>';
    pr += '<tr><th colspan="4">الإجمالي</th><th class="num">' + U.money(dr) + '</th><th class="num">' + U.money(cr) + '</th></tr></tbody></table>';

    return {
      html: html, print: pr,
      csv: {
        filename: 'journal-book.csv',
        headers: ['القيد', 'التاريخ', 'البيان', 'الحساب', 'مدين', 'دائن'],
        rows: list.reduce(function (a, je) {
          return a.concat(je.lines.map(function (l) {
            const acc = Accounting.account(l.accountId);
            return [je.no, je.date, je.description, acc ? acc.code + ' ' + acc.name : '', l.debit, l.credit];
          }));
        }, [])
      }
    };
  }

  /* ============================================================
     صفحة التقارير
     ============================================================ */
  App.views.reports = function (params) {
    const type = (params && params.type) || 'income';
    const from = (params && params.from) || U.startOfYear();
    const to = (params && params.to) || U.today();
    const meta = REPORTS.filter(function (r) { return r.id === type; })[0] || REPORTS[0];
    const ledgerAcc = (params && params.account) || '';

    let built;
    if (type === 'income') built = buildIncome(from, to);
    else if (type === 'balance') built = buildBalance(to);
    else if (type === 'trial') built = buildTrial(from, to);
    else if (type === 'ledger') built = buildLedger(ledgerAcc, from, to);
    else if (type === 'aging') built = buildAging();
    else if (type === 'vat') built = buildVat(from, to);
    else if (type === 'inventory') built = buildInventory();
    else built = buildJournalBook(from, to);

    const periodLabel = type === 'balance' ? 'كما في ' + U.fmtDate(to) : 'من ' + U.fmtDate(from) + ' إلى ' + U.fmtDate(to);
    const showPeriod = type !== 'inventory';

    return {
      title: 'التقارير المالية',
      sub: meta.label + ' — ' + periodLabel,
      html:
        '<div class="toolbar">' +
          '<select id="rp-type" style="width:auto">' +
            REPORTS.map(function (r) { return '<option value="' + r.id + '"' + (r.id === type ? ' selected' : '') + '>' + r.label + '</option>'; }).join('') +
          '</select>' +
          (showPeriod
            ? '<input type="date" id="rp-from" value="' + from + '" style="width:auto"' + (type === 'balance' ? ' hidden' : '') + '>' +
              '<span class="muted"' + (type === 'balance' ? ' hidden' : '') + '>إلى</span>' +
              '<input type="date" id="rp-to" value="' + to + '" style="width:auto">'
            : '') +
          (type === 'ledger'
            ? '<select id="rp-acc" style="width:auto;max-width:260px">' + Accounting.accountOptions(built.account ? built.account.id : '', function (a) { return !a.isGroup; }) + '</select>'
            : '') +
          '<button class="btn" id="rp-apply">عرض</button>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-sm" id="rp-csv">' + U.icon('download') + ' CSV</button>' +
          '<button class="btn btn-primary" id="rp-print">' + U.icon('print') + ' طباعة</button>' +
        '</div>' +

        '<div class="report-shell">' +
          '<div class="report-head">' +
            (DB.state.settings.company ? '<div class="company">' + U.esc(DB.state.settings.company) + '</div>' : '') +
            '<div class="title">' + meta.label + '</div>' +
            '<div class="meta">' + periodLabel + ' — العملة: ' + U.esc(DB.state.settings.currency) + '</div>' +
          '</div>' +
          '<div class="report-body">' + built.html + '</div>' +
        '</div>',

      mount: function (root) {
        function go() {
          const q = ['type=' + root.querySelector('#rp-type').value];
          const f = root.querySelector('#rp-from');
          const t = root.querySelector('#rp-to');
          if (f) q.push('from=' + f.value);
          if (t) q.push('to=' + t.value);
          const accSel = root.querySelector('#rp-acc');
          if (accSel) q.push('account=' + encodeURIComponent(accSel.value));
          location.hash = '#/reports?' + q.join('&');
        }
        root.querySelector('#rp-type').addEventListener('change', go);
        root.querySelector('#rp-apply').addEventListener('click', go);
        const accSel = root.querySelector('#rp-acc');
        if (accSel) accSel.addEventListener('change', go);
        const fromEl = root.querySelector('#rp-from');
        if (fromEl) fromEl.addEventListener('change', go);
        const toEl = root.querySelector('#rp-to');
        if (toEl) toEl.addEventListener('change', go);

        root.querySelector('#rp-csv').addEventListener('click', function () {
          h.csv(built.csv.filename, built.csv.headers, built.csv.rows);
        });

        root.querySelector('#rp-print').addEventListener('click', function () {
          h.printDoc(meta.label, periodLabel, built.print);
        });
      }
    };
  };

  /* ============================================================
     الإعدادات
     ============================================================ */
  App.views.settings = function () {
    const s = DB.state.settings;
    const leaves = Accounting.leaves();

    function accSelect(name, value) {
      return '<select name="' + name + '">' + leaves.map(function (a) {
        return '<option value="' + a.id + '"' + (a.id === value ? ' selected' : '') + '>' + U.esc(a.code + ' — ' + a.name) + '</option>';
      }).join('') + '</select>';
    }

    return {
      title: 'الإعدادات',
      sub: 'بيانات الشركة والضريبة والنسخ الاحتياطي',
      html:
        '<form id="settings-form">' +
          '<div class="grid grid-2" style="align-items:start">' +

            '<div class="card">' +
              '<div class="card-head"><h3>بيانات الشركة</h3></div>' +
              '<div class="card-body"><div class="form-grid">' +
                '<div class="field full"><label>اسم الشركة</label><input name="company" value="' + U.esc(s.company) + '" required></div>' +
                '<div class="field"><label>الرقم الضريبي</label><input name="taxNumber" value="' + U.esc(s.taxNumber) + '"></div>' +
                '<div class="field"><label>رقم الجوال</label><input name="phone" value="' + U.esc(s.phone) + '"></div>' +
                '<div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" value="' + U.esc(s.email) + '"></div>' +
                '<div class="field"><label>العملة</label><input name="currency" value="' + U.esc(s.currency) + '"></div>' +
                '<div class="field full"><label>العنوان</label><input name="address" value="' + U.esc(s.address) + '"></div>' +
                '<div class="field full"><label>ملاحظة أسفل الفاتورة</label><textarea name="invoiceNote">' + U.esc(s.invoiceNote) + '</textarea></div>' +
              '</div></div>' +
            '</div>' +

            '<div class="card">' +
              '<div class="card-head"><h3>الضريبة</h3></div>' +
              '<div class="card-body"><div class="form-grid">' +
                '<div class="field"><label>مسمى الضريبة</label><input name="taxName" value="' + U.esc(s.taxName) + '"></div>' +
                '<div class="field"><label>النسبة الافتراضية %</label><input type="number" step="0.01" min="0" name="taxRate" value="' + U.num(s.taxRate) + '"></div>' +
              '</div>' +
              '<div class="divider"></div>' +
              '<h4 style="font-size:13.5px;margin-bottom:10px">ترقيم المستندات</h4>' +
              '<div class="form-grid cols-3">' +
                '<div class="field"><label>القيود</label><input name="prefix-journal" value="' + U.esc(s.prefixes.journal) + '"></div>' +
                '<div class="field"><label>فواتير البيع</label><input name="prefix-invoice" value="' + U.esc(s.prefixes.invoice) + '"></div>' +
                '<div class="field"><label>فواتير الشراء</label><input name="prefix-bill" value="' + U.esc(s.prefixes.bill) + '"></div>' +
                '<div class="field"><label>سندات القبض</label><input name="prefix-receipt" value="' + U.esc(s.prefixes.receipt) + '"></div>' +
                '<div class="field"><label>سندات الصرف</label><input name="prefix-payment" value="' + U.esc(s.prefixes.payment) + '"></div>' +
                '<div class="field"><label>المصروفات</label><input name="prefix-expense" value="' + U.esc(s.prefixes.expense) + '"></div>' +
              '</div>' +
              '</div>' +
            '</div>' +

            '<div class="card span-2">' +
              '<div class="card-head"><h3>ربط الحسابات الافتراضية</h3><span class="sub">تُستخدم عند إنشاء القيود تلقائياً</span></div>' +
              '<div class="card-body"><div class="form-grid cols-4">' +
                '<div class="field"><label>الصندوق</label>' + accSelect('acc-cash', s.accounts.cash) + '</div>' +
                '<div class="field"><label>البنك</label>' + accSelect('acc-bank', s.accounts.bank) + '</div>' +
                '<div class="field"><label>العملاء</label>' + accSelect('acc-ar', s.accounts.ar) + '</div>' +
                '<div class="field"><label>الموردون</label>' + accSelect('acc-ap', s.accounts.ap) + '</div>' +
                '<div class="field"><label>المخزون</label>' + accSelect('acc-inventory', s.accounts.inventory) + '</div>' +
                '<div class="field"><label>الضريبة</label>' + accSelect('acc-vat', s.accounts.vat) + '</div>' +
                '<div class="field"><label>إيرادات المبيعات</label>' + accSelect('acc-sales', s.accounts.sales) + '</div>' +
                '<div class="field"><label>تكلفة المبيعات</label>' + accSelect('acc-cogs', s.accounts.cogs) + '</div>' +
              '</div></div>' +
            '</div>' +
          '</div>' +

          '<div class="toolbar mt-16" style="justify-content:flex-end">' +
            '<button class="btn btn-primary" type="submit">' + U.icon('check') + ' حفظ الإعدادات</button>' +
          '</div>' +
        '</form>' +

        '<div class="grid grid-2 mt-24" style="align-items:start">' +
          '<div class="card">' +
            '<div class="card-head"><h3>النسخ الاحتياطي والاستعادة</h3></div>' +
            '<div class="card-body">' +
              '<p class="muted small mb-16">تُحفظ البيانات في متصفحك على هذا الجهاز. ننصح بتصدير نسخة احتياطية بشكل دوري.</p>' +
              '<div class="flex gap-8" style="flex-wrap:wrap">' +
                '<button class="btn" data-act="export">' + U.icon('download') + ' تصدير نسخة احتياطية</button>' +
                '<button class="btn" data-act="import">' + U.icon('upload') + ' استعادة من ملف</button>' +
                '<input type="file" id="import-file" accept="application/json,.json" hidden>' +
              '</div>' +
              '<div class="divider"></div>' +
              '<div class="flex gap-8" style="flex-wrap:wrap">' +
                '<button class="btn" data-act="reset-demo">إعادة ضبط + بيانات تجريبية</button>' +
                '<button class="btn btn-danger" data-act="reset-empty">مسح كل البيانات</button>' +
              '</div>' +
              '<p class="muted small mt-16">آخر تحديث: ' + (DB.state.meta.updatedAt ? U.fmtDate(DB.state.meta.updatedAt.slice(0, 10)) + ' ' + DB.state.meta.updatedAt.slice(11, 16) : '—') + '</p>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><h3>النظام</h3></div>' +
            '<div class="card-body">' +
              '<div class="kpi-inline" style="gap:22px">' +
                '<div class="k"><span>الحسابات</span><strong>' + DB.state.accounts.length + '</strong></div>' +
                '<div class="k"><span>القيود</span><strong>' + DB.state.journals.length + '</strong></div>' +
                '<div class="k"><span>الفواتير</span><strong>' + DB.state.invoices.length + '</strong></div>' +
                '<div class="k"><span>الأصناف</span><strong>' + DB.state.items.length + '</strong></div>' +
              '</div>' +
              '<div class="divider"></div>' +
              '<div class="flex items-center gap-12">' +
                '<div><div class="strong" style="font-size:13.5px">الوضع الليلي</div><div class="muted small">تبديل مظهر الواجهة</div></div>' +
                '<button class="btn btn-sm" data-act="theme" style="margin-inline-start:auto">' +
                  (document.documentElement.dataset.theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي') + '</button>' +
              '</div>' +
              '<div class="divider"></div>' +
              '<p class="muted small">المحاسب — نظام محاسبة متكامل يعمل محلياً بدون إنترنت. الإصدار 1.0</p>' +
            '</div>' +
          '</div>' +
        '</div>',

      mount: function (root) {
        root.querySelector('#settings-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const f = e.target;
          s.company = f.company.value.trim();
          s.taxNumber = f.taxNumber.value.trim();
          s.phone = f.phone.value.trim();
          s.email = f.email.value.trim();
          s.currency = f.currency.value.trim() || 'ر.س';
          s.address = f.address.value.trim();
          s.invoiceNote = f.invoiceNote.value.trim();
          s.taxName = f.taxName.value.trim() || 'ضريبة القيمة المضافة';
          s.taxRate = U.num(f.taxRate.value);
          s.prefixes.journal = f['prefix-journal'].value.trim() || 'JV-';
          s.prefixes.invoice = f['prefix-invoice'].value.trim() || 'INV-';
          s.prefixes.bill = f['prefix-bill'].value.trim() || 'BILL-';
          s.prefixes.receipt = f['prefix-receipt'].value.trim() || 'REC-';
          s.prefixes.payment = f['prefix-payment'].value.trim() || 'PAY-';
          s.prefixes.expense = f['prefix-expense'].value.trim() || 'EXP-';
          ['cash', 'bank', 'ar', 'ap', 'inventory', 'vat', 'sales', 'cogs'].forEach(function (k) {
            s.accounts[k] = f['acc-' + k].value;
          });
          DB.save();
          U.toast('تم حفظ الإعدادات');
          App.render();
        });

        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const act = btn.getAttribute('data-act');
          if (act === 'theme') {
            App.toggleTheme();
            return;
          }
          if (act === 'export') {
            U.download('mohasib-backup-' + U.today() + '.json', DB.exportJSON());
            U.toast('تم تصدير النسخة الاحتياطية');
            return;
          }
          if (act === 'import') {
            root.querySelector('#import-file').click();
            return;
          }
          if (act === 'reset-demo') {
            U.confirm({
              title: 'إعادة الضبط',
              message: 'سيتم استبدال كل البيانات الحالية ببيانات تجريبية جديدة. هل أنت متأكد؟',
              danger: true, okText: 'إعادة الضبط'
            }).then(function (ok) {
              if (!ok) return;
              DB.reset(true);
              Accounting.bootstrapDemo();
              U.toast('تمت إعادة الضبط');
              location.hash = '#/dashboard';
              App.render();
            });
            return;
          }
          if (act === 'reset-empty') {
            U.confirm({
              title: 'مسح كل البيانات',
              message: 'سيتم حذف جميع الفواتير والقيود والأطراف والأصناف وبيانات الشركة والإعدادات نهائياً، مع الإبقاء على دليل الحسابات فقط. هل تريد المتابعة؟',
              danger: true, okText: 'مسح الكل'
            }).then(function (ok) {
              if (!ok) return;
              DB.reset(false);
              U.toast('تم مسح البيانات');
              location.hash = '#/dashboard';
              App.render();
            });
            return;
          }
        });

        root.querySelector('#import-file').addEventListener('change', function (e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          U.readFile(file).then(function (txt) {
            U.confirm({
              title: 'استعادة نسخة احتياطية',
              message: 'سيتم استبدال البيانات الحالية بالبيانات الموجودة في الملف. هل تريد المتابعة؟',
              danger: true, okText: 'استعادة'
            }).then(function (ok) {
              if (!ok) return;
              try {
                DB.importJSON(txt);
                Accounting.bootstrapDemo();
                U.toast('تمت استعادة البيانات');
                location.hash = '#/dashboard';
                App.render();
              } catch (err) {
                U.toast('فشل الاستعادة: ' + err.message, 'error', 4500);
              }
            });
          });
          e.target.value = '';
        });
      }
    };
  };
})(window);
