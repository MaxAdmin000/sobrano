import { NAV_LINKS } from './data';

export default function Nav({ links = NAV_LINKS, cart = { count: 2, total: '4 800 ₽' } }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href="#" className="brand">
          <span className="brand-mark"></span>
          Собрано
          <span style={{
            color: 'var(--mute)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            marginLeft: 6,
          }}>.studio</span>
        </a>

        <nav className="nav-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="nav-cta">
          <a href="#cart" className="cart-pill" aria-label="Корзина">
            <span className="dot"></span>
            Корзина · <strong style={{ fontWeight: 600 }}>{cart.count}</strong> · {cart.total}
          </a>
          <a href="#boxes" className="btn-primary">Собрать бокс <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </header>
  );
}
