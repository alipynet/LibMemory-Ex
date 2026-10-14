(() => {
  if (window.__aiMemoryLoaded) return;
  window.__aiMemoryLoaded = true;
  const { esc, norm, flat, uid, UNCAT, t } = AIM;

  let memories = [], categories = [], customVariables = [], selected = new Set(), settings = { ...AIM.DEFAULT_SETTINGS };
  let fabGlobal = { ...AIM.DEFAULT_FAB }, fabSites = {};
  const siteKey = AIM.siteKeyOf(location.hostname);

  let lastEditable = null, query = '', onlySelected = false, collapsed = new Set();
  const expanded = new Set();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const catById = (id) => categories.find((c) => c.id === id);
  const lang = () => settings.lang === 'en' ? 'en' : 'fa';
  const tr = (k, vars) => t(k, lang(), vars);
  const ai = (action, payload) => chrome.runtime.sendMessage({ type: 'ai', action, payload }).catch(() => ({
    ok: false,
    code: 'error',
    message: lang() === 'en' ? 'Extension updated, please refresh the page' : 'افزونه به‌روزرسانی شده، صفحه را دوباره رفرش کن'
  }));

  const fontUrl = chrome.runtime.getURL('fonts/Vazirmatn[wght].ttf');

  // ---------- UI Creation in Shadow DOM ----------
  const host = document.createElement('div');
  host.id = 'ai-memory-ext-root';
  host.setAttribute('data-theme', 'midnight');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
@font-face {
  font-family: "Vazirmatn";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${fontUrl}") format("truetype");
}
:host { all: initial; }
${AIM.THEME_CSS_VARS}

:host {
  --app-font-family: "CustomUserFont", "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif;
}
* {
  box-sizing: border-box;
  font-family: var(--app-font-family) !important;
}

button {
  cursor: pointer;
  font: inherit;
  border: 1px solid var(--border-col);
  background: var(--bg-elevated);
  color: var(--text-main);
  border-radius: 8px;
  padding: 5px 9px;
  font-size: 11.5px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
button:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  border-color: var(--border-strong);
}
button:active { transform: translateY(1px); }
button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
button.loading, button:disabled.loading {
  cursor: wait;
}

#fab {
  position: fixed;
  left: 20px;
  bottom: 110px;
  z-index: 2147483647;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.28);
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: #fff;
  font-size: 22px;
  box-shadow: 0 6px 22px rgba(0,0,0,.42);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  user-select: none;
  transition: transform .15s ease, box-shadow .15s ease;
}
#fab:hover { transform: scale(1.07); box-shadow: 0 8px 28px rgba(99,102,241,.55); }
#badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  min-width: 19px;
  height: 19px;
  border-radius: 10px;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-weight: 800;
  border: 1.5px solid #fff;
}

#panel {
  position: fixed;
  z-index: 2147483647;
  width: 445px;
  max-width: calc(100vw - 16px);
  background: var(--bg-surface);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--text-main);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: none;
  flex-direction: column;
  overflow: hidden;
  direction: rtl;
  font-size: 13px;
  border: 1px solid var(--border-strong);
}
#panel.ltr, #slashPopup.ltr { direction: ltr; }
#panel.open { display: flex; }

.hdr {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border-col);
}
.hdr b { font-size: 14px; font-weight: 800; color: var(--text-main); }
.sp { flex: 1; }
.ib {
  background: transparent;
  border: 1px solid transparent;
  font-size: 13px;
  padding: 3px 7px;
  border-radius: 7px;
  color: var(--text-main);
  font-weight: 600;
}
.ib:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  border-color: var(--border-col);
}
#cnt { color: var(--text-muted); font-size: 11.5px; }

/* Detection Banner inside Panel */
.auto-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--sec-bg);
  border-bottom: 1px solid var(--sec-border);
  font-size: 12px;
  color: var(--sec-text);
}
.auto-banner select {
  font-size: 11.5px;
  padding: 4px 7px;
  border-radius: 7px;
  border: 1px solid var(--sec-border);
  background: var(--bg-elevated);
  color: var(--text-main);
  font-weight: 600;
  width: auto;
  flex: 1;
}

.search { padding: 9px 12px 6px; }
input, textarea, select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-col);
  border-radius: 9px;
  font: inherit;
  background: var(--bg-elevated);
  color: var(--text-main);
  font-size: 12.5px;
}
input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 0.85; }
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--border-strong);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.tools {
  display: flex;
  gap: 5px;
  padding: 0 12px 8px;
  flex-wrap: wrap;
}

.primary {
  background: var(--primary) !important;
  color: var(--primary-text) !important;
  border-color: var(--primary) !important;
  font-weight: 700;
}
.primary:hover {
  background: var(--primary-hover) !important;
  color: var(--primary-text) !important;
}
.accent {
  background: #059669 !important;
  color: #ffffff !important;
  border-color: #10b981 !important;
  font-weight: 700;
}
.accent:hover {
  background: #047857 !important;
  color: #ffffff !important;
}
.ai {
  background: var(--ai-bg) !important;
  color: var(--ai-text) !important;
  border-color: var(--ai-border) !important;
  font-weight: 600;
}
.ai:hover {
  background: var(--ai-hover) !important;
  color: var(--ai-text) !important;
}
.cosine {
  background: var(--sec-bg) !important;
  color: var(--sec-text) !important;
  border-color: var(--sec-border) !important;
  font-weight: 600;
}
.cosine:hover {
  background: var(--sec-hover) !important;
  color: var(--sec-text) !important;
}
.danger {
  background: var(--danger-bg) !important;
  color: var(--danger-text) !important;
  border-color: var(--danger-border) !important;
  font-weight: 600;
}
.danger:hover {
  background: var(--danger-hover) !important;
  color: var(--danger-text) !important;
}

#addForm { padding: 0 12px 10px; display: flex; flex-direction: column; gap: 6px; }
#addForm textarea { min-height: 80px; resize: vertical; }
.row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

.hidden { display: none !important; }
#list { overflow-y: auto; flex: 1; min-height: 60px; border-top: 1px solid var(--border-col); }

