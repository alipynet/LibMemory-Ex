const { esc, norm, flat, uid, UNCAT, t } = AIM;
const $ = (s) => document.querySelector(s);
let memories = [], categories = [], customVariables = [], settings = { ...AIM.DEFAULT_SETTINGS };
let currentId = null, isNew = false, dirty = false, q = '', catQ = '', activeCat = '__all__';
let batchSelected = new Set();
let reviewMode = 'manual'; // 'manual' | 'ai'

const lang = () => settings.lang === 'en' ? 'en' : 'fa';
const tr = (k, vars) => t(k, lang(), vars);
const fmt = (ts) => ts ? new Date(ts).toLocaleString(lang() === 'en' ? 'en-US' : 'fa-IR') : '';
const fmtNum = (n) => Number(n || 0).toLocaleString(lang() === 'en' ? 'en-US' : 'fa-IR');

let toastT;
function toast(tMsg, ms = 2600) {
  const el = $('#toast');
  el.textContent = tMsg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), ms);
}
const ai = (action, payload) => chrome.runtime.sendMessage({ type: 'ai', action, payload }).catch((e) => ({ ok: false, code: 'error', message: String(e) }));
const catById = (id) => categories.find((c) => c.id === id);
const sortedCats = () => [...categories].sort((a, b) => a.name.localeCompare(b.name, lang()));

async function persist(extra = {}) {
  await chrome.storage.local.set({ memories, categories, customVariables, settings, ...extra });
}

function getOrCreateCat(name) {
  name = flat(name);
  if (!name) return null;
  let c = AIM.findCategoryByName(categories, name);
  if (!c) { c = { id: uid(), name, createdAt: Date.now() }; categories.push(c); }
  return c;
}

function applyTheme(themeId) {
  const valid = AIM.THEMES.some(x => x.id === themeId) ? themeId : 'midnight';
  settings.theme = valid;
  document.documentElement.setAttribute('data-theme', valid);
  renderThemeGrid();
}

function renderThemeGrid() {
  const grid = $('#themeGrid');
  if (!grid) return;
  const cur = settings.theme || 'midnight';
  const isEn = lang() === 'en';
  grid.innerHTML = AIM.THEMES.map(th => `
    <div class="theme-card ${th.id === cur ? 'active' : ''}" data-theme-id="${esc(th.id)}">
      <div class="theme-swatch" style="background:${th.preview}">${th.icon}</div>
      <div class="theme-name">${esc(isEn ? th.en : th.fa)}</div>
    </div>
  `).join('');
}

$('#themeGrid')?.addEventListener('click', async (e) => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  const chosen = card.dataset.themeId;
  applyTheme(chosen);
  await persist();
});


// ---------- Dynamic Custom Font / Typography Engine ----------
function applyFont(fontDataUrl, fontName = '') {
  const badge = $('#currentFontBadge');
  const preview = $('#fontPreviewSample');
  const defaultLabel = tr('defaultFontName') || 'وزیرمتن (پیش‌فرض)';
  const prefix = tr('currentFontPrefix') || 'فونت فعال: ';

  if (!fontDataUrl) {
    document.documentElement.style.setProperty('--app-font-family', '"Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif');
    if (badge) badge.textContent = prefix + defaultLabel;
    return;
  }

  try {
    const fontFace = new FontFace('CustomUserFont', `url(${fontDataUrl})`);
    fontFace.load().then((loadedFace) => {
      // Remove any previously added CustomUserFont
      for (const face of document.fonts) {
        if (face.family === 'CustomUserFont') document.fonts.delete(face);
      }
      document.fonts.add(loadedFace);
      document.documentElement.style.setProperty('--app-font-family', '"CustomUserFont", "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif');
      if (badge) badge.textContent = prefix + (fontName || 'سفارشی');
    }).catch((err) => {
      console.error('Failed to load font:', err);
      toast(tr('fontError') || 'خطا در بارگذاری فایل فونت');
    });
  } catch (err) {
    console.error('FontFace error:', err);
  }
}

$('#customFontFileInput')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 8 * 1024 * 1024) {
    toast(tr('fontTooLarge') || 'حجم فایل فونت بیش از حد مجاز است (حداکثر ۸ مگابایت)');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const fontInfo = { dataUrl, name: file.name.replace(/\.[^/.]+$/, '') };
    settings.customFont = fontInfo;
    await persist();
    applyFont(fontInfo.dataUrl, fontInfo.name);
    toast(tr('fontApplied') || 'فونت دلخواه با موفقیت اعمال شد!');
  };
  reader.readAsDataURL(file);
});

$('#resetFontBtn')?.addEventListener('click', async () => {
  delete settings.customFont;
  await persist();
  applyFont(null);
  toast(tr('fontRestored') || 'فونت پیش‌فرض وزیرمتن فعال شد');
});

// ---------- Tabbed Settings Management ----------
function switchSettingsTab(tabId) {
  document.querySelectorAll('.stab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.stab-pane').forEach(p => {
    p.hidden = p.id !== tabId;
  });
}

document.querySelectorAll('.stab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSettingsTab(btn.dataset.tab));
});

// Language switcher inside Settings Appearance Tab
$('#langCardFa')?.addEventListener('click', async () => {
  if (settings.lang === 'fa') return;
  settings.lang = 'fa';
  if (settings.header === AIM.DEFAULT_SETTINGS_EN.header) {
    settings.header = AIM.DEFAULT_SETTINGS.header;
    settings.separator = AIM.DEFAULT_SETTINGS.separator;
  }
  await persist();
  applyLangUI();
  renderAll();
  refreshBadge();
});

$('#langCardEn')?.addEventListener('click', async () => {
  if (settings.lang === 'en') return;
  settings.lang = 'en';
  if (settings.header === AIM.DEFAULT_SETTINGS.header) {
    settings.header = AIM.DEFAULT_SETTINGS_EN.header;
    settings.separator = AIM.DEFAULT_SETTINGS_EN.separator;
  }
  await persist();
  applyLangUI();
  renderAll();
  refreshBadge();
});

