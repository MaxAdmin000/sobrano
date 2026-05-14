import { FLOWERS } from './data';

export default function FlowerGrid({
  flowers = FLOWERS,
  capacity = 25,
  filled = 16,
  onAdd,
}) {
  const remaining = capacity - filled;
  const percent = Math.min(100, Math.round((filled / capacity) * 100));

  return (
    <section className="section" id="flowers" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="flowers-head reveal">
          <div>
            <span className="eyebrow">№ 05 — Витрина</span>
            <h2 className="h2" style={{ marginTop: 18 }}>
              8–10 видов <em>в наличии</em>.
            </h2>
          </div>
          <p className="lead">
            Свежий завоз каждые 2 дня. Все позиции — с понятным «+/−», чтобы сложить
            бокс ровно так, как хочется. Виджет справа считает, сколько ещё стеблей помещается.
          </p>
        </div>

        <div className="flower-grid reveal">
          {flowers.map((f) => (
            <div className={`fcell ${f.span}`} key={f.id}>
              <img src={f.image} alt={f.name} />
              <span className="label">
                {f.name}{f.priceFrom && ` · от ${f.priceFrom} ₽`}
              </span>
              <button
                className="add"
                aria-label={`Добавить ${f.name}`}
                onClick={() => onAdd?.(f)}
              >+</button>
            </div>
          ))}
        </div>

        <div className="flowers-counter reveal">
          <div className="info">
            <span className="badge">L</span>
            <p>
              В боксе осталось <strong>{remaining} / {capacity}</strong> мест.
              Подсказка: можно добавить 2 пиона и 4 эустомы — и бокс будет собран.
            </p>
          </div>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${percent}%` }}></div>
          </div>
          <a href="#cart" className="btn-primary">В корзину →</a>
        </div>
      </div>
    </section>
  );
}
