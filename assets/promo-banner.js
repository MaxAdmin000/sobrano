// H40: акционный баннер сверху страницы.
// Контент берётся из content.banner (CMS). Если active=false / expiresAt истёк /
// текст пуст / пользователь уже закрыл эту версию — баннер не рендерится.
// Версионирование через короткий hash от text+link, чтобы новый текст показался
// заново всем, даже тем, кто закрыл предыдущую версию.
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    // Ждём content.js (хотим прочитать window.__SOBRANO_CONTENT__).
    if (window.__SOBRANO_CONTENT__) tryMount();
    else document.addEventListener("sobrano:content-ready", tryMount, { once: true });
  });

  function tryMount() {
    const cms = window.__SOBRANO_CONTENT__ || {};
    const b = (cms.content && cms.content.banner) || cms.banner || null;
    if (!b || !b.active) return;
    const text = String(b.text || "").trim();
    if (!text) return;
    if (b.expiresAt) {
      const t = Date.parse(b.expiresAt);
      if (!isNaN(t) && t < Date.now()) return;
    }
    const version = hashStr(text + "|" + (b.link || ""));
    const dismissedKey = "sobrano_banner_dismissed_v1";
    let dismissed = null;
    try { dismissed = localStorage.getItem(dismissedKey); } catch (e) {}
    if (b.dismissible !== false && dismissed === version) return;

    mount(b, version, dismissedKey);
  }

  function mount(b, version, dismissedKey) {
    const bg = b.bg || "#5C1F25";
    const fg = b.fg || "#F2ECE3";
    if (document.getElementById("sob-promo-banner")) return;

    const style = document.createElement("style");
    style.textContent = `
      #sob-promo-banner {
        position:relative; z-index:55;
        background:${bg}; color:${fg};
        padding:10px 18px; padding-right:44px;
        font-family:'Inter',-apple-system,sans-serif;
        font-size:13px; line-height:1.3; letter-spacing:.005em;
        display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap;
        text-align:center;
        animation: sobPromoIn .3s ease-out;
      }
      @keyframes sobPromoIn { from { transform:translateY(-100%) } to { transform:translateY(0) } }
      #sob-promo-banner .sob-promo-text { font-weight:500 }
      #sob-promo-banner .sob-promo-cta {
        color:${fg}; text-decoration:underline; text-underline-offset:3px;
        font-weight:500; opacity:.85; transition:opacity .15s;
      }
      #sob-promo-banner .sob-promo-cta:hover { opacity:1 }
      #sob-promo-banner .sob-promo-close {
        position:absolute; right:10px; top:50%; transform:translateY(-50%);
        width:28px; height:28px; border-radius:50%;
        background:transparent; color:${fg}; opacity:.7;
        display:flex; align-items:center; justify-content:center;
        font-size:18px; line-height:1; cursor:pointer; border:0;
        transition:background .15s, opacity .15s;
      }
      #sob-promo-banner .sob-promo-close:hover { opacity:1; background:rgba(255,255,255,.12) }
    `;
    document.head.appendChild(style);

    const bar = document.createElement("div");
    bar.id = "sob-promo-banner";
    bar.setAttribute("role", "complementary");
    bar.setAttribute("aria-label", "Акция");

    const textSpan = document.createElement("span");
    textSpan.className = "sob-promo-text";
    textSpan.textContent = b.text;
    bar.appendChild(textSpan);

    if (b.link) {
      const a = document.createElement("a");
      a.className = "sob-promo-cta";
      a.href = b.link;
      a.textContent = b.linkLabel || "Перейти";
      if (/^https?:\/\//i.test(b.link)) { a.target = "_blank"; a.rel = "noopener"; }
      bar.appendChild(a);
    }

    if (b.dismissible !== false) {
      const close = document.createElement("button");
      close.className = "sob-promo-close";
      close.type = "button";
      close.setAttribute("aria-label", "Закрыть баннер");
      close.textContent = "×";
      close.addEventListener("click", () => {
        try { localStorage.setItem(dismissedKey, version); } catch (e) {}
        bar.style.transition = "opacity .2s, max-height .25s, padding .25s";
        bar.style.overflow = "hidden";
        bar.style.maxHeight = bar.offsetHeight + "px";
        // принудительный reflow перед animation-сменой
        bar.offsetHeight;
        bar.style.maxHeight = "0";
        bar.style.padding = "0 18px";
        bar.style.opacity = "0";
        setTimeout(() => bar.remove(), 260);
      });
      bar.appendChild(close);
    }

    // Вставляем самым первым ребёнком body — перед .top-bar / nav.
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Короткий нестойкий хеш (djb2). Используется только как version-маркер
  // dismissal'а — никакого security-смысла, просто чтоб «новый текст = новая версия».
  function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "v" + (h >>> 0).toString(36);
  }
})();