.cat {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 12px;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border-col);
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--text-main);
}
.cat:hover { background: var(--bg-hover); }
.cat .n { flex: 1; }
.cat .c { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.cat input, .item input { width: auto; margin: 0; accent-color: var(--primary); cursor: pointer; }

.item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 12px;
  padding-inline-start: 22px;
  border-bottom: 1px solid var(--border-col);
  cursor: pointer;
  transition: background 0.12s ease;
}
.item:hover { background: var(--bg-hover); }
.item.sel { background: var(--bg-active); }
.item.is-pinned { background: var(--bg-pinned); }
.item input { margin-top: 3px; }

.body { flex: 1; min-width: 0; }
.t { font-weight: 700; margin-bottom: 2px; word-break: break-word; font-size: 13px; color: var(--text-main); }
.s { color: var(--text-muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s.full { white-space: pre-wrap; overflow: visible; line-height: 1.6; }
.pin-ico { color: #f59e0b; font-size: 11px; margin-inline-end: 3px; }

.empty { padding: 22px; text-align: center; color: var(--text-muted); }
.ftr {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 9px 12px;
  border-top: 1px solid var(--border-col);
  background: var(--bg-surface-2);
  flex-wrap: wrap;
}
#selInfo { font-size: 12px; color: var(--text-muted); font-weight: 600; }

#toast {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 64px;
  background: var(--bg-elevated);
  color: var(--text-main);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  padding: 7px 14px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity .2s;
  pointer-events: none;
  max-width: 92%;
  text-align: center;
  z-index: 100;
}
#toast.show { opacity: .98; }

/* Slash command autocomplete popup */
#slashPopup {
  position: fixed;
  z-index: 2147483647;
  background: var(--bg-surface);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--text-main);
  border-radius: 13px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-strong);
  width: 350px;
  max-width: calc(100vw - 20px);
  max-height: 290px;
  display: none;
  flex-direction: column;
  overflow: hidden;
  direction: rtl;
  font-size: 12.5px;
}
#slashPopup.open { display: flex; }
.slash-hdr {
  padding: 8px 12px;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border-col);
  font-weight: 700;
  color: var(--ai-text);
  font-size: 11.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.slash-list { overflow-y: auto; flex: 1; }
