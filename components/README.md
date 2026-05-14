# СОБРАНО — компоненты для разработки

Здесь разложен код главной страницы в виде React-компонентов и общих стилей. Можно использовать как старт для Next.js / Vite / CRA проекта.

## Структура

```
components/
├── README.md             # этот файл
├── styles.css            # все стили (токены + компоненты) — один файл
├── data.js               # тексты, изображения, цены — все данные
├── App.jsx               # сборка главной из компонентов
├── Nav.jsx               # шапка + sticky-навигация
├── TopBar.jsx            # бегущая строка сверху
├── Hero.jsx              # 1-й экран
├── Concept.jsx           # концепция (4 принципа)
├── HowItWorks.jsx        # 4 шага (тёмная карточка)
├── BoxGrid.jsx           # выбор бокса S/M/L/XL
├── FlowerGrid.jsx        # витрина цветов + счётчик
├── FloristPicks.jsx      # подборки флористов
├── Addons.jsx            # допы (ваза, зелень, подкормка)
├── CartPreview.jsx       # превью корзины + доставка
├── FAQ.jsx               # частые вопросы (аккордеон)
├── FinalCTA.jsx          # финальный призыв
├── Footer.jsx            # футер с юр. данными
└── FloatConsult.jsx      # плавающая кнопка консультации
```

## Подключение

```bash
npm create vite@latest sobrano -- --template react
cd sobrano
# скопировать всё из components/ в src/
```

В `src/main.jsx`:
```jsx
import './styles.css'
import App from './App.jsx'
```

В `index.html` — в `<head>` подключить шрифты:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Дизайн-токены

Цвета и типографика — в `styles.css` через CSS-переменные:

```css
:root{
  --ivory: #F2ECE3;       /* фон */
  --ivory-2: #E8DDD0;     /* вторичный фон */
  --ink: #1A1410;         /* основной текст */
  --ink-soft: #3A2D24;    /* приглушённый текст */
  --wine: #5C1F25;        /* акцент 1 — заголовки italic */
  --wine-deep: #3A1418;   /* финальный CTA фон */
  --terracotta: #C97B5C;  /* акцент 2 — точки, hover */
  --sage: #8C9A7B;        /* доп. акцент — успех */
  --mute: #7A6B5E;        /* мета-текст */
  --line: rgba(26,20,16,.14);
  --line-strong: rgba(26,20,16,.28);
  --serif: 'Fraunces', Georgia, serif;
  --sans: 'Inter', sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --r-lg: 24px; --r-md: 14px;
  --maxw: 1480px;
  --gut: clamp(20px, 4vw, 56px);
}
```

## Что взять для бэкенда

— `data.js` структурирован под API: каждая сущность (бокс, цветок, доп, подборка) имеет `id`, `slug`, `title`, `price`, `image`, и т.д. Можно мапить с эндпоинтов CRM от Tilda.
— Корзина и интеграция с Robokassa — отдельная задача. На фронте всё, что нужно — функция `addToCart(item)` и стейт `cart` в App.
— Все формы (чекаут) можно завести через React Hook Form + Yup-валидацию.

## Анимации

Используется `IntersectionObserver` для reveal-on-scroll. В компонентах применён хук `useReveal()` (см. `App.jsx`), который добавляет класс `.visible` при попадании в viewport. На бою советую заменить на Framer Motion.
