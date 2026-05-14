// СОБРАНО — toast-уведомления. window.showToast(msg, type, duration)
// type: 'info' | 'success' | 'error' | 'warning'  (default: 'info')
// duration: ms (default: 4000)
(function () {
  const css = `
  .sb-toast-wrap{
    position:fixed;top:90px;right:22px;z-index:9100;
    display:flex;flex-direction:column;gap:10px;
    pointer-events:none;max-width:380px
  }
  .sb-toast{
    background:#1A1410;color:#F2ECE3;
    border-radius:14px;padding:14px 18px;
    display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:flex-start;
    font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.5;
    box-shadow:0 18px 42px -12px rgba(26,20,16,.45);
    pointer-events:auto;cursor:pointer;
    opacity:0;transform:translateX(20px);
    transition:opacity .3s ease, transform .35s cubic-bezier(.2,.6,.2,1)
  }
  .sb-toast.show{opacity:1;transform:translateX(0)}
  .sb-toast .ic{
    width:26px;height:26px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-family:'Fraunces',Georgia,serif;font-size:14px;font-weight:500;
    background:rgba(242,236,227,.12);color:#F2ECE3;flex:none
  }
  .sb-toast.success .ic{background:#8C9A7B;color:#F2ECE3}
  .sb-toast.error .ic{background:#C97B5C;color:#F2ECE3}
  .sb-toast.warning .ic{background:#C9A04E;color:#1A1410}
  .sb-toast .text strong{display:block;font-weight:600;margin-bottom:2px;color:#F2ECE3}
  .sb-toast .text{color:rgba(242,236,227,.78)}
  .sb-toast .x{
    width:22px;height:22px;border-radius:50%;background:rgba(242,236,227,.08);
    display:flex;align-items:center;justify-content:center;font-size:12px;color:#F2ECE3;
    transition:background .2s
  }
  .sb-toast:hover .x{background:rgba(242,236,227,.18)}
  @media (max-width:680px){
    .sb-toast-wrap{top:auto;bottom:90px;right:14px;left:14px;max-width:none}
    .sb-toast{transform:translateY(20px)}
    .sb-toast.show{transform:translateY(0)}
  }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  let wrap;
  function ensureWrap() {
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'sb-toast-wrap';
    document.body.appendChild(wrap);
    return wrap;
  }

  const ICONS = { info: '✦', success: '✓', error: '!', warning: '!' };
  const TITLES = {
    info: 'Сообщение',
    success: 'Готово',
    error: 'Ошибка',
    warning: 'Внимание',
  };

  window.showToast = function (message, type = 'info', duration = 4000) {
    const w = ensureWrap();
    const el = document.createElement('div');
    el.className = `sb-toast ${type}`;
    el.innerHTML = `
      <span class="ic">${ICONS[type] || '✦'}</span>
      <div class="text"><strong>${TITLES[type] || 'Сообщение'}</strong>${message}</div>
      <span class="x" aria-label="Закрыть">×</span>
    `;
    w.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    };
    el.addEventListener('click', remove);
    if (duration > 0) setTimeout(remove, duration);
    return { dismiss: remove };
  };
})();
