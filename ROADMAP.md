# СОБРАНО · roadmap

Живой план работ по сайту и админке. Чекбоксы обновляются по мере выполнения.

**Легенда:** `[x]` сделано · `[~]` в работе · `[ ]` не начато · оценка трудозатрат: `(1)` пара часов … `(5)` несколько дней.

---

## ✅ Сделано (фундамент, фронт и базовый бэк)

- [x] Деплой статики на `80.249.150.166` (`/var/www/sobrano/`), nginx + gzip + cache-rules.
- [x] Привязка домена `sobrano.store` → A-запись на сервер.
- [x] HTTPS через Let's Encrypt + редирект 80→443 + автообновление через `certbot.timer`.
- [x] Чистка плейсхолдеров: ИП Иванова → Горбулёв во всех 7 страницах; `sobrano.ru` → `sobrano.store` везде.
- [x] Полный анализ всех 22 HTML-страниц + JS-ассетов + бэкенд-модуля Robokassa.
- [x] `assets/catalog.js` — каталог: 4 бокса, 16 цветов, 10 подборок, 5 допов, 2 промокода, доставка.
- [x] `assets/cart.js` — корзина в localStorage с API (`setBox`/`addFlower`/`applyPick`/`applyPromo`/`finalize`/…), авто-обновление cart-pill в шапке, cross-tab sync, выгрузка заказа.
- [x] `assets/page-box.js` — общий движок для box-{s,m,l,xl}.html: реактивный sticky-summary, прогресс-бар, фильтр-чипсы, «совет флориста».
- [x] index.html: подборки → корзина, float-консультация → contacts.
- [x] flowers.html: фильтр чипсами, сортировка (по умолчанию / в наличии / цена ↑↓ / по названию), «+ В бокс» с проверкой выбранного бокса.
- [x] picks.html: 10 подборок добавляются в корзину, фильтр по категориям.
- [x] cart.html: динамическая корзина, qty +/- допов, удаление, промокоды (`BLOOM10` -10%, `LOVE15` -15%), выбор доставки, suggest-карточки, пустое состояние.
- [x] checkout.html: рендер из корзины, восстановление формы из `cart.customer`, валидация, дата по умолчанию = сегодня, `POST /api/orders` + редирект на thank-you. Apple/Google Pay убраны.
- [x] thank-you.html: рендер из последнего заказа.
- [x] sobrano-config.js: фетчит `/api/settings`, кэш в localStorage, fallback на дефолты.
- [x] Backend: переименован `robokassa-tilda-module` → `backend/`, удалён Tilda-фронтенд.
- [x] Backend модули: `store.js` (JSON-персистенция), `auth.js` (sha256+session), `admin.js` (endpoints).
- [x] Backend endpoints: `/health`, `/api/settings`, `/api/orders`, `/api/admin/login|logout|me`, `/api/admin/orders`, `/api/admin/orders/:id` (PATCH), `/api/admin/settings` (PATCH), `/api/admin/robokassa` (GET/PATCH).
- [x] Robokassa endpoints (`create-payment` / `result` / `success` / `fail`) — рабочие, ждут только креды.
- [x] Деплой бэкенда: Node 20 из nodesource, systemd unit `sobrano-backend.service`, под `www-data`.
- [x] nginx reverse-proxy: `/api/*` и `/admin` → `127.0.0.1:8787`.
- [x] Админ-UI: логин/пароль форма + табы «Заказы / Настройки / Контакты / Оплата».
- [x] Заказы в админке: таблица, статистика (всего/24ч/новые/оборот), статусы (new→paid→doing→shipped→done/cancelled), детальная модалка.
- [x] Настройки в админке: рабочие часы + оффлайн-режим (с заголовком/сообщением/ETA).
- [x] Контакты в админке: TG/WA/телефон/email.
- [x] Robokassa в админке: MerchantLogin + 2 пароля (write-only) + test/боевой toggle + алгоритм подписи. Применяется без рестарта.
- [x] `/health` показывает состояние Robokassa: `ready`, `testMode`.
- [x] **Wave 1 (2026-05-11)**: каталог под полным управлением админки. Бэкенд: `seed-catalog.js` (4 бокса, 16 цветов, 10 подборок, 5 допов, 2 промокода) + `store.upsertItem`/`deleteItem`/`reorderItems`. Endpoints `GET /api/catalog` (public), `PUT/DELETE /api/admin/catalog/:section/:id` (auth). Загрузка изображений: `POST /api/admin/upload` (raw binary, no deps, до 8 МБ, jpeg/png/webp/gif/svg/avif), отдача через nginx `^~ /uploads/`. Фронт: `assets/catalog.js` фетчит `/api/catalog` с fallback на embedded и localStorage-кэш + `sobrano:catalog-updated` event. Админка: табы «Каталог» (5 под-табов) и «Медиа», модалка редактирования с image-picker (загрузка/из медиатеки/очистить) и конструктором композиции для подборок (с автоподсчётом стеблей и индикатором переполнения).
- [x] **Patch 2026-05-15** · CRM + закрытие реф-программы: **F33** клиенты автособираются из заказов (`customers[]`, агрегаты totalSpent/avgCheck/orderCount/etc), endpoints `/api/admin/customers*` с фильтрами и сегментами. **F34** карточка клиента в админке: контакты, история, бонусный кошелёк, журнал бонусов, заметки и теги. **H39** закрыто: авто-выдача реф-промо на первой оплате + email, анти-self + first-order rule, начисление `bonusForOwner` в `wallet` (pending → credited → voided lifecycle).
- [x] **Patch 2026-05-15** · доставка-CMS + воронка (A6 + G37): зоны доставки редактируются из админки, на дашборде появилась карточка воронки `view-box→view-cart→view-checkout→оплачено` с шаг-к-шагу и сквозной конверсиями. Трекинг событий без cookie/fingerprinting — sid в localStorage и 30-секундный дедуп на бэке.
- [x] **Patch 2026-05-15** · аналитика (G36 + F35): дашборд с KPI/графиком выручки и заказов по дням/топами боксов/цветов/промо/оплат + чипсы-сегменты в CRM. Стал дефолтным табом в админке. Также: фикс sandbox-обхода через клон `/tmp/sobrano-wd` уже не нужен — деплой идёт через CI/CD.
- [x] **Patch 2026-05-14** · гигиена прода: **K53** ежедневный бэкап `store.json`+`uploads` через systemd-timer (04:00 UTC, retention 30 дней) → `/var/backups/sobrano/`. **K59** ufw enabled с allow-list только 22/80/443 (бэкенд 8787 больше не торчит наружу). Также фикс выравнивания чекбоксов в админ-модалках (раньше `.field input{width:100%}` растягивал чекбокс на всю ширину ячейки — теперь scoped через `:not([type=checkbox])`, добавлен `.field.checkbox` и `.page-chip` для FAQ-страниц).
- [x] **Patch 2026-05-13** · унификация конструктора (L61): один `box.html?size=…` вместо 4-х копий, `page-box.js` гидрирует hero-блок из каталога и рендерит tag-row с переключением размеров без перезагрузки, старые 4 файла превращены в SEO-дружелюбные redirect-стабы. Установка Яндекс.Метрики (`id=109191756`) на 22 публичные страницы через `<head>`.
- [x] **Patch 2026-05-12** · аудит реф-системы и промокодов: серверная валидация промо в `POST /api/orders` (закрыта дыра «клиент шлёт любой total»), декремент `usedCount` при отмене заказа + восстановление при re-activate, перехват `?ref=`/`?promo=` в URL → `localStorage` → автоприменение при загрузке каталога с тостом и очисткой query-параметров.
- [x] **Wave 2 (2026-05-11)**: блоки D и C закрыты полностью. **Заказы**: фильтры (статус/дата/сумма/поиск по ID/имени/телефону/email/треку) + пагинация + экспорт в CSV (с BOM для Excel); расширенный workflow — трек-номер, курьер, фото-перед-отправкой, time-stamps переходов, заметки админа, statusHistory; учёт возврата (статус/сумма/причина) без вызова Robokassa; print-template `admin/print.html` для чека и курьерской наклейки; авто-уведомления клиенту по email (SMTP с STARTTLS/TLS, без зависимостей — `notifications.js` через net+tls) на смену статуса; Telegram-бот админу на новые заказы/оплаты/отмены/возвраты; тестовые кнопки в админке. **Контент**: `seed-content.js` (главная/о бренде/доставка/возврат/контакты/реф) + `store.patchContent`/`setContentSection`/FAQ-CRUD/legal-CRUD с версионированием. Endpoints `GET /api/content` (public), `GET /api/legal/:key`, и под auth: `PATCH|PUT /api/admin/content[/:section]`, `PUT|DELETE /api/admin/faq[/:id]`, `POST /api/admin/faq/reorder`, `PUT /api/admin/legal/:key`, `POST /api/admin/referral/generate-promo`, `POST /api/admin/notifications/test`. Реквизиты ИП и налоговый режим живут в `settings.requisites`. Фронт: `assets/content.js` грузит контент и подставляет в `data-cms-text`/`-html`/`-attr-X`/`-list`/`-faq`/`-markdown` атрибуты; localStorage-кэш с фоллбэком. В админке: новый таб «Контент» (9 под-табов с generic JSON-формой и динамическими массивами), markdown-редактор с live-preview и историей версий для юр.доков, генератор реф-промокодов `REF-NAME-XXXX`, секции «Уведомления» (email + telegram) и «Реквизиты» в табе «Настройки». **Robokassa переведена в бэклог** (блок E).

