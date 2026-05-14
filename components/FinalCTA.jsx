export default function FinalCTA() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="final reveal">
          <span
            className="eyebrow center"
            style={{ color: 'rgba(242,236,227,.7)' }}
          >Готовы начать?</span>
          <h2>Соберём <em>твой</em> бокс.</h2>
          <p>
            Один клик до выбора размера. Дальше — только цветы, цена и адрес доставки.
            Никаких скрытых строк.
          </p>
          <a href="#boxes" className="btn-xl">
            Выбрать бокс <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
