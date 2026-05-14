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
})();
