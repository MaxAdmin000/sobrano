// Speed-dial consult — фиксированная круглая кнопка в левом нижнем углу.
// Клик: четыре круглых иконки каналов (Telegram / WhatsApp / Phone / Email)
// разлетаются стопкой вверх над кнопкой, без сопровождающего текста.
// Линки берутся из SOBRANO_CONFIG.contacts. Скрыта на checkout / thank-you.
(function () {
  const SKIP_PATHS = /\/(checkout|thank-you)\.html?$/i;
  if (SKIP_PATHS.test(location.pathname)) return;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    // Прячем старый <a class="float-consult"> (на index.html ещё валяется как legacy)
    document.querySelectorAll(".float-consult").forEach((el) => el.remove());

    const cfg = window.SOBRANO_CONFIG || {};
    const c = cfg.contacts || {};

    const channels = [];
    if (c.telegram) channels.push({ key: "telegram", label: "Telegram",  href: c.telegram, target: "_blank", rel: "noopener" });
    if (c.whatsapp) channels.push({ key: "whatsapp", label: "WhatsApp",  href: c.whatsapp, target: "_blank", rel: "noopener" });
    if (c.phone)    channels.push({ key: "phone",    label: "Позвонить", href: "tel:" + String(c.phone).replace(/[^+\d]/g, "") });
    if (c.email)    channels.push({ key: "email",    label: "Email",     href: "mailto:" + c.email });

    if (!channels.length) return;

    // ---- styles ----
    const css = `
      .sob-consult {
        position:fixed; left:24px; bottom:24px; z-index:60;
        display:flex; flex-direction:column-reverse; align-items:center; gap:10px;
      }
      .sob-consult-fab {
        width:56px; height:56px; border-radius:50%;
        background:var(--ink, #1A1410); color:var(--ivory, #F2ECE3);
        display:flex; align-items:center; justify-content:center;
        border:0; cursor:pointer;
        box-shadow:0 14px 36px rgba(26,20,16,.22), 0 4px 12px rgba(26,20,16,.12);
        transition:background .25s ease, transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease;
      }
      .sob-consult-fab:hover { background:#5C1F25; transform:translateY(-2px) }
      .sob-consult.open .sob-consult-fab { background:#5C1F25 }
      /* Crossfade между основной иконкой (headset+chat) и крестиком при открытии. */
      .sob-consult-fab .ic { position:absolute; width:24px; height:24px; transition:opacity .22s ease, transform .32s cubic-bezier(.2,.8,.2,1) }
      .sob-consult-fab .ic-default { opacity:1; transform:scale(1) rotate(0) }
      .sob-consult-fab .ic-close   { opacity:0; transform:scale(.6) rotate(-90deg) }
      .sob-consult.open .sob-consult-fab .ic-default { opacity:0; transform:scale(.6) rotate(90deg) }
      .sob-consult.open .sob-consult-fab .ic-close   { opacity:1; transform:scale(1) rotate(0) }
      .sob-consult-fab::after {
        content:""; position:absolute; width:10px; height:10px; border-radius:50%;
        background:#8C9A7B; top:6px; right:6px;
        box-shadow:0 0 0 0 rgba(140,154,123,.55);
        animation: sobConsultPulse 1.8s ease-out infinite;
      }
      .sob-consult.open .sob-consult-fab::after { display:none }
      @keyframes sobConsultPulse {
        0%   { box-shadow:0 0 0 0 rgba(140,154,123,.55) }
        70%  { box-shadow:0 0 0 12px rgba(140,154,123,0) }
        100% { box-shadow:0 0 0 0 rgba(140,154,123,0) }
      }

      .sob-consult-item {
        width:44px; height:44px; border-radius:50%; flex:none;
        display:flex; align-items:center; justify-content:center;
        text-decoration:none;
        font-family:'JetBrains Mono','SF Mono',monospace;
        font-size:11px; font-weight:600; letter-spacing:.04em;
        color:#F2ECE3;
        box-shadow:0 10px 24px rgba(26,20,16,.16), 0 2px 6px rgba(26,20,16,.10);
        opacity:0; pointer-events:none;
        transform:translateY(20px) scale(.7);
        transition:opacity .28s ease, transform .32s cubic-bezier(.2,.8,.2,1), box-shadow .2s;
      }
      .sob-consult-item:hover { transform:translateY(-2px) scale(1.06) }
      .sob-consult.open .sob-consult-item { opacity:1; transform:translateY(0) scale(1); pointer-events:auto }

      /* Stagger: ближайший к FAB выходит первым */
      .sob-consult.open .sob-consult-item:nth-of-type(1) { transition-delay: 0s }
      .sob-consult.open .sob-consult-item:nth-of-type(2) { transition-delay: .05s }
      .sob-consult.open .sob-consult-item:nth-of-type(3) { transition-delay: .10s }
      .sob-consult.open .sob-consult-item:nth-of-type(4) { transition-delay: .15s }

      .sob-consult-item.telegram { background:#229ED9 }
      .sob-consult-item.whatsapp { background:#25D366 }
      .sob-consult-item.phone    { background:#5C1F25 }
      .sob-consult-item.email    { background:#C97B5C }

      .sob-consult-fab { position:relative }

      @media (max-width:600px) {
        .sob-consult { left:14px; bottom:14px }
        .sob-consult-fab { width:52px; height:52px }
        .sob-consult-item { width:42px; height:42px }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ---- DOM ----
    // column-reverse: первый ребёнок в HTML — самый нижний визуально (= FAB).
    const root = document.createElement("div");
    root.className = "sob-consult";
    root.setAttribute("role", "complementary");
    root.setAttribute("aria-label", "Связаться");

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "sob-consult-fab";
    fab.setAttribute("aria-label", "Связаться");
    fab.setAttribute("aria-expanded", "false");
    // Основная иконка — headset с речевым облачком (call-center support).
    // При .open плавно crossfade'ит в крестик.
    fab.innerHTML =
      // headset+chat
      '<svg class="ic ic-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        // Speech bubble (rounded rect с хвостом нижний-левый)
        '<path d="M21 7H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1.5v3l4-3H21a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/>' +
        // Headset arc (поверх и выходит вверх из bubble)
        '<path d="M6 11V9a6 6 0 0 1 12 0v2"/>' +
        // Ear caps
        '<rect x="5" y="9" width="2.2" height="4.5" rx="1"/>' +
        '<rect x="16.8" y="9" width="2.2" height="4.5" rx="1"/>' +
        // Mic stem от правого уха вниз и к подбородку
        '<path d="M17.5 13.5v1.5a3 3 0 0 1-3 3h-1.5"/>' +
        // Mic dot
        '<circle cx="11" cy="18" r="1"/>' +
        // 3 точки внутри облака
        '<circle cx="9"  cy="14" r=".5" fill="currentColor" stroke="none"/>' +
        '<circle cx="12" cy="14" r=".5" fill="currentColor" stroke="none"/>' +
        '<circle cx="15" cy="14" r=".5" fill="currentColor" stroke="none"/>' +
      '</svg>' +
      // crossfade в крестик при открытии
      '<svg class="ic ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '</svg>';
    root.appendChild(fab);

    // Каналы — добавляем после FAB, чтобы они оказались выше него визуально (column-reverse).
    channels.forEach((ch) => {
      const a = document.createElement("a");
      a.className = "sob-consult-item " + ch.key;
      a.href = ch.href;
      if (ch.target) a.target = ch.target;
      if (ch.rel) a.rel = ch.rel;
      a.setAttribute("aria-label", ch.label);
      a.textContent = iconText(ch.key);
      root.appendChild(a);
    });

    document.body.appendChild(root);

    // ---- behavior ----
    function open()  { root.classList.add("open");    fab.setAttribute("aria-expanded", "true");  document.addEventListener("click", outside, true); }
    function close() { root.classList.remove("open"); fab.setAttribute("aria-expanded", "false"); document.removeEventListener("click", outside, true); }
    function outside(e) { if (!root.contains(e.target)) close(); }

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (root.classList.contains("open")) close();
      else open();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });

  function iconText(key) {
    if (key === "telegram") return "TG";
    if (key === "whatsapp") return "WA";
    if (key === "phone")    return "TEL";
    if (key === "email")    return "@";
    return "·";
  }
})();
