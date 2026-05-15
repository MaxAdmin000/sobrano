// Floating cart pill — фиксированная капсула «Корзина · N · сумма» в правом нижнем углу.
// Появляется на любой публичной странице, кроме cart.html / checkout.html / thank-you.html
// (там корзина и так в фокусе или заказ уже создан).
// Поддержка: показывается только если в корзине есть товары; авто-обновление через Cart.subscribe.
(function () {
  const SKIP_PATHS = /\/(cart|checkout|thank-you)\.html?$/i;
  if (SKIP_PATHS.test(location.pathname)) return;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    let attempts = 0;
    (function waitCart() {
      const Cart = window.SOBRANO_CART;
      if (!Cart || typeof Cart.subscribe !== "function") {
        if (attempts++ > 60) return; // ~3 секунды максимум
        setTimeout(waitCart, 50);
        return;
      }
      mount(Cart);
    })();
  });

  function mount(Cart) {
    if (document.getElementById("sob-floating-cart")) return;

    const style = document.createElement("style");
    style.textContent = `
      #sob-floating-cart {
        position:fixed; right:24px; bottom:24px; z-index:60;
        background:var(--ink, #1A1410); color:var(--ivory, #F2ECE3);
        padding:14px 22px; border-radius:999px;
        font-family:'Inter',-apple-system,sans-serif;
        display:none; align-items:center; gap:14px;
        box-shadow:0 14px 36px rgba(26,20,16,.22), 0 4px 12px rgba(26,20,16,.12);
        text-decoration:none; cursor:pointer;
        transition:transform .25s cubic-bezier(.4,0,.2,1), background .2s, box-shadow .2s;
      }
      #sob-floating-cart.show { display:inline-flex; animation: sobFcIn .35s cubic-bezier(.2,.8,.2,1) }
      #sob-floating-cart:hover { transform:translateY(-2px); background:#5C1F25 }
      .sob-fc-dot { width:8px; height:8px; border-radius:50%; background:#C97B5C; flex:none }
      .sob-fc-text { display:flex; flex-direction:column; line-height:1.2 }
      .sob-fc-l { font-family:'JetBrains Mono','SF Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase; opacity:.7 }
      .sob-fc-r { font-size:14px; font-weight:600; letter-spacing:-.005em }
      .sob-fc-count { color:#C97B5C }
      .sob-fc-arrow { font-size:14px; opacity:.7; margin-left:2px }
      @keyframes sobFcIn { from { transform:translateY(24px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      @media (max-width:600px) {
        #sob-floating-cart { right:14px; bottom:14px; padding:12px 18px; gap:10px }
        .sob-fc-r { font-size:13px }
      }
    `;
    document.head.appendChild(style);

    const a = document.createElement("a");
    a.id = "sob-floating-cart";
    a.href = "cart.html";
    a.setAttribute("aria-label", "Перейти в корзину");
    a.innerHTML =
      '<span class="sob-fc-dot"></span>' +
      '<div class="sob-fc-text">' +
        '<span class="sob-fc-l">Корзина</span>' +
        '<span class="sob-fc-r"><span class="sob-fc-count">0</span> · <span class="sob-fc-sum">0&nbsp;₽</span></span>' +
      '</div>' +
      '<span class="sob-fc-arrow" aria-hidden="true">→</span>';
    document.body.appendChild(a);

    const $count = a.querySelector(".sob-fc-count");
    const $sum   = a.querySelector(".sob-fc-sum");

    function refresh() {
      const n = Cart.getItemCount();
      if (n <= 0) { a.classList.remove("show"); return; }
      a.classList.add("show");
      $count.textContent = n;
      $sum.innerHTML = Cart.formatPrice(Cart.getTotal()).replace(" ", "&nbsp;");
    }
    refresh();
    Cart.subscribe(refresh);
  }
})();