// ---------- Bilingual UI Application ----------
function applyLangUI() {
  const l = lang();
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl';
  document.title = tr('pageTitle');
  applyTheme(settings.theme || 'midnight');

  $('#appTitle').textContent = tr('appTitle');
  $('#varsBtn').textContent = tr('varsBtn');
  $('#aiReviewBtn').textContent = tr('reviewBtn');
  $('#tutBtn').textContent = tr('tutBtn');
  $('#settingsBtn').textContent = tr('settingsBtn');

  $('#catsColTitle').textContent = tr('catsTitle');
  $('#catQ').placeholder = tr('catSearchPh');
  $('#newCatBtn').title = tr('newCatTitle');

  $('#q').placeholder = tr('memSearchPh');
  $('#optSortRel').textContent = tr('sortRelevance');
  $('#optSortUpd').textContent = tr('sortUpdated');
  $('#optSortCre').textContent = tr('sortCreated');
  $('#optSortTit').textContent = tr('sortTitle');
  $('#newBtn').textContent = tr('newManualBtn');
  $('#aiNewBtn').textContent = tr('newAiBtn');

  $('#batchPinBtn').textContent = tr('batchPinBtn');
  $('#batchDelBtn').textContent = tr('batchDelBtn');

  $('#empty').textContent = tr('editorEmpty');
  $('#title').placeholder = tr('titlePh');
  $('#catSelLbl').textContent = tr('catLbl');
  $('#insertVarHint').textContent = tr('insertVarHint');
  $('#content').placeholder = tr('contentPh');
  $('#saveFormBtn').textContent = tr('saveBtn');
  $('#cancelBtn').textContent = tr('cancelBtn');
  $('#sumBtn').textContent = tr('sumBtn');
  $('#deleteBtn').textContent = tr('delMemBtn');

  // Variables dialog
  $('#varsDlgTitle').textContent = tr('varsDlgTitle');
  $('#varsDlgHint').textContent = tr('varsDlgHint');
  $('#newVarName').placeholder = tr('newVarNamePh');
  $('#newVarVal').placeholder = tr('newVarValPh');
  $('#addVarBtn').textContent = tr('addVarBtn');
  $('#thVarName').textContent = tr('thVarName');
  $('#thVarVal').textContent = tr('thVarVal');
  $('#thVarPreview').textContent = tr('thVarPreview');
  $('#thVarAct').textContent = tr('thVarAct');
  $('#sysVarsHint').textContent = tr('sysVarsHint');
  $('#varsClose').textContent = tr('closeBtn');

  // Review / Update dialog
  $('#reviewDlgTitle').textContent = tr('reviewDlgTitle');
  $('#reviewDlgHint').textContent = tr('reviewDlgHint');
  $('#tabReviewManual').textContent = tr('reviewModeManualTab');
  $('#tabReviewAi').textContent = tr('reviewModeAiTab');
  $('#reviewOldTerm').placeholder = tr('reviewOldTermPh');
  $('#reviewNewTerm').placeholder = tr('reviewNewTermPh');
  $('#reviewManualNote').placeholder = tr('reviewManualNotePh');
  $('#reviewManualFindBtn').textContent = tr('reviewManualFindBtn');
  $('#reviewInstruction').placeholder = tr('reviewInstructionPh');
  $('#reviewGoBtn').textContent = tr('reviewAiGoBtn');
  $('#reviewApplyBtn').textContent = tr('reviewApplyBtn');
  $('#reviewCloseBtn').textContent = tr('reviewCancelBtn');

  // AI Create dialog
  $('#aiDlgTitle').textContent = tr('aiDlgTitle');
  $('#aiDlgHint').textContent = tr('aiDlgHint');
  $('#aiSrc').placeholder = tr('aiSrcPh');
  $('#aiGo').textContent = tr('aiGoBtn');
  $('#aiManual').textContent = tr('aiManualBtn');
  $('#aiSaveAll').textContent = tr('aiSaveAllBtn');
  $('#aiClose').textContent = tr('closeBtn');

  // Summarize dialog
  $('#sumDlgTitle').textContent = tr('sumDlgTitle');
  $('#sumApply').textContent = tr('sumApplyBtn');
  $('#sumClose').textContent = tr('cancelBtn');

  // Settings dialog tabs & legends
  $('#settingsDlgTitle').textContent = tr('settingsDlgTitle');
  $('#tabBtnAppearance').textContent = tr('stabAppearance');
  $('#tabBtnAi').textContent = tr('stabAi');
  $('#tabBtnDetect').textContent = tr('stabDetect');
  $('#tabBtnSites').textContent = tr('stabSites');
  $('#tabBtnBackup').textContent = tr('stabBackup');

  $('#langLegend').textContent = tr('langLegend');
  $('#langSelectLbl').textContent = tr('langSelectLbl');
  $('#langCardFa').classList.toggle('active', l === 'fa');
  $('#langCardEn').classList.toggle('active', l === 'en');

  $('#themeLegend').textContent = tr('themeLegend');
  $('#themeHint').textContent = tr('themeHint');

  // Font Section i18n
  if ($('#fontLegend')) $('#fontLegend').textContent = tr('fontLegend');
  if ($('#fontHint')) $('#fontHint').textContent = tr('fontHint');
  if ($('#uploadFontBtnText')) $('#uploadFontBtnText').textContent = tr('uploadFontBtn');
  if ($('#resetFontBtn')) $('#resetFontBtn').textContent = tr('resetFontBtn');
  if ($('#fontPreviewSample')) $('#fontPreviewSample').textContent = tr('fontPreviewSample');
  if (settings.customFont && settings.customFont.dataUrl) {
    applyFont(settings.customFont.dataUrl, settings.customFont.name);
  } else {
    applyFont(null);
  }

  $('#aiLegend').textContent = tr('aiLegend');
  $('#providerLbl').textContent = tr('providerLbl');
  $('#optProvGemini').textContent = tr('providerGemini');
  $('#optProvClaude').textContent = tr('providerClaude');
  $('#optProvOpenai').textContent = tr('providerOpenai');
  document.querySelectorAll('.modelLblText').forEach(el => { el.textContent = tr('modelLbl'); });
  $('#baseUrlLbl').textContent = tr('baseUrlLbl');
  $('#apiKeyLbl').textContent = tr('apiKeyLbl');
  $('#testKey').textContent = tr('testKeyBtn');
  $('#capLbl').textContent = tr('capLbl');
  $('#resetCd').textContent = tr('resetCdBtn');

  $('#autoDetectLegend').textContent = tr('autoDetectLegend');
  $('#autoDetectLbl').textContent = tr('autoDetectLbl');
  $('#optAutoOff').textContent = tr('modeOff');
  $('#optAutoManual').textContent = tr('modeManualMethod');
  $('#optAutoAi').textContent = tr('modeAi');
  $('#autoDetectHint').textContent = tr('autoDetectHint');

  $('#fabLegend').textContent = tr('fabLegend');
  $('#fabEnableLbl').textContent = tr('fabEnableLbl');
  $('#fabSideLbl').textContent = tr('fabSideLbl');
  $('#optSideLeft').textContent = tr('sideLeft');
  $('#optSideRight').textContent = tr('sideRight');
  $('#fabBottomLbl').textContent = tr('fabBottomLbl');
  $('#fabSiteOverrideLbl').textContent = tr('fabSiteOverrideLbl');
  $('#thSite').textContent = tr('thSite');
  $('#thShow').textContent = tr('thShow');
  $('#thSide').textContent = tr('thSide');
  $('#thBottom').textContent = tr('thBottom');

  $('#tplLegend').textContent = tr('tplLegend');
  $('#tplHeaderLbl').textContent = tr('tplHeaderLbl');
  $('#tplSepLbl').textContent = tr('tplSepLbl');
  $('#setReset').textContent = tr('tplResetBtn');

  // Backup Tab bilingual strings
  $('#backupTxtLegend').textContent = tr('backupTxtLegend');
  $('#backupTxtHint').textContent = tr('backupTxtHint');
  $('#exportTxtBtn').textContent = tr('exportTxtBtn');
  $('#importTxtBtnText').textContent = tr('importTxtBtn');
  $('#pasteTxtToggleBtn').textContent = tr('pasteTxtToggleBtn');
  $('#pasteTxtApplyBtn').textContent = tr('pasteTxtApplyBtn');
  $('#txtFormatGuideTitle').textContent = tr('txtFormatGuideTitle');
  $('#txtFormatGuideDesc').textContent = tr('txtFormatGuideDesc');

  $('#backupJsonLegend').textContent = tr('backupJsonLegend');
  $('#backupJsonHint').textContent = tr('backupJsonHint');
  $('#exportJsonBtn').textContent = tr('exportJsonBtn');
  $('#importJsonBtnText').textContent = tr('importJsonBtn');

  $('#setSave').textContent = tr('saveSettingsBtn');
  $('#setClose').textContent = tr('closeBtn');

  renderTutorialContent();
  updatePinButton($('#pinToggleBtn').dataset.pinned === '1');
}

