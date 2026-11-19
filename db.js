/* ============================================================
   المحاسب — طبقة البيانات (localStorage)
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'mohasib.v1';
  const VERSION = 2;
  let state = null;

  /* ---------------- أدوات بناء البيانات الأولية ---------------- */
  function A(code, name, type, parent, isGroup) {
    return {
      id: 'acc_' + code,
      code: String(code),
      name: name,
      type: type,
      parent: parent ? 'acc_' + parent : null,
      isGroup: !!isGroup
    };
  }

  function dateAgo(months, day) {
    const n = new Date();
    const d = new Date(n.getFullYear(), n.getMonth() - months, Math.min(day || 10, 28));
    return U.iso(d);
  }

  function accountSeed() {
    return [
      A('1', 'الأصول', 'asset', null, true),

      A('11', 'الأصول المتداولة', 'asset', '1', true),
      A('1101', 'الصندوق (النقدية)', 'asset', '11'),
      A('1102', 'البنك', 'asset', '11'),
      A('1103', 'العملاء (المدينون)', 'asset', '11'),
      A('1104', 'المخزون', 'asset', '11'),
      A('1105', 'مصروفات مدفوعة مقدماً', 'asset', '11'),

      A('12', 'الأصول الثابتة', 'asset', '1', true),
      A('1201', 'الأثاث والمعدات', 'asset', '12'),
      A('1202', 'السيارات', 'asset', '12'),
      A('1203', 'مجمع إهلاك الأصول', 'asset', '12'),

      A('2', 'الالتزامات', 'liability', null, true),

      A('21', 'الالتزامات المتداولة', 'liability', '2', true),
      A('2101', 'الموردون (الدائنون)', 'liability', '21'),
      A('2102', 'ضريبة القيمة المضافة', 'liability', '21'),
      A('2103', 'رواتب مستحقة', 'liability', '21'),
      A('2104', 'مصروفات مستحقة', 'liability', '21'),

      A('22', 'التزامات طويلة الأجل', 'liability', '2', true),
      A('2201', 'قروض بنكية', 'liability', '22'),

      A('3', 'حقوق الملكية', 'equity', null, true),
      A('3101', 'رأس المال', 'equity', '3'),
      A('3102', 'الأرباح المحتجزة', 'equity', '3'),
      A('3103', 'المسحوبات الشخصية', 'equity', '3'),

      A('4', 'الإيرادات', 'revenue', null, true),
      A('41', 'إيرادات النشاط', 'revenue', '4', true),
      A('4101', 'إيرادات المبيعات', 'revenue', '41'),
      A('4102', 'إيرادات الخدمات', 'revenue', '41'),
      A('4103', 'مردودات وخصومات المبيعات', 'revenue', '41'),
      A('49', 'إيرادات أخرى', 'revenue', '4', true),
      A('4901', 'إيرادات متنوعة', 'revenue', '49'),

      A('5', 'المصروفات', 'expense', null, true),
      A('51', 'تكلفة المبيعات', 'expense', '5', true),
      A('5101', 'تكلفة البضاعة المباعة', 'expense', '51'),

      A('52', 'مصروفات التشغيل', 'expense', '5', true),
      A('5201', 'الرواتب والأجور', 'expense', '52'),
      A('5202', 'الإيجار', 'expense', '52'),
      A('5203', 'الكهرباء والمياه', 'expense', '52'),
      A('5204', 'الاتصالات والإنترنت', 'expense', '52'),
      A('5205', 'مستلزمات مكتبية', 'expense', '52'),
      A('5206', 'تسويق وإعلان', 'expense', '52'),
      A('5207', 'إهلاك الأصول', 'expense', '52'),
      A('5208', 'مصروفات بنكية', 'expense', '52'),
      A('5209', 'مصروفات متنوعة', 'expense', '52')
    ];
  }

  function defaultSettings() {
    return {
      company: '',
      taxNumber: '',
      phone: '',
      email: '',
      address: '',
      currency: 'ر.س',
      taxRate: 15,
      taxName: 'ضريبة القيمة المضافة',
      invoiceNote: '',
      accounts: {
        cash: 'acc_1101',
        bank: 'acc_1102',
        ar: 'acc_1103',
        inventory: 'acc_1104',
        ap: 'acc_2101',
        vat: 'acc_2102',
        sales: 'acc_4101',
        services: 'acc_4102',
        discountRev: 'acc_4103',
        cogs: 'acc_5101',
        retained: 'acc_3102'
      },
      prefixes: {
        journal: 'JV-', invoice: 'INV-', bill: 'BILL-',
        receipt: 'REC-', payment: 'PAY-', expense: 'EXP-'
      }
    };
  }

  function buildSeed() {
    const accounts = accountSeed();

    const settings = Object.assign(defaultSettings(), {
      company: 'شركة الأفق للتجارة',
      taxNumber: '310123456700003',
      phone: '+966 55 123 4567',
      email: 'info@ofoq.example',
      address: 'الرياض — حي العليا — طريق الملك فهد',
      invoiceNote: 'شكراً لتعاملكم معنا. يرجى سداد المستحق خلال المدة المحددة.'
    });

    const contacts = [
      { id: 'con_1', name: 'مؤسسة النخبة التجارية', type: 'customer', phone: '0551112233', email: 'sales@nokhba.example', city: 'الرياض', taxNumber: '300111222333003', notes: '' },
      { id: 'con_2', name: 'شركة البناء الحديث', type: 'customer', phone: '0532223344', email: 'info@binaa.example', city: 'جدة', taxNumber: '300222333444003', notes: '' },
      { id: 'con_3', name: 'الشركة العالمية للإلكترونيات', type: 'supplier', phone: '0133334455', email: 'supply@global.example', city: 'الدمام', taxNumber: '300333444555003', notes: '' },
      { id: 'con_4', name: 'مكتب الإمداد التقني', type: 'supplier', phone: '0114445566', email: 'orders@emdad.example', city: 'الرياض', taxNumber: '300444555666003', notes: '' }
    ];

    const items = [
      { id: 'itm_1', code: 'IT-001', name: 'لابتوب Dell Latitude 15', unit: 'قطعة', cost: 2200, price: 3200, stock: 0, reorder: 2, taxRate: 15, active: true },
      { id: 'itm_2', code: 'IT-002', name: 'شاشة Samsung 24 بوصة', unit: 'قطعة', cost: 600, price: 950, stock: 0, reorder: 3, taxRate: 15, active: true },
      { id: 'itm_3', code: 'IT-003', name: 'طابعة HP LaserJet', unit: 'قطعة', cost: 850, price: 1350, stock: 0, reorder: 4, taxRate: 15, active: true },
      { id: 'itm_4', code: 'SV-001', name: 'خدمة تركيب وإعداد', unit: 'خدمة', cost: 0, price: 500, stock: 0, reorder: 0, taxRate: 15, active: true, service: true }
    ];

    /* --------- قيود يدوية --------- */
    const journals = [
      {
        id: 'je_seed_1', no: 'JV-0001', date: dateAgo(8, 1),
        description: 'إيداع رأس المال في الحساب البنكي', ref: 'CAP-001',
        lines: [
          { accountId: 'acc_1102', debit: 250000, credit: 0 },
          { accountId: 'acc_3101', debit: 0, credit: 250000 }
        ]
      },
      {
        id: 'je_seed_2', no: 'JV-0002', date: dateAgo(7, 5),
        description: 'شراء أثاث ومعدات للمكتب', ref: 'FA-001',
        lines: [
          { accountId: 'acc_1201', debit: 18000, credit: 0 },
          { accountId: 'acc_1102', debit: 0, credit: 18000 }
        ]
      },
      {
        id: 'je_seed_3', no: 'JV-0003', date: dateAgo(6, 12),
        description: 'مسحوبات المالك من الحساب البنكي', ref: 'DRW-001',
        lines: [
          { accountId: 'acc_3103', debit: 5000, credit: 0 },
          { accountId: 'acc_1102', debit: 0, credit: 5000 }
        ]
      },
      {
        id: 'je_seed_4', no: 'JV-0004', date: dateAgo(5, 2),
        description: 'تغذية الصندوق النقدي من الحساب البنكي', ref: 'CASH-001',
        lines: [
          { accountId: 'acc_1101', debit: 10000, credit: 0 },
          { accountId: 'acc_1102', debit: 0, credit: 10000 }
        ]
      }
    ];

    /* --------- فواتير (مسودات تُرحّل تلقائياً عند أول تشغيل) --------- */
    const invoices = [
      {
        id: 'inv_seed_1', no: 'BILL-0001', type: 'purchase', date: dateAgo(4, 3),
        dueDate: dateAgo(4, 3), contactId: 'con_3',
        lines: [
          { itemId: 'itm_1', description: 'لابتوب Dell Latitude 15', qty: 20, price: 2200, discount: 0, taxRate: 15 },
          { itemId: 'itm_2', description: 'شاشة Samsung 24 بوصة', qty: 15, price: 600, discount: 0, taxRate: 15 },
          { itemId: 'itm_3', description: 'طابعة HP LaserJet', qty: 5, price: 850, discount: 0, taxRate: 15 }
        ],
        notes: 'توريد دفعة أجهزة للمخزون', status: 'draft', paidAmount: 0,
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'inv_seed_2', no: 'INV-0001', type: 'sale', date: dateAgo(3, 8),
        dueDate: dateAgo(2, 8), contactId: 'con_1',
        lines: [
          { itemId: 'itm_1', description: 'لابتوب Dell Latitude 15', qty: 8, price: 3200, discount: 0, taxRate: 15 },
          { itemId: 'itm_2', description: 'شاشة Samsung 24 بوصة', qty: 6, price: 950, discount: 0, taxRate: 15 }
        ],
        notes: '', status: 'draft', paidAmount: 0,
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'inv_seed_3', no: 'INV-0002', type: 'sale', date: dateAgo(2, 14),
        dueDate: dateAgo(1, 14), contactId: 'con_2',
        lines: [
          { itemId: 'itm_1', description: 'لابتوب Dell Latitude 15', qty: 5, price: 3200, discount: 0, taxRate: 15 },
          { itemId: 'itm_3', description: 'طابعة HP LaserJet', qty: 3, price: 1350, discount: 0, taxRate: 15 }
        ],
        notes: 'دفعة أولى عند التسليم', status: 'draft', paidAmount: 0,
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'inv_seed_4', no: 'INV-0003', type: 'sale', date: dateAgo(1, 6),
        dueDate: dateAgo(0, 6), contactId: 'con_1',
        lines: [
          { itemId: 'itm_1', description: 'لابتوب Dell Latitude 15', qty: 4, price: 3200, discount: 0, taxRate: 15 },
          { itemId: 'itm_2', description: 'شاشة Samsung 24 بوصة', qty: 5, price: 950, discount: 0, taxRate: 15 },
          { itemId: 'itm_4', description: 'خدمة تركيب وإعداد', qty: 1, price: 500, discount: 0, taxRate: 15 }
        ],
        notes: '', status: 'draft', paidAmount: 0,
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      }
    ];

    const payments = [
      {
        id: 'pm_seed_1', no: 'REC-0001', type: 'receipt', date: dateAgo(2, 20),
        contactId: 'con_2', invoiceId: 'inv_seed_3', amount: 5000,
        accountId: 'acc_1102', notes: 'دفعة أولى من العميل', status: 'draft',
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      }
    ];

    const expenses = [
      {
        id: 'ex_seed_1', no: 'EXP-0001', date: dateAgo(2, 1),
        accountId: 'acc_5202', amount: 5000, taxAmount: 0,
        paymentAccountId: 'acc_1102', description: 'إيجار المقر الشهري', ref: '', status: 'draft',
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'ex_seed_2', no: 'EXP-0002', date: dateAgo(1, 1),
        accountId: 'acc_5201', amount: 10000, taxAmount: 0,
        paymentAccountId: 'acc_1102', description: 'رواتب الموظفين', ref: '', status: 'draft',
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'ex_seed_3', no: 'EXP-0003', date: dateAgo(1, 8),
        accountId: 'acc_5203', amount: 920, taxAmount: 0,
        paymentAccountId: 'acc_1101', description: 'فاتورة الكهرباء', ref: '', status: 'draft',
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      },
      {
        id: 'ex_seed_4', no: 'EXP-0004', date: dateAgo(0, 2),
        accountId: 'acc_5206', amount: 2500, taxAmount: 0,
        paymentAccountId: 'acc_1102', description: 'حملة إعلانية على وسائل التواصل', ref: '', status: 'draft',
        entryId: null, createdAt: new Date().toISOString(), _autoPost: true
      }
    ];

    return {
      meta: { version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), seeded: true, demo: true },
      settings: settings,
      accounts: accounts,
      contacts: contacts,
      items: items,
      journals: journals.map(function (j) { return Object.assign({ source: null, createdAt: new Date().toISOString() }, j); }),
      invoices: invoices,
      payments: payments,
      expenses: expenses,
      counters: { journal: 4, invoice: 3, bill: 1, receipt: 1, payment: 0, expense: 4 }
    };
  }

  /* ---------------- الواجهة ---------------- */
  const DB = {
    get state() { return state; },

    load: function () {
      let raw = null;
      try {
        /* مسح إجباري لمرة واحدة عند الانتقال إلى النسخة الفارغة */
        if (!localStorage.getItem('mohasib.wipe.v2')) {
          localStorage.removeItem(KEY);
          localStorage.setItem('mohasib.wipe.v2', '1');
        }
        raw = localStorage.getItem(KEY);
      } catch (e) { raw = null; }
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.accounts && parsed.settings) {
            state = migrate(parsed);
            return state;
          }
        } catch (e) {
          console.warn('تعذر قراءة البيانات المحفوظة، سيتم البدء ببيانات جديدة.', e);
        }
      }
      state = emptyState();
      DB.save();
      return state;
    },

    save: function () {
      if (!state) return;
      state.meta.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        console.error('تعذر حفظ البيانات', e);
        if (global.U) U.toast('تعذر حفظ البيانات: مساحة التخزين ممتلئة', 'error');
      }
    },

    nextNo: function (key, prefix) {
      state.counters[key] = (state.counters[key] || 0) + 1;
      return prefix + U.pad(state.counters[key], 4);
    },

    reset: function (withDemo) {
      state = withDemo === false ? emptyState() : buildSeed();
      DB.save();
      return state;
    },

    exportJSON: function () {
      return JSON.stringify(state, null, 2);
    },

    importJSON: function (text) {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.accounts) || !parsed.settings) {
        throw new Error('ملف غير صالح — لا يحتوي على بنية بيانات المحاسب');
      }
      state = migrate(parsed);
      DB.save();
      return state;
    },

    get accountMap() {
      const m = {};
      state.accounts.forEach(function (a) { m[a.id] = a; });
      return m;
    },

    lastUpdate: function () {
      try {
        return state && state.meta ? new Date(state.meta.updatedAt) : null;
      } catch (e) { return null; }
    }
  };

  function emptyState() {
    return {
      meta: { version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), seeded: false, demo: false },
      settings: defaultSettings(),
      accounts: accountSeed(),
      contacts: [],
      items: [],
      journals: [],
      invoices: [],
      payments: [],
      expenses: [],
      counters: { journal: 0, invoice: 0, bill: 0, receipt: 0, payment: 0, expense: 0 }
    };
  }

  function migrate(s) {
    const origSettings = s.settings || {};
    s.meta = s.meta || { version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    s.meta.version = VERSION;
    s.settings = Object.assign({}, defaultSettings(), origSettings);
    s.settings.accounts = Object.assign({}, defaultSettings().accounts, origSettings.accounts || {});
    s.settings.prefixes = Object.assign({}, defaultSettings().prefixes, origSettings.prefixes || {});
    s.accounts = s.accounts || [];
    s.contacts = s.contacts || [];
    s.items = s.items || [];
    s.journals = s.journals || [];
    s.invoices = s.invoices || [];
    s.payments = s.payments || [];
    s.expenses = s.expenses || [];
    s.counters = Object.assign({ journal: 0, invoice: 0, bill: 0, receipt: 0, payment: 0, expense: 0 }, s.counters || {});
    return s;
  }

  global.DB = DB;
})(window);
