// Простое файловое хранилище. Достаточно для MVP админки.
// На горячих путях — кэш в памяти, на запись — atomic rename.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const seedCatalog = require("./seed-catalog");
const seedContent = require("./seed-content");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "store.json");

const DEFAULT = () => ({
  settings: {
    workingHours: { start: 9, end: 22, days: [0, 1, 2, 3, 4, 5, 6] },
    offline: { active: false, title: "", message: "", eta: null, returnAt: null },
    contacts: {
      telegram: "https://t.me/sobrano",
      whatsapp: "https://wa.me/78000000000",
      phone: "+7 800 000-00-00",
      email: "hello@sobrano.store",
    },
    requisites: {
      legalName: "ИП Горбулёв Андрей Юрьевич",
      legalNameShort: "ИП Горбулёв А. Ю.",
      inn: "781700477351",
      ogrnip: "321784700154873",
      address: "г. Санкт-Петербург",
      account: "40802810355000126858",
      correspAccount: "30101810500000000653",
      bik: "044030653",
      bank: "Северо-Западный банк ПАО Сбербанк, г. Санкт-Петербург",
      taxRegime: "Упрощённая система налогообложения (УСН)",
    },
    notifications: {
      // Email через SMTP
      email: {
        enabled: false,
        host: "", port: 587, secure: false, // true=465/TLS, false=587/STARTTLS
        user: "", pass: "",
        from: "",
        // Какие статусы отправлять клиенту:
        triggers: { paid: true, doing: true, shipped: true, done: true, cancelled: true },
      },
      // Telegram бот: уведомления админу про новые/изменённые заказы
      telegram: {
        enabled: false,
        botToken: "",
        chatId: "",
        // Опциональный URL обратного прокси (например, Cloudflare Worker) —
        // если задан, запросы пойдут на него вместо api.telegram.org.
        // Нужно когда хостинг сервера блокирует прямой выход на api.telegram.org (Роскомнадзор / DPI).
        proxyUrl: "",
        events: { newOrder: true, paid: true, cancelled: true, refund: true },
      },
    },
  },
  // Чувствительные креды Robokassa. Никогда не отдаются в открытом виде наружу.
  robokassa: {
    merchantLogin: "",
    password1: "",
    password2: "",
    isTest: true,
    hashAlgorithm: "md5",
  },
  // Каталог: при первом запуске — из seed-catalog.js. Дальше правится только из админки.
  catalog: JSON.parse(JSON.stringify(seedCatalog)),
  // Контент сайта (тексты страниц, FAQ, юр.доки)
  content: JSON.parse(JSON.stringify(seedContent)),
  orders: [],
  // CRM: клиенты автогенерируются из заказов на ходу.
  customers: [],
  // События для воронки (G37): [{ event, sid, at }], где event = view-box|view-cart|view-checkout|view-thanks
  // Уникальные сессии считаются по `sid` (короткий клиентский cookie/localStorage id).
  // Лог обрезается до 50k последних записей.
  events: [],
});

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  if (cache) return cache;
  ensureDir();
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, "utf8");
      const parsed = JSON.parse(raw);
      const def = DEFAULT();
      // Подмиграция: каждую секцию аккуратно merge'им до того, как Object.assign перетрёт defaults.
      // Это даёт безопасное обновление существующего store.json при выкатке новой версии
      // (добавляются недостающие notifications/requisites/content/legal без потери данных).
      cache = {
        settings: deepMerge(def.settings, parsed.settings || {}),
        robokassa: deepMerge(def.robokassa, parsed.robokassa || {}),
        catalog: parsed.catalog && typeof parsed.catalog === "object" ? parsed.catalog : def.catalog,
        content: deepMerge(def.content, parsed.content || {}),
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
      };
      ["boxes", "flowers", "picks", "addons", "promos", "payments", "channels"].forEach((k) => {
        if (!Array.isArray(cache.catalog[k])) cache.catalog[k] = def.catalog[k] || [];
      });
      if (!cache.catalog.delivery) cache.catalog.delivery = def.catalog.delivery;
      // Гарантируем, что встроенные способы оплаты Robokassa существуют (на случай, если их случайно удалили из JSON).
      ensureBuiltinPayments(cache.catalog.payments, def.catalog.payments);
      // Аналогично для каналов связи: built-in (telegram/whatsapp/phone/email) удалить нельзя.
      ensureBuiltinChannels(cache.catalog.channels, def.catalog.channels, cache.settings && cache.settings.contacts);
      if (!Array.isArray(cache.content.faq)) cache.content.faq = def.content.faq || [];
      if (!cache.content.legal || typeof cache.content.legal !== "object") cache.content.legal = def.content.legal;
      // Подмиграция полей delivery slots: добавляем поля A7 (id/startHour/endHour/surcharge/checkoutHidden)
      // в существующие записи, не затирая значения, которые админ мог уже отредактировать.
      const slotsList = cache.content && cache.content.delivery && cache.content.delivery.slotsBlock && cache.content.delivery.slotsBlock.list;
      if (Array.isArray(slotsList)) {
        const defSlots = (def.content.delivery.slotsBlock.list || []);
        const parseT = (t) => {
          const m = String(t || "").match(/^\s*(\d{1,2})(?:[:.](\d{1,2}))?\s*[—\-–]\s*(\d{1,2})(?:[:.](\d{1,2}))?/);
          if (!m) return null;
          return { startHour: Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0), endHour: Number(m[3]) + (m[4] ? Number(m[4]) / 60 : 0) };
        };
        slotsList.forEach((slot, i) => {
          if (!slot || typeof slot !== "object") return;
          const refDef = defSlots[i] || {};
          if (slot.id == null)        slot.id        = refDef.id || ("s" + (i + 1));
          if (slot.surcharge == null) slot.surcharge = refDef.surcharge || 0;
          if (slot.peak == null)      slot.peak      = !!refDef.peak;
          if (slot.startHour == null || slot.endHour == null) {
            const parsed = parseT(slot.t);
            if (parsed) {
              if (slot.startHour == null) slot.startHour = parsed.startHour;
              if (slot.endHour == null)   slot.endHour   = parsed.endHour;
            } else if (slot.checkoutHidden == null) {
              // Нерасшифровываемый текст («К конкретному часу», «Срочно · 60 мин») →
              // оставляем информационным: на delivery.html виден, в чекауте скрыт.
              slot.checkoutHidden = true;
            }
          }
        });
      }
    } else {
      cache = DEFAULT();
      save();
    }
  } catch (e) {
    console.error("store load error:", e);
    cache = DEFAULT();
  }
  return cache;
}

