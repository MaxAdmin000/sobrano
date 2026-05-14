import { HERO } from './data';

export default function Hero({ data = HERO }) {
  const [a, b, c, d] = data.title;
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">{data.eyebrow}</span>
            <h1 className="h-display">
              {a}<br />
              <span className="it">{b}&nbsp;</span>
              <span className="accent">{c}</span><br />
              {d}
            </h1>

            <div className="hero-sub">
              <p>{data.description}</p>
              <div className="hero-cta">
                <a href={data.primaryCta.href} className="btn-xl">
                  {data.primaryCta.label}
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
                <a href={data.secondaryCta.href} className="btn-ghost">{data.secondaryCta.label}</a>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <span className="hero-meta">{data.imageMeta}</span>
            <img src={data.image} alt={data.imageAlt} loading="eager" />
            <span className="hero-tag">{data.imageTag}</span>
          </div>
        </div>

        <div className="hero-stats">
          {data.stats.map((s, i) => (
            <div className="cell" key={i}>
              <span className="num">
                {s.em ? <em>{s.num}</em> : s.num}
                {s.unit && <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.45em',
                  letterSpacing: '.05em',
                }}>{s.unit}</span>}
              </span>
              <span className="lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
