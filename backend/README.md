# Модуль кастомной корзины Tilda + Robokassa

Готовый комплект для кастомной корзины на Tilda:

- фронтенд-корзина, которую можно вставить в Tilda через `HEAD` и HTML-блоки;
- backend для безопасной генерации подписи Robokassa;
- проверка `ResultURL`;
- формирование `Receipt` для фискализации;
- каталог товаров, чтобы цену нельзя было подменить в браузере;
- опциональный webhook для CRM, Telegram-бота, Make/Zapier или своей админки.

## Почему нужен backend

Robokassa требует `SignatureValue`, который считается с Паролем №1. Этот пароль нельзя хранить в Tilda, Zero Block или любом браузерном JS: его увидит любой посетитель сайта.

Правильная схема:

1. Покупатель собирает корзину на Tilda.
2. Tilda отправляет `items`, контакты и доставку на ваш backend.
3. Backend сверяет товары с `products.json`, считает сумму, `Receipt` и подпись.
4. Backend возвращает форму оплаты.
5. Браузер автоматически отправляет покупателя на Robokassa.
6. Robokassa после оплаты вызывает `ResultURL` backend-а.
7. Backend проверяет подпись Паролем №2 и отвечает `OK{InvId}`.

## Структура

```text
robokassa-tilda-module/
  backend/
    .env.example
    products.example.json
    package.json
    src/
      server.js
      robokassa.js
      catalog.js
      webhook.js
  frontend/
    robokassa-tilda-cart.css
    robokassa-tilda-cart.js
  examples/
    tilda-head-snippet.html
    product-buttons.html
    flowers-page-adapter.html
```

## 1. Настройка Robokassa

В личном кабинете Robokassa откройте магазин и раздел технических настроек.

Укажите:

- `MerchantLogin`;
- Пароль №1;
- Пароль №2;
- тестовые Пароль №1 и Пароль №2, если сначала запускаете тестовый режим;
- алгоритм хэширования, например `MD5`.

URL-ы:

- `ResultURL`: `https://YOUR_BACKEND_DOMAIN/api/robokassa/result`
- метод `ResultURL`: `POST` или `GET`, backend поддерживает оба;
- `SuccessURL`: страница Tilda об успешной оплате, например `https://site.ru/success`
- `FailURL`: страница Tilda об ошибке/отмене, например `https://site.ru/fail`

Важно: статус заказа фиксируйте только по `ResultURL`. `SuccessURL` нужен для красивой страницы покупателя, но не является надежным подтверждением оплаты.

## 2. Настройка backend

Перейдите в папку backend:

```bash
cd robokassa-tilda-module/backend
cp .env.example .env
cp products.example.json products.json
```

Заполните `.env`:

```env
ROBOKASSA_MERCHANT_LOGIN=your_shop_login
ROBOKASSA_PASSWORD1=your_password_1
ROBOKASSA_PASSWORD2=your_password_2
ROBOKASSA_IS_TEST=1
ROBOKASSA_HASH_ALGORITHM=md5
ALLOWED_ORIGINS=https://your-site.ru,https://your-project.tilda.ws
PORT=8787
```

Для боевого режима:

```env
ROBOKASSA_IS_TEST=0
```

Запуск локально:

```bash
npm start
```

Проверка:

```bash
curl http://localhost:8787/health
```

Backend отдаёт фронтенд-ассеты по адресам:

```text
https://YOUR_BACKEND_DOMAIN/assets/robokassa-tilda-cart.css
https://YOUR_BACKEND_DOMAIN/assets/robokassa-tilda-cart.js
```

### Где разместить backend

Подойдёт любой Node.js hosting/VPS:

- Render;
- Railway;
- Timeweb Cloud;
- Selectel/VPS;
- свой сервер с `pm2` и Nginx.

Требования: Node.js 18+, HTTPS-домен, доступность из интернета для `ResultURL`.

## 3. Каталог товаров

Файл `backend/products.json` является источником правды по товарам и ценам. Даже если пользователь изменит цену в браузере, backend возьмёт цену из каталога.

Пример:

```json
{
  "sku": "box-l",
  "name": "Бокс L",
  "price": "4490.00",
  "tax": "none",
  "payment_method": "full_prepayment",
  "payment_object": "commodity"
}
```

Поля:

- `sku` — уникальный код товара, такой же должен быть в Tilda-кнопке;
- `name` — название в чеке;
- `price` — цена в рублях;
- `tax` — ставка НДС: `none`, `vat0`, `vat10`, `vat20` и т.д.;
- `payment_method` — обычно `full_prepayment` для предоплаты;
- `payment_object` — для цветов обычно `commodity`, для доставки `service`.

## 4. Доставка

В `.env` задаются цены доставки, которые попадут в сумму Robokassa и чек:

```env
DELIVERY_OWN_PRICE=500.00
DELIVERY_PICKUP_PRICE=0.00
DELIVERY_YANDEX_PRICE=0.00
```

Если цена `0`, строка доставки не включается в чек и оплату.

Если доставка Яндекс Go оплачивается отдельно по тарифу, оставьте `DELIVERY_YANDEX_PRICE=0.00`.

## 5. Подключение в Tilda

Откройте:

```text
Tilda -> Мои сайты -> нужный сайт -> Настройки сайта -> Ещё -> HTML-код для вставки внутрь HEAD
```

Вставьте код из `examples/tilda-head-snippet.html`, заменив `YOUR_BACKEND_DOMAIN`:

```html
<link rel="stylesheet" href="https://YOUR_BACKEND_DOMAIN/assets/robokassa-tilda-cart.css">

<script>
  window.RTK_CONFIG = {
    apiBase: 'https://YOUR_BACKEND_DOMAIN',
    privacyUrl: '/privacy',
    offerUrl: '/offer',
    deliveryOptions: [
      { id: 'own', label: 'Своя доставка', price: 500 },
      { id: 'pickup', label: 'Самовывоз', price: 0 },
      { id: 'yandex', label: 'Яндекс Go по тарифу', price: 0 }
    ]
  };
</script>

<script defer src="https://YOUR_BACKEND_DOMAIN/assets/robokassa-tilda-cart.js"></script>
```

Сохраните и переопубликуйте сайт.

## 6. Кнопки добавления товара

В HTML-блоке Tilda или Zero Block добавьте кнопку:

```html
<button
  type="button"
  data-rtk-add
  data-rtk-sku="box-l"
  data-rtk-title="Бокс L"
  data-rtk-price="4490">
  В корзину
</button>
```

Главное поле — `data-rtk-sku`. Оно должно совпадать с `sku` в `backend/products.json`.

Цена в `data-rtk-price` нужна только для красивого отображения в корзине. Финальную сумму backend всё равно берёт из `products.json`.

## 7. Подключение к кнопке Zero Block

Если кнопка уже нарисована в Zero Block:

1. Откройте настройки элемента.
2. Задайте CSS-класс, например `js-add-box-l`.
3. Добавьте HTML-блок на страницу:

```html
<script>
  document.addEventListener('rtk:ready', function () {
    document.querySelectorAll('.js-add-box-l').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        window.RobokassaTildaCart.addItem({
          sku: 'box-l',
          name: 'Бокс L',
          price: 4490,
          quantity: 1
        });
      });
    });
  });
</script>
```

## 8. Адаптер для текущего лендинга

Для страницы `flowers_box.html` подготовлен пример:

```text
examples/flowers-page-adapter.html
```

Он привязывает существующие кнопки:

- боксы `S/M/L/XL`;
- готовые подборки;
- допы.

В Tilda аналогичный подход используется, если не хочется менять HTML-кнопки вручную: задаёте элементам CSS-классы и вызываете `window.RobokassaTildaCart.addItem(...)`.

## 9. Фискализация

Backend формирует `Receipt` автоматически:

```json
{
  "items": [
    {
      "name": "Бокс L",
      "quantity": 1,
      "sum": 4490,
      "tax": "none",
      "payment_method": "full_prepayment",
      "payment_object": "commodity"
    }
  ]
}
```

Если система налогообложения не задана в Robokassa, можно указать её в `.env`:

```env
ROBOKASSA_SNO=usn_income
```

Если СНО уже задана в личном кабинете, оставьте `ROBOKASSA_SNO` пустым.

## 10. Webhook заказов

Чтобы получать заказы в CRM/бот/таблицу, задайте:

```env
ORDER_WEBHOOK_URL=https://your-crm.example/webhook
ORDER_WEBHOOK_SECRET=random_secret
```

Backend отправляет события:

- `payment.created` — перед переходом на оплату;
- `payment.succeeded` — после подтверждения Robokassa по `ResultURL`.

Если указан `ORDER_WEBHOOK_SECRET`, payload подписывается HMAC-SHA256 в заголовке:

```text
x-robokassa-tilda-signature
```

## 11. Тестирование

1. В `.env` поставьте `ROBOKASSA_IS_TEST=1`.
2. Используйте тестовые Пароль №1 и Пароль №2 из Robokassa.
3. Добавьте backend `ResultURL` в настройках магазина.
4. Опубликуйте Tilda.
5. Добавьте товар в корзину.
6. Нажмите оплату.
7. Проверьте, что открывается Robokassa.
8. Пройдите тестовую оплату.
9. Убедитесь, что `/api/robokassa/result` вернул `OK{InvId}`.
10. Проверьте webhook/CRM, если он подключён.

После теста:

1. Поставьте `ROBOKASSA_IS_TEST=0`.
2. Замените тестовые пароли на боевые.
3. Проведите один реальный платёж на небольшую сумму.

## 12. Частые ошибки

### Robokassa показывает ошибку подписи

Проверьте:

- в `.env` указан тот же алгоритм, что в магазине;
- в тестовом режиме используются именно тестовые пароли;
- `ROBOKASSA_IS_TEST=1` для тестовых платежей;
- `Receipt` включён в подпись;
- `MerchantLogin` без опечаток.

### ResultURL не подтверждает оплату

Проверьте:

- URL доступен по HTTPS из интернета;
- в Robokassa указан правильный `ResultURL`;
- используется Пароль №2 того же режима, что и оплата;
- backend отвечает текстом `OK{InvId}`.

### В Tilda не открывается корзина

Проверьте:

- сайт переопубликован после вставки HEAD-кода;
- CSS/JS доступны по HTTPS;
- в кнопке есть `data-rtk-add` и `data-rtk-sku`;
- в консоли браузера нет ошибок CORS.

### Цена в корзине одна, а backend считает другую

Это нормальная защита. Обновите `products.json` и фронтенд-кнопки, чтобы цены совпадали визуально и на backend.

## 13. Ссылки на официальную документацию

- Robokassa Quick Start: https://docs.robokassa.ru/ru/quick-start
- Интерфейс оплаты: https://docs.robokassa.ru/ru/pay-interface
- Уведомления и переадресация: https://docs.robokassa.ru/ru/notifications-and-redirects
- Фискализация: https://docs.robokassa.ru/ru/fiscalization
- Тестовый режим: https://docs.robokassa.ru/ru/testing-mode
- Инструкция Robokassa для Tilda/бейджа: https://docs.robokassa.ru/ru/instructions/tilda/tilda_credit