function save() {
  ensureDir();
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tmp, FILE);
}

function getSettings() {
  return load().settings;
}

function setSettings(patch) {
  const s = load();
  s.settings = deepMerge(s.settings, patch || {});
  save();
  return s.settings;
}

// ---------- ORDERS ----------

function getOrders() {
  return load().orders.slice();
}

function getOrderById(id) {
  return load().orders.find((o) => o.id === id) || null;
}

function addOrder(order) {
  const s = load();
  const now = Date.now();
  const seeded = Object.assign({
    createdAt: now,
    status: "new",
    statusHistory: [{ status: "new", at: now }],
    note: "",
    trackNo: "",
    courier: "",
    photo: "",
    refund: null, // { status, reason, amount, at }
    paidAt: null, doingAt: null, shippedAt: null, doneAt: null, cancelledAt: null,
  }, order);
  s.orders.unshift(seeded);
  if (s.orders.length > 1000) s.orders.length = 1000;
  save();
  // CRM: апсерт клиента из заказа (создаст карточку или обновит метрики).
  upsertCustomerFromOrder(seeded);
  return seeded;
}

// Допустимые поля, которые админка может править
const ORDER_PATCHABLE = ["status", "note", "trackNo", "courier", "photo", "refund"];
// Какие переходы по статусам ставят какой timestamp
const STATUS_TIMESTAMPS = {
  paid: "paidAt", doing: "doingAt", shipped: "shippedAt", done: "doneAt", cancelled: "cancelledAt",
};