---

## A. Каталог под управлением

- [x] **A1.** CRUD боксов (S/M/L/XL): имя, вместимость, цена, описание, доступен/скрыт. *(в админке таб «Каталог → Боксы», PUT/DELETE `/api/admin/catalog/boxes/:id`)*
- [x] **A2.** CRUD цветов (16+): имя, категория, цена-от, описание, **stock-флаг**, теги, сортировка. *(таб «Цветы»)*
- [x] **A3.** CRUD подборок: бокс + перечень цветов + допы + цена + категория + старая цена для перечёркивания. Конструктор-форма с автоподсчётом стеблей. *(таб «Подборки»)*
- [x] **A4.** CRUD допов: имя, цена, изображение, описание, доступен. *(таб «Допы»)*
- [x] **A5.** Промокоды: код, % или фикс, дата истечения, лимит использований, минимальная сумма, статистика. *(таб «Промокоды»; usedCount пока не инкрементируется при заказе — добавить в Wave 2)*
- [x] **A6.** Зоны и тарифы доставки · 2026-05-15. На `delivery.html` 6 hardcoded `<div class="zr">` заменены одним template-блоком, обёрнутым в `data-cms-list="content.delivery.zones.list"`. Поля `data-cms-text="@ix/@name/@note/@time/@price"` гидрируются из CMS. Eyebrow/title/lead этой секции тоже привязаны к CMS. Редактируется в админке → Контент → Доставка → массив `zones.list` (добавить/удалить/переупорядочить — через generic JSON-форму).
- [ ] **A7.** Временные слоты: 8 слотов в delivery.html + дополнительная стоимость для срочных. `(1)`
- [x] **A8.** CRUD способов оплаты. `payments` — новая секция каталога с полями `id/type/title/description/icon/instruction/active/order/builtin`. Два built-in: `robokassa-card`, `robokassa-sbp` (нельзя удалить, можно отключить через `active`); custom-методы создаёт админ через «Каталог → Оплаты → ＋ Добавить». Публичный `GET /api/payments` фильтрует по `active`/`hidden` и скрывает Robokassa-методы, если в табе «Оплата» нет MerchantLogin/паролей; админка показывает плашку «скрыт · креды Robokassa пусты» и баннер в форме редактирования built-in. На чекауте список рендерится динамически из `/api/payments` (фоллбэк — две карточки на случай оффлайна API). При создании заказа метод сохраняется в `order.customer.payment` как id. На thank-you показывается название выбранного метода и `instruction` (для custom — «Переведите N ₽…», для Robokassa — описание + текст про автоматический чек). Защита на бэке: `type=robokassa-card|robokassa-sbp` запрещён для не-built-in записей.

