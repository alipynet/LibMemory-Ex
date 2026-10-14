/* Shared helpers, unified manual hybrid ranking engine, TXT parser/exporter, themes, and bilingual i18n */
var AIM = (() => {
  const DEFAULT_SETTINGS = {
    lang: 'fa', // 'fa' | 'en'
    theme: 'midnight', // 'midnight' | 'glass-dark' | 'glass-light' | 'emerald' | 'ocean' | 'sunset' | 'light'
    header: 'اطلاعات زیر حافظه بلندمدت من است. آن‌ها را درباره من به خاطر داشته باش و در پاسخت از آن‌ها استفاده کن:',
    separator: 'پرامپت من:',
    autoSelectMode: 'manual' // 'manual' (off) | 'cosine' (Manual Method / روش دستی) | 'ai' (AI)
  };
  const DEFAULT_SETTINGS_EN = {
    header: 'The following is my long-term memory. Keep it in mind about me and use it in your response:',
    separator: 'My prompt:'
  };
  const DEFAULT_AI = {
    provider: 'gemini', // 'gemini' | 'claude' | 'openai'
    gemini: { apiKey: '', model: 'gemini-2.5-flash' },
    claude: { apiKey: '', model: 'claude-3-5-sonnet-latest' },
    openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    dailyCap: 20
  };
  const DEFAULT_FAB = { enabled: true, side: 'left', bottom: 110 };
  const DEFAULT_VARS = [
    { name: 'نام', value: 'علی' },
    { name: 'نقش', value: 'توسعه‌دهنده نرم‌افزار' },
    { name: 'پروژه_فعلی', value: 'لایب‌مموری (LibMemory)' }
  ];
  const UNCAT = '__none__';

  const THEMES = [
    { id: 'midnight', icon: '🌌', fa: 'نیمه‌شب بنفش (تیره مدرن)', en: 'Midnight Violet (Dark)', preview: 'linear-gradient(135deg, #1e1b4b, #6366f1)' },
    { id: 'glass-dark', icon: '🧊', fa: 'شیشه‌ای کریستال تیره (Glass)', en: 'Crystal Dark Glass', preview: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(139,92,246,0.75))' },
    { id: 'glass-light', icon: '✨', fa: 'شیشه‌ای یخی روشن (Frost Glass)', en: 'Frosted Light Glass', preview: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(99,102,241,0.5))' },
    { id: 'emerald', icon: '🌲', fa: 'زمرد نئونی (سبز تیره)', en: 'Cyber Emerald', preview: 'linear-gradient(135deg, #064e3b, #10b981)' },
    { id: 'ocean', icon: '🌊', fa: 'اقیانوس آبی (سرمه‌ای)', en: 'Deep Ocean', preview: 'linear-gradient(135deg, #0c4a6e, #38bdf8)' },
    { id: 'sunset', icon: '🌅', fa: 'غروب یاقوتی (گرم و خاص)', en: 'Sunset Rose', preview: 'linear-gradient(135deg, #4c0519, #f43f5e)' },
    { id: 'light', icon: '☀️', fa: 'روشن کلاسیک (مینیمال)', en: 'Clean Light', preview: 'linear-gradient(135deg, #f8fafc, #4f46e5)' }
  ];

  const THEME_CSS_VARS = `
:root, :host, [data-theme="midnight"] {
  --bg-app: #0f111a;
  --bg-grad: radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.16), transparent 45%), radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.12), transparent 45%), #0f111a;
  --bg-surface: #171926;
  --bg-surface-2: #1e2235;
  --bg-elevated: #252a40;
  --bg-hover: #2d334f;
  --bg-active: rgba(99, 102, 241, 0.22);
  --bg-pinned: rgba(245, 158, 11, 0.14);
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --border-col: rgba(148, 163, 184, 0.18);
  --border-strong: rgba(129, 140, 248, 0.45);
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-text: #ffffff;
  --ai-bg: rgba(139, 92, 246, 0.18);
  --ai-hover: rgba(139, 92, 246, 0.32);
  --ai-text: #ddd6fe;
  --ai-border: rgba(167, 139, 250, 0.4);
  --sec-bg: rgba(16, 185, 129, 0.16);
  --sec-hover: rgba(16, 185, 129, 0.30);
  --sec-text: #6ee7b7;
  --sec-border: rgba(52, 211, 153, 0.4);
  --danger-bg: rgba(239, 68, 68, 0.15);
  --danger-hover: rgba(239, 68, 68, 0.30);
  --danger-text: #fca5a5;
  --danger-border: rgba(248, 113, 113, 0.4);
  --glass-blur: none;
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.55);
}

[data-theme="glass-dark"] {
  --bg-app: #090d16;
  --bg-grad: radial-gradient(circle at 12% 20%, rgba(139, 92, 246, 0.32), transparent 40%), radial-gradient(circle at 88% 75%, rgba(14, 165, 233, 0.26), transparent 42%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.14), transparent 55%), #090d16;
  --bg-surface: rgba(20, 25, 43, 0.62);
  --bg-surface-2: rgba(30, 38, 64, 0.55);
  --bg-elevated: rgba(42, 52, 84, 0.65);
  --bg-hover: rgba(71, 85, 135, 0.55);
  --bg-active: rgba(139, 92, 246, 0.30);
  --bg-pinned: rgba(245, 158, 11, 0.20);
  --text-main: #f8fafc;
  --text-muted: #cbd5e1;
  --border-col: rgba(255, 255, 255, 0.16);
  --border-strong: rgba(167, 139, 250, 0.55);
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-text: #ffffff;
  --ai-bg: rgba(192, 132, 252, 0.22);
  --ai-hover: rgba(192, 132, 252, 0.38);
  --ai-text: #f3e8ff;
  --ai-border: rgba(216, 180, 254, 0.5);
  --sec-bg: rgba(20, 184, 166, 0.22);
  --sec-hover: rgba(20, 184, 166, 0.38);
  --sec-text: #99f6e4;
  --sec-border: rgba(94, 234, 212, 0.45);
  --danger-bg: rgba(244, 63, 94, 0.22);
  --danger-hover: rgba(244, 63, 94, 0.38);
  --danger-text: #fecdd3;
  --danger-border: rgba(251, 113, 133, 0.5);
  --glass-blur: blur(20px) saturate(175%);
  --shadow-lg: 0 20px 50px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

[data-theme="glass-light"] {
  --bg-app: #eef2ff;
  --bg-grad: radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.28), transparent 42%), radial-gradient(circle at 85% 80%, rgba(236, 72, 153, 0.22), transparent 42%), radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.22), transparent 45%), #eef2ff;
  --bg-surface: rgba(255, 255, 255, 0.68);
  --bg-surface-2: rgba(248, 250, 252, 0.65);
  --bg-elevated: rgba(255, 255, 255, 0.85);
  --bg-hover: rgba(224, 231, 255, 0.85);
  --bg-active: rgba(99, 102, 241, 0.20);
  --bg-pinned: rgba(254, 243, 199, 0.85);
  --text-main: #0f172a;
  --text-muted: #475569;
  --border-col: rgba(99, 102, 241, 0.20);
  --border-strong: rgba(79, 70, 229, 0.50);
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-text: #ffffff;
  --ai-bg: rgba(124, 58, 237, 0.14);
  --ai-hover: rgba(124, 58, 237, 0.26);
  --ai-text: #4c1d95;
  --ai-border: rgba(139, 92, 246, 0.4);
  --sec-bg: rgba(5, 150, 105, 0.14);
  --sec-hover: rgba(5, 150, 105, 0.26);
  --sec-text: #065f46;
  --sec-border: rgba(16, 185, 129, 0.4);
  --danger-bg: rgba(220, 38, 38, 0.12);
  --danger-hover: rgba(220, 38, 38, 0.24);
  --danger-text: #991b1b;
  --danger-border: rgba(239, 68, 68, 0.4);
  --glass-blur: blur(20px) saturate(180%);
  --shadow-lg: 0 18px 46px rgba(30, 41, 59, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

[data-theme="emerald"] {
  --bg-app: #071712;
  --bg-grad: radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.18), transparent 45%), #071712;
  --bg-surface: #0d231c;
  --bg-surface-2: #122f26;
  --bg-elevated: #183d31;
  --bg-hover: #205041;
  --bg-active: rgba(16, 185, 129, 0.25);
  --bg-pinned: rgba(245, 158, 11, 0.16);
  --text-main: #ecfdf5;
  --text-muted: #86efac;
  --border-col: rgba(52, 211, 153, 0.20);
  --border-strong: rgba(16, 185, 129, 0.55);
  --primary: #10b981;
  --primary-hover: #059669;
  --primary-text: #042f2e;
  --ai-bg: rgba(45, 212, 191, 0.18);
  --ai-hover: rgba(45, 212, 191, 0.32);
  --ai-text: #99f6e4;
  --ai-border: rgba(45, 212, 191, 0.45);
  --sec-bg: rgba(16, 185, 129, 0.20);
  --sec-hover: rgba(16, 185, 129, 0.34);
  --sec-text: #a7f3d0;
  --sec-border: rgba(52, 211, 153, 0.45);
  --danger-bg: rgba(239, 68, 68, 0.18);
  --danger-hover: rgba(239, 68, 68, 0.32);
  --danger-text: #fca5a5;
  --danger-border: rgba(248, 113, 113, 0.4);
  --glass-blur: none;
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
}

[data-theme="ocean"] {
  --bg-app: #081420;
  --bg-grad: radial-gradient(circle at 80% 15%, rgba(56, 189, 248, 0.18), transparent 45%), #081420;
  --bg-surface: #0f2133;
  --bg-surface-2: #152c44;
  --bg-elevated: #1c3957;
  --bg-hover: #254b70;
  --bg-active: rgba(56, 189, 248, 0.24);
  --bg-pinned: rgba(245, 158, 11, 0.16);
  --text-main: #f0f9ff;
  --text-muted: #93c5fd;
  --border-col: rgba(56, 189, 248, 0.20);
  --border-strong: rgba(56, 189, 248, 0.55);
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --primary-text: #ffffff;
  --ai-bg: rgba(56, 189, 248, 0.18);
  --ai-hover: rgba(56, 189, 248, 0.32);
  --ai-text: #bae6fd;
  --ai-border: rgba(125, 211, 252, 0.45);
  --sec-bg: rgba(20, 184, 166, 0.18);
  --sec-hover: rgba(20, 184, 166, 0.32);
  --sec-text: #99f6e4;
  --sec-border: rgba(45, 212, 191, 0.45);
  --danger-bg: rgba(239, 68, 68, 0.18);
  --danger-hover: rgba(239, 68, 68, 0.32);
  --danger-text: #fca5a5;
  --danger-border: rgba(248, 113, 113, 0.4);
  --glass-blur: none;
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
}

[data-theme="sunset"] {
  --bg-app: #180a13;
  --bg-grad: radial-gradient(circle at 20% 20%, rgba(244, 63, 94, 0.20), transparent 45%), radial-gradient(circle at 80% 80%, rgba(249, 115, 22, 0.15), transparent 45%), #180a13;
  --bg-surface: #26101e;
  --bg-surface-2: #331628;
  --bg-elevated: #421d34;
  --bg-hover: #562644;
  --bg-active: rgba(244, 63, 94, 0.26);
  --bg-pinned: rgba(245, 158, 11, 0.18);
  --text-main: #fff1f2;
  --text-muted: #fda4af;
  --border-col: rgba(251, 113, 133, 0.22);
  --border-strong: rgba(244, 63, 94, 0.55);
  --primary: #e11d48;
  --primary-hover: #be123c;
  --primary-text: #ffffff;
  --ai-bg: rgba(244, 63, 94, 0.20);
  --ai-hover: rgba(244, 63, 94, 0.35);
  --ai-text: #fecdd3;
  --ai-border: rgba(251, 113, 133, 0.45);
  --sec-bg: rgba(245, 158, 11, 0.20);
  --sec-hover: rgba(245, 158, 11, 0.35);
  --sec-text: #fde68a;
  --sec-border: rgba(251, 191, 36, 0.45);
  --danger-bg: rgba(239, 68, 68, 0.22);
  --danger-hover: rgba(239, 68, 68, 0.38);
  --danger-text: #fca5a5;
  --danger-border: rgba(248, 113, 113, 0.5);
  --glass-blur: none;
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.65);
}

[data-theme="light"] {
  --bg-app: #f4f6fb;
  --bg-grad: linear-gradient(180deg, #f8fafc, #eef2ff);
  --bg-surface: #ffffff;
  --bg-surface-2: #f8fafc;
  --bg-elevated: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-active: #e0e7ff;
  --bg-pinned: #fef3c7;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-col: #e2e8f0;
  --border-strong: #6366f1;
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-text: #ffffff;
  --ai-bg: #f3e8ff;
  --ai-hover: #e9d5ff;
  --ai-text: #5b21b6;
  --ai-border: #c4b5fd;
  --sec-bg: #ecfdf5;
  --sec-hover: #d1fae5;
  --sec-text: #065f46;
  --sec-border: #6ee7b7;
  --danger-bg: #fef2f2;
  --danger-hover: #fee2e2;
  --danger-text: #b91c1c;
  --danger-border: #fca5a5;
  --glass-blur: none;
  --shadow-lg: 0 12px 36px rgba(15, 23, 42, 0.14);
}
`;

  const SITES = [
    { key: 'chatgpt', name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com'] },
    { key: 'claude', name: 'Claude', hosts: ['claude.ai'] },
    { key: 'deepseek', name: 'DeepSeek', hosts: ['chat.deepseek.com'] },
    { key: 'gemini', name: 'Gemini', hosts: ['gemini.google.com'] },
    { key: 'qwen', name: 'Qwen', hosts: ['chat.qwen.ai', 'chat.qwenlm.ai'] },
    { key: 'grok', name: 'Grok', hosts: ['grok.com', 'x.com'] },
    { key: 'perplexity', name: 'Perplexity', hosts: ['perplexity.ai', 'www.perplexity.ai'] }
  ];
  const siteKeyOf = (host) => {
    host = String(host || '').replace(/^www\./, '');
    const s = SITES.find((x) => x.hosts.some((h) => host === h.replace(/^www\./, '') || host.endsWith('.' + h)));
    return s ? s.key : null;
  };

  // ---------- Bilingual Dictionary (FA / EN) ----------
  const I18N = {
    fa: {
      appTitle: '🧠 لایب‌مموری | LibMemory',
      pageTitle: 'لایب‌مموری (LibMemory) | مدیریت هوشمند حافظه',
      varsBtn: '🧩 متغیرها',
      reviewBtn: '🔄 به‌روزرسانی',
      tutBtn: '📖 راهنمای جامع',
      settingsBtn: '⚙️ تنظیمات',
      catsTitle: '📁 دسته‌ها',
      catSearchPh: 'جستجوی دسته...',
      newCatTitle: 'دسته جدید',
      aiCatBtn: '🤖 دسته‌بندی با هوشواره',
      localCatBtn: '⚡ دسته‌بندی با روش دستی',
      memSearchPh: '🔍 جستجو و رتبه‌بندی هوشمند (روش دستی)...',
      sortRelevance: 'مرتبط‌ترین (روش دستی)',
      sortUpdated: 'آخرین ویرایش',
      sortCreated: 'تاریخ ایجاد',
      sortTitle: 'عنوان (الفبایی)',
      newManualBtn: '+ دستی',
      newAiBtn: '🤖 با هوشواره',
      batchSelectCount: 'انتخاب: {n}',
      batchPinBtn: '📌 پین',
      batchDelBtn: '🗑 حذف',
      editorEmpty: 'یک حافظه را برای مشاهده و ویرایش انتخاب کن، یا از «+ دستی» برای ایجاد استفاده کن.',
      titlePh: 'عنوان حافظه...',
      pinBtn: '📌 سنجاق',
      pinnedBtn: '📌 سنجاق شده',
      catLbl: 'دسته:',
      insertVarHint: 'درج متغیر:',
      contentPh: 'متن پاراگراف... می‌توانی از {متغیر} استفاده کنی',
      saveBtn: '💾 ذخیره (Ctrl+S)',
      cancelBtn: 'انصراف',
      sumBtn: '🤖 خلاصه‌سازی هوشواره',
      delMemBtn: '🗑 حذف این حافظه',
      allCats: '🗂 همه',
      uncat: '📄 بدون دسته',
      otherCat: 'سایر',
      noCatOpt: '— بدون دسته —',
      newCatOpt: '➕ دسته جدید...',
      noCatFound: 'دسته‌ای پیدا نشد',
      noResult: 'نتیجه‌ای پیدا نشد',
      noMemsYet: 'هنوز حافظه‌ای نداری',
      statsFmt: '{m} حافظه · {c} دسته · {ch} نویسه',
      metaFmt: 'ایجاد: {c} · ویرایش: {u} · {len} نویسه',
      metaNewFmt: '{len} نویسه',
      aiOff: '🤖 هوشواره خاموش (بدون کلید)',
      aiLimited: '🤖 محدود تا {t} · قابلیت‌های دیگر فعال',
      aiCapReached: '🤖 سقف امروز هوشواره پر شد ({u}/{c})',
      aiActive: '🤖 هوشواره فعال ({p}) · مصرف امروز: {u}{c}',
      // Dialogs
      varsDlgTitle: '🧩 مدیریت متغیرهای پویا',
      varsDlgHint: 'متغیرها را تعریف کن و به شکل {نام_متغیر} درون عنوان یا متن حافظه‌ها قرار بده. هر زمان مقدار متغیری را تغییر دهی، در تمام حافظه‌ها خودکار جایگزین می‌شود.',
      newVarNamePh: 'نام متغیر (مثلاً: پروژه_فعلی، نام، شرکت)',
      newVarValPh: 'مقدار متغیر (می‌توانی از {تاریخ} هم استفاده کنی)',
      addVarBtn: '+ افزودن متغیر',
      thVarName: 'نام متغیر',
      thVarVal: 'مقدار',
      thVarPreview: 'پیش‌نمایش زنده',
      thVarAct: 'عملیات',
      sysVarsHint: 'متغیرهای سیستمی خودکار: {تاریخ} (شمسی)، {امروز}، {ساعت}، {تاریخ_میلادی}، {date}، {time}',
      closeBtn: 'بستن',
      // Review / Update Dialog
      reviewDlgTitle: '🔄 به‌روزرسانی حافظه‌ها (روش دستی و هوشواره)',
      reviewDlgHint: 'تغییرات جدیدت را بنویس (مثلاً: «پایتون ۳.۱۰ -> پایتون ۳.۱۲» یا «پروژه‌ام تغییر کرده به سامانه جدید»). می‌توانی هم به صورت دستی (بدون هوشواره) و هم با هوشواره حافظه‌های مرتبط را پیدا کنی، در پیش‌نمایش عنوان و متن نهایی را دستی ویرایش کنی و سپس تأیید بزنی.',
      reviewModeManualTab: '⚡ به‌روزرسانی دستی (بدون هوشواره)',
      reviewModeAiTab: '🤖 به‌روزرسانی با هوشواره',
      reviewOldTermPh: 'عبارت قدیمی (اختیاری - مثلاً: پایتون ۳.۱۰)',
      reviewNewTermPh: 'عبارت یا نکته جدید (مثلاً: پایتون ۳.۱۲)',
      reviewManualNotePh: 'یا کلمات کلیدی / توضیحات تغییر را بنویس تا مرتبط‌ترین حافظه‌ها با روش دستی پیدا شوند...',
      reviewManualFindBtn: '🔍 یافتن حافظه‌های مرتبط و ساخت پیش‌نمایش (روش دستی)',
      reviewInstructionPh: 'تغییرات جدید زندگی، ابزارها، پروژه یا ترجیحاتت را به زبان ساده بنویس...',
      reviewAiGoBtn: '🤖 بررسی و پیشنهاد تغییرات با هوشواره',
      reviewApplyBtn: '✅ تأیید و اعمال تغییرات انتخاب‌شده',
      reviewCancelBtn: 'انصراف و بستن',
      diffApplyCheck: 'اعمال این به‌روزرسانی',
      diffOldTitle: 'نسخه فعلی:',
      diffNewTitle: 'پیش‌نمایش نهایی (قابل ویرایش دستی قبل از تأیید):',
      diffTitleInputPh: 'عنوان جدید حافظه...',
      // AI Create Dialog
      aiDlgTitle: '🤖 استخراج و ساخت حافظه',
      aiDlgHint: 'متن را اینجا بچسبان. می‌توانی با هوشواره نکات کلیدی را استخراج کنی یا با روش دستی پیش‌نویس بسازی.',
      aiSrcPh: 'متن خام...',
      aiGoBtn: '✨ استخراج با هوشواره',
      aiManualBtn: '⚡ ساخت پیش‌نویس (روش دستی)',
      aiSaveAllBtn: '💾 ذخیره حافظه‌های انتخابی',
      draftSaveCheck: 'ذخیره شود',
      // Summarize Dialog
      sumDlgTitle: '🤖 خلاصه‌سازی هوشواره',
      sumApplyBtn: 'جایگزین در ویرایشگر',
      // Settings Dialog & Tabs
      settingsDlgTitle: '⚙️ تنظیمات و شخصی‌سازی لایب‌مموری (LibMemory)',
      stabAppearance: '🎨 ظاهر و زبان',
      stabAi: '🤖 هوشواره (AI)',
      stabDetect: '🎯 تشخیص و قالب',
      stabSites: '🧠 دکمه شناور',
      stabBackup: '💾 بکاپ و فایل متنی',
      langLegend: '🌐 زبان رابط کاربری (Language)',
      langSelectLbl: 'زبان پنل مدیریت و ویجت چت را انتخاب کنید:',
      themeLegend: '🎨 تم و ظاهر پنل (شخصی‌سازی و حالت شیشه‌ای)',
      themeHint: 'تم انتخاب‌شده فوراً روی پنل مدیریت و ویجت شناور داخل همه سایت‌های هوش مصنوعی اعمال می‌شود:',
      fontLegend: '🔤 فونت رابط کاربری (تایپوگرافی)',
      fontHint: 'به‌طور پیش‌فرض از فونت استاندارد وزیرمتن (Vazirmatn) استفاده می‌شود. می‌توانید فونت دلخواه خود (TTF, WOFF, WOFF2, OTF) را آپلود کنید:',
      uploadFontBtn: '📤 آپلود فونت دلخواه',
      resetFontBtn: '🔄 بازگردانی به وزیرمتن',
      currentFontPrefix: 'فونت فعال: ',
      defaultFontName: 'وزیرمتن (پیش‌فرض)',
      fontPreviewSample: 'پیش‌نمایش قلم: لایب‌مموری — پل هوشمند حافظه بلندمدت هوش مصنوعی (۱۲۳۴۵۶۷۸۹۰)',
      fontTooLarge: 'حجم فایل فونت بیش از حد مجاز است (حداکثر ۸ مگابایت)',
      fontApplied: 'فونت دلخواه با موفقیت اعمال شد!',
      fontRestored: 'فونت پیش‌فرض وزیرمتن فعال شد',
      fontError: 'خطا در بارگذاری فایل فونت',
      aiLegend: 'سرویس هوشواره (AI)',
      providerLbl: 'نوع سرویس هوش مصنوعی',
      providerGemini: 'Google Gemini (API رسمی جیمنای)',
      providerClaude: 'Anthropic Claude (هوش مصنوعی کلاود)',
      providerOpenai: 'سازگار با OpenAI (OpenAI, DeepSeek, Groq, OpenRouter, Ollama و ...)',
      gKeyLbl: 'کلید API جیمنای (دریافت از Google AI Studio)',
      cKeyLbl: 'کلید API کلاود (Anthropic Console)',
      modelLbl: 'نام مدل',
      baseUrlLbl: 'آدرس پایه API (Base URL)',
      apiKeyLbl: 'کلید API',
      testKeyBtn: '🔌 تست اتصال به هوشواره',
      capLbl: 'سقف درخواست روزانه افزونه (۰ = بدون سقف)',
      resetCdBtn: 'رفع وضعیت محدودیت سهمیه',
      autoDetectLegend: 'پیدا کردن خودکار حافظه‌های مرتبط با پرامپت',
      autoDetectLbl: 'نحوه تشخیص پیش‌فرض حافظه‌ها هنگام تایپ پرامپت:',
      modeOff: 'خاموش (انتخاب دستی توسط کاربر)',
      modeManualMethod: '⚡ روش دستی (جستجوی هوشمند محلی، سریع و بدون نیاز به هوشواره)',
      modeAi: '🤖 با هوشواره (تطبیق معنایی با Gemini / Claude / OpenAI)',
      autoDetectHint: 'در «روش دستی»، موتور ترکیبی هوشمند (تطبیق واژگان، ریشه‌یابی، عبارات و امتیازدهی وزنی BM25 + کسینوسی) بدون نیاز به اینترنت یا API، دقیق‌ترین حافظه‌ها را پیدا و انتخاب می‌کند.',
      fabLegend: 'دکمه شناور (🧠) در سایت‌های هوش مصنوعی',
      fabEnableLbl: 'فعال بودن دکمه شناور',
      fabSideLbl: 'پیش‌فرض: سمت',
      sideLeft: 'چپ',
      sideRight: 'راست',
      fabBottomLbl: 'فاصله از پایین (px)',
      fabSiteOverrideLbl: 'تنظیم مکان و نمایش اختصاصی برای هر سایت:',
      thSite: 'سایت',
      thShow: 'نمایش',
      thSide: 'سمت',
      thBottom: 'فاصله از پایین',
      tplLegend: 'قالب ارسال حافظه به چت',
      tplHeaderLbl: 'متن سربرگ قبل از حافظه‌ها',
      tplSepLbl: 'جداکننده قبل از پرامپت شما',
      tplResetBtn: 'بازگردانی قالب پیش‌فرض',
      // Backup & Text Export/Import Tab
      backupJsonLegend: '📦 پشتیبان‌گیری و بازیابی کامل (فرمت JSON)',
      backupJsonHint: 'شامل تمام حافظه‌ها، دسته‌بندی‌ها، متغیرهای پویا و تنظیمات شما در یک فایل استاندارد:',
      exportJsonBtn: '⬇️ دانلود بکاپ کامل (JSON)',
      importJsonBtn: '⬆️ بازیابی از فایل بکاپ (JSON)',
      backupTxtLegend: '📄 خروجی و ورودی طبقه‌بندی‌شده متنی (فایل Text / .txt)',
      backupTxtHint: 'تمام حافظه‌ها را به شکل دسته‌بندی‌شده و پاراگرافی در یک فایل متنی (.txt) خوانا ذخیره کنید، یا فایل متنی خودتان را با همان قالب وارد کنید تا حافظه‌ها و دسته‌ها خودکار ساخته شوند:',
      exportTxtBtn: '📄 دانلود خروجی متنی طبقه‌بندی‌شده (.txt)',
      importTxtBtn: '📥 افزودن حافظه‌ها از فایل متنی (.txt)',
      pasteTxtToggleBtn: '✍️ درج مستقیم متن طبقه‌بندی‌شده',
      pasteTxtApplyBtn: '✅ پردازش و افزودن حافظه‌ها از متن',
      txtFormatGuideTitle: '📌 راهنمای قالب استاندارد فایل متنی (.txt) برای ورود حافظه‌ها:',
      txtFormatGuideDesc: 'فایل متنی شما می‌تواند شامل دسته‌ها (با ## یا [دسته: نام]) و عنوان هر حافظه (با ### یا [عنوان] یا 📌 برای سنجاق‌شده) و در ادامه پاراگراف توضیحات باشد. حتی اگر فقط پاراگراف‌های جداشده با خط خالی یا --- بگذارید، لایب‌مموری خودکار برایشان عنوان و دسته انتخاب می‌کند!',
      saveSettingsBtn: 'ذخیره تنظیمات',
      // Content Script Panel
      panelAutoLbl: 'تشخیص خودکار:',
      panelModeOff: 'خاموش',
      panelModeManual: '⚡ روش دستی (بدون هوشواره)',
      panelModeAi: '🤖 با هوشواره (AI)',
      detectNowBtn: '🎯 تشخیص الان',
      panelSearchPh: 'جستجو در دسته‌ها، عنوان و متن (روش دستی)...',
      manualMethodBtn: '⚡ روش دستی',
      manualMethodTitle: 'پیدا کردن قوی‌ترین حافظه‌های مرتبط با پرامپت با روش دستی (بدون نیاز به اینترنت یا هوشواره)',
      aiSelectBtn: '🤖 انتخاب با هوشواره',
      selAllBtn: 'انتخاب همه',
      selNoneBtn: 'لغو انتخاب',
      onlySelBtn: 'فقط انتخاب‌شده‌ها',
      showAllBtn: 'نمایش همه',
      colAllBtn: 'جمع/باز',
      addMemBtn: '+ حافظه',
      saveManualBtn: 'ذخیره دستی',
      extractAiBtn: '🤖 استخراج با هوشواره',
      insertBtn: 'درج در پرامپت',
      insertSendBtn: 'درج و ارسال',
      slashHeader: '🧠 انتخاب سریع حافظه لایب‌مموری (/ یا /mem) — ↑↓ و Enter',
      cntFmt: '({m} حافظه · {c} دسته)',
      selInfoFmt: '{n} انتخاب شده',
      panelEmpty: 'هنوز حافظه‌ای نساختی. با «+ حافظه» شروع کن.',
      // Toasts & Messages
      msgWritePromptFirst: 'ابتدا پرامپتت را در کادر چت بنویس',
      msgManualFound: '⚡ {n} حافظه مرتبط با روش دستی انتخاب شد',
      msgManualNone: 'با روش دستی حافظه مرتبطی پیدا نشد',
      msgAiFound: '🤖 {n} حافظه مرتبط با هوشواره انتخاب شد',
      msgAiNone: 'هوشواره حافظه مرتبطی پیدا نکرد',
      msgAiFallback: 'هوشواره در دسترس نبود؛ با روش دستی {n} حافظه انتخاب شد',
      msgSaved: 'ذخیره شد ✅',
      msgDeleted: 'حذف شد 🗑',
      msgInserted: '{n} حافظه در پرامپت درج شد',
      msgNoInput: 'کادر چت پیدا نشد. یک بار داخل کادر چت کلیک کن و دوباره امتحان کن',
      msgSelectAtLeastOne: 'ابتدا حداقل یک حافظه را انتخاب کن',
      msgTitleContentReq: 'عنوان و متن هر دو لازم است',
      msgTxtImported: '✅ {a} حافظه جدید اضافه شد و {u} حافظه به‌روزرسانی شد'
    },
    en: {
      appTitle: '🧠 LibMemory',
      pageTitle: 'LibMemory | Smart AI Memory Manager',
      varsBtn: '🧩 Variables',
      reviewBtn: '🔄 Update Memories',
      tutBtn: '📖 Full Guide',
      settingsBtn: '⚙️ Settings',
      catsTitle: '📁 Categories',
      catSearchPh: 'Search categories...',
      newCatTitle: 'New category',
      aiCatBtn: '🤖 Categorize with AI',
      localCatBtn: '⚡ Categorize (Manual Method)',
      memSearchPh: '🔍 Smart search & rank (Manual Method)...',
      sortRelevance: 'Best Match (Manual Method)',
      sortUpdated: 'Last Updated',
      sortCreated: 'Date Created',
      sortTitle: 'Title (A–Z)',
      newManualBtn: '+ Manual',
      newAiBtn: '🤖 With AI',
      batchSelectCount: 'Selected: {n}',
      batchPinBtn: '📌 Pin',
      batchDelBtn: '🗑 Delete',
      editorEmpty: 'Select a memory to view & edit, or click "+ Manual" to create one.',
      titlePh: 'Memory title...',
      pinBtn: '📌 Pin',
      pinnedBtn: '📌 Pinned',
      catLbl: 'Category:',
      insertVarHint: 'Insert variable:',
      contentPh: 'Memory content... You can use {variable} placeholders',
      saveBtn: '💾 Save (Ctrl+S)',
      cancelBtn: 'Cancel',
      sumBtn: '🤖 Summarize with AI',
      delMemBtn: '🗑 Delete Memory',
      allCats: '🗂 All',
      uncat: '📄 Uncategorized',
      otherCat: 'Other',
      noCatOpt: '— Uncategorized —',
      newCatOpt: '➕ New category...',
      noCatFound: 'No categories found',
      noResult: 'No matching memories found',
      noMemsYet: 'No memories yet',
      statsFmt: '{m} memories · {c} categories · {ch} chars',
      metaFmt: 'Created: {c} · Updated: {u} · {len} chars',
      metaNewFmt: '{len} chars',
      aiOff: '🤖 AI Off (No API Key)',
      aiLimited: '🤖 Rate-limited until {t} · Manual features active',
      aiCapReached: '🤖 Daily AI cap reached ({u}/{c})',
      aiActive: '🤖 AI Active ({p}) · Today: {u}{c}',
      // Dialogs
      varsDlgTitle: '🧩 Dynamic Variables',
      varsDlgHint: 'Define variables and place them as {variable_name} inside any memory title or content. Updating a value here updates it everywhere automatically.',
      newVarNamePh: 'Variable name (e.g. current_project, role)',
      newVarValPh: 'Variable value (can also include {date})',
      addVarBtn: '+ Add Variable',
      thVarName: 'Variable',
      thVarVal: 'Value',
      thVarPreview: 'Live Preview',
      thVarAct: 'Action',
      sysVarsHint: 'Built-in system variables: {date}, {today}, {time}, {تاریخ}, {امروز}, {ساعت}',
      closeBtn: 'Close',
      // Review / Update Dialog
      reviewDlgTitle: '🔄 Update Memories (Manual & AI)',
      reviewDlgHint: 'Keep your memories up to date! Choose between Manual Update (no AI required) or AI Update. In both modes, you can freely edit the proposed title and content in the preview before confirming.',
      reviewModeManualTab: '⚡ Manual Update (No AI)',
      reviewModeAiTab: '🤖 Update with AI',
      reviewOldTermPh: 'Old text to replace (optional, e.g. Python 3.10)',
      reviewNewTermPh: 'New text or update note (e.g. Python 3.12)',
      reviewManualNotePh: 'Or type keywords / changes to find related memories using the Manual Method...',
      reviewManualFindBtn: '🔍 Find Related Memories & Preview Changes (Manual)',
      reviewInstructionPh: 'Describe what changed in plain language (e.g. "I switched from Python 3.10 to 3.12")...',
      reviewAiGoBtn: '🤖 Analyze & Suggest Updates with AI',
      reviewApplyBtn: '✅ Confirm & Apply Selected Updates',
      reviewCancelBtn: 'Cancel & Close',
      diffApplyCheck: 'Apply this update',
      diffOldTitle: 'Current Version:',
      diffNewTitle: 'New Preview (Editable before confirming):',
      diffTitleInputPh: 'Updated memory title...',
      // AI Create Dialog
      aiDlgTitle: '🤖 Extract & Create Memories',
      aiDlgHint: 'Paste raw text or notes here. Extract key facts with AI or create a smart draft using the Manual Method.',
      aiSrcPh: 'Paste raw text here...',
      aiGoBtn: '✨ Extract with AI',
      aiManualBtn: '⚡ Create Draft (Manual Method)',
      aiSaveAllBtn: '💾 Save Selected Memories',
      draftSaveCheck: 'Save this memory',
      // Summarize Dialog
      sumDlgTitle: '🤖 AI Summarizer',
      sumApplyBtn: 'Replace in Editor',
      // Settings Dialog & Tabs
      settingsDlgTitle: '⚙️ LibMemory Settings & Customization',
      stabAppearance: '🎨 Appearance & Language',
      stabAi: '🤖 AI Provider',
      stabDetect: '🎯 Detection & Template',
      stabSites: '🧠 Floating Widget',
      stabBackup: '💾 Backup & Text I/O',
      langLegend: '🌐 Interface Language',
      langSelectLbl: 'Choose the display language for the Manager & Chat Panel:',
      themeLegend: '🎨 Theme & Glassmorphism Appearance',
      themeHint: 'Your selected theme applies immediately to both the Manager and the floating widget across all AI websites:',
      fontLegend: '🔤 Interface Typography & Font',
      fontHint: 'By default, the beautiful Vazirmatn font is used. You can upload any custom font file (TTF, WOFF, WOFF2, OTF):',
      uploadFontBtn: '📤 Upload Custom Font',
      resetFontBtn: '🔄 Reset to Vazirmatn',
      currentFontPrefix: 'Active Font: ',
      defaultFontName: 'Vazirmatn (Default)',
      fontPreviewSample: 'Typography Preview: LibMemory — Smart AI Long-Term Memory Bridge (1234567890)',
      fontTooLarge: 'Font file exceeds 8MB limit',
      fontApplied: 'Custom font applied successfully!',
      fontRestored: 'Restored to default Vazirmatn font',
      fontError: 'Failed to load font file',
      aiLegend: 'AI Service Provider',
      providerLbl: 'AI Provider',
      providerGemini: 'Google Gemini (Official Gemini API)',
      providerClaude: 'Anthropic Claude (Official Claude API)',
      providerOpenai: 'OpenAI-Compatible (OpenAI, DeepSeek, Groq, OpenRouter, Ollama, ...)',
      gKeyLbl: 'Gemini API Key (Get free from Google AI Studio)',
      cKeyLbl: 'Claude API Key (Get from Anthropic Console)',
      modelLbl: 'Model Name',
      baseUrlLbl: 'API Base URL',
      apiKeyLbl: 'API Key',
      testKeyBtn: '🔌 Test AI Connection',
      capLbl: 'Daily AI Request Cap (0 = Unlimited)',
      resetCdBtn: 'Clear Rate-Limit Cooldown',
      autoDetectLegend: 'Automatic Memory Detection for Prompts',
      autoDetectLbl: 'Default detection mode when typing prompts:',
      modeOff: 'Off (Select manually)',
      modeManualMethod: '⚡ Manual Method (Smart offline matching, fast, no API needed)',
      modeAi: '🤖 With AI (Semantic matching via Gemini / Claude / OpenAI)',
      autoDetectHint: 'In "Manual Method", our hybrid local engine (BM25 + TF-IDF Cosine + Character N-grams + Phrase & Stem matching) finds the best memories offline without using any API quota.',
      fabLegend: 'Floating Button (🧠) on AI Websites',
      fabEnableLbl: 'Enable floating button',
      fabSideLbl: 'Default side:',
      sideLeft: 'Left',
      sideRight: 'Right',
      fabBottomLbl: 'Bottom offset (px)',
      fabSiteOverrideLbl: 'Per-site display & position settings:',
      thSite: 'Website',
      thShow: 'Show',
      thSide: 'Side',
      thBottom: 'Bottom (px)',
      tplLegend: 'Prompt Injection Template',
      tplHeaderLbl: 'Header text before memories',
      tplSepLbl: 'Separator before your prompt',
      tplResetBtn: 'Reset Default Template',
      // Backup & Text Export/Import Tab
      backupJsonLegend: '📦 Full Backup & Restore (JSON Format)',
      backupJsonHint: 'Includes all memories, categories, dynamic variables, and extension settings:',
      exportJsonBtn: '⬇️ Export Full Backup (.json)',
      importJsonBtn: '⬆️ Restore from Backup (.json)',
      backupTxtLegend: '📄 Categorized Text Export & Import (.txt)',
      backupTxtHint: 'Export all your memories into a clean, categorized, paragraph-style .txt file, or import memories from a structured .txt file:',
      exportTxtBtn: '📄 Export Categorized Text (.txt)',
      importTxtBtn: '📥 Import Memories from Text File (.txt)',
      pasteTxtToggleBtn: '✍️ Paste Formatted Text Directly',
      pasteTxtApplyBtn: '✅ Parse & Import Memories from Text',
      txtFormatGuideTitle: '📌 Format Guide for Importing Text (.txt) Files:',
      txtFormatGuideDesc: 'Use "## Category Name" (or "[Category: Name]") for categories, and "### Memory Title" (add 📌 to pin) followed by the paragraph content. Even if you import plain paragraphs separated by "---", LibMemory automatically titles and categorizes them!',
      saveSettingsBtn: 'Save Settings',
      // Content Script Panel
      panelAutoLbl: 'Auto-Detect:',
      panelModeOff: 'Off',
      panelModeManual: '⚡ Manual Method (Offline)',
      panelModeAi: '🤖 With AI',
      detectNowBtn: '🎯 Detect Now',
      panelSearchPh: 'Search categories, titles & content (Manual Method)...',
      manualMethodBtn: '⚡ Manual Method',
      manualMethodTitle: 'Find relevant memories using the smart offline Manual Method (no internet or API needed)',
      aiSelectBtn: '🤖 Select with AI',
      selAllBtn: 'Select All',
      selNoneBtn: 'Clear',
      onlySelBtn: 'Selected Only',
      showAllBtn: 'Show All',
      colAllBtn: 'Fold/Expand',
      addMemBtn: '+ Memory',
      saveManualBtn: 'Save Manually',
      extractAiBtn: '🤖 Extract with AI',
      insertBtn: 'Insert into Prompt',
      insertSendBtn: 'Insert & Send',
      slashHeader: '🧠 LibMemory Quick Pick (/ or /mem) — ↑↓ & Enter',
      cntFmt: '({m} memories · {c} cats)',
      selInfoFmt: '{n} selected',
      panelEmpty: 'No memories yet. Click "+ Memory" to add one.',
      // Toasts & Messages
      msgWritePromptFirst: 'Write your prompt in the chat box first',
      msgManualFound: '⚡ {n} relevant memories selected (Manual Method)',
      msgManualNone: 'No matching memories found with Manual Method',
      msgAiFound: '🤖 {n} relevant memories selected by AI',
      msgAiNone: 'AI found no relevant memories',
      msgAiFallback: 'AI unavailable; selected {n} memories via Manual Method',
      msgSaved: 'Saved ✅',
      msgDeleted: 'Deleted 🗑',
      msgInserted: '{n} memories inserted into prompt',
      msgNoInput: 'Chat input not found. Click inside the chat input box once and try again.',
      msgSelectAtLeastOne: 'Select at least one memory first',
      msgTitleContentReq: 'Both title and content are required',
      msgTxtImported: '✅ Imported {a} new memories and updated {u} existing memories'
    }
  };

  function t(key, lang = 'fa', vars = {}) {
    const dict = I18N[lang] || I18N.fa;
    let str = dict[key] ?? I18N.fa[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return str;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '')
    .toLowerCase()
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  const STOP = new Set(('و در به از که این آن را با برای است هست بود های ها یک تا بر یا هم نیز اما اگر چه چون می ای من تو او ما شما آنها خود کرد کند کنم شود شد باشد دارد داره رو هر همه بین پس روی زیر بعد قبل خیلی باید نه ' +
    'the a an and or of to in on for is are was were be been being it its this that these those with as at by from my your his her our their i you me we they not no do does did can could will would should may might just about into over after before').split(' '));

  function stem(w) {
    if (w.length <= 3) return w;
    let s = w
      .replace(/^(?:می|نمی|بی|با)\s*/, '')
      .replace(/(?:ها|های|هایی|هایم|هایت|هایش|هایمان|هایتان|هایشان)$/, '')
      .replace(/(?:مان|تان|شان|ام|ات|اش|ای|یی)$/, '')
      .replace(/(?:تر|ترین|انه|گان)$/, '');
    if (/^[a-z0-9]+$/.test(s) && s.length > 4) {
      s = s.replace(/(?:ingly|edly|ings|ing|ed|ies|es|s|ly|ment|ness|tion|ations)$/, (m) => (m === 'ies' ? 'y' : ''));
    }
    return s.length >= 2 ? s : w;
  }

  function tokens(s) {
    const clean = norm(s);
    const words = clean.split(/[^\p{L}\p{N}.+#_-]+/u).map(w => w.replace(/^[._-]+|[._-]+$/g, '')).filter((w) => w.length > 1 && !STOP.has(w));
    const result = [];
    for (const w of words) {
      result.push(w);
      const st = stem(w);
      if (st && st !== w && st.length > 1 && !STOP.has(st)) {
        result.push(st);
      }
      if (/[._+-]/.test(w)) {
        w.split(/[._+-]+/).filter(p => p.length > 1 && !STOP.has(p)).forEach(p => result.push(p));
      }
    }
    return result;
  }

  function charNgrams(s, n = 3) {
    const clean = norm(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const grams = new Set();
    for (const word of clean.split(/\s+/)) {
      if (word.length < 2) continue;
      if (word.length <= n) { grams.add(word); continue; }
      for (let i = 0; i <= word.length - n; i++) {
        grams.add(word.slice(i, i + n));
      }
    }
    return grams;
  }

  function wordBigrams(wordList) {
    const set = new Set();
    for (let i = 0; i < wordList.length - 1; i++) {
      set.add(wordList[i] + '_' + wordList[i + 1]);
    }
    return set;
  }

  // ---------- Unified Strongest Manual Method Engine ----------
  function manualScoreMemories(queryText, memories, categories, options = {}) {
    const {
      minScore = 0.035,
      includeAll = false
    } = options;

    if (!memories || !memories.length) return [];
    const qClean = flat(norm(queryText));
    if (!qClean) {
      return memories.map(m => ({ memory: m, id: m.id, score: m.pinned ? 0.01 : 0 }));
    }

    const qTokens = tokens(queryText);
    const qGrams = charNgrams(queryText, 3);
    const qBigrams = wordBigrams(qTokens);
    const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));

    const N = memories.length;
    const df = {};
    let totalDocLen = 0;

    const docs = memories.map(m => {
      const catName = catMap[m.categoryId] || '';
      const titleNorm = norm(m.title || '');
      const contentNorm = norm(m.content || '');
      const catNorm = norm(catName);

      const tTokens = tokens(m.title || '');
      const cTokens = tokens(catName);
      const bTokens = tokens(m.content || '');

      const weightedWords = [
        ...tTokens, ...tTokens, ...tTokens,
        ...cTokens, ...cTokens,
        ...bTokens
      ];
      totalDocLen += weightedWords.length || 1;

      const unique = new Set(weightedWords);
      unique.forEach(w => { df[w] = (df[w] || 0) + 1; });

      return {
        memory: m,
        id: m.id,
        pinned: !!m.pinned,
        titleNorm,
        contentNorm,
        catNorm,
        fullNorm: `${titleNorm} ${catNorm} ${contentNorm}`,
        weightedWords,
        docLen: weightedWords.length || 1,
        bigrams: wordBigrams([...tTokens, ...bTokens]),
        grams: charNgrams(`${m.title} ${catName} ${m.content.slice(0, 600)}`, 3)
      };
    });

    const avgDocLen = (totalDocLen / N) || 1;

    const qTf = {};
    qTokens.forEach(w => { qTf[w] = (qTf[w] || 0) + 1; });
    const qVec = {};
    let qNorm = 0;
    for (const w in qTf) {
      const idf = Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
      const weight = (1 + Math.log(qTf[w])) * Math.max(0.2, idf);
      qVec[w] = weight;
      qNorm += weight * weight;
    }
    qNorm = Math.sqrt(qNorm);

    const k1 = 1.5, b = 0.75;

    const results = docs.map(d => {
      const mTf = {};
      d.weightedWords.forEach(w => { mTf[w] = (mTf[w] || 0) + 1; });

      let bm25 = 0;
      let dot = 0;
      let mNorm = 0;

      for (const w in mTf) {
        const tf = mTf[w];
        const idf = Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
        const tfidfWeight = (1 + Math.log(tf)) * Math.max(0.2, idf);
        mNorm += tfidfWeight * tfidfWeight;

        if (qVec[w]) {
          dot += qVec[w] * tfidfWeight;
          const num = tf * (k1 + 1);
          const den = tf + k1 * (1 - b + b * (d.docLen / avgDocLen));
          bm25 += Math.max(0.25, idf) * (num / den);
        }
      }
      mNorm = Math.sqrt(mNorm);
      const cosine = (qNorm > 0 && mNorm > 0) ? (dot / (qNorm * mNorm)) : 0;
      const normBm25 = bm25 / (bm25 + 4);

      let phraseBoost = 0;
      if (qClean.length >= 2) {
        if (d.titleNorm.includes(qClean)) phraseBoost += 0.45;
        else if (d.catNorm && d.catNorm.includes(qClean)) phraseBoost += 0.3;
        else if (d.contentNorm.includes(qClean)) phraseBoost += 0.25;
      }
      if (qBigrams.size > 0) {
        let bgHits = 0;
        for (const bg of qBigrams) if (d.bigrams.has(bg)) bgHits++;
        phraseBoost += Math.min(0.3, (bgHits / qBigrams.size) * 0.35);
      }

      let dice = 0;
      if (qGrams.size > 0 && d.grams.size > 0) {
        let inter = 0;
        for (const g of qGrams) if (d.grams.has(g)) inter++;
        dice = (2 * inter) / (qGrams.size + d.grams.size);
      }

      const hybridScore = (normBm25 * 0.45) + (cosine * 0.30) + phraseBoost + (dice * 0.25);

      return {
        memory: d.memory,
        id: d.id,
        pinned: d.pinned,
        score: hybridScore
      };
    });

    return results
      .filter(x => includeAll || x.score >= minScore)
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.04) return b.score - a.score;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.memory.updatedAt || 0) - (a.memory.updatedAt || 0);
      });
  }

  function cosineSuggest(prompt, memories, categories, maxItems = 7, minThreshold = 0.055) {
    return manualScoreMemories(prompt, memories, categories, { minScore: minThreshold })
      .slice(0, maxItems)
      .map(x => x.id);
  }

  function localSuggest(prompt, memories, categories) {
    return cosineSuggest(prompt, memories, categories, 7, 0.055);
  }

  function localCategorize(mem, categories, memories) {
    if (!categories || !categories.length) return null;
    const queryText = `${mem.title || ''} ${mem.title || ''} ${mem.content || ''}`;

    const virtualDocs = categories.map(c => {
      const members = (memories || []).filter(m => m.categoryId === c.id && m.id !== mem.id);
      const memberText = members.map(m => `${m.title} ${m.content.slice(0, 350)}`).join(' ');
      return {
        id: c.id,
        title: `${c.name} ${c.name} ${c.name}`,
        content: memberText || c.name,
        categoryId: c.id,
        pinned: false,
        _catObj: c
      };
    });

    const scored = manualScoreMemories(queryText, virtualDocs, categories, { minScore: 0.03 });
    return scored.length ? scored[0].memory._catObj : null;
  }

  function manualReviewUpdates({ instruction, oldTerm, newTerm, memories, categories }) {
    if (!memories || !memories.length) return [];
    const oldT = String(oldTerm || '').trim();
    const newT = String(newTerm || '').trim();
    const instr = String(instruction || '').trim();

    let parsedOld = oldT, parsedNew = newT;
    if (!parsedOld && !parsedNew && instr) {
      const arrowMatch = instr.match(/^(.+?)\s*(?:->|=>|-->|→|به)\s*(.+)$/);
      if (arrowMatch && arrowMatch[1].length < 80 && arrowMatch[2].length < 150) {
        parsedOld = arrowMatch[1].trim();
        parsedNew = arrowMatch[2].trim();
      }
    }

    const searchQuery = [parsedOld, instr, parsedNew].filter(Boolean).join(' ');
    if (!searchQuery) return [];

    const scored = manualScoreMemories(searchQuery, memories, categories, { minScore: 0.03 });
    const exactHolders = parsedOld
      ? memories.filter(m => norm(m.title + ' ' + m.content).includes(norm(parsedOld)))
      : [];

    const candidateMap = new Map();
    exactHolders.forEach(m => candidateMap.set(m.id, { memory: m, score: 1.0 }));
    scored.slice(0, 12).forEach(x => {
      if (!candidateMap.has(x.id)) candidateMap.set(x.id, x);
    });

    const updates = [];
    for (const { memory: m } of candidateMap.values()) {
      let newTitle = m.title;
      let newContent = m.content;
      let reason = 'یافت‌شده با روش دستی (قابل ویرایش)';

      if (parsedOld && parsedNew) {
        const re = new RegExp(parsedOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (re.test(newTitle) || re.test(newContent)) {
          newTitle = newTitle.replace(re, parsedNew);
          newContent = newContent.replace(re, parsedNew);
          reason = `جایگزینی «${parsedOld}» با «${parsedNew}»`;
        } else if (instr) {
          newContent = `${m.content.trim()}\n• به‌روزرسانی: ${instr}`;
          reason = 'افزودن یادداشت به‌روزرسانی به حافظه مرتبط';
        }
      } else if (parsedNew && !parsedOld) {
        newContent = `${m.content.trim()}\n• ${parsedNew}`;
        reason = 'افزودن مورد جدید به حافظه مرتبط';
      } else if (instr) {
        newContent = `${m.content.trim()}\n• ${instr}`;
        reason = 'حافظه مرتبط یافت‌شده با روش دستی';
      }

      updates.push({
        id: m.id,
        oldTitle: m.title,
        newTitle,
        oldContent: m.content,
        newContent,
        reason,
        approved: true
      });
    }
    return updates;
  }

  function heuristicTitle(text, lang = 'fa') {
    const fallback = lang === 'en' ? 'New Memory' : 'حافظه جدید';
    const line = String(text || '').split('\n').map((l) => l.replace(/^[#>*\-\s\d.)]+/, '').trim()).find(Boolean) || fallback;
    if (line.length <= 60) return line;
    const cut = line.slice(0, 60);
    return cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : 60) + '…';
  }

  // ---------- Categorized Paragraph-Style Text (.txt) Exporter & Parser ----------
  function exportMemoriesToText(memories, categories, customVars = [], lang = 'fa') {
    const isEn = lang === 'en';
    const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));
    const uncatLabel = isEn ? 'Uncategorized' : 'بدون دسته';

    const groups = new Map();
    const sortedC = [...(categories || [])].sort((a, b) => a.name.localeCompare(b.name, lang));
    sortedC.forEach(c => groups.set(c.id, []));
    groups.set(UNCAT, []);

    (memories || []).forEach(m => {
      const k = catMap[m.categoryId] ? m.categoryId : UNCAT;
      groups.get(k).push(m);
    });

    const lines = [];
    lines.push('============================================================');
    lines.push(isEn
      ? '# LibMemory — Categorized Long-Term Memory Backup (.txt)'
      : '# لایب‌مموری (LibMemory) — فایل پشتیبان متنی و طبقه‌بندی‌شده حافظه‌ها');
    lines.push(isEn
      ? `# Date: ${new Date().toISOString().slice(0, 10)} | Total Memories: ${(memories || []).length}`
      : `# تاریخ خروجی: ${new Date().toLocaleDateString('fa-IR')} | تعداد کل حافظه‌ها: ${(memories || []).length}`);
    lines.push('============================================================');
    lines.push('');

    if (customVars && customVars.length) {
      lines.push(isEn ? '## [Variables]' : '## [متغیرها]');
      customVars.forEach(v => {
        if (v && v.name) lines.push(`${v.name} = ${v.value ?? ''}`);
      });
      lines.push('');
      lines.push('------------------------------------------------------------');
      lines.push('');
    }

    for (const [k, list] of groups.entries()) {
      if (!list.length) continue;
      const catName = k === UNCAT ? uncatLabel : catMap[k];
      lines.push(`## 📁 ${catName}`);
      lines.push('');

      const sortedList = [...list].sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : (b.updatedAt || 0) - (a.updatedAt || 0)));
      sortedList.forEach(m => {
        const pinPrefix = m.pinned ? '📌 ' : '';
        lines.push(`### ${pinPrefix}${m.title.trim()}`);
        lines.push(m.content.trim());
        lines.push('');
      });
      lines.push('------------------------------------------------------------');
      lines.push('');
    }

    return lines.join('\n').trim() + '\n';
  }

  // Flexible parser for categorized & paragraph-style .txt imports
  function parseMemoriesFromText(rawText, lang = 'fa') {
    const text = String(rawText || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { memories: [], variables: [] };

    const lines = text.split('\n');
    const parsedMemories = [];
    const parsedVariables = [];

    let currentCategory = '';
    let inVarsSection = false;
    let currentTitle = null;
    let currentPinned = false;
    let currentLines = [];

    const isUncatName = (name) => {
      const n = norm(flat(name));
      return !n || n === 'بدون دسته' || n === 'uncategorized' || n === 'سایر' || n === 'other' || n === 'عمومی';
    };

    const flushMemory = () => {
      const body = currentLines.join('\n').trim();
      if (!currentTitle && !body) {
        currentLines = [];
        return;
      }
      if (currentTitle && body) {
        parsedMemories.push({
          title: flat(currentTitle),
          content: body,
          category: isUncatName(currentCategory) ? '' : flat(currentCategory),
          pinned: currentPinned
        });
      } else if (!currentTitle && body) {
        // Plain paragraphs without explicit ### title: split by double blank lines if no headings were used
        const blocks = body.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
        blocks.forEach(blk => {
          const blkLines = blk.split('\n');
          let title = heuristicTitle(blk, lang);
          let content = blk;
          // If first line is short and looks like a title ("عنوان: ..." or ends with colon)
          if (blkLines.length > 1 && blkLines[0].length <= 75) {
            const firstClean = blkLines[0].replace(/^(?:عنوان|title)\s*[:：-]\s*/i, '').trim();
            if (firstClean) {
              title = firstClean;
              content = blkLines.slice(1).join('\n').trim() || firstClean;
            }
          }
          parsedMemories.push({
            title,
            content,
            category: isUncatName(currentCategory) ? '' : flat(currentCategory),
            pinned: false
          });
        });
      }
      currentTitle = null;
      currentPinned = false;
      currentLines = [];
    };

    for (let rawLine of lines) {
      const trimmed = rawLine.trim();

      // Skip decorative divider lines or file banner comments
      if (/^[=_-]{4,}$/.test(trimmed)) {
        if (!currentTitle && currentLines.length) flushMemory();
        continue;
      }
      if (/^#\s*(?:لایب‌مموری|LibMemory|تاریخ خروجی|Date:)/i.test(trimmed)) {
        continue;
      }

      // Check Category Heading: `## Category` or `[دسته: نام]` or `دسته: نام`
      const catMatch = trimmed.match(/^(?:##\s+|\[(?:دسته|دسته‌بندی|category)\s*[:：]?\s*)(.+?)(?:\])?$/i)
        || (!currentTitle && trimmed.match(/^(?:📁\s*)?(?:دسته|دسته‌بندی|category)\s*[:：]\s*(.+)$/i));

      if (catMatch && !trimmed.startsWith('###')) {
        flushMemory();
        let cName = catMatch[1].replace(/^📁\s*/, '').trim();
        if (/^\[?(?:متغیرها|variables)\]?$/i.test(cName)) {
          inVarsSection = true;
          currentCategory = '';
        } else {
          inVarsSection = false;
          currentCategory = cName;
        }
        continue;
      }

      if (inVarsSection) {
        if (!trimmed) continue;
        const vm = trimmed.match(/^\{?([^={}]+)\}?\s*=\s*(.*)$/);
        if (vm) {
          parsedVariables.push({ name: flat(vm[1]), value: vm[2].trim() });
          continue;
        }
      }

      // Check Memory Title Heading: `### Title` or `[عنوان حافظه]` (when on its own line)
      const titleMatch = trimmed.match(/^###\s+(.+)$/);
      if (titleMatch) {
        flushMemory();
        inVarsSection = false;
        let tRaw = titleMatch[1].trim();
        let pinned = false;
        if (tRaw.startsWith('📌') || /\[pinned\]|\[سنجاق\]/i.test(tRaw)) {
          pinned = true;
          tRaw = tRaw.replace(/^📌\s*/, '').replace(/\[(?:pinned|سنجاق)\]/gi, '').trim();
        }
        currentTitle = tRaw;
        currentPinned = pinned;
        continue;
      }

      currentLines.push(rawLine);
    }

    flushMemory();
    return { memories: parsedMemories, variables: parsedVariables };
  }

  function resolveVariables(text, customVars = []) {
    if (!text) return '';
    const now = new Date();
    const dJalali = now.toLocaleDateString('fa-IR');
    const dGreg = now.toISOString().slice(0, 10);
    const dTimeFa = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dTimeEn = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dWeekdayFa = now.toLocaleDateString('fa-IR', { weekday: 'long' });
    const dWeekdayEn = now.toLocaleDateString('en-US', { weekday: 'long' });

    const sysVars = {
      'تاریخ': dJalali,
      'تاریخ_شمسی': dJalali,
      'تاریخ_میلادی': dGreg,
      'امروز': `${dWeekdayFa} ${dJalali}`,
      'روز': dWeekdayFa,
      'ساعت': dTimeFa,
      'زمان': `${dJalali} ساعت ${dTimeFa}`,
      'date': dGreg,
      'today': `${dWeekdayEn}, ${dGreg}`,
      'time': dTimeEn
    };

    const varMap = { ...sysVars };
    (customVars || []).forEach(v => {
      if (v && v.name) varMap[v.name.trim()] = String(v.value ?? '');
    });

    let result = String(text);
    for (let pass = 0; pass < 3; pass++) {
      let replaced = false;
      result = result.replace(/\{([^{}]+)\}/g, (match, key) => {
        const k = key.trim();
        if (Object.prototype.hasOwnProperty.call(varMap, k)) {
          replaced = true;
          return varMap[k];
        }
        return match;
      });
      if (!replaced) break;
    }
    return result;
  }

  function buildPrompt(userPrompt, mems, categories, settings, customVars = []) {
    const lang = settings?.lang || 'fa';
    const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const groups = new Map();
    for (const m of mems) {
      const k = catName[m.categoryId] ? m.categoryId : UNCAT;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    const multi = groups.size > 1 || !groups.has(UNCAT);
    const parts = [];
    for (const [k, list] of groups) {
      const body = list.map((m) => {
        const resolvedTitle = resolveVariables(m.title, customVars);
        const resolvedContent = resolveVariables(m.content, customVars);
        return `### ${resolvedTitle}\n${resolvedContent}`;
      }).join('\n\n');
      parts.push(multi ? `## ${k === UNCAT ? t('otherCat', lang) : catName[k]}\n${body}` : body);
    }
    const header = resolveVariables(settings.header, customVars);
    const sep = resolveVariables(settings.separator, customVars);
    return `${header}\n\n${parts.join('\n\n')}\n\n${sep}\n${userPrompt}`;
  }

  function findCategoryByName(categories, name) {
    const n = norm(flat(name));
    return categories.find((c) => norm(flat(c.name)) === n) || null;
  }

  function aiErrorText(r, lang = 'fa') {
    if (lang === 'en') {
      if (!r) return 'Unknown error';
      switch (r.code) {
        case 'nokey': return 'API key is not configured (⚙️ Settings)';
        case 'limited': return `AI rate limit reached${r.until ? ' until ' + new Date(r.until).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}`;
        case 'cap': return `Daily cap reached (${r.used}/${r.cap})`;
        case 'badkey': return 'Invalid API key';
        case 'network': return 'Network error connecting to AI provider';
        default: return 'AI Error: ' + (r.message || '').slice(0, 120);
      }
    }
    if (!r) return 'خطای ناشناخته';
    switch (r.code) {
      case 'nokey': return 'کلید API تنظیم نشده (⚙️ تنظیمات)';
      case 'limited': return `سهمیه هوشواره فعلاً پر شده${r.until ? ' تا ' + new Date(r.until).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}`;
      case 'cap': return `به سقف روزانه‌ای که خودت تعیین کردی رسیدی (${r.used}/${r.cap})`;
      case 'badkey': return 'کلید API نامعتبر است';
      case 'network': return 'اتصال به هوشواره برقرار نشد (اینترنت یا آدرس API را بررسی کن)';
      default: return 'خطای هوشواره: ' + (r.message || '').slice(0, 120);
    }
  }

  return {
    DEFAULT_SETTINGS, DEFAULT_SETTINGS_EN, DEFAULT_AI, DEFAULT_FAB, DEFAULT_VARS, UNCAT, SITES, THEMES, THEME_CSS_VARS, I18N, t,
    siteKeyOf, esc, norm, flat, uid, tokens, stem, heuristicTitle, resolveVariables,
    manualScoreMemories, localCategorize, manualReviewUpdates, cosineSuggest, localSuggest,
    exportMemoriesToText, parseMemoriesFromText,
    buildPrompt, findCategoryByName, aiErrorText
  };
})();