// ---------- Comprehensive 0-to-100 User Guide (Bilingual) ----------
function renderTutorialContent() {
  const isEn = lang() === 'en';
  if (isEn) {
    $('#tutTitle').textContent = '📖 Complete Beginner-to-Pro Guide to LibMemory';
    $('#tutClose').textContent = 'Got it, let\'s get started!';
    $('#tutContent').innerHTML = `
      <div class="step-card">
        <h4>🌟 What is LibMemory?</h4>
        <p>LibMemory (لایب‌مموری) is your intelligent personal long-term memory bridge for AI assistants. Instead of re-explaining your stack, preferences, project details, or life context every single time you start a new chat in ChatGPT, Claude, Gemini, DeepSeek, or Grok, LibMemory stores your facts once and seamlessly injects only the most relevant ones right when you chat.</p>
      </div>

      <div class="step-card">
        <h4>⚡ Smart Detection: "Manual Method" vs "With AI"</h4>
        <p>• <b>⚡ Manual Method (Zero API, 100% Offline & Private):</b> Whenever you type a prompt in any chat, our hybrid offline search engine (combining BM25 ranking, TF-IDF cosine similarity, character N-grams, exact phrase boosts, and Persian/English stemmers) automatically discovers and checks the most relevant memories for your prompt. It requires no API key, consumes zero tokens, and works completely offline.<br>
        • <b>🤖 With AI:</b> If enabled, uses your connected AI model (Gemini, Claude, or OpenAI) to perform full semantic comprehension on your prompt and select helpful memories.</p>
      </div>

      <div class="step-card">
        <h4>🔄 Updating Memories (Manual & AI + Editable Preview)</h4>
        <p>Click <b>🔄 Update Memories</b> in the top bar whenever something changes in your projects or life (e.g. "I switched from Python 3.10 to 3.12" or "My current project changed").<br>
        • In <b>Manual Mode</b>, type the old term and new term to instantly preview changes.<br>
        • In <b>AI Mode</b>, describe what changed in plain English or Persian.<br>
        • <b>Key Feature:</b> In both modes, you can directly edit the proposed title and content inside the preview card before confirming!</p>
      </div>

      <div class="step-card">
        <h4>⌨️ Slash Command Picker (<code>/</code> or <code>/mem</code>)</h4>
        <p>In any AI chatbot's message input box, type <code>/</code> or <code>/mem</code> followed by search keywords. A quick floating popup appears right below your cursor with your memories. Navigate with the <kbd>↑</kbd> and <kbd>↓</kbd> arrow keys and press <kbd>Enter</kbd> to insert the memory directly without touching your mouse!</p>
      </div>

      <div class="step-card">
        <h4>📄 Categorized Text (.txt) & JSON Backups</h4>
        <p>In <b>⚙️ Settings → Backup & Text I/O</b>:<br>
        • <b>Export as .txt:</b> Generates a clean, human-readable paragraph file organized by categories with <code>## Category</code> and <code>### Title</code>.<br>
        • <b>Import .txt:</b> Import your own notes or knowledge base. Even if your text is just raw paragraphs separated by blank lines, LibMemory will parse and organize them automatically!</p>
      </div>

      <div class="step-card">
        <h4>🎨 Themes & Glassmorphism Personalization</h4>
        <p>Personalize your experience with 7 modern themes including <b>Crystal Dark Glass</b>, <b>Frosted Light Glass</b>, <b>Midnight Violet</b>, and <b>Cyber Emerald</b>. You can also cycle themes instantly by clicking the <b>🎨</b> icon on the floating chat widget.</p>
      </div>`;
  } else {
    $('#tutTitle').textContent = '📖 راهنمای جامع و صفر تا صد لایب‌مموری (LibMemory)';
    $('#tutClose').textContent = 'متوجه شدم، شروع استفاده';
    $('#tutContent').innerHTML = `
      <div class="step-card">
        <h4>🌟 لایب‌مموری (LibMemory) چیست و چه کمکی به شما می‌کند؟</h4>
        <p>لایب‌مموری یک افزونه حافظه بلندمدت و هوشمند برای تمام چت‌بات‌های هوش مصنوعی (ChatGPT، Claude، Gemini، DeepSeek، Grok، Qwen و Perplexity) است. اگر تا امروز مجبور بودید در هر گفتگوی جدید، مشخصات فنی، ترجیحات کدنویسی، زبان مدنظر، نقش یا اطلاعات پروژه‌تان را از اول برای هوش مصنوعی توضیح دهید، لایب‌مموری تمام این اطلاعات را یک‌بار ثبت می‌کند و در زمان چت به صورت کاملاً خودکار یا با یک کلیک در اختیار مدل می‌گذارد.</p>
      </div>

      <div class="step-card">
        <h4>⚡ پیدا کردن حافظه‌های مرتبط: «روش دستی» در برابر «با هوشواره»</h4>
        <p>• <b>⚡ روش دستی (آفلاین، سریع و بدون مصرف API):</b> وقتی پرامپت خود را در چت‌بات تایپ می‌کنید، موتور هیبریدی محلی لایب‌مموری (ترکیب امتیازدهی BM25، شباهت کسینوسی، ریشه‌یابی کلمات فارسی/انگلیسی و تطبیق N-gram) پرامپت شما را با تمام حافظه‌ها مقایسه کرده و مرتبط‌ترین موارد را به طور خودکار علامت می‌زند. این روش به اینترنت یا کلید API نیاز ندارد و هیچ سهمیه‌ای مصرف نمی‌کند.<br>
        • <b>🤖 با هوشواره (AI):</b> با کمک Gemini، Claude یا OpenAI، متن پرامپت شما را از نظر معنایی تحلیل کرده و بهترین حافظه‌ها را علامت می‌زند.</p>
      </div>

      <div class="step-card">
        <h4>🔄 به‌روزرسانی هوشمند حافظه‌ها (با پیش‌نمایش قابل ویرایش دستی)</h4>
        <p>با دکمه <b>🔄 به‌روزرسانی</b> در نوار بالا، هر زمان که ترجیحات یا ابزارهایتان تغییر کرد (مثلاً: «دیگر از پایتون ۳.۱۰ استفاده نمی‌کنم و رفتم روی پایتون ۳.۱۲»):<br>
        • با <b>روش دستی</b> می‌توانید عبارت قدیمی و جدید را مشخص کنید تا فوراً حافظه‌های حاوی آن پیدا شوند.<br>
        • با <b>روش هوشواره</b> متن تغییرات را به زبان ساده بنویسید تا خودش حافظه‌های مرتبط را پیدا و متن جدید را پیشنهاد دهد.<br>
        • <b>قابلیت مهم:</b> در هر دو حالت، در کارت پیش‌نمایش می‌توانید عنوان و متن نهایی پیشنهادی را دستی ویرایش کنید و سپس دکمه تأیید را بزنید.</p>
      </div>

      <div class="step-card">
        <h4>⌨️ اسلش‌کامند بدون نیاز به موس (<code>/</code> یا <code>/mem</code>)</h4>
        <p>در کادر چت هر هوش مصنوعی، کافیست علامت <code>/</code> یا عبارت <code>/mem</code> را تایپ کنید. پنجره سریع انتخاب حافظه مستقیماً زیر کادر چت باز می‌شود. با کلیدهای جهت‌نما (<kbd>↑</kbd> و <kbd>↓</kbd>) جابجا شوید و با فشردن <kbd>Enter</kbd> حافظه مورد نظر فوراً به متن چت اضافه می‌شود.</p>
      </div>

      <div class="step-card">
        <h4>📄 خروجی و ورودی متنی (.txt) و بکاپ کامل</h4>
        <p>در بخش <b>⚙️ تنظیمات ← تب بکاپ و فایل متنی</b>:<br>
        • <b>خروجی متنی:</b> تمام حافظه‌ها را در قالب دسته‌بندی‌شده و پاراگرافی در یک فایل ساده <code>.txt</code> دانلود کنید.<br>
        • <b>ورودی متنی:</b> هر متن یا فایلی را با قالب <code>## دسته</code> و <code>### عنوان</code> وارد کنید تا تمام حافظه‌ها خودکار ساخته شوند. حتی اگر متن خام بدون عنوان وارد کنید، لایب‌مموری خودش آن را قطعه‌بندی کرده و عنوان می‌دهد!</p>
      </div>

      <div class="step-card">
        <h4>🎨 شخصی‌سازی با تم‌های شیشه‌ای (Glassmorphism)</h4>
        <p>در بخش تنظیمات ۷ تم زیبا از جمله <b>شیشه‌ای کریستال تیره</b>، <b>شیشه‌ای یخی روشن</b>، <b>نیمه‌شب بنفش</b> و <b>زمرد نئونی</b> قرار دارد. همچنین در پنجره شناور داخل چت با دکمه <b>🎨</b> می‌توانید تم را فوراً عوض کنید.</p>
      </div>`;
  }
}

async function init() {
  const d = await chrome.storage.local.get(['memories', 'categories', 'customVariables', 'settings']);
  memories = (d.memories || []).map((m) => ({ categoryId: null, pinned: false, ...m }));
  categories = d.categories || [];
  customVariables = d.customVariables || [...AIM.DEFAULT_VARS];
  settings = { ...AIM.DEFAULT_SETTINGS, ...(d.settings || {}) };
  if (settings.customFont && settings.customFont.dataUrl) {
    applyFont(settings.customFont.dataUrl, settings.customFont.name);
  } else {
    applyFont(null);
  }
  applyLangUI();
  renderAll();
  refreshBadge();
}

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== 'local') return;
  if (c.memories) memories = (c.memories.newValue || []).map(m => ({ categoryId: null, pinned: false, ...m }));
  if (c.categories) categories = c.categories.newValue || [];
  if (c.customVariables) customVariables = c.customVariables.newValue || [];
  if (c.settings) {
    settings = { ...AIM.DEFAULT_SETTINGS, ...(c.settings.newValue || {}) };
    if (settings.customFont && settings.customFont.dataUrl) {
      applyFont(settings.customFont.dataUrl, settings.customFont.name);
    } else {
      applyFont(null);
    }
    applyLangUI();
  }
  if (c.memories || c.categories || c.customVariables || c.settings) {
    if (currentId && !isNew && !memories.find((m) => m.id === currentId)) closeEditor();
    if (activeCat !== '__all__' && activeCat !== UNCAT && !catById(activeCat)) activeCat = '__all__';
    renderAll();
  }
  if (c.aiUsage || c.aiCooldownUntil || c.aiConfig) refreshBadge();
});

function renderAll() {
  renderCats();
  renderList();
  fillCatSelect();
  renderVarChips();
}