function updateOrder(id, patch) {
  const s = load();
  const idx = s.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const prev = s.orders[idx];
  const next = Object.assign({}, prev);

  for (const k of ORDER_PATCHABLE) {
    if (patch[k] !== undefined) next[k] = patch[k];
  }

  // Если статус сменился — обновляем history и ставим timestamp
  if (patch.status && patch.status !== prev.status) {
    if (!Array.isArray(next.statusHistory)) next.statusHistory = [];
    next.statusHistory = next.statusHistory.concat([{
      status: patch.status,
      at: Date.now(),
      by: patch.by || "admin",
      ...(patch.statusNote ? { note: String(patch.statusNote).slice(0, 200) } : {}),
    }]);
    const tsField = STATUS_TIMESTAMPS[patch.status];
    if (tsField && !next[tsField]) next[tsField] = Date.now();

    // Декремент статистики промокода при отмене заказа.
    // bumpPromoUsage увеличил счётчик при создании заказа, при cancelled — возвращаем единицу.
    // Используем флаг promoUsageDecremented, чтобы не декрементить повторно при reactivate→cancel.
    if (patch.status === "cancelled" && prev.status !== "cancelled" && next.promo && !next.promoUsageDecremented) {
      decrementPromoUsage(next.promo);
      next.promoUsageDecremented = true;
    }
    // Обратный кейс: если разотменили (cancelled → paid/doing/done), счётчик надо вернуть обратно.
    if (prev.status === "cancelled" && patch.status !== "cancelled" && next.promo && next.promoUsageDecremented) {
      bumpPromoUsage(next.promo);
      next.promoUsageDecremented = false;
    }
  }

  s.orders[idx] = next;
  save();
  // Любое изменение заказа → пересчитываем метрики клиента (totalSpent зависит от статусов).
  upsertCustomerFromOrder(next);
  return next;
}

function decrementPromoUsage(code) {
  if (!code) return;
  const arr = _section("promos");
  const idx = arr.findIndex((p) => String(p.code).toUpperCase() === String(code).toUpperCase());
  if (idx >= 0 && (arr[idx].usedCount || 0) > 0) {
    arr[idx].usedCount = (arr[idx].usedCount || 0) - 1;
    save();
  }
}

// ---------- CUSTOMERS / CRM ----------
// Клиенты автособираются из заказов: после addOrder/updateOrder вызывается upsertCustomerFromOrder.
// Первичный идентификатор — email; если email нет, fallback на нормализованный телефон.
// Статусы paid/doing/shipped/done считаются "оплаченным заказом" для статистики.
// cancelled — НЕ учитывается в totalSpent, но фигурирует в orderCount/cancelledCount.

const PAID_STATUSES = ["paid", "doing", "shipped", "done"];

function normalizeEmail(e) { return String(e || "").trim().toLowerCase(); }
function normalizePhone(p) {
  // Только цифры, ведущая 7/8 → +7. Без жёсткой валидации.
  const digits = String(p || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) return "+7" + digits.slice(1);
  if (digits.length === 10) return "+7" + digits;
  return "+" + digits;
}
function customerKey(email, phone) {
  if (email) return "email:" + normalizeEmail(email);
  if (phone) return "phone:" + normalizePhone(phone);
  return "";
}

function listCustomers() { return load().customers.slice(); }
function getCustomerById(id) { return load().customers.find((c) => c.id === id) || null; }
function getCustomerByKey(key) { return load().customers.find((c) => c.primaryId === key) || null; }
function getCustomerByEmail(email) {
  const k = customerKey(email, "");
  return k ? getCustomerByKey(k) : null;
}

// Вытаскиваем поля клиента из заказа (форма checkout кладёт всё в order.customer).
function extractCustomerFromOrder(order) {
  const c = order && order.customer ? order.customer : {};
  return {
    name: String(c.name || "").trim(),
    email: normalizeEmail(c.email),
    phone: normalizePhone(c.phone),
    addr: String(c.addr || "").trim(),
    apt: String(c.apt || "").trim(),
    channel: c.channel || "",
  };
}

