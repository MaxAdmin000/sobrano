// Простое файловое хранилище. Достаточно для MVP админки.
// На горячих путях — кэш в памяти, на запись — atomic rename.
const fs = require("node:fs");
const path = require("node:path");
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
  // Контент сайта (тексты страниц, FAQ, реф-программа, юр.доки)
  content: JSON.parse(JSON.stringify(seedContent)),
  orders: [],
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
      };
      ["boxes", "flowers", "picks", "addons", "promos", "payments"].forEach((k) => {
        if (!Array.isArray(cache.catalog[k])) cache.catalog[k] = def.catalog[k] || [];
      });
      if (!cache.catalog.delivery) cache.catalog.delivery = def.catalog.delivery;
      // Гарантируем, что встроенные способы оплаты Robokassa существуют (на случай, если их случайно удалили из JSON).
      ensureBuiltinPayments(cache.catalog.payments, def.catalog.payments);
      if (!Array.isArray(cache.content.faq)) cache.content.faq = def.content.faq || [];
      if (!cache.content.legal || typeof cache.content.legal !== "object") cache.content.legal = def.content.legal;
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

// ---------- CATALOG ----------

function getCatalog() {
  return load().catalog;
}

const SECTIONS = ["boxes", "flowers", "picks", "addons", "promos", "payments"];

// Гарантирует, что built-in способы оплаты (Robokassa) присутствуют. Если админ их удалил из JSON
// руками — восстанавливаем по seed-данным, чтобы интеграция Robokassa оставалась доступной.
function ensureBuiltinPayments(arr, seed) {
  if (!Array.isArray(arr) || !Array.isArray(seed)) return;
  seed.filter((s) => s.builtin).forEach((s) => {
    if (!arr.some((p) => p.id === s.id)) arr.push(Object.assign({}, s));
  });
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
};
