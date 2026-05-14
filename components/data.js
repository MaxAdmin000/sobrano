// Все данные главной страницы. Замените на API/CMS-загрузку при интеграции.

export const NAV_LINKS = [
  { label: 'Концепция', href: '#concept' },
  { label: 'Боксы', href: '#boxes' },
  { label: 'Цветы', href: '#flowers' },
  { label: 'Подборки', href: '#picks' },
  { label: 'Допы', href: '#addons' },
  { label: 'FAQ', href: '#faq' },
];

export const MARQUEE_ITEMS = [
  'Фиксированная цена',
  'Свобода выбора',
  '8–10 видов цветов',
  'Доставка от 500 ₽',
  'Оплата онлайн',
  'Своя доставка / Яндекс Go',
];

export const HERO = {
  eyebrow: '№ 01 — Велком · Цветочная коробочка',
  title: ['Цветы', 'по', 'честной', 'цене.'],
  description:
    'Один бокс — одна цена. Никаких «премиальных» наценок и сюрпризов на кассе. Выбирай размер и собирай букет под себя.',
  primaryCta: { label: 'Выбрать бокс', href: '#boxes' },
  secondaryCta: { label: 'Как это работает', href: '#concept' },
  image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1400&q=80',
  imageAlt: 'Цветочный бокс',
  imageTag: 'Бокс «L» · 25 цветков · Собран сегодня',
  imageMeta: 'Live · Сезон 2026',
  stats: [
    { num: '4', label: 'Размера бокса · S M L XL' },
    { num: '0', em: true, label: 'Скрытых доплат' },
    { num: '8–10', label: 'Видов цветов в наличии' },
    { num: '90', unit: 'мин', label: 'Сборка и отправка' },
  ],
};

export const CONCEPT = {
  eyebrow: '№ 02 — Концепция',
  title: ['Простая ', { em: 'и честная' }, ' формула.'],
  lead:
    'Мы не навязываем готовые букеты и не диктуем, какие цветы «правильные». Наш продукт — это удобство, прозрачность и ощущение контроля для покупателя.',
  pills: [
    'Без «премиальных» наценок',
    'Свобода состава',
    'Онлайн-формат',
    'Без переплат за магазин',
  ],
  principles: [
    {
      n: '/01',
      title: 'Цена зависит только от размера.',
      text: 'Платите за количество стеблей, а не за «сорт». Любой цветок внутри бокса стоит одинаково.',
    },
    {
      n: '/02',
      title: 'Полная свобода выбора.',
      text: 'Хотите бокс из одних пионов? Или микс? Решаете вы. Мы только подсказываем, если попросите.',
    },
    {
      n: '/03',
      title: 'Прозрачная логика.',
      text: 'Никаких сложных расчётов. Цена бокса видна сразу — она не изменится, что бы вы ни выбрали внутри.',
    },
    {
      n: '/04',
      title: 'Доступная стоимость.',
      text: 'Мы отказались от дорогой упаковки и витрин в торговых центрах — и эта экономия идёт в букет.',
    },
  ],
};

export const STEPS = {
  eyebrow: '№ 03 — Как мы работаем',
  title: ['Четыре ', { em: 'простых' }, ' шага.'],
  lead:
    'От выбора размера до получения букета на пороге — без созвонов, без переписок и без пересчётов на лету.',
  items: [
    { n: '01', icon: '▢', title: 'Выбери размер', text: 'Каждый бокс имеет фиксированную цену.' },
    { n: '02', icon: '✿', title: 'Выбери цветы', text: 'Любые сочетания — добавляй по одному или сразу.' },
    { n: '03', icon: '+', title: 'Допы по желанию', text: 'Ваза, декоративная зелень, подкормка для цветов.' },
    { n: '04', icon: '→', title: 'Оплата и доставка', text: 'Robokassa, своя доставка от 500 ₽ или Яндекс Go.' },
  ],
};

export const BOXES = [
  {
    id: 's', size: 'S', sub: 'small', tag: 'Бокс · S',
    stems: 11, price: 1990,
    title: 'Маленький, но настроенческий',
    desc: 'Идеально, чтобы порадовать себя или принести цветы в гости.',
    image: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'm', size: 'M', sub: 'medium', tag: 'Бокс · M · популярный',
    stems: 17, price: 2990,
    title: 'Самый ходовой формат',
    desc: 'Достаточно объёма, чтобы стать комплиментом или поводом дня.',
    image: 'https://images.unsplash.com/photo-1599733589046-8a35aebc9bd7?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'l', size: 'L', sub: 'large', tag: 'Бокс · L',
    stems: 25, price: 4490,
    title: 'Заметный жест',
    desc: 'Когда хочется, чтобы цветы говорили громче слов.',
    image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'xl', size: 'XL', sub: 'extra', tag: 'Бокс · XL · максимум',
    stems: 35, price: 5990,
    title: 'Праздник без оговорок',
    desc: 'День рождения, юбилей, годовщина — повод найдётся.',
    image: 'https://images.unsplash.com/photo-1561181286-d5c97c0f1d2c?auto=format&fit=crop&w=900&q=80',
  },
];