// Создаёт или обновляет клиента по факту заказа. Возвращает customer record.
function upsertCustomerFromOrder(order) {
  if (!order || !order.customer) return null;
  const data = extractCustomerFromOrder(order);
  const key = customerKey(data.email, data.phone);
  if (!key) return null;
  const s = load();
  let cust = s.customers.find((c) => c.primaryId === key);
  if (!cust) {
    cust = {
      id: crypto.randomBytes(4).toString("hex"),
      primaryId: key,
      name: data.name,
      email: data.email,
      phone: data.phone,
      emails: data.email ? [data.email] : [],
      phones: data.phone ? [data.phone] : [],
      addresses: data.addr ? [combineAddr(data.addr, data.apt)] : [],
      channels: data.channel ? [data.channel] : [],
      firstOrderAt: order.createdAt || Date.now(),
      lastOrderAt: order.createdAt || Date.now(),
      orderCount: 0,
      paidCount: 0,
      cancelledCount: 0,
      totalSpent: 0,
      avgCheck: 0,
      notes: "",
      tags: [],
      createdAt: Date.now(),
    };
    s.customers.push(cust);
  } else {
    // Обновляем «свежие» поля по последнему заказу
    if (data.name) cust.name = data.name;
    if (data.email && !cust.email) cust.email = data.email;
    if (data.phone && !cust.phone) cust.phone = data.phone;
    addUnique(cust.emails, data.email);
    addUnique(cust.phones, data.phone);
    addUnique(cust.addresses, combineAddr(data.addr, data.apt));
    addUnique(cust.channels, data.channel);
  }
  // Полный пересчёт статистики из orders — дешевле чем поддерживать инкрементальные счётчики.
  recomputeCustomerStats(cust);
  save();
  return cust;
}

function combineAddr(addr, apt) {
  return [addr, apt].filter(Boolean).join(", ");
}
function addUnique(arr, val) {
  if (!val) return;
  if (!arr.includes(val)) arr.push(val);
}

function recomputeCustomerStats(cust) {
  const s = load();
  const all = s.orders.filter((o) => {
    const c = o.customer || {};
    const k = customerKey(c.email, c.phone);
    return k === cust.primaryId;
  });
  cust.orderCount = all.length;
  cust.paidCount = all.filter((o) => PAID_STATUSES.indexOf(o.status || "new") >= 0).length;
  cust.cancelledCount = all.filter((o) => (o.status || "new") === "cancelled").length;
  cust.totalSpent = all
    .filter((o) => PAID_STATUSES.indexOf(o.status || "new") >= 0)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  cust.avgCheck = cust.paidCount > 0 ? Math.round(cust.totalSpent / cust.paidCount) : 0;
  if (all.length) {
    const sorted = all.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    cust.firstOrderAt = sorted[0].createdAt || cust.firstOrderAt;
    cust.lastOrderAt = sorted[sorted.length - 1].createdAt || cust.lastOrderAt;
  }
}

// Полный backfill — пройти по всем заказам и собрать клиентов. Вызывается из миграции
// при первом запуске после релиза F33, либо вручную через POST /api/admin/customers/rebuild.
function rebuildCustomersFromOrders() {
  const s = load();
  s.customers = [];
  // Идём от самых старых заказов вперёд, чтобы firstOrderAt/lastOrderAt вычислились корректно
  // на каждом шаге (recomputeCustomerStats всё равно пересчитает по всему массиву).
  const sorted = s.orders.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const o of sorted) {
    upsertCustomerFromOrder(o);
  }
  return s.customers.length;
}

function patchCustomer(id, patch) {
  const s = load();
  const c = s.customers.find((x) => x.id === id);
  if (!c) return null;
  if (typeof patch.name === "string") c.name = patch.name.slice(0, 120);
  if (typeof patch.notes === "string") c.notes = patch.notes.slice(0, 5000);
  if (Array.isArray(patch.tags)) c.tags = patch.tags.map(String).slice(0, 20);
  save();
  return c;
}

