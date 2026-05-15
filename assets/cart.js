// СОБРАНО — корзина (state в localStorage + UI helpers).
// Зависит от: assets/catalog.js (window.SOBRANO_CATALOG), assets/toast.js (window.showToast — опционально).
//
// API:
//   Cart.getState()                — снимок состояния
//   Cart.setBox(boxId)             — выбрать бокс (сбрасывает цветы при смене)
//   Cart.clearBox()                — убрать бокс
//   Cart.setFlowerQty(id, qty)     — точная установка с уважением вместимости
//   Cart.addFlower(id) / removeFlower(id)
//   Cart.setAddon(id, qty)         — qty=0 удаляет
//   Cart.applyPick(pickId)         — заменяет содержимое корзины подборкой
//   Cart.setDelivery('own'|'yandex')
//   Cart.applyPromo(code) → {ok, error}
//   Cart.removePromo()
//   Cart.setCustomer(obj)
//   Cart.getSubtotal()/getDeliveryPrice()/getDiscount()/getTotal()
//   Cart.getItemCount()/getStemCount()/getFilledStems()/getRemainingCapacity()
//   Cart.subscribe(fn) → unsubscribe
//   Cart.clear()                   — полный сброс
//   Cart.finalize() → order        — фиксирует заказ, чистит корзину
//   Cart.getLastOrder()
//   Cart.getOrders()               — все локально сохранённые заказы

