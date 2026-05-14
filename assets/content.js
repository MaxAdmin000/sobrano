// СОБРАНО · фронтовый CMS-хидратор. Грузит /api/content и подставляет тексты, картинки, ссылки
// в элементы с data-cms-* атрибутами. Также рендерит FAQ-блок и markdown юр.доков.
//
// Поддерживаемые атрибуты:
//   data-cms-text="path.to.value"           — заменяет innerText
//   data-cms-html="path.to.value"           — заменяет innerHTML (для rich-text)
//   data-cms-attr-<name>="path"             — ставит атрибут (data-cms-attr-href, ...-src, ...-alt)
//   data-cms-list="path.to.array"           — клонирует первого ребёнка для каждого элемента массива
//     внутри клонов работают:
//       data-cms-text="@key"                — относительно элемента массива
//       data-cms-html="@key"
//       data-cms-attr-X="@key"
//       data-cms-loop-class-X="@boolKey"    — добавляет класс X если значение truthy
//   data-cms-faq="page-key"                 — рендерит FAQ-аккордеон для указанной страницы
//   data-cms-markdown="legalKey"            — асинхронно грузит /api/legal/:key и рендерит как md→html
//
// Кэш в localStorage (key: sobrano_content_cache_v1) — оффлайн-фоллбэк.

