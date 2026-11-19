/* ============================================================
   المحاسب — الواجهات الأساسية: لوحة التحكم، الحسابات، القيود
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.App;
  const h = (App.h = App.h || {});

  /* ---------------- مكوّنات مشتركة ---------------- */
  h.stat = function (o) {
    const neg = U.num(o.value) < 0;
    return '<div class="card stat">' +
      '<div class="stat-icon ' + (o.color || '') + '">' + U.icon(o.icon || 'coins') + '</div>' +
      '<div class="stat-body">' +
        '<div class="stat-label">' + U.esc(o.label) + '</div>' +
        '<div class="stat-value ' + (neg ? 'text-red' : '') + '">' + U.money(o.value) +
          ' <span class="cur">' + U.esc(U.cur()) + '</span></div>' +
        (o.foot ? '<div class="stat-foot">' + o.foot + '</div>' : '') +
      '</div>' +
    '</div>';
  };

  h.sourceBadge = function (src) {
    if (!src) return U.badge('يدوي', 'gray');
    if (src.type === 'invoice') return U.badge('فاتورة', 'blue');
    if (src.type === 'receipt') return U.badge('سند قبض', 'green');
    if (src.type === 'payment') return U.badge('سند صرف', 'amber');
    if (src.type === 'expense') return U.badge('مصروف', 'amber');
    return U.badge('تلقائي', 'gray');
  };

  h.emptyRow = function (cols, msg, icon) {
    return '<tr><td colspan="' + cols + '">' + U.empty('لا توجد بيانات', msg || '', icon || 'file') + '</td></tr>';
  };

  h.csv = function (filename, headers, rows) {
    const esc = function (v) {
      const s = String(v === null || v === undefined ? '' : v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.map(esc).join(',')].concat(rows.map(function (r) { return r.map(esc).join(','); }));
    U.download(filename, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  };

  h.printDoc = function (title, meta, bodyHtml) {
    U.printHTML(
      U.printHeader(title, meta) + bodyHtml + U.printFooter(),
      title
    );
  };

  h.accountName = function (id) {
    const a = Accounting.account(id);
    return a ? (a.code + ' — ' + a.name) : '—';
  };

  /* ============================================================
     لوحة التحكم
     ============================================================ */
  App.views.dashboard = function () {
    const s = Accounting.stats();
    const company = DB.state.settings.company;
    const months = Accounting.monthlySeries(6);
    const breakdown = Accounting.expenseBreakdown(U.startOfYear(), U.today());
    const recentInvoices = Accounting.invoiceList().slice(0, 6);
    const low = s.lowStock.slice(0, 6);
    const margin = s.revenue ? (s.netProfit / s.revenue * 100) : 0;
    const openAr = DB.state.invoices.filter(function (i) {
      return i.type === 'sale' && i.status === 'posted' && Accounting.outstanding(i) > 0.004;
    }).length;
    const openAp = DB.state.invoices.filter(function (i) {
      return i.type === 'purchase' && i.status === 'posted' && Accounting.outstanding(i) > 0.004;
    }).length;

    const invoiceRows = recentInvoices.map(function (inv) {
      const c = Accounting.contact(inv.contactId);
      const t = Accounting.invoiceTotals(inv);
      return '<tr class="pointer" data-invoice="' + inv.id + '">' +
        '<td class="mono">' + U.esc(inv.no) + '</td>' +
        '<td class="nowrap">' + U.fmtDate(inv.date) + '</td>' +
        '<td>' + U.esc(c ? c.name : '—') + '</td>' +
        '<td>' + (inv.type === 'sale' ? U.badge('بيع', 'green') : U.badge('شراء', 'amber')) + '</td>' +
        '<td class="num strong">' + U.money(t.total) + '</td>' +
        '<td>' + U.payBadge(inv) + '</td>' +
      '</tr>';
    }).join('');

    const lowHtml = low.length ? low.map(function (i) {
      return '<div class="report-row">' +
        '<span class="lbl">' + U.esc(i.name) + '<span class="muted small"> — ' + U.esc(i.unit) + '</span></span>' +
        '<span class="badge ' + (U.num(i.stock) <= 0 ? 'red' : 'amber') + '">' +
          (U.num(i.stock) <= 0 ? 'نفد المخزون' : 'الرصيد ' + U.qty(i.stock)) + '</span>' +
      '</div>';
    }).join('') : U.empty('المخزون بحالة جيدة', 'لا توجد أصناف وصلت حد إعادة الطلب', 'box');

    return {
      title: 'لوحة التحكم',
      sub: company ? 'نظرة عامة على أداء ' + company : 'نظرة عامة على الأداء المالي',
      html:
        '<div class="toolbar">' +
          '<a class="btn btn-primary" href="#/invoice/new?type=sale">' + U.icon('plus') + ' فاتورة بيع</a>' +
          '<a class="btn" href="#/invoice/new?type=purchase">' + U.icon('plus') + ' فاتورة شراء</a>' +
          '<a class="btn" href="#/journal/new">' + U.icon('plus') + ' قيد يومية</a>' +
          '<a class="btn" href="#/payment/new?type=receipt">' + U.icon('receipt') + ' سند قبض</a>' +
          '<div class="spacer"></div>' +
          '<span class="muted small">السنة المالية ' + U.parseDate(U.today()).getFullYear() + '</span>' +
        '</div>' +

        '<div class="grid grid-4">' +
          h.stat({ label: 'النقدية والبنك', value: s.cash, icon: 'wallet', color: 'green', foot: 'السيولة المتاحة حالياً' }) +
          h.stat({ label: 'ذمم العملاء', value: s.ar, icon: 'users', color: 'blue', foot: openAr + ' فاتورة غير محصّلة' }) +
          h.stat({ label: 'ذمم الموردين', value: s.ap, icon: 'truck', color: 'red', foot: openAp + ' فاتورة غير مسددة' }) +
          h.stat({ label: 'قيمة المخزون (تكلفة)', value: s.stock.cost, icon: 'box', color: 'violet', foot: DB.state.items.length + ' صنف مسجّل' }) +
        '</div>' +

        '<div class="grid grid-4 mt-16">' +
          h.stat({ label: 'إيرادات السنة', value: s.revenue, icon: 'trend', color: 'green', foot: 'صافي الربح ' + U.money(s.netProfit) + ' ' + U.esc(U.cur()) }) +
          h.stat({ label: 'مصروفات السنة', value: s.expenses, icon: 'expense', color: 'amber', foot: 'تشمل تكلفة المبيعات' }) +
          h.stat({ label: 'صافي الربح', value: s.netProfit, icon: 'coins', color: s.netProfit >= 0 ? 'green' : 'red', foot: 'هامش ' + U.percent(margin) }) +
          h.stat({ label: 'مبيعات السنة', value: s.salesTotal, icon: 'file', color: 'cyan', foot: s.salesCount + ' فاتورة بيع مرحّلة' }) +
        '</div>' +

        '<div class="grid grid-3 mt-16" style="grid-template-columns:2fr 1fr">' +
          '<div class="card span-2">' +
            '<div class="card-head"><h3>الإيرادات والمصروفات</h3><span class="sub">آخر 6 أشهر</span></div>' +
            '<div class="card-body"><div id="chart-months"></div></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><h3>توزيع المصروفات</h3><span class="sub">السنة الحالية</span></div>' +
            '<div class="card-body"><div id="chart-expenses"></div></div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-3 mt-16" style="grid-template-columns:2fr 1fr">' +
          '<div class="card span-2">' +
            '<div class="card-head"><h3>أحدث الفواتير</h3><div class="actions"><a class="link-btn" href="#/invoices">عرض الكل</a></div></div>' +
            '<div class="table-wrap"><table class="data">' +
              '<thead><tr><th>الرقم</th><th>التاريخ</th><th>الطرف</th><th>النوع</th><th class="num">الإجمالي</th><th>الحالة</th></tr></thead>' +
              '<tbody>' + (invoiceRows || h.emptyRow(6, 'لم تصدر أي فواتير بعد', 'file')) + '</tbody>' +
            '</table></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><h3>تنبيهات المخزون</h3><div class="actions"><a class="link-btn" href="#/items">المخزون</a></div></div>' +
            '<div class="card-body" style="padding:6px 16px">' + lowHtml + '</div>' +
          '</div>' +
        '</div>',

      mount: function (root) {
        Charts.bars(root.querySelector('#chart-months'), {
          labels: months.map(function (m) { return m.label; }),
          series: [
            { name: 'الإيرادات', color: '#059669', data: months.map(function (m) { return m.revenue; }) },
            { name: 'المصروفات', color: '#dc2626', data: months.map(function (m) { return m.expense; }) }
          ]
        });
        Charts.donut(root.querySelector('#chart-expenses'),
          breakdown.slice(0, 7).map(function (d, i) { return { label: d.label, value: d.value, color: U.colorFor(i) }; }),
          { centerLabel: 'المصروفات' });

        root.addEventListener('click', function (e) {
          const tr = e.target.closest('[data-invoice]');
          if (tr) location.hash = '#/invoice/view?id=' + tr.getAttribute('data-invoice');
        });
      }
    };
  };

  /* ============================================================
     دليل الحسابات
     ============================================================ */
  App.views.accounts = function () {
    const collapsed = {};

    function balanceOf(a) {
      if (!a.isGroup) return Accounting.balance(a.id);
      let total = 0;
      (function walk(node) {
        (node.children || []).forEach(function (ch) {
          if (ch.isGroup) walk(ch); else total += Accounting.balance(ch.id);
        });
      })(a);
      return U.round2(total);
    }

    function rowHtml(node, depth, flatSearch) {
      const kids = node.children || [];
      const hasKids = kids.length > 0;
      const isCollapsed = collapsed[node.id];
      const bal = balanceOf(node);
      const toggle = hasKids
        ? '<button class="tree-toggle ' + (isCollapsed ? 'collapsed' : '') + '" data-act="toggle" data-id="' + node.id + '" aria-label="طي/توسيع">' + U.icon('chevron') + '</button>'
        : '<span class="tree-toggle"></span>';
      const badge = node.isGroup
        ? U.badge('مجموعة', 'gray')
        : U.badge(Accounting.typeLabel(node.type), Accounting.typeColor(node.type));
      let html = '<div class="tree-row" data-id="' + node.id + '">' +
        (flatSearch ? '' : '<span class="indent" style="width:' + (depth * 20) + 'px"></span>') +
        toggle +
        '<span class="code">' + U.esc(node.code) + '</span>' +
        '<span class="name ' + (node.isGroup ? 'group' : '') + '">' + U.esc(node.name) + '</span>' +
        badge +
        '<span class="meta">' +
          '<span class="num strong ' + (bal < 0 ? 'text-red' : '') + '">' + U.money(bal) + '</span>' +
          '<span class="muted small">' + U.esc(U.cur()) + '</span>' +
          '<span class="row-actions">' +
            (node.isGroup ? '<button class="icon-btn sm plain" title="إضافة حساب فرعي" data-act="add" data-id="' + node.id + '">' + U.icon('plus') + '</button>' : '') +
            '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + node.id + '">' + U.icon('edit') + '</button>' +
            '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + node.id + '">' + U.icon('trash') + '</button>' +
          '</span>' +
        '</span>' +
      '</div>';
      if (hasKids && !isCollapsed && !flatSearch) {
        html += kids.map(function (k) { return rowHtml(k, depth + 1, false); }).join('');
      }
      return html;
    }

    function renderTree(root, query) {
      const box = root.querySelector('#tree');
      const tree = Accounting.tree();
      const q = (query || '').trim();
      if (q) {
        const all = Accounting.flat();
        const matches = all.filter(function (r) {
          return (r.acc.name + ' ' + r.acc.code).toLowerCase().indexOf(q.toLowerCase()) > -1;
        });
        box.innerHTML = matches.length
          ? matches.map(function (r) { return rowHtml(r.acc, 0, true); }).join('')
          : U.empty('لا توجد نتائج', 'جرّب البحث بالاسم أو رقم الحساب', 'search');
        return;
      }
      box.innerHTML = tree.map(function (n) { return rowHtml(n, 0, false); }).join('');
    }

    function openForm(existing, parentId) {
      const isEdit = !!existing;
      const acc = existing || { code: '', name: '', type: parentId ? (Accounting.account(parentId) || {}).type : 'asset', parent: parentId || '', isGroup: false };
      const groups = Accounting.flat().filter(function (r) { return r.acc.isGroup && r.acc.id !== (existing ? existing.id : ''); });
      const parentOptions = '<option value="">— بدون أب (حساب رئيسي) —</option>' +
        groups.map(function (r) {
          return '<option value="' + r.acc.id + '"' + (acc.parent === r.acc.id ? ' selected' : '') + '>' +
            new Array(r.depth + 1).join('— ') + U.esc(r.acc.code + ' ' + r.acc.name) + '</option>';
        }).join('');

      const m = U.modal({
        title: isEdit ? 'تعديل حساب' : 'إضافة حساب جديد',
        sub: isEdit ? acc.code + ' — ' + acc.name : 'أدخل بيانات الحساب المحاسبي',
        body:
          '<form id="acc-form" class="form-grid">' +
            '<div class="field"><label>رقم الحساب *</label><input name="code" value="' + U.esc(acc.code) + '" placeholder="مثال: 1110" required></div>' +
            '<div class="field"><label>اسم الحساب *</label><input name="name" value="' + U.esc(acc.name) + '" placeholder="مثال: الصندوق الفرعي" required></div>' +
            '<div class="field"><label>نوع الحساب *</label><select name="type">' +
              ['asset', 'liability', 'equity', 'revenue', 'expense'].map(function (t) {
                return '<option value="' + t + '"' + (acc.type === t ? ' selected' : '') + '>' + Accounting.typeLabel(t) + '</option>';
              }).join('') +
            '</select></div>' +
            '<div class="field"><label>الحساب الأب</label><select name="parent">' + parentOptions + '</select></div>' +
            '<div class="field full"><label class="flex items-center gap-8" style="font-weight:600;color:var(--text)">' +
              '<input type="checkbox" name="isGroup" style="width:auto"' + (acc.isGroup ? ' checked' : '') + '> حساب مجموعة (لا يُرحّل إليه مباشرة)</label></div>' +
          '</form>',
        footer:
          '<div class="spacer"></div>' +
          '<button class="btn" type="button" data-close>إلغاء</button>' +
          '<button class="btn btn-primary" type="submit" form="acc-form">حفظ</button>',
        onMount: function (el, close) {
          el.querySelector('#acc-form').addEventListener('submit', function (e) {
            e.preventDefault();
            const f = e.target;
            const code = f.code.value.trim();
            const name = f.name.value.trim();
            if (!code || !name) { U.toast('يرجى إكمال الحقول المطلوبة', 'error'); return; }
            const dup = DB.state.accounts.filter(function (a) { return a.code === code && a.id !== (existing ? existing.id : ''); });
            if (dup.length) { U.toast('رقم الحساب مستخدم بالفعل', 'error'); return; }
            if (existing) {
              existing.code = code;
              existing.name = name;
              existing.type = f.type.value;
              existing.parent = f.parent.value || null;
              existing.isGroup = f.isGroup.checked;
            } else {
              DB.state.accounts.push({
                id: U.uid('acc'), code: code, name: name,
                type: f.type.value, parent: f.parent.value || null,
                isGroup: f.isGroup.checked
              });
            }
            DB.save();
            close();
            U.toast('تم حفظ الحساب');
            App.render();
          });
        }
      });
      void m;
    }

    return {
      title: 'دليل الحسابات',
      sub: 'شجرة الحسابات المحاسبية والأرصدة الحالية',
      html:
        '<div class="toolbar">' +
          '<div class="search-box">' + U.icon('search') + '<input type="search" id="acc-search" placeholder="بحث في الحسابات..."></div>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-sm" data-act="collapse">طي الكل</button>' +
          '<button class="btn btn-primary" data-act="add-root">' + U.icon('plus') + ' حساب جديد</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h3>شجرة الحسابات</h3><span class="sub">' + DB.state.accounts.length + ' حساب — اضغط على السهم لطي المجموعات</span></div>' +
          '<div id="tree"></div>' +
        '</div>',

      mount: function (root) {
        const search = root.querySelector('#acc-search');
        renderTree(root, '');
        search.addEventListener('input', U.debounce(function () { renderTree(root, search.value); }, 150));

        root.addEventListener('click', function (e) {
          const act = e.target.closest('[data-act]');
          const addBtn = e.target.closest('[data-act="add-root"]');
          if (addBtn) { openForm(null, null); return; }
          if (e.target.closest('[data-act="collapse"]')) {
            const all = Accounting.flat();
            const anyOpen = all.some(function (r) { return r.acc.isGroup && !collapsed[r.acc.id]; });
            all.forEach(function (r) { collapsed[r.acc.id] = anyOpen; });
            renderTree(root, search.value);
            return;
          }
          if (!act) return;
          const id = act.getAttribute('data-id');
          const action = act.getAttribute('data-act');
          if (action === 'toggle') {
            collapsed[id] = !collapsed[id];
            renderTree(root, search.value);
          } else if (action === 'add') {
            openForm(null, id);
          } else if (action === 'edit') {
            openForm(Accounting.account(id), null);
          } else if (action === 'del') {
            const acc = Accounting.account(id);
            if (!acc) return;
            const kids = DB.state.accounts.filter(function (a) { return a.parent === id; });
            if (kids.length) { U.toast('لا يمكن حذف حساب يحتوي على حسابات فرعية', 'error'); return; }
            const used = DB.state.journals.some(function (j) {
              return j.lines.some(function (l) { return l.accountId === id; });
            });
            if (used) { U.toast('لا يمكن حذف حساب مستخدم في قيود', 'error'); return; }
            U.confirm({
              title: 'حذف الحساب',
              message: 'هل تريد حذف الحساب «' + acc.code + ' ' + acc.name + '»؟',
              danger: true, okText: 'حذف'
            }).then(function (ok) {
              if (!ok) return;
              DB.state.accounts = DB.state.accounts.filter(function (a) { return a.id !== id; });
              DB.save();
              U.toast('تم حذف الحساب');
              App.render();
            });
          }
        });
      }
    };
  };

  /* ============================================================
     القيود اليومية — القائمة
     ============================================================ */
  App.views.journal = function () {
    return {
      title: 'القيود اليومية',
      sub: 'سجل القيود المحاسبية المزدوجة',
      html:
        '<div class="toolbar">' +
          '<div class="search-box">' + U.icon('search') + '<input type="search" id="je-search" placeholder="بحث بالبيان أو الرقم..."></div>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-sm" data-act="export">' + U.icon('download') + ' تصدير CSV</button>' +
          '<a class="btn btn-primary" href="#/journal/new">' + U.icon('plus') + ' قيد جديد</a>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>رقم القيد</th><th>التاريخ</th><th>البيان</th><th>المرجع</th><th class="num">مدين</th><th class="num">دائن</th><th>المصدر</th><th></th></tr></thead>' +
          '<tbody id="je-body"></tbody>' +
        '</table></div></div>',

      mount: function (root) {
        const body = root.querySelector('#je-body');
        const search = root.querySelector('#je-search');

        function totals(je) {
          return {
            dr: U.round2(je.lines.reduce(function (a, l) { return a + U.num(l.debit); }, 0)),
            cr: U.round2(je.lines.reduce(function (a, l) { return a + U.num(l.credit); }, 0))
          };
        }

        function row(je) {
          const t = totals(je);
          return '<tr>' +
            '<td class="mono strong">' + U.esc(je.no) + '</td>' +
            '<td class="nowrap">' + U.fmtDate(je.date) + '</td>' +
            '<td>' + U.esc(je.description) + '</td>' +
            '<td class="muted small">' + U.esc(je.ref || '—') + '</td>' +
            '<td class="num">' + U.money(t.dr) + '</td>' +
            '<td class="num">' + U.money(t.cr) + '</td>' +
            '<td>' + h.sourceBadge(je.source) + '</td>' +
            '<td><div class="row-actions">' +
              '<button class="icon-btn sm plain" title="عرض" data-act="view" data-id="' + je.id + '">' + U.icon('eye') + '</button>' +
              (je.source ? '' : '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + je.id + '">' + U.icon('edit') + '</button>') +
              (je.source ? '' : '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + je.id + '">' + U.icon('trash') + '</button>') +
            '</div></td>' +
          '</tr>';
        }

        function render() {
          const q = (search.value || '').trim().toLowerCase();
          const list = Accounting.journals().slice().reverse().filter(function (je) {
            if (!q) return true;
            return (je.description + ' ' + je.no + ' ' + (je.ref || '')).toLowerCase().indexOf(q) > -1;
          });
          body.innerHTML = list.length ? list.map(row).join('') : h.emptyRow(8, 'لم يتم تسجيل أي قيود بعد', 'book');
        }
        render();
        search.addEventListener('input', U.debounce(render, 150));

        root.addEventListener('click', function (e) {
          if (e.target.closest('[data-act="export"]')) {
            const rows = Accounting.journals().map(function (je) {
              return [je.no, je.date, je.description, je.ref || '', U.money(totals(je).dr), U.money(totals(je).cr)];
            });
            h.csv('journal-entries.csv', ['رقم القيد', 'التاريخ', 'البيان', 'المرجع', 'مدين', 'دائن'], rows);
            return;
          }
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const id = btn.getAttribute('data-id');
          const act = btn.getAttribute('data-act');
          if (act === 'view') return showEntry(id);
          if (act === 'edit') { location.hash = '#/journal/new?id=' + id; return; }
          if (act === 'del') {
            const je = Accounting.journal(id);
            U.confirm({
              title: 'حذف القيد',
              message: 'هل تريد حذف القيد ' + (je ? je.no : '') + '؟',
              danger: true, okText: 'حذف'
            }).then(function (ok) {
              if (!ok) return;
              try {
                Accounting.deleteJournal(id);
                U.toast('تم حذف القيد');
                render();
              } catch (err) { U.toast(err.message, 'error'); }
            });
          }
        });
      }
    };
  };

  function showEntry(id) {
    const je = Accounting.journal(id);
    if (!je) return;
    const t = {
      dr: U.round2(je.lines.reduce(function (a, l) { return a + U.num(l.debit); }, 0)),
      cr: U.round2(je.lines.reduce(function (a, l) { return a + U.num(l.credit); }, 0))
    };
    const rows = je.lines.map(function (l) {
      const acc = Accounting.account(l.accountId);
      return '<tr>' +
        '<td>' + U.esc(acc ? acc.code + ' — ' + acc.name : '—') + (l.note ? '<div class="muted small">' + U.esc(l.note) + '</div>' : '') + '</td>' +
        '<td class="num">' + (U.num(l.debit) ? U.money(l.debit) : '') + '</td>' +
        '<td class="num">' + (U.num(l.credit) ? U.money(l.credit) : '') + '</td>' +
      '</tr>';
    }).join('');

    U.modal({
      title: 'القيد ' + je.no,
      sub: U.fmtDate(je.date) + ' — ' + (je.ref || 'بدون مرجع'),
      size: 'lg',
      body:
        '<div class="kpi-inline mb-16">' +
          '<div class="k"><span>البيان</span><strong style="font-size:14px">' + U.esc(je.description) + '</strong></div>' +
          '<div class="k"><span>المصدر</span><strong style="font-size:14px">' + (je.source ? (je.source.type === 'invoice' ? 'فاتورة' : je.source.type === 'expense' ? 'مصروف' : 'سند') : 'قيد يدوي') + '</strong></div>' +
        '</div>' +
        '<div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الحساب</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '<tfoot><tr><td>الإجمالي</td><td class="num">' + U.money(t.dr) + '</td><td class="num">' + U.money(t.cr) + '</td></tr></tfoot>' +
        '</table></div>',
      footer:
        '<div class="spacer"></div>' +
        '<button class="btn" data-close>إغلاق</button>' +
        '<button class="btn btn-primary" data-print>' + U.icon('print') + ' طباعة</button>',
      onMount: function (el) {
        el.querySelector('[data-print]').addEventListener('click', function () {
          const body = '<table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>' +
            je.lines.map(function (l) {
              const acc = Accounting.account(l.accountId);
              return '<tr><td>' + U.esc(acc ? acc.code + ' — ' + acc.name : '') + '</td>' +
                '<td class="num">' + (U.num(l.debit) ? U.money(l.debit) : '') + '</td>' +
                '<td class="num">' + (U.num(l.credit) ? U.money(l.credit) : '') + '</td></tr>';
            }).join('') +
            '</tbody><tfoot><tr><th>الإجمالي</th><th class="num">' + U.money(t.dr) + '</th><th class="num">' + U.money(t.cr) + '</th></tr></tfoot></table>';
          h.printDoc('قيد يومية رقم ' + je.no, 'التاريخ: ' + U.fmtDate(je.date) + ' — ' + je.description, body);
        });
      }
    });
  }

  App.h.showJournal = showEntry;

  /* ============================================================
     نموذج القيد
     ============================================================ */
  App.views.journalNew = function (params) {
    const editing = params && params.id ? Accounting.journal(params.id) : null;
    if (editing && editing.source) {
      return {
        title: 'تعديل قيد',
        sub: 'هذا القيد مرتبط بمستند ولا يمكن تعديله',
        html: '<div class="card">' + U.empty('قيد مرتبط بمستند', 'لتعديل هذا القيد يجب تعديل المستند الأصلي (فاتورة/سند/مصروف).', 'warn') +
          '<div class="text-center" style="padding-bottom:24px"><a class="btn" href="#/journal">العودة للقيود</a></div></div>'
      };
    }

    const accOptions = Accounting.accountOptions('', function (a) { return !a.isGroup; });
    const date = editing ? editing.date : U.today();
    const lines = editing ? editing.lines : [
      { accountId: '', debit: 0, credit: 0, note: '' },
      { accountId: '', debit: 0, credit: 0, note: '' }
    ];

    function lineRow(l) {
      return '<tr>' +
        '<td><select class="acc-in">' + Accounting.accountOptions(l.accountId, function (a) { return !a.isGroup; }) + '</select></td>' +
        '<td><input type="number" step="0.01" min="0" class="dr-in num" value="' + (U.num(l.debit) || '') + '" placeholder="0.00"></td>' +
        '<td><input type="number" step="0.01" min="0" class="cr-in num" value="' + (U.num(l.credit) || '') + '" placeholder="0.00"></td>' +
        '<td><input type="text" class="note-in" value="' + U.esc(l.note || '') + '" placeholder="ملاحظة اختيارية"></td>' +
        '<td><button type="button" class="icon-btn sm plain del-line" title="حذف السطر">' + U.icon('x') + '</button></td>' +
      '</tr>';
    }

    return {
      title: editing ? 'تعديل قيد ' + editing.no : 'قيد يومية جديد',
      sub: 'قيد محاسبي مزدوج — يجب أن يتساوى المدين والدائن',
      html:
        '<form id="je-form">' +
          '<div class="card">' +
            '<div class="card-head"><h3>بيانات القيد</h3></div>' +
            '<div class="card-body"><div class="form-grid cols-4">' +
              '<div class="field"><label>التاريخ *</label><input type="date" name="date" value="' + date + '" required></div>' +
              '<div class="field"><label>المرجع</label><input type="text" name="ref" value="' + U.esc(editing ? editing.ref : '') + '" placeholder="رقم مستند خارجي"></div>' +
              '<div class="field span-2"><label>البيان *</label><input type="text" name="description" value="' + U.esc(editing ? editing.description : '') + '" placeholder="وصف القيد المحاسبي" required></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="card mt-16">' +
            '<div class="card-head"><h3>سطور القيد</h3><div class="actions" id="bal-flag"></div></div>' +
            '<div class="table-wrap"><table class="lines-table">' +
              '<thead><tr><th style="width:38%">الحساب</th><th style="width:15%">مدين</th><th style="width:15%">دائن</th><th>ملاحظة</th><th style="width:38px"></th></tr></thead>' +
              '<tbody id="lines">' + lines.map(lineRow).join('') + '</tbody>' +
            '</table></div>' +
            '<div class="card-pad" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-top:1px solid var(--border);flex-wrap:wrap">' +
              '<button type="button" class="btn btn-sm" id="add-line">' + U.icon('plus') + ' إضافة سطر</button>' +
              '<div class="totals-box">' +
                '<div class="totals-row"><span>إجمالي المدين</span><span class="v num" id="t-dr">0.00</span></div>' +
                '<div class="totals-row"><span>إجمالي الدائن</span><span class="v num" id="t-cr">0.00</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="toolbar mt-16" style="justify-content:flex-end">' +
            '<a class="btn" href="#/journal">إلغاء</a>' +
            '<button class="btn btn-primary" type="submit">' + (editing ? 'حفظ التعديلات' : 'حفظ القيد') + '</button>' +
          '</div>' +
        '</form>',

      mount: function (root) {
        const tbody = root.querySelector('#lines');
        const drEl = root.querySelector('#t-dr');
        const crEl = root.querySelector('#t-cr');
        const flag = root.querySelector('#bal-flag');

        function recalc() {
          let dr = 0, cr = 0;
          U.$$('tr', tbody).forEach(function (tr) {
            dr += U.num(tr.querySelector('.dr-in').value);
            cr += U.num(tr.querySelector('.cr-in').value);
          });
          dr = U.round2(dr); cr = U.round2(cr);
          drEl.textContent = U.money(dr);
          crEl.textContent = U.money(cr);
          const ok = Math.abs(dr - cr) < 0.009 && dr > 0;
          flag.innerHTML = '<span class="balance-flag ' + (ok ? 'ok' : 'bad') + '">' +
            (ok ? '✓ متوازن' : 'غير متوازن — الفرق ' + U.money(Math.abs(dr - cr))) + '</span>';
        }

        root.querySelector('#add-line').addEventListener('click', function () {
          const tr = document.createElement('tbody');
          tr.innerHTML = lineRow({});
          tbody.appendChild(tr.firstChild);
          recalc();
        });

        tbody.addEventListener('click', function (e) {
          if (!e.target.closest('.del-line')) return;
          if (tbody.children.length <= 2) { U.toast('لا يمكن أن يقل القيد عن سطرين', 'warn'); return; }
          e.target.closest('tr').remove();
          recalc();
        });

        tbody.addEventListener('input', function (e) {
          const tr = e.target.closest('tr');
          if (!tr) return;
          if (e.target.classList.contains('dr-in') && U.num(e.target.value) > 0) tr.querySelector('.cr-in').value = '';
          if (e.target.classList.contains('cr-in') && U.num(e.target.value) > 0) tr.querySelector('.dr-in').value = '';
          recalc();
        });

        recalc();

        root.querySelector('#je-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const f = e.target;
          const linesData = [];
          U.$$('tr', tbody).forEach(function (tr) {
            const accountId = tr.querySelector('.acc-in').value;
            const debit = U.num(tr.querySelector('.dr-in').value);
            const credit = U.num(tr.querySelector('.cr-in').value);
            if (!accountId || (!debit && !credit)) return;
            linesData.push({ accountId: accountId, debit: debit, credit: credit, note: tr.querySelector('.note-in').value.trim() });
          });
          try {
            if (editing) {
              Accounting.updateJournal(editing.id, {
                date: f.date.value, ref: f.ref.value.trim(), description: f.description.value.trim(), lines: linesData
              });
              U.toast('تم تحديث القيد');
            } else {
              Accounting.createJournal({
                date: f.date.value, ref: f.ref.value.trim(), description: f.description.value.trim(), lines: linesData
              });
              U.toast('تم حفظ القيد بنجاح');
            }
            location.hash = '#/journal';
          } catch (err) {
            U.toast(err.message, 'error', 4200);
          }
        });
      }
    };
  };

  /* ============================================================
     دفتر الأستاذ
     ============================================================ */
  App.views.ledger = function (params) {
    const leaves = Accounting.leaves();
    const defAcc = (params && params.account) || (leaves[0] ? leaves[0].id : '');
    const from = (params && params.from) || U.startOfYear();
    const to = (params && params.to) || U.today();
    const acc = Accounting.account(defAcc);
    const data = acc ? Accounting.ledger(defAcc, from, to) : null;

    const rows = data ? data.rows.map(function (r) {
      return '<tr>' +
        '<td class="nowrap">' + U.fmtDate(r.date) + '</td>' +
        '<td class="mono">' + U.esc(r.no) + '</td>' +
        '<td>' + U.esc(r.description) + (r.note ? '<div class="muted small">' + U.esc(r.note) + '</div>' : '') + '</td>' +
        '<td class="muted small">' + U.esc(r.ref || '—') + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
        '<td class="num strong">' + U.money(r.balance) + '</td>' +
      '</tr>';
    }).join('') : '';

    const dr = data ? U.round2(data.rows.reduce(function (a, r) { return a + r.debit; }, 0)) : 0;
    const cr = data ? U.round2(data.rows.reduce(function (a, r) { return a + r.credit; }, 0)) : 0;

    return {
      title: 'دفتر الأستاذ',
      sub: 'حركة الحساب التفصيلية والأرصدة',
      html:
        '<div class="card mb-16"><div class="card-body">' +
          '<form id="ledger-form" class="form-grid cols-4">' +
            '<div class="field span-2"><label>الحساب</label><select name="account">' +
              Accounting.accountOptions(defAcc, function (a) { return !a.isGroup; }) +
            '</select></div>' +
            '<div class="field"><label>من تاريخ</label><input type="date" name="from" value="' + from + '"></div>' +
            '<div class="field"><label>إلى تاريخ</label><input type="date" name="to" value="' + to + '"></div>' +
            '<div class="field full" style="flex-direction:row;gap:8px;justify-content:flex-end">' +
              '<button class="btn btn-primary" type="submit">عرض الحركة</button>' +
              '<button class="btn" type="button" id="ledger-print">' + U.icon('print') + ' طباعة</button>' +
            '</div>' +
          '</form>' +
        '</div></div>' +

        '<div class="grid grid-4 mb-16">' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">الرصيد الافتتاحي</div>' +
            '<div class="stat-value">' + U.money(data ? data.opening : 0) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">إجمالي المدين</div>' +
            '<div class="stat-value">' + U.money(dr) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">إجمالي الدائن</div>' +
            '<div class="stat-value">' + U.money(cr) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">الرصيد الختامي</div>' +
            '<div class="stat-value ' + (data && data.closing < 0 ? 'text-red' : '') + '">' + U.money(data ? data.closing : 0) + '</div></div></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><h3>' + U.esc(acc ? acc.code + ' — ' + acc.name : 'اختر حساباً') + '</h3>' +
            '<span class="sub">' + U.fmtDate(from) + ' إلى ' + U.fmtDate(to) + '</span></div>' +
          '<div class="table-wrap"><table class="data">' +
            '<thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>المرجع</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">الرصيد</th></tr></thead>' +
            '<tbody>' + (rows || h.emptyRow(7, 'لا توجد حركات على هذا الحساب في الفترة المحددة', 'ledger')) + '</tbody>' +
            (data && data.rows.length ? '<tfoot><tr><td colspan="4">الإجمالي</td><td class="num">' + U.money(dr) + '</td><td class="num">' + U.money(cr) + '</td><td class="num">' + U.money(data.closing) + '</td></tr></tfoot>' : '') +
          '</table></div>' +
        '</div>',

      mount: function (root) {
        root.querySelector('#ledger-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const f = e.target;
          location.hash = '#/ledger?account=' + encodeURIComponent(f.account.value) + '&from=' + f.from.value + '&to=' + f.to.value;
        });

        root.querySelector('#ledger-print').addEventListener('click', function () {
          if (!data) return;
          const body = '<table><thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>' +
            '<tr><td colspan="5"><strong>الرصيد الافتتاحي</strong></td><td class="num">' + U.money(data.opening) + '</td></tr>' +
            data.rows.map(function (r) {
              return '<tr><td>' + U.fmtDate(r.date) + '</td><td>' + U.esc(r.no) + '</td><td>' + U.esc(r.description) + '</td>' +
                '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
                '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
                '<td class="num">' + U.money(r.balance) + '</td></tr>';
            }).join('') +
            '<tr><th colspan="3">الإجمالي</th><th class="num">' + U.money(dr) + '</th><th class="num">' + U.money(cr) + '</th><th class="num">' + U.money(data.closing) + '</th></tr>' +
            '</tbody></table>';
          h.printDoc('دفتر الأستاذ — ' + (acc ? acc.code + ' ' + acc.name : ''),
            'الفترة من ' + U.fmtDate(from) + ' إلى ' + U.fmtDate(to), body);
        });
      }
    };
  };

  /* ============================================================
     ميزان المراجعة
     ============================================================ */
  App.views.trial = function (params) {
    const from = (params && params.from) || U.startOfYear();
    const to = (params && params.to) || U.today();
    const tb = Accounting.trialBalance(from, to);
    const t = tb.totals;
    const balanced = Math.abs(t.debit - t.credit) < 0.01 && Math.abs(t.closeDebit - t.closeCredit) < 0.01;

    const rows = tb.rows.map(function (r) {
      return '<tr>' +
        '<td><span class="mono muted small">' + U.esc(r.account.code) + '</span> ' + U.esc(r.account.name) + '</td>' +
        '<td class="num">' + (r.openDebit ? U.money(r.openDebit) : '—') + '</td>' +
        '<td class="num">' + (r.openCredit ? U.money(r.openCredit) : '—') + '</td>' +
        '<td class="num">' + (r.debit ? U.money(r.debit) : '—') + '</td>' +
        '<td class="num">' + (r.credit ? U.money(r.credit) : '—') + '</td>' +
        '<td class="num strong">' + (r.closeDebit ? U.money(r.closeDebit) : '—') + '</td>' +
        '<td class="num strong">' + (r.closeCredit ? U.money(r.closeCredit) : '—') + '</td>' +
      '</tr>';
    }).join('');

    return {
      title: 'ميزان المراجعة',
      sub: 'أرصدة الحسابات وحركتها خلال الفترة',
      html:
        '<div class="toolbar">' +
          '<form id="tb-form" class="flex items-center gap-8" style="flex-wrap:wrap">' +
            '<input type="date" name="from" value="' + from + '" style="width:auto">' +
            '<span class="muted">إلى</span>' +
            '<input type="date" name="to" value="' + to + '" style="width:auto">' +
            '<button class="btn" type="submit">تحديث</button>' +
          '</form>' +
          '<div class="spacer"></div>' +
          '<span class="balance-flag ' + (balanced ? 'ok' : 'bad') + '">' + (balanced ? '✓ الميزان متوازن' : '✕ الميزان غير متوازن') + '</span>' +
          '<button class="btn btn-sm" data-act="csv">' + U.icon('download') + ' CSV</button>' +
          '<button class="btn btn-primary" data-act="print">' + U.icon('print') + ' طباعة</button>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr>' +
            '<th rowspan="2">الحساب</th>' +
            '<th colspan="2" class="text-center">الرصيد الافتتاحي</th>' +
            '<th colspan="2" class="text-center">حركة الفترة</th>' +
            '<th colspan="2" class="text-center">الرصيد الختامي</th>' +
          '</tr><tr>' +
            '<th class="num">مدين</th><th class="num">دائن</th>' +
            '<th class="num">مدين</th><th class="num">دائن</th>' +
            '<th class="num">مدين</th><th class="num">دائن</th>' +
          '</tr></thead>' +
          '<tbody>' + (rows || h.emptyRow(7, 'لا توجد حركات في هذه الفترة', 'scale')) + '</tbody>' +
          '<tfoot><tr>' +
            '<td>الإجمالي</td>' +
            '<td class="num">' + U.money(t.openDebit) + '</td><td class="num">' + U.money(t.openCredit) + '</td>' +
            '<td class="num">' + U.money(t.debit) + '</td><td class="num">' + U.money(t.credit) + '</td>' +
            '<td class="num">' + U.money(t.closeDebit) + '</td><td class="num">' + U.money(t.closeCredit) + '</td>' +
          '</tr></tfoot>' +
        '</table></div></div>',

      mount: function (root) {
        root.querySelector('#tb-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const f = e.target;
          location.hash = '#/trial?from=' + f.from.value + '&to=' + f.to.value;
        });

        root.querySelector('[data-act="csv"]').addEventListener('click', function () {
          h.csv('trial-balance.csv',
            ['الحساب', 'افتتاحي مدين', 'افتتاحي دائن', 'حركة مدين', 'حركة دائن', 'ختامي مدين', 'ختامي دائن'],
            tb.rows.map(function (r) {
              return [r.account.code + ' ' + r.account.name, r.openDebit, r.openCredit, r.debit, r.credit, r.closeDebit, r.closeCredit];
            }).concat([['الإجمالي', t.openDebit, t.openCredit, t.debit, t.credit, t.closeDebit, t.closeCredit]]));
        });

        root.querySelector('[data-act="print"]').addEventListener('click', function () {
          const body = '<table><thead><tr><th>الحساب</th><th>افتتاحي مدين</th><th>افتتاحي دائن</th><th>حركة مدين</th><th>حركة دائن</th><th>ختامي مدين</th><th>ختامي دائن</th></tr></thead><tbody>' +
            tb.rows.map(function (r) {
              return '<tr><td>' + U.esc(r.account.code + ' ' + r.account.name) + '</td>' +
                '<td class="num">' + (r.openDebit ? U.money(r.openDebit) : '') + '</td>' +
                '<td class="num">' + (r.openCredit ? U.money(r.openCredit) : '') + '</td>' +
                '<td class="num">' + (r.debit ? U.money(r.debit) : '') + '</td>' +
                '<td class="num">' + (r.credit ? U.money(r.credit) : '') + '</td>' +
                '<td class="num">' + (r.closeDebit ? U.money(r.closeDebit) : '') + '</td>' +
                '<td class="num">' + (r.closeCredit ? U.money(r.closeCredit) : '') + '</td></tr>';
            }).join('') +
            '<tr><th>الإجمالي</th><th class="num">' + U.money(t.openDebit) + '</th><th class="num">' + U.money(t.openCredit) + '</th>' +
            '<th class="num">' + U.money(t.debit) + '</th><th class="num">' + U.money(t.credit) + '</th>' +
            '<th class="num">' + U.money(t.closeDebit) + '</th><th class="num">' + U.money(t.closeCredit) + '</th></tr>' +
            '</tbody></table>';
          h.printDoc('ميزان المراجعة', 'من ' + U.fmtDate(from) + ' إلى ' + U.fmtDate(to), body);
        });
      }
    };
  };
})(window);