// AI status badge
async function refreshBadge() {
  const st = await ai('status');
  const b = $('#aiBadge');
  b.className = '';
  const provName = st?.provider === 'claude' ? 'Claude' : st?.provider === 'openai' ? 'OpenAI' : 'Gemini';
  if (!st || !st.hasKey) {
    b.className = 'off';
    b.textContent = tr('aiOff');
  } else if (st.until) {
    b.className = 'warn';
    const tStr = new Date(st.until).toLocaleTimeString(lang() === 'en' ? 'en-US' : 'fa-IR', { hour: '2-digit', minute: '2-digit' });
    b.textContent = tr('aiLimited', { t: tStr });
  } else if (st.cap && st.used >= st.cap) {
    b.className = 'warn';
    b.textContent = tr('aiCapReached', { u: fmtNum(st.used), c: fmtNum(st.cap) });
  } else {
    b.textContent = tr('aiActive', {
      p: provName,
      u: fmtNum(st.used),
      c: st.cap ? '/' + fmtNum(st.cap) : ''
    });
  }
  $('#usageInfo').textContent = st && st.hasKey ? b.textContent : '';
}

// Categories Column
function countIn(id) { return memories.filter((m) => (id === UNCAT ? !catById(m.categoryId) : m.categoryId === id)).length; }
function renderCats() {
  const nq = norm(catQ.trim());
  const cats = sortedCats().filter((c) => !nq || norm(c.name).includes(nq));
  const row = (id, name, cnt, editable) => `
    <li data-id="${esc(id)}" class="${activeCat === id ? 'active' : ''}">
      <span class="n">${esc(name)}</span>
      <span class="c">${fmtNum(cnt)}</span>
      ${editable ? '<button class="ic ren" title="Rename">✏️</button><button class="ic del" title="Delete">🗑</button>' : ''}
    </li>`;

  $('#catList').innerHTML = (nq ? '' : row('__all__', tr('allCats'), memories.length) + row(UNCAT, tr('uncat'), countIn(UNCAT)))
    + cats.map((c) => row(c.id, '📁 ' + c.name, countIn(c.id), true)).join('')
    + (nq && !cats.length ? `<li class="none">${esc(tr('noCatFound'))}</li>` : '');

  const un = countIn(UNCAT);
  $('#aiCatBtn').textContent = `${tr('aiCatBtn')} (${fmtNum(un)})`;
  $('#localCatBtn').textContent = `${tr('localCatBtn')} (${fmtNum(un)})`;
  $('#aiCatBtn').disabled = $('#localCatBtn').disabled = !un;
}

$('#catQ').addEventListener('input', (e) => { catQ = e.target.value; renderCats(); });
$('#catList').addEventListener('click', async (e) => {
  const li = e.target.closest('li[data-id]'); if (!li) return;
  const id = li.dataset.id, c = catById(id);
  if (e.target.closest('.ren') && c) {
    const name = flat(prompt(lang() === 'en' ? 'New category name:' : 'نام جدید دسته:', c.name) || '');
    if (!name || name === c.name) return;
    const dup = AIM.findCategoryByName(categories, name);
    if (dup && dup.id !== c.id) {
      const msg = lang() === 'en' ? `Category "${dup.name}" already exists. Merge them?` : `دسته «${dup.name}» از قبل وجود دارد. دو دسته ادغام شوند؟`;
      if (!confirm(msg)) return;
      memories.forEach((m) => { if (m.categoryId === c.id) m.categoryId = dup.id; });
      categories = categories.filter((x) => x.id !== c.id);
      if (activeCat === c.id) activeCat = dup.id;
    } else c.name = name;
    await persist(); renderAll(); toast(tr('msgSaved')); return;
  }
  if (e.target.closest('.del') && c) {
    const n = countIn(c.id);
    const msg = lang() === 'en'
      ? `Delete category "${c.name}"?\n${n ? `${n} memories will become Uncategorized.` : ''}`
      : `دسته «${c.name}» حذف شود؟\n${n ? `${fmtNum(n)} حافظه به «بدون دسته» منتقل می‌شوند و پاک نخواهند شد.` : ''}`;
    if (!confirm(msg)) return;
    memories.forEach((m) => { if (m.categoryId === c.id) m.categoryId = null; });
    categories = categories.filter((x) => x.id !== c.id);
    if (activeCat === c.id) activeCat = '__all__';
    await persist(); renderAll(); toast(tr('msgDeleted')); return;
  }
  activeCat = id; renderCats(); renderList();
});

$('#newCatBtn').onclick = async () => {
  const name = flat(prompt(lang() === 'en' ? 'New category name:' : 'نام دسته جدید:') || ''); if (!name) return;
  if (AIM.findCategoryByName(categories, name)) { toast(lang() === 'en' ? 'Category already exists' : 'این دسته از قبل وجود دارد'); return; }
  const c = getOrCreateCat(name); activeCat = c.id;
  await persist(); renderAll();
};

async function applyAssignments(pairs) {
  let n = 0; const before = categories.length;
  for (const [mem, catName] of pairs) {
    const c = getOrCreateCat(catName);
    if (c) { mem.categoryId = c.id; mem.updatedAt = mem.updatedAt || Date.now(); n++; }
  }
  await persist(); renderAll();
  return { n, newCats: categories.length - before };
}

$('#localCatBtn').onclick = async () => {
  if (!categories.length) {
    toast(lang() === 'en' ? 'Create a few categories first or use AI Categorization' : 'ابتدا چند دسته بساز یا از دسته‌بندی با هوشواره استفاده کن');
    return;
  }
  const un = memories.filter((m) => !catById(m.categoryId));
  const pairs = [];
  for (const m of un) { const c = AIM.localCategorize(m, categories, memories); if (c) pairs.push([m, c.name]); }
  const r = await applyAssignments(pairs);
  toast(lang() === 'en' ? `Categorized ${r.n} of ${un.length} memories (Manual Method)` : `${fmtNum(r.n)} از ${fmtNum(un.length)} حافظه با روش دستی دسته‌بندی شد`, 3500);
};

$('#aiCatBtn').onclick = async () => {
  const un = memories.filter((m) => !catById(m.categoryId)).slice(0, 120);
  if (!un.length) return;
  const msg = lang() === 'en' ? `Categorize ${un.length} uncategorized memories with 1 AI request?` : `${fmtNum(un.length)} حافظه بدون دسته با یک درخواست هوشواره دسته‌بندی شوند؟`;
  if (!confirm(msg)) return;
  const btn = $('#aiCatBtn'); btn.disabled = true; btn.classList.add('loading'); btn.textContent = '⏳ ...';
  const items = un.map((m, i) => ({ i, title: m.title, snippet: m.content.slice(0, 300) }));
  const r = await ai('categorize', { items, categories: categories.map((c) => c.name) });
  refreshBadge();
  if (!r || !r.ok) {
    btn.classList.remove('loading');
    renderCats();
    toast(AIM.aiErrorText(r, lang()), 4500);
    return;
  }
  btn.classList.remove('loading');
  const pairs = r.data.filter((a) => un[+a.i]).map((a) => [un[+a.i], a.category]);
  const res = await applyAssignments(pairs);
  toast(lang() === 'en' ? `Categorized ${res.n} memories` : `${fmtNum(res.n)} حافظه دسته‌بندی شد`, 3500);
};

