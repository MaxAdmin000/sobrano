import { PICKS, formatPrice } from './data';

export default function FloristPicks({ picks = PICKS, onAdd }) {
  return (
    <section className="section" id="picks" style={{ paddingTop: 0 }}>
      <div className="container">
        <div
          className="section-head reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'end',
            marginBottom: 0,
          }}
        >
          <div>
            <span className="eyebrow">№ 06 — Подборки флористов</span>
            <h2 className="h2" style={{ marginTop: 18 }}>
              Если <em>не знаешь</em>, что выбрать.
            </h2>
          </div>
          <p className="lead">
            Готовые наборы от наших флористов: для дома, в подарок, экзотика. Каждый
            набор — это бокс + цветы + допы по фиксированной цене. Можно добавить
            открытку или бант.
          </p>
        </div>

        <div className="picks">
          {picks.map((p) => (
            <article className="pick reveal" key={p.id}>
              <div className="pick-img">
                <span className="pick-tag">{p.tag}</span>
                <img src={p.image} alt={p.title} />
              </div>
              <div className="pick-body">
                <h4>{p.title}</h4>
                <p>{p.desc}</p>
                <div className="pick-foot">
                  <span className="price">{formatPrice(p.price)}</span>
                  <a
                    href="#"
                    className="add-pick"
                    onClick={(e) => { e.preventDefault(); onAdd?.(p); }}
                  >Добавить →</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
