/* ============================================================
   المحاسب — محرك المحاسبة (قيود، أرصدة، تقارير)
   ============================================================ */
(function (global) {
  'use strict';

  const AC = {};
  const r2 = U.round2;

  function st() { return DB.state; }
  function cfg() { return st().settings; }

  /* ---------------- الحسابات ---------------- */
  AC.account = function (id) {
    return st().accounts.filter(function (a) { return a.id === id; })[0] || null;
  };

  AC.byCode = function (code) {
    return st().accounts.filter(function (a) { return String(a.code) === String(code); })[0] || null;
  };

  AC.accounts = function () { return st().accounts; };

  AC.leaves = function () {
    return st().accounts.filter(function (a) { return !a.isGroup; });
  };

  AC.normalSide = function (acc) {
    if (!acc) return 'debit';
    return acc.type === 'asset' || acc.type === 'expense' ? 'debit' : 'credit';
  };

  AC.tree = function () {
    const map = {};
    const roots = [];
    st().accounts.forEach(function (a) { map[a.id] = Object.assign({}, a, { children: [] }); });
    Object.keys(map).forEach(function (id) {
      const a = map[id];
      if (a.parent && map[a.parent]) map[a.parent].children.push(a);
      else roots.push(a);
    });
    const sortRec = function (arr) {
      arr.sort(function (x, y) { return String(x.code).localeCompare(String(y.code), 'en', { numeric: true }); });
      arr.forEach(function (a) { sortRec(a.children); });
    };
    sortRec(roots);
    return roots;
  };

  AC.flat = function () {
    const out = [];
    const walk = function (nodes, depth) {
      nodes.forEach(function (n) {
        out.push({ acc: n, depth: depth });
        if (n.children && n.children.length) walk(n.children, depth + 1);
      });
    };
    walk(AC.tree(), 0);
    return out;
  };

  AC.accountOptions = function (selected, filter, placeholder) {
    let html = '<option value="">' + U.esc(placeholder || '— اختر الحساب —') + '</option>';
    AC.flat().forEach(function (row) {
      const a = row.acc;
      if (filter && !filter(a)) return;
      const pad = new Array(row.depth + 1).join('&nbsp;&nbsp;&nbsp;');
      html += '<option value="' + U.esc(a.id) + '"' + (a.id === selected ? ' selected' : '') + (a.isGroup ? ' disabled' : '') + '>' +
        pad + U.esc(a.code + ' — ' + a.name) + (a.isGroup ? '  (مجموعة)' : '') + '</option>';
    });
    return html;
  };

  AC.typeLabel = function (t) {
    return ({ asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' })[t] || t;
  };

  AC.typeColor = function (t) {
    return ({ asset: 'blue', liability: 'red', equity: 'violet', revenue: 'green', expense: 'amber' })[t] || 'gray';
  };

  /* ---------------- حركة الحسابات ---------------- */
  AC.journals = function () {
    return st().journals.slice().sort(function (a, b) {
      if (a.date === b.date) return String(a.no).localeCompare(String(b.no), 'en', { numeric: true });
      return a.date < b.date ? -1 : 1;
    });
  };

  AC.raw = function (accountId, from, to) {
    let dr = 0, cr = 0;
    st().journals.forEach(function (je) {
      if (from && je.date < from) return;
      if (to && je.date > to) return;
      je.lines.forEach(function (l) {
        if (l.accountId !== accountId) return;
        dr += U.num(l.debit);
        cr += U.num(l.credit);
      });
    });
    return { debit: r2(dr), credit: r2(cr), net: r2(dr - cr) };
  };

  AC.balance = function (accountId, opts) {
    const o = opts || {};
    const from = o.from || null;
    const to = o.to || null;
    const acc = AC.account(accountId);
    const raw = AC.raw(accountId, from, to);
    return AC.normalSide(acc) === 'debit' ? raw.net : -raw.net;
  };

  AC.typeTotal = function (type, from, to) {
    let t = 0;
    AC.leaves().forEach(function (a) {
      if (a.type !== type) return;
      t += AC.balance(a.id, { from: from, to: to });
    });
    return r2(t);
  };

  AC.ledger = function (accountId, from, to) {
    const acc = AC.account(accountId);
    const side = AC.normalSide(acc);
    let opening = 0;
    const rows = [];
    AC.journals().forEach(function (je) {
      let dr = 0, cr = 0, desc = [];
      je.lines.forEach(function (l) {
        if (l.accountId !== accountId) return;
        dr += U.num(l.debit);
        cr += U.num(l.credit);
        if (l.note) desc.push(l.note);
      });
      if (!dr && !cr) return;
      const delta = side === 'debit' ? dr - cr : cr - dr;
      if (from && je.date < from) { opening += delta; return; }
      if (to && je.date > to) return;
      rows.push({
        id: je.id, no: je.no, date: je.date, description: je.description,
        ref: je.ref || '', note: desc.join(' — '),
        debit: r2(dr), credit: r2(cr), delta: r2(delta)
      });
    });
    let running = r2(opening);
    rows.forEach(function (row) { running = r2(running + row.delta); row.balance = running; });
    return { account: acc, opening: r2(opening), rows: rows, closing: r2(running) };
  };

  /* ---------------- ميزان المراجعة ---------------- */
  AC.trialBalance = function (from, to) {
    const before = from ? U.addDays(from, -1) : null;
    const rows = [];
    AC.leaves().forEach(function (a) {
      const open = AC.raw(a.id, null, before);
      const move = AC.raw(a.id, from, to);
      const closeNet = r2(open.net + move.net);
      if (!open.net && !move.debit && !move.credit && !closeNet) return;
      rows.push({
        account: a,
        openDebit: open.net > 0 ? open.net : 0,
        openCredit: open.net < 0 ? -open.net : 0,
        debit: move.debit,
        credit: move.credit,
        closeDebit: closeNet > 0 ? closeNet : 0,
        closeCredit: closeNet < 0 ? -closeNet : 0
      });
    });
    const tot = { openDebit: 0, openCredit: 0, debit: 0, credit: 0, closeDebit: 0, closeCredit: 0 };
    rows.forEach(function (r) {
      tot.openDebit += r.openDebit; tot.openCredit += r.openCredit;
      tot.debit += r.debit; tot.credit += r.credit;
      tot.closeDebit += r.closeDebit; tot.closeCredit += r.closeCredit;
    });
    Object.keys(tot).forEach(function (k) { tot[k] = r2(tot[k]); });
    return { rows: rows, totals: tot };
  };

  /* ---------------- قائمة الدخل ---------------- */
  AC.incomeStatement = function (from, to) {
    const revenue = [], cogs = [], opex = [], other = [];
    AC.leaves().forEach(function (a) {
      if (a.type !== 'revenue' && a.type !== 'expense') return;
      const amt = AC.balance(a.id, { from: from, to: to });
      if (!amt) return;
      const row = { account: a, amount: amt };
      if (a.type === 'revenue') {
        if (String(a.code).indexOf('49') === 0) other.push(row); else revenue.push(row);
      } else if (String(a.code).indexOf('51') === 0) cogs.push(row);
      else opex.push(row);
    });
    const sum = function (arr) { return r2(arr.reduce(function (x, r) { return x + r.amount; }, 0)); };
    const revTotal = sum(revenue);
    const otherTotal = sum(other);
    const cogsTotal = sum(cogs);
    const opexTotal = sum(opex);
    const gross = r2(revTotal - cogsTotal);
    const operating = r2(gross - opexTotal);
    const net = r2(operating + otherTotal);
    return {
      revenue: revenue, other: other, cogs: cogs, opex: opex,
      revenueTotal: revTotal, otherTotal: otherTotal,
      cogsTotal: cogsTotal, opexTotal: opexTotal,
      grossProfit: gross, operatingProfit: operating, netProfit: net
    };
  };

  AC.netProfit = function (from, to) {
    return AC.incomeStatement(from, to).netProfit;
  };

  /* ---------------- الميزانية العمومية ---------------- */
  AC.balanceSheet = function (asOf) {
    const end = asOf || U.today();
    const yearStart = U.startOfYear(end);
    const group = function (type) {
      const rows = [];
      AC.leaves().forEach(function (a) {
        if (a.type !== type) return;
        const amt = AC.balance(a.id, { to: end });
        if (!amt && !a.isGroup) return;
        rows.push({ account: a, amount: amt });
      });
      return rows;
    };
    const assets = group('asset');
    const liabilities = group('liability');
    const equity = group('equity');
    const sum = function (arr) { return r2(arr.reduce(function (x, r) { return x + r.amount; }, 0)); };

    const priorNet = r2(AC.netProfit(null, U.addDays(yearStart, -1)));
    const currentNet = r2(AC.netProfit(yearStart, end));

    const assetsTotal = sum(assets);
    const liabilitiesTotal = sum(liabilities);
    const equityAccountsTotal = sum(equity);
    const equityTotal = r2(equityAccountsTotal + priorNet + currentNet);

    return {
      asOf: end,
      assets: assets, assetsTotal: assetsTotal,
      liabilities: liabilities, liabilitiesTotal: liabilitiesTotal,
      equity: equity, equityAccountsTotal: equityAccountsTotal,
      priorNet: priorNet, currentNet: currentNet, equityTotal: equityTotal,
      totalLiabilitiesEquity: r2(liabilitiesTotal + equityTotal),
      difference: r2(assetsTotal - liabilitiesTotal - equityTotal)
    };
  };

  /* ---------------- الفواتير ---------------- */
  AC.getItem = function (id) {
    return st().items.filter(function (i) { return i.id === id; })[0] || null;
  };

  AC.contact = function (id) {
    return st().contacts.filter(function (c) { return c.id === id; })[0] || null;
  };

  AC.invoiceTotals = function (inv) {
    let subtotal = 0, tax = 0, cogs = 0, discount = 0;
    (inv.lines || []).forEach(function (l) {
      const base = U.num(l.qty) * U.num(l.price);
      const disc = U.num(l.discount);
      const net = Math.max(0, base - disc);
      subtotal += net;
      discount += disc;
      tax += net * U.num(l.taxRate) / 100;
      const it = AC.getItem(l.itemId);
      cogs += U.num(l.qty) * (it ? U.num(it.cost) : 0);
    });
    subtotal = r2(subtotal);
    tax = r2(tax);
    return { subtotal: subtotal, tax: tax, total: r2(subtotal + tax), cogs: r2(cogs), discount: r2(discount) };
  };

  AC.invoiceList = function (type) {
    return st().invoices.filter(function (i) { return !type || i.type === type; })
      .sort(function (a, b) { return a.date === b.date ? (a.no < b.no ? 1 : -1) : (a.date < b.date ? 1 : -1); });
  };

  AC.outstanding = function (inv) {
    return r2(AC.invoiceTotals(inv).total - U.num(inv.paidAmount));
  };

  AC.contactBalance = function (contactId) {
    const c = AC.contact(contactId);
    if (!c) return 0;
    let bal = 0;
    st().invoices.forEach(function (inv) {
      if (inv.contactId !== contactId || inv.status !== 'posted') return;
      if (c.type === 'customer' || (c.type === 'both' && inv.type === 'sale')) {
        if (inv.type === 'sale') bal += AC.outstanding(inv);
      }
      if (c.type === 'supplier' || (c.type === 'both' && inv.type === 'purchase')) {
        if (inv.type === 'purchase') bal -= AC.outstanding(inv);
      }
    });
    return r2(bal);
  };

  function adjustStock(inv, sign) {
    (inv.lines || []).forEach(function (l) {
      const it = AC.getItem(l.itemId);
      if (!it || it.service) return;
      const q = U.num(l.qty) * sign;
      if (inv.type === 'purchase' && sign > 0) {
        inv._prevCosts = inv._prevCosts || {};
        if (!(l.itemId in inv._prevCosts)) inv._prevCosts[l.itemId] = U.num(it.cost);
      }
      if (inv.type === 'purchase' && sign < 0 && inv._prevCosts && (l.itemId in inv._prevCosts)) {
        it.cost = r2(inv._prevCosts[l.itemId]);
      }
      it.stock = r2(U.num(it.stock) + q);
      if (inv.type === 'purchase' && sign > 0 && U.num(l.price) > 0) {
        const oldQty = Math.max(0, U.num(it.stock) - q);
        const oldCost = U.num(it.cost);
        const newQty = oldQty + q;
        if (newQty > 0) it.cost = r2((oldQty * oldCost + q * U.num(l.price)) / newQty);
      }
    });
  }

  AC.postInvoice = function (inv, opts) {
    if (!inv) throw new Error('الفاتورة غير موجودة');
    if (inv.status === 'posted') return inv;
    if (!inv.lines || !inv.lines.length) throw new Error('لا يمكن ترحيل فاتورة بدون بنود');
    if (!inv.contactId) throw new Error('يرجى تحديد العميل أو المورد');
    const c = cfg().accounts;
    const t = AC.invoiceTotals(inv);
    if (t.total <= 0) throw new Error('إجمالي الفاتورة صفر');
    const lines = [];

    if (inv.type === 'sale') {
      lines.push({ accountId: c.ar, debit: t.total, credit: 0, note: inv.no });
      lines.push({ accountId: c.sales, debit: 0, credit: t.subtotal, note: inv.no });
      if (t.tax) lines.push({ accountId: c.vat, debit: 0, credit: t.tax, note: inv.no });
      if (t.cogs > 0) {
        lines.push({ accountId: c.cogs, debit: t.cogs, credit: 0, note: 'تكلفة ' + inv.no });
        lines.push({ accountId: c.inventory, debit: 0, credit: t.cogs, note: 'تكلفة ' + inv.no });
      }
    } else {
      lines.push({ accountId: c.inventory, debit: t.subtotal, credit: 0, note: inv.no });
      if (t.tax) lines.push({ accountId: c.vat, debit: t.tax, credit: 0, note: inv.no });
      lines.push({ accountId: c.ap, debit: 0, credit: t.total, note: inv.no });
    }

    const party = AC.contact(inv.contactId);
    const je = AC.createJournal({
      date: inv.date,
      description: (inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء') + ' رقم ' + inv.no + (party ? ' — ' + party.name : ''),
      ref: inv.no,
      lines: lines,
      source: { type: 'invoice', id: inv.id }
    });

    inv.entryId = je.id;
    inv.status = 'posted';
    inv.postedAt = new Date().toISOString();
    adjustStock(inv, inv.type === 'sale' ? -1 : 1);
    if (!opts || !opts.silent) DB.save();
    return inv;
  };

  AC.unpostInvoice = function (inv) {
    if (!inv || inv.status !== 'posted') return inv;
    if (U.num(inv.paidAmount) > 0.004) throw new Error('لا يمكن إلغاء ترحيل فاتورة عليها دفعات. احذف السندات المرتبطة أولاً.');
    if (inv.entryId) {
      const idx = st().journals.findIndex(function (j) { return j.id === inv.entryId; });
      if (idx > -1) st().journals.splice(idx, 1);
    }
    adjustStock(inv, inv.type === 'sale' ? 1 : -1);
    inv._prevCosts = null;
    inv.status = 'draft';
    inv.entryId = null;
    DB.save();
    return inv;
  };

  AC.deleteInvoice = function (inv) {
    if (!inv) return;
    if (inv.status === 'posted') {
      if (U.num(inv.paidAmount) > 0.004) throw new Error('احذف سندات القبض/الصرف المرتبطة بالفاتورة أولاً');
      if (inv.entryId) {
        const idx = st().journals.findIndex(function (j) { return j.id === inv.entryId; });
        if (idx > -1) st().journals.splice(idx, 1);
      }
      adjustStock(inv, inv.type === 'sale' ? 1 : -1);
    }
    st().invoices = st().invoices.filter(function (i) { return i.id !== inv.id; });
    DB.save();
  };

  /* ---------------- السندات ---------------- */
  AC.paymentList = function (type) {
    return st().payments.filter(function (p) { return !type || p.type === type; })
      .sort(function (a, b) { return a.date === b.date ? (a.no < b.no ? 1 : -1) : (a.date < b.date ? 1 : -1); });
  };

  AC.postPayment = function (p, opts) {
    const c = cfg().accounts;
    const amount = r2(U.num(p.amount));
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');
    if (!p.contactId) throw new Error('يرجى تحديد العميل أو المورد');
    const accountId = p.accountId || c.bank;
    const lines = p.type === 'receipt'
      ? [{ accountId: accountId, debit: amount, credit: 0 }, { accountId: c.ar, debit: 0, credit: amount }]
      : [{ accountId: c.ap, debit: amount, credit: 0 }, { accountId: accountId, debit: 0, credit: amount }];

    const party = AC.contact(p.contactId);
    const je = AC.createJournal({
      date: p.date,
      description: (p.type === 'receipt' ? 'سند قبض' : 'سند صرف') + ' رقم ' + p.no + (party ? ' — ' + party.name : ''),
      ref: p.no,
      lines: lines,
      source: { type: p.type, id: p.id }
    });
    p.entryId = je.id;
    p.status = 'posted';

    if (p.invoiceId) {
      const inv = st().invoices.filter(function (i) { return i.id === p.invoiceId; })[0];
      if (inv) {
        inv.paidAmount = r2(U.num(inv.paidAmount) + amount);
        if (inv.paidAmount > AC.invoiceTotals(inv).total) {
          inv.paidAmount = AC.invoiceTotals(inv).total;
        }
      }
    }
    if (!opts || !opts.silent) DB.save();
    return p;
  };

  AC.deletePayment = function (p) {
    if (!p) return;
    if (p.entryId) {
      const idx = st().journals.findIndex(function (j) { return j.id === p.entryId; });
      if (idx > -1) st().journals.splice(idx, 1);
    }
    if (p.invoiceId) {
      const inv = st().invoices.filter(function (i) { return i.id === p.invoiceId; })[0];
      if (inv) inv.paidAmount = r2(Math.max(0, U.num(inv.paidAmount) - U.num(p.amount)));
    }
    st().payments = st().payments.filter(function (x) { return x.id !== p.id; });
    DB.save();
  };

  /* ---------------- المصروفات ---------------- */
  AC.expenseList = function () {
    return st().expenses.slice().sort(function (a, b) {
      return a.date === b.date ? (a.no < b.no ? 1 : -1) : (a.date < b.date ? 1 : -1);
    });
  };

  AC.postExpense = function (e, opts) {
    const amount = r2(U.num(e.amount));
    const tax = r2(U.num(e.taxAmount));
    if (amount <= 0) throw new Error('قيمة المصروف يجب أن تكون أكبر من صفر');
    if (!e.accountId) throw new Error('يرجى اختيار حساب المصروف');
    const c = cfg().accounts;
    const lines = [{ accountId: e.accountId, debit: amount, credit: 0 }];
    if (tax > 0) lines.push({ accountId: c.vat, debit: tax, credit: 0 });
    lines.push({ accountId: e.paymentAccountId || c.cash, debit: 0, credit: r2(amount + tax) });

    const je = AC.createJournal({
      date: e.date,
      description: 'مصروف — ' + (e.description || (AC.account(e.accountId) || {}).name || ''),
      ref: e.no,
      lines: lines,
      source: { type: 'expense', id: e.id }
    });
    e.entryId = je.id;
    e.status = 'posted';
    if (!opts || !opts.silent) DB.save();
    return e;
  };

  AC.deleteExpense = function (e) {
    if (!e) return;
    if (e.entryId) {
      const idx = st().journals.findIndex(function (j) { return j.id === e.entryId; });
      if (idx > -1) st().journals.splice(idx, 1);
    }
    st().expenses = st().expenses.filter(function (x) { return x.id !== e.id; });
    DB.save();
  };

  /* ---------------- القيود ---------------- */
  AC.createJournal = function (data) {
    const lines = (data.lines || []).filter(function (l) {
      return l.accountId && (U.num(l.debit) || U.num(l.credit));
    }).map(function (l) {
      return {
        accountId: l.accountId,
        debit: r2(U.num(l.debit)),
        credit: r2(U.num(l.credit)),
        note: l.note || ''
      };
    });
    if (lines.length < 2) throw new Error('القيد يجب أن يحتوي على سطرين على الأقل');
    const dr = r2(lines.reduce(function (a, l) { return a + l.debit; }, 0));
    const cr = r2(lines.reduce(function (a, l) { return a + l.credit; }, 0));
    if (Math.abs(dr - cr) > 0.009) {
      throw new Error('القيد غير متوازن: مجموع المدين ' + U.money(dr) + ' مقابل الدائن ' + U.money(cr));
    }
    lines.forEach(function (l) {
      if (l.debit > 0 && l.credit > 0) throw new Error('لا يمكن إدخال مدين ودائن في نفس السطر');
      const acc = AC.account(l.accountId);
      if (!acc) throw new Error('حساب غير موجود');
      if (acc.isGroup) throw new Error('لا يمكن الترحيل إلى حساب مجموعة: ' + acc.name);
    });

    const data2 = {
      id: U.uid('je'),
      no: DB.nextNo('journal', cfg().prefixes.journal || 'JV-'),
      date: data.date || U.today(),
      description: data.description || '',
      ref: data.ref || '',
      lines: lines,
      source: data.source || null,
      createdAt: new Date().toISOString()
    };
    st().journals.push(data2);
    DB.save();
    return data2;
  };

  AC.journal = function (id) {
    return st().journals.filter(function (j) { return j.id === id; })[0] || null;
  };

  AC.updateJournal = function (id, data) {
    const je = AC.journal(id);
    if (!je) throw new Error('القيد غير موجود');
    if (je.source) throw new Error('لا يمكن تعديل قيد مرتبط بمستند تلقائي');
    const lines = (data.lines || []).filter(function (l) {
      return l.accountId && (U.num(l.debit) || U.num(l.credit));
    }).map(function (l) {
      return { accountId: l.accountId, debit: r2(U.num(l.debit)), credit: r2(U.num(l.credit)), note: l.note || '' };
    });
    const dr = r2(lines.reduce(function (a, l) { return a + l.debit; }, 0));
    const cr = r2(lines.reduce(function (a, l) { return a + l.credit; }, 0));
    if (lines.length < 2) throw new Error('القيد يجب أن يحتوي على سطرين على الأقل');
    if (Math.abs(dr - cr) > 0.009) throw new Error('القيد غير متوازن');
    je.date = data.date || je.date;
    je.description = data.description || '';
    je.ref = data.ref || '';
    je.lines = lines;
    DB.save();
    return je;
  };

  AC.deleteJournal = function (id) {
    const je = AC.journal(id);
    if (!je) return;
    if (je.source) throw new Error('لا يمكن حذف قيد مرتبط بمستند (فاتورة/سند/مصروف). احذف المستند نفسه.');
    st().journals = st().journals.filter(function (j) { return j.id !== id; });
    DB.save();
  };

  /* ---------------- تقارير مساعدة ---------------- */
  AC.monthlySeries = function (count, endIso) {
    const keys = U.lastMonths(count || 6, endIso);
    const idx = {};
    const out = keys.map(function (k, i) {
      idx[k] = i;
      return { key: k, label: U.monthShort(k), revenue: 0, expense: 0 };
    });
    st().journals.forEach(function (je) {
      const k = U.monthKey(je.date);
      if (!(k in idx)) return;
      je.lines.forEach(function (l) {
        const a = AC.account(l.accountId);
        if (!a) return;
        if (a.type === 'revenue') out[idx[k]].revenue += U.num(l.credit) - U.num(l.debit);
        if (a.type === 'expense') out[idx[k]].expense += U.num(l.debit) - U.num(l.credit);
      });
    });
    out.forEach(function (o) { o.revenue = r2(o.revenue); o.expense = r2(o.expense); o.profit = r2(o.revenue - o.expense); });
    return out;
  };

  AC.expenseBreakdown = function (from, to) {
    const map = {};
    AC.leaves().forEach(function (a) {
      if (a.type !== 'expense') return;
      const amt = AC.balance(a.id, { from: from, to: to });
      if (!amt) return;
      const parent = a.parent ? AC.account(a.parent) : null;
      const key = parent ? parent.id : a.id;
      const label = parent ? parent.name : a.name;
      if (!map[key]) map[key] = { label: label, value: 0 };
      map[key].value += amt;
    });
    return Object.keys(map).map(function (k) { return { label: map[k].label, value: r2(map[k].value) }; })
      .sort(function (a, b) { return b.value - a.value; });
  };

  AC.aging = function (type) {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over: 0 };
    const rows = [];
    const today = U.today();
    st().invoices.forEach(function (inv) {
      if (inv.type !== type || inv.status !== 'posted') return;
      const out = AC.outstanding(inv);
      if (out <= 0.004) return;
      const due = inv.dueDate || inv.date;
      const overdue = U.daysBetween(due, today);
      const row = { invoice: inv, contact: AC.contact(inv.contactId), outstanding: out, days: overdue, bucket: '' };
      if (overdue <= 0) { row.bucket = 'current'; buckets.current += out; }
      else if (overdue <= 30) { row.bucket = 'd30'; buckets.d30 += out; }
      else if (overdue <= 60) { row.bucket = 'd60'; buckets.d60 += out; }
      else if (overdue <= 90) { row.bucket = 'd90'; buckets.d90 += out; }
      else { row.bucket = 'over'; buckets.over += out; }
      rows.push(row);
    });
    rows.sort(function (a, b) { return b.days - a.days; });
    const total = r2(rows.reduce(function (a, r) { return a + r.outstanding; }, 0));
    Object.keys(buckets).forEach(function (k) { buckets[k] = r2(buckets[k]); });
    return { rows: rows, buckets: buckets, total: total };
  };

  AC.vatReport = function (from, to) {
    let output = 0, input = 0;
    const salesRows = [], purchaseRows = [];
    st().invoices.forEach(function (inv) {
      if (inv.status !== 'posted') return;
      if (from && inv.date < from) return;
      if (to && inv.date > to) return;
      const t = AC.invoiceTotals(inv);
      if (!t.tax) return;
      if (inv.type === 'sale') { output += t.tax; salesRows.push({ inv: inv, tax: t.tax, base: t.subtotal }); }
      else { input += t.tax; purchaseRows.push({ inv: inv, tax: t.tax, base: t.subtotal }); }
    });
    const expensesTax = r2(st().expenses.reduce(function (a, e) {
      if (from && e.date < from) return a;
      if (to && e.date > to) return a;
      return a + U.num(e.taxAmount);
    }, 0));
    output = r2(output);
    input = r2(input + expensesTax);
    return {
      output: output, input: input, net: r2(output - input),
      salesRows: salesRows, purchaseRows: purchaseRows, expensesTax: expensesTax
    };
  };

  AC.stockValue = function () {
    let cost = 0, retail = 0;
    st().items.forEach(function (i) {
      if (i.service) return;
      cost += U.num(i.stock) * U.num(i.cost);
      retail += U.num(i.stock) * U.num(i.price);
    });
    return { cost: r2(cost), retail: r2(retail), margin: r2(retail - cost) };
  };

  AC.lowStock = function () {
    return st().items.filter(function (i) { return !i.service && U.num(i.reorder) > 0 && U.num(i.stock) <= U.num(i.reorder); })
      .sort(function (a, b) { return U.num(a.stock) - U.num(b.stock); });
  };

  AC.stats = function () {
    const today = U.today();
    const yStart = U.startOfYear(today);
    const s = cfg();
    const cash = r2(AC.balance(s.accounts.cash, { to: today }) + AC.balance(s.accounts.bank, { to: today }));
    const ar = r2(AC.balance(s.accounts.ar, { to: today }));
    const ap = r2(AC.balance(s.accounts.ap, { to: today }));
    const invValue = r2(AC.balance(s.accounts.inventory, { to: today }));
    const income = AC.incomeStatement(yStart, today);
    const stock = AC.stockValue();
    const sales = st().invoices.filter(function (i) { return i.type === 'sale' && i.status === 'posted'; });
    const purchases = st().invoices.filter(function (i) { return i.type === 'purchase' && i.status === 'posted'; });
    return {
      cash: cash, ar: ar, ap: ap, inventory: invValue,
      revenue: income.revenueTotal + income.otherTotal,
      expenses: r2(income.cogsTotal + income.opexTotal),
      netProfit: income.netProfit,
      grossProfit: income.grossProfit,
      stock: stock,
      salesCount: sales.length,
      purchaseCount: purchases.length,
      salesTotal: r2(sales.reduce(function (a, i) { return a + AC.invoiceTotals(i).total; }, 0)),
      purchaseTotal: r2(purchases.reduce(function (a, i) { return a + AC.invoiceTotals(i).total; }, 0)),
      customers: st().contacts.filter(function (c) { return c.type === 'customer' || c.type === 'both'; }).length,
      suppliers: st().contacts.filter(function (c) { return c.type === 'supplier' || c.type === 'both'; }).length,
      lowStock: AC.lowStock()
    };
  };

  /* ---------------- تشغيل بيانات العرض ---------------- */
  AC.bootstrapDemo = function () {
    let changed = false;
    st().invoices.slice().forEach(function (inv) {
      if (!inv._autoPost) return;
      try {
        AC.postInvoice(inv, { silent: true });
      } catch (e) {
        console.warn('تعذر ترحيل فاتورة العرض', e);
        inv.status = 'draft';
      }
      delete inv._autoPost;
      changed = true;
    });
    st().payments.slice().forEach(function (p) {
      if (!p._autoPost) return;
      try { AC.postPayment(p, { silent: true }); } catch (e) { console.warn(e); }
      delete p._autoPost;
      changed = true;
    });
    st().expenses.slice().forEach(function (e) {
      if (!e._autoPost) return;
      try { AC.postExpense(e, { silent: true }); } catch (err) { console.warn(err); }
      delete e._autoPost;
      changed = true;
    });
    if (changed) DB.save();
  };

  global.Accounting = AC;
})(window);