---

## B. Изображения и медиа

- [x] **B8.** Загрузка картинок: `POST /api/admin/upload` (raw binary, без зависимостей), хранилище `/opt/sobrano-backend/data/uploads/`, отдача через nginx `^~ /uploads/`. WebP-конверсия пока не делается (опционально, через `sharp` позже).
- [x] **B9.** Медиатека: таб «Медиа» в админке, сетка превью, удаление, копирование URL по клику. Поиск по тегам пока нет — добавим если файлов будет много.
- [x] **B10.** Привязка к каталогу: в модалке редактирования товара кнопки «Загрузить» и «Из медиатеки», превью обновляется в реальном времени.
- [ ] **B11.** Несколько изображений на товар: главное + галерея. `(2)`

---

## C. Контент-менеджмент сайта

- [x] **C12.** Тексты главной: hero (eyebrow/titleHtml/sub/CTA/image+метки), stats, концепция (eyebrow/title/lead/pills/principles), «как работает» (steps), бегущая строка (marquee), финальный CTA. *(админ → Контент → Главная, generic JSON-форма)*
- [x] **C13.** FAQ: CRUD вопрос/ответ + страницы показа (home/delivery/returns/referral) + порядок + видимость. На фронте — `data-cms-faq="home"` рендерит аккордеон только для нужной страницы.
- [x] **C14.** Страница «О бренде»: hero, why (compare), 5 принципов, timeline, команда (members), склад, CTA.
- [x] **C15.** Страница «Доставка»: hero, types (own/express), zones, slots, payment, rules, cta. *(FAQ-секция — общий FAQ-список с фильтром по странице)*
- [x] **C16.** Страница «Возврат и гарантия»: hero+guarantee card, options, process, checklist, rulesTable, cta.
- [x] **C17.** Страница «Контакты»: hero, channels, info (hoursRows/whereRows), formSection.
- [x] **C18.** Реф-программа: текст + правила + механика. `mechanics.{friendDiscountPct,ownerBonusAmount,minOrderForBonus,promoPrefix}` управляются из админки; кнопка «＋ Реф-промокод» в табе «Каталог → Промокоды» создаёт промо вида `REF-ИМЯ-RAND` с `ref:true`, `refOwner:{name,email,phone}`, `bonusForOwner`.
- [x] **C19.** Юридические документы: Markdown-редактор с live-preview, версионирование (`v1, v2, …`), history (последние 30 версий) и публичный `GET /api/legal/:key`. На страницах `terms/privacy/offer/consent` — плейсхолдер `data-cms-markdown="key"` (рендерится только если `version > 0`).
- [x] **C20.** Реквизиты: `settings.requisites` (legalName/legalNameShort/inn/ogrnip/address/account/correspAccount/bik/bank/taxRegime) — редактируется в табе «Настройки». На страницах `requisites.html` и в футере 16 публичных страниц — биндинги `data-cms-text="requisites.*"`.

