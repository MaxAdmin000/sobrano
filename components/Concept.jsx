import { CONCEPT } from './data';

// helper: ['Простая ', { em: 'и честная' }, ' формула.'] -> JSX
function renderTitle(title) {
  return title.map((part, i) =>
    typeof part === 'string'
      ? <span key={i}>{part}</span>
      : <em key={i}>{part.em}</em>
  );
}

export default function Concept({ data = CONCEPT }) {
  return (
    <section className="section" id="concept">
      <div className="container">
        <div className="concept-grid">
          <div className="concept-left reveal">
            <span className="eyebrow">{data.eyebrow}</span>
            <h2 className="h2">{renderTitle(data.title)}</h2>
            <p className="lead">{data.lead}</p>
            <div className="pill-row">
              {data.pills.map((p, i) => <span className="pill" key={i}>{p}</span>)}
            </div>
          </div>

          <div>
            {data.principles.map((pr, i) => (
              <div className="principle reveal" key={i}>
                <span className="num">{pr.n}</span>
                <div>
                  <h3>{pr.title}</h3>
                  <p>{pr.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