// ---------- Memories Column (Search & Sort powered by Unified Manual Method) ----------
function filtered() {
  const qClean = flat(q);
  const sort = $('#sort').value;

  const base = memories.filter((m) =>
    activeCat === '__all__' || (activeCat === UNCAT ? !catById(m.categoryId) : m.categoryId === activeCat)
  );

  const scoreMap = new Map();
  if (qClean) {
    const scored = AIM.manualScoreMemories(qClean, base, categories, { minScore: 0.025 });
    scored.forEach(s => scoreMap.set(s.id, s.score));
  }

  const list = qClean
    ? base.filter(m => scoreMap.has(m.id))
    : base;

  return [...list].sort((a, b) => {
    if (qClean && (sort === 'relevance' || Math.abs((scoreMap.get(a.id) || 0) - (scoreMap.get(b.id) || 0)) > 0.05)) {
      return (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0);
    }
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return sort === 'title' ? a.title.localeCompare(b.title, lang())
      : sort === 'created' ? (b.createdAt || 0) - (a.createdAt || 0)
      : (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function renderList() {
  const items = filtered();
  const chars = memories.reduce((n, m) => n + m.content.length, 0);
  $('#stats').textContent = tr('statsFmt', {
    m: fmtNum(memories.length),
    c: fmtNum(categories.length),
    ch: fmtNum(chars)
  });
  $('#batchCount').textContent = tr('batchSelectCount', { n: fmtNum(batchSelected.size) });

  $('#list').innerHTML = items.length ? items.map((m) => {
    const c = catById(m.categoryId);
    const isChecked = batchSelected.has(m.id);
    return `
      <li data-id="${esc(m.id)}" class="${m.id === currentId ? 'active' : ''} ${m.pinned ? 'is-pinned' : ''}">
        <input type="checkbox" class="mem-cb" data-id="${esc(m.id)}" ${isChecked ? 'checked' : ''}>
        <div class="mem-body">
          <div class="t">
            ${m.pinned ? '<span class="pin-badge">📌</span>' : ''}
            ${esc(m.title)}
            ${c && activeCat === '__all__' ? `<span class="tag">${esc(c.name)}</span>` : ''}
          </div>
          <div class="s">${esc(m.content.slice(0, 160))}</div>
          <div class="d">${fmt(m.updatedAt)}</div>
        </div>
      </li>`;
  }).join('') : `<li class="none">${esc(memories.length ? tr('noResult') : tr('noMemsYet'))}</li>`;

  $('#selectAllBatch').checked = items.length > 0 && items.every(m => batchSelected.has(m.id));
}

$('#q').addEventListener('input', (e) => {
  q = e.target.value;
  if (q.trim() && $('#sort').value === 'updated') {
    $('#sort').value = 'relevance';
  }
  renderList();
});
$('#sort').onchange = renderList;

// Batch operations
$('#list').addEventListener('change', (e) => {
  if (e.target.classList.contains('mem-cb')) {
    const id = e.target.dataset.id;
    if (e.target.checked) batchSelected.add(id);
    else batchSelected.delete(id);
    $('#batchCount').textContent = tr('batchSelectCount', { n: fmtNum(batchSelected.size) });
    $('#selectAllBatch').checked = filtered().every(m => batchSelected.has(m.id));
  }
});

$('#selectAllBatch').addEventListener('change', (e) => {
  const items = filtered();
  if (e.target.checked) items.forEach(m => batchSelected.add(m.id));
  else items.forEach(m => batchSelected.delete(m.id));
  renderList();
});

$('#batchPinBtn').onclick = async () => {
  if (!batchSelected.size) { toast(tr('msgSelectAtLeastOne')); return; }
  const selectedMems = memories.filter(m => batchSelected.has(m.id));
  const allPinned = selectedMems.every(m => m.pinned);
  selectedMems.forEach(m => { m.pinned = !allPinned; });
  await persist();
  renderList();
  toast(tr('msgSaved'));
};

$('#batchDelBtn').onclick = async () => {
  if (!batchSelected.size) { toast(tr('msgSelectAtLeastOne')); return; }
  const count = batchSelected.size;
  const msg = lang() === 'en' ? `Permanently delete ${count} selected memories?` : `آیا از حذف دائم ${fmtNum(count)} حافظه انتخاب‌شده اطمینان داری؟`;
  if (!confirm(msg)) return;
  memories = memories.filter(m => !batchSelected.has(m.id));
  if (currentId && batchSelected.has(currentId)) closeEditor();
  const d = await chrome.storage.local.get('selectedIds');
  const selIds = (d.selectedIds || []).filter(id => !batchSelected.has(id));
  batchSelected.clear();
  await persist({ selectedIds: selIds });
  renderAll();
  toast(tr('msgDeleted'));
};

// Editor
function fillCatSelect(selectedId) {
  const sel = $('#catSel'); const cur = selectedId !== undefined ? selectedId : sel.value;
  sel.innerHTML = `<option value="">${esc(tr('noCatOpt'))}</option>`
    + sortedCats().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')
    + `<option value="__new__">${esc(tr('newCatOpt'))}</option>`;
  sel.value = cur && catById(cur) ? cur : '';
  $('#catNames').innerHTML = sortedCats().map((c) => `<option value="${esc(c.name)}">`).join('');
}

function renderVarChips() {
  $('#customVarChips').innerHTML = (customVariables || []).map(v => `
    <button type="button" class="tag-btn" data-var="{${esc(v.name)}}">{${esc(v.name)}}</button>
  `).join('');
}

$('#varQuickBar').addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-btn'); if (!btn) return;
  const tag = btn.dataset.var;
  const textarea = $('#content');
  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + tag + textarea.value.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
  dirty = true;
  updateMeta(memories.find(m => m.id === currentId));
});

$('#catSel').addEventListener('change', async (e) => {
  if (e.target.value !== '__new__') { dirty = true; return; }
  const name = flat(prompt(lang() === 'en' ? 'New category name:' : 'نام دسته جدید:') || '');
  if (!name) { e.target.value = ''; return; }
  const c = getOrCreateCat(name); await persist();
  fillCatSelect(c.id); renderCats(); dirty = true;
});

function guard() {
  const msg = lang() === 'en' ? 'Discard unsaved changes?' : 'تغییرات ذخیره نشده است. آیا صرف‌نظر می‌کنی؟';
  return !dirty || confirm(msg);
}

function openEditor(m, preset) {
  $('#empty').hidden = true; $('#form').hidden = false;
  $('#title').value = m ? m.title : (preset?.title || '');
  $('#content').value = m ? m.content : (preset?.content || '');
  fillCatSelect(m ? (m.categoryId || '') : (preset?.categoryId ?? ((activeCat !== '__all__' && activeCat !== UNCAT) ? activeCat : '')));
  $('#deleteBtn').hidden = !m;
  updatePinButton(m ? !!m.pinned : false);
  updateMeta(m); dirty = !!preset; renderList();
  $(m ? '#content' : '#title').focus();
}

function updatePinButton(isPinned) {
  const btn = $('#pinToggleBtn');
  btn.dataset.pinned = isPinned ? '1' : '0';
  btn.textContent = isPinned ? tr('pinnedBtn') : tr('pinBtn');
}

$('#pinToggleBtn').onclick = () => {
  const btn = $('#pinToggleBtn');
  const next = btn.dataset.pinned !== '1';
  updatePinButton(next);
  dirty = true;
};

function updateMeta(m) {
  const len = fmtNum($('#content').value.length);
  $('#meta').textContent = m
    ? tr('metaFmt', { c: fmt(m.createdAt), u: fmt(m.updatedAt), len })
    : tr('metaNewFmt', { len });
}

function closeEditor() {
  currentId = null; isNew = false; dirty = false;
  $('#form').hidden = true; $('#empty').hidden = false;
  renderList();
}

$('#list').addEventListener('click', (e) => {
  if (e.target.classList.contains('mem-cb')) return;
  const li = e.target.closest('li[data-id]'); if (!li || !guard()) return;
  currentId = li.dataset.id; isNew = false;
  openEditor(memories.find((m) => m.id === currentId));
});

$('#newBtn').onclick = () => { if (!guard()) return; currentId = null; isNew = true; openEditor(null); };
['#title', '#content'].forEach((s) => $(s).addEventListener('input', () => { dirty = true; updateMeta(memories.find((m) => m.id === currentId)); }));

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#title').value.trim(), content = $('#content').value.trim();
  let categoryId = catById($('#catSel').value) ? $('#catSel').value : null;
  const pinned = $('#pinToggleBtn').dataset.pinned === '1';
  if (!title || !content) { toast(tr('msgTitleContentReq')); return; }
  if (!categoryId && isNew && categories.length) {
    const autoC = AIM.localCategorize({ title, content }, categories, memories);
    if (autoC) categoryId = autoC.id;
  }
  const now = Date.now();
  if (isNew) {
    const m = { id: uid(), title, content, categoryId, pinned, createdAt: now, updatedAt: now };
    memories.unshift(m); currentId = m.id; isNew = false;
  } else {
    const m = memories.find((x) => x.id === currentId); if (!m) return;
    Object.assign(m, { title, content, categoryId, pinned, updatedAt: now });
  }
  await persist(); dirty = false;
  openEditor(memories.find((m) => m.id === currentId)); renderCats();
  toast(tr('msgSaved'));
});

$('#cancelBtn').onclick = () => { if (guard()) closeEditor(); };

$('#deleteBtn').onclick = async () => {
  const m = memories.find((x) => x.id === currentId); if (!m) return;
  const msg = lang() === 'en' ? `Permanently delete "${m.title}"?` : `«${m.title}» برای همیشه حذف شود؟`;
  if (!confirm(msg)) return;
  memories = memories.filter((x) => x.id !== currentId);
  batchSelected.delete(currentId);
  const d = await chrome.storage.local.get('selectedIds');
  await persist({ selectedIds: (d.selectedIds || []).filter((id) => id !== currentId) });
  closeEditor(); renderCats(); toast(tr('msgDeleted'));
};

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !$('#form').hidden && !document.querySelector('dialog[open]')) {
    e.preventDefault(); $('#form').requestSubmit();
  }
});
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// Summarize
$('#sumBtn').onclick = async () => {
  const content = $('#content').value.trim(); if (!content) return;
  const btn = $('#sumBtn'); btn.disabled = true; btn.classList.add('loading'); btn.textContent = '⏳ ...';
  const r = await ai('summarize', { title: $('#title').value.trim(), content });
  btn.disabled = false; btn.classList.remove('loading'); btn.textContent = tr('sumBtn'); refreshBadge();
  if (!r || !r.ok) { toast(AIM.aiErrorText(r, lang()), 4000); return; }
  $('#sumTitle').value = r.data.title; $('#sumContent').value = r.data.content; $('#sumDlg').showModal();
};
$('#sumApply').onclick = () => {
  $('#title').value = $('#sumTitle').value; $('#content').value = $('#sumContent').value;
  dirty = true; updateMeta(memories.find((m) => m.id === currentId));
  $('#sumDlg').close(); toast(tr('msgSaved'));
};
$('#sumClose').onclick = () => $('#sumDlg').close();