---

## D. Заказы и операционка

- [x] **D21.** Фильтры и поиск: статус, дата (от/до), сумма (от/до), поиск по ID/имени/телефону/email/треку. Пагинация по 25 на страницу.
- [x] **D22.** Экспорт CSV — `GET /api/admin/orders/export.csv` с теми же фильтрами, BOM для Excel, `;`-разделитель, 23 колонки (ID/дата/статус/клиент/состав/доставка/трек/курьер/возврат/заметка).
- [x] **D23.** Печать чека/этикетки: `admin/print.html?id=ID&print=1` — print-friendly шаблон с курьерской наклейкой, составом, суммами и реквизитами ИП. Кнопка «⎙ Печать» в списке и в детальной.
- [x] **D24.** Расширенный workflow: `trackNo`, `courier`, `photo` (URL или загрузка), time-stamps (`paidAt/doingAt/shippedAt/doneAt/cancelledAt`) автоматически при смене статуса, `statusHistory[]` с timestamp и автором.
- [x] **D25.** Заметки к заказу — поле `note` (до 5000 символов) с отдельной кнопкой «Сохранить заметку» в детальной модалке.
- [x] **D26.** Возврат / частичный возврат: статус (`requested/approved/processed/rejected`), сумма, причина, timestamp. Выполняется **без** интеграции с Robokassa — деньги возвращаются вручную в ЛК Robokassa, в админке учёт.
- [x] **D27.** Уведомления клиента: email по SMTP (host/port/secure/user/pass/from) на смену статуса (триггеры настраиваются — paid/doing/shipped/done/cancelled). Telegram-бот админу на newOrder/paid/cancelled/refund. Кнопки «тестовое письмо» и «тестовое сообщение». Без зависимостей — `notifications.js` через `net`+`tls`+`https`.

---

## E. Robokassa завершить — _в бэклоге_

> 🅱️ Перенесено в бэклог 2026-05-11 — пока без реализации, ждём принципиального решения по приёму платежей. Инфраструктура (стор, креды в админке, эндпоинты `create-payment`/`result`) на месте, можно достать в любой момент.

