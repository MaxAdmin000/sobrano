import { FOOTER } from './data';

export default function Footer({ data = FOOTER }) {
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#" className="brand">
              <span className="brand-mark"></span> Собрано
            </a>
            <p>{data.description}</p>
          </div>

          {data.cols.map((col) => (
            <div className="footer-col" key={col.title}>
              <h6>{col.title}</h6>
              {col.links.map((l) => (
                <a key={l.label} href={l.href}>{l.label}</a>
              ))}
            </div>
          ))}
        </div>

        <div className="footer-wordmark" aria-hidden="true">собрано</div>

        <div className="footer-bot">
          <span>{data.legal}</span>
          <span>{data.small}</span>
        </div>
      </div>
    </footer>
  );
}