// AI & Manual Create Dialog
let drafts = [];
function renderDrafts() {
  $('#drafts').innerHTML = drafts.map((d, i) => `
    <div class="draft" data-i="${i}">
      <label class="row" style="margin:0"><input type="checkbox" class="inc" ${d.include ? 'checked' : ''} style="width:auto"> ${esc(tr('draftSaveCheck'))}</label>
      <input class="dt" value="${esc(d.title)}" placeholder="${esc(tr('titlePh'))}">
      <input class="dc" value="${esc(d.category)}" list="catNames" placeholder="${esc(tr('catLbl'))}">
      <textarea class="dx">${esc(d.content)}</textarea>
    </div>`).join('');
  $('#aiSaveAll').hidden = !drafts.length;
}

$('#drafts').addEventListener('input', (e) => {
  const box = e.target.closest('.draft'); if (!box) return; const d = drafts[+box.dataset.i];
  if (e.target.classList.contains('dt')) d.title = e.target.value;
  if (e.target.classList.contains('dc')) d.category = e.target.value;
  if (e.target.classList.contains('dx')) d.content = e.target.value;
  if (e.target.classList.contains('inc')) d.include = e.target.checked;
});
$('#drafts').addEventListener('change', (e) => {
  if (e.target.classList.contains('inc')) drafts[+e.target.closest('.draft').dataset.i].include = e.target.checked;
});

function manualDraft(src) {
  const tmp = { title: AIM.heuristicTitle(src, lang()), content: src.trim() };
  const c = AIM.localCategorize(tmp, categories, memories);
  return { ...tmp, category: c ? c.name : '', include: true };
}

$('#aiNewBtn').onclick = () => {
  drafts = []; renderDrafts(); $('#aiSrc').value = ''; $('#aiStatus').textContent = '';
  fillCatSelect(); $('#aiDlg').showModal(); $('#aiSrc').focus();
};
$('#aiClose').onclick = () => $('#aiDlg').close();

$('#aiManual').onclick = () => {
  const src = $('#aiSrc').value.trim(); if (!src) return;
  drafts = [manualDraft(src)]; renderDrafts();
  $('#aiStatus').textContent = lang() === 'en' ? 'Manual draft created; edit & save below.' : 'پیش‌نویس با روش دستی ساخته شد؛ بررسی و ذخیره کن.';
};

$('#aiGo').onclick = async () => {
  const src = $('#aiSrc').value.trim(); if (!src) return;
  const btn = $('#aiGo'); btn.disabled = true; btn.classList.add('loading'); $('#aiStatus').textContent = '⏳ ...';
  const r = await ai('create', { text: src, categories: categories.map((c) => c.name) });
  btn.disabled = false; btn.classList.remove('loading'); refreshBadge();
  if (r && r.ok) {
    drafts = r.data.map((d) => ({ ...d, include: true }));
    $('#aiStatus').textContent = `✅ ${fmtNum(drafts.length)}`;
  } else {
    drafts = [manualDraft(src)];
    $('#aiStatus').textContent = `⚠️ ${AIM.aiErrorText(r, lang())}`;
  }
  renderDrafts();
};

$('#aiSaveAll').onclick = async () => {
  const ok = drafts.filter((d) => d.include && flat(d.title) && d.content.trim());
  if (!ok.length) return;
  const now = Date.now();
  ok.forEach((d, k) => {
    const c = getOrCreateCat(d.category);
    memories.unshift({ id: uid(), title: flat(d.title), content: d.content.trim(), categoryId: c ? c.id : null, pinned: false, createdAt: now + k, updatedAt: now + k });
  });
  await persist(); $('#aiDlg').close(); renderAll(); toast(tr('msgSaved'));
};

// Dynamic Variables Dialog
const varsDlg = $('#varsDlg');
function renderVarsTable() {
  const tbody = $('#varsTbl tbody');
  tbody.innerHTML = (customVariables || []).map((v, i) => {
    const preview = AIM.resolveVariables(`{${v.name}}`, customVariables);
    return `
      <tr data-i="${i}">
        <td><code>{${esc(v.name)}}</code></td>
        <td><input class="ve-val" value="${esc(v.value)}" style="width:100%"></td>
        <td><span style="color:var(--sec-text);font-weight:600">${esc(preview)}</span></td>
        <td><button class="sm-btn danger ve-del">${esc(tr('batchDelBtn'))}</button></td>
      </tr>`;
  }).join('');
}

$('#varsBtn').onclick = () => { renderVarsTable(); varsDlg.showModal(); };
$('#varsClose').onclick = () => varsDlg.close();

$('#addVarBtn').onclick = async () => {
  const name = flat($('#newVarName').value).replace(/[{}]/g, '');
  const val = $('#newVarVal').value;
  if (!name) return;
  if (customVariables.some(v => v.name === name)) return;
  customVariables.push({ name, value: val });
  await persist();
  $('#newVarName').value = ''; $('#newVarVal').value = '';
  renderVarsTable(); renderVarChips(); toast(tr('msgSaved'));
};

$('#varsTbl').addEventListener('change', async (e) => {
  if (e.target.classList.contains('ve-val')) {
    const trEl = e.target.closest('tr');
    const i = +trEl.dataset.i;
    customVariables[i].value = e.target.value;
    await persist();
    renderVarsTable(); renderVarChips(); toast(tr('msgSaved'));
  }
});

$('#varsTbl').addEventListener('click', async (e) => {
  if (e.target.classList.contains('ve-del')) {
    const trEl = e.target.closest('tr');
    const i = +trEl.dataset.i;
    customVariables.splice(i, 1);
    await persist();
    renderVarsTable(); renderVarChips(); toast(tr('msgDeleted'));
  }
});

// ---------- Unified Memory Updater (Manual & AI + Editable Preview for Title & Content) ----------
const reviewDlg = $('#reviewDlg');
let proposedUpdates = [];

function switchReviewMode(mode) {
  reviewMode = mode === 'ai' ? 'ai' : 'manual';
  $('#tabReviewManual').classList.toggle('active', reviewMode === 'manual');
  $('#tabReviewAi').classList.toggle('active', reviewMode === 'ai');
  $('#reviewManualPane').hidden = reviewMode !== 'manual';
  $('#reviewAiPane').hidden = reviewMode !== 'ai';
}

$('#tabReviewManual').onclick = () => switchReviewMode('manual');
$('#tabReviewAi').onclick = () => switchReviewMode('ai');

function renderReviewDiffs() {
  const list = $('#reviewDiffList');
  if (!proposedUpdates.length) {
    list.innerHTML = '';
    $('#reviewApplyBtn').hidden = true;
    return;
  }
  list.innerHTML = proposedUpdates.map((u, i) => `
    <div class="diff-card ${u.approved ? 'selected' : ''}" data-i="${i}">
      <label class="row" style="margin:0;font-weight:700;color:var(--text-main)">
        <input type="checkbox" class="diff-app" ${u.approved ? 'checked' : ''} style="width:auto">
        <span>${esc(tr('diffApplyCheck'))}: «${esc(u.oldTitle)}»</span>
        <span class="hint" style="color:var(--ai-text)">(${esc(u.reason || '')})</span>
      </label>
      <div class="diff-grid">
        <div class="diff-col old">
          <div class="diff-title" style="color:var(--danger-text)">${esc(tr('diffOldTitle'))}</div>
          <div style="font-weight:700;margin-bottom:4px">${esc(u.oldTitle)}</div>
          <div class="diff-text" style="white-space:pre-wrap">${esc(u.oldContent)}</div>
        </div>
        <div class="diff-col new">
          <div class="diff-title" style="color:var(--sec-text)">${esc(tr('diffNewTitle'))}</div>
          <input type="text" class="diff-new-title" value="${esc(u.newTitle)}" placeholder="${esc(tr('diffTitleInputPh'))}">
          <textarea class="diff-new-edit" style="width:100%;min-height:95px">${esc(u.newContent)}</textarea>
        </div>
      </div>
    </div>
  `).join('');
  $('#reviewApplyBtn').hidden = false;
}

