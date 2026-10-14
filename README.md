# 🧠 LibMemory — Smart AI Long-Term Memory Extension

<p align="center">
  <b>Smart long-term memory bridge, dynamic variables, and slash commands for AI chatbots</b><br>
  <i>Smart, offline-first long-term memory bridge for ChatGPT, Claude, Gemini, DeepSeek, Grok, Qwen & Perplexity</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-8.1.0-indigo.svg" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-blue.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/theme-Glassmorphism-purple.svg" alt="Theme">
  <img src="https://img.shields.io/badge/offline-BM25%20%2B%20Cosine-success.svg" alt="Offline Engine">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
</p>

---

## 📌 About LibMemory
**LibMemory** is an open-source, powerful, and bilingual (Persian / English) extension for modern Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, etc.) that permanently solves the problem of chatbots forgetting.
Instead of repeating your coding preferences, expertise, business rules, or project specifications in every new chat window, LibMemory keeps your information structured and, at the moment you send a prompt, attaches the most relevant memories to your message automatically or manually.

---

## ✨ Key Features

### 1. 🔤 Custom Font Support
- The beautiful and standard default font **Vazirmatn** is included offline inside the extension package.
- Ability to **upload a custom font** (TTF, WOFF, WOFF2, OTF) directly from the settings section with live preview.
- Instantly applies the selected font to all parts of the admin panel and the floating widget inside chatbot websites.

### 2. ⚡ Smart “Manual Mode” (Offline Hybrid Ranking Engine)
- No internet required and no API tokens consumed, not even one!
- With a superior hybrid algorithm: **Okapi BM25 + TF-IDF cosine similarity + character N-gram + advanced stemming for Persian and English vocabulary**.
- As you type a prompt in chat, the most relevant memories are identified in a fraction of a second and prepared for insertion.

### 3. 🔄 Memory Updater with Editable Preview
- Two separate modes: **Manual Update** (no AI, with quick replacement of phrases and notes) and **AI-Powered Update**.
- **Live preview:** before saving changes, the user can directly edit the final title and text of each memory.

### 4. ⌨️ Quick Slash Command Inside Chat (`/lm` or `/memory`)
- No need to touch the mouse!
- In any AI chat box, type `/lm` or `/memory` and search for the memory title; navigate with `↑` and `↓` keys and press `Enter` to add the memory directly to your prompt.

### 5. 📄 Text (.txt) and JSON Backup
- **Categorized text export:** download all memories as a readable `.txt` file with a `# Category` and `## Memory` structure.
- **Text import:** directly import a text file or paste raw text.
- **Full JSON backup:** one-click backup and restore of all memories, categories, variables, and settings.

### 6. 🧩 Dynamic Variables
- Define variables such as `{{name}}`, `{{project}}`, or automatic system variables such as `{{date}}`, `{{time}}`, `{{url}}`, and `{{model}}`.

### 7. 🎨 7 Attractive Themes and Modern Glassmorphism Design
- Designed with modern glassmorphism standards, high contrast, and smooth animations.

---

## 🔒 Privacy & Security
- **Completely Local-First:** your memory data, categories, and variables are stored in your browser’s local storage (`chrome.storage.local`), and no data is sent to any external server.
- **Restricted permissions:** host permissions are strictly limited to supported chatbot sites and official AI API domains.
- **Manifest V3 and Chrome Web Store compliant:** no use of unsafe code (`eval()` or `new Function()`) or remote scripts.

---

## 🚀 Installation Guide
1. Download and extract the ZIP file.
2. Open your browser (Chrome, Edge, Brave, etc.) and go to `chrome://extensions`.
3. Enable **Developer mode** at the top of the page.
4. Click the **Load unpacked** button and select the extension folder.
5. The LibMemory icon will be activated in the browser toolbar, and the `LibMemory` button will be active on AI platforms.

---

## 📄 License
This project is released under the [MIT License](LICENSE).

---------------------------------------------------------------------------- 



# 🧠 LibMemory (لایب‌مموری) — Smart AI Long-Term Memory Extension

<p align="center">
  <b>پل هوشمند حافظه بلندمدت، متغیرهای پویا و اسلش‌کامند برای چت‌بات‌های هوش مصنوعی</b><br>
  <i>Smart, offline-first long-term memory bridge for ChatGPT, Claude, Gemini, DeepSeek, Grok, Qwen & Perplexity</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-8.1.0-indigo.svg" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-blue.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/theme-Glassmorphism-purple.svg" alt="Theme">
  <img src="https://img.shields.io/badge/offline-BM25%20%2B%20Cosine-success.svg" alt="Offline Engine">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
</p>

---

