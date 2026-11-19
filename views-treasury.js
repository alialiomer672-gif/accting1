/* ============================================================
   المحاسب — الخزينة: سندات القبض والصرف والمصروفات
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.App;
  const h = App.h;

  function printVoucher(p) {
    const s = DB.state.settings;
    const party = Accounting.contact(p.contactId);
    const acc = Accounting.account(p.accountId);
    const body =
      '<table style="font-size:12px"><tbody>' +
        '<tr><th style="width:32%">رقم السند</th><td>' + U.esc(p.no) + '</td></tr>' +
        '<tr><th>التاريخ</th><td>' + U.fmtDate(p.date) + '</td></tr>' +
        '<tr><th>الطرف</th><td>' + U.esc(party ? party.name : '—') + '</td></tr>' +
        '<tr><th>الحساب</th><td>' + U.esc(acc ? acc.code + ' — ' + acc.name : '—') + '</td></tr>' +
        '<tr><th>المبلغ</th><td><strong>' + U.money(p.amount) + ' ' + U.esc(s.currency) + '</strong></td></tr>' +
        '<tr><th>المبلغ كتابةً</th><td>' + U.esc(U.amountInWords(p.amount)) + '</td></tr>' +
        (p.notes ? '<tr><th>الملاحظات</th><td>' + U.esc(p.notes) + '</td></tr>' : '') +
      '</tbody></table>' +
      '<div style="display:flex;justify-content:space-between;margin-top:50px;font-size:11.5px">' +
        '<div style="text-align:center;width:40%">توقيع المستلم</div>' +
        '<div style="text-align:center;width:40%">توقيع أمين الصندوق</div>' +
      '</div>';
    h.printDoc((p.type === 'receipt' ? 'سند قبض' : 'سند صرف') + ' رقم ' + p.no, 'التاريخ: ' + U.fmtDate(p.date), body);
  }

  App.h.printVoucher = printVoucher;

  /* ============================================================
     قائمة السندات
     ============================================================ */
  App.views.payments = function (params) {
    const type = (params && params.type) === 'payment' ? 'payment' : 'receipt';
    const isReceipt = type === 'receipt';
    const list = Accounting.paymentList(type);
    const total = U.round2(list.reduce(function (a, p) { return a + U.num(p.amount); }, 0));

    return {
      title: isReceipt ? 'سندات القبض' : 'سندات الصرف',
      sub: isReceipt ? 'المبالغ المحصلة من العملاء' : 'المبالغ المدفوعة للموردين',
      html:
        '<div class="toolbar">' +
          '<div class="seg">' +
            '<a href="#/payments?type=receipt" class="' + (isReceipt ? 'active' : '') + '">سندات القبض</a>' +
            '<a href="#/payments?type=payment" class="' + (!isReceipt ? 'active' : '') + '">سندات الصرف</a>' +
          '</div>' +
          '<div class="spacer"></div>' +
          '<span class="chip">الإجمالي: ' + U.money(total) + ' ' + U.esc(U.cur()) + '</span>' +
          '<a class="btn btn-primary" href="#/payment/new?type=' + type + '">' + U.icon('plus') + ' سند جديد</a>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الرقم</th><th>التاريخ</th><th>الطرف</th><th>الفاتورة</th><th>الحساب</th><th class="num">المبلغ</th><th>ملاحظات</th><th></th></tr></thead>' +
          '<tbody>' +
            (list.length ? list.map(function (p) {
              const c = Accounting.contact(p.contactId);
              const inv = p.invoiceId ? DB.state.invoices.filter(function (i) { return i.id === p.invoiceId; })[0] : null;
              const acc = Accounting.account(p.accountId);
              return '<tr>' +
                '<td class="mono strong">' + U.esc(p.no) + '</td>' +
                '<td class="nowrap">' + U.fmtDate(p.date) + '</td>' +
                '<td>' + U.esc(c ? c.name : '—') + '</td>' +
                '<td class="mono small">' + (inv ? U.esc(inv.no) : '<span class="muted">على الحساب</span>') + '</td>' +
                '<td class="small">' + U.esc(acc ? acc.name : '—') + '</td>' +
                '<td class="num strong ' + (isReceipt ? 'text-green' : 'text-red') + '">' + U.money(p.amount) + '</td>' +
                '<td class="muted small">' + U.esc(p.notes || '—') + '</td>' +
                '<td><div class="row-actions">' +
                  '<button class="icon-btn sm plain" title="طباعة" data-act="print" data-id="' + p.id + '">' + U.icon('print') + '</button>' +
                  '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + p.id + '">' + U.icon('trash') + '</button>' +
                '</div></td>' +
              '</tr>';
            }).join('') : h.emptyRow(8, 'لا توجد سندات مسجلة', 'receipt')) +
          '</tbody>' +
        '</table></div></div>',

      mount: function (root) {
        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const id = btn.getAttribute('data-id');
          const p = DB.state.payments.filter(function (x) { return x.id === id; })[0];
          if (!p) return;
          if (btn.getAttribute('data-act') === 'print') { printVoucher(p); return; }
          U.confirm({ title: 'حذف السند', message: 'هل تريد حذف السند ' + p.no + '؟ سيُعكس أثره في القيود والأرصدة.', danger: true, okText: 'حذف' })
            .then(function (ok) {
              if (!ok) return;
              Accounting.deletePayment(p);
              U.toast('تم حذف السند');
              App.render();
            });
        });
      }
    };
  };

  /* ============================================================
     سند جديد
     ============================================================ */
  App.views.paymentNew = function (params) {
    const type = (params && params.type) === 'payment' ? 'payment' : 'receipt';
    const isReceipt = type === 'receipt';
    const s = DB.state.settings;
    const contacts = DB.state.contacts.filter(function (c) {
      return isReceipt ? (c.type === 'customer' || c.type === 'both') : (c.type === 'supplier' || c.type === 'both');
    });

    return {
      title: isReceipt ? 'سند قبض جديد' : 'سند صرف جديد',
      sub: isReceipt ? 'تحصيل مبلغ من عميل' : 'صرف مبلغ لمورد',
      html:
        '<form id="pm-form" class="form-grid" style="max-width:820px">' +
          '<div class="card full"><div class="card-body"><div class="form-grid">' +
            '<div class="field"><label>التاريخ *</label><input type="date" name="date" value="' + U.today() + '" required></div>' +
            '<div class="field"><label>المبلغ *</label><input type="number" step="0.01" min="0.01" name="amount" placeholder="0.00" required></div>' +
            '<div class="field"><label>' + (isReceipt ? 'العميل *' : 'المورد *') + '</label>' +
              '<select name="contactId" required><option value="">— اختر —</option>' +
                contacts.map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.name) + '</option>'; }).join('') +
              '</select></div>' +
            '<div class="field"><label>الفاتورة المرتبطة</label><select name="invoiceId"><option value="">— بدون فاتورة (على الحساب) —</option></select></div>' +
            '<div class="field"><label>الحساب ' + (isReceipt ? 'المستلم' : 'المدفوع منه') + ' *</label><select name="accountId">' +
              '<option value="' + s.accounts.bank + '">البنك</option>' +
              '<option value="' + s.accounts.cash + '">الصندوق (النقدية)</option>' +
            '</select></div>' +
            '<div class="field"><label>ملاحظات</label><input type="text" name="notes" placeholder="اختياري"></div>' +
          '</div></div></div>' +
          '<div class="toolbar full" style="justify-content:flex-end">' +
            '<a class="btn" href="#/payments?type=' + type + '">إلغاء</a>' +
            '<button class="btn btn-primary" type="submit">' + U.icon('check') + ' حفظ السند</button>' +
          '</div>' +
        '</form>',

      mount: function (root) {
        const form = root.querySelector('#pm-form');
        const invSel = form.invoiceId;
        const typeKey = isReceipt ? 'sale' : 'purchase';

        function refreshInvoices() {
          const contactId = form.contactId.value;
          const list = DB.state.invoices.filter(function (inv) {
            return inv.type === typeKey && inv.status === 'posted' && Accounting.outstanding(inv) > 0.004 &&
              (!contactId || inv.contactId === contactId);
          });
          invSel.innerHTML = '<option value="">— بدون فاتورة (على الحساب) —</option>' + list.map(function (inv) {
            const c = Accounting.contact(inv.contactId);
            return '<option value="' + inv.id + '" data-out="' + Accounting.outstanding(inv) + '">' +
              U.esc(inv.no + ' — ' + (c ? c.name : '') + ' — متبقي ' + U.money(Accounting.outstanding(inv))) + '</option>';
          }).join('');
        }
        refreshInvoices();

        form.contactId.addEventListener('change', refreshInvoices);
        invSel.addEventListener('change', function () {
          const opt = invSel.options[invSel.selectedIndex];
          if (opt && opt.getAttribute('data-out')) form.amount.value = opt.getAttribute('data-out');
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const amount = U.round2(U.num(form.amount.value));
          if (amount <= 0) { U.toast('أدخل مبلغاً صحيحاً', 'error'); return; }
          if (!form.contactId.value) { U.toast('اختر الطرف', 'error'); return; }
          const p = {
            id: U.uid('pm'),
            no: DB.nextNo(isReceipt ? 'receipt' : 'payment', isReceipt ? s.prefixes.receipt : s.prefixes.payment),
            type: type,
            date: form.date.value,
            contactId: form.contactId.value,
            invoiceId: form.invoiceId.value || null,
            amount: amount,
            accountId: form.accountId.value,
            notes: form.notes.value.trim(),
            status: 'draft',
            createdAt: new Date().toISOString()
          };
          DB.state.payments.push(p);
          try {
            Accounting.postPayment(p);
            U.toast('تم حفظ السند وترحيله');
            location.hash = '#/payments?type=' + type;
          } catch (err) {
            DB.state.payments = DB.state.payments.filter(function (x) { return x.id !== p.id; });
            U.toast(err.message, 'error');
          }
        });
      }
    };
  };

  /* ============================================================
     المصروفات
     ============================================================ */
  App.views.expenses = function (params) {
    const expAccounts = Accounting.leaves().filter(function (a) { return a.type === 'expense'; });
    const s = DB.state.settings;
    const yearStart = U.startOfYear();
    const yearTotal = U.round2(DB.state.expenses.filter(function (e) {
      return e.date >= yearStart;
    }).reduce(function (a, e) { return a + U.num(e.amount) + U.num(e.taxAmount); }, 0));

    function expenseModal(existing) {
      const e = existing || {
        date: U.today(), accountId: '', amount: 0, taxAmount: 0,
        paymentAccountId: s.accounts.cash, description: '', ref: ''
      };
      const m = U.modal({
        title: existing ? 'تعديل مصروف' : 'تسجيل مصروف',
        size: 'lg',
        body:
          '<form id="exp-form" class="form-grid">' +
            '<div class="field"><label>التاريخ *</label><input type="date" name="date" value="' + e.date + '" required></div>' +
            '<div class="field"><label>حساب المصروف *</label><select name="accountId" required>' +
              Accounting.accountOptions(e.accountId, function (a) { return a.type === 'expense' && !a.isGroup; }) +
            '</select></div>' +
            '<div class="field"><label>المبلغ قبل الضريبة *</label><input type="number" step="0.01" min="0.01" name="amount" value="' + (U.num(e.amount) || '') + '" required></div>' +
            '<div class="field"><label>ضريبة القيمة المضافة</label><input type="number" step="0.01" min="0" name="taxAmount" value="' + U.num(e.taxAmount) + '"></div>' +
            '<div class="field"><label>حساب الدفع</label><select name="paymentAccountId">' +
              '<option value="' + s.accounts.cash + '"' + (e.paymentAccountId === s.accounts.cash ? ' selected' : '') + '>الصندوق (النقدية)</option>' +
              '<option value="' + s.accounts.bank + '"' + (e.paymentAccountId === s.accounts.bank ? ' selected' : '') + '>البنك</option>' +
            '</select></div>' +
            '<div class="field full"><label>الوصف *</label><input name="description" value="' + U.esc(e.description) + '" placeholder="وصف المصروف" required></div>' +
            '<div class="field full"><label>مرجع خارجي</label><input name="ref" value="' + U.esc(e.ref) + '" placeholder="رقم فاتورة المورد أو إيصال"></div>' +
          '</form>',
        footer: '<div class="spacer"></div><button class="btn" type="button" data-close>إلغاء</button>' +
          '<button class="btn btn-primary" type="submit" form="exp-form">حفظ وترحيل</button>',
        onMount: function (el, close) {
          el.querySelector('#exp-form').addEventListener('submit', function (ev) {
            ev.preventDefault();
            const f = ev.target;
            const amount = U.round2(U.num(f.amount.value));
            if (amount <= 0) { U.toast('أدخل مبلغاً صحيحاً', 'error'); return; }
            if (!f.accountId.value) { U.toast('اختر حساب المصروف', 'error'); return; }
            if (existing) {
              const old = Object.assign({}, existing);
              existing.date = f.date.value;
              existing.accountId = f.accountId.value;
              existing.amount = amount;
              existing.taxAmount = U.num(f.taxAmount.value);
              existing.paymentAccountId = f.paymentAccountId.value;
              existing.description = f.description.value.trim();
              existing.ref = f.ref.value.trim();
              if (old.entryId) {
                const idx = DB.state.journals.findIndex(function (j) { return j.id === old.entryId; });
                if (idx > -1) DB.state.journals.splice(idx, 1);
              }
            } else {
              existing = null;
            }
            let e2 = existing;
            if (!e2) {
              e2 = {
                id: U.uid('ex'), no: DB.nextNo('expense', s.prefixes.expense),
                date: f.date.value, accountId: f.accountId.value, amount: amount,
                taxAmount: U.num(f.taxAmount.value), paymentAccountId: f.paymentAccountId.value,
                description: f.description.value.trim(), ref: f.ref.value.trim(),
                status: 'draft', entryId: null, createdAt: new Date().toISOString()
              };
              DB.state.expenses.push(e2);
            }
            try {
              Accounting.postExpense(e2);
              close();
              U.toast('تم حفظ المصروف وترحيله');
              App.render();
            } catch (err) {
              U.toast(err.message, 'error');
            }
          });
        }
      });
      void m;
    }

    return {
      title: 'المصروفات',
      sub: 'تسجيل مصروفات التشغيل وترحيلها إلى القيود',
      html:
        '<div class="toolbar">' +
          '<span class="chip">مصروفات السنة: ' + U.money(yearTotal) + ' ' + U.esc(U.cur()) + '</span>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-primary" data-act="add">' + U.icon('plus') + ' تسجيل مصروف</button>' +
        '</div>' +
        '<div class="card"><div class="table-wrap"><table class="data">' +
          '<thead><tr><th>الرقم</th><th>التاريخ</th><th>حساب المصروف</th><th>الوصف</th><th>المرجع</th><th class="num">المبلغ</th><th class="num">ضريبة</th><th class="num">الإجمالي</th><th></th></tr></thead>' +
          '<tbody>' +
            (DB.state.expenses.length ? Accounting.expenseList().map(function (e) {
              const acc = Accounting.account(e.accountId);
              const pay = Accounting.account(e.paymentAccountId);
              return '<tr>' +
                '<td class="mono strong">' + U.esc(e.no) + '</td>' +
                '<td class="nowrap">' + U.fmtDate(e.date) + '</td>' +
                '<td>' + U.esc(acc ? acc.name : '—') + '</td>' +
                '<td>' + U.esc(e.description) + (pay ? '<div class="muted small">مدفوع من: ' + U.esc(pay.name) + '</div>' : '') + '</td>' +
                '<td class="muted small">' + U.esc(e.ref || '—') + '</td>' +
                '<td class="num">' + U.money(e.amount) + '</td>' +
                '<td class="num">' + U.money(e.taxAmount) + '</td>' +
                '<td class="num strong">' + U.money(U.num(e.amount) + U.num(e.taxAmount)) + '</td>' +
                '<td><div class="row-actions">' +
                  '<button class="icon-btn sm plain" title="تعديل" data-act="edit" data-id="' + e.id + '">' + U.icon('edit') + '</button>' +
                  '<button class="icon-btn sm plain danger" title="حذف" data-act="del" data-id="' + e.id + '">' + U.icon('trash') + '</button>' +
                '</div></td>' +
              '</tr>';
            }).join('') : h.emptyRow(9, 'لا توجد مصروفات مسجلة', 'expense')) +
          '</tbody>' +
        '</table></div></div>',

      mount: function (root) {
        root.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          const act = btn.getAttribute('data-act');
          if (act === 'add') { expenseModal(null); return; }
          const id = btn.getAttribute('data-id');
          const ex = DB.state.expenses.filter(function (x) { return x.id === id; })[0];
          if (!ex) return;
          if (act === 'edit') { expenseModal(ex); return; }
          if (act === 'del') {
            U.confirm({ title: 'حذف المصروف', message: 'هل تريد حذف المصروف ' + ex.no + '؟ سيُحذف القيد المرتبط.', danger: true, okText: 'حذف' })
              .then(function (ok) {
                if (!ok) return;
                Accounting.deleteExpense(ex);
                U.toast('تم الحذف');
                App.render();
              });
          }
        });
      }
    };
  };
})(window);
