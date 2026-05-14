// СОБРАНО — каталог. Источник истины — /api/catalog (бэкенд).
// Здесь — fallback на случай отсутствия бэкенда + единый getter-API для остального фронта.
// При успешном фетче актуальные данные перезаливаются в STATE in-place,
// чтобы существующие ссылки на массивы и объекты остались валидными,
// затем диспатчится событие 'sobrano:catalog-updated' (cart.js слушает и перерисовывает).
(function () {
  "use strict";

  const CACHE_KEY = "sobrano_catalog_cache_v1";

  // ----- FALLBACK (используется если бэкенд недоступен) -----
  const FALLBACK = {
    boxes: [
      { id: "s",  size: "S",  sub: "small",  capacity: 11, price: 1990, title: "Маленький, но настроенческий", desc: "Идеально, чтобы порадовать себя или принести цветы в гости.", image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=900&q=80", url: "box.html?size=s" },
      { id: "m",  size: "M",  sub: "medium", capacity: 17, price: 2990, title: "Самый ходовой формат",          desc: "Достаточно объёма, чтобы стать комплиментом или поводом дня.", image: "https://images.unsplash.com/photo-1599733589046-8a35aebc9bd7?auto=format&fit=crop&w=900&q=80", url: "box.html?size=m" },
      { id: "l",  size: "L",  sub: "large",  capacity: 25, price: 4490, title: "Заметный жест",                  desc: "Когда хочется, чтобы цветы говорили громче слов.",            image: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=900&q=80", url: "box.html?size=l" },
      { id: "xl", size: "XL", sub: "extra",  capacity: 35, price: 5990, title: "Праздник без оговорок",          desc: "День рождения, юбилей, годовщина — повод найдётся.",          image: "https://images.unsplash.com/photo-1561181286-d5c97c0f1d2c?auto=format&fit=crop&w=900&q=80", url: "box.html?size=xl" },
    ],
    flowers: [
      { id: "peony-sara",     name: "Пион «Сара Бернар»", cat: "peony",    priceFrom: 320, image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "peony-duchess",  name: "Пион «Дюшес»",        cat: "peony",    priceFrom: 280, image: "https://images.unsplash.com/photo-1462023057862-69d8df3a3ad5?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "rose-yumilia",   name: "Роза «Юмилия»",       cat: "rose",     priceFrom: 240, image: "https://images.unsplash.com/photo-1496062031456-07b8f162a322?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "rose-ecuador",   name: "Роза «Эквадор»",      cat: "rose",     priceFrom: 290, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "rose-austin",    name: "Роза «Дэвид Остин»",  cat: "rose",     priceFrom: 380, image: "https://images.unsplash.com/photo-1512336195697-db78b00f8606?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "exo" },
      { id: "tulip-french",   name: "Тюльпан Французский", cat: "seasonal", priceFrom: 180, image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "eustoma-rosita", name: "Эустома «Розита»",    cat: "seasonal", priceFrom: 210, image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "gypsophila",     name: "Гипсофила «Облако»",  cat: "seasonal", priceFrom: 140, image: "https://images.unsplash.com/photo-1469259943454-aa100abba749?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "season" },
      { id: "ranunculus",     name: "Ранункулюс",          cat: "seasonal", priceFrom: 260, image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
      { id: "hortensia",      name: "Гортензия",           cat: "seasonal", priceFrom: 340, image: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=700&q=80", meta: "", stock: false, tag: "out" },
      { id: "anthurium",      name: "Антуриум «Тропик»",   cat: "exo",      priceFrom: 360, image: "https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "exo" },
      { id: "protea",         name: "Протея «Кинг»",       cat: "exo",      priceFrom: 520, image: "https://images.unsplash.com/photo-1457089328389-e2d484bd3b1e?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "exo" },
      { id: "cotton",         name: "Хлопок натуральный",  cat: "dry",      priceFrom: 180, image: "https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "dry" },
      { id: "lagurus",        name: "Лагурус",             cat: "dry",      priceFrom: 120, image: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "dry" },
      { id: "pampas",         name: "Пампасная трава",     cat: "dry",      priceFrom: 240, image: "https://images.unsplash.com/photo-1597845155770-ea2b9d7e95a4?auto=format&fit=crop&w=700&q=80", meta: "", stock: false, tag: "out" },
      { id: "eucalyptus",     name: "Эвкалипт",            cat: "green",    priceFrom: 140, image: "https://images.unsplash.com/photo-1586014959290-4f5b6dd6ed4d?auto=format&fit=crop&w=700&q=80", meta: "", stock: true,  tag: "fresh" },
    ],
    picks: [
      { id: "morning-light",   cat: "home",    title: "Утренний свет",          price: 3490, oldPrice: null, desc: "Спокойный микс эустомы, белой розы и лагуруса. Ваза в подарок.", image: "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=900&q=80", boxId: "m",  flowers: { "eustoma-rosita": 7, "rose-yumilia": 6, "lagurus": 4 }, addons: ["vase"] },
      { id: "gift-day",        cat: "gift",    title: "День, который запомнят", price: 5290, oldPrice: 5870, desc: "Тёплый микс из пионов «Сара Бернар», кустовых роз «Юмилия» и облака гипсофилы.", image: "https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?auto=format&fit=crop&w=1200&q=80", boxId: "l",  flowers: { "peony-sara": 8, "rose-yumilia": 10, "gypsophila": 5, "ranunculus": 2 }, addons: ["card", "feed"] },
      { id: "velvet-evening",  cat: "exo",     title: "Бархатный вечер",        price: 6590, oldPrice: null, desc: "Бордовые тюльпаны, антуриум, сухоцветы и хлопок.", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80", boxId: "xl", flowers: { "tulip-french": 12, "anthurium": 6, "cotton": 8, "lagurus": 9 }, addons: [] },
      { id: "sunday-coffee",   cat: "home",    title: "Воскресный кофе",        price: 2190, oldPrice: null, desc: "Микс пионов и кустовой розы.", image: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=900&q=80", boxId: "s",  flowers: { "peony-duchess": 5, "rose-yumilia": 4, "eucalyptus": 2 }, addons: [] },
      { id: "desk-stand",      cat: "home",    title: "Рабочий стол",           price: 2590, oldPrice: null, desc: "Сухоцветы и хлопок.", image: "https://images.unsplash.com/photo-1563198797-d76c2cce6a25?auto=format&fit=crop&w=900&q=80", boxId: "s",  flowers: { "cotton": 5, "lagurus": 4, "eucalyptus": 2 }, addons: ["vase"] },
      { id: "thanks-for-being",cat: "gift",    title: "Спасибо, что есть",      price: 3990, oldPrice: null, desc: "Персиковые ранункулюсы, белые пионы, эустома.", image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=900&q=80", boxId: "m",  flowers: { "ranunculus": 8, "peony-duchess": 5, "eustoma-rosita": 4 }, addons: ["card"] },
      { id: "warm-message",    cat: "gift",    title: "Тёплое сообщение",       price: 3690, oldPrice: null, desc: "Кремовые и пыльно-розовые тона.", image: "https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80", boxId: "m",  flowers: { "rose-yumilia": 6, "eustoma-rosita": 6, "cotton": 5 }, addons: ["card"] },
      { id: "wild-heart",      cat: "exo",     title: "Дикое сердце",           price: 5990, oldPrice: null, desc: "Протея и антуриум.", image: "https://images.unsplash.com/photo-1457089328389-e2d484bd3b1e?auto=format&fit=crop&w=900&q=80", boxId: "l",  flowers: { "protea": 3, "anthurium": 6, "eucalyptus": 10, "cotton": 6 }, addons: [] },
      { id: "first-date",      cat: "romance", title: "Первое свидание",        price: 2290, oldPrice: null, desc: "Пастельные тона, без излишеств.", image: "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=900&q=80", boxId: "s",  flowers: { "peony-sara": 4, "rose-yumilia": 4, "ranunculus": 3 }, addons: [] },
      { id: "ten-years",       cat: "anniv",   title: "Десять лет вместе",      price: 7290, oldPrice: null, desc: "Красно-винные тона.", image: "https://images.unsplash.com/photo-1561181286-d5c97c0f1d2c?auto=format&fit=crop&w=900&q=80", boxId: "xl", flowers: { "rose-ecuador": 15, "tulip-french": 8, "anthurium": 6, "eucalyptus": 6 }, addons: ["card"] },
    ],
    addons: [
      { id: "vase",   title: "Классическая ваза",      price: 690, image: "https://images.unsplash.com/photo-1606170033648-5d55a3edf314?auto=format&fit=crop&w=800&q=80", placeholder: null },
      { id: "green",  title: "Декоративная зелень",    price: 290, image: "https://images.unsplash.com/photo-1586014959290-4f5b6dd6ed4d?auto=format&fit=crop&w=800&q=80", placeholder: null },
      { id: "feed",   title: "Подкормка для цветов",   price: 90,  image: "https://images.unsplash.com/photo-1611311263835-c7e8e2d22b94?auto=format&fit=crop&w=800&q=80", placeholder: null },
      { id: "card",   title: "Открытка ручной работы", price: 190, image: null, placeholder: "⊹" },
      { id: "ribbon", title: "Бант атласный",          price: 150, image: null, placeholder: "ﾐ" },
    ],
    promos: [
      { code: "BLOOM10", discountPct: 10, label: "BLOOM10", active: true },
      { code: "LOVE15",  discountPct: 15, label: "LOVE15",  active: true },
    ],
    delivery: {
      own:    { id: "own",    label: "Своя доставка", price: 500, eta: "в выбранный интервал" },
      yandex: { id: "yandex", label: "Яндекс Go",     price: 0,   eta: "от 60 минут · по тарифу" },
    },
  };

  // ----- STATE (in-place updateable) -----
  const STATE = { BOXES: [], FLOWERS: [], PICKS: [], ADDONS: [], PROMOS: {}, DELIVERY: {} };

  function isExpired(p) {
    if (!p || !p.expiresAt) return false;
    const t = Date.parse(p.expiresAt);
    return !isNaN(t) && t < Date.now();
  }

  function applyData(data) {
    if (!data || typeof data !== "object") return;

    // Arrays — заменяем содержимое, сохраняем ссылку.
    function fill(arr, list, sortByOrder) {
      const items = Array.isArray(list) ? list.slice() : [];
      if (sortByOrder) items.sort((a, b) => (a.order || 0) - (b.order || 0));
      arr.length = 0;
      for (const it of items) {
        if (it && it.hidden) continue;
        arr.push(it);
      }
    }
    fill(STATE.BOXES,   data.boxes,   true);
    fill(STATE.FLOWERS, data.flowers, true);
    fill(STATE.PICKS,   data.picks,   true);
    fill(STATE.ADDONS,  data.addons,  true);

    // PROMOS — приходит массивом, конвертим в объект-словарь по UPPERCASE-коду.
    Object.keys(STATE.PROMOS).forEach((k) => delete STATE.PROMOS[k]);
    const promosArr = Array.isArray(data.promos) ? data.promos : [];
    for (const p of promosArr) {
      if (!p || !p.code || p.active === false || isExpired(p)) continue;
      STATE.PROMOS[String(p.code).toUpperCase()] = { discountPct: p.discountPct || 0, label: p.label || p.code };
    }

    // DELIVERY — объект.
    Object.keys(STATE.DELIVERY).forEach((k) => delete STATE.DELIVERY[k]);
    const dl = (data.delivery && typeof data.delivery === "object") ? data.delivery : FALLBACK.delivery;
    Object.keys(dl).forEach((k) => { STATE.DELIVERY[k] = dl[k]; });
  }

  // Инициализация: сначала кэш (если есть), потом fallback.
  let initial = null;
  try { initial = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) {}
  applyData(initial || FALLBACK);

  // ----- Public API -----
  function formatPrice(n) { return `${Number(n || 0).toLocaleString("ru-RU")} ₽`; }
  function getById(arr, id) { return arr.find((x) => String(x.id) === String(id)) || null; }

  window.SOBRANO_CATALOG = {
    BOXES:    STATE.BOXES,
    FLOWERS:  STATE.FLOWERS,
    PICKS:    STATE.PICKS,
    ADDONS:   STATE.ADDONS,
    PROMOS:   STATE.PROMOS,
    DELIVERY: STATE.DELIVERY,
    getBox:    (id) => getById(STATE.BOXES, id),
    getFlower: (id) => getById(STATE.FLOWERS, id),
    getPick:   (id) => getById(STATE.PICKS, id),
    getAddon:  (id) => getById(STATE.ADDONS, id),
    formatPrice,
    // Принудительная перезагрузка с бэка
    refresh: () => loadFromApi(),
  };

  // ----- Async refresh from /api/catalog -----
  function loadFromApi() {
    return fetch("/api/catalog", { credentials: "same-origin" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d || !d.ok || !d.catalog) return;
        applyData(d.catalog);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d.catalog)); } catch (e) {}
        try {
          document.dispatchEvent(new CustomEvent("sobrano:catalog-updated", { detail: { catalog: d.catalog } }));
        } catch (e) {}
      })
      .catch(() => { /* offline / no backend — остаёмся на кэше/fallback */ });
  }

  // Запускаем фетч в фоне, не блокируя рендер.
  loadFromApi();
})();
