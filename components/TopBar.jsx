import { MARQUEE_ITEMS } from './data';

export default function TopBar({ items = MARQUEE_ITEMS }) {
  // Дублируем массив для бесшовной анимации
  const doubled = [...items, ...items];
  return (
    <div className="top-bar" aria-hidden="true">
      <div className="marquee">
        {doubled.map((item, i) => <span key={i}>{item}</span>)}
      </div>
    </div>
  );
}
