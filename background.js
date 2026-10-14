importScripts('common.js');

function openManager(hash) {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') + (hash || '') });
}
chrome.action.onClicked.addListener(() => openManager());
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'togglePanel' }).catch(() => {});
});

// Quota bookkeeping (resets at midnight Pacific for Gemini free tier)
function ptParts() {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
}
const ptDate = () => { const p = ptParts(); return `${p.year}-${p.month}-${p.day}`; };
function msToPTMidnight() { const p = ptParts(); const sec = (+p.hour % 24) * 3600 + (+p.minute) * 60 + (+p.second); return (86400 - sec) * 1000 + 60000; }

async function getStatus() {
  const d = await chrome.storage.local.get(['aiConfig', 'aiUsage', 'aiCooldownUntil']);
  const raw = d.aiConfig || {};
  const provider = ['openai', 'claude'].includes(raw.provider) ? raw.provider : 'gemini';
  const pc = { ...AIM.DEFAULT_AI[provider], ...(raw[provider] || {}) };
  const cfg = {
    provider,
    apiKey: (pc.apiKey || '').trim(),
    model: (pc.model || '').trim(),
    baseUrl: (pc.baseUrl || '').trim().replace(/\/+$/, ''),
    dailyCap: raw.dailyCap ?? AIM.DEFAULT_AI.dailyCap
  };
  const today = ptDate();
  const used = d.aiUsage && d.aiUsage.date === today ? d.aiUsage.count : 0;
  const until = d.aiCooldownUntil && d.aiCooldownUntil > Date.now() ? d.aiCooldownUntil : null;
  return { cfg, provider, hasKey: !!cfg.apiKey, used, cap: +cfg.dailyCap || 0, until, today };
}

function extractJSON(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

async function rateLimited(retryAfterMs, details) {
  let wait = retryAfterMs || 60000;
  if (details && details.perDay) wait = Math.max(wait, msToPTMidnight());
  const until = Date.now() + Math.max(wait, 15000);
  await chrome.storage.local.set({ aiCooldownUntil: until });
  return { ok: false, code: 'limited', until };
}

async function callGemini(st, prompt) {
  const model = st.cfg.model || AIM.DEFAULT_AI.gemini.model;
  const generationConfig = { responseMimeType: 'application/json', temperature: 0.2 };
  if (/2\.5/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': st.cfg.apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig })
    });
  } catch (e) { return { ok: false, code: 'network' }; }
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || res.statusText || String(res.status);
    if (res.status === 429) {
      const details = (data && data.error && data.error.details) || [];
      const retry = details.find((x) => x.retryDelay);
      const perDay = /per.?day|daily/i.test(JSON.stringify(details) + msg);
      return rateLimited(retry ? parseFloat(retry.retryDelay) * 1000 : 0, { perDay });
    }
    if (res.status === 401 || res.status === 403 || /API key not valid/i.test(JSON.stringify(data || ''))) return { ok: false, code: 'badkey', message: msg };
    return { ok: false, code: 'error', message: msg };
  }
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  const j = extractJSON(text);
  return j ? { ok: true, data: j } : { ok: false, code: 'error', message: 'Invalid JSON response from Gemini' };
}

async function callClaude(st, prompt) {
  const model = st.cfg.model || AIM.DEFAULT_AI.claude.model;
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': st.cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.2,
        system: 'You output only valid JSON. No markdown fences, no explanatory text.',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });
  } catch (e) { return { ok: false, code: 'network' }; }
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const msg = (data && data.error && (data.error.message || JSON.stringify(data.error))) || res.statusText || String(res.status);
    if (res.status === 429) {
      const ra = parseFloat(res.headers.get('retry-after') || '');
      return rateLimited(isNaN(ra) ? 0 : ra * 1000, { perDay: /daily|quota/i.test(msg) });
    }
    if (res.status === 401 || res.status === 403) return { ok: false, code: 'badkey', message: msg };
    return { ok: false, code: 'error', message: msg };
  }
  const text = (data?.content || []).map((c) => c.text || '').join('');
  const j = extractJSON(text);
  return j ? { ok: true, data: j } : { ok: false, code: 'error', message: 'Invalid JSON response from Claude' };
}