(function () {
  const STORAGE_KEY = "sobrano_content_cache_v1";
  const API_URL = "/api/content";

  function get(obj, path, fallback) {
    if (!obj || !path) return fallback;
    const parts = String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur == null ? fallback : cur;
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
  }

  // ---------- public helper ----------

  async function loadContent() {
    let data = null;
    try {
      const res = await fetch(API_URL, { credentials: "same-origin", cache: "no-cache" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok) {
          data = json;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
        }
      }
    } catch (e) { /* ignored */ }
    if (!data) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) data = JSON.parse(raw).data;
      } catch (e) {}
    }
    return data || { content: {}, requisites: {}, contacts: {} };
  }

  // ---------- hydrate ----------

  function hydrate(scope, ctx) {
    // Универсальный helper: применяет cms-аттрибуты к самому scope + его потомкам.
    // Раньше querySelectorAll пропускал корневой элемент клона, из-за чего, например,
    // `<span class="pill" data-cms-text="@">` получал только текст шаблона.
    function applyTo(el) {
      // text
      if (el.hasAttribute && el.hasAttribute("data-cms-text")) {
        const val = resolvePath(el.getAttribute("data-cms-text"), ctx);
        if (val != null && val !== "") el.textContent = val;
      }
      // html
      if (el.hasAttribute && el.hasAttribute("data-cms-html")) {
        const val = resolvePath(el.getAttribute("data-cms-html"), ctx);
        if (val != null && val !== "") el.innerHTML = val;
      }
      // attrs
      if (el.attributes) {
        for (const at of Array.from(el.attributes)) {
          if (at.name.startsWith("data-cms-attr-")) {
            const target = at.name.slice("data-cms-attr-".length);
            const val = resolvePath(at.value, ctx);
            if (val != null && val !== "") el.setAttribute(target, val);
          }
          if (at.name.startsWith("data-cms-loop-class-")) {
            const cls = at.name.slice("data-cms-loop-class-".length);
            const val = resolvePath(at.value, ctx);
            if (val) el.classList.add(cls);
          }
        }
      }
    }
    // Обрабатываем сам scope, если это Element (а не Document)
    if (scope && scope.nodeType === 1) applyTo(scope);
    // И всех потомков
    if (scope && scope.querySelectorAll) {
      scope.querySelectorAll("[data-cms-text],[data-cms-html],*").forEach((el) => {
        // Чтобы зря не дёргать все элементы, пропускаем те, у кого нет cms-аттрибутов
        let hasCms = false;
        if (el.attributes) {
          for (const at of el.attributes) {
            if (at.name === "data-cms-text" || at.name === "data-cms-html" || at.name.startsWith("data-cms-attr-") || at.name.startsWith("data-cms-loop-class-")) {
              hasCms = true; break;
            }
          }
        }
        if (hasCms) applyTo(el);
      });
    }

    // lists
    scope.querySelectorAll("[data-cms-list]").forEach((listEl) => {
      const path = listEl.getAttribute("data-cms-list");
      const items = resolvePath(path, ctx);
      if (!Array.isArray(items)) return;
      const template = listEl.firstElementChild;
      if (!template) return;
      // отметим шаблон, чтобы повторный hydrate его не задвоил
      if (listEl.dataset.cmsRendered === "1") return;
      listEl.dataset.cmsRendered = "1";

      const frag = document.createDocumentFragment();
      items.forEach((item, idx) => {
        if (item && typeof item === "object" && item.hidden) return;
        const clone = template.cloneNode(true);
        hydrate(clone, item); // в контексте элемента массива
        clone.removeAttribute("data-cms-list");
        clone.removeAttribute("data-cms-rendered");
        clone.dataset.cmsIndex = String(idx);
        // Клон уже не отслеживается IntersectionObserver, который инициализировался
        // до hydrate'а. Чтобы reveal-анимация не оставила его невидимым,
        // выставляем класс `visible` сразу — это совпадает с конечным состоянием анимации.
        if (clone.classList && clone.classList.contains("reveal")) {
          clone.classList.add("visible");
        }
        // То же делаем для вложенных .reveal внутри клона.
        if (clone.querySelectorAll) {
          clone.querySelectorAll(".reveal").forEach((r) => r.classList.add("visible"));
        }
        frag.appendChild(clone);
      });
      listEl.innerHTML = "";
      listEl.appendChild(frag);
    });

    // faq
    scope.querySelectorAll("[data-cms-faq]").forEach((el) => {
      const page = el.getAttribute("data-cms-faq");
      const faq = (window.__SOBRANO_CONTENT__ && window.__SOBRANO_CONTENT__.content && window.__SOBRANO_CONTENT__.content.faq) || [];
      const items = faq
        .filter((x) => !x.hidden && (Array.isArray(x.pages) ? x.pages.indexOf(page) >= 0 : true))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      if (!items.length) { el.style.display = "none"; return; }
      // Сохраняем существующую структуру списка FAQ или собираем дефолтную
      el.innerHTML = items.map((it, idx) =>
        '<div class="faq-item' + (idx === 0 ? ' open' : '') + '">' +
          '<div class="faq-q" role="button" aria-expanded="' + (idx === 0 ? 'true' : 'false') + '">' + escHtml(it.q) + '<span class="plus">+</span></div>' +
          '<div class="faq-a">' + escHtml(it.a).replace(/\n/g, '<br>') + '</div>' +
        '</div>'
      ).join("");
      // Аккордеон
      el.querySelectorAll(".faq-q").forEach((q) => q.addEventListener("click", () => {
        const item = q.closest(".faq-item");
        item.classList.toggle("open");
        q.setAttribute("aria-expanded", item.classList.contains("open") ? "true" : "false");
      }));
    });
  }

  function resolvePath(path, ctx) {
    if (!path) return null;
    if (path.charAt(0) === "@") {
      // относительно текущего контекста (внутри цикла)
      if (typeof ctx !== "object") return ctx; // примитив
      return get(ctx, path.slice(1));
    }
    return get(window.__SOBRANO_CONTENT__, path);
  }

  // ---------- markdown rendering ----------

  function mdToHtml(md) {
    const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[ch]));
    const lines = (md || "").split(/\r?\n/);
    const out = [];
    let inList = false;
    function flushList() { if (inList) { out.push("</ul>"); inList = false; } }
    for (let raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { flushList(); continue; }
      if (/^---+\s*$/.test(line)) { flushList(); out.push('<hr>'); continue; }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushList(); out.push('<h' + h[1].length + '>' + inline(esc(h[2])) + '</h' + h[1].length + '>'); continue; }
      const li = line.match(/^[-*]\s+(.*)$/);
      if (li) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(esc(li[1])) + '</li>'); continue; }
      flushList();
      out.push('<p>' + inline(esc(line)) + '</p>');
    }
    flushList();
    return out.join("\n");
    function inline(s) {
      return s
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    }
  }

  async function hydrateMarkdownDocs() {
    const targets = document.querySelectorAll("[data-cms-markdown]");
    if (!targets.length) return;
    await Promise.all(Array.from(targets).map(async (el) => {
      const key = el.getAttribute("data-cms-markdown");
      try {
        const res = await fetch("/api/legal/" + encodeURIComponent(key), { cache: "no-cache" });
        const data = await res.json();
        if (data && data.ok && data.doc && (data.doc.version || 0) > 0) {
          el.innerHTML = mdToHtml(data.doc.md);
          // ставим версию в скрытый dataset для отладки
          el.dataset.cmsVersion = data.doc.version;
        }
      } catch (e) { /* leave fallback HTML */ }
    }));
  }

  // ---------- boot ----------

  async function boot() {
    const data = await loadContent();
    window.__SOBRANO_CONTENT__ = data;
    // Сначала текст/атрибуты на самом документе, потом списки (которые используют свежий контент)
    try { hydrate(document, null); } catch (e) { console.warn("CMS hydrate error:", e); }
    try { await hydrateMarkdownDocs(); } catch (e) { console.warn("CMS md error:", e); }
    document.dispatchEvent(new CustomEvent("sobrano:content-ready", { detail: data }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.SOBRANO_CMS = { reload: boot, get: (p) => get(window.__SOBRANO_CONTENT__, p) };
})();
