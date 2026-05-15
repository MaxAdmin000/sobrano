// Morphing-кнопка «Получить консультацию» — fixed bottom-left на всех публичных страницах
// (кроме чекаута и thank-you). При клике плавно морфит в панель с 4 каналами связи:
// Telegram / WhatsApp / Телефон / Email. Контакты подтягиваются из SOBRANO_CONFIG.contacts.
(function () {
  const SKIP_PATHS = /\/(checkout|thank-you)\.html?$/i;
  if (SKIP_PATHS.test(location.pathname)) return;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    // Прячем старый float-consult (если на странице ещё лежит legacy-ссылка на contacts.html)
    document.querySelectorAll(".float-consult").forEach((el) => el.remove());

    const cfg = window.SOBRANO_CONFIG || {};
    const c = cfg.contacts || {};

    const channels = [];
    if (c.telegram) channels.push({ key: "telegram", label: "Telegram",  hint: "@sobrano",          href: c.telegram, target: "_blank", rel: "noopener" });
    if (c.whatsapp) channels.push({ key: "whatsapp", label: "WhatsApp",  hint: "Чат за минуту",      href: c.whatsapp, target: "_blank", rel: "noopener" });
    if (c.phone)    channels.push({ key: "phone",    label: "Позвонить", hint: c.phone,              href: "tel:" + String(c.phone).replace(/[^+\d]/g, "") });
    if (c.email)    channels.push({ key: "email",    label: "Написать",  hint: c.email,              href: "mailto:" + c.email });

    if (!channels.length) return;

    // ---- styles ----
    const css = `
      .sob-consult {
        position:fixed; left:24px; bottom:24px; z-index:60;
        background:var(--ivory, #F2ECE3); color:var(--ink, #1A1410);
        border:1px solid var(--line-strong, rgba(26,20,16,.28));
        border-radius:999px; padding:14px 22px;
        font-family:'Inter',-apple-system,sans-serif;
        box-shadow:0 14px 36px rgba(26,20,16,.18), 0 4px 12px rgba(26,20,16,.10);
        cursor:pointer;
        display:flex; flex-direction:column; align-items:flex-start;
        width:auto; min-width:240px; max-width:240px;
        overflow:hidden;
        transition:
          border-radius .42s cubic-bezier(.2,.8,.2,1),
          padding .42s cubic-bezier(.2,.8,.2,1),
          max-width .42s cubic-bezier(.2,.8,.2,1),
          background .35s ease,
          box-shadow .42s ease;
      }
      .sob-consult.open {
        border-radius:22px;
        padding:18px;
        max-width:320px;
        background:#FFFFFF;
        box-shadow:0 24px 60px rgba(26,20,16,.24), 0 8px 18px rgba(26,20,16,.14);
        cursor:default;
      }
      .sob-consult-head {
        display:flex; align-items:center; gap:14px; width:100%;
        font-size:14px; font-weight:500; line-height:1;
      }
      .sob-consult-pulse {
        width:10px; height:10px; border-radius:50%; background:#8C9A7B;
        flex:none; position:relative;
      }
      .sob-consult-pulse::after {
        content:""; position:absolute; inset:-4px; border-radius:50%;
        border:1px solid rgba(140,154,123,.5);
        animation: sobPulse 1.8s ease-out infinite;
      }
      @keyframes sobPulse { 0%{transform:scale(.6);opacity:1} 100%{transform:scale(2);opacity:0} }
      .sob-consult-title { flex:1; }
      .sob-consult-close {
        display:none; width:24px; height:24px; border-radius:50%;
        background:transparent; align-items:center; justify-content:center;
        color:#7A6B5E; font-size:16px; line-height:1; cursor:pointer; flex:none;
        transition:background .15s, color .15s;
      }
      .sob-consult-close:hover { background:rgba(26,20,16,.08); color:#1A1410 }
      .sob-consult.open .sob-consult-close { display:flex }
      .sob-consult.open .sob-consult-pulse { display:none }

      .sob-consult-list {
        display:grid; gap:6px;
        max-height:0; opacity:0;
        margin-top:0;
        overflow:hidden;
        transition: max-height .42s cubic-bezier(.2,.8,.2,1), opacity .25s ease, margin-top .42s cubic-bezier(.2,.8,.2,1);
      }
      .sob-consult.open .sob-consult-list {
        max-height:420px; opacity:1; margin-top:14px;
        transition-delay: .12s, .18s, .12s;
      }
      .sob-consult-item {
        display:flex; align-items:center; gap:14px;
        padding:12px 14px; border-radius:14px;
        background:#F2ECE3; color:#1A1410;
        text-decoration:none;
        transition:background .15s, transform .15s;
      }
      .sob-consult-item:hover { background:#E8DDD0; transform:translateX(2px) }
      .sob-consult-icon {
        width:36px; height:36px; border-radius:50%; flex:none;
        display:flex; align-items:center; justify-content:center;
        font-family:'JetBrains Mono','SF Mono',monospace;
        font-size:11px; letter-spacing:.04em; font-weight:600;
        color:#F2ECE3; background:#1A1410;
      }
      .sob-consult-icon.telegram { background:#229ED9 }
      .sob-consult-icon.whatsapp { background:#25D366 }
      .sob-consult-icon.phone    { background:#5C1F25; color:#F2ECE3 }
      .sob-consult-icon.email    { background:#C97B5C }
      .sob-consult-meta { display:flex; flex-direction:column; line-height:1.25; min-width:0; flex:1 }
      .sob-consult-meta .l { font-size:14px; font-weight:500 }
      .sob-consult-meta .h { font-size:12px; color:#7A6B5E; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

      @media (max-width:600px) {
        .sob-consult { left:14px; bottom:14px; padding:12px 18px; min-width:auto; max-width:200px }
        .sob-consult.open { max-width:calc(100vw - 28px) }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ---- DOM ----
    const root = document.createElement("div");
    root.className = "sob-consult";
    root.setAttribute("role", "complementary");
    root.setAttribute("aria-label", "Консультация");
    root.innerHTML =
      '<div class="sob-consult-head">' +
        '<span class="sob-consult-pulse" aria-hidden="true"></span>' +
        '<span class="sob-consult-title">Получить консультацию</span>' +
        '<button class="sob-consult-close" type="button" aria-label="Закрыть">×</button>' +
      '</div>' +
      '<div class="sob-consult-list" role="list">' +
        channels.map((ch) => {
          const tgt = ch.target ? ' target="' + ch.target + '"' : "";
          const rel = ch.rel ? ' rel="' + ch.rel + '"' : "";
          return '<a class="sob-consult-item" role="listitem" href="' + ch.href + '"' + tgt + rel + '>' +
            '<span class="sob-consult-icon ' + ch.key + '">' + iconFor(ch.key) + '</span>' +
            '<span class="sob-consult-meta">' +
              '<span class="l">' + ch.label + '</span>' +
              '<span class="h">' + ch.hint + '</span>' +
            '</span>' +
          '</a>';
        }).join("") +
      '</div>';
    document.body.appendChild(root);

    // ---- behavior ----
    const head = root.querySelector(".sob-consult-head");
    const closeBtn = root.querySelector(".sob-consult-close");

    function open() { root.classList.add("open"); document.addEventListener("click", outside, true); }
    function close() { root.classList.remove("open"); document.removeEventListener("click", outside, true); }
    function outside(e) { if (!root.contains(e.target)) close(); }

    head.addEventListener("click", (e) => {
      if (e.target.closest(".sob-consult-close")) return;
      if (root.classList.contains("open")) close();
      else open();
    });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });

  function iconFor(key) {
    if (key === "telegram") return "TG";
    if (key === "whatsapp") return "WA";
    if (key === "phone")    return "TEL";
    if (key === "email")    return "@";
    return "·";
  }
})();