async function callOpenAI(st, prompt) {
  const base = st.cfg.baseUrl || AIM.DEFAULT_AI.openai.baseUrl;
  const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + st.cfg.apiKey },
      body: JSON.stringify({
        model: st.cfg.model || AIM.DEFAULT_AI.openai.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You output only valid JSON. No markdown fences, no explanatory text.' },
          { role: 'user', content: prompt }
        ]
      })
    });
  } catch (e) { return { ok: false, code: 'network' }; }
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const msg = (data && data.error && (data.error.message || JSON.stringify(data.error))) || res.statusText || String(res.status);
    if (res.status === 429) {
      const ra = parseFloat(res.headers.get('retry-after') || '');
      return rateLimited(isNaN(ra) ? 0 : ra * 1000, { perDay: /per.?day|daily|quota|insufficient/i.test(msg) && !/minute/i.test(msg) });
    }
    if (res.status === 401 || res.status === 403) return { ok: false, code: 'badkey', message: msg };
    return { ok: false, code: 'error', message: msg };
  }
  const text = data?.choices?.[0]?.message?.content || '';
  const j = extractJSON(typeof text === 'string' ? text : JSON.stringify(text));
  return j ? { ok: true, data: j } : { ok: false, code: 'error', message: 'Invalid JSON response from OpenAI provider' };
}

async function callAI(prompt) {
  const st = await getStatus();
  if (!st.hasKey) return { ok: false, code: 'nokey' };
  if (st.cfg.provider === 'openai' && !st.cfg.baseUrl) return { ok: false, code: 'error', message: 'API Base URL is empty' };
  if (st.until) return { ok: false, code: 'limited', until: st.until };
  if (st.cap && st.used >= st.cap) return { ok: false, code: 'cap', used: st.used, cap: st.cap };
  await chrome.storage.local.set({ aiUsage: { date: st.today, count: st.used + 1 } });
  if (st.cfg.provider === 'openai') return callOpenAI(st, prompt);
  if (st.cfg.provider === 'claude') return callClaude(st, prompt);
  return callGemini(st, prompt);
}

const LANG = 'Write titles and content in the same language as the source text (Persian/Farsi or English).';

async function aiCreate({ text, categories }) {
  const src = String(text || '').slice(0, 30000);
  const prompt = `You are a personal long-term memory curator. From the SOURCE below, extract only durable facts/preferences/knowledge worth remembering about the user or their work. Drop greetings, conversational filler, repetition.
Return 1 memory normally. Return up to 5 ONLY if the source clearly covers distinct topics.
Each memory: "title" (short, specific, max 8 words), "content" (concise, clear; bullet points if needed), "category" (pick an EXISTING category name exactly if one fits; otherwise invent a short new category name, 1-3 words).
${LANG}
EXISTING CATEGORIES: ${JSON.stringify(categories || [])}
Respond ONLY with JSON: {"memories":[{"title":"","content":"","category":""}]}
SOURCE:
"""
${src}
"""`;
  const r = await callAI(prompt);
  if (!r.ok) return r;
  const list = (r.data.memories || []).filter((m) => m && m.title && m.content).slice(0, 5)
    .map((m) => ({ title: String(m.title).trim(), content: String(m.content).trim(), category: String(m.category || '').trim() }));
  return list.length ? { ok: true, data: list } : { ok: false, code: 'error', message: 'Nothing extracted' };
}

async function aiCategorize({ items, categories }) {
  const prompt = `Assign each memory item to a category. Prefer EXISTING categories (use the exact name). Create a new short category (1-3 words) only when nothing fits; reuse your new names consistently. Keep categories few and clean.
${LANG}
EXISTING CATEGORIES: ${JSON.stringify(categories || [])}
ITEMS: ${JSON.stringify(items)}
Respond ONLY with JSON: {"assignments":[{"i":0,"category":""}]}`;
  const r = await callAI(prompt);
  if (!r.ok) return r;
  return { ok: true, data: (r.data.assignments || []).filter((a) => a && Number.isInteger(+a.i) && a.category) };
}