// ---------- EVENTS (G37 — воронка) ----------
// Принимает событие от фронта. Хранит { event, sid, at }. Без PII.
// Защита от мусора: тип события — из белого списка, sid укорачивается до 32 символов,
// и одна сессия не может слать одно и то же событие чаще раза в 30 секунд (де-дуп).

const FUNNEL_EVENTS = new Set(["view-box", "view-cart", "view-checkout", "view-thanks"]);
const DEDUP_WINDOW_MS = 30 * 1000;

function trackEvent(event, sid) {
  const e = String(event || "").trim();
  if (!FUNNEL_EVENTS.has(e)) return false;
  const s = String(sid || "").slice(0, 32);
  if (!s) return false;
  const list = load().events;
  // де-дуп: если эта же связка event+sid была < 30 секунд назад — игнорируем
  const now = Date.now();
  for (let i = list.length - 1; i >= 0 && i > list.length - 50; i--) {
    const it = list[i];
    if (now - (it.at || 0) > DEDUP_WINDOW_MS) break;
    if (it.event === e && it.sid === s) return false;
  }
  list.push({ event: e, sid: s, at: now });
  if (list.length > 50000) list.splice(0, list.length - 50000);
  save();
  return true;
}

function getEvents(sinceMs) {
  const list = load().events;
  if (!sinceMs) return list.slice();
  return list.filter((e) => (e.at || 0) >= sinceMs);
}

// ---------- CATALOG ----------

function getCatalog() {
  return load().catalog;
}

const SECTIONS = ["boxes", "flowers", "picks", "addons", "promos", "payments", "channels"];

// Гарантирует, что built-in способы оплаты (Robokassa) присутствуют. Если админ их удалил из JSON
// руками — восстанавливаем по seed-данным, чтобы интеграция Robokassa оставалась доступной.
function ensureBuiltinPayments(arr, seed) {
  if (!Array.isArray(arr) || !Array.isArray(seed)) return;
  seed.filter((s) => s.builtin).forEach((s) => {
    if (!arr.some((p) => p.id === s.id)) arr.push(Object.assign({}, s));
  });
}

// Гарантирует built-in каналы связи + одноразовая миграция из старого settings.contacts.
// Логика:
//   - Если в массиве нет built-in канала по id — добавляем из seed.
//   - Если в settings.contacts есть кастомное значение для этого канала (отличное от seed-дефолта)
//     И в catalog.channels оно ещё дефолтное — переписываем href, чтобы данные не потерялись.
function ensureBuiltinChannels(arr, seed, settingsContacts) {
  if (!Array.isArray(arr) || !Array.isArray(seed)) return;
  for (const s of seed.filter((x) => x.builtin)) {
    let item = arr.find((x) => x.id === s.id);
    if (!item) { item = Object.assign({}, s); arr.push(item); }
    // Миграция из settings.contacts: telegram/whatsapp/phone/email
    if (settingsContacts && typeof settingsContacts === "object") {
      const fromSettings = settingsContacts[s.id];
      if (fromSettings && item.href === s.href) {
        item.href = String(fromSettings);
      }
    }
  }
}

function _section(name) {
  if (!SECTIONS.includes(name)) throw new Error("Unknown section: " + name);
  const s = load();
  if (!Array.isArray(s.catalog[name])) s.catalog[name] = [];
  return s.catalog[name];
}

function _idField(section) {
  return section === "promos" ? "code" : "id";
}

function listSection(name) {
  return _section(name).slice();
}

