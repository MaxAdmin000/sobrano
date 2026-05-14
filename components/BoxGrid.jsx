import { BOXES, formatPrice } from './data';

export default function BoxGrid({ boxes = BOXES, onSelect }) {
  return (
    <section className="section box-section" id="boxes">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">№ 04 — Выбор бокса</span>
            <h2 className="h2" style={{ marginTop: 18 }}>
              Четыре размера. <em>Одна логика.</em>
            </h2>
          </div>
          <p className="lead">
            Чем больше бокс — тем больше стеблей. Цена фиксированная, наполнение —
            на ваше усмотрение. Наведите курсор на бокс, чтобы увидеть детали.
          </p>
        </div>

        <div className="box-grid">
          {boxes.map((box) => (
            <article
              className="box-card reveal"
              key={box.id}
              onClick={() => onSelect?.(box)}
            >
              <img src={box.image} alt={`Бокс ${box.size}`} />
              <div className="box-overlay">
                <span className="box-tag">{box.tag}</span>
                <div className="box-bottom">
                  <div className="size">
                    {box.size}<sup>{box.sub}</sup>
                  </div>
                  <div className="box-meta">
                    <span className="stems">{box.stems} цветков</span>
                    <span className="price">{formatPrice(box.price)}</span>
                  </div>
                </div>
              </div>

              <div className="box-hover">
                <h5>{box.title}</h5>
                <p>{box.desc}</p>
                <a href={`#box-${box.id}`} className="choose">
                  Выбрать {box.size} <span>→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
