import { CART_PREVIEW, formatPrice } from './data';

export default function CartPreview({ data = CART_PREVIEW }) {
  return (
    <section className="section" id="cart" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="cart-banner reveal">
          <div className="cart-banner-l">
            <span className="eyebrow" style={{ color: 'rgba(242,236,227,.7)' }}>
              № 08 — Корзина и доставка
            </span>
            <h2 className="h2" style={{ marginTop: 18 }}>
              Состав, цена <em>и адрес</em> — на одном экране.
            </h2>
            <p>
              Видно весь заказ, итоговую сумму и варианты доставки. Оплата — через
              Robokassa. Подтверждение — на почту, в Telegram или WhatsApp.
            </p>

            <div className="delivery">
              <div>
                <h6>Своя доставка</h6>
                <p>от 500 ₽ по районам, время — на ваш выбор.</p>
              </div>
              <div>
                <h6>Яндекс Go</h6>
                <p>экспресс-доставка от 60 минут, цена по тарифу.</p>
              </div>
            </div>
          </div>

          <div className="cart-mock">
            <h6>
              Корзина{' '}
              <span style={{
                fontFamily: 'var(--serif)',
                fontSize: 14,
                color: 'var(--ink)',
              }}>ID #{data.id}</span>
            </h6>

            {data.items.map((item, i) => (
              <div className="cart-row" key={i}>
                <div className="thumb">
                  {item.thumb
                    ? <img src={item.thumb} alt="" />
                    : <span style={{ fontStyle: 'italic' }}>⊹</span>}
                </div>
                <div>
                  <div className="name">{item.title}</div>
                  <div className="qty">{item.qty}</div>
                </div>
                <div className="p">{formatPrice(item.price)}</div>
              </div>
            ))}

            <div className="cart-total">
              <span className="lbl">Итого</span>
              <span className="val">{formatPrice(data.total)}</span>
            </div>

            <a href="#" className="cart-cta">Оформить заказ <span>→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
