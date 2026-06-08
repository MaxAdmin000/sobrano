// Mobile menu — самодостаточный модуль для адаптивной шапки.
// Активируется на любой странице с `.nav-links` в шапке. Делает:
//   1. Инжектит CSS-правила для responsive (≤960px скрывает nav-links, показывает burger;
//      ≤680px ужимает nav-cta — прячет btn-primary, сокращает cart-pill).
//   2. Гарантирует наличие <button class="burger"> в шапке (если её нет — добавляет).
//   3. Привязывает обработчик: клик по burger → full-screen overlay с:
//      • большим списком ссылок (читает из существующей .nav-links)
//      • cart-pill (синхронизирован с SOBRANO_CART)
//      • каналами связи (из /api/channels или SOBRANO_CONFIG)
//   4. Слайд-ин справа, закрытие по ×/click outside/Esc.
//
// Скрыто на cart-flow страницах? Нет — там тоже бывает .nav-links (cart.html),
// и пользователь должен иметь возможность из mobile вернуться куда угодно.

(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    const nav = document.querySelector(".nav-links");
    if (!nav) return; // страница без шапки (checkout/thank-you/404 — у них свой layout)

    injectStyles();
    const burger = ensureBurger();
    if (!burger) return;

    let overlay = null;

    burger.addEventListener("click", (e) => {
      e.preventDefault();
      if (overlay && overlay.classList.contains("open")) closeMenu();
      else openMenu();
    });

    function openMenu() {
      if (!overlay) overlay = buildOverlay();
      document.body.appendChild(overlay);
      // принудительный reflow перед добавлением .open для анимации
      void overlay.offsetHeight;
      overlay.classList.add("open");
      burger.classList.add("active");
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onEsc);
    }
    function closeMenu() {
      if (!overlay) return;
      overlay.classList.remove("open");
      burger.classList.remove("active");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
      // удалить после анимации
      setTimeout(() => { if (overlay && !overlay.classList.contains("open")) overlay.remove(); }, 350);
    }
    function onEsc(e) { if (e.key === "Escape") closeMenu(); }

    function buildOverlay() {
      const o = document.createElement("div");
      o.className = "sob-mobile-menu";
      // Заголовок с крестиком
      const head = document.createElement("div");
      head.className = "sob-mm-head";
      head.innerHTML =
        '<a href="index.html" class="sob-mm-brand"><span class="sob-mm-mark"></span> Собрано</a>' +
        '<button type="button" class="sob-mm-close" aria-label="Закрыть меню">×</button>';
      head.querySelector(".sob-mm-close").addEventListener("click", closeMenu);
      o.appendChild(head);

      // Ссылки — копируем из текущей .nav-links на странице
      const list = document.createElement("nav");
      list.className = "sob-mm-list";
      Array.from(nav.querySelectorAll("a")).forEach((a) => {
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = (a.textContent || "").trim();
        link.addEventListener("click", () => closeMenu());
        list.appendChild(link);
      });
      o.appendChild(list);

      // Cart-pill — если в корзине есть товары
      const cartWrap = document.createElement("div");
      cartWrap.className = "sob-mm-cart";
      cartWrap.style.display = "none";
      const cartLink = document.createElement("a");
      cartLink.href = "cart.html";
      cartLink.className = "sob-mm-cart-link";
      cartLink.innerHTML = '<span class="sob-mm-cart-dot"></span><span class="sob-mm-cart-label">Корзина</span><span class="sob-mm-cart-meta">—</span>';
      cartWrap.appendChild(cartLink);
      o.appendChild(cartWrap);
      refreshCart(cartWrap);
      const Cart = window.SOBRANO_CART;
      if (Cart && typeof Cart.subscribe === "function") {
        Cart.subscribe(() => refreshCart(cartWrap));
      }

      // Каналы связи
      const channels = buildChannels();
      if (channels) o.appendChild(channels);

      // Клик по фону вне панели — закрыть
      o.addEventListener("click", (e) => { if (e.target === o) closeMenu(); });

      return o;
    }

    function refreshCart(wrap) {
      const Cart = window.SOBRANO_CART;
      if (!Cart) return;
      const n = typeof Cart.getItemCount === "function" ? Cart.getItemCount() : 0;
      if (n <= 0) { wrap.style.display = "none"; return; }
      wrap.style.display = "block";
      const meta = wrap.querySelector(".sob-mm-cart-meta");
      const total = typeof Cart.getTotal === "function" ? Cart.getTotal() : 0;
      const fmt = typeof Cart.formatPrice === "function" ? Cart.formatPrice(total) : (total + " ₽");
      meta.textContent = n + " · " + fmt;
    }

    function buildChannels() {
      const cfg = window.SOBRANO_CONFIG || {};
      const c = cfg.contacts || {};
      const items = [];
      if (c.telegram) items.push({ label: "Telegram",  href: c.telegram, target: "_blank", rel: "noopener" });
      if (c.whatsapp) items.push({ label: "WhatsApp",  href: c.whatsapp, target: "_blank", rel: "noopener" });
      if (c.phone)    items.push({ label: c.phone,     href: "tel:" + String(c.phone).replace(/[^+\d]/g, "") });
      if (c.email)    items.push({ label: c.email,     href: "mailto:" + c.email });
      if (!items.length) return null;
      const wrap = document.createElement("div");
      wrap.className = "sob-mm-channels";
      const title = document.createElement("div");
      title.className = "sob-mm-channels-title";
      title.textContent = "Связаться";
      wrap.appendChild(title);
      items.forEach((it) => {
        const a = document.createElement("a");
        a.href = it.href;
        if (it.target) a.target = it.target;
        if (it.rel) a.rel = it.rel;
        a.textContent = it.label;
        wrap.appendChild(a);
      });
      return wrap;
    }
  });

  function ensureBurger() {
    let burger = document.querySelector("header.nav .burger");
    if (burger) return burger;
    // Не нашли — добавим. Точка вставки: .nav-cta если есть, иначе сразу в .nav-inner.
    const navInner = document.querySelector("header.nav .nav-inner");
    if (!navInner) return null;
    burger = document.createElement("button");
    burger.className = "burger";
    burger.setAttribute("aria-label", "Меню");
    burger.setAttribute("type", "button");
    burger.innerHTML = '<span></span>';
    const cta = navInner.querySelector(".nav-cta");
    if (cta) cta.appendChild(burger);
    else navInner.appendChild(burger);
    return burger;
  }

  function injectStyles() {
    if (document.getElementById("sob-mobile-menu-style")) return;
    const css = `
      /* === Адаптив существующей шапки === */
      /* На ноутбук-узком (≤1100) — компактнее gap, чтобы 7 ссылок не вылезали. */
      @media (max-width:1100px) {
        header.nav .nav-links { gap: 18px }
        header.nav .nav-links a { font-size: 13px }
      }
      /* На планшете/малом ноуте (≤960) — прячем все ссылки, показываем burger.
         До этого breakpoint nav-cta остаётся как было. */
      @media (max-width:960px) {
        header.nav .nav-links { display: none !important }
        header.nav .burger { display: flex !important }
      }
      /* На мобильных (≤680) — сжимаем nav-cta: убираем CTA-кнопку (она дублируется
         в hero), оставляем компактный cart-pill (без суммы — только индикатор). */
      @media (max-width:680px) {
        header.nav .nav-cta .btn-primary { display: none }
        header.nav .nav-cta .cart-pill { padding: 8px 12px; font-size: 12px }
        header.nav .nav-cta .cart-pill strong { display: inline }
        header.nav .nav-inner { height: 64px }
        /* «.studio» рядом с брендом — на мобайле слишком тесно, прячем */
        header.nav .brand > span[style*="margin-left"] { display: none }
      }
      /* На самых узких (≤400) — бренд только маркер, без слова «Собрано».
         Высвобождает место для cart-pill + burger. */
      @media (max-width:400px) {
        header.nav .brand { font-size: 0 }
        header.nav .brand .brand-mark { font-size: initial }
      }

      /* === Burger === */
      /* Базовое состояние — не показываем (desktop). Показывается через media @960. */
      header.nav .burger {
        display: none;
        width: 40px; height: 40px; border-radius: 50%;
        border: 1px solid var(--line-strong, rgba(26,20,16,.28));
        align-items: center; justify-content: center;
        background: transparent; cursor: pointer; padding: 0; flex: none;
        transition: background .15s, border-color .15s;
      }
      header.nav .burger:hover { background: rgba(0,0,0,.04) }
      header.nav .burger.active { background: var(--ink, #1A1410); border-color: var(--ink, #1A1410) }
      header.nav .burger span,
      header.nav .burger span::before,
      header.nav .burger span::after {
        content: ""; display: block;
        width: 18px; height: 1.5px; background: var(--ink, #1A1410);
        position: relative;
        transition: transform .25s ease, background .15s;
      }
      header.nav .burger span::before { content: ""; position: absolute; left: 0; top: -5px }
      header.nav .burger span::after  { content: ""; position: absolute; left: 0; top:  5px }
      header.nav .burger.active span { background: transparent }
      header.nav .burger.active span::before { background: var(--ivory, #F2ECE3); transform: translateY(5px) rotate(45deg) }
      header.nav .burger.active span::after  { background: var(--ivory, #F2ECE3); transform: translateY(-5px) rotate(-45deg) }

      /* === Overlay меню === */
      .sob-mobile-menu {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(26,20,16,.55);
        backdrop-filter: blur(6px);
        opacity: 0;
        transition: opacity .25s ease;
      }
      .sob-mobile-menu.open { opacity: 1 }

      /* Панель справа — slide-in */
      .sob-mobile-menu::before {
        content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: min(380px, 92vw);
        background: var(--ivory, #F2ECE3);
        transform: translateX(100%);
        transition: transform .32s cubic-bezier(.2,.8,.2,1);
        box-shadow: -20px 0 60px rgba(26,20,16,.25);
      }
      .sob-mobile-menu.open::before { transform: translateX(0) }

      .sob-mm-head, .sob-mm-list, .sob-mm-cart, .sob-mm-channels {
        position: relative; z-index: 1;
        margin-left: auto; width: min(380px, 92vw);
        padding: 0 28px; box-sizing: border-box;
        opacity: 0; transform: translateY(8px);
        transition: opacity .25s ease, transform .3s cubic-bezier(.2,.8,.2,1);
      }
      .sob-mobile-menu.open .sob-mm-head     { opacity: 1; transform: translateY(0); transition-delay: .08s }
      .sob-mobile-menu.open .sob-mm-list     { opacity: 1; transform: translateY(0); transition-delay: .14s }
      .sob-mobile-menu.open .sob-mm-cart     { opacity: 1; transform: translateY(0); transition-delay: .20s }
      .sob-mobile-menu.open .sob-mm-channels { opacity: 1; transform: translateY(0); transition-delay: .26s }

      .sob-mm-head {
        display: flex; align-items: center; justify-content: space-between;
        height: 72px; border-bottom: 1px solid var(--line, rgba(26,20,16,.14));
        margin-bottom: 8px; padding-top: 0;
      }
      .sob-mm-brand {
        font-family: var(--serif, 'Fraunces', Georgia, serif);
        font-weight: 500; font-size: 20px; color: var(--ink, #1A1410);
        text-decoration: none;
        display: inline-flex; align-items: center; gap: 12px;
      }
      .sob-mm-mark {
        width: 28px; height: 28px; border-radius: 50%; background: var(--wine, #5C1F25);
        position: relative; display: inline-block; flex: none;
      }
      .sob-mm-mark::after {
        content: ""; position: absolute; inset: 6px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, var(--terracotta, #C97B5C), var(--wine, #5C1F25) 70%);
      }
      .sob-mm-close {
        width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent;
        font-size: 28px; line-height: 1; cursor: pointer; color: var(--ink, #1A1410);
        display: flex; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .sob-mm-close:hover { background: rgba(26,20,16,.06) }

      .sob-mm-list {
        display: flex; flex-direction: column;
        padding-top: 18px; padding-bottom: 8px;
      }
      .sob-mm-list a {
        font-family: var(--serif, 'Fraunces', Georgia, serif);
        font-weight: 400; font-size: 22px; letter-spacing: -.005em;
        color: var(--ink, #1A1410); text-decoration: none;
        padding: 14px 0; border-bottom: 1px solid var(--line, rgba(26,20,16,.10));
        transition: color .15s, padding-left .2s;
      }
      .sob-mm-list a:hover { color: var(--wine, #5C1F25); padding-left: 6px }
      .sob-mm-list a:last-child { border-bottom: 0 }

      .sob-mm-cart {
        padding-top: 14px; padding-bottom: 14px;
        border-top: 1px solid var(--line, rgba(26,20,16,.10));
        margin-top: 4px;
      }
      .sob-mm-cart-link {
        display: flex; align-items: center; gap: 12px;
        background: var(--ink, #1A1410); color: var(--ivory, #F2ECE3);
        padding: 14px 18px; border-radius: 999px;
        font-family: 'Inter', -apple-system, sans-serif;
        text-decoration: none;
        transition: background .15s;
      }
      .sob-mm-cart-link:hover { background: var(--wine, #5C1F25) }
      .sob-mm-cart-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--terracotta, #C97B5C); flex: none;
      }
      .sob-mm-cart-label {
        font-family: 'JetBrains Mono', 'SF Mono', monospace;
        font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
        opacity: .7; margin-right: 6px;
      }
      .sob-mm-cart-meta { font-weight: 600; font-size: 14px; letter-spacing: -.005em }

      .sob-mm-channels {
        padding-top: 18px; padding-bottom: 32px;
        border-top: 1px solid var(--line, rgba(26,20,16,.10));
        display: flex; flex-direction: column; gap: 4px;
      }
      .sob-mm-channels-title {
        font-family: 'JetBrains Mono', 'SF Mono', monospace;
        font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
        color: var(--mute, #7A6B5E); margin-bottom: 8px;
      }
      .sob-mm-channels a {
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 14px; color: var(--ink-soft, #3A2D24);
        text-decoration: none; padding: 10px 0;
        transition: color .15s;
      }
      .sob-mm-channels a:hover { color: var(--wine, #5C1F25) }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = "sob-mobile-menu-style";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
})();