function upsertItem(section, item) {
  const arr = _section(section);
  const idField = _idField(section);
  if (!item || typeof item !== "object") throw new Error("Bad item");
  const id = String(item[idField] || "").trim();
  if (!id) throw new Error(`Field "${idField}" is required`);
  const idx = arr.findIndex((x) => String(x[idField]) === id);
  if (idx >= 0) {
    arr[idx] = Object.assign({}, arr[idx], item, { [idField]: id });
  } else {
    if (item.order == null) item.order = (arr.reduce((m, x) => Math.max(m, x.order || 0), 0) || 0) + 1;
    arr.push(Object.assign({}, item, { [idField]: id }));
  }
  save();
  return arr.find((x) => String(x[idField]) === id);
}

function deleteItem(section, id) {
  const arr = _section(section);
  const idField = _idField(section);
  const idx = arr.findIndex((x) => String(x[idField]) === String(id));
  if (idx < 0) return false;
  arr.splice(idx, 1);
  save();
  return true;
}

function reorderItems(section, ids) {
  const arr = _section(section);
  const idField = _idField(section);
  const order = {};
  ids.forEach((id, i) => { order[String(id)] = i + 1; });
  arr.forEach((x) => {
    const k = String(x[idField]);
    if (order[k] != null) x.order = order[k];
  });
  save();
  return arr.slice();
}

// Учёт использований промокода — вызывается при создании заказа
function bumpPromoUsage(code) {
  if (!code) return;
  const arr = _section("promos");
  const idx = arr.findIndex((p) => String(p.code).toUpperCase() === String(code).toUpperCase());
  if (idx >= 0) {
    arr[idx].usedCount = (arr[idx].usedCount || 0) + 1;
    save();
  }
}

// ---------- ROBOKASSA ----------

function getRobokassa() {
  return load().robokassa || { merchantLogin: "", password1: "", password2: "", isTest: true, hashAlgorithm: "md5" };
}

function setRobokassa(patch) {
  const s = load();
  const cur = s.robokassa || {};
  const next = Object.assign({}, cur);
  if (patch && typeof patch === "object") {
    if (typeof patch.merchantLogin === "string") next.merchantLogin = patch.merchantLogin.trim();
    if (patch.password1 === null) next.password1 = "";
    else if (typeof patch.password1 === "string" && patch.password1 !== "") next.password1 = patch.password1;
    if (patch.password2 === null) next.password2 = "";
    else if (typeof patch.password2 === "string" && patch.password2 !== "") next.password2 = patch.password2;
    if (typeof patch.isTest === "boolean") next.isTest = patch.isTest;
    if (typeof patch.hashAlgorithm === "string" && patch.hashAlgorithm) next.hashAlgorithm = patch.hashAlgorithm;
  }
  s.robokassa = next;
  save();
  return next;
}

// ---------- CONTENT ----------

function getContent() {
  return load().content;
}

// Глубокая патч-замена секции контента: например patchContent("home", {...})
// если section = null → патч всего content (deep merge).
function patchContent(section, patch) {
  const s = load();
  if (!s.content || typeof s.content !== "object") s.content = {};
  if (section) {
    s.content[section] = deepMerge(s.content[section] || {}, patch || {});
  } else {
    s.content = deepMerge(s.content, patch || {});
  }
  save();
  return s.content;
}

// Полная замена секции (использовать для массивов вроде faq, principles, steps)
function setContentSection(section, value) {
  const s = load();
  if (!s.content || typeof s.content !== "object") s.content = {};
  s.content[section] = value;
  save();
  return s.content[section];
}

// ---------- FAQ ----------
// FAQ — массив { id, q, a, pages: [...], order, hidden }

function _faqArr() {
  const c = load().content;
  if (!Array.isArray(c.faq)) c.faq = [];
  return c.faq;
}

function listFaq() {
  return _faqArr().slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}

function upsertFaq(item) {
  if (!item || typeof item !== "object") throw new Error("Bad faq item");
  const arr = _faqArr();
  let id = String(item.id || "").trim();
  if (!id) {
    id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  const idx = arr.findIndex((x) => x.id === id);
  const clean = {
    id,
    q: String(item.q || "").slice(0, 300),
    a: String(item.a || "").slice(0, 5000),
    pages: Array.isArray(item.pages) ? item.pages.map(String) : [],
    order: Number(item.order) || 0,
    hidden: !!item.hidden,
  };
  if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], clean);
  else {
    if (!clean.order) clean.order = (arr.reduce((m, x) => Math.max(m, x.order || 0), 0) || 0) + 1;
    arr.push(clean);
  }
  save();
  return arr.find((x) => x.id === id);
}

