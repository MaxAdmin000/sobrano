// СОБРАНО — cookie-баннер. Подключать как <script src="assets/cookie-banner.js" defer></script>
(function () {
  const KEY = 'sobrano_cookie_consent';
  const VERSION = '1';

  // Если согласие уже дано в текущей версии — не показываем
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.version === VERSION && saved.accepted) return;
  } catch (e) {}

  const css = `
  .sb-cookie{
    position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(0);
    z-index:9000;width:min(640px,calc(100vw - 32px));
    background:#1A1410;color:#F2ECE3;border-radius:18px;padding:18px 22px;
    display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;
    box-shadow:0 30px 80px -20px rgba(26,20,16,.55);
    font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;
    opacity:0;transform:translateX(-50%) translateY(20px);
    transition:opacity .4s ease, transform .5s cubic-bezier(.2,.6,.2,1)
  }
  .sb-cookie.show{opacity:1;transform:translateX(-50%) translateY(0)}
  .sb-cookie-text{color:rgba(242,236,227,.85)}
  .sb-cookie-text strong{color:#F2ECE3;font-weight:600}
  .sb-cookie-text a{color:#C97B5C;text-decoration:underline;text-decoration-color:rgba(201,123,92,.4);text-underline-offset:3px}
  .sb-cookie-text a:hover{text-decoration-color:#C97B5C}
  .sb-cookie-btn{
    background:#F2ECE3;color:#1A1410;border:0;padding:11px 18px;border-radius:999px;
    font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:background .2s, transform .2s;
    white-space:nowrap
  }
  .sb-cookie-btn:hover{background:#C97B5C;color:#F2ECE3}
  .sb-cookie-btn.ghost{background:transparent;color:rgba(242,236,227,.7);border:1px solid rgba(242,236,227,.2)}
  .sb-cookie-btn.ghost:hover{background:rgba(242,236,227,.06);color:#F2ECE3;border-color:rgba(242,236,227,.4)}
  @media (max-width:680px){
    .sb-cookie{grid-template-columns:1fr;gap:12px;padding:18px;bottom:14px}
    .sb-cookie-buttons{display:flex;gap:8px;justify-content:flex-start}
    .sb-cookie-btn{flex:1}
  }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'sb-cookie';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Уведомление об использовании cookie');
  banner.innerHTML = `
    <div class="sb-cookie-text">
      <strong>Мы используем cookie</strong> — чтобы запомнить ваш бокс и улучшить сайт.
      Подробнее — в <a href="privacy-policy.html#s8">политике конфиденциальности</a>.
    </div>
    <div class="sb-cookie-buttons" style="display:contents">
      <button class="sb-cookie-btn ghost" data-action="reject">Только необходимые</button>
      <button class="sb-cookie-btn" data-action="accept">Принять</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));

  function close(accepted) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        version: VERSION,
        accepted,
        ts: Date.now(),
      }));
    } catch (e) {}
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 500);
  }

  banner.querySelector('[data-action="accept"]').addEventListener('click', () => close(true));
  banner.querySelector('[data-action="reject"]').addEventListener('click', () => close(false));
})();
