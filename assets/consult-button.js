// Speed-dial consult — фиксированная круглая кнопка в левом нижнем углу.
// Клик: круглые иконки каналов разлетаются стопкой вверх. Каналы и их иконки
// тянем из публичного `/api/channels` (управляется админкой → Каталог → Каналы).
// Фоллбэк — `SOBRANO_CONFIG.contacts` (4 hardcoded канала), если API недоступен.
// Скрыта на checkout / thank-you.
(function () {
  const SKIP_PATHS = /\/(checkout|thank-you)\.html?$/i;
  if (SKIP_PATHS.test(location.pathname)) return;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  // Нормализованный канал: { title, href, icon, glyph, color }
  function fromApi(c) {
    return {
      title: c.title || c.id,
      href:  c.href || "",
      icon:  c.icon || "",
      glyph: c.glyph || "·",
      color: c.color || "#1A1410",
    };
  }
  function fromConfig() {
    const cfg = window.SOBRANO_CONFIG || {};
    const c = cfg.contacts || {};
    const out = [];
    if (c.telegram) out.push({ title:"Telegram", href:c.telegram,                                          icon:"", glyph:"TG",  color:"#229ED9" });
    if (c.whatsapp) out.push({ title:"WhatsApp", href:c.whatsapp,                                          icon:"", glyph:"WA",  color:"#25D366" });
    if (c.phone)    out.push({ title:"Телефон",  href:"tel:" + String(c.phone).replace(/[^+\d]/g, ""),    icon:"", glyph:"TEL", color:"#5C1F25" });
    if (c.email)    out.push({ title:"Email",    href:"mailto:" + c.email,                                 icon:"", glyph:"@",   color:"#C97B5C" });
    return out;
  }

  async function loadChannels() {
    try {
      const r = await fetch("/api/channels", { credentials: "same-origin" });
      if (r.ok) {
        const data = await r.json();
        if (data && data.ok && Array.isArray(data.channels) && data.channels.length) {
          return data.channels.map(fromApi).filter((x) => x.href);
        }
      }
    } catch (e) { /* fall through */ }
    return fromConfig();
  }

  ready(async () => {
    // Прячем старый <a class="float-consult"> (на index.html ещё валяется как legacy)
    document.querySelectorAll(".float-consult").forEach((el) => el.remove());

    const channels = await loadChannels();
    if (!channels.length) return;

    injectStyles();
    mount(channels);
  });

  function injectStyles() {
    if (document.getElementById("sob-consult-style")) return;
    const css = `
      .sob-consult {
        position:fixed; left:24px; bottom:24px; z-index:60;
        display:flex; flex-direction:column-reverse; align-items:center; gap:10px;
      }
      .sob-consult-fab {
        position:relative;
        width:56px; height:56px; border-radius:50%;
        background:var(--ink, #1A1410); color:var(--ivory, #F2ECE3);
        display:flex; align-items:center; justify-content:center;
        border:0; cursor:pointer;
        box-shadow:0 14px 36px rgba(26,20,16,.22), 0 4px 12px rgba(26,20,16,.12);
        transition:background .25s ease, transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease;
      }
      .sob-consult-fab:hover { background:#5C1F25; transform:translateY(-2px) }
      .sob-consult.open .sob-consult-fab { background:#5C1F25 }
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
        overflow:hidden;
      }
      .sob-consult-item:hover { transform:translateY(-2px) scale(1.06) }
      .sob-consult-item img { width:60%; height:60%; object-fit:contain; display:block }
      .sob-consult.open .sob-consult-item { opacity:1; transform:translateY(0) scale(1); pointer-events:auto }
      .sob-consult.open .sob-consult-item:nth-of-type(1) { transition-delay: 0s }
      .sob-consult.open .sob-consult-item:nth-of-type(2) { transition-delay: .05s }
      .sob-consult.open .sob-consult-item:nth-of-type(3) { transition-delay: .10s }
      .sob-consult.open .sob-consult-item:nth-of-type(4) { transition-delay: .15s }
      .sob-consult.open .sob-consult-item:nth-of-type(5) { transition-delay: .20s }
      .sob-consult.open .sob-consult-item:nth-of-type(6) { transition-delay: .25s }
      .sob-consult.open .sob-consult-item:nth-of-type(7) { transition-delay: .30s }
      .sob-consult.open .sob-consult-item:nth-of-type(8) { transition-delay: .35s }

      @media (max-width:600px) {
        .sob-consult { left:14px; bottom:14px }
        .sob-consult-fab { width:52px; height:52px }
        .sob-consult-item { width:42px; height:42px }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = "sob-consult-style";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function mount(channels) {
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
    fab.innerHTML =
      '<svg class="ic ic-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 7H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1.5v3l4-3H21a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/>' +
        '<path d="M6 11V9a6 6 0 0 1 12 0v2"/>' +
        '<rect x="5" y="9" width="2.2" height="4.5" rx="1"/>' +
        '<rect x="16.8" y="9" width="2.2" height="4.5" rx="1"/>' +
        '<path d="M17.5 13.5v1.5a3 3 0 0 1-3 3h-1.5"/>' +
        '<circle cx="11" cy="18" r="1"/>' +
        '<circle cx="9"  cy="14" r=".5" fill="currentColor" stroke="none"/>' +
        '<circle cx="12" cy="14" r=".5" fill="currentColor" stroke="none"/>' +
        '<circle cx="15" cy="14" r=".5" fill="currentColor" stroke="none"/>' +
      '</svg>' +
      '<svg class="ic ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '</svg>';
    root.appendChild(fab);

    channels.forEach((ch) => {
      const a = document.createElement("a");
      a.className = "sob-consult-item";
      a.style.background = ch.color || "#1A1410";
      a.href = ch.href;
      // Внешние ссылки (http/https/?:// в начале) открываем в новой вкладке
      if (/^https?:\/\//i.test(ch.href)) { a.target = "_blank"; a.rel = "noopener"; }
      a.setAttribute("aria-label", ch.title);
      a.title = ch.title;
      if (ch.icon) {
        const img = document.createElement("img");
        img.src = ch.icon;
        img.alt = "";
        a.appendChild(img);
      } else {
        a.textContent = ch.glyph || "·";
      }
      root.appendChild(a);
    });

    document.body.appendChild(root);

    function open()  { root.classList.add("open");    fab.setAttribute("aria-expanded", "true");  document.addEventListener("click", outside, true); }
    function close() { root.classList.remove("open"); fab.setAttribute("aria-expanded", "false"); document.removeEventListener("click", outside, true); }
    function outside(e) { if (!root.contains(e.target)) close(); }

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (root.classList.contains("open")) close();
      else open();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
})();
