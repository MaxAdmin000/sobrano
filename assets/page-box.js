// СОБРАНО — логика страниц-конструкторов box-{s,m,l,xl}.html
// Подключается через <script src="assets/page-box.js" defer></script>.
// Зависит от: catalog.js, cart.js, popups.js (опционально), toast.js (опционально).

(function () {
  "use strict";

  function detectBoxId() {
    // Унифицированная страница /box.html?size=l. Если параметр не задан или указан некорректный размер —
    // fallback на старые имена файлов box-{s,m,l,xl}.html (для бэквард-совместимости).
    try {
      const params = new URLSearchParams(location.search);
      const fromQuery = (params.get("size") || "").trim().toLowerCase();
      if (fromQuery) return fromQuery;
    } catch (e) {}
    const path = (location.pathname || "").toLowerCase();
    const m = path.match(/box-([a-z]+)\.html/);
    return m ? m[1] : null;
  }

  // Метки для бейджа/eyebrow рядом с размером (что-то вроде «Бокс · M · популярный»)
  const SIZE_SUB_LABEL = {
    s: "мини",
    m: "популярный",
    l: "",
    xl: "максимум",
  };

  // Подзаголовок над h1 (sup-надпись) — фоллбэк, если в каталоге не задан `sub`
  const SIZE_SUP_LABEL = {
    s: "small",
    m: "medium",
    l: "large",
    xl: "extra",
  };

  function fmtPriceRubNbsp(n) {
    // 4490 → "4&nbsp;490&nbsp;₽" — оригинальный формат страницы.
    const s = Number(n || 0).toLocaleString("ru-RU"); // 4 490
    return s.replace(/\s+/g, "&nbsp;") + "&nbsp;₽";
  }
  function fmtPricePlain(n) {
    return Number(n || 0).toLocaleString("ru-RU") + " ₽";
  }

  function applyBoxMeta() {
    const C = window.SOBRANO_CATALOG;
    if (!C || !C.getBox) return;
    const Cart = window.SOBRANO_CART;
    const cur = Cart && Cart.getState().box;
    const meta = cur ? C.getBox(cur.id) : null;
    if (!meta) return;
    const sizeUpper = String(meta.size || cur.id || "").toUpperCase();
    const sizeLower = sizeUpper.toLowerCase();
    const sub = (meta.sub || SIZE_SUP_LABEL[sizeLower] || "").trim();
    const subLbl = (SIZE_SUB_LABEL[sizeLower] || "").trim();
    const badge = subLbl ? `Бокс · ${sizeUpper} · ${subLbl}` : `Бокс · ${sizeUpper}`;
    const cap = Number(meta.capacity) || 0;
    const price = Number(meta.price) || 0;
    const priceFmt = fmtPricePlain(price);

    document.title = `Бокс ${sizeUpper} · собери букет — СОБРАНО`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Соберите букет в боксе ${sizeUpper}: ${cap} стеблей на ваш выбор. Фиксированная цена ${priceFmt}.`);

    document.querySelectorAll("[data-box-marquee]").forEach((el) => {
      el.textContent = `Бокс ${sizeUpper} · ${cap} цветков · ${priceFmt}`;
    });
    setText("[data-box-crumb]", `Бокс ${sizeUpper}`);
    setText("[data-box-meta]", `${cap} цветков · ${priceFmt}`);
    setText("[data-box-badge]", badge);
    setText("[data-box-eyebrow]", badge);
    setHtml("[data-box-h1]", `${sizeUpper}<sup>${sub}</sup>`);
    setHtml("[data-box-price]", fmtPriceRubNbsp(price));
    document.querySelectorAll("[data-box-img]").forEach((el) => {
      if (meta.image) el.setAttribute("src", meta.image);
      el.setAttribute("alt", `Бокс ${sizeUpper}`);
    });
    // B11: галерея — главное image + meta.images[] как доп. кадры.
    renderBoxGallery(meta, sizeUpper);
    // Lead: title — desc. Дополнение про стебли — стандартное.
    const leadText = [
      meta.title ? meta.title + " — " : "",
      meta.desc || "",
      meta.desc ? " " : "",
      `Соберите бокс из ${cap} любых стеблей в наличии. Цена не меняется от выбора цветов.`,
    ].join("");
    setText("[data-box-lead]", leadText);

    // Tag row: список всех боксов с активной отметкой текущего
    renderTagRow(sizeLower);
  }

  // B11: рендер thumbnail-стрипы галереи. Источник: meta.image (главный кадр)
  // + meta.images[] (дополнительные). Если только 1 кадр — стрипа скрывается.
  function renderBoxGallery(meta, alt) {
    const wrap = document.querySelector("[data-box-gallery]");
    if (!wrap) return;
    const main = meta && meta.image ? [meta.image] : [];
    const extra = (meta && Array.isArray(meta.images)) ? meta.images.filter((u) => u) : [];
    const all = main.concat(extra);
    if (all.length < 2) { wrap.hidden = true; wrap.innerHTML = ""; return; }
    wrap.hidden = false;
    wrap.innerHTML = all.map((url, i) =>
      '<button type="button" data-gi="' + i + '"' + (i === 0 ? ' class="active"' : '') + '>'
      + '<img src="' + escapeAttr(url) + '" alt="' + escapeAttr(alt) + ' · кадр ' + (i + 1) + '" loading="lazy">'
      + '</button>'
    ).join("");
    const mainImg = document.querySelector("[data-box-img]");
    wrap.querySelectorAll("button[data-gi]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.gi);
        if (mainImg) mainImg.setAttribute("src", all[i]);
        wrap.querySelectorAll("button[data-gi]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }
  function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
  }

  function setText(sel, text) {
    document.querySelectorAll(sel).forEach((el) => { el.textContent = text; });
  }
  function setHtml(sel, html) {
    document.querySelectorAll(sel).forEach((el) => { el.innerHTML = html; });
  }

  function renderTagRow(activeSizeLower) {
    const wrap = document.querySelector("[data-box-tag-row]");
    if (!wrap) return;
    const C = window.SOBRANO_CATALOG;
    const boxes = (C && C.BOXES) ? C.BOXES.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    if (!boxes.length) return;
    wrap.innerHTML = boxes.map((b) => {
      const size = String(b.size || b.id || "").toUpperCase();
      const isActive = String(b.id || "").toLowerCase() === activeSizeLower;
      const price = fmtPricePlain(b.price);
      const label = `${size} · ${price}`;
      return isActive
        ? `<span class="tag active">${label}</span>`
        : `<a class="tag" href="box.html?size=${encodeURIComponent(b.id)}">${label}</a>`;
    }).join("");
    // Клик по неактивному тегу: смена ?size= через history.replaceState без перезагрузки,
    // ensureBox обновит Cart, и страница пересоберётся.
    wrap.querySelectorAll("a.tag[href]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href") || "";
        const m = href.match(/[?&]size=([a-z]+)/i);
        if (!m) return;
        e.preventDefault();
        try {
          history.replaceState(null, "", "box.html?size=" + m[1]);
        } catch (err) {}
        const Cart = window.SOBRANO_CART;
        if (Cart) Cart.setBox(m[1]);
        applyBoxMeta();
        renderAll();
      });
    });
  }

  function ensureBox(boxId) {
    const Cart = window.SOBRANO_CART;
    const C = window.SOBRANO_CATALOG;
    if (!Cart || !C) return false;
    const cur = Cart.getState().box;
    if (!cur || cur.id !== boxId) {
      const switched = !!cur && cur.id !== boxId;
      Cart.setBox(boxId);
      if (switched && window.showToast) {
        const meta = C.getBox(boxId);
        if (meta) window.showToast(`Размер бокса изменён на ${meta.size}`, "info", 2500);
      }
    }
    return true;
  }

  function renderProgress() {
    const Cart = window.SOBRANO_CART;
    if (!Cart) return;
    const cap = Cart.getCapacity();
    const filled = Cart.getFilledStems();
    const left = Math.max(0, cap - filled);
    const filledEl = document.getElementById("filled");
    const leftEl = document.getElementById("left");
    const bar = document.getElementById("bar");
    if (filledEl) filledEl.textContent = filled;
    if (leftEl) leftEl.textContent = left;
    if (bar) bar.style.width = (cap > 0 ? Math.min(100, (filled / cap) * 100) : 0) + "%";

    // Обновляем число вместимости рядом с #filled (если HTML "X / N")
    const meta = filledEl && filledEl.parentElement;
    if (meta && /\/\s*\d+/.test(meta.innerHTML)) {
      meta.innerHTML = meta.innerHTML.replace(/\/\s*\d+/, "/&nbsp;" + cap);
    }
  }

  function renderQty() {
    const Cart = window.SOBRANO_CART;
    if (!Cart) return;
    const flowers = (Cart.getState().box && Cart.getState().box.flowers) || {};
    const full = Cart.getRemainingCapacity() <= 0;
    document.querySelectorAll(".fl-card[data-flower-id]").forEach((card) => {
      const fid = card.getAttribute("data-flower-id");
      const qty = flowers[fid] || 0;
      const root = card.querySelector(".qty");
      if (root) {
        root.dataset.stems = qty;
        root.classList.toggle("has", qty > 0);
        const v = root.querySelector(".v");
        if (v) v.textContent = qty;
      }
      // out-of-stock blocking
      const C = window.SOBRANO_CATALOG;
      const flower = C && C.getFlower(fid);
      if (flower && flower.stock === false) {
        card.classList.add("full");
      } else {
        card.classList.toggle("full", full && qty === 0);
      }
    });
  }

  function renderSummaryList() {
    const Cart = window.SOBRANO_CART;
    const C = window.SOBRANO_CATALOG;
    if (!Cart || !C) return;
    const list = document.getElementById("list");
    if (!list) return;
    const flowers = (Cart.getState().box && Cart.getState().box.flowers) || {};
    const entries = Object.entries(flowers).filter(([, q]) => q > 0);
    if (!entries.length) {
      list.innerHTML = `<div class="s-empty" style="font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,236,227,.55);padding:18px 0">Бокс пока пустой — добавьте цветы из витрины ниже</div>`;
      return;
    }
    list.innerHTML = entries.map(([fid, qty]) => {
      const f = C.getFlower(fid);
      if (!f) return "";
      const stems = qty === 1 ? "стебель" : qty < 5 ? "стебля" : "стеблей";
      const thumb = f.image
        ? `<div class="thumb"><img src="${f.image.replace(/w=\d+/, "w=200")}" alt=""></div>`
        : `<div class="thumb"></div>`;
      return `
        <div class="s-row" data-fid="${fid}">
          ${thumb}
          <div>
            <div class="name">${f.name}</div>
            <div class="qty-mini">×${qty} ${stems}</div>
          </div>
          <span></span>
          <button class="x" type="button" aria-label="Убрать" data-remove-fid="${fid}">×</button>
        </div>`;
    }).join("");
  }

  function renderTotals() {
    const Cart = window.SOBRANO_CART;
    const C = window.SOBRANO_CATALOG;
    if (!Cart || !C) return;
    const subtotal = Cart.getSubtotal();
    const discount = Cart.getDiscount ? Cart.getDiscount() : 0;
    // На странице бокса доставка ещё не выбрана — её не учитываем в «Итого»,
    // чтобы цифры здесь совпадали с «фиксированной ценой» бокса (+ допы, если есть).
    const totalNoDelivery = Math.max(0, subtotal - discount);
    const addons = Cart.getState().addons;
    const addonCount = Object.values(addons).reduce((s, n) => s + n, 0);
    document.querySelectorAll(".s-total .s-total-row").forEach((row) => {
      const lbl = (row.firstElementChild && row.firstElementChild.textContent || "").trim().toLowerCase();
      const val = row.lastElementChild;
      if (!val) return;
      if (lbl.startsWith("бокс")) {
        const meta = Cart.getBoxMeta();
        if (meta) val.textContent = Cart.formatPrice(meta.price);
      } else if (lbl === "цветы внутри") {
        val.textContent = "включено";
      } else if (lbl === "допы") {
        if (addonCount === 0) val.textContent = "не выбраны";
        else val.textContent = Cart.formatPrice(subtotal - (Cart.getBoxMeta() ? Cart.getBoxMeta().price : 0));
      } else if (lbl === "итого") {
        val.textContent = Cart.formatPrice(totalNoDelivery);
      }
    });
  }

  function renderAddons() {
    const Cart = window.SOBRANO_CART;
    if (!Cart) return;
    const addons = Cart.getState().addons || {};
    document.querySelectorAll(".ao[data-addon-id]").forEach((el) => {
      const aid = el.getAttribute("data-addon-id");
      const qty = addons[aid] || 0;
      el.classList.toggle("active", qty > 0);
      const btn = el.querySelector(".add-btn");
      if (btn) btn.textContent = qty > 0 ? "✓" : "+";
    });
  }

  function renderCta() {
    const Cart = window.SOBRANO_CART;
    if (!Cart) return;
    const cta = document.querySelector(".s-cta");
    if (!cta) return;
    const filled = Cart.getFilledStems();
    if (filled === 0) {
      cta.classList.add("disabled");
      cta.style.pointerEvents = "none";
      cta.style.opacity = ".55";
      cta.style.cursor = "not-allowed";
      cta.removeAttribute("href");
      cta.setAttribute("aria-disabled", "true");
      cta.setAttribute("title", "Сначала добавьте цветы из витрины ниже");
      cta.innerHTML = 'Сначала добавьте цветы <span class="arrow">→</span>';
    } else {
      cta.classList.remove("disabled");
      cta.style.pointerEvents = "";
      cta.style.opacity = "";
      cta.style.cursor = "";
      cta.setAttribute("href", "cart.html");
      cta.removeAttribute("aria-disabled");
      cta.removeAttribute("title");
      cta.innerHTML = 'Перейти в корзину <span class="arrow">→</span>';
    }
  }

  function renderAll() {
    renderProgress();
    renderQty();
    renderSummaryList();
    renderTotals();
    renderAddons();
    renderCta();
  }

  function attachHandlers() {
    const Cart = window.SOBRANO_CART;

    // qty +/- on flower cards
    document.querySelectorAll(".fl-card[data-flower-id]").forEach((card) => {
      const fid = card.getAttribute("data-flower-id");
      const minus = card.querySelector(".qty .minus");
      const plus = card.querySelector(".qty .plus");
      if (minus) minus.addEventListener("click", (e) => {
        e.preventDefault();
        Cart.removeFlower(fid);
      });
      if (plus) plus.addEventListener("click", (e) => {
        e.preventDefault();
        const r = Cart.addFlower(fid);
        if (!r.ok) {
          if (r.error === "full" && window.showToast) window.showToast("Бокс заполнен — уберите что-то, чтобы добавить", "warning", 3000);
          if (r.error === "out-of-stock" && window.showToast) window.showToast("Сейчас нет в наличии", "warning");
        }
      });
    });

    // remove from summary list (delegation)
    const list = document.getElementById("list");
    if (list) {
      list.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-remove-fid]");
        if (!btn) return;
        Cart.setFlowerQty(btn.getAttribute("data-remove-fid"), 0);
      });
    }

    // chips — cosmetic filter, also filter cards by category
    document.querySelectorAll(".chips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chips .chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const label = (chip.textContent || "").trim().toLowerCase();
        const map = { "розы": "rose", "пионы": "peony", "сезонные": "seasonal", "экзотика": "exo", "сухоцветы": "dry" };
        const cat = Object.keys(map).find((k) => label.startsWith(k));
        const target = cat ? map[cat] : null;
        document.querySelectorAll(".fl-card[data-flower-id]").forEach((card) => {
          const fid = card.getAttribute("data-flower-id");
          const f = window.SOBRANO_CATALOG && window.SOBRANO_CATALOG.getFlower(fid);
          const show = !target || (f && f.cat === target);
          card.style.display = show ? "" : "none";
        });
      });
    });

    // addons
    document.querySelectorAll(".ao[data-addon-id] .add-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const el = btn.closest(".ao[data-addon-id]");
        if (!el) return;
        const aid = el.getAttribute("data-addon-id");
        const cur = (Cart.getState().addons[aid]) || 0;
        Cart.setAddon(aid, cur > 0 ? 0 : 1);
        if (window.showToast) {
          const a = window.SOBRANO_CATALOG && window.SOBRANO_CATALOG.getAddon(aid);
          const title = a ? a.title : "Доп";
          window.showToast(cur > 0 ? `«${title}» убран` : `«${title}» добавлен`, "success", 2500);
        }
      });
    });

    // florist tip "Применить совет"
    document.querySelectorAll(".tip a").forEach((link) => {
      const text = (link.textContent || "").toLowerCase();
      if (!text.includes("применить")) return;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        // совет: 2 гипсофилы и 1 ранункулюс
        const Cart = window.SOBRANO_CART;
        const cur = (Cart.getState().box && Cart.getState().box.flowers) || {};
        const room = Cart.getRemainingCapacity();
        if (room < 3) {
          if (window.showToast) window.showToast("Не хватает места — освободите 3 стебля", "warning");
          return;
        }
        Cart.setFlowerQty("gypsophila", (cur["gypsophila"] || 0) + 2);
        Cart.setFlowerQty("ranunculus", (cur["ranunculus"] || 0) + 1);
        if (window.showToast) window.showToast("Совет применён — добавили 2 гипсофилы и 1 ранункулюс", "success");
      });
    });

    // "Собрать «как у вас на фото»"
    document.querySelectorAll(".switch-box .pill-btn").forEach((btn) => {
      const txt = (btn.textContent || "").toLowerCase();
      if (txt.includes("как у вас на фото")) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (window.showToast) window.showToast("Напишите нам в Telegram — соберём по фото", "info", 4000);
        });
      }
    });
  }

  function init() {
    const boxId = detectBoxId();
    if (!boxId) return;
    if (!ensureBox(boxId)) return;
    applyBoxMeta();
    attachHandlers();
    renderAll();
    window.SOBRANO_CART.subscribe(renderAll);
    // Каталог приходит асинхронно с /api/catalog; когда обновится — перерисуем мету (картинка, цена, лид).
    document.addEventListener("sobrano:catalog-updated", () => {
      applyBoxMeta();
      renderAll();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
