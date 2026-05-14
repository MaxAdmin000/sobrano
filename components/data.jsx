
// ─── DATA: boxes, flowers, extras ───────────────────────────────────────────

const BOXES = [
  {
    id: 's', size: 'S', stems: 11, price: 1490,
    tagline: 'Камерный, уютный',
    description: 'Идеально для стола или небольшого подарка',
    gradient: 'linear-gradient(155deg, #e8d5c4 0%, #c9b8a4 40%, #a89080 100%)',
    accent: '#c9b8a4',
  },
  {
    id: 'm', size: 'M', stems: 17, price: 2190,
    tagline: 'Сбалансированный',
    description: 'Самый популярный — достаточно для пышного букета',
    gradient: 'linear-gradient(155deg, #d4b8c0 0%, #b89aa8 40%, #8a7080 100%)',
    accent: '#b89aa8',
  },
  {
    id: 'l', size: 'L', stems: 25, price: 3190,
    tagline: 'Пышный, эффектный',
    description: 'Настоящее высказывание из живых цветов',
    gradient: 'linear-gradient(155deg, #c4c0a8 0%, #a8a488 40%, #807860 100%)',
    accent: '#a8a488',
  },
  {
    id: 'xl', size: 'XL', stems: 35, price: 4490,
    tagline: 'Максимальный',
    description: 'Роскошная охапка — для особых случаев',
    gradient: 'linear-gradient(155deg, #b8c4b8 0%, #98a898 40%, #708070 100%)',
    accent: '#98a898',
  },
];

const FLOWERS = [
  { id: 'rose_red',    name: 'Роза красная',    emoji: '🌹', gradient: 'linear-gradient(135deg,#c0392b,#922b21)', textColor:'#fff' },
  { id: 'rose_white',  name: 'Роза белая',      emoji: '🤍', gradient: 'linear-gradient(135deg,#f5f0eb,#ddd5cc)', textColor:'#555' },
  { id: 'rose_pink',   name: 'Роза розовая',    emoji: '🌸', gradient: 'linear-gradient(135deg,#e91e8c,#c2185b)', textColor:'#fff' },
  { id: 'peony',       name: 'Пион',            emoji: '🌺', gradient: 'linear-gradient(135deg,#e8a0b0,#c06080)', textColor:'#fff' },
  { id: 'tulip_red',   name: 'Тюльпан красный', emoji: '🌷', gradient: 'linear-gradient(135deg,#e53935,#b71c1c)', textColor:'#fff' },
  { id: 'tulip_pink',  name: 'Тюльпан розовый', emoji: '🌷', gradient: 'linear-gradient(135deg,#f48fb1,#e91e63)', textColor:'#fff' },
  { id: 'tulip_white', name: 'Тюльпан белый',   emoji: '🌷', gradient: 'linear-gradient(135deg,#f0ede8,#d8d0c8)', textColor:'#555' },
  { id: 'chrysanth',   name: 'Хризантема',      gradient: 'linear-gradient(135deg,#f9d423,#e0a800)', textColor:'#555' },
  { id: 'lily',        name: 'Лилия',           gradient: 'linear-gradient(135deg,#fff8e8,#f0d090)', textColor:'#555' },
  { id: 'freesia',     name: 'Фрезия',          gradient: 'linear-gradient(135deg,#b39ddb,#7b1fa2)', textColor:'#fff' },
  { id: 'eustoma',     name: 'Эустома',         gradient: 'linear-gradient(135deg,#ce93d8,#8e24aa)', textColor:'#fff' },
  { id: 'carnation',   name: 'Гвоздика',        gradient: 'linear-gradient(135deg,#ef9a9a,#c62828)', textColor:'#fff' },
  { id: 'narcissus',   name: 'Нарцисс',         gradient: 'linear-gradient(135deg,#fff176,#f9a825)', textColor:'#555' },
  { id: 'iris',        name: 'Ирис',            gradient: 'linear-gradient(135deg,#7986cb,#283593)', textColor:'#fff' },
  { id: 'gerbera',     name: 'Гербера',         gradient: 'linear-gradient(135deg,#ff8a65,#bf360c)', textColor:'#fff' },
  { id: 'alstroemeria',name: 'Альстромерия',    gradient: 'linear-gradient(135deg,#f48fb1,#ad1457)', textColor:'#fff' },
  { id: 'gypsophila',  name: 'Гипсофила',       gradient: 'linear-gradient(135deg,#fce4ec,#f8bbd0)', textColor:'#888' },
  { id: 'matthiola',   name: 'Маттиола',        gradient: 'linear-gradient(135deg,#c5cae9,#7986cb)', textColor:'#333' },
];

const FLORIST_SETS = [
  {
    id: 'home', name: 'Для дома', description: 'Уютная смесь для любого интерьера',
    gradient: 'linear-gradient(135deg,#e8d5c4,#c9a882)',
    flowers: { rose_white: 3, chrysanth: 4, gypsophila: 3, lily: 2 },
  },
  {
    id: 'gift', name: 'В подарок', description: 'Классика, которая всегда уместна',
    gradient: 'linear-gradient(135deg,#f4c2c2,#c06080)',
    flowers: { rose_red: 5, peony: 4, gypsophila: 5, eustoma: 3 },
  },
  {
    id: 'exotic', name: 'Экзотика', description: 'Яркий, необычный, запоминающийся',
    gradient: 'linear-gradient(135deg,#b39ddb,#ff8a65)',
    flowers: { gerbera: 4, iris: 3, freesia: 5, alstroemeria: 4 },
  },
  {
    id: 'tender', name: 'Нежный', description: 'Пастельный и романтичный',
    gradient: 'linear-gradient(135deg,#fce4ec,#f8bbd0)',
    flowers: { rose_pink: 4, eustoma: 4, matthiola: 3, gypsophila: 6 },
  },
];

const EXTRAS = [
  { id: 'vase',     name: 'Классическая ваза',     price: 350, description: 'Стеклянная, высота 25 см', gradient: 'linear-gradient(135deg,#e8f4f8,#b0d4e8)' },
  { id: 'greens',   name: 'Декоративная зелень',   price: 150, description: 'Эвкалипт, аспарагус', gradient: 'linear-gradient(135deg,#c8e6c9,#66bb6a)' },
  { id: 'feed',     name: 'Подкормка для цветов',  price: 50,  description: 'Продлит жизнь букета', gradient: 'linear-gradient(135deg,#fff9c4,#ffd54f)' },
  { id: 'ribbon',   name: 'Бант',                  price: 0,   description: 'Атласная лента', gradient: 'linear-gradient(135deg,#f8bbd0,#e91e63)' },
  { id: 'postcard', name: 'Открытка',              price: 0,   description: 'С вашим текстом', gradient: 'linear-gradient(135deg,#ffe0b2,#ff8f00)' },
];

Object.assign(window, { BOXES, FLOWERS, FLORIST_SETS, EXTRAS });
