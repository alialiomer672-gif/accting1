/* ============================================================
   المحاسب — المبيعات والمشتريات والعملاء والمخزون
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.App;
  const h = App.h;

  h.contactOptions = function (type, selected) {
    const list = DB.state.contacts.filter(function (c) {
      if (!type) return true;
      if (type === 'customer') return c.type === 'customer' || c.type === 'both';
      if (type === 'supplier') return c.type === 'supplier' || c.type === 'both';
      return true;
    });
    return '<option value="">— اختر —</option>' + list.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selected ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
    }).join('');
  };

  h.invoiceStatus = function (inv) {
    return U.payBadge(inv);
  };

  /* ---------------- مستند الفاتورة (معاينة) ---------------- */
  h.invoiceDoc = function (inv) {
    const s = DB.state.settings;
    const party = Accounting.contact(inv.contactId);
    const t = Accounting.invoiceTotals(inv);
    const isSale = inv.type === 'sale';
    const rows = (inv.lines || []).map(function (l, i) {
      const base = U.round2(U.num(l.qty) * U.num(l.price) - U.num(l.discount));
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + U.esc(l.description || (Accounting.getItem(l.itemId) || {}).name || '') + '</td>' +
        '<td class="num">' + U.qty(l.qty) + '</td>' +
        '<td class="num">' + U.money(l.price) + '</td>' +
        '<td class="num">' + U.money(l.discount) + '</td>' +
        '<td class="num">' + U.money(l.taxRate) + '%</td>' +
        '<td class="num">' + U.money(base) + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="invoice-doc">' +
      '<div class="doc-head">' +
        '<div>' +
          '<div class="doc-title">' + (isSale ? 'فاتورة بيع' : 'فاتورة شراء') + '</div>' +
          '<div class="doc-sub">' + U.esc(s.company) + '</div>' +
          '<div class="doc-sub">' + U.esc(s.address || '') + '</div>' +
          (s.taxNumber ? '<div class="doc-sub">الرقم الضريبي: ' + U.esc(s.taxNumber) + '</div>' : '') +
        '</div>' +
        '<div style="text-align:left">' +
          '<div style="font-size:15px;font-weight:800">' + U.esc(inv.no) + '</div>' +
          '<div class="doc-sub">التاريخ: ' + U.fmtDate(inv.date) + '</div>' +
          '<div class="doc-sub">الاستحقاق: ' + U.fmtDate(inv.dueDate) + '</div>' +
          '<div style="margin-top:6px">' + h.invoiceStatus(inv) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="doc-body">' +
        '<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:18px">' +
          '<div style="font-size:12.5px">' +
            '<div class="doc-sub" style="margin-bottom:2px">' + (isSale ? 'فاتورة إلى' : 'المورد') + '</div>' +
            '<div style="font-weight:700;font-size:14px">' + U.esc(party ? party.name : '—') + '</div>' +
            (party && party.taxNumber ? '<div class="doc-sub">الرقم الضريبي: ' + U.esc(party.taxNumber) + '</div>' : '') +
            (party && party.phone ? '<div class="doc-sub">' + U.esc(party.phone) + '</div>' : '') +
            (party && party.city ? '<div class="doc-sub">' + U.esc(party.city) + '</div>' : '') +
          '</div>' +
          '<div style="font-size:12.5px;text-align:left">' +
            '<div class="doc-sub">العملة: ' + U.esc(s.currency) + '</div>' +
            '<div class="doc-sub">' + (isSale ? 'نوع المستند: فاتورة ضريبية' : 'أمر توريد') + '</div>' +
          '</div>' +
        '</div>' +
        '<table>' +
          '<thead><tr><th style="width:34px">#</th><th>الوصف</th><th style="width:70px">الكمية</th><th style="width:90px">السعر</th><th style="width:80px">الخصم</th><th style="width:60px">الضريبة</th><th style="width:100px">الإجمالي</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
        '<div style="display:flex;justify-content:space-between;gap:24px;margin-top:16px">' +
          '<div style="flex:1">' +
            (inv.notes ? '<div class="doc-sub" style="margin-bottom:4px">ملاحظات:</div><div style="font-size:12.5px">' + U.esc(inv.notes) + '</div>' : '') +
            '<div class="words">' + U.esc(U.amountInWords(t.total)) + '</div>' +
          '</div>' +
          '<div style="min-width:260px">' +
            '<div class="totals-row"><span>الإجمالي قبل الضريبة</span><span class="v num">' + U.money(t.subtotal) + '</span></div>' +
            (t.discount ? '<div class="totals-row"><span>الخصم</span><span class="v num">' + U.money(t.discount) + '</span></div>' : '') +
            '<div class="totals-row"><span>' + U.esc(s.taxName) + '</span><span class="v num">' + U.money(t.tax) + '</span></div>' +
            '<div class="totals-row grand"><span>الإجمالي</span><span class="v num">' + U.money(t.total) + '</span></div>' +
            (U.num(inv.paidAmount) ? '<div class="totals-row"><span>المدفوع</span><span class="v num">' + U.money(inv.paidAmount) + '</span></div>' +
              '<div class="totals-row"><span>المتبقي</span><span class="v num strong">' + U.money(t.total - U.num(inv.paidAmount)) + '</span></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="sign"><div>توقيع البائع</div><div>توقيع ' + (isSale ? 'المشتري' : 'المورد') + '</div></div>' +
      '</div>' +
    '</div>';
  };

  h.invoicePrintBody = function (inv) {
    const s = DB.state.settings;
    const party = Accounting.contact(inv.contactId);
    const t = Accounting.invoiceTotals(inv);
    const isSale = inv.type === 'sale';
    const rows = (inv.lines || []).map(function (l, i) {
      const base = U.round2(U.num(l.qty) * U.num(l.price) - U.num(l.discount));
      return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(l.description || '') + '</td><td class="num">' + U.qty(l.qty) + '</td>' +
        '<td class="num">' + U.money(l.price) + '</td><td class="num">' + U.money(l.discount) + '</td>' +
        '<td class="num">' + U.money(l.taxRate) + '%</td><td class="num">' + U.money(base) + '</td></tr>';
    }).join('');

    return '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11.5px">' +
        '<tr><td style="border:none;width:50%"><strong>الطرف:</strong> ' + U.esc(party ? party.name : '—') + '<br>' +
          (party && party.taxNumber ? 'الرقم الضريبي: ' + U.esc(party.taxNumber) + '<br>' : '') +
          (party && party.phone ? U.esc(party.phone) : '') + '</td>' +
        '<td style="border:none;text-align:left"><strong>' + U.esc(inv.no) + '</strong><br>' +
          'التاريخ: ' + U.fmtDate(inv.date) + '<br>الاستحقاق: ' + U.fmtDate(inv.dueDate) + '</td></tr>' +
      '</table>' +
      '<table><thead><tr><th>#</th><th>الوصف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead><tbody>' +
        rows +
        '<tr><td colspan="5"></td><td>الإجمالي قبل الضريبة</td><td class="num">' + U.money(t.subtotal) + '</td></tr>' +
        '<tr><td colspan="5"></td><td>' + U.esc(s.taxName) + ' ' + U.money(s.taxRate) + '%</td><td class="num">' + U.money(t.tax) + '</td></tr>' +
        '<tr><th colspan="6">الإجمالي المستحق</th><th class="num">' + U.money(t.total) + '</th></tr>' +
      '</tbody></table>' +
      '<p style="font-size:11px;margin-top:10px"><strong>المبلغ كتابةً:</strong> ' + U.esc(U.amountInWords(t.total)) + '</p>' +
      (inv.notes ? '<p style="font-size:11px"><strong>ملاحظات:</strong> ' + U.esc(inv.notes) + '</p>' : '') +
      '<p style="font-size:10.5px;margin-top:26px">' + U.esc(s.invoiceNote || '') + '</p>';
  };

  /* ---------------- تسجيل دفعة على فاتورة ---------------- */
  h.paymentModal = function (inv) {
    const t = Accounting.invoiceTotals(inv);
    const outstanding = U.round2(t.total - U.num(inv.paidAmount));
    if (outstanding <= 0.004) { U.toast('الفاتورة مسددة بالكامل', 'warn'); return; }
    const isReceipt = inv.type === 'sale';
    const s = DB.state.settings;
    const m = U.modal({
      title: isReceipt ? 'تسجيل تحصيل' : 'تسجيل سداد',
      sub: inv.no + ' — المتبقي ' + U.money(outstanding) + ' ' + U.cur(),
      body:
        '<form id="pay-form" class="form-grid">' +
          '<div class="field"><label>المبلغ *</label><input type="number" step="0.01" min="0.01" name="amount" value="' + outstanding + '" required></div>' +
          '<div class="field"><label>التاريخ *</label><input type="date" name="date" value="' + U.today() + '" required></div>' +
          '<div class="field"><label>الحساب ' + (isReceipt ? 'المستلم' : 'المدفوع منه') + ' *</label><select name="account">' +
            '<option value="' + s.accounts.bank + '">البنك</option>' +
            '<option value="' + s.accounts.cash + '">الصندوق (النقدية)</option>' +
          '</select></div>' +
          '<div class="field"><label>ملاحظة</label><input type="text" name="notes" placeholder="اختياري"></div>' +
        '</form>',
      footer:
        '<div class="spacer"></div>' +
        '<button class="btn" type="button" data-close>إلغاء</button>' +
        '<button class="btn btn-primary" type="submit" form="pay-form">حفظ ' + (isReceipt ? 'التحصيل' : 'السداد') + '</button>',
      onMount: function (el, close) {
        el.querySelector('#pay-form').addEventListener('submit', function (e) {
          e.preventDefault();
          const f = e.target;
          const amount = U.round2(U.num(f.amount.value));
          if (amount <= 0) { U.toast('أدخل مبلغاً صحيحاً', 'error'); return; }
          const p = {
            id: U.uid('pm'),
            no: DB.nextNo(isReceipt ? 'receipt' : 'payment', isReceipt ? s.prefixes.receipt : s.prefixes.payment),
            type: isReceipt ? 'receipt' : 'payment',
            date: f.date.value,
            contactId: inv.contactId,
            invoiceId: inv.id,
            amount: amount,
            accountId: f.account.value,
            notes: f.notes.value.trim(),
            status: 'draft',
            createdAt: new Date().toISOString()
          };
          DB.state.payments.push(p);
          try {
            Accounting.postPayment(p);
            U.toast('تم تسجيل ' + (isReceipt ? 'التحصيل' : 'السداد') + ' بنجاح');
            close();
            App.render();
          } catch (err) {
            DB.state.payments = DB.state.payments.filter(function (x) { return x.id !== p.id; });
            U.toast(err.message, 'error');
          }
        });
      }
    });
    void m;
  };

  /* ============================================================
     قائمة الفواتير
     ============================================================ */
  App.views.invoices = function (params) {
    const type = (params && params.type) || '';
    return {
      title: type === 'purchase' ? 'فواتير الشراء' : type === 'sale' ? 'فواتير البيع' : 'الفواتير',
      sub: 'إدارة فواتير البيع والشراء وترحيلها محاسبياً',
      html:
        '<div class="toolbar">' +
          '<div class="seg">' +
            '<a href="#/invoices" class="' + (!type ? 'active' : '') + '">الكل</a>' +
            '<a href="#/invoices?type=sale" class="' + (type === 'sale' ? 'active' : '') + '">مبيعات</a>' +
            '<a href="#/invoices?type=purchase" class="' + (type === 'purchase' ? 'active' : '') + '">مشتريات</a>' +
          '</div>' +
          '<div class="search-box">' + U.icon('search') + '<input type="search" id="inv-search" placeholder="بحث برقم الفاتورة أو الطرف..."></div>' +
          '<select id="status-filter" style="width:auto">' +
            '<option value="">كل الحالات</option>' +
            '<option value="draft">مسودة</option>' +
            '<option value="unpaid">غير مدفوعة</option>' +
            '<option value="partial">مدفوعة جزئياً</option>' +
            '<option value="paid">مدفوعة</option>' +
          '</select>' +
          '<div class="spacer"></div>' +
          '<a class="btn btn-primary" href="#/invoice/new?type=' + (type === 'purchase' ? 'purchase' : 'sale') + '">' + U.icon('plus') + ' فاتورة جديدة</a>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>الطرف</th><th class="num">الإجمالي</th><th class="num">المدفوع</th><th class="num">المتبقي</th><th>الحالة</th><th></th></tr></thead>' +
          '<tbody id="inv-body"></tbody>' +
        '</table></div></div>',

      mount: function (root) {
        const body = root.querySelector('#inv-body');
        const search = root.querySelector('#inv-search');
        const statusF = root.querySelector('#status-filter');

        function statusKey(inv) {
          if (inv.status !== 'posted') return 'draft';
          const t = Accounting.invoiceTotals(inv);
          const paid = U.num(inv.paidAmount);
          if (paid >= t.total - 0.01) return 'paid';
          if (paid > 0.004) return 'partial';
          return 'unpaid';
        }

        function render() {
          const q = (search.value || '').trim().toLowerCase();
          const sf = statusF.value;
          const list = Accounting.invoiceList(type).filter(function (inv) {
            const c = Accounting.contact(inv.contactId);
            const txt = (inv.no + ' ' + (c ? c.name : '')).toLowerCase();
            if (q && txt.indexOf(q) === -1) return false;
            if (sf && statusKey(inv) !== sf) return false;
            return true;
          });
          body.innerHTML = list.length ? list.map(function (inv) {
            const c = Accounting.contact(inv.contactId);
            const t = Accounting.invoiceTotals(inv);
            const out = Accounting.outstanding(inv);
            return '<tr>' +
              '<td class="mono strong">' + U.esc(inv.no) + '</td>' +
              '<td>' + (inv.type === 'sale' ? U.badge('بيع', 'green') : U.badge('شراء', 'amber')) + '</td>' +
              '<td class="nowrap">' + U.fmtDate(inv.date) + '</td>' +
              '<td>' + U.esc(c ? c.name : '—') + '</td>' +
              '<td class="num">' + U.money(t.total) + '</td>' +
              '<td class="num text-green">' + U.money(inv.paidAmount) + '</td>' +
              '<td class="num ' + (out > 0.004 ? 'strong' : 'muted') + '">' + U.money(out) + '</td>' +
              '<td>' + h.invoiceStatus(inv) + '</td>' +
              '<td><div class="row-actions">' +
                '<button class="icon-btn sm plain" title="عرض" data-act="view" data-id="' + inv.id + '">' + U.icon('eye') + '</button>' +
                (inv.status === 'draft'
                  ? '<button class="icon-btn sm plain" title="ترحيل" data-act="post" data-id="' + inv.id + '">' + U.icon('check') + '</button>' +
                    '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + inv.id + '">' + U.icon('edit') + '</button>'
                  : '<button class="icon-btn sm plain" title="تحصيل/سداد" data-act="pay" data-id="' + inv.id + '">' + U.icon('wallet') + '</button>') +
                '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + inv.id + '">' + U.icon('trash') + '</button>' +
              '</div></td>' +
            '</tr>';
          }).join('') : h.emptyRow(9, 'لا توجد فواتير مطابقة', 'file');
        }
        render();
        search.addEventListener('input', U.debounce(render, 150));
        statusF.addEventListener('change', render);

        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const id = btn.getAttribute('data-id');
          const act = btn.getAttribute('data-act');
          const inv = DB.state.invoices.filter(function (i) { return i.id === id; })[0];
          if (!inv) return;
          if (act === 'view') { location.hash = '#/invoice/view?id=' + id; return; }
          if (act === 'edit') { location.hash = '#/invoice/new?type=' + inv.type + '&id=' + id; return; }
          if (act === 'pay') { h.paymentModal(inv); return; }
          if (act === 'post') {
            Accounting.postInvoice(inv);
            U.toast('تم ترحيل الفاتورة وإنشاء القيد المحاسبي');
            render();
            return;
          }
          if (act === 'del') {
            U.confirm({
              title: 'حذف الفاتورة',
              message: 'هل تريد حذف الفاتورة ' + inv.no + '؟',
              detail: inv.status === 'posted' ? 'سيتم حذف القيد المحاسبي المرتبط بها وعكس حركة المخزون.' : '',
              danger: true, okText: 'حذف'
            }).then(function (ok) {
              if (!ok) return;
              try {
                Accounting.deleteInvoice(inv);
                U.toast('تم حذف الفاتورة');
                render();
              } catch (err) { U.toast(err.message, 'error'); }
            });
          }
        });
      }
    };
  };

  /* ============================================================
     نموذج الفاتورة
     ============================================================ */
  App.views.invoiceNew = function (params) {
    const type = (params && params.type) === 'purchase' ? 'purchase' : 'sale';
    const editing = params && params.id ? DB.state.invoices.filter(function (i) { return i.id === params.id; })[0] : null;
    if (editing && editing.status === 'posted') {
      return {
        title: 'تعديل فاتورة',
        sub: 'الفاتورة مرحّلة — ألغِ الترحيل أولاً',
        html: '<div class="card">' + U.empty('لا يمكن تعديل فاتورة مرحّلة', 'اذهب إلى عرض الفاتورة ثم اختر «إلغاء الترحيل» للتعديل.', 'warn') +
          '<div class="text-center" style="padding-bottom:24px"><a class="btn" href="#/invoice/view?id=' + editing.id + '">عرض الفاتورة</a></div></div>'
      };
    }

    const isSale = type === 'sale';
    const s = DB.state.settings;
    const items = DB.state.items.filter(function (i) { return i.active !== false; });
    const itemOpts = '<option value="">— اختر صنفاً —</option>' + items.map(function (i) {
      return '<option value="' + i.id + '">' + U.esc(i.code + ' — ' + i.name) + '</option>';
    }).join('');
    const lines = editing ? editing.lines : [{ itemId: '', description: '', qty: 1, price: 0, discount: 0, taxRate: s.taxRate }];

    function lineRow(l) {
      return '<tr>' +
        '<td style="min-width:190px"><select class="item-in">' + itemOpts + '</select></td>' +
        '<td style="min-width:180px"><input type="text" class="desc-in" value="' + U.esc(l.description || '') + '" placeholder="وصف البند"></td>' +
        '<td style="width:86px"><input type="number" min="0" step="1" class="qty-in num" value="' + (U.num(l.qty) || 1) + '"></td>' +
        '<td style="width:110px"><input type="number" min="0" step="0.01" class="price-in num" value="' + (U.num(l.price) || '') + '"></td>' +
        '<td style="width:96px"><input type="number" min="0" step="0.01" class="disc-in num" value="' + (U.num(l.discount) || '') + '"></td>' +
        '<td style="width:76px"><input type="number" min="0" step="0.01" class="tax-in num" value="' + U.num(l.taxRate) + '"></td>' +
        '<td class="num line-total strong" style="width:110px">0.00</td>' +
        '<td style="width:38px"><button type="button" class="icon-btn sm plain del-line">' + U.icon('x') + '</button></td>' +
      '</tr>';
    }

    return {
      title: editing ? 'تعديل ' + editing.no : (isSale ? 'فاتورة بيع جديدة' : 'فاتورة شراء جديدة'),
      sub: isSale ? 'إصدار فاتورة للعميل — تُرحّل تلقائياً إلى القيود' : 'تسجيل فاتورة من المورد — تُحدّث المخزون',
      html:
        '<form id="inv-form">' +
          '<div class="card">' +
            '<div class="card-head"><h3>بيانات الفاتورة</h3><div class="actions">' +
              (editing ? U.badge(editing.no, 'blue') : U.badge('ترقيم تلقائي', 'gray')) +
            '</div></div>' +
            '<div class="card-body"><div class="form-grid cols-4">' +
              '<div class="field"><label>التاريخ *</label><input type="date" name="date" value="' + (editing ? editing.date : U.today()) + '" required></div>' +
              '<div class="field"><label>تاريخ الاستحقاق</label><input type="date" name="dueDate" value="' + (editing ? editing.dueDate : U.addDays(U.today(), 30)) + '"></div>' +
              '<div class="field span-2"><label>' + (isSale ? 'العميل *' : 'المورد *') + '</label><select name="contactId" required>' +
                h.contactOptions(isSale ? 'customer' : 'supplier', editing ? editing.contactId : '') + '</select></div>' +
              '<div class="field full"><label>ملاحظات</label><input type="text" name="notes" value="' + U.esc(editing ? editing.notes : '') + '" placeholder="ملاحظات تظهر على الفاتورة"></div>' +
            '</div></div>' +
          '</div>' +

          '<div class="card mt-16">' +
            '<div class="card-head"><h3>بنود الفاتورة</h3><div class="actions">' +
              '<button type="button" class="btn btn-sm" id="add-item">' + U.icon('plus') + ' إضافة بند</button>' +
            '</div></div>' +
            '<div class="table-wrap"><table class="lines-table">' +
              '<thead><tr><th>الصنف</th><th>الوصف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>ضريبة %</th><th>الإجمالي</th><th></th></tr></thead>' +
              '<tbody id="inv-lines">' + lines.map(lineRow).join('') + '</tbody>' +
            '</table></div>' +
            '<div class="card-pad" style="display:flex;justify-content:flex-start;gap:24px;border-top:1px solid var(--border);flex-wrap:wrap">' +
              '<div class="totals-box" style="margin-inline-start:auto">' +
                '<div class="totals-row"><span>الإجمالي قبل الضريبة</span><span class="v num" id="t-sub">0.00</span></div>' +
                '<div class="totals-row"><span>الخصم</span><span class="v num" id="t-disc">0.00</span></div>' +
                '<div class="totals-row"><span>' + U.esc(s.taxName) + '</span><span class="v num" id="t-tax">0.00</span></div>' +
                '<div class="totals-row grand"><span>الإجمالي المستحق</span><span class="v num" id="t-total">0.00</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="toolbar mt-16" style="justify-content:flex-end">' +
            '<a class="btn" href="#/invoices?type=' + type + '">إلغاء</a>' +
            '<button class="btn" type="submit" data-mode="draft">حفظ كمسودة</button>' +
            '<button class="btn btn-primary" type="submit" data-mode="post">' + U.icon('check') + ' حفظ وترحيل</button>' +
          '</div>' +
        '</form>',

      mount: function (root) {
        const tbody = root.querySelector('#inv-lines');
        const form = root.querySelector('#inv-form');
        let mode = 'draft';

        /* تعبئة قيم الصفوف عند التعديل */
        if (editing) {
          U.$$('tr', tbody).forEach(function (tr, i) {
            const l = editing.lines[i];
            if (l && l.itemId) tr.querySelector('.item-in').value = l.itemId;
          });
        }

        function recalc() {
          let sub = 0, tax = 0, disc = 0;
          U.$$('tr', tbody).forEach(function (tr) {
            const qty = U.num(tr.querySelector('.qty-in').value);
            const price = U.num(tr.querySelector('.price-in').value);
            const d = U.num(tr.querySelector('.disc-in').value);
            const rate = U.num(tr.querySelector('.tax-in').value);
            const base = Math.max(0, qty * price - d);
            sub += base; disc += d; tax += base * rate / 100;
            tr.querySelector('.line-total').textContent = U.money(base + base * rate / 100);
          });
          sub = U.round2(sub); tax = U.round2(tax); disc = U.round2(disc);
          root.querySelector('#t-sub').textContent = U.money(sub);
          root.querySelector('#t-disc').textContent = U.money(disc);
          root.querySelector('#t-tax').textContent = U.money(tax);
          root.querySelector('#t-total').textContent = U.money(sub + tax);
        }

        root.querySelector('#add-item').addEventListener('click', function () {
          const tmp = document.createElement('tbody');
          tmp.innerHTML = lineRow({ qty: 1, price: 0, discount: 0, taxRate: s.taxRate });
          tbody.appendChild(tmp.firstChild);
          recalc();
        });

        tbody.addEventListener('input', recalc);
        tbody.addEventListener('change', function (e) {
          if (!e.target.classList.contains('item-in')) return;
          const tr = e.target.closest('tr');
          const it = Accounting.getItem(e.target.value);
          if (!it) return;
          tr.querySelector('.desc-in').value = it.name;
          tr.querySelector('.price-in').value = it.price;
          tr.querySelector('.tax-in').value = it.taxRate;
          recalc();
        });
        tbody.addEventListener('click', function (e) {
          if (!e.target.closest('.del-line')) return;
          if (tbody.children.length <= 1) { U.toast('يجب أن تحتوي الفاتورة على بند واحد على الأقل', 'warn'); return; }
          e.target.closest('tr').remove();
          recalc();
        });
        recalc();

        U.$$('[data-mode]', form).forEach(function (b) {
          b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); });
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const linesData = [];
          U.$$('tr', tbody).forEach(function (tr) {
            const itemId = tr.querySelector('.item-in').value;
            const desc = tr.querySelector('.desc-in').value.trim();
            const qty = U.num(tr.querySelector('.qty-in').value);
            const price = U.num(tr.querySelector('.price-in').value);
            if (!itemId && !desc) return;
            if (qty <= 0) return;
            linesData.push({
              itemId: itemId, description: desc || (Accounting.getItem(itemId) || {}).name || 'بند',
              qty: qty, price: price,
              discount: U.num(tr.querySelector('.disc-in').value),
              taxRate: U.num(tr.querySelector('.tax-in').value)
            });
          });
          if (!linesData.length) { U.toast('أضف بنداً واحداً على الأقل', 'error'); return; }
          if (!form.contactId.value) { U.toast(isSale ? 'اختر العميل' : 'اختر المورد', 'error'); return; }

          let inv;
          if (editing) {
            inv = editing;
            inv.date = form.date.value;
            inv.dueDate = form.dueDate.value || form.date.value;
            inv.contactId = form.contactId.value;
            inv.notes = form.notes.value.trim();
            inv.lines = linesData;
          } else {
            inv = {
              id: U.uid('inv'),
              no: DB.nextNo(isSale ? 'invoice' : 'bill', isSale ? s.prefixes.invoice : s.prefixes.bill),
              type: type,
              date: form.date.value,
              dueDate: form.dueDate.value || form.date.value,
              contactId: form.contactId.value,
              lines: linesData,
              notes: form.notes.value.trim(),
              status: 'draft',
              paidAmount: 0,
              entryId: null,
              createdAt: new Date().toISOString()
            };
            DB.state.invoices.push(inv);
          }

          DB.save();

          if (mode === 'post') {
            try {
              Accounting.postInvoice(inv);
              U.toast('تم حفظ الفاتورة وترحيلها');
            } catch (err) {
              U.toast(err.message, 'error', 4200);
              location.hash = '#/invoice/view?id=' + inv.id;
              return;
            }
          } else {
            U.toast(editing ? 'تم تحديث المسودة' : 'تم حفظ المسودة');
          }
          location.hash = '#/invoice/view?id=' + inv.id;
        });
      }
    };
  };

  /* ============================================================
     عرض الفاتورة
     ============================================================ */
  App.views.invoiceView = function (params) {
    const inv = DB.state.invoices.filter(function (i) { return i.id === (params && params.id); })[0];
    if (!inv) {
      return {
        title: 'الفاتورة غير موجودة',
        sub: '',
        html: '<div class="card">' + U.empty('لم يتم العثور على الفاتورة', 'ربما تم حذفها.', 'file') +
          '<div class="text-center" style="padding-bottom:24px"><a class="btn" href="#/invoices">الفواتير</a></div></div>'
      };
    }
    const t = Accounting.invoiceTotals(inv);

    return {
      title: (inv.type === 'sale' ? 'فاتورة بيع ' : 'فاتورة شراء ') + inv.no,
      sub: 'معاينة المستند وإجراءات الترحيل والتحصيل',
      html:
        '<div class="toolbar">' +
          '<a class="btn" href="#/invoices?type=' + inv.type + '">' + '← العودة' + '</a>' +
          '<div class="spacer"></div>' +
          (inv.status === 'draft'
            ? '<button class="btn" data-act="edit">' + U.icon('edit') + ' تعديل</button>' +
              '<button class="btn btn-success" data-act="post">' + U.icon('check') + ' ترحيل</button>'
            : '<button class="btn" data-act="unpost">' + U.icon('arrowUp') + ' إلغاء الترحيل</button>' +
              (Accounting.outstanding(inv) > 0.004 ? '<button class="btn btn-success" data-act="pay">' + U.icon('wallet') + ' ' + (inv.type === 'sale' ? 'تحصيل' : 'سداد') + '</button>' : '')) +
          '<button class="btn btn-primary" data-act="print">' + U.icon('print') + ' طباعة</button>' +
          '<button class="btn btn-danger" data-act="del">' + U.icon('trash') + '</button>' +
        '</div>' +
        '<div class="grid grid-4 mb-16">' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">الإجمالي</div><div class="stat-value">' + U.money(t.total) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">المدفوع</div><div class="stat-value text-green">' + U.money(inv.paidAmount) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">المتبقي</div><div class="stat-value ' + (Accounting.outstanding(inv) > 0 ? 'text-red' : '') + '">' + U.money(Accounting.outstanding(inv)) + '</div></div></div>' +
          '<div class="card stat"><div class="stat-body"><div class="stat-label">الحالة</div><div style="margin-top:8px">' + h.invoiceStatus(inv) + '</div></div></div>' +
        '</div>' +
        h.invoiceDoc(inv),

      mount: function (root) {
        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const act = btn.getAttribute('data-act');
          if (act === 'edit') { location.hash = '#/invoice/new?type=' + inv.type + '&id=' + inv.id; return; }
          if (act === 'post') {
            try { Accounting.postInvoice(inv); U.toast('تم ترحيل الفاتورة'); App.render(); }
            catch (err) { U.toast(err.message, 'error'); }
            return;
          }
          if (act === 'unpost') {
            U.confirm({ title: 'إلغاء الترحيل', message: 'سيتم حذف القيد المحاسبي وعكس حركة المخزون. هل تريد المتابعة؟', danger: true, okText: 'إلغاء الترحيل' })
              .then(function (ok) {
                if (!ok) return;
                try { Accounting.unpostInvoice(inv); U.toast('تم إلغاء الترحيل'); App.render(); }
                catch (err) { U.toast(err.message, 'error'); }
              });
            return;
          }
          if (act === 'pay') { h.paymentModal(inv); return; }
          if (act === 'print') {
            h.printDoc((inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء') + ' — ' + inv.no,
              'التاريخ ' + U.fmtDate(inv.date) + ' — ' + (Accounting.contact(inv.contactId) || {}).name, h.invoicePrintBody(inv));
            return;
          }
          if (act === 'del') {
            U.confirm({
              title: 'حذف الفاتورة', message: 'هل تريد حذف الفاتورة ' + inv.no + ' نهائياً؟',
              detail: inv.status === 'posted' ? 'سيتم حذف القيد المرتبط وعكس حركة المخزون.' : '',
              danger: true, okText: 'حذف'
            }).then(function (ok) {
              if (!ok) return;
              try { Accounting.deleteInvoice(inv); U.toast('تم الحذف'); location.hash = '#/invoices'; }
              catch (err) { U.toast(err.message, 'error'); }
            });
          }
        });
      }
    };
  };

  /* ============================================================
     العملاء والموردون
     ============================================================ */
  App.views.contacts = function (params) {
    const type = (params && params.type) || 'customer';
    const isCust = type !== 'supplier';

    function contactModal(existing) {
      const c = existing || { name: '', type: isCust ? 'customer' : 'supplier', phone: '', email: '', city: '', taxNumber: '', notes: '' };
      const m = U.modal({
        title: existing ? 'تعديل بيانات' : (isCust ? 'عميل جديد' : 'مورد جديد'),
        body:
          '<form id="con-form" class="form-grid">' +
            '<div class="field full"><label>الاسم *</label><input name="name" value="' + U.esc(c.name) + '" required></div>' +
            '<div class="field"><label>النوع</label><select name="type">' +
              '<option value="customer"' + (c.type === 'customer' ? ' selected' : '') + '>عميل</option>' +
              '<option value="supplier"' + (c.type === 'supplier' ? ' selected' : '') + '>مورد</option>' +
              '<option value="both"' + (c.type === 'both' ? ' selected' : '') + '>عميل ومورد</option>' +
            '</select></div>' +
            '<div class="field"><label>الجوال</label><input name="phone" value="' + U.esc(c.phone) + '"></div>' +
            '<div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" value="' + U.esc(c.email) + '"></div>' +
            '<div class="field"><label>المدينة</label><input name="city" value="' + U.esc(c.city) + '"></div>' +
            '<div class="field"><label>الرقم الضريبي</label><input name="taxNumber" value="' + U.esc(c.taxNumber) + '"></div>' +
            '<div class="field"><label>ملاحظات</label><input name="notes" value="' + U.esc(c.notes) + '"></div>' +
          '</form>',
        footer: '<div class="spacer"></div><button class="btn" type="button" data-close>إلغاء</button>' +
          '<button class="btn btn-primary" type="submit" form="con-form">حفظ</button>',
        onMount: function (el, close) {
          el.querySelector('#con-form').addEventListener('submit', function (e) {
            e.preventDefault();
            const f = e.target;
            if (!f.name.value.trim()) { U.toast('أدخل الاسم', 'error'); return; }
            const data = {
              name: f.name.value.trim(), type: f.type.value, phone: f.phone.value.trim(),
              email: f.email.value.trim(), city: f.city.value.trim(), taxNumber: f.taxNumber.value.trim(), notes: f.notes.value.trim()
            };
            if (existing) Object.assign(existing, data);
            else DB.state.contacts.push(Object.assign({ id: U.uid('con') }, data));
            DB.save();
            close();
            U.toast('تم الحفظ');
            App.render();
          });
        }
      });
      void m;
    }

    return {
      title: isCust ? 'العملاء' : 'الموردون',
      sub: isCust ? 'بيانات العملاء وأرصدة الذمم المدينة' : 'بيانات الموردين وأرصدة الذمم الدائنة',
      html:
        '<div class="toolbar">' +
          '<div class="seg">' +
            '<a href="#/contacts?type=customer" class="' + (isCust ? 'active' : '') + '">العملاء</a>' +
            '<a href="#/contacts?type=supplier" class="' + (!isCust ? 'active' : '') + '">الموردون</a>' +
          '</div>' +
          '<div class="search-box">' + U.icon('search') + '<input type="search" id="con-search" placeholder="بحث بالاسم..."></div>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-primary" data-act="add">' + U.icon('plus') + (isCust ? ' عميل جديد' : ' مورد جديد') + '</button>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الاسم</th><th>الجوال</th><th>المدينة</th><th>الرقم الضريبي</th><th class="num">الرصيد</th><th></th></tr></thead>' +
          '<tbody id="con-body"></tbody>' +
        '</table></div></div>',

      mount: function (root) {
        const body = root.querySelector('#con-body');
        const search = root.querySelector('#con-search');

        function render() {
          const q = (search.value || '').trim().toLowerCase();
          const list = DB.state.contacts.filter(function (c) {
            const matchType = isCust ? (c.type === 'customer' || c.type === 'both') : (c.type === 'supplier' || c.type === 'both');
            if (!matchType) return false;
            if (q && (c.name + ' ' + (c.phone || '')).toLowerCase().indexOf(q) === -1) return false;
            return true;
          });
          body.innerHTML = list.length ? list.map(function (c) {
            const bal = Accounting.contactBalance(c.id);
            return '<tr>' +
              '<td><div class="strong">' + U.esc(c.name) + '</div>' +
                (c.email ? '<div class="muted small">' + U.esc(c.email) + '</div>' : '') + '</td>' +
              '<td class="mono">' + U.esc(c.phone || '—') + '</td>' +
              '<td>' + U.esc(c.city || '—') + '</td>' +
              '<td class="mono small">' + U.esc(c.taxNumber || '—') + '</td>' +
              '<td class="num strong ' + (bal > 0 ? 'text-red' : bal < 0 ? 'text-green' : '') + '">' + U.money(bal) + '</td>' +
              '<td><div class="row-actions">' +
                '<button class="icon-btn sm plain" title="كشف حساب" data-act="stmt" data-id="' + c.id + '">' + U.icon('eye') + '</button>' +
                '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + c.id + '">' + U.icon('edit') + '</button>' +
                '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + c.id + '">' + U.icon('trash') + '</button>' +
              '</div></td>' +
            '</tr>';
          }).join('') : h.emptyRow(6, 'لا يوجد ' + (isCust ? 'عملاء' : 'موردون') + ' مسجلون', 'users');
        }
        render();
        search.addEventListener('input', U.debounce(render, 150));

        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const act = btn.getAttribute('data-act');
          const id = btn.getAttribute('data-id');
          const c = id ? DB.state.contacts.filter(function (x) { return x.id === id; })[0] : null;
          if (act === 'add') { contactModal(null); return; }
          if (!c) return;
          if (act === 'edit') { contactModal(c); return; }
          if (act === 'stmt') { showStatement(c); return; }
          if (act === 'del') {
            const used = DB.state.invoices.some(function (i) { return i.contactId === id; });
            if (used) { U.toast('لا يمكن حذف طرف مرتبط بفواتير', 'error'); return; }
            U.confirm({ title: 'حذف', message: 'هل تريد حذف «' + c.name + '»؟', danger: true, okText: 'حذف' })
              .then(function (ok) {
                if (!ok) return;
                DB.state.contacts = DB.state.contacts.filter(function (x) { return x.id !== id; });
                DB.save();
                U.toast('تم الحذف');
                App.render();
              });
          }
        });
      }
    };
  };

  function showStatement(c) {
    const invoices = DB.state.invoices.filter(function (i) { return i.contactId === c.id; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    const rows = invoices.map(function (inv) {
      const t = Accounting.invoiceTotals(inv);
      return '<tr>' +
        '<td class="nowrap">' + U.fmtDate(inv.date) + '</td>' +
        '<td class="mono">' + U.esc(inv.no) + '</td>' +
        '<td>' + (inv.type === 'sale' ? U.badge('بيع', 'green') : U.badge('شراء', 'amber')) + '</td>' +
        '<td class="num">' + U.money(t.total) + '</td>' +
        '<td class="num text-green">' + U.money(inv.paidAmount) + '</td>' +
        '<td class="num">' + U.money(Accounting.outstanding(inv)) + '</td>' +
        '<td>' + h.invoiceStatus(inv) + '</td>' +
      '</tr>';
    }).join('');
    const bal = Accounting.contactBalance(c.id);
    U.modal({
      title: 'كشف حساب — ' + c.name,
      sub: (c.phone || '') + (c.city ? ' — ' + c.city : ''),
      size: 'lg',
      body:
        '<div class="kpi-inline mb-16">' +
          '<div class="k"><span>الرصيد الحالي</span><strong class="' + (bal > 0 ? 'text-red' : 'text-green') + '">' + U.money(bal) + ' ' + U.esc(U.cur()) + '</strong></div>' +
          '<div class="k"><span>عدد الفواتير</span><strong>' + invoices.length + '</strong></div>' +
          '<div class="k"><span>نوع الطرف</span><strong style="font-size:14px">' + (c.type === 'customer' ? 'عميل' : c.type === 'supplier' ? 'مورد' : 'عميل ومورد') + '</strong></div>' +
        '</div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>التاريخ</th><th>الفاتورة</th><th>النوع</th><th class="num">الإجمالي</th><th class="num">المدفوع</th><th class="num">المتبقي</th><th>الحالة</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7">' + U.empty('لا توجد فواتير', '', 'file') + '</td></tr>') + '</tbody></table></div>',
      footer: '<div class="spacer"></div><button class="btn" data-close>إغلاق</button>'
    });
  }

  /* ============================================================
     الأصناف والمخزون
     ============================================================ */
  App.views.items = function () {
    function itemModal(existing) {
      const it = existing || { code: '', name: '', unit: 'قطعة', cost: 0, price: 0, stock: 0, reorder: 0, taxRate: DB.state.settings.taxRate, active: true, service: false };
      const m = U.modal({
        title: existing ? 'تعديل صنف' : 'صنف جديد',
        size: 'lg',
        body:
          '<form id="item-form" class="form-grid cols-3">' +
            '<div class="field"><label>الكود *</label><input name="code" value="' + U.esc(it.code) + '" required></div>' +
            '<div class="field span-2"><label>اسم الصنف *</label><input name="name" value="' + U.esc(it.name) + '" required></div>' +
            '<div class="field"><label>الوحدة</label><input name="unit" value="' + U.esc(it.unit) + '"></div>' +
            '<div class="field"><label>سعر التكلفة</label><input type="number" step="0.01" min="0" name="cost" value="' + U.num(it.cost) + '"></div>' +
            '<div class="field"><label>سعر البيع</label><input type="number" step="0.01" min="0" name="price" value="' + U.num(it.price) + '"></div>' +
            '<div class="field"><label>الرصيد الحالي</label><input type="number" step="0.01" name="stock" value="' + U.num(it.stock) + '"' + (it.service ? ' disabled' : '') + '></div>' +
            '<div class="field"><label>حد إعادة الطلب</label><input type="number" step="0.01" min="0" name="reorder" value="' + U.num(it.reorder) + '"' + (it.service ? ' disabled' : '') + '></div>' +
            '<div class="field"><label>نسبة الضريبة %</label><input type="number" step="0.01" min="0" name="taxRate" value="' + U.num(it.taxRate) + '"></div>' +
            '<div class="field full"><label class="flex items-center gap-8" style="font-weight:600;color:var(--text)">' +
              '<input type="checkbox" name="service" style="width:auto"' + (it.service ? ' checked' : '') + '> صنف خدمي (لا يؤثر على المخزون)</label></div>' +
          '</form>',
        footer: '<div class="spacer"></div><button class="btn" type="button" data-close>إلغاء</button>' +
          '<button class="btn btn-primary" type="submit" form="item-form">حفظ</button>',
        onMount: function (el, close) {
          const f = el.querySelector('#item-form');
          f.service.addEventListener('change', function () {
            f.stock.disabled = f.service.checked;
            f.reorder.disabled = f.service.checked;
            if (f.service.checked) { f.stock.value = 0; f.reorder.value = 0; }
          });
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!f.code.value.trim() || !f.name.value.trim()) { U.toast('أكمل الحقول المطلوبة', 'error'); return; }
            const dup = DB.state.items.filter(function (x) { return x.code === f.code.value.trim() && x.id !== (existing ? existing.id : ''); });
            if (dup.length) { U.toast('كود الصنف مستخدم', 'error'); return; }
            const data = {
              code: f.code.value.trim(), name: f.name.value.trim(), unit: f.unit.value.trim() || 'قطعة',
              cost: U.num(f.cost.value), price: U.num(f.price.value), stock: U.num(f.stock.value),
              reorder: U.num(f.reorder.value), taxRate: U.num(f.taxRate.value), active: true,
              service: f.service.checked
            };
            if (existing) Object.assign(existing, data);
            else DB.state.items.push(Object.assign({ id: U.uid('itm') }, data));
            DB.save();
            close();
            U.toast('تم الحفظ');
            App.render();
          });
        }
      });
      void m;
    }

    const stockVal = Accounting.stockValue();

    return {
      title: 'المخزون والأصناف',
      sub: 'بطاقات الأصناف والأرصدة وقيمة المخزون',
      html:
        '<div class="grid grid-3 mb-16">' +
          h.stat({ label: 'قيمة المخزون بالتكلفة', value: stockVal.cost, icon: 'box', color: 'violet' }) +
          h.stat({ label: 'قيمة المخزون بسعر البيع', value: stockVal.retail, icon: 'trend', color: 'green' }) +
          h.stat({ label: 'هامش الربح المتوقع', value: stockVal.margin, icon: 'coins', color: 'blue' }) +
        '</div>' +
        '<div class="toolbar">' +
          '<div class="search-box">' + U.icon('search') + '<input type="search" id="item-search" placeholder="بحث بالاسم أو الكود..."></div>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-primary" data-act="add">' + U.icon('plus') + ' صنف جديد</button>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th class="num">التكلفة</th><th class="num">سعر البيع</th><th class="num">الرصيد</th><th class="num">قيمة المخزون</th><th></th></tr></thead>' +
          '<tbody id="item-body"></tbody>' +
        '</table></div></div>',

      mount: function (root) {
        const body = root.querySelector('#item-body');
        const search = root.querySelector('#item-search');
        function render() {
          const q = (search.value || '').trim().toLowerCase();
          const list = DB.state.items.filter(function (i) {
            return !q || (i.name + ' ' + i.code).toLowerCase().indexOf(q) > -1;
          });
          body.innerHTML = list.length ? list.map(function (i) {
            const low = !i.service && U.num(i.reorder) > 0 && U.num(i.stock) <= U.num(i.reorder);
            return '<tr>' +
              '<td class="mono small">' + U.esc(i.code) + '</td>' +
              '<td><span class="strong">' + U.esc(i.name) + '</span>' +
                (i.service ? ' ' + U.badge('خدمة', 'blue') : '') +
                (low ? ' ' + U.badge('إعادة طلب', 'red') : '') + '</td>' +
              '<td class="muted">' + U.esc(i.unit) + '</td>' +
              '<td class="num">' + U.money(i.cost) + '</td>' +
              '<td class="num">' + U.money(i.price) + '</td>' +
              '<td class="num ' + (low ? 'text-red strong' : '') + '">' + (i.service ? '—' : U.qty(i.stock)) + '</td>' +
              '<td class="num">' + (i.service ? '—' : U.money(U.num(i.stock) * U.num(i.cost))) + '</td>' +
              '<td><div class="row-actions">' +
                '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + i.id + '">' + U.icon('edit') + '</button>' +
                '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + i.id + '">' + U.icon('trash') + '</button>' +
              '</div></td>' +
            '</tr>';
          }).join('') : h.emptyRow(8, 'لا توجد أصناف', 'box');
        }
        render();
        search.addEventListener('input', U.debounce(render, 150));
        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const act = btn.getAttribute('data-act');
          const id = btn.getAttribute('data-id');
          const it = id ? DB.state.items.filter(function (x) { return x.id === id; })[0] : null;
          if (act === 'add') { itemModal(null); return; }
          if (!it) return;
          if (act === 'edit') { itemModal(it); return; }
          if (act === 'del') {
            const used = DB.state.invoices.some(function (inv) {
              return (inv.lines || []).some(function (l) { return l.itemId === id; });
            });
            if (used) { U.toast('لا يمكن حذف صنف مستخدم في فواتير', 'error'); return; }
            U.confirm({ title: 'حذف الصنف', message: 'هل تريد حذف «' + it.name + '»؟', danger: true, okText: 'حذف' })
              .then(function (ok) {
                if (!ok) return;
                DB.state.items = DB.state.items.filter(function (x) { return x.id !== id; });
                DB.save();
                U.toast('تم الحذف');
                App.render();
              });
          }
        });
      }
    };
  };
})(window);
