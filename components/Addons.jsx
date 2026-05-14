import { ADDONS } from './data';

export default function Addons({ addons = ADDONS }) {
  return (
    <section className="section" id="addons" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="addons">
          <div className="addon intro reveal">
            <div>
              <span className="eyebrow" style={{ color: 'rgba(242,236,227,.7)' }}>
                № 07 — Допы
              </span>
              <h3 className="h2" style={{ marginTop: 14 }}>
                К боксу — <em>по желанию</em>.
              </h3>
            </div>
            <p>
              Ваза, декоративная зелень, подкормка для цветов. Маленькие штуки,
              которые продлевают жизнь букету и упрощают вручение.
            </p>
            <span className="arrow" aria-hidden="true">→</span>
          </div>

          {addons.map((a) => (
            <div className="addon reveal" key={a.id}>
              <img src={a.image} alt={a.title} />
              <div className="body">
                <h5>{a.title}</h5>
                <span className="price">+ {a.price} ₽</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