(function () {
  "use strict";

  const KEY = "sobrano_cart_v1";
  const ORDER_KEY = "sobrano_last_order_v1";
  const ORDERS_KEY = "sobrano_orders_v1";

  function emptyState() {
    return {
      box: null,           // { id, flowers: { [flowerId]: qty } }
      addons: {},          // { [addonId]: qty }
      delivery: "own",
      promo: null,         // строка-код, например "BLOOM10"
      customer: null,
      updatedAt: Date.now(),
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyState();
      return Object.assign(emptyState(), parsed);
    } catch (e) {
      return emptyState();
    }
  }

  function write(s) {
    try {
      s.updatedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* quota exhausted, ignore */ }
    notify();
  }

  let state = read();
  const subs = new Set();

  function notify() {
    state = read();
    subs.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
    updateNavPill();
  }

  // Cross-tab sync
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });

  // При обновлении каталога с бэка — пересчитываем тоталы и перерисовываем UI.
  document.addEventListener("sobrano:catalog-updated", () => notify());

  // ---------- catalog helpers ----------
  const C = () => window.SOBRANO_CATALOG;
  const fmt = (n) => C() ? C().formatPrice(n) : `${Number(n || 0).toLocaleString("ru-RU")} ₽`;

  // ---------- BOX ----------
  function setBox(boxId) {
    const box = C() && C().getBox(boxId);
    if (!box) return false;
    const cur = state.box;
    if (cur && cur.id === boxId) return true;
    state.box = { id: boxId, flowers: {} };
    write(state);
    return true;
  }

  function clearBox() {
    state.box = null;
    write(state);
  }

  function getBoxMeta() {
    if (!state.box) return null;
    return C() ? C().getBox(state.box.id) : null;
  }

  function getFilledStems() {
    if (!state.box) return 0;
    return Object.values(state.box.flowers || {}).reduce((s, n) => s + (n || 0), 0);
  }

  function getCapacity() {
    const m = getBoxMeta();
    return m ? m.capacity : 0;
  }

  function getRemainingCapacity() {
    return Math.max(0, getCapacity() - getFilledStems());
  }

  function setFlowerQty(flowerId, qty) {
    if (!state.box) return { ok: false, error: "no-box" };
    const flower = C() && C().getFlower(flowerId);
    if (!flower) return { ok: false, error: "unknown-flower" };
    if (flower.stock === false) return { ok: false, error: "out-of-stock" };

    const target = Math.max(0, Math.floor(qty || 0));
    const cur = state.box.flowers[flowerId] || 0;
    const delta = target - cur;
    if (delta > 0) {
      const room = getRemainingCapacity();
      if (delta > room) {
        const allowed = cur + room;
        if (room <= 0) return { ok: false, error: "full" };
        state.box.flowers[flowerId] = allowed;
        write(state);
        return { ok: false, error: "capped", capped: allowed };
      }
    }
    if (target <= 0) delete state.box.flowers[flowerId];
    else state.box.flowers[flowerId] = target;
    write(state);
    return { ok: true };
  }

  function addFlower(flowerId) {
    const cur = (state.box && state.box.flowers[flowerId]) || 0;
    return setFlowerQty(flowerId, cur + 1);
  }

  function removeFlower(flowerId) {
    const cur = (state.box && state.box.flowers[flowerId]) || 0;
    return setFlowerQty(flowerId, Math.max(0, cur - 1));
  }

  // ---------- ADDONS ----------
  function setAddon(addonId, qty) {
    const addon = C() && C().getAddon(addonId);
    if (!addon) return false;
    const target = Math.max(0, Math.floor(qty || 0));
    if (target <= 0) delete state.addons[addonId];
    else state.addons[addonId] = target;
    write(state);
    return true;
  }

  // ---------- PICKS ----------
  function applyPick(pickId) {
    const pick = C() && C().getPick(pickId);
    if (!pick) return false;
    const box = C().getBox(pick.boxId);
    if (!box) return false;
    state.box = { id: pick.boxId, flowers: { ...pick.flowers }, fromPick: pickId };
    state.addons = {};
    (pick.addons || []).forEach((aid) => { state.addons[aid] = 1; });
    write(state);
    return true;
  }

  // ---------- DELIVERY ----------
  function setDelivery(opt) {
    if (opt !== "own" && opt !== "yandex") return false;
    state.delivery = opt;
    write(state);
    return true;
  }

  // ---------- PROMO ----------
  function applyPromo(code) {
    const cleaned = String(code || "").trim().toUpperCase();
    if (!cleaned) return { ok: false, error: "empty" };
    const promos = C() && C().PROMOS;
    if (!promos || !promos[cleaned]) return { ok: false, error: "invalid" };
    state.promo = cleaned;
    write(state);
    return { ok: true };
  }

  function removePromo() {
    state.promo = null;
    write(state);
  }

  // ---------- CUSTOMER ----------
  function setCustomer(data) {
    state.customer = Object.assign({}, state.customer || {}, data || {});
    write(state);
  }

  // ---------- TOTALS ----------
  function getSubtotal() {
    let total = 0;
    if (state.box) {
      const meta = getBoxMeta();
      if (meta) total += meta.price;
    }
    Object.entries(state.addons).forEach(([id, qty]) => {
      const a = C() && C().getAddon(id);
      if (a) total += a.price * qty;
    });
    return total;
  }

  function getDeliveryBase() {
    const d = C() && C().DELIVERY;
    if (!d) return 0;
    const opt = d[state.delivery] || d.own;
    return opt.price || 0;
  }

  // Доплата за выбранный временной слот (пиковый/срочный). Сохраняется на чекауте
  // в customer.timeSurcharge при выборе слота из CMS (delivery.slotsBlock.list[].surcharge).
  function getSlotSurcharge() {
    const c = state.customer || {};
    const v = Number(c.timeSurcharge);
    return isFinite(v) && v > 0 ? Math.round(v) : 0;
  }

  function getDeliveryPrice() {
    return getDeliveryBase() + getSlotSurcharge();
  }

  function getDiscount() {
    if (!state.promo) return 0;
    const promos = C() && C().PROMOS;
    if (!promos || !promos[state.promo]) return 0;
    const pct = promos[state.promo].discountPct || 0;
    return Math.round(getSubtotal() * pct / 100);
  }

  function getTotal() {
    return Math.max(0, getSubtotal() + getDeliveryPrice() - getDiscount());
  }

  function getItemCount() {
    let n = 0;
    if (state.box) n += 1;
    Object.values(state.addons).forEach((q) => { n += q; });
    return n;
  }

  function getStemCount() {
    return getFilledStems();
  }

  // ---------- BOX PICKER MODAL ----------
  // Используется, когда пользователь жмёт «+» на цветке или подборке, но бокс ещё не выбран.
  function pickBoxIfNeeded(then) {
    if (state.box) { then && then(state.box.id); return; }
    showBoxPickerModal((boxId) => {
      setBox(boxId);
      then && then(boxId);
    });
  }

  function showBoxPickerModal(onPick) {
    injectBoxPickerOnce();
    const m = document.getElementById("sob-box-picker");
    if (!m) return;
    const C = window.SOBRANO_CATALOG;
    const boxes = (C && C.BOXES ? C.BOXES : []).slice().sort((a, b) => (a.order||0) - (b.order||0));
    const grid = m.querySelector("[data-bp-grid]");
    grid.innerHTML = boxes.filter(b => !b.hidden).map((b) =>
      '<button class="sob-bp-box" data-box-id="' + bpEscape(b.id) + '" type="button">' +
        '<span class="size">' + bpEscape(b.size || b.id) + '</span>' +
        '<span class="cap">' + (b.capacity || 0) + ' стеблей</span>' +
        '<span class="price">' + fmt(b.price) + '</span>' +
      '</button>'
    ).join("");
    grid.querySelectorAll("[data-box-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.boxId;
        hideBoxPickerModal();
        onPick && onPick(id);
      });
    });
    m.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function hideBoxPickerModal() {
    const m = document.getElementById("sob-box-picker");
    if (m) m.classList.remove("show");
    document.body.style.overflow = "";
  }
  function bpEscape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
  }
  function injectBoxPickerOnce() {
    if (document.getElementById("sob-box-picker")) return;
    const m = document.createElement("div");
    m.id = "sob-box-picker";
    m.innerHTML =
      '<div class="sob-bp-backdrop"></div>' +
      '<div class="sob-bp-card" role="dialog" aria-modal="true" aria-labelledby="sob-bp-h">' +
        '<button class="sob-bp-close" aria-label="Закрыть" type="button">×</button>' +
        '<span class="sob-bp-eyebrow">Шаг 01 — Размер</span>' +
        '<h3 id="sob-bp-h">Сначала выберите <em>бокс</em>.</h3>' +
        '<p>Цена бокса фиксированная — зависит только от размера. Цветы внутри собираете сами, без доплат за «сорт».</p>' +
        '<div class="sob-bp-grid" data-bp-grid></div>' +
      '</div>';
    document.body.appendChild(m);

    const css = document.createElement("style");
    css.textContent =
      '#sob-box-picker{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;padding:24px}' +
      '#sob-box-picker.show{display:flex}' +
      '#sob-box-picker .sob-bp-backdrop{position:absolute;inset:0;background:rgba(15,11,8,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
      '#sob-box-picker .sob-bp-card{position:relative;background:var(--ivory,#F2ECE3);color:var(--ink,#1A1410);border-radius:24px;padding:36px clamp(24px,4vw,48px);max-width:720px;width:100%;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);font-family:var(--sans,Inter,Helvetica,Arial,sans-serif)}' +
      '#sob-box-picker .sob-bp-eyebrow{font-family:var(--mono,JetBrains_Mono,monospace);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute,#7A6B5E);display:inline-flex;align-items:center;gap:10px}' +
      '#sob-box-picker .sob-bp-eyebrow::before{content:"";width:24px;height:1px;background:var(--mute,#7A6B5E);display:inline-block}' +
      '#sob-box-picker h3{font-family:var(--serif,Fraunces,Georgia,serif);font-weight:300;font-size:clamp(28px,4vw,40px);letter-spacing:-.02em;line-height:1.05;margin:14px 0 10px}' +
      '#sob-box-picker h3 em{font-style:italic;color:var(--wine,#5C1F25);font-weight:400}' +
      '#sob-box-picker p{color:var(--ink-soft,#3A2D24);font-size:15px;line-height:1.55;max-width:48ch;margin-bottom:24px}' +
      '#sob-box-picker .sob-bp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}' +
      '#sob-box-picker .sob-bp-box{background:var(--ivory-2,#E8DDD0);border-radius:14px;padding:22px 14px;display:flex;flex-direction:column;gap:4px;align-items:center;cursor:pointer;transition:all .2s;border:1.5px solid transparent;font:inherit;color:inherit}' +
      '#sob-box-picker .sob-bp-box:hover{background:var(--ink,#1A1410);color:var(--ivory,#F2ECE3);transform:translateY(-2px)}' +
      '#sob-box-picker .sob-bp-box .size{font-family:var(--serif,Fraunces,Georgia,serif);font-size:34px;font-weight:300;letter-spacing:-.02em;line-height:1}' +
      '#sob-box-picker .sob-bp-box .cap{font-family:var(--mono,JetBrains_Mono,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin-top:6px}' +
      '#sob-box-picker .sob-bp-box .price{font-family:var(--serif,Fraunces,Georgia,serif);font-size:18px;font-style:italic;color:var(--terracotta,#C97B5C);margin-top:8px}' +
      '#sob-box-picker .sob-bp-close{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;background:transparent;color:var(--ink,#1A1410);font-size:24px;line-height:1;cursor:pointer;transition:all .2s;border:0;font-family:inherit}' +
      '#sob-box-picker .sob-bp-close:hover{background:var(--ink,#1A1410);color:var(--ivory,#F2ECE3)}' +
      '@media(max-width:680px){#sob-box-picker .sob-bp-grid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(css);

    m.querySelector(".sob-bp-backdrop").addEventListener("click", hideBoxPickerModal);
    m.querySelector(".sob-bp-close").addEventListener("click", hideBoxPickerModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideBoxPickerModal();
    });
  }

  // ---------- NAV PILL ----------
  function updateNavPill() {
    const pills = document.querySelectorAll(".cart-pill");
    if (!pills.length) return;
    const count = getItemCount();
    const total = getTotal();
    pills.forEach((pill) => {
      const isEmpty = count === 0;
      pill.setAttribute("href", "cart.html");
      const label = isEmpty
        ? `<span class="dot"></span> Корзина <strong style="font-weight:600">·</strong> пусто`
        : `<span class="dot"></span> Корзина · <strong style="font-weight:600">${count}</strong> · ${fmt(total)}`;
      pill.innerHTML = label;
    });
  }

  // ---------- LIFECYCLE ----------
  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  function clear() {
    state = emptyState();
    write(state);
  }

  function finalize() {
    if (!state.box && Object.keys(state.addons).length === 0) {
      return null;
    }
    // Бокс выбран, но в нём нет цветов — заказ не финализируем.
    // Это страхует случаи прямого захода на checkout.html с «пустым» боксом в стейте.
    if (state.box && getFilledStems() === 0) {
      return null;
    }
    const orderId = "SBR-" + String(Date.now()).slice(-7);
    const snap = {
      orderId,
      createdAt: Date.now(),
      box: state.box ? {
        id: state.box.id,
        ...getBoxMeta(),
        flowers: { ...state.box.flowers },
      } : null,
      addons: Object.entries(state.addons).map(([id, qty]) => {
        const a = C().getAddon(id);
        return { id, qty, title: a ? a.title : id, price: a ? a.price : 0 };
      }),
      delivery: state.delivery,
      deliveryPrice: getDeliveryPrice(),
      promo: state.promo,
      discount: getDiscount(),
      subtotal: getSubtotal(),
      total: getTotal(),
      customer: state.customer || null,
    };
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(snap));
      const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      all.unshift(snap);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all.slice(0, 50)));
    } catch (e) { /* quota */ }
    clear();
    return snap;
  }

  function getLastOrder() {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || "null"); }
    catch (e) { return null; }
  }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"); }
    catch (e) { return []; }
  }

  // ---------- URL PROMO ----------
  // Когда юзер заходит по ссылке вида https://sobrano.store/?promo=BLOOM10 —
  // сохраняем код в localStorage и применяем как только каталог загрузится.
  const PENDING_PROMO_KEY = "sobrano_pending_promo_v1";

  function captureUrlPromoRef() {
    try {
      const params = new URLSearchParams(location.search);
      const raw = params.get("promo");
      if (!raw) return;
      const code = String(raw).trim().toUpperCase();
      if (!code) return;
      localStorage.setItem(PENDING_PROMO_KEY, code);
      // Чистим URL чтобы не таскать ?promo= при дальнейших навигациях и шерах
      const url = new URL(location.href);
      url.searchParams.delete("promo");
      const cleaned = url.pathname + (url.search || "") + url.hash;
      try { history.replaceState(null, "", cleaned); } catch (e) {}
    } catch (e) {}
  }

  function getPendingPromo() {
    try { return localStorage.getItem(PENDING_PROMO_KEY) || ""; }
    catch (e) { return ""; }
  }
  function clearPendingPromo() {
    try { localStorage.removeItem(PENDING_PROMO_KEY); } catch (e) {}
  }

  function tryApplyPendingPromo() {
    const code = getPendingPromo();
    if (!code) return;
    if (state.promo === code) { clearPendingPromo(); return; }
    const C = C_(); // window.SOBRANO_CATALOG, если уже загружен
    if (!C || !C.PROMOS || !C.PROMOS[code]) return; // каталог ещё не пришёл — оставим pending
    state.promo = code;
    write(state);
    clearPendingPromo();
    const pct = C.PROMOS[code].discountPct || 0;
    if (window.showToast) {
      window.showToast("Применён промокод " + code + (pct ? " · −" + pct + "%" : ""), "success", 3000);
    }
  }
  function C_() { return window.SOBRANO_CATALOG; }

  // ---------- INIT ----------
  function init() {
    updateNavPill();
    captureUrlPromoRef();
    tryApplyPendingPromo();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  // Когда каталог обновится с бэка — пробуем применить отложенный промо ещё раз
  document.addEventListener("sobrano:catalog-updated", tryApplyPendingPromo);

  // ---------- EXPORT ----------
  window.SOBRANO_CART = {
    getState: () => state,
    setBox, clearBox, getBoxMeta,
    setFlowerQty, addFlower, removeFlower,
    setAddon,
    applyPick,
    setDelivery,
    applyPromo, removePromo,
    setCustomer,
    getSubtotal, getDeliveryBase, getDeliveryPrice, getSlotSurcharge, getDiscount, getTotal,
    getItemCount, getStemCount, getFilledStems, getCapacity, getRemainingCapacity,
    subscribe,
    clear, finalize, getLastOrder, getOrders,
    pickBoxIfNeeded,
    formatPrice: fmt,
  };
})();