.slash-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-col);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.12s ease;
}
.slash-item:hover, .slash-item.active { background: var(--bg-active); }
.slash-t { font-weight: 700; font-size: 12.5px; color: var(--text-main); }
.slash-s { color: var(--text-muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>

<button id="fab" title="AI Memory (Alt+M)">🧠<span id="badge"></span></button>

<div id="panel" data-theme="midnight">
  <div class="hdr">
    <b id="hdrTitle">🧠 حافظه من</b>
    <span id="cnt"></span>
    <div class="sp"></div>
    <button class="ib" id="themeCycleBtn" title="تغییر سریع تم / Switch Theme">🎨</button>
    <button class="ib" id="langBtn" title="Switch Language / تغییر زبان">🌐 EN</button>
    <button class="ib" id="tut" title="Guide">📖</button>
    <button class="ib" id="mgr" title="Settings & Manager">⚙️</button>
    <button class="ib" id="close" title="Close">✕</button>
  </div>

  <div class="auto-banner">
    <span id="autoLbl">تشخیص خودکار:</span>
    <select id="autoSelectMode">
      <option value="manual" id="optModeOff">خاموش</option>
      <option value="cosine" id="optModeManual">⚡ روش دستی (بدون هوشواره)</option>
      <option value="ai" id="optModeAi">🤖 با هوشواره (AI)</option>
    </select>
    <button id="detectNowBtn" class="cosine" style="padding:3px 9px;font-size:11px">🎯 تشخیص الان</button>
  </div>

  <div class="search">
    <input id="q" placeholder="جستجو در دسته‌ها، عنوان و متن (روش دستی)...">
  </div>
  <div class="tools">
    <button id="cosineBtn" class="cosine">⚡ روش دستی</button>
    <button id="smart" class="ai">🤖 انتخاب با هوشواره</button>
    <button id="selAll">انتخاب همه</button>
    <button id="selNone">لغو انتخاب</button>
    <button id="onlySel">فقط انتخاب‌شده‌ها</button>
    <button id="batchPin">📌 پین</button>
    <button id="batchDel" class="danger">🗑 حذف</button>
    <button id="colAll">جمع/باز</button>
    <button id="addBtn">+ حافظه</button>
  </div>
  <div id="addForm" class="hidden">
    <input id="newTitle" placeholder="عنوان حافظه..." maxlength="200">
    <input id="newCat" list="catNames" placeholder="دسته (اختیاری)">
    <datalist id="catNames"></datalist>
    <textarea id="newContent" placeholder="متن حافظه..."></textarea>
    <div class="row">
      <button id="saveNew" class="primary">ذخیره دستی</button>
      <button id="aiNew" class="ai">🤖 استخراج با هوشواره</button>
      <button id="cancelNew">انصراف</button>
    </div>
  </div>
  <div id="list"></div>
  <div class="ftr">
    <span id="selInfo"></span>
    <div class="sp"></div>
    <button id="insert" class="primary">درج در پرامپت</button>
    <button id="insertSend" class="accent">درج و ارسال</button>
  </div>
  <div id="toast"></div>
</div>

<div id="slashPopup" data-theme="midnight">
  <div class="slash-hdr"><span id="slashHdrText">🧠 انتخاب سریع حافظه (/ یا /mem)</span></div>
  <div class="slash-list" id="slashList"></div>
</div>
`;

  document.documentElement.appendChild(host);
  setInterval(() => { if (!host.isConnected) document.documentElement.appendChild(host); }, 2000);

  const $ = (s) => root.querySelector(s);
  const fab = $('#fab'), panel = $('#panel'), list = $('#list'), slashPopup = $('#slashPopup'), slashList = $('#slashList');

  ['keydown', 'keyup', 'keypress', 'input', 'paste', 'copy', 'cut'].forEach((t) => {
    panel.addEventListener(t, (e) => {
      e.stopPropagation();
      if (t === 'keydown' && e.key === 'Escape') closePanel();
    });
  });

  let toastT;
  function toast(tMsg, ms = 2800) {
    const el = $('#toast');
    el.textContent = tMsg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), ms);
  }
  const safeSet = (o) => chrome.storage.local.set(o).catch(() => toast(lang() === 'en' ? 'Extension updated, please refresh' : 'افزونه به‌روزرسانی شده، صفحه را دوباره رفرش کن'));

  
  function applyCustomFont(customFont) {
    let fontStyle = root.getElementById('custom-font-style');
    if (!fontStyle) {
      fontStyle = document.createElement('style');
      fontStyle.id = 'custom-font-style';
      root.appendChild(fontStyle);
    }
    if (customFont && customFont.dataUrl) {
      fontStyle.textContent = `
        @font-face {
          font-family: "CustomUserFont";
          src: url("${customFont.dataUrl}");
          font-display: swap;
        }
        :host {
          --app-font-family: "CustomUserFont", "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif;
        }
      `;
    } else {
      fontStyle.textContent = `
        :host {
          --app-font-family: "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif;
        }
      `;
    }
  }

  function applyThemeUI() {
    const th = AIM.THEMES.some(x => x.id === settings.theme) ? settings.theme : 'midnight';
    host.setAttribute('data-theme', th);
    panel.setAttribute('data-theme', th);
    slashPopup.setAttribute('data-theme', th);
  }

  // Quick theme switcher button right in the floating panel header!
  $('#themeCycleBtn').onclick = async () => {
    const idx = AIM.THEMES.findIndex(x => x.id === (settings.theme || 'midnight'));
    const next = AIM.THEMES[(idx + 1) % AIM.THEMES.length];
    settings.theme = next.id;
    applyThemeUI();
    await safeSet({ settings });
    toast(`${next.icon} ${lang() === 'en' ? next.en : next.fa}`, 2000);
  };

  function applyLangUI() {
    const isEn = lang() === 'en';
    panel.classList.toggle('ltr', isEn);
    slashPopup.classList.toggle('ltr', isEn);
    applyThemeUI();
    $('#hdrTitle').textContent = tr('appTitle');
    $('#langBtn').textContent = tr('langToggle');
    $('#langBtn').title = tr('langTitle');
    $('#autoLbl').textContent = tr('panelAutoLbl');
    $('#optModeOff').textContent = tr('panelModeOff');
    $('#optModeManual').textContent = tr('panelModeManual');
    $('#optModeAi').textContent = tr('panelModeAi');
    $('#detectNowBtn').textContent = tr('detectNowBtn');
    $('#q').placeholder = tr('panelSearchPh');
    $('#cosineBtn').textContent = tr('manualMethodBtn');
    $('#cosineBtn').title = tr('manualMethodTitle');
    $('#smart').textContent = tr('aiSelectBtn');
    $('#selAll').textContent = tr('selAllBtn');
    $('#selNone').textContent = tr('selNoneBtn');
    $('#batchPin').textContent = tr('batchPinBtn');
    $('#batchDel').textContent = tr('batchDelBtn');
    $('#colAll').textContent = tr('colAllBtn');
    $('#addBtn').textContent = tr('addMemBtn');
    $('#newTitle').placeholder = tr('titlePh');
    $('#newContent').placeholder = tr('contentPh');
    $('#saveNew').textContent = tr('saveManualBtn');
    $('#aiNew').textContent = tr('extractAiBtn');
    $('#cancelNew').textContent = tr('cancelBtn');
    $('#insert').textContent = tr('insertBtn');
    $('#insertSend').textContent = tr('insertSendBtn');
    $('#slashHdrText').textContent = tr('slashHeader');
  }

  $('#langBtn').onclick = async () => {
    const nextLang = lang() === 'en' ? 'fa' : 'en';
    settings.lang = nextLang;
    if (nextLang === 'en' && settings.header === AIM.DEFAULT_SETTINGS.header) {
      settings.header = AIM.DEFAULT_SETTINGS_EN.header;
      settings.separator = AIM.DEFAULT_SETTINGS_EN.separator;
    } else if (nextLang === 'fa' && settings.header === AIM.DEFAULT_SETTINGS_EN.header) {
      settings.header = AIM.DEFAULT_SETTINGS.header;
      settings.separator = AIM.DEFAULT_SETTINGS.separator;
    }
    await safeSet({ settings });
    applyLangUI();
    render();
  };

  // ---------- Storage Loading ----------
  async function loadData() {
    const d = await chrome.storage.local.get(['memories', 'categories', 'customVariables', 'settings', 'selectedIds', 'fabGlobal', 'fabSites', 'collapsedCats']);
    memories = (d.memories || []).map(m => ({ categoryId: null, pinned: false, ...m }));
    categories = d.categories || [];
    customVariables = d.customVariables || [...AIM.DEFAULT_VARS];
    settings = { ...AIM.DEFAULT_SETTINGS, ...(d.settings || {}) };
    const ids = new Set(memories.map((m) => m.id));
    selected = new Set((d.selectedIds || []).filter((id) => ids.has(id)));
    collapsed = new Set(d.collapsedCats || []);
    fabGlobal = { ...AIM.DEFAULT_FAB, ...(d.fabGlobal || {}) };
    fabSites = d.fabSites || {};

    $('#autoSelectMode').value = settings.autoSelectMode || 'manual';

    applyCustomFont(settings.customFont);
    applyLangUI();
    applyFab();
    render();
  }

  const saveSelected = () => safeSet({ selectedIds: [...selected] });

  chrome.storage.onChanged.addListener((c, area) => {
    if (area !== 'local') return;
    if (c.memories) {
      memories = (c.memories.newValue || []).map(m => ({ categoryId: null, pinned: false, ...m }));
      const ids = new Set(memories.map((m) => m.id));
      selected = new Set([...selected].filter((id) => ids.has(id)));
    }
    if (c.categories) categories = c.categories.newValue || [];
    if (c.customVariables) customVariables = c.customVariables.newValue || [];
    if (c.settings) {
      settings = { ...AIM.DEFAULT_SETTINGS, ...(c.settings.newValue || {}) };
      applyCustomFont(settings.customFont);
      $('#autoSelectMode').value = settings.autoSelectMode || 'manual';
      applyLangUI();
    }
    if (c.selectedIds) selected = new Set(c.selectedIds.newValue || []);
    if (c.fabGlobal) fabGlobal = { ...AIM.DEFAULT_FAB, ...(c.fabGlobal.newValue || {}) };
    if (c.fabSites) fabSites = c.fabSites.newValue || {};
    if (c.fabGlobal || c.fabSites) applyFab();
    render();
  });

  // Floating button placement
  function effFab() {
    const o = (siteKey && fabSites[siteKey]) || {};
    return {
      enabled: o.enabled !== undefined ? !!o.enabled : !!fabGlobal.enabled,
      side: o.side || fabGlobal.side || 'left',
      bottom: o.bottom !== undefined ? o.bottom : (fabGlobal.bottom ?? 110)
    };
  }

  function applyFab() {
    const c = effFab();
    fab.style.display = c.enabled ? '' : 'none';
    if (!c.enabled) closePanel();
    fab.style.top = 'auto';
    if (c.side === 'right') { fab.style.right = '20px'; fab.style.left = 'auto'; }
    else { fab.style.left = '20px'; fab.style.right = 'auto'; }
    fab.style.bottom = Math.max(0, c.bottom) + 'px';
  }

  // ---------- Render Grouped by Category ----------
  const groupKey = (m) => (catById(m.categoryId) ? m.categoryId : UNCAT);
  const membersOf = (key) => memories.filter((m) => groupKey(m) === key);

  function groups() {
    const qClean = flat(query);
    const scoreMap = new Map();
    if (qClean) {
      const scored = AIM.manualScoreMemories(qClean, memories, categories, { minScore: 0.025 });
      scored.forEach(s => scoreMap.set(s.id, s.score));
    }

    const keys = [...[...categories].sort((a, b) => a.name.localeCompare(b.name, lang())).map((c) => c.id), UNCAT];
    const out = [];
    for (const k of keys) {
      const name = k === UNCAT ? (lang() === 'en' ? 'Uncategorized' : 'بدون دسته') : catById(k).name;
      let items = membersOf(k);
      if (!items.length) continue;
      const total = items;
      if (qClean) {
        items = items.filter((m) => scoreMap.has(m.id) || norm(name).includes(norm(qClean)));
      }
      if (onlySelected) items = items.filter((m) => selected.has(m.id));
      if (!items.length) continue;

      items = [...items].sort((a, b) => {
        if (qClean) {
          const sa = scoreMap.get(a.id) || 0;
          const sb = scoreMap.get(b.id) || 0;
          if (Math.abs(sa - sb) > 0.02) return sb - sa;
        }
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      out.push({ key: k, name, items, total });
    }
    return out;
  }

  function render() {
    const gs = groups();
    $('#cnt').textContent = tr('cntFmt', { m: memories.length, c: categories.length });
    $('#selInfo').textContent = tr('selInfoFmt', { n: selected.size });
    $('#onlySel').textContent = onlySelected ? tr('showAllBtn') : tr('onlySelBtn');
    const badge = $('#badge');
    badge.textContent = selected.size;
    badge.style.display = selected.size ? 'flex' : 'none';
    $('#catNames').innerHTML = categories.map((c) => `<option value="${esc(c.name)}">`).join('');

    if (!memories.length) {
      list.innerHTML = `<div class="empty">${esc(tr('panelEmpty'))}</div>`;
      return;
    }
    if (!gs.length) {
      list.innerHTML = `<div class="empty">${esc(tr('noResult'))}</div>`;
      return;
    }

    const searching = !!query.trim() || onlySelected;
    list.innerHTML = gs.map((g) => {
      const nSel = g.total.filter((m) => selected.has(m.id)).length;
      const open = searching || !collapsed.has(g.key);
      return `
        <div class="cat" data-cat="${esc(g.key)}">
          <input type="checkbox" class="cb" ${nSel && nSel === g.total.length ? 'checked' : ''} data-ind="${nSel && nSel < g.total.length ? 1 : 0}">
          <span class="n">${g.key === UNCAT ? '📄' : '📁'} ${esc(g.name)}</span>
          <span class="c">${nSel ? nSel + '/' : ''}${g.total.length}</span>
          <span>${open ? '▾' : '◂'}</span>
        </div>`
        + (open ? g.items.map((m) => `
        <div class="item ${selected.has(m.id) ? 'sel' : ''} ${m.pinned ? 'is-pinned' : ''}" data-id="${esc(m.id)}">
          <input type="checkbox" ${selected.has(m.id) ? 'checked' : ''} tabindex="-1">
          <div class="body">
            <div class="t">${m.pinned ? '<span class="pin-ico">📌</span>' : ''}${esc(m.title)}</div>
            <div class="s ${expanded.has(m.id) ? 'full' : ''}">${esc(m.content)}</div>
          </div>
          <button class="ib exp">${expanded.has(m.id) ? '▴' : '▾'}</button>
        </div>`).join('') : '');
    }).join('');

    list.querySelectorAll('.cb[data-ind="1"]').forEach((cb) => { cb.indeterminate = true; });
  }

  list.addEventListener('click', (e) => {
    const cat = e.target.closest('.cat');
    if (cat) {
      const key = cat.dataset.cat;
      if (e.target.classList.contains('cb')) {
        e.preventDefault();
        const mem = membersOf(key);
        const all = mem.every((m) => selected.has(m.id));
        mem.forEach((m) => (all ? selected.delete(m.id) : selected.add(m.id)));
        saveSelected(); render();
      } else {
        collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
        safeSet({ collapsedCats: [...collapsed] }); render();
      }
      return;
    }
    const item = e.target.closest('.item'); if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('.exp')) {
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      render(); return;
    }
    selected.has(id) ? selected.delete(id) : selected.add(id);
    saveSelected(); render();
  });

  // Quick Pin & Quick Delete inside Chat Panel
  $('#batchPin').onclick = async () => {
    if (!selected.size) { toast(tr('msgSelectAtLeastOne')); return; }
    const selMems = memories.filter(m => selected.has(m.id));
    const allPinned = selMems.every(m => m.pinned);
    selMems.forEach(m => { m.pinned = !allPinned; });
    await safeSet({ memories });
    render();
    toast(tr('msgSaved'));
  };

  $('#batchDel').onclick = async () => {
    if (!selected.size) { toast(tr('msgSelectAtLeastOne')); return; }
    const count = selected.size;
    const msg = lang() === 'en' ? `Permanently delete ${count} selected memories?` : `آیا از حذف دائم ${count} حافظه انتخاب‌شده اطمینان داری؟`;
    if (!confirm(msg)) return;
    memories = memories.filter(m => !selected.has(m.id));
    selected.clear();
    await safeSet({ memories, selectedIds: [] });
    render();
    toast(tr('msgDeleted'));
  };

  // Position Panel
  function positionPanel() {
    const r = fab.getBoundingClientRect(), W = innerWidth, H = innerHeight, p = panel.style;
    p.left = p.right = p.top = p.bottom = 'auto';
    if (r.left + r.width / 2 < W / 2) p.left = Math.max(8, r.left) + 'px';
    else p.right = Math.max(8, W - r.right) + 'px';
    let avail;
    if (r.top > H / 2) { p.bottom = (H - r.top + 10) + 'px'; avail = r.top - 20; }
    else { p.top = (r.bottom + 10) + 'px'; avail = H - r.bottom - 20; }
    p.maxHeight = Math.max(280, Math.min(avail, H * 0.82)) + 'px';
  }

  function openPanel() {
    positionPanel();
    panel.classList.add('open');
    render();
    setTimeout(() => $('#q').focus(), 30);
  }
  function closePanel() {
    panel.classList.remove('open');
    if (lastEditable && lastEditable.isConnected) lastEditable.focus();
  }
  function togglePanel() { panel.classList.contains('open') ? closePanel() : openPanel(); }
  addEventListener('resize', () => panel.classList.contains('open') && positionPanel());

  let drag = null;
  fab.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, l: fab.offsetLeft, t: fab.offsetTop, moved: false };
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) {
      fab.style.left = Math.min(Math.max(0, drag.l + dx), innerWidth - 48) + 'px';
      fab.style.top = Math.min(Math.max(0, drag.t + dy), innerHeight - 48) + 'px';
      fab.style.bottom = 'auto';
      if (panel.classList.contains('open')) positionPanel();
    }
  });
  fab.addEventListener('pointerup', () => {
    const moved = drag && drag.moved; drag = null;
    if (!moved) { togglePanel(); return; }
    if (!siteKey) return;
    const r = fab.getBoundingClientRect();
    const side = r.left + r.width / 2 < innerWidth / 2 ? 'left' : 'right';
    const bottom = Math.round(Math.max(0, innerHeight - r.bottom));
    fabSites = { ...fabSites, [siteKey]: { ...(fabSites[siteKey] || {}), side, bottom } };
    safeSet({ fabSites }); applyFab();
  });

  $('#close').onclick = closePanel;
  $('#mgr').onclick = () => chrome.runtime.sendMessage({ type: 'openManager' }).catch(() => {});
  $('#tut').onclick = () => chrome.runtime.sendMessage({ type: 'openManager', hash: '#tutorial' }).catch(() => {});

  $('#q').addEventListener('input', (e) => { query = e.target.value; render(); });
  $('#selAll').onclick = () => { groups().forEach((g) => g.items.forEach((m) => selected.add(m.id))); saveSelected(); render(); };
  $('#selNone').onclick = () => { selected.clear(); saveSelected(); render(); };
  $('#onlySel').onclick = () => { onlySelected = !onlySelected; render(); };
  $('#colAll').onclick = () => {
    const keys = [...categories.map((c) => c.id), UNCAT];
    if (keys.some((k) => !collapsed.has(k))) keys.forEach((k) => collapsed.add(k)); else collapsed.clear();
    safeSet({ collapsedCats: [...collapsed] }); render();
  };

  // Add in Panel
  const resetForm = () => { $('#newTitle').value = $('#newContent').value = $('#newCat').value = ''; $('#addForm').classList.add('hidden'); };
  $('#addBtn').onclick = () => { $('#addForm').classList.toggle('hidden'); $('#newTitle').focus(); };
  $('#cancelNew').onclick = resetForm;

  function catIdFor(name) {
    name = flat(name); if (!name) return null;
    let c = AIM.findCategoryByName(categories, name);
    if (!c) { c = { id: uid(), name, createdAt: Date.now() }; categories.push(c); }
    return c.id;
  }

  $('#saveNew').onclick = async () => {
    const title = $('#newTitle').value.trim(), content = $('#newContent').value.trim();
    if (!title || !content) { toast(tr('msgTitleContentReq')); return; }
    const now = Date.now();
    let cId = catIdFor($('#newCat').value);
    if (!cId && categories.length) {
      const autoC = AIM.localCategorize({ title, content }, categories, memories);
      if (autoC) cId = autoC.id;
    }
    const m = { id: uid(), title, content, categoryId: cId, pinned: false, createdAt: now, updatedAt: now };
    memories = [m, ...memories]; selected.add(m.id);
    await safeSet({ memories, categories, selectedIds: [...selected] });
    resetForm(); toast(tr('msgSaved')); render();
  };

  $('#aiNew').onclick = async () => {
    const src = $('#newContent').value.trim(); if (!src) { toast(tr('msgTitleContentReq')); return; }
    const btn = $('#aiNew'); btn.disabled = true; btn.textContent = '⏳ ...';
    const r = await ai('create', { text: src, categories: categories.map((c) => c.name) });
    btn.disabled = false; btn.textContent = tr('extractAiBtn');
    if (!r || !r.ok) {
      if (!$('#newTitle').value.trim()) $('#newTitle').value = AIM.heuristicTitle(src, lang());
      toast(`${AIM.aiErrorText(r, lang())}`, 4500);
      return;
    }
    const now = Date.now();
    const created = r.data.map((d, k) => ({ id: uid(), title: d.title, content: d.content, categoryId: catIdFor(d.category), pinned: false, createdAt: now + k, updatedAt: now + k }));
    memories = [...created, ...memories]; created.forEach((m) => selected.add(m.id));
    await safeSet({ memories, categories, selectedIds: [...selected] });
    resetForm(); render();
    toast(tr('msgSaved'), 3500);
  };

  // ---------- Unified Manual Method Detection (Offline & Instant) ----------
  async function runManualDetection(notify = true) {
    const el = findInput();
    const p = el ? stripOldBlock(getText(el)) : '';
    if (!p) {
      if (notify) toast(tr('msgWritePromptFirst'));
      return [];
    }
    if (!memories.length) return [];

    const ids = AIM.cosineSuggest(p, memories, categories, 7, 0.05);
    selected.clear();
    ids.forEach((id) => selected.add(id));
    saveSelected(); render();

    if (notify) {
      toast(ids.length ? tr('msgManualFound', { n: ids.length }) : tr('msgManualNone'), 3500);
    }
    return ids;
  }

  $('#cosineBtn').onclick = () => runManualDetection(true);

  // ---------- AI Smart Select ----------
  async function runAiDetection(notify = true) {
    const el = findInput();
    const p = el ? stripOldBlock(getText(el)) : '';
    if (!p) {
      if (notify) toast(tr('msgWritePromptFirst'));
      return [];
    }
    if (!memories.length) return [];

    const btn = $('#smart'); btn.disabled = true;
    const items = memories.map((m, i) => ({ i, title: m.title, category: catById(m.categoryId)?.name || '' }));
    const r = await ai('suggest', { prompt: p, items });
    btn.disabled = false;

    let ids = [];
    if (r && r.ok) {
      ids = r.data.map((i) => memories[i]?.id).filter(Boolean);
      selected.clear();
      ids.forEach((id) => selected.add(id));
      saveSelected(); render();
      if (notify) toast(ids.length ? tr('msgAiFound', { n: ids.length }) : tr('msgAiNone'), 4000);
    } else {
      ids = await runManualDetection(false);
      if (notify) toast(tr('msgAiFallback', { n: ids.length }), 4000);
    }
    return ids;
  }

  $('#smart').onclick = () => runAiDetection(true);

  $('#detectNowBtn').onclick = () => {
    const mode = $('#autoSelectMode').value;
    if (mode === 'ai') runAiDetection(true);
    else runManualDetection(true);
  };

  $('#autoSelectMode').addEventListener('change', async (e) => {
    settings.autoSelectMode = e.target.value;
    await safeSet({ settings });
  });

  chrome.runtime.onMessage.addListener((msg) => { if (msg && msg.type === 'togglePanel') togglePanel(); });

  // ---------- Deep Chat Input Detection & Insertion (Traverses Shadow DOMs & ContentEditable wrappers) ----------
  function isEditableElement(el) {
    if (!el || el.nodeType !== 1 || el === host || host.contains(el)) return false;
    if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
    if (el.tagName === 'INPUT') return /^(text|search|url)$/i.test(el.type || 'text') && !el.disabled && !el.readOnly;
    const ce = el.getAttribute('contenteditable');
    if (ce === 'true' || ce === 'plaintext-only' || ce === '') return true;
    if (el.isContentEditable && ce !== 'false') return true;
    return false;
  }

  function resolveEditable(node) {
    if (!node) return null;
    if (node.nodeType === 3) node = node.parentElement;
    while (node && node.nodeType === 1) {
      if (node === host || host.contains(node)) return null;
      if (node.tagName === 'TEXTAREA' || (node.tagName === 'INPUT' && /^(text|search)$/i.test(node.type || 'text'))) {
        return node;
      }
      if (isEditableElement(node)) {
        // Climb to topmost contenteditable root so we don't grab an inner <p> or <span>
        let top = node;
        while (top.parentElement && isEditableElement(top.parentElement)) {
          top = top.parentElement;
        }
        return top;
      }
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
    return null;
  }

  const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  function getDeepActiveElement() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement && a !== host) {
      a = a.shadowRoot.activeElement;
    }
    return a;
  }

  document.addEventListener('focusin', (e) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const n of path) {
      if (n === host) return;
      const ed = resolveEditable(n);
      if (ed && visible(ed)) { lastEditable = ed; break; }
    }
  }, true);

  const INPUT_SELECTORS = [
    '#prompt-textarea',
    'div.ProseMirror[contenteditable="true"]',
    'fieldset div[contenteditable="true"]',
    'rich-textarea .ql-editor',
    'div.ql-editor[contenteditable="true"]',
    'textarea#chat-input',
    'textarea#ask-input',
    '#ask-input',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="plaintext-only"]',
    'textarea[placeholder]',
    'textarea',
    '[contenteditable="true"]'
  ];

  function queryAllDeep(selector, rootNode = document) {
    const out = [];
    try {
      out.push(...rootNode.querySelectorAll(selector));
    } catch (e) {}
    const all = rootNode.querySelectorAll ? rootNode.querySelectorAll('*') : [];
    for (const el of all) {
      if (el !== host && el.shadowRoot) {
        out.push(...queryAllDeep(selector, el.shadowRoot));
      }
    }
    return out;
  }

  function findInput() {
    const deepActive = resolveEditable(getDeepActiveElement());
    if (deepActive && visible(deepActive)) return (lastEditable = deepActive);
    if (lastEditable && lastEditable.isConnected && visible(lastEditable)) return lastEditable;
    for (const s of INPUT_SELECTORS) {
      const el = queryAllDeep(s).find(x => visible(x) && !host.contains(x));
      if (el) return (lastEditable = resolveEditable(el) || el);
    }
    return null;
  }

  const getText = (el) => {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return (el.innerText ?? el.textContent ?? '').replace(/\u00a0/g, ' ');
  };

  function selectAllIn(el) {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  async function setText(el, text) {
    if (!el) return;
    const probe = flat(text).slice(0, 40);
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try { el.setSelectionRange(text.length, text.length); } catch (e) {}
      el.scrollTop = el.scrollHeight;
      return;
    }

    el.focus();
    selectAllIn(el);

    try {
      document.execCommand('insertText', false, text);
    } catch (e) {}
    await sleep(50);
    if (!probe || flat(getText(el)).includes(probe)) return;

    selectAllIn(el);
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (e) {}
    await sleep(70);
    if (!probe || flat(getText(el)).includes(probe)) return;

    el.innerHTML = text.split('\n').map(line => `<p>${esc(line) || '<br>'}</p>`).join('');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
  }

  function stripOldBlock(tStr) {
    const hFa = flat(AIM.DEFAULT_SETTINGS.header).slice(0, 22);
    const hEn = flat(AIM.DEFAULT_SETTINGS_EN.header).slice(0, 22);
    const hCur = flat(settings.header).slice(0, 22);
    const f = flat(tStr);
    if ((hCur && f.startsWith(hCur)) || f.startsWith(hFa) || f.startsWith(hEn)) {
      for (const sep of [settings.separator, AIM.DEFAULT_SETTINGS.separator, AIM.DEFAULT_SETTINGS_EN.separator]) {
        const i = tStr.lastIndexOf(sep);
        if (i > -1) return tStr.slice(i + sep.length).trim();
      }
    }
    return tStr.trim();
  }

  function clickSend(el) {
    const sels = [
      '[data-testid="send-button"]',
      '#composer-submit-button',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[aria-label*="ارسال"]',
      'button.send-button',
      'fieldset button[type="button"]:last-of-type',
      'button[type="submit"]'
    ];
    const ok = (b) => b && visible(b) && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
    let scope = el.parentElement;
    for (let i = 0; i < 9 && scope; i++, scope = scope.parentElement) {
      for (const s of sels) {
        const b = [...scope.querySelectorAll(s)].find(ok);
        if (b) { b.click(); return; }
      }
    }
    el.focus();
    const o = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    ['keydown', 'keypress', 'keyup'].forEach((t) => el.dispatchEvent(new KeyboardEvent(t, o)));
  }

  async function doInsert(send) {
    const el = findInput();
    if (!el) { toast(tr('msgNoInput')); return; }
    const userPrompt = stripOldBlock(getText(el));

    const autoMode = settings.autoSelectMode || 'manual';
    if (autoMode !== 'manual' && userPrompt) {
      if (autoMode === 'cosine') {
        const ids = AIM.cosineSuggest(userPrompt, memories, categories, 7, 0.05);
        selected.clear();
        ids.forEach(id => selected.add(id));
        saveSelected(); render();
      } else if (autoMode === 'ai') {
        const items = memories.map((m, i) => ({ i, title: m.title, category: catById(m.categoryId)?.name || '' }));
        const r = await ai('suggest', { prompt: userPrompt, items });
        let ids = [];
        if (r && r.ok) ids = r.data.map(i => memories[i]?.id).filter(Boolean);
        else ids = AIM.cosineSuggest(userPrompt, memories, categories, 7, 0.05);
        selected.clear();
        ids.forEach(id => selected.add(id));
        saveSelected(); render();
      }
    }

    const mems = memories.filter((m) => selected.has(m.id));
    if (!mems.length) {
      toast(tr('msgSelectAtLeastOne'));
      return;
    }

    if (send && !userPrompt) { toast(tr('msgWritePromptFirst')); return; }
    const finalPrompt = AIM.buildPrompt(userPrompt, mems, categories, settings, customVariables);
    await setText(el, finalPrompt);
    if (send) {
      await sleep(450);
      clickSend(el);
      closePanel();
    } else {
      closePanel();
      toast(tr('msgInserted', { n: mems.length }));
    }
  }

  $('#insert').onclick = () => doInsert(false);
  $('#insertSend').onclick = () => doInsert(true);

  // ---------- Bulletproof Universal Slash Command Engine (/ or /mem) ----------
  let slashMatches = [], slashActiveIdx = 0, slashTargetEl = null, lastPolledText = '';

  function getTextUpToCaret(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
      return el.value.slice(0, pos);
    }
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0).cloneRange();
        range.selectNodeContents(el);
        range.setEnd(sel.anchorNode, sel.anchorOffset);
        const before = range.toString();
        if (before) return before;
      }
    } catch (e) {}
    return getText(el);
  }

  function parseSlashCommand(rawText, fullText = rawText) {
    // Strip zero-width spaces, directional marks, and trailing linebreaks injected by ProseMirror/Quill/Lexical
    const cleaned = String(rawText || '')
      .replace(/[\u200B-\u200F\uFEFF\u00A0]/g, ' ')
      .replace(/[\r\n]+$/g, '');

    // Match `/` or `／` at start or after whitespace, optionally followed by `mem `, `حافظه `, or query
    const m = cleaned.match(/(?:^|[\s\n])[/／](?:(?:mem|حافظه|m)\s+)?([^\s/／]*)$/i);
    if (!m) return null;

    const fullMatch = m[0];
    const leadWs = /^[\s\n]/.test(fullMatch) ? 1 : 0;
    const tokenStart = cleaned.length - fullMatch.length + leadWs;
    const afterCaret = String(fullText || '').slice(rawText.length);

    return {
      query: (m[1] || '').trim(),
      prefixText: cleaned.slice(0, tokenStart).trimEnd(),
      suffixText: afterCaret.replace(/^[\r\n]+/, '').trimStart()
    };
  }

  function showSlashPopup(el, slashQuery) {
    slashTargetEl = el;

    if (!memories.length) {
      // Even if user has 0 memories yet, show a helpful clickable empty state so they know `/` works!
      slashMatches = [];
      slashList.innerHTML = `
        <div class="slash-item active" data-action="open-panel">
          <div class="slash-t">${lang() === 'en' ? '➕ No memories yet — Click to create one!' : '➕ هنوز حافظه‌ای نداری — برای ساخت اولین حافظه کلیک کن'}</div>
          <div class="slash-s">${lang() === 'en' ? 'Or press Alt+M to open the Memory Panel' : 'یا کلید Alt+M را برای باز شدن پنل حافظه بزن'}</div>
        </div>
      `;
    } else {
      if (!slashQuery) {
        slashMatches = [...memories]
          .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : (b.updatedAt || 0) - (a.updatedAt || 0)))
          .slice(0, 8);
      } else {
        slashMatches = AIM.manualScoreMemories(slashQuery, memories, categories, { minScore: 0.015 })
          .slice(0, 8)
          .map(x => x.memory);
      }

      if (!slashMatches.length) {
        hideSlashPopup();
        return;
      }

      slashList.innerHTML = slashMatches.map((m, idx) => `
        <div class="slash-item ${idx === 0 ? 'active' : ''}" data-id="${esc(m.id)}">
          <div class="slash-t">${m.pinned ? '📌 ' : ''}${esc(m.title)}</div>
          <div class="slash-s">${esc(m.content)}</div>
        </div>
      `).join('');
    }

    slashActiveIdx = 0;
    const r = el.getBoundingClientRect();
    const leftPos = Math.min(Math.max(10, r.left), Math.max(10, innerWidth - 365));
    slashPopup.style.left = leftPos + 'px';
    if (r.top > 280) {
      slashPopup.style.bottom = (innerHeight - r.top + 8) + 'px';
      slashPopup.style.top = 'auto';
    } else {
      slashPopup.style.top = Math.min(innerHeight - 150, r.bottom + 8) + 'px';
      slashPopup.style.bottom = 'auto';
    }
    slashPopup.classList.add('open');
  }

  function hideSlashPopup() {
    slashPopup.classList.remove('open');
    slashMatches = [];
  }

  slashList.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const item = e.target.closest('.slash-item');
    if (!item) return;
    if (item.dataset.action === 'open-panel') {
      hideSlashPopup();
      openPanel();
      $('#addForm').classList.remove('hidden');
      setTimeout(() => $('#newTitle').focus(), 50);
      return;
    }
    if (item.dataset.id) insertFromSlash(item.dataset.id);
  });

  async function insertFromSlash(memId) {
    const el = slashTargetEl || findInput();
    hideSlashPopup();
    const mem = memories.find(m => m.id === memId);
    if (!mem || !el) return;

    const fullRaw = getText(el);
    const upToCaret = getTextUpToCaret(el);
    const parsed = parseSlashCommand(upToCaret, fullRaw) || parseSlashCommand(fullRaw, fullRaw);
    const remainingPrompt = parsed
      ? [parsed.prefixText, parsed.suffixText].filter(Boolean).join(' ').trim()
      : fullRaw.replace(/[/／][^\s]*\s*$/, '').trim();

    selected.add(mem.id);
    saveSelected();
    render();

    const resolvedTitle = AIM.resolveVariables(mem.title, customVariables);
    const resolvedContent = AIM.resolveVariables(mem.content, customVariables);
    const block = `### ${resolvedTitle}\n${resolvedContent}`;
    const textToInsert = remainingPrompt ? `${block}\n\n${remainingPrompt}` : `${block}\n`;
    await setText(el, textToInsert);
    lastPolledText = getText(el);
    toast(lang() === 'en' ? `Added "${mem.title}"` : `حافظه «${mem.title}» اضافه شد`);
  }

  function evaluateSlashForElement(ed) {
    if (!ed || !visible(ed)) return;
    lastEditable = ed;
    const fullText = getText(ed);
    const upToCaret = getTextUpToCaret(ed);
    const parsed = parseSlashCommand(upToCaret, fullText) || parseSlashCommand(fullText, fullText);
    if (parsed) {
      showSlashPopup(ed, parsed.query);
    } else if (slashPopup.classList.contains('open')) {
      hideSlashPopup();
    }
  }

  function checkSlashOnEvent(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (path.includes(host)) return;
    let ed = null;
    for (const n of path) {
      ed = resolveEditable(n);
      if (ed) break;
    }
    if (!ed) ed = findInput();
    if (!ed) return;
    // Schedule both immediate and micro-delayed check so ProseMirror/Quill DOM updates finish first
    evaluateSlashForElement(ed);
    setTimeout(() => evaluateSlashForElement(ed), 25);
  }

  // Listen on window in capture phase across beforeinput, input, keyup, and keydown
  window.addEventListener('beforeinput', checkSlashOnEvent, true);
  window.addEventListener('input', checkSlashOnEvent, true);
  window.addEventListener('keyup', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return;
    checkSlashOnEvent(e);
  }, true);

  // Active polling fallback (every 180ms) for editors that completely suppress DOM events inside custom Shadow DOMs
  setInterval(() => {
    const ed = resolveEditable(getDeepActiveElement()) || (lastEditable && document.hasFocus() ? lastEditable : null);
    if (!ed || !visible(ed)) return;
    const cur = getText(ed);
    if (cur !== lastPolledText) {
      lastPolledText = cur;
      evaluateSlashForElement(ed);
    }
  }, 180);

  window.addEventListener('keydown', (e) => {
    if (!slashPopup.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (slashMatches.length) {
        slashActiveIdx = (slashActiveIdx + 1) % slashMatches.length;
        updateSlashActive();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (slashMatches.length) {
        slashActiveIdx = (slashActiveIdx - 1 + slashMatches.length) % slashMatches.length;
        updateSlashActive();
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (slashMatches[slashActiveIdx]) {
        e.preventDefault();
        e.stopPropagation();
        insertFromSlash(slashMatches[slashActiveIdx].id);
      } else if (!memories.length) {
        e.preventDefault();
        e.stopPropagation();
        hideSlashPopup();
        openPanel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      hideSlashPopup();
    }
  }, true);

  window.addEventListener('mousedown', (e) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (!path.includes(host)) hideSlashPopup();
  }, true);

  function updateSlashActive() {
    slashList.querySelectorAll('.slash-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === slashActiveIdx);
      if (idx === slashActiveIdx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  loadData();
})();