## 📌 درباره لایب‌مموری (About LibMemory)
**لایب‌مموری (LibMemory)** یک افزونه متن‌باز، قدرتمند و دوزبانه (فارسی / انگلیسی) برای مرورگرهای مدرن مبتنی بر Chromium (کروم، اج، بریو، ویوالدی و ...) است که مشکل فراموشی چت‌بات‌ها را برای همیشه حل می‌کند.
به جای اینکه در هر پنجره چت جدید، ترجیحات کدنویسی، تخصص‌ها، قوانین کسب‌وکار یا مشخصات پروژه‌تان را تکرار کنید، لایب‌مموری اطلاعات شما را به صورت ساختاریافته نگه می‌دارد و در لحظه ارسال پرامپت، مرتبط‌ترین حافظه‌ها را به صورت خودکار یا دستی به پیام شما الصاق می‌کند.

---

## ✨ ویژگی‌های کلیدی (Key Features)

### 1. 🔤 تایپوگرافی و فونت سفارشی (Custom Font Support)
- فونت پیش‌فرض بسیار چشم‌نواز و استاندارد **وزیرمتن (Vazirmatn)** به صورت آفلاین داخل پکیج افزونه قرار دارد.
- امکان **آپلود فونت دلخواه** (TTF, WOFF, WOFF2, OTF) مستقیماً از بخش تنظیمات با پیش‌نمایش زنده.
- اعمال آنی فونت انتخابی در تمامی بخش‌های پنل مدیریت و ویجت شناور داخل وب‌سایت‌های چت‌بات‌ها.

### 2. ⚡ «روش دستی» هوشمند (Offline Hybrid Ranking Engine)
- بدون نیاز به اینترنت و بدون مصرف حتی ۱ توکن API!
- با الگوریتم ترکیبی برتر: **Okapi BM25 + شباهت کسینوسی TF-IDF + ان‌گرام کاراکتری (N-gram) + ریشه‌یابی پیشرفته واژگان فارسی و انگلیسی**.
- با تایپ پرامپت در چت، مرتبط‌ترین حافظه‌ها در کسری از ثانیه تشخیص داده شده و آماده درج می‌شوند.

### 3. 🔄 به‌روزرسانی حافظه‌ها با پیش‌نمایش قابل ویرایش (Memory Updater)
- دو حالت مجزا: **به‌روزرسانی دستی** (بدون هوشواره با جایگزینی سریع عبارات و یادداشت‌ها) و **به‌روزرسانی با هوشواره**.
- **پیش‌نمایش زنده:** پیش از ثبت تغییرات، کاربر می‌تواند عنوان و متن نهایی هر حافظه را مستقیماً ویرایش کند.

### 4. ⌨️ اسلش‌کامند سریع داخل چت ( یا )
- بدون نیاز به دست زدن به موس!
- در کادر چت هر هوش مصنوعی بنویسید  یا  و عنوان حافظه را جستجو کنید؛ با کلیدهای  و  جابجا شوید و با  حافظه را مستقیماً به پرامپت بیافزایید.

### 5. 📄 پشتیبان‌گیری متنی (.txt) و JSON
- **خروجی متنی طبقه‌بندی‌شده:** دانلود تمام حافظه‌ها در قالب یک فایل خوانای  با ساختار  و .
- **ورودی متنی:** امکان ایمپورت مستقیم فایل متنی یا چسباندن متن خام.
- **بکاپ کامل JSON:** پشتیبان‌گیری و بازیابی با یک کلیک از تمام حافظه‌ها، دسته‌ها، متغیرها و تنظیمات.

### 6. 🧩 متغیرهای پویا (Dynamic Variables)
- تعریف متغیرهایی مانند ،  یا متغیرهای سیستمی خودکار مانند ، ،  و .

### 7. 🎨 ۷ تم جذاب و طراحی شیشه‌ای مدرن (Glassmorphism)
- طراحی شده با استانداردهای مدرن شیشه‌ای، کنتراست بالا و انیمیشن‌های نرم.

---

## 🔒 امنیت و حریم خصوصی (Privacy & Security)
- **کاملاً آفلاین‌محور (Local-First):** داده‌های حافظه، دسته‌ها و متغیرهای شما روی حافظه محلی مرورگر () ذخیره می‌شوند و هیچ دیتایی به هیچ سرور خارجی ارسال نمی‌شود.
- **محدودسازی دسترسی‌ها:** مجوزهای هاست دقیقا محدود به سایت‌های چت‌بات پشتیبانی‌شده و دامنه‌های رسمی API هوش مصنوعی است.
- **انطباق با قوانین Manifest V3 و وب استور کروم:** بدون استفاده از کدهای ناامن ( یا ) یا اسکریپت‌های ریموت.

---

## 🚀 راهنمای نصب در مرورگر (Installation)
1. فایل زیپ را دانلود و استخراج (Extract) کنید.
2. مرورگر خود (Chrome, Edge, Brave, ...) را باز کرده و به آدرس  بروید.
3. گزینه **Developer mode** را در بالای صفحه فعال کنید.
4. روی دکمه **Load unpacked** کلیک کرده و پوشه افزونه را انتخاب نمایید.
5. آیکون لایب‌مموری در نوار ابزار مرورگر و دکمه  در پلتفرم‌های هوش مصنوعی فعال خواهد شد.

---

## 📄 لایسنس (License)
این پروژه تحت مجوز [MIT License](LICENSE) منتشر شده است.