function deleteFaq(id) {
  const arr = _faqArr();
  const idx = arr.findIndex((x) => x.id === id);
  if (idx < 0) return false;
  arr.splice(idx, 1);
  save();
  return true;
}

function reorderFaq(ids) {
  const arr = _faqArr();
  const order = {};
  ids.forEach((id, i) => { order[id] = i + 1; });
  arr.forEach((x) => { if (order[x.id] != null) x.order = order[x.id]; });
  save();
  return listFaq();
}

// ---------- LEGAL DOCS ----------
// content.legal[key] = { md, version, updatedAt, updatedBy, history: [{md, version, at, by}] }

const LEGAL_KEYS = ["terms", "privacy", "offer", "consent", "returns"];

function getLegal(key) {
  if (!LEGAL_KEYS.includes(key)) return null;
  const c = load().content;
  if (!c.legal || typeof c.legal !== "object") c.legal = {};
  if (!c.legal[key]) c.legal[key] = { md: "", version: 0, updatedAt: null, history: [] };
  return c.legal[key];
}

function getAllLegal() {
  const out = {};
  LEGAL_KEYS.forEach((k) => { out[k] = getLegal(k); });
  return out;
}

function saveLegal(key, md, opts) {
  if (!LEGAL_KEYS.includes(key)) throw new Error("Unknown legal doc: " + key);
  const c = load().content;
  if (!c.legal || typeof c.legal !== "object") c.legal = {};
  const cur = c.legal[key] || { md: "", version: 0, history: [] };
  if (!Array.isArray(cur.history)) cur.history = [];
  // Прежнюю версию складываем в историю (если была какая-то)
  if (cur.md) {
    cur.history.push({
      md: cur.md,
      version: cur.version || 0,
      at: cur.updatedAt || Date.now(),
      by: cur.updatedBy || "admin",
    });
    if (cur.history.length > 30) cur.history = cur.history.slice(-30);
  }
  c.legal[key] = {
    md: String(md || ""),
    version: (cur.version || 0) + 1,
    updatedAt: Date.now(),
    updatedBy: (opts && opts.by) || "admin",
    history: cur.history,
  };
  save();
  return c.legal[key];
}

// ---------- helpers ----------

function deepMerge(a, b) {
  if (b === null) return null;
  if (b === undefined) return a;
  if (!a || typeof a !== "object" || Array.isArray(a)) return b;
  if (!b || typeof b !== "object" || Array.isArray(b)) return b;
  const out = Object.assign({}, a);
  for (const k of Object.keys(b)) {
    out[k] = deepMerge(a[k], b[k]);
  }
  return out;
}

module.exports = {
  load,
  save,
  // settings
  getSettings,
  setSettings,
  // orders
  getOrders,
  getOrderById,
  addOrder,
  updateOrder,
  // robokassa
  getRobokassa,
  setRobokassa,
  // catalog
  getCatalog,
  listSection,
  upsertItem,
  deleteItem,
  reorderItems,
  bumpPromoUsage,
  SECTIONS,
  // content
  getContent,
  patchContent,
  setContentSection,
  // faq
  listFaq,
  upsertFaq,
  deleteFaq,
  reorderFaq,
  // legal
  getLegal,
  getAllLegal,
  saveLegal,
  LEGAL_KEYS,
  // customers / CRM
  listCustomers,
  getCustomerById,
  getCustomerByEmail,
  upsertCustomerFromOrder,
  patchCustomer,
  rebuildCustomersFromOrders,
  // events / funnel
  trackEvent,
  getEvents,
  FUNNEL_EVENTS,
  // helpers (для admin/notifications)
  normalizeEmail,
  normalizePhone,
  PAID_STATUSES,
};