- [ ] **E28.** Подключение: заполнить креды в админке. `(0,5)`
- [ ] **E29.** В чекауте на «Оплатить»: сейчас редирект на thank-you, сделать `POST /api/robokassa/create-payment` → форма → авто-submit на Robokassa. `(1)`
- [ ] **E30.** ResultURL: проверить с реальной тестовой оплатой, callback меняет статус на `paid`. `(0,5)`
- [ ] **E31.** Фискализация: указать СНО (УСН) в админке/`.env`. `(0,5)`
- [ ] **E32.** Чек на email: проверить что Robokassa автоматически шлёт. `(0,5)`

---

## F. CRM и клиенты

- [x] **F33.** База клиентов · 2026-05-15. `store.customers[]` собирается автоматически: `addOrder`/`updateOrder` вызывают `upsertCustomerFromOrder` — по `email` или `phone` (нормализованным) ищем/создаём запись, агрегируем `orderCount`/`paidCount`/`cancelledCount`/`totalSpent`/`avgCheck`/`firstOrderAt`/`lastOrderAt`, копим все встречавшиеся `emails[]`/`phones[]`/`addresses[]`/`channels[]`. `totalSpent` считается только по статусам `paid/doing/shipped/done`, отменённые не идут в сумму. Backfill для уже существующих заказов: `POST /api/admin/customers/rebuild` (или `store.rebuildCustomersFromOrders()` через node). Endpoints: `GET /api/admin/customers?query=&segment=new|active|dormant`, `GET /api/admin/customers/:id` (отдаёт ещё `orders[]` и `bonuses[]` клиента).
- [x] **F34.** Карточка клиента · 2026-05-15. В админке новая вкладка «Клиенты» с таблицей (поиск по имени/email/телефону/тегу, фильтр по сегменту, статистика над таблицей: всего/новые/постоянные/спящие). Клик по строке → детальная модалка: контакты, история адресов, метрики (заказы/сумма/средний чек), бонусный кошелёк, реф-промокод (с кнопкой «Скопировать»), журнал бонусов (`pending`/`credited`/`spent`/`voided`), список заказов с переходом в детальную заказа, поля для редактирования: имя, заметки админа, теги (через запятую). `PATCH /api/admin/customers/:id` сохраняет name/notes/tags.
- [x] **F35.** Сегменты · 2026-05-15. В табе «Клиенты» 4 чипсы-фильтра (Все / Новые / Постоянные / Спящие) с живыми счётчиками; 4 KPI-карточки сверху стали кликабельными и применяют тот же фильтр. Сегментирование на бэкенде через `GET /api/admin/customers?segment=new|active|dormant` уже было, теперь обёрнуто в нормальный UI.

---

## G. Аналитика и отчётность

- [x] **G36.** Дашборд · 2026-05-15. Новый таб «Дашборд» (стартовый по умолчанию вместо «Заказы»). Чипсы периодов: 7d / 30d / 90d / всё время. 4 KPI: выручка, оплачено + конверсия %, средний чек, новые клиенты + возвратность %. Inline-SVG график (без внешних деп): бары выручки (винный градиент, левая ось) + точки оплаченных заказов (терракот, правая ось), 4 деления y-сетки. Четыре топа с rank-баром: боксы, цветы (по стеблям), промокоды (с суммой скидок), способы оплаты. Бэкенд `GET /api/admin/stats?period=` агрегирует из orders/customers в O(n).
- [x] **G37.** Воронка · 2026-05-15. Лёгкий event-tracker без зависимостей: новая секция `events` в `store.json` (50k cap), белый список из 4 событий (`view-box`/`view-cart`/`view-checkout`/`view-thanks`), 30-секундный дедуп по (event, sid). Публичный `POST /api/track` с body `{event, sid}` (без PII; sid — 12-hex случайный, в `localStorage` ключ `sobrano_sid_v1`). `assets/sobrano-config.js` сам определяет тип события по `location.pathname` и шлёт `fetch keepalive`. `/api/admin/stats` возвращает `funnel: {viewBox, viewCart, viewCheckout, paid}` по уникальным sid за период. В дашборде — новая карточка «Воронка»: 4 шага с числом сессий, шаг-к-шагу конверсия %, относительный bar и итоговая сквозная конверсия %.
- [ ] **G38.** Отчёт по складу: по проданным цветам за период — для закупок. `(1)`

---

## H. Маркетинг и привлечение