async function aiSummarize({ title, content }) {
  const prompt = `Rewrite this memory to be shorter and denser WITHOUT losing any durable fact, number, rule or preference. Remove redundancy.
${LANG}
Respond ONLY with JSON: {"title":"","content":""}
TITLE: ${title}
CONTENT:
"""
${String(content).slice(0, 30000)}
"""`;
  const r = await callAI(prompt);
  if (!r.ok) return r;
  return r.data.content ? { ok: true, data: { title: String(r.data.title || title), content: String(r.data.content) } } : { ok: false, code: 'error', message: 'Empty output' };
}

async function aiSuggest({ prompt, items }) {
  const p = `The user is about to send the PROMPT below to an AI chatbot. From the memory list (titles + categories only), pick the memories whose content would genuinely help answer it. Pick few (0-8).
PROMPT: """${String(prompt).slice(0, 4000)}"""
MEMORIES: ${JSON.stringify(items.slice(0, 500))}
Respond ONLY with JSON: {"ids":[0,1]}`;
  const r = await callAI(p);
  if (!r.ok) return r;
  return { ok: true, data: (r.data.ids || []).map(Number).filter(Number.isInteger) };
}

// AI Memory Reviewer / Updater
async function aiReviewUpdates({ instruction, memories, categories }) {
  const sample = (memories || []).slice(0, 80).map((m) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    category: m.categoryId
  }));
  const prompt = `You are an intelligent memory maintainer. The user is reporting updates or changes to their life, projects, tools, or preferences.
Your task: Analyze the USER REPORT and figure out which existing memories need updates or revisions to stay fresh and accurate.
Only modify memories that are directly impacted by the report. Do NOT touch unrelated memories.
For each updated memory, provide:
- "id": exact memory id
- "oldTitle": current title
- "newTitle": updated title (or keep same)
- "oldContent": current content
- "newContent": revised content reflecting the new information accurately
- "reason": short explanation in the user's language explaining why this was updated

USER REPORT:
"""
${String(instruction).slice(0, 8000)}
"""

EXISTING MEMORIES:
${JSON.stringify(sample)}

${LANG}
Respond ONLY with JSON in this format:
{"updates":[{"id":"","oldTitle":"","newTitle":"","oldContent":"","newContent":"","reason":""}]}`;

  const r = await callAI(prompt);
  if (!r.ok) return r;
  const updates = (r.data.updates || []).filter(u => u && u.id && u.newContent);
  return { ok: true, data: updates };
}

async function testConnection(payload) {
  const provider = ['openai', 'claude'].includes(payload.provider) ? payload.provider : 'gemini';
  const key = String(payload.apiKey || '').trim();
  if (!key) return { ok: false, code: 'nokey' };
  try {
    let res;
    if (provider === 'gemini') {
      res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
    } else if (provider === 'claude') {
      res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      });
    } else {
      const base = String(payload.baseUrl || AIM.DEFAULT_AI.openai.baseUrl).trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
      res = await fetch(base + '/models', { headers: { Authorization: 'Bearer ' + key } });
    }
    if (res.ok) return { ok: true };
    return { ok: false, code: res.status === 401 || res.status === 403 || res.status === 400 ? 'badkey' : 'error', message: String(res.status) };
  } catch (e) { return { ok: false, code: 'network' }; }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'openManager') { openManager(msg.hash); return; }
  if (msg.type !== 'ai') return;
  const fn = {
    create: aiCreate,
    categorize: aiCategorize,
    summarize: aiSummarize,
    suggest: aiSuggest,
    reviewUpdates: aiReviewUpdates,
    status: getStatus,
    test: () => testConnection(msg.payload || {}),
    resetCooldown: async () => { await chrome.storage.local.remove('aiCooldownUntil'); return { ok: true }; }
  }[msg.action];
  if (!fn) return;
  Promise.resolve(fn(msg.payload || {}))
    .then((r) => {
      if (msg.action === 'status') { const { cfg, ...rest } = r; sendResponse(rest); }
      else sendResponse(r);
    })
    .catch((e) => sendResponse({ ok: false, code: 'error', message: String((e && e.message) || e) }));
  return true;
});