$('#reviewDiffList').addEventListener('input', (e) => {
  const card = e.target.closest('.diff-card'); if (!card) return;
  const i = +card.dataset.i;
  if (!proposedUpdates[i]) return;
  if (e.target.classList.contains('diff-new-edit')) {
    proposedUpdates[i].newContent = e.target.value;
  } else if (e.target.classList.contains('diff-new-title')) {
    proposedUpdates[i].newTitle = e.target.value;
  }
});

$('#reviewDiffList').addEventListener('change', (e) => {
  const card = e.target.closest('.diff-card'); if (!card) return;
  const i = +card.dataset.i;
  if (!proposedUpdates[i]) return;
  if (e.target.classList.contains('diff-app')) {
    proposedUpdates[i].approved = e.target.checked;
    card.classList.toggle('selected', e.target.checked);
  }
});

$('#aiReviewBtn').onclick = () => {
  proposedUpdates = [];
  renderReviewDiffs();
  $('#reviewOldTerm').value = '';
  $('#reviewNewTerm').value = '';
  $('#reviewManualNote').value = '';
  $('#reviewInstruction').value = '';
  $('#reviewStatus').textContent = '';
  switchReviewMode('manual');
  reviewDlg.showModal();
};
$('#reviewCloseBtn').onclick = () => reviewDlg.close();

// 1) Manual Update Find & Preview
$('#reviewManualFindBtn').onclick = () => {
  const oldTerm = $('#reviewOldTerm').value.trim();
  const newTerm = $('#reviewNewTerm').value.trim();
  const instruction = $('#reviewManualNote').value.trim();

  if (!oldTerm && !newTerm && !instruction) {
    toast(lang() === 'en' ? 'Enter a term or description first' : 'ابتدا عبارت یا توضیح تغییر را وارد کن');
    return;
  }

  proposedUpdates = AIM.manualReviewUpdates({
    instruction,
    oldTerm,
    newTerm,
    memories,
    categories
  });

  if (!proposedUpdates.length) {
    $('#reviewStatus').textContent = lang() === 'en'
      ? 'No matching memories found. Try different keywords.'
      : 'حافظه مرتبطی پیدا نشد. کلمات کلیدی دیگری را امتحان کن.';
  } else {
    $('#reviewStatus').textContent = lang() === 'en'
      ? `✅ Found ${proposedUpdates.length} related memories (Manual Method). You can edit the final title & text below before confirming.`
      : `✅ ${fmtNum(proposedUpdates.length)} حافظه مرتبط با روش دستی آماده شد. می‌توانی متن و عنوان نهایی را در پیش‌نمایش زیر دستی ویرایش کنی یا مستقیماً تأیید بزنی.`;
  }
  renderReviewDiffs();
};

// 2) AI Update Find & Preview
$('#reviewGoBtn').onclick = async () => {
  const instr = $('#reviewInstruction').value.trim();
  if (!instr) {
    toast(lang() === 'en' ? 'Describe your changes first' : 'تغییرات مدنظرت را در کادر بنویس');
    return;
  }
  const btn = $('#reviewGoBtn');
  btn.disabled = true; btn.classList.add('loading');
  $('#reviewStatus').textContent = lang() === 'en'
    ? '⏳ Analyzing memories with AI...'
    : '⏳ در حال بررسی حافظه‌ها و تحلیل تغییرات توسط هوشواره...';
  const r = await ai('reviewUpdates', {
    instruction: instr,
    memories,
    categories: categories.map(c => c.name)
  });
  btn.disabled = false; btn.classList.remove('loading'); refreshBadge();
  if (!r || !r.ok) {
    proposedUpdates = AIM.manualReviewUpdates({ instruction: instr, memories, categories });
    $('#reviewStatus').textContent = `⚠️ ${AIM.aiErrorText(r, lang())} — ${lang() === 'en' ? 'Switched to Manual Method preview:' : 'پیش‌نمایش با روش دستی آماده شد:'}`;
    renderReviewDiffs();
    return;
  }
  proposedUpdates = (r.data || []).map(u => {
    const mem = memories.find(m => m.id === u.id);
    return {
      id: u.id,
      oldTitle: mem ? mem.title : (u.oldTitle || ''),
      newTitle: u.newTitle || (mem ? mem.title : ''),
      oldContent: mem ? mem.content : (u.oldContent || ''),
      newContent: u.newContent || '',
      reason: u.reason || '',
      approved: true
    };
  });
  if (!proposedUpdates.length) {
    $('#reviewStatus').textContent = lang() === 'en' ? 'No memories needed updating based on this report.' : 'هیچ حافظه‌ای نیاز به تغییر بر اساس این گزارش نداشت.';
  } else {
    $('#reviewStatus').textContent = lang() === 'en'
      ? `✅ ${proposedUpdates.length} updates suggested by AI. You can freely edit the preview below before confirming.`
      : `✅ ${fmtNum(proposedUpdates.length)} تغییر توسط هوشواره پیشنهاد شد. می‌توانی متن نهایی را در پیش‌نمایش ویرایش کنی و سپس تأیید را بزنی.`;
  }
  renderReviewDiffs();
};

$('#reviewApplyBtn').onclick = async () => {
  const approved = proposedUpdates.filter(u => u.approved && u.newContent.trim());
  if (!approved.length) { toast(tr('msgSelectAtLeastOne')); return; }
  let count = 0;
  const now = Date.now();
  approved.forEach(u => {
    const mem = memories.find(m => m.id === u.id);
    if (mem) {
      if (u.newTitle && u.newTitle.trim()) mem.title = u.newTitle.trim();
      mem.content = u.newContent.trim();
      mem.updatedAt = now;
      count++;
    }
  });
  await persist();
  reviewDlg.close();
  renderAll();
  if (currentId) {
    const curMem = memories.find(m => m.id === currentId);
    if (curMem) openEditor(curMem);
  }
  toast(tr('msgSaved'), 4000);
};

// ---------- Categorized Text (.txt) Import / Export Engine ----------
$('#exportTxtBtn')?.addEventListener('click', () => {
  const txtContent = AIM.exportMemoriesToText(memories, categories, customVariables, lang());
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `libmemory-export-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(lang() === 'en' ? 'Categorized .txt file downloaded' : 'فایل متنی طبقه‌بندی‌شده دانلود شد 📄');
});

async function processTextImport(rawText) {
  if (!rawText || !rawText.trim()) return;
  const { memories: parsedList, variables: parsedVars } = AIM.parseMemoriesFromText(rawText, lang());
  if (!parsedList.length && !parsedVars.length) {
    toast(lang() === 'en' ? 'No memories could be detected from text' : 'هیچ حافظه‌ای از متن تشخیص داده نشد');
    return;
  }

  let added = 0, updated = 0;
  const now = Date.now();

  parsedList.forEach((p, idx) => {
    let catId = null;
    if (p.category) {
      const c = getOrCreateCat(p.category);
      if (c) catId = c.id;
    }
    const existing = memories.find(m => norm(m.title) === norm(p.title));
    if (existing) {
      existing.content = p.content;
      if (catId) existing.categoryId = catId;
      if (p.pinned !== undefined) existing.pinned = p.pinned;
      existing.updatedAt = now + idx;
      updated++;
    } else {
      memories.unshift({
        id: uid(),
        title: p.title,
        content: p.content,
        categoryId: catId,
        pinned: !!p.pinned,
        createdAt: now + idx,
        updatedAt: now + idx
      });
      added++;
    }
  });

  if (parsedVars.length) {
    parsedVars.forEach(v => {
      const ex = customVariables.find(x => x.name === v.name);
      if (ex) ex.value = v.value;
      else customVariables.push(v);
    });
  }

  await persist();
  renderAll();
  toast(tr('msgTxtImported', { a: fmtNum(added), u: fmtNum(updated) }), 4000);
}

$('#importTxtFile')?.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const txt = await f.text();
    await processTextImport(txt);
  } catch (err) {
    toast(lang() === 'en' ? 'Error reading text file' : 'خطا در خواندن فایل متنی');
  }
  e.target.value = '';
});

$('#pasteTxtToggleBtn')?.addEventListener('click', () => {
  const box = $('#pasteTxtBox');
  box.hidden = !box.hidden;
  if (!box.hidden) $('#pasteTxtContent').focus();
});

$('#pasteTxtApplyBtn')?.addEventListener('click', async () => {
  const txt = $('#pasteTxtContent').value.trim();
  if (!txt) {
    toast(lang() === 'en' ? 'Paste some text first' : 'ابتدا متن را وارد کنید');
    return;
  }
  await processTextImport(txt);
  $('#pasteTxtContent').value = '';
  $('#pasteTxtBox').hidden = true;
});

// ---------- JSON Full Backup Export / Import Engine ----------
$('#exportJsonBtn')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({
    app: 'libmemory',
    version: 8,
    exportedAt: new Date().toISOString(),
    settings,
    customVariables,
    categories,
    memories
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `libmemory-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#importJsonFile')?.addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const arr = Array.isArray(data) ? data : data.memories;
    if (!Array.isArray(arr)) throw new Error();
    const idMap = {};
    for (const c of (data.categories || [])) { if (c && c.name) { const mine = getOrCreateCat(c.name); idMap[c.id] = mine.id; } }
    let added = 0, updated = 0;
    const byId = new Map(memories.map((m) => [m.id, m]));
    for (const x of arr) {
      if (!x || !x.title || !x.content) continue;
      const now = Date.now();
      const m = {
        id: x.id || uid(),
        title: String(x.title),
        content: String(x.content),
        categoryId: idMap[x.categoryId] || null,
        pinned: !!x.pinned,
        createdAt: x.createdAt || now,
        updatedAt: x.updatedAt || now
      };
      const old = byId.get(m.id);
      if (!old) { byId.set(m.id, m); added++; }
      else if ((m.updatedAt || 0) > (old.updatedAt || 0)) { byId.set(m.id, m); updated++; }
    }
    memories = [...byId.values()];
    if (Array.isArray(data.customVariables)) {
      data.customVariables.forEach(v => {
        if (v && v.name && !customVariables.some(cv => cv.name === v.name)) customVariables.push(v);
      });
    }
    if (data.settings) {
      settings = { ...AIM.DEFAULT_SETTINGS, ...data.settings };
      applyLangUI();
    }
    await persist(); renderAll();
    toast(tr('msgSaved'));
  } catch {
    toast(lang() === 'en' ? 'Invalid backup file' : 'فایل بکاپ معتبر نیست');
  }
  e.target.value = '';
});

