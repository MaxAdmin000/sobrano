import { useState } from 'react';
import { FAQ_ITEMS } from './data';

export default function FAQ({ items = FAQ_ITEMS }) {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="section faq-section" id="faq" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="faq-grid reveal">
          <aside className="faq-aside">
            <span className="eyebrow">№ 09 — Частые вопросы</span>
            <h2 className="h2" style={{ marginTop: 18 }}>
              Коротко <em>и&nbsp;по делу</em>.
            </h2>
            <p>
              Не нашли ответ? Напишите нам в WhatsApp или Telegram — отвечаем в
              течение 15 минут с 8:00 до 22:00.
            </p>
            <a href="#" className="btn-primary" style={{ marginTop: 24 }}>
              Связаться с нами →
            </a>
          </aside>

          <div className="faq-list">
            {items.map((it, i) => (
              <div
                className={`faq-item ${openIdx === i ? 'open' : ''}`}
                key={i}
              >
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={openIdx === i}
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                >
                  {it.q}
                  <span className="plus">+</span>
                </button>
                <div className="faq-a">{it.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
