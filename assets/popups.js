// СОБРАНО — system popups
// Два режима, управляются через window.SOBRANO_CONFIG (или через дефолты ниже).
// В будущем настройки придут с бэкенда: GET /api/settings → { offline, workingHours }
//
// 1) OFFLINE MODE — полноэкранный блокирующий оверлей. Не закрывается.
// 2) OUT-OF-HOURS — мягкий поп-ап. Сайт работает, но кнопки покупки перехватываются.
//
// Подключение: <script src="assets/popups.js" defer></script>
//
// Конфигурация (опционально, до подключения):
// window.SOBRANO_CONFIG = {
//   workingHours: { start: 9, end: 22, days: [0,1,2,3,4,5,6] }, // 0=вс, 6=сб
//   offline: { active: false, title: '...', message: '...', eta: '...', returnAt: 'YYYY-MM-DDTHH:MM' },
//   contacts: { telegram, whatsapp, phone, email },
//   force: { offline: false, outOfHours: false }  // для тестирования
// };

(function () {
  "use strict";

  const cfg = Object.assign(
    {
      workingHours: { start: 9, end: 22, days: [0, 1, 2, 3, 4, 5, 6] },
      offline: { active: false },
      contacts: {
        telegram: "https://t.me/sobrano",
        whatsapp: "https://wa.me/78000000000",
        phone: "+7 800 000-00-00",
        email: "hello@sobrano.store",
      },
      force: {},
    },
    window.SOBRANO_CONFIG || {}
  );

  // Cелекторы покупательских действий, которые нужно перехватывать вне рабочего времени
  const PURCHASE_SELECTORS = [
    'a[href$="cart.html"]',
    'a[href$="checkout.html"]',
    'a[href*="box.html?size=s"]',
    'a[href*="box.html?size=m"]',
    'a[href*="box.html?size=l"]',
    'a[href*="box.html?size=xl"]',
    'a[href="index.html#boxes"]',
    'a[href="#boxes"]',
    "[data-rtk-add]",
    ".choose",
    ".add-pick",
    ".add-btn",
    ".pay-cta",
    ".form-cta",
    ".s-cta:not(.disabled)",
    ".cart-cta",
    ".btn-xl",
    ".btn-primary",
  ].join(",");

  // ---------- CSS ----------
  const css = `
  .sb-modal-bd{
    position:fixed;inset:0;z-index:9500;
    background:rgba(15,11,8,.78);
    backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;opacity:0;transition:opacity .35s ease
  }
  .sb-modal-bd.show{opacity:1}
  .sb-modal{
    position:relative;background:#F2ECE3;color:#1A1410;
    border-radius:24px;width:min(560px,100%);
    padding:clamp(36px,5vw,56px);
    box-shadow:0 40px 80px -20px rgba(0,0,0,.55);
    transform:translateY(20px) scale(.98);transition:transform .45s cubic-bezier(.2,.6,.2,1);
    font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;
    overflow:hidden
  }
  .sb-modal-bd.show .sb-modal{transform:translateY(0) scale(1)}
  .sb-modal::before{
    content:"";position:absolute;inset:0;
    background:radial-gradient(ellipse at 80% 0%, rgba(201,123,92,.18), transparent 55%);
    pointer-events:none
  }
  .sb-modal *{position:relative}
  .sb-modal .eyebrow{
    display:inline-flex;align-items:center;gap:10px;
    font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#3A2D24
  }
  .sb-modal .eyebrow .dot{
    width:10px;height:10px;border-radius:50%;background:#C97B5C;
    box-shadow:0 0 0 0 rgba(201,123,92,.6);animation:sbPulse 2s infinite
  }
  .sb-modal .eyebrow .dot.red{background:#5C1F25}
  .sb-modal .eyebrow .dot.red{box-shadow:0 0 0 0 rgba(92,31,37,.6)}
  @keyframes sbPulse{
    0%{box-shadow:0 0 0 0 rgba(201,123,92,.6)}
    70%{box-shadow:0 0 0 12px rgba(201,123,92,0)}
    100%{box-shadow:0 0 0 0 rgba(201,123,92,0)}
  }
  .sb-modal h2{
    font-family:'Fraunces',Georgia,serif;font-weight:300;
    font-size:clamp(34px,5vw,52px);line-height:1.05;letter-spacing:-.02em;
    margin:18px 0 18px;color:#1A1410
  }
  .sb-modal h2 em{font-style:italic;color:#5C1F25;font-weight:400}
  .sb-modal p{font-size:15px;line-height:1.6;color:#3A2D24;margin-bottom:14px;max-width:46ch}
  .sb-modal p strong{color:#1A1410;font-weight:600}
  .sb-modal .stat-card{
    background:#1A1410;color:#F2ECE3;border-radius:16px;padding:22px 24px;margin:24px 0 28px;
    display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center
  }
  .sb-modal .stat-card .l{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,236,227,.65)}
  .sb-modal .stat-card .v{font-family:'Fraunces',Georgia,serif;font-size:30px;letter-spacing:-.02em;font-weight:300;line-height:1;margin-top:6px}
  .sb-modal .stat-card .v em{font-style:italic;color:#C97B5C;font-weight:400}
  .sb-modal .stat-card .ic{
    width:46px;height:46px;border-radius:12px;background:#C97B5C;color:#1A1410;
    display:flex;align-items:center;justify-content:center;
    font-family:'Fraunces',Georgia,serif;font-size:18px;font-weight:500;flex:none
  }
  .sb-modal .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
  .sb-btn{
    display:inline-flex;align-items:center;gap:10px;
    padding:14px 22px;border-radius:999px;
    font-size:14px;font-weight:500;font-family:inherit;
    cursor:pointer;border:0;transition:all .2s
  }
  .sb-btn-primary{background:#1A1410;color:#F2ECE3}
  .sb-btn-primary:hover{background:#5C1F25;transform:translateY(-1px)}
  .sb-btn-ghost{background:transparent;color:#1A1410;border:1px solid rgba(26,20,16,.28)}
  .sb-btn-ghost:hover{border-color:#1A1410;background:#E8DDD0}
  .sb-modal-close{
    position:absolute;top:16px;right:16px;
    width:36px;height:36px;border-radius:50%;background:#E8DDD0;color:#1A1410;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;cursor:pointer;transition:all .2s;border:0
  }
  .sb-modal-close:hover{background:#1A1410;color:#F2ECE3}
  .sb-modal .channels{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .sb-modal .channels a{
    display:inline-flex;align-items:center;gap:8px;
    padding:10px 14px;border-radius:999px;
    background:#E8DDD0;color:#1A1410;
    font-size:13px;font-weight:500;text-decoration:none;
    transition:all .2s
  }
  .sb-modal .channels a:hover{background:#1A1410;color:#F2ECE3}
  .sb-modal .channels .ic{
    width:24px;height:24px;border-radius:50%;background:#1A1410;color:#C97B5C;
    display:flex;align-items:center;justify-content:center;
    font-family:'Fraunces',Georgia,serif;font-size:12px;font-weight:500
  }
  .sb-modal .channels a:hover .ic{background:#F2ECE3;color:#1A1410}

  /* OFFLINE — full-screen, non-dismissible */
  .sb-offline-bd{
    position:fixed;inset:0;z-index:9700;
    background:#0F0B08;
    background-image:
      radial-gradient(ellipse at 25% 30%, rgba(92,31,37,.55), transparent 55%),
      radial-gradient(ellipse at 80% 70%, rgba(201,123,92,.18), transparent 50%);
    color:#F2ECE3;
    display:flex;align-items:center;justify-content:center;
    padding:24px;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;
    overflow:hidden;opacity:0;transition:opacity .6s ease
  }
  .sb-offline-bd.show{opacity:1}
  .sb-offline-bd::before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background-image:radial-gradient(circle at 1px 1px, rgba(242,236,227,.06) 1px, transparent 0);
    background-size:32px 32px;
    mask-image:linear-gradient(to bottom, black, transparent);
    -webkit-mask-image:linear-gradient(to bottom, black, transparent)
  }
  .sb-offline{position:relative;max-width:680px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:24px}
  .sb-offline-mark{
    width:60px;height:60px;border-radius:50%;background:#5C1F25;
    position:relative;flex:none;
    box-shadow:0 0 60px rgba(92,31,37,.6)
  }
  .sb-offline-mark::after{
    content:"";position:absolute;inset:12px;border-radius:50%;
    background:radial-gradient(circle at 35% 35%, #C97B5C, #5C1F25 70%)
  }
  .sb-offline .eyebrow{
    display:inline-flex;align-items:center;gap:10px;
    font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,236,227,.65)
  }
  .sb-offline .eyebrow::before{content:"";width:24px;height:1px;background:rgba(242,236,227,.55)}
  .sb-offline h1{
    font-family:'Fraunces',Georgia,serif;font-weight:300;
    font-size:clamp(48px,8vw,108px);line-height:.95;letter-spacing:-.03em;
    color:#F2ECE3
  }
  .sb-offline h1 em{font-style:italic;color:#C97B5C;font-weight:400}
  .sb-offline p{
    font-size:clamp(15px,1.4vw,17px);line-height:1.6;
    color:rgba(242,236,227,.78);max-width:48ch;margin:0
  }
  .sb-offline .eta{
    display:inline-flex;align-items:center;gap:14px;
    background:rgba(242,236,227,.08);border:1px solid rgba(242,236,227,.2);
    border-radius:999px;padding:12px 22px;
    font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,236,227,.65)
  }
  .sb-offline .eta strong{
    font-family:'Fraunces',Georgia,serif;font-style:italic;
    font-size:18px;letter-spacing:-.005em;color:#C97B5C;font-weight:400;text-transform:none
  }
  .sb-offline .channels{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px}
  .sb-offline .channels a{
    display:inline-flex;align-items:center;gap:10px;
    padding:14px 22px;border-radius:999px;
    background:#F2ECE3;color:#1A1410;
    font-size:14px;font-weight:500;text-decoration:none;transition:all .25s
  }
  .sb-offline .channels a:hover{background:#C97B5C;color:#1A1410;transform:translateY(-2px)}
  .sb-offline .channels a.ghost{background:transparent;color:#F2ECE3;border:1px solid rgba(242,236,227,.25)}
  .sb-offline .channels a.ghost:hover{background:rgba(242,236,227,.06);border-color:rgba(242,236,227,.5)}
  .sb-offline .channels .ic{
    width:26px;height:26px;border-radius:50%;background:#1A1410;color:#C97B5C;
    display:flex;align-items:center;justify-content:center;
    font-family:'Fraunces',Georgia,serif;font-size:14px;font-weight:500
  }
  .sb-offline .channels a.ghost .ic{background:rgba(242,236,227,.12);color:#C97B5C}
  .sb-offline .channels a:hover .ic{background:#1A1410;color:#F2ECE3}
  .sb-offline-foot{
    margin-top:16px;font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,236,227,.45)
  }
  body.sb-locked{overflow:hidden}

  @media (max-width:680px){
    .sb-modal{padding:32px 24px}
    .sb-offline h1{font-size:48px}
  }
  `;

  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- helpers ----------
  function isWithinWorkingHours() {
    if (cfg.force.outOfHours) return false;
    if (cfg.force.workingHours) return true;
    const wh = cfg.workingHours;
    if (!wh) return true;
    const now = new Date();
    const day = now.getDay();
    if (wh.days && wh.days.indexOf(day) === -1) return false;
    const hour = now.getHours() + now.getMinutes() / 60;
    return hour >= wh.start && hour < wh.end;
  }

  function isOffline() {
    if (cfg.force.offline) return true;
    return !!(cfg.offline && cfg.offline.active);
  }

  function nextOpenLabel() {
    const wh = cfg.workingHours;
    if (!wh) return "";
    const now = new Date();
    const target = new Date();
    target.setHours(wh.start, 0, 0, 0);
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    while (wh.days && wh.days.indexOf(target.getDay()) === -1) {
      target.setDate(target.getDate() + 1);
    }
    const diffMs = target - now;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    const sameDay = target.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = target.toDateString() === tomorrow.toDateString();
    const time = `${String(target.getHours()).padStart(2, "0")}:00`;
    let when;
    if (sameDay) when = `сегодня в ${time}`;
    else if (isTomorrow) when = `завтра в ${time}`;
    else when = `${days[target.getDay()]} в ${time}`;
    return { when, hours, minutes, target };
  }

  function nowLabel() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  // ---------- OFFLINE OVERLAY ----------
  function showOffline() {
    if (document.getElementById("sb-offline-bd")) return;
    const off = cfg.offline || {};
    const c = cfg.contacts || {};

    const bd = document.createElement("div");
    bd.id = "sb-offline-bd";
    bd.className = "sb-offline-bd";
    bd.setAttribute("role", "alertdialog");
    bd.setAttribute("aria-modal", "true");
    bd.setAttribute("aria-label", "Сайт временно недоступен");

    const eta = off.returnAt
      ? formatReturnAt(off.returnAt)
      : off.eta || null;

    bd.innerHTML = `
      <div class="sb-offline">
        <span class="sb-offline-mark"></span>
        <span class="eyebrow">Системное сообщение</span>
        <h1>Сайт<br><em>${escape(off.title || "временно недоступен")}</em>.</h1>
        <p>${escape(off.message || "Идут технические работы. Заказы временно не принимаются. Мы скоро вернёмся — спасибо за терпение.")}</p>
        ${eta ? `<div class="eta">Вернёмся <strong>${escape(eta)}</strong></div>` : ""}
        <div class="channels">
          ${c.telegram ? `<a href="${escape(c.telegram)}" target="_blank" rel="noopener"><span class="ic">T</span>Telegram</a>` : ""}
          ${c.whatsapp ? `<a class="ghost" href="${escape(c.whatsapp)}" target="_blank" rel="noopener"><span class="ic">W</span>WhatsApp</a>` : ""}
          ${c.phone ? `<a class="ghost" href="tel:${escape(c.phone.replace(/\D/g, ""))}"><span class="ic">☎</span>${escape(c.phone)}</a>` : ""}
        </div>
        <div class="sb-offline-foot">© Сайт ИП Горбулёв · мы на связи в чатах</div>
      </div>
    `;

    document.body.appendChild(bd);
    document.body.classList.add("sb-locked");
    requestAnimationFrame(() => bd.classList.add("show"));

    // Block keyboard escape and any backdrop click
    bd.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", function blockKeys(e) {
      if (e.key === "Escape") e.preventDefault();
    }, true);
  }

  function formatReturnAt(iso) {
    try {
      const t = new Date(iso);
      const now = new Date();
      const sameDay = t.toDateString() === now.toDateString();
      const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      if (sameDay) return `сегодня в ${time}`;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (t.toDateString() === tomorrow.toDateString()) return `завтра в ${time}`;
      return `${t.getDate()}.${String(t.getMonth() + 1).padStart(2, "0")} в ${time}`;
    } catch (e) {
      return iso;
    }
  }

  // ---------- OUT-OF-HOURS MODAL ----------
  function showOutOfHours() {
    let bd = document.getElementById("sb-ooh-bd");
    if (bd) {
      bd.classList.add("show");
      return;
    }
    const wh = cfg.workingHours;
    const c = cfg.contacts || {};
    const next = nextOpenLabel();

    bd = document.createElement("div");
    bd.id = "sb-ooh-bd";
    bd.className = "sb-modal-bd";
    bd.setAttribute("role", "dialog");
    bd.setAttribute("aria-modal", "true");
    bd.setAttribute("aria-label", "Магазин закрыт");

    bd.innerHTML = `
      <div class="sb-modal">
        <button class="sb-modal-close" aria-label="Закрыть" type="button">×</button>
        <span class="eyebrow"><span class="dot red"></span>Сейчас ${escape(nowLabel())} · магазин закрыт</span>
        <h2>Мы работаем<br>с <em>${wh.start}:00 до ${wh.end}:00</em>.</h2>
        <p>Сейчас вне рабочего времени — заказы не принимаем, чтобы букеты доезжали свежими и в нужное вам время. <strong>Откроемся ${escape(next.when)}</strong>${next.hours > 0 || next.minutes > 0 ? ` — через ${next.hours} ч ${next.minutes} мин` : ""}.</p>

        <div class="stat-card">
          <div>
            <div class="l">До открытия осталось</div>
            <div class="v"><em>${next.hours}</em> ч <em>${next.minutes}</em> мин</div>
          </div>
          <span class="ic">⏱</span>
        </div>

        <p>Можно оставить заявку — флорист перезвонит утром. Или написать в Telegram: бот примет сообщение, мы обработаем с открытия.</p>

        <div class="channels">
          ${c.telegram ? `<a href="${escape(c.telegram)}" target="_blank" rel="noopener"><span class="ic">T</span>Telegram</a>` : ""}
          ${c.whatsapp ? `<a href="${escape(c.whatsapp)}" target="_blank" rel="noopener"><span class="ic">W</span>WhatsApp</a>` : ""}
          ${c.email ? `<a href="mailto:${escape(c.email)}"><span class="ic">@</span>Email</a>` : ""}
        </div>

        <div class="actions" style="margin-top:24px">
          <a href="contacts.html" class="sb-btn sb-btn-primary">Оставить заявку <span aria-hidden="true">→</span></a>
          <button class="sb-btn sb-btn-ghost" data-sb-close type="button">Понятно</button>
        </div>
      </div>
    `;

    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add("show"));

    function close() {
      bd.classList.remove("show");
      setTimeout(() => bd.remove(), 350);
    }
    bd.querySelector(".sb-modal-close").addEventListener("click", close);
    bd.querySelector("[data-sb-close]").addEventListener("click", close);
    bd.addEventListener("click", (e) => {
      if (e.target === bd) close();
    });
    document.addEventListener("keydown", function escListener(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escListener);
      }
    });
  }

  // ---------- click interceptor ----------
  function shouldIntercept(target) {
    if (!target) return false;
    if (target.closest('[data-sb-allow="1"]')) return false;
    return target.matches(PURCHASE_SELECTORS) || !!target.closest(PURCHASE_SELECTORS);
  }

  function interceptPurchase(e) {
    if (e.defaultPrevented) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (!shouldIntercept(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    showOutOfHours();
  }

  function attachInterceptor() {
    document.addEventListener("click", interceptPurchase, true);
    // Also intercept form submits on cart/checkout pages
    const path = (location.pathname.split("/").pop() || "").toLowerCase();
    if (path.includes("checkout") || path.includes("cart")) {
      document.addEventListener("submit", function (e) {
        e.preventDefault();
        showOutOfHours();
      }, true);
    }
  }

  function escape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------- public API ----------
  window.SOBRANO = window.SOBRANO || {};
  window.SOBRANO.showOutOfHours = showOutOfHours;
  window.SOBRANO.showOffline = showOffline;
  window.SOBRANO.refresh = function () {
    if (isOffline()) showOffline();
    else if (!isWithinWorkingHours()) attachInterceptor();
  };

  // ---------- init ----------
  function init() {
    injectStyles();
    if (isOffline()) {
      showOffline();
      return;
    }
    if (!isWithinWorkingHours()) {
      attachInterceptor();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
