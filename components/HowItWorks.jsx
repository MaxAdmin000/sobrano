import { STEPS } from './data';

function renderTitle(title) {
  return title.map((p, i) =>
    typeof p === 'string' ? <span key={i}>{p}</span> : <em key={i}>{p.em}</em>
  );
}

export default function HowItWorks({ data = STEPS }) {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="steps-section reveal">
          <div className="steps-head">
            <div>
              <span className="eyebrow">{data.eyebrow}</span>
              <h3 className="h2" style={{ marginTop: 18 }}>{renderTitle(data.title)}</h3>
            </div>
            <p className="lead">{data.lead}</p>
          </div>
          <div className="steps">
            {data.items.map((s, i) => (
              <div className="step" key={i}>
                <span className="n">{s.n}</span>
                <span className="icon" aria-hidden="true">{s.icon}</span>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
