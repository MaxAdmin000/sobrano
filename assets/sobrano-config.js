// СОБРАНО — клиентская конфигурация.
// Дефолты ниже, потом подгружаются актуальные настройки с /api/settings.
// Кэш сохраняется в localStorage, чтобы между запросами поп-ап не моргал.

(function () {
  const KEY = "sobrano_settings_cache_v1";

  const DEFAULTS = {
    workingHours: { start: 9, end: 22, days: [0, 1, 2, 3, 4, 5, 6] },
    offline: { active: false, title: "временно недоступен", message: "Идут технические работы. Заказы временно не принимаются. Мы скоро вернёмся — спасибо за терпение.", eta: null, returnAt: null },
    contacts: { telegram: "https://t.me/sobrano", whatsapp: "https://wa.me/78000000000", phone: "+7 800 000-00-00", email: "hello@sobrano.store" },
    force: { offline: false, outOfHours: false, workingHours: false },
  };

  let cached = DEFAULTS;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") cached = Object.assign({}, DEFAULTS, saved);
  } catch (e) { /* ignore */ }

  window.SOBRANO_CONFIG = cached;

  // Подгружаем свежие настройки в фоне. Когда придут — обновляем localStorage и
  // вызываем SOBRANO.refresh() (если popups.js уже подключён), чтобы переоценить режимы.
  fetch("/api/settings", { credentials: "same-origin" })
    .then((r) => r.ok ? r.json() : null)
    .then((d) => {
      if (!d || !d.ok || !d.settings) return;
      const merged = Object.assign({}, DEFAULTS, d.settings, { force: cached.force });
      window.SOBRANO_CONFIG = merged;
      try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) {}
      if (window.SOBRANO && window.SOBRANO.refresh) window.SOBRANO.refresh();
    })
    .catch(() => { /* offline / no backend — используем дефолты */ });

  // ---------- FUNNEL TRACKING (G37) ----------
  // Раз в сессию (sid в localStorage) отправляем событие шага воронки на /api/track.
  // Типы событий определяются по path:
  //   /box.html       → view-box
  //   /cart.html      → view-cart
  //   /checkout.html  → view-checkout
  //   /thank-you.html → view-thanks
  const SID_KEY = "sobrano_sid_v1";
  function sid() {
    try {
      let s = localStorage.getItem(SID_KEY);
      if (!s) {
        // короткий случайный id (12 символов), без PII
        const arr = new Uint8Array(8);
        (window.crypto || window.msCrypto).getRandomValues(arr);
        s = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
        localStorage.setItem(SID_KEY, s);
      }
      return s;
    } catch (e) { return ""; }
  }
  function detectEvent() {
    const p = (location.pathname || "").toLowerCase();
    if (p.endsWith("/box.html") || /\/box-[a-z]+\.html$/.test(p)) return "view-box";
    if (p.endsWith("/cart.html")) return "view-cart";
    if (p.endsWith("/checkout.html")) return "view-checkout";
    if (p.endsWith("/thank-you.html")) return "view-thanks";
    return null;
  }
  const ev = detectEvent();
  if (ev) {
    // fire-and-forget, не блокирует пользовательский опыт
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: ev, sid: sid() }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}
  }
})();