- [x] **H39.** Реф-программа · полностью закрыта 2026-05-15. **Из 2026-05-12:** учёт `?ref=CODE`/`?promo=CODE` в URL → localStorage → авто-применение в корзине с toast; серверная валидация промо в `POST /api/orders` (`validatePromoServer` пересчитывает `discount`/`total` своим справочником, проверяет `not-found`/`inactive`/`expired`/`limit-reached`/`min-subtotal`); `usedCount` декремент/инкремент при cancel/re-activate. **Закрыто 2026-05-15:** (1) Авто-генерация персонального реф-промокода `REF-NAME-XXXX` при первом переходе заказа клиента в `paid/doing/shipped/done` (триггер в `patchOrder`, `ensurePersonalReferralPromo`) — код сохраняется в `customer.referralPromo`, регистрируется в `catalog.promos` с `ref:true`/`refOwner`/`bonusForOwner`, отправляется клиенту в email через `sendReferralPromoEmail` (если SMTP включён). (2) Анти-self: реф-промо рейджектится с `ref-self`, если `customer.email === promo.refOwner.email`. (3) First-order rule: рейджект `ref-not-first-order`, если у клиента уже есть оплаченные заказы (`paidCount > 0`). (4) Bonus accrual: при применении реф-промо создаётся запись в `store.bonuses[]` со статусом `pending`, при оплате заказа-источника → `credited` + `wallet += bonusForOwner`, при отмене → `voided` с возвратом баланса. Журнал бонусов виден в карточке клиента.
- [ ] **H40.** Бегущая строка / баннеры: акционные плашки. `(1)`
- [ ] **H41.** SEO мета: title/description/og:* per-page из админки. `(1)`
- [ ] **H42.** Sitemap: автогенерация при изменении контента. `(0,5)`
- [ ] **H43.** Динамика на `referral.html` для залогиненного клиента: показывать его реальный реф-промокод вместо хардкода `BLOOM-ANNA-2026`, реальную «историю друзей» и накопленные бонусы. Требует магик-link или базовой авторизации клиента (cookie/email). Зависит от H39 и F33. `(2)`

---

## I. Операционные настройки

- [x] **I43.** Рабочие часы. *(уже в админке)*
- [x] **I44.** Оффлайн-режим. *(уже в админке)*
- [x] **I45.** Контакты. *(уже в админке)*
- [ ] **I46.** Праздники / особый график: календарь с индивидуальными часами на конкретные даты. `(1)`
- [ ] **I47.** Команда флористов: список, фото, биографии. `(1)`
- [ ] **I48.** Уведомления администратору: Telegram-бот в чат на новые заказы / оплаты / жалобы. `(2)`

---

## J. Многопользовательский доступ

- [ ] **J49.** Несколько админов: хранить пользователей в store с bcrypt/sha256+salt. `(2)`
- [ ] **J50.** Роли: Owner / Manager / Florist / Read-only с разрешениями по разделам. `(2)`
- [ ] **J51.** Журнал действий: audit-лог кто что когда менял. `(2)`

---

## K. Технические долги

- [ ] **K52.** БД вместо JSON: SQLite при росте до >1000 заказов. `(3)`
- [x] **K53.** Бэкапы · 2026-05-14. Скрипт `/opt/sobrano-backend/bin/backup.sh` пакует `data/store.json` и `data/uploads/` в tar.gz, кладёт в `/var/backups/sobrano/store-YYYYMMDD-HHMMSS.tar.gz` (640 perms, root:root), чистит файлы старше 30 дней. systemd-юнит `sobrano-backup.service` + timer `sobrano-backup.timer` на ежедневный запуск в 04:00 UTC с randomized-delay 5 мин и `Persistent=true` (наверстает пропуск если сервер был выключен). Журнал — в `journalctl -u sobrano-backup`. На текущий момент архив 20 КБ — на 30 дней займёт ~600 КБ, при 34 ГБ свободных это ничто.
- [ ] **K54.** Rate limiting: на `/api/orders` и `/api/admin/login`. `(1)`
- [ ] **K55.** CAPTCHA / honeypot на публичных формах. `(1)`
- [ ] **K56.** Логирование: структурированный лог в файл + journalctl. `(1)`
- [ ] **K57.** Мониторинг: uptime-чек на `/health`, алерт в Telegram при падении. `(2)`
- [x] **K58.** CI/CD · 2026-05-14. Репозиторий https://github.com/MaxAdmin000/sobrano (public). Workflow `.github/workflows/deploy.yml`: на каждый push в main и через workflow_dispatch — checkout → подключение deploy-ключа из secret `DEPLOY_KEY` → rsync статики в `/var/www/sobrano/` (исключая backend/components/.claude/ROADMAP.md/.git*) → rsync бэкенда в `/opt/sobrano-backend/` (исключая `.env`, `data/store.json`, `data/uploads/`) → chown+chmod → `systemctl restart sobrano-backend` → smoke-test `/health` 3 раза. Конкурентность ограничена через `concurrency.group: deploy` (не параллелит деплои). Отдельный ed25519 deploy-ключ (`~/.ssh/sobrano_deploy_ed25519`) прописан в `/root/.ssh/authorized_keys` с маркером `github-actions@sobrano.store`. Первый прогон через `workflow_dispatch` прошёл за 27 секунд — все 5 шагов зелёные.
- [x] **K59.** Файрвол ufw · 2026-05-14. `ufw default deny incoming / allow outgoing` + allow 22/tcp (SSH), 80/tcp + 443/tcp (nginx) — IPv4 и IPv6. Бэкенд на 8787 был открыт наружу (listen `*:8787`) — теперь снаружи блокируется, nginx-прокси через 127.0.0.1:8787 продолжает работать. Проверено: SSH в свежей сессии открывается, `/` + `/health` отдают 200, `nc 8787` снаружи — timeout.