// ---------- Settings Dialog & Providers ----------
const dlg = $('#settingsDlg');
const DEF = AIM.DEFAULT_AI;
let aiRaw = {}, fabGlobal = { ...AIM.DEFAULT_FAB }, fabSites = {};
const val = (id) => $(id).value.trim();

function fillProvider(p) {
  $('#pGemini').hidden = p !== 'gemini';
  $('#pClaude').hidden = p !== 'claude';
  $('#pOpenai').hidden = p !== 'openai';
  $('#testRes').textContent = '';
}

function fillSiteTable() {
  const defSideText = fabGlobal.side === 'right' ? tr('sideRight') : tr('sideLeft');
  $('#siteTbl tbody').innerHTML = AIM.SITES.map((s) => {
    const o = fabSites[s.key] || {};
    const en = o.enabled === undefined ? fabGlobal.enabled : o.enabled;
    return `
      <tr data-k="${s.key}">
        <td><b>${s.name}</b></td>
        <td><input type="checkbox" class="se" ${en ? 'checked' : ''} style="width:auto"></td>
        <td>
          <select class="ss" style="width:auto">
            <option value="">(${esc(defSideText)})</option>
            <option value="left" ${o.side === 'left' ? 'selected' : ''}>${esc(tr('sideLeft'))}</option>
            <option value="right" ${o.side === 'right' ? 'selected' : ''}>${esc(tr('sideRight'))}</option>
          </select>
        </td>
        <td><input class="sb" type="number" min="0" max="2000" placeholder="${fabGlobal.bottom ?? 110}" value="${o.bottom ?? ''}" style="width:90px" dir="ltr"></td>
      </tr>`;
  }).join('');
}

$('#setProvider').onchange = (e) => fillProvider(e.target.value);
$('#settingsBtn').onclick = async () => {
  const d = await chrome.storage.local.get(['aiConfig', 'settings', 'fabGlobal', 'fabSites']);
  aiRaw = d.aiConfig || {};
  const g = { ...DEF.gemini, ...(aiRaw.gemini || {}) };
  const c = { ...DEF.claude, ...(aiRaw.claude || {}) };
  const o = { ...DEF.openai, ...(aiRaw.openai || {}) };
  const provider = ['openai', 'claude'].includes(aiRaw.provider) ? aiRaw.provider : 'gemini';
  $('#setProvider').value = provider; fillProvider(provider);
  $('#gKey').value = g.apiKey || ''; $('#gModel').value = g.model || DEF.gemini.model;
  $('#cKey').value = c.apiKey || ''; $('#cModel').value = c.model || DEF.claude.model;
  $('#oBase').value = o.baseUrl || DEF.openai.baseUrl; $('#oKey').value = o.apiKey || ''; $('#oModel').value = o.model || DEF.openai.model;
  $('#setCap').value = aiRaw.dailyCap ?? DEF.dailyCap;

  settings = { ...AIM.DEFAULT_SETTINGS, ...(d.settings || {}) };
  applyTheme(settings.theme || 'midnight');
  $('#setAutoSelectMode').value = settings.autoSelectMode || 'manual';

  fabGlobal = { ...AIM.DEFAULT_FAB, ...(d.fabGlobal || {}) }; fabSites = d.fabSites || {};
  $('#fabGlobal').checked = fabGlobal.enabled; $('#fabSide').value = fabGlobal.side; $('#fabBottom').value = fabGlobal.bottom;
  fillSiteTable();
  $('#setHeader').value = settings.header || AIM.DEFAULT_SETTINGS.header;
  $('#setSep').value = settings.separator || AIM.DEFAULT_SETTINGS.separator;
  refreshBadge();
  switchSettingsTab('stab-appearance');
  dlg.showModal();
};
$('#setClose').onclick = () => dlg.close();
$('#setReset').onclick = () => {
  if (lang() === 'en') {
    $('#setHeader').value = AIM.DEFAULT_SETTINGS_EN.header;
    $('#setSep').value = AIM.DEFAULT_SETTINGS_EN.separator;
  } else {
    $('#setHeader').value = AIM.DEFAULT_SETTINGS.header;
    $('#setSep').value = AIM.DEFAULT_SETTINGS.separator;
  }
};

$('#testKey').onclick = async () => {
  const provider = $('#setProvider').value;
  const payload = provider === 'openai'
    ? { provider, apiKey: val('#oKey'), baseUrl: val('#oBase') }
    : provider === 'claude'
    ? { provider, apiKey: val('#cKey') }
    : { provider, apiKey: val('#gKey') };
  $('#testRes').textContent = '⏳ ...';
  const r = await ai('test', payload);
  const msg = r && r.ok ? (lang() === 'en' ? 'Connected ✅' : 'اتصال برقرار است ✅') : AIM.aiErrorText(r, lang());
  $('#testRes').textContent = msg; toast(msg);
};

$('#resetCd').onclick = async () => {
  await ai('resetCooldown'); refreshBadge();
  toast(tr('msgSaved'), 3500);
};

$('#setSave').onclick = async () => {
  const provider = $('#setProvider').value;
  const aiConfig = {
    provider,
    gemini: { apiKey: val('#gKey'), model: val('#gModel') || DEF.gemini.model },
    claude: { apiKey: val('#cKey'), model: val('#cModel') || DEF.claude.model },
    openai: { apiKey: val('#oKey'), baseUrl: (val('#oBase') || DEF.openai.baseUrl).replace(/\/+$/, ''), model: val('#oModel') || DEF.openai.model },
    dailyCap: Math.max(0, parseInt($('#setCap').value, 10) || 0)
  };
  const newSettings = {
    ...settings,
    header: val('#setHeader') || AIM.DEFAULT_SETTINGS.header,
    separator: val('#setSep') || AIM.DEFAULT_SETTINGS.separator,
    autoSelectMode: $('#setAutoSelectMode').value
  };
  settings = newSettings;

  const newGlobal = { enabled: $('#fabGlobal').checked, side: $('#fabSide').value, bottom: Math.max(0, parseInt($('#fabBottom').value, 10) || AIM.DEFAULT_FAB.bottom) };
  const newSites = {};
  $('#siteTbl tbody').querySelectorAll('tr').forEach((trEl) => {
    const k = trEl.dataset.k, o = {};
    o.enabled = trEl.querySelector('.se').checked;
    const side = trEl.querySelector('.ss').value; if (side) o.side = side;
    const bv = trEl.querySelector('.sb').value; if (bv !== '') o.bottom = Math.max(0, parseInt(bv, 10) || 0);
    newSites[k] = o;
  });
  await chrome.storage.local.set({ settings: newSettings, aiConfig, fabGlobal: newGlobal, fabSites: newSites });
  dlg.close(); refreshBadge(); toast(tr('msgSaved'));
};

// Tutorial Modal
$('#tutBtn').onclick = () => $('#tutDlg').showModal();
$('#tutClose').onclick = () => $('#tutDlg').close();
if (location.hash === '#tutorial') $('#tutDlg').showModal();

init();