export const FLOWERS = [
  {
    id: 'peony', name: 'Пионы', priceFrom: 280, span: 'f-1',
    image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80',
  },
  { id: 'rose', name: 'Кустовая роза', span: 'f-2', image: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?auto=format&fit=crop&w=900&q=80' },
  { id: 'tulip', name: 'Тюльпан Французский', span: 'f-3', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80' },
  { id: 'eustoma', name: 'Эустома', span: 'f-4', image: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=900&q=80' },
  { id: 'gypsophila', name: 'Гипсофила облако', span: 'f-5', image: 'https://images.unsplash.com/photo-1469259943454-aa100abba749?auto=format&fit=crop&w=1100&q=80' },
  { id: 'cotton', name: 'Хлопок · сухоцвет', span: 'f-6', image: 'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80' },
];

export const PICKS = [
  {
    id: 'home', tag: 'Для дома', title: 'Утренний свет', price: 3490,
    desc: 'Спокойный микс из эустомы, белой розы и зелени. Бокс M, 17 стеблей, ваза в подарок.',
    image: 'https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'gift', tag: 'В подарок', title: 'День, который запомнят', price: 5290,
    desc: 'Бокс L, 25 стеблей: пионы, кустовая роза, гипсофила. + Открытка ручной работы.',
    image: 'https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'exo', tag: 'Экзотика', title: 'Бархатный вечер', price: 6590,
    desc: 'Бокс XL: бордовые тюльпаны, антуриум, сухоцветы и хлопок. Драматично, но в меру.',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
  },
];

export const ADDONS = [
  { id: 'vase', title: 'Классическая ваза', price: 690, image: 'https://images.unsplash.com/photo-1606170033648-5d55a3edf314?auto=format&fit=crop&w=800&q=80' },
  { id: 'green', title: 'Декоративная зелень', price: 290, image: 'https://images.unsplash.com/photo-1586014959290-4f5b6dd6ed4d?auto=format&fit=crop&w=800&q=80' },
  { id: 'feed', title: 'Подкормка для цветов', price: 90, image: 'https://images.unsplash.com/photo-1611311263835-c7e8e2d22b94?auto=format&fit=crop&w=800&q=80' },
];

export const CART_PREVIEW = {
  id: 'SBR-204',
  items: [
    {
      title: 'Бокс L · авторский',
      qty: '25 цветков · пионы, эустома, гипсофила',
      price: 4490,
      thumb: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=200&q=70',
    },
    {
      title: 'Классическая ваза',
      qty: '×1 · стекло прозрачное',
      price: 690,
      thumb: 'https://images.unsplash.com/photo-1606170033648-5d55a3edf314?auto=format&fit=crop&w=200&q=70',
    },
    {
      title: 'Открытка ручной работы',
      qty: '×1 · с подписью',
      price: 190,
      thumb: null,
    },
  ],
  total: 5370,
};

export const FAQ_ITEMS = [
  {
    q: 'Почему цена фиксированная, а цветы я выбираю сам?',
    a: 'Потому что мы продаём не «премиальность сорта», а удобный объём и сборку. В бокс L всегда 25 стеблей — будь то роза, пион или эустома.',
  },
  {
    q: 'Как работает доставка?',
    a: 'Мы доставляем сами от 500 ₽ по районам в выбранный вами интервал, либо подключаем Яндекс Go — это экспресс-доставка от 60 минут.',
  },
  {
    q: 'Какие способы оплаты доступны?',
    a: 'Через Robokassa — карты любых банков, СБП, Apple Pay / Google Pay. Чек присылаем на почту автоматически.',
  },
  {
    q: 'Можно ли заказать бокс без определённого цветка?',
    a: 'Да. Витрина устроена так, что вы сами решаете, какие цветы войдут в бокс. Если затрудняетесь — посмотрите подборки флористов.',
  },
  {
    q: 'Что входит в допы и зачем они нужны?',
    a: 'Ваза — чтобы букет встал прямо из коробки. Декоративная зелень — для объёма и фактуры. Подкормка — чтобы цветы стояли на 3–5 дней дольше.',
  },
  {
    q: 'Что, если цветы не понравятся?',
    a: 'Мы делаем фото бокса перед отправкой. Если что-то пошло не так — пересоберём бесплатно или вернём деньги.',
  },
];

export const FOOTER = {
  description: 'Цветочные боксы с фиксированной ценой. Простая логика, честная сборка, доставка по городу.',
  cols: [
    {
      title: 'Навигация',
      links: [
        { label: 'Концепция', href: '#concept' },
        { label: 'Боксы', href: '#boxes' },
        { label: 'Витрина цветов', href: '#flowers' },
        { label: 'Подборки флористов', href: '#picks' },
        { label: 'Допы', href: '#addons' },
      ],
    },
    {
      title: 'Контакты',
      links: [
        { label: '+7 800 000-00-00', href: 'tel:+78000000000' },
        { label: 'hello@sobrano.ru', href: 'mailto:hello@sobrano.ru' },
        { label: 'Telegram · @sobrano', href: '#' },
        { label: 'WhatsApp', href: '#' },
        { label: 'Instagram', href: '#' },
      ],
    },
    {
      title: 'Документы',
      links: [
        { label: 'Политика конфиденциальности', href: '#' },
        { label: 'Пользовательское соглашение', href: '#' },
        { label: 'Публичная оферта', href: '#' },
        { label: 'Согласие на ОПД', href: '#' },
        { label: 'Реквизиты компании', href: '#' },
      ],
    },
  ],
  legal: '© 2026 ИП Иванова И. И. · ИНН 770000000000 · ОГРНИП 320000000000000',
  small: 'Сделано с любовью к цветам',
};

export const formatPrice = (n) => `${n.toLocaleString('ru-RU')} ₽`;