---

## L. Клиентские улучшения

- [ ] **L60.** Страница отслеживания заказа по № + email/телефон, без логина. `(2)`
- [x] **L61.** Унификация конструктора · 2026-05-13. Создан `box.html` — единый шаблон, который читает `?size=s|m|l|xl` (с фоллбэком на старый `box-X.html`-паттерн). `assets/page-box.js · applyBoxMeta()` гидрирует все динамические места по `data-box-*` атрибутам (title/description, marquee, breadcrumb, hero meta/img/badge/eyebrow, h1, lead, price) и рендерит `data-box-tag-row` с активной отметкой текущего размера + ссылками на остальные. Клик по соседнему размеру переключает `?size=` через `history.replaceState` без перезагрузки — Cart сразу пересобирается. Старые `box-{s,m,l,xl}.html` заменены 17-строчными redirect-стабами с `<link rel="canonical">`, `<meta http-equiv="refresh">` и `location.replace` (для SEO/закладок). Все внутренние ссылки на сайте, `assets/catalog.js`, `assets/popups.js`, `backend/src/seed-catalog.js` и `data/store.json` обновлены на `box.html?size=…`.
- [ ] **L62.** Сохранение «черновиков» бокса с уникальной ссылкой. `(1)`
- [ ] **L63.** Подарочные сертификаты: новая сущность с полями `{code, initialAmount, remaining, recipient, buyer, expiresAt, status}`, UI покупки (отдельный товар «Сертификат N ₽»), генерация уникального кода после оплаты, email получателю, применение в чекауте с поддержкой **частичного списания** (`remaining` уменьшается, остаток переносится). Сейчас в инпуте `cart.html` плейсхолдер «Промокод или подарочный сертификат», но логика только под промокоды (`Cart.applyPromo` → `PROMOS` lookup) — сертификаты обрабатываются как мифические. `(3)`

---

## Что брать в первую очередь

После Wave 2 (2026-05-11) основной CMS и операционка закрыты. Дальше по приоритету:

1. **K58 + K53 + K59** — CI/CD, ежедневные бэкапы `data/store.json`+`uploads`, ufw. Гигиена перед серьёзным трафиком. `(2 + 1 + 0,5)`
2. **A6 + A7 + A8** — зоны/слоты/способы оплаты под управлением админки (последний остаток блока A после Wave 1). `(2 + 1 + 3)`
3. **F33 + G36** — база клиентов из заказов + дашборд. Полезно как только пойдёт стабильный поток заказов. `(3 + 3)`
4. **L60 + L61** — клиентская страница отслеживания заказа + унификация конструктора `box.html?size=`. `(2 + 3)`
5. **E28-E32** (бэклог) — Robokassa подключить, когда будет принципиальное решение по приёму платежей.

Заметка по эксплуатации Wave 2: после деплоя необходимо очистить серверный `data/store.json` или дать ему мигрироваться автоматически (`load()` подмигрирует новые секции `content`/`requisites`/`notifications` из дефолтов). Аплоад заказов и каталога не теряется.
