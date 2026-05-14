export default function FloatConsult({ label = 'Получить консультацию', href = '#' }) {
  return (
    <a href={href} className="float-consult" aria-label={label}>
      <span className="live"></span>
      <span>{label}</span>
    </a>
  );
}
