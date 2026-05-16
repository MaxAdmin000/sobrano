// Admin API routes — все за auth, кроме /api/admin/login и публичных эндпоинтов /api/*.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const store = require("./store");
const auth = require("./auth");
const notifications = require("./notifications");

const UPLOADS_DIR = path.join(__dirname, "..", "data", "uploads");

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, data, extraHeaders = {}) {
  send(res, status, JSON.stringify(data), {
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
}

async function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function readBinaryBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error("File too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function parseJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw);
}

function requireSession(req, res) {
  const sess = auth.requireAuth(req);
  if (!sess) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return null;
  }
  return sess;
}

// ===== PUBLIC =====

function getSettings(req, res) {
  const s = store.getSettings();
  // Не отдаём пароли SMTP/токены ботов — только флаги
  const safe = JSON.parse(JSON.stringify(s));
  if (safe.notifications) {
    if (safe.notifications.email) {
      delete safe.notifications.email.pass;
      delete safe.notifications.email.user;
    }
    if (safe.notifications.telegram) {
      delete safe.notifications.telegram.botToken;
    }
  }
  sendJson(res, 200, { ok: true, settings: safe });
}

// Валидация промокода и пересчёт скидки на стороне сервера. Клиент НЕ доверенный источник:
// он может прислать любой код, любой discount, любой total — бэкенд переиспользует только
// поля корзины (бокс/допы/доставка), всё остальное считает сам по своему справочнику.
// Возвращает { code, discount, reason, promo } — code/discount=null/0 если промо отклонён,
// promo = найденная запись (для последующего начисления бонуса owner'у).
function validatePromoServer(rawCode, subtotal, buyerCtx) {
  const out = { code: null, discount: 0, reason: null, promo: null };
  if (!rawCode) return out;
  const code = String(rawCode).trim().toUpperCase();
  if (!code) return out;
  const promos = store.listSection("promos");
  const p = promos.find((x) => String(x.code).toUpperCase() === code);
  if (!p) { out.reason = "not-found"; return out; }
  if (p.active === false) { out.reason = "inactive"; return out; }
  if (p.expiresAt) {
    const t = Date.parse(p.expiresAt);
    if (!isNaN(t) && t < Date.now()) { out.reason = "expired"; return out; }
  }
  if (p.maxUses && (p.usedCount || 0) >= Number(p.maxUses)) {
    out.reason = "limit-reached"; return out;
  }
  if (p.minSubtotal && subtotal < Number(p.minSubtotal)) {
    out.reason = "min-subtotal"; return out;
  }

  const pct = Number(p.discountPct) || 0;
  const discount = Math.round(Math.max(0, subtotal) * pct / 100);
  out.code = code;
  out.discount = discount;
  out.promo = p;
  return out;
}

async function postOrder(req, res, env) {
  try {
    const payload = await parseJsonBody(req);
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    // Принимаем `id` или `orderId` — Cart.finalize() на фронте генерит orderId, бэкенд хранит как id.
    const orderId = payload.id || payload.orderId;
    if (!orderId) throw new Error("Order id required");

    // Пересчитываем subtotal / discount / total от справочника каталога.
    // Это закрывает дыру «клиент может прислать любой total» — мы доверяем только составу заказа.
    const subtotal = Math.max(0, Math.round(Number(payload.subtotal) || 0));
    const deliveryPrice = Math.max(0, Math.round(Number(payload.deliveryPrice) || 0));
    const buyer = payload.customer || {};
    const promoResult = validatePromoServer(payload.promo, subtotal, buyer);
    const total = Math.max(0, subtotal + deliveryPrice - promoResult.discount);

    if (subtotal <= 0) throw new Error("Order subtotal required");

    const order = {
      id: String(orderId).slice(0, 40),
      box: payload.box || null,
      addons: Array.isArray(payload.addons) ? payload.addons : [],
      delivery: payload.delivery || "own",
      deliveryPrice,
      promo: promoResult.code,
      discount: promoResult.discount,
      promoRejectedReason: promoResult.reason,
      subtotal,
      total,
      customer: buyer,
      source: "web",
    };
    const saved = store.addOrder(order);
    if (saved.promo) store.bumpPromoUsage(saved.promo);

    notifications.onOrderCreated(saved);
    const promoLog = promoResult.code
      ? "promo=" + promoResult.code + " -" + promoResult.discount + "₽"
      : (payload.promo ? "promo-rejected(" + payload.promo + ":" + promoResult.reason + ")" : "no-promo");
    console.log("[order] saved", saved.id, "subtotal=" + subtotal, "total=" + total, promoLog, "from", (saved.customer && saved.customer.phone) || "no-phone");
    sendJson(res, 200, {
      ok: true,
      id: saved.id,
      discount: saved.discount,
      total: saved.total,
      promoRejected: promoResult.reason,
    });
  } catch (e) {
    console.warn("[order] rejected:", e.message);
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

function getCatalog(req, res) {
  const c = store.getCatalog();
  sendJson(res, 200, { ok: true, catalog: c });
}

// Публичный приём событий воронки от фронтенда.
// Body: { event: "view-box"|"view-cart"|"view-checkout"|"view-thanks", sid: "<short id>" }
// Идемпотентен в окне 30с (один sid не может задвоить один и тот же шаг).
async function postTrack(req, res) {
  try {
    const payload = await parseJsonBody(req);
    const ok = store.trackEvent(payload && payload.event, payload && payload.sid);
    sendJson(res, 200, { ok: !!ok });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "bad payload" });
  }
}

// Динамический sitemap.xml (H42). Возвращает актуальный список публичных страниц
// с lastmod = время последнего изменения контента сайта (`content.updatedAt` или now).
// Включает 4 варианта `box.html?size=…` как отдельные SEO-страницы.
function getSitemap(req, res) {
  const HOST = "https://sobrano.store";
  const c = store.getContent() || {};
  const lastmod = new Date(Number(c._meta && c._meta.updatedAt) || Date.now())
    .toISOString().slice(0, 10);

  // Список страниц с приоритетами и change-frequency.
  // Каталог (высокий приоритет, часто меняется) → информационные → юридические.
  const pages = [
    { path: "/",                     freq: "weekly",  prio: "1.0" },
    { path: "/flowers.html",         freq: "daily",   prio: "0.9" },
    { path: "/picks.html",           freq: "weekly",  prio: "0.9" },
    { path: "/box.html?size=s",      freq: "weekly",  prio: "0.85" },
    { path: "/box.html?size=m",      freq: "weekly",  prio: "0.85" },
    { path: "/box.html?size=l",      freq: "weekly",  prio: "0.85" },
    { path: "/box.html?size=xl",     freq: "weekly",  prio: "0.85" },
    { path: "/about.html",           freq: "monthly", prio: "0.7" },
    { path: "/delivery.html",        freq: "monthly", prio: "0.75" },
    { path: "/returns.html",         freq: "monthly", prio: "0.7" },
    { path: "/contacts.html",        freq: "monthly", prio: "0.8" },
    { path: "/documents.html",       freq: "monthly", prio: "0.5" },
    { path: "/requisites.html",      freq: "yearly",  prio: "0.4" },
    { path: "/privacy-policy.html",  freq: "yearly",  prio: "0.4" },
    { path: "/terms.html",           freq: "yearly",  prio: "0.4" },
    { path: "/offer.html",           freq: "yearly",  prio: "0.4" },
    { path: "/consent.html",         freq: "yearly",  prio: "0.4" },
  ];

  const xmlEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const urls = pages.map((p) =>
    "  <url>\n" +
    "    <loc>" + xmlEsc(HOST + p.path) + "</loc>\n" +
    "    <lastmod>" + lastmod + "</lastmod>\n" +
    "    <changefreq>" + p.freq + "</changefreq>\n" +
    "    <priority>" + p.prio + "</priority>\n" +
    "  </url>"
  ).join("\n");
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls + "\n" +
    "</urlset>\n";

  res.writeHead(200, {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=3600", // 1 час кеш — sitemap не критично свежий
  });
  res.end(body);
}

// Публичный список каналов связи для morphing-консультанта и страницы Контакты.
// Превращаем поле `href` в готовый URL по типу канала (tel:/mailto:/как есть).
// Не отдаём internal-метки (builtin/order/hidden) наружу.
function getChannels(req, res) {
  const all = store.listSection("channels");
  const channels = all
    .filter((c) => c.active !== false && !c.hidden)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((c) => {
      const raw = String(c.href || "").trim();
      let url = raw;
      if (c.type === "phone")  url = raw ? ("tel:" + raw.replace(/[^+\d]/g, "")) : "";
      if (c.type === "email")  url = raw ? ("mailto:" + raw) : "";
      // telegram / whatsapp / link → href уже полный URL
      return {
        id: c.id,
        type: c.type || "link",
        title: c.title || c.id,
        value: raw,    // отображаемое значение («+7 800 ...», «hello@…»)
        href: url,     // готовая ссылка для <a href>
        icon: c.icon || "",
        glyph: c.glyph || "·",
        color: c.color || "#1A1410",
        meta: c.meta || "",
      };
    });
  sendJson(res, 200, { ok: true, channels });
}

// Публичный список способов оплаты для чекаута: фильтр по active/hidden + Robokassa-методы скрываются если креды не заполнены.
function getPayments(req, res) {
  const all = store.listSection("payments");
  const rk = store.getRobokassa();
  const robokassaReady = !!(rk.merchantLogin && rk.password1 && rk.password2);
  const methods = all
    .filter((p) => p.active !== false && !p.hidden)
    .filter((p) => {
      if (p.type === "robokassa-card" || p.type === "robokassa-sbp") return robokassaReady;
      return true;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    // Не отдаём internal-метки наружу: builtin/order не нужны на фронте
    .map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description || "",
      icon: p.icon || "",
      instruction: p.instruction || "",
    }));
  sendJson(res, 200, { ok: true, methods, robokassaReady });
}

function getContentPublic(req, res) {
  const c = store.getContent();
  const settings = store.getSettings();
  // Реквизиты доезжают сюда же — фронту удобнее одним запросом
  sendJson(res, 200, {
    ok: true,
    content: c,
    requisites: settings.requisites || {},
    contacts: settings.contacts || {},
  });
}

function getLegalPublic(req, res, key) {
  const doc = store.getLegal(key);
  if (!doc) { sendJson(res, 404, { ok: false, error: "Unknown doc" }); return; }
  // публично — только md, version, updatedAt; без истории
  sendJson(res, 200, { ok: true, doc: { md: doc.md, version: doc.version, updatedAt: doc.updatedAt } });
}

// ===== AUTH =====

async function login(req, res, env) {
  const ip = clientIp(req);
  const ua = String(req.headers["user-agent"] || "");
  try {
    const body = await parseJsonBody(req);
    const token = auth.login(env, body.login, body.password);
    if (!token) {
      // I48: фиксируем неудачу для brute-force-детектора (in-memory).
      auth.recordLoginFailure(ip, ua);
      sendJson(res, 401, { ok: false, error: "Неверные логин или пароль" });
      return;
    }
    auth.clearLoginFailures(ip); // успех с этого IP — сбрасываем счётчик
    sendJson(res, 200, { ok: true, token }, {
      "set-cookie": `sob_admin=${token}; Path=/; Max-Age=43200; HttpOnly; SameSite=Lax`,
    });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "Bad request" });
  }
}

function logout(req, res) {
  const token = auth.tokenFromReq(req);
  if (token) auth.logout(token);
  sendJson(res, 200, { ok: true }, {
    "set-cookie": "sob_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
  });
}

function me(req, res) {
  const sess = auth.requireAuth(req);
  if (!sess) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  sendJson(res, 200, { ok: true, login: sess.login, expiresAt: sess.expiresAt });
}

// ===== ORDERS =====

function listOrders(req, res) {
  if (!requireSession(req, res)) return;
  sendJson(res, 200, { ok: true, orders: store.getOrders() });
}

function exportOrdersCsv(req, res) {
  if (!requireSession(req, res)) return;
  const orders = store.getOrders();
  const url = new URL(req.url, "http://x");
  const filtered = filterOrders(orders, Object.fromEntries(url.searchParams.entries()));
  const csv = ordersToCsv(filtered);
  const bom = "﻿"; // BOM, чтобы Excel понял UTF-8
  res.writeHead(200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`,
  });
  res.end(bom + csv);
}

function filterOrders(orders, q) {
  let arr = orders.slice();
  if (q.status) arr = arr.filter(o => (o.status || "new") === q.status);
  if (q.query) {
    const needle = String(q.query).toLowerCase().trim();
    arr = arr.filter(o => {
      const hay = [o.id, o.trackNo, o.customer && o.customer.name, o.customer && o.customer.phone, o.customer && o.customer.email, o.customer && o.customer.addr].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }
  if (q.dateFrom) {
    const t = Date.parse(q.dateFrom);
    if (!isNaN(t)) arr = arr.filter(o => o.createdAt >= t);
  }
  if (q.dateTo) {
    const t = Date.parse(q.dateTo) + 24*3600*1000; // включительно весь день
    if (!isNaN(t)) arr = arr.filter(o => o.createdAt < t);
  }
  if (q.minTotal) {
    const m = Number(q.minTotal);
    arr = arr.filter(o => (o.total || 0) >= m);
  }
  if (q.maxTotal) {
    const m = Number(q.maxTotal);
    arr = arr.filter(o => (o.total || 0) <= m);
  }
  return arr;
}

function ordersToCsv(orders) {
  const cols = [
    ["id", "ID"], ["createdAt", "Создан"], ["status", "Статус"],
    ["customer.name", "ФИО"], ["customer.phone", "Телефон"], ["customer.email", "Email"],
    ["customer.addr", "Адрес"], ["customer.date", "Дата доставки"], ["customer.time", "Слот"],
    ["box.size", "Размер бокса"], ["box.capacity", "Стеблей"],
    ["addonsList", "Допы"],
    ["delivery", "Канал доставки"], ["deliveryPrice", "Стоимость доставки"],
    ["customer.timeSurcharge", "Доплата за слот"],
    ["promo", "Промокод"], ["discount", "Скидка"],
    ["subtotal", "Подытог"], ["total", "Итого"],
    ["trackNo", "Трек-номер"], ["courier", "Курьер"],
    ["refund.status", "Статус возврата"], ["refund.amount", "Сумма возврата"], ["refund.reason", "Причина возврата"],
    ["note", "Заметка"],
  ];
  const header = cols.map(c => csvEsc(c[1])).join(";");
  const rows = orders.map(o => cols.map(([key]) => csvEsc(deepGet(o, key, ""))).join(";"));
  return [header, ...rows].join("\r\n");
}

function deepGet(obj, path, fallback) {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return fallback;
    if (p === "addonsList") {
      return Array.isArray(obj.addons) ? obj.addons.map(a => (a.title || a.id) + "×" + a.qty).join(", ") : "";
    }
    cur = cur[p];
  }
  if (path === "createdAt" && typeof cur === "number") {
    return new Date(cur).toISOString().replace("T", " ").slice(0, 19);
  }
  return cur == null ? fallback : cur;
}

function csvEsc(v) {
  if (v == null) return "";
  let s = String(v);
  if (s.includes("\"") || s.includes(";") || s.includes("\n")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function patchOrder(req, res, id) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    const prev = store.getOrderById(id);
    if (!prev) { sendJson(res, 404, { ok: false, error: "not found" }); return; }

    // Уборка полей
    const patch = {};
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.note === "string") patch.note = body.note.slice(0, 5000);
    if (typeof body.trackNo === "string") patch.trackNo = body.trackNo.slice(0, 80);
    if (typeof body.courier === "string") patch.courier = body.courier.slice(0, 80);
    if (typeof body.photo === "string") patch.photo = body.photo.slice(0, 500);
    if (typeof body.statusNote === "string") patch.statusNote = body.statusNote;
    if (body.refund !== undefined) {
      patch.refund = sanitizeRefund(body.refund);
    }

    const updated = store.updateOrder(id, patch);
    if (!updated) { sendJson(res, 404, { ok: false, error: "not found" }); return; }

    if (patch.status && patch.status !== prev.status) {
      notifications.onOrderStatusChanged(updated, prev.status);
    }
    if (patch.refund && (!prev.refund || prev.refund.status !== patch.refund.status)) {
      notifications.onRefundChanged(updated);
      // I48: запрос на возврат — отдельный канал, чтобы реагировать быстрее.
      // Триггерится при переходе refund.status → "requested" (любое предыдущее значение).
      if (patch.refund.status === "requested") {
        notifications.notifyAdminRefundRequested(updated);
      }
    }

    sendJson(res, 200, { ok: true, order: updated });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

function sanitizeRefund(r) {
  if (r === null) return null;
  if (typeof r !== "object") return null;
  const out = {
    status: ["none", "requested", "approved", "processed", "rejected"].includes(r.status) ? r.status : "requested",
    amount: Number(r.amount) || 0,
    reason: String(r.reason || "").slice(0, 1000),
    at: r.at || Date.now(),
  };
  return out;
}

function getOrder(req, res, id) {
  if (!requireSession(req, res)) return;
  const o = store.getOrderById(id);
  if (!o) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
  sendJson(res, 200, { ok: true, order: o });
}

// ===== SETTINGS =====

async function patchSettings(req, res) {
  if (!requireSession(req, res)) return;
  try {
    const patch = await parseJsonBody(req);
    // Не даём админ-UI зацепить чувствительное через настройки случайно
    if (patch && patch.robokassa) delete patch.robokassa;
    const updated = store.setSettings(patch || {});
    // Скрываем пароли в ответе
    const safe = JSON.parse(JSON.stringify(updated));
    if (safe.notifications && safe.notifications.email) {
      const hasPass = !!safe.notifications.email.pass;
      delete safe.notifications.email.pass;
      safe.notifications.email.hasPass = hasPass;
    }
    if (safe.notifications && safe.notifications.telegram) {
      const hasToken = !!safe.notifications.telegram.botToken;
      delete safe.notifications.telegram.botToken;
      safe.notifications.telegram.hasToken = hasToken;
    }
    sendJson(res, 200, { ok: true, settings: safe });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "Bad request" });
  }
}

function getAdminSettings(req, res) {
  if (!requireSession(req, res)) return;
  const s = store.getSettings();
  const safe = JSON.parse(JSON.stringify(s));
  if (safe.notifications && safe.notifications.email) {
    const hasPass = !!safe.notifications.email.pass;
    delete safe.notifications.email.pass;
    safe.notifications.email.hasPass = hasPass;
  }
  if (safe.notifications && safe.notifications.telegram) {
    const hasToken = !!safe.notifications.telegram.botToken;
    delete safe.notifications.telegram.botToken;
    safe.notifications.telegram.hasToken = hasToken;
  }
  sendJson(res, 200, { ok: true, settings: safe });
}

// ===== ROBOKASSA =====

function getRobokassa(req, res) {
  if (!requireSession(req, res)) return;
  const r = store.getRobokassa();
  sendJson(res, 200, {
    ok: true,
    robokassa: {
      merchantLogin: r.merchantLogin || "",
      isTest: r.isTest !== false,
      hashAlgorithm: r.hashAlgorithm || "md5",
      hasPassword1: !!r.password1,
      hasPassword2: !!r.password2,
      ready: !!(r.merchantLogin && r.password1 && r.password2),
    },
  });
}

async function patchRobokassa(req, res) {
  if (!requireSession(req, res)) return;
  try {
    const patch = await parseJsonBody(req);
    if (patch && typeof patch === "object") {
      if (patch.password1 != null) patch.password1 = String(patch.password1);
      if (patch.password2 != null) patch.password2 = String(patch.password2);
      if (patch.isTest != null) patch.isTest = !!patch.isTest;
    }
    const updated = store.setRobokassa(patch || {});
    sendJson(res, 200, {
      ok: true,
      robokassa: {
        merchantLogin: updated.merchantLogin,
        isTest: updated.isTest,
        hashAlgorithm: updated.hashAlgorithm,
        hasPassword1: !!updated.password1,
        hasPassword2: !!updated.password2,
        ready: !!(updated.merchantLogin && updated.password1 && updated.password2),
      },
    });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "Bad request" });
  }
}

// ===== CATALOG =====

async function putCatalogItem(req, res, section, id) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    if (!body || typeof body !== "object") throw new Error("Bad payload");
    const idField = section === "promos" ? "code" : "id";
    if (id) body[idField] = id;

    // Защита от изменения id/type у встроенных способов оплаты
    if (section === "payments") {
      const existing = store.listSection("payments").find((p) => p.id === body.id);
      if (existing && existing.builtin) {
        body.builtin = true;
        body.id = existing.id;
        body.type = existing.type;
      } else {
        body.builtin = false;
        // Не даём кастомным методам присваивать тип built-in (чтобы не подменить интеграцию)
        if (body.type === "robokassa-card" || body.type === "robokassa-sbp") {
          throw new Error("Тип `robokassa-card` / `robokassa-sbp` зарезервирован под встроенные методы. Используйте `custom` для своего способа.");
        }
      }
    }

    // Аналогичная защита для каналов связи: built-in id/type нельзя поменять.
    if (section === "channels") {
      const existing = store.listSection("channels").find((c) => c.id === body.id);
      const BUILTIN_TYPES = ["telegram", "whatsapp", "phone", "email"];
      if (existing && existing.builtin) {
        body.builtin = true;
        body.id = existing.id;
        body.type = existing.type;
      } else {
        body.builtin = false;
        // Не даём кастомным каналам брать built-in-тип — иначе можно подменить «настоящий» Telegram.
        if (BUILTIN_TYPES.indexOf(body.type) >= 0) {
          throw new Error("Тип `" + body.type + "` зарезервирован под встроенные каналы. Используйте `link` для своего канала.");
        }
      }
    }

    const item = store.upsertItem(section, body);
    sendJson(res, 200, { ok: true, item });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

async function deleteCatalogItem(req, res, section, id) {
  if (!requireSession(req, res)) return;
  try {
    // Запрещаем удалять встроенные способы оплаты — их можно только отключить через флаг `active`.
    if (section === "payments") {
      const item = store.listSection("payments").find((p) => p.id === id);
      if (item && item.builtin) {
        sendJson(res, 400, { ok: false, error: "Встроенный способ оплаты нельзя удалить — снимите галку «Активен», чтобы скрыть с чекаута." });
        return;
      }
    }
    // Аналогично для каналов связи.
    if (section === "channels") {
      const item = store.listSection("channels").find((c) => c.id === id);
      if (item && item.builtin) {
        sendJson(res, 400, { ok: false, error: "Встроенный канал связи нельзя удалить — снимите галку «Активен», чтобы скрыть с сайта." });
        return;
      }
    }
    const ok = store.deleteItem(section, id);
    if (!ok) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

async function reorderCatalogSection(req, res, section) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    if (!body || !Array.isArray(body.ids)) throw new Error("ids: array required");
    const items = store.reorderItems(section, body.ids);
    sendJson(res, 200, { ok: true, items });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

// ===== CONTENT =====

function getContent(req, res) {
  if (!requireSession(req, res)) return;
  const c = store.getContent();
  sendJson(res, 200, { ok: true, content: c });
}

async function patchContent(req, res, section) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    const c = store.patchContent(section || null, body || {});
    sendJson(res, 200, { ok: true, content: c });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

async function putContentSection(req, res, section) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    const c = store.setContentSection(section, body);
    sendJson(res, 200, { ok: true, section: c });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

// ===== FAQ =====

function listFaq(req, res) {
  if (!requireSession(req, res)) return;
  sendJson(res, 200, { ok: true, faq: store.listFaq() });
}

async function upsertFaq(req, res, id) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    if (id) body.id = id;
    const item = store.upsertFaq(body);
    sendJson(res, 200, { ok: true, item });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

function deleteFaq(req, res, id) {
  if (!requireSession(req, res)) return;
  const ok = store.deleteFaq(id);
  if (!ok) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
  sendJson(res, 200, { ok: true });
}

async function reorderFaq(req, res) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    if (!Array.isArray(body.ids)) throw new Error("ids: array required");
    const items = store.reorderFaq(body.ids);
    sendJson(res, 200, { ok: true, items });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

// ===== LEGAL =====

function listLegal(req, res) {
  if (!requireSession(req, res)) return;
  sendJson(res, 200, { ok: true, legal: store.getAllLegal() });
}

function getLegal(req, res, key) {
  if (!requireSession(req, res)) return;
  const doc = store.getLegal(key);
  if (!doc) { sendJson(res, 404, { ok: false, error: "unknown doc" }); return; }
  sendJson(res, 200, { ok: true, doc });
}

async function saveLegal(req, res, key) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    const doc = store.saveLegal(key, body.md || "", { by: (auth.requireAuth(req) || {}).login || "admin" });
    sendJson(res, 200, { ok: true, doc });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

// ===== NOTIFICATIONS test =====

// ===== PUBLIC: contact form (I48) =====
// In-memory rate-limit: одна заявка не чаще 1 раза в 20 сек с одного IP,
// и не больше 10 заявок в час с того же IP. Простая защита от ручного спама
// и забытой кнопки. Боты с разных IP лучше ловятся honeypot-полем `hp`.
const _contactRate = new Map(); // ip → { lastAt: ms, hour: { start, count } }
const CONTACT_MIN_INTERVAL_MS = 20 * 1000;
const CONTACT_HOUR_LIMIT = 10;

function rateLimitContact(ip) {
  const now = Date.now();
  const rec = _contactRate.get(ip) || { lastAt: 0, hour: { start: now, count: 0 } };
  if (now - rec.lastAt < CONTACT_MIN_INTERVAL_MS) return { ok: false, reason: "Too fast — подождите 20 секунд между сообщениями" };
  if (now - rec.hour.start > 3600 * 1000) { rec.hour = { start: now, count: 0 }; }
  if (rec.hour.count >= CONTACT_HOUR_LIMIT) return { ok: false, reason: "Слишком много заявок с одного IP за час" };
  rec.lastAt = now;
  rec.hour.count++;
  _contactRate.set(ip, rec);
  return { ok: true };
}

function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || "unknown";
}

async function postContactForm(req, res) {
  try {
    const payload = await parseJsonBody(req);
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");

    // Honeypot: реальные пользователи никогда это поле не заполнят (display:none).
    // Боты заполняют все поля формы — если `hp` непустое, тихо возвращаем 200 без действий.
    if (payload.hp && String(payload.hp).trim() !== "") {
      console.log("[contact] honeypot triggered from", clientIp(req));
      sendJson(res, 200, { ok: true });
      return;
    }

    const name = String(payload.name || "").trim().slice(0, 200);
    const phone = String(payload.phone || "").trim().slice(0, 50);
    const email = String(payload.email || "").trim().slice(0, 200);
    const topic = String(payload.topic || "").trim().slice(0, 100);
    const orderId = String(payload.orderId || "").trim().slice(0, 60);
    const message = String(payload.message || "").trim().slice(0, 3000);

    if (!name || !phone) {
      sendJson(res, 400, { ok: false, error: "Имя и телефон обязательны" });
      return;
    }

    const ip = clientIp(req);
    const limit = rateLimitContact(ip);
    if (!limit.ok) {
      sendJson(res, 429, { ok: false, error: limit.reason });
      return;
    }

    notifications.notifyAdminContactForm({ name, phone, email, topic, orderId, message })
      .catch((e) => console.warn("[contact] tg failed:", e && e.message));

    console.log("[contact] new submission from", ip, "·", name, phone, "topic=" + (topic || "—"));
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

async function notificationsTest(req, res) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    if (body.channel === "telegram") {
      const r = await notifications.testTelegram();
      sendJson(res, 200, { ok: !!r.ok, result: r });
      return;
    }
    if (body.channel === "email") {
      const r = await notifications.testEmail(body.to || "");
      sendJson(res, r.ok ? 200 : 400, { ok: !!r.ok, error: r.error || null });
      return;
    }
    sendJson(res, 400, { ok: false, error: "Unknown channel" });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

// ===== UPLOADS =====

const ALLOWED_IMG_TYPES = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "image/avif": "avif",
};

function safeFilename(name) {
  return String(name || "file")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 80) || "file";
}

async function uploadImage(req, res) {
  if (!requireSession(req, res)) return;
  try {
    const ct = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const ext = ALLOWED_IMG_TYPES[ct];
    if (!ext) {
      sendJson(res, 400, { ok: false, error: "Unsupported image type. Allowed: " + Object.keys(ALLOWED_IMG_TYPES).join(", ") });
      return;
    }
    const buf = await readBinaryBody(req);
    if (buf.length === 0) { sendJson(res, 400, { ok: false, error: "Empty body" }); return; }

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const xname = String(req.headers["x-filename"] || "").trim();
    const baseHint = xname ? safeFilename(xname.replace(/\.[a-z0-9]+$/i, "")) : "img";
    const ts = Date.now();
    const rand = crypto.randomBytes(4).toString("hex");
    const finalName = `${ts}-${rand}-${baseHint}.${ext}`;
    const finalPath = path.join(UPLOADS_DIR, finalName);
    fs.writeFileSync(finalPath, buf);
    sendJson(res, 200, {
      ok: true,
      url: `/uploads/${finalName}`,
      filename: finalName,
      size: buf.length,
      contentType: ct,
    });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Upload failed" });
  }
}

function listUploads(req, res) {
  if (!requireSession(req, res)) return;
  try {
    if (!fs.existsSync(UPLOADS_DIR)) { sendJson(res, 200, { ok: true, files: [] }); return; }
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter((f) => !f.startsWith("."))
      .map((f) => {
        const stat = fs.statSync(path.join(UPLOADS_DIR, f));
        return { url: "/uploads/" + f, filename: f, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    sendJson(res, 200, { ok: true, files });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "List failed" });
  }
}

async function deleteUpload(req, res, filename) {
  if (!requireSession(req, res)) return;
  try {
    if (!filename || filename.includes("/") || filename.includes("..")) {
      sendJson(res, 400, { ok: false, error: "Bad filename" });
      return;
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
    fs.unlinkSync(filePath);
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Delete failed" });
  }
}

// ===== CUSTOMERS (CRM) =====

function listCustomers(req, res) {
  if (!requireSession(req, res)) return;
  const url = new URL(req.url, "http://x");
  const q = (url.searchParams.get("query") || "").toLowerCase().trim();
  const segment = url.searchParams.get("segment") || ""; // "" | "new" | "active" | "dormant"

  let arr = store.listCustomers();
  if (q) {
    arr = arr.filter((c) => {
      const hay = [c.name, c.email, c.phone, (c.tags || []).join(" ")].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  if (segment) {
    const dayMs = 24 * 3600 * 1000;
    arr = arr.filter((c) => {
      if (segment === "new") return (c.paidCount || 0) === 1;
      if (segment === "active") return (c.paidCount || 0) >= 2;
      if (segment === "dormant") {
        return (c.paidCount || 0) >= 1 && (Date.now() - (c.lastOrderAt || 0)) > 30 * dayMs;
      }
      return true;
    });
  }
  arr.sort((a, b) => (b.lastOrderAt || 0) - (a.lastOrderAt || 0));
  sendJson(res, 200, { ok: true, customers: arr });
}

function getCustomer(req, res, id) {
  if (!requireSession(req, res)) return;
  const c = store.getCustomerById(id);
  if (!c) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
  // Подмешиваем заказы клиента
  const allOrders = store.getOrders();
  const orders = allOrders
    .filter((o) => {
      const cu = o.customer || {};
      const k = (cu.email && ("email:" + store.normalizeEmail(cu.email)))
             || (cu.phone && ("phone:" + store.normalizePhone(cu.phone)))
             || "";
      return k === c.primaryId;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  sendJson(res, 200, { ok: true, customer: c, orders });
}

async function patchCustomer(req, res, id) {
  if (!requireSession(req, res)) return;
  try {
    const body = await parseJsonBody(req);
    const c = store.patchCustomer(id, body || {});
    if (!c) { sendJson(res, 404, { ok: false, error: "not found" }); return; }
    sendJson(res, 200, { ok: true, customer: c });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || "Bad request" });
  }
}

function rebuildCustomers(req, res) {
  if (!requireSession(req, res)) return;
  const n = store.rebuildCustomersFromOrders();
  sendJson(res, 200, { ok: true, total: n });
}

// ===== DASHBOARD STATS =====
// Возвращает агрегаты для G36: КPI, дневная серия выручки/заказов, топы по боксам/цветам/промо.
// Параметр ?period=7d|30d|90d|all (по умолчанию 30d).
function getStats(req, res) {
  if (!requireSession(req, res)) return;
  const url = new URL(req.url, "http://x");
  const period = (url.searchParams.get("period") || "30d").toLowerCase();
  const PAID = store.PAID_STATUSES || ["paid", "doing", "shipped", "done"];
  const dayMs = 24 * 3600 * 1000;
  const now = Date.now();
  let windowMs = null;
  if (period === "7d") windowMs = 7 * dayMs;
  else if (period === "30d") windowMs = 30 * dayMs;
  else if (period === "90d") windowMs = 90 * dayMs;
  else windowMs = null; // all time

  const allOrders = store.getOrders();
  const inWin = (o) => {
    if (!windowMs) return true;
    return (now - (o.createdAt || 0)) <= windowMs;
  };
  const orders = allOrders.filter(inWin);
  const paid = orders.filter((o) => PAID.indexOf(o.status || "new") >= 0);
  const cancelled = orders.filter((o) => (o.status || "new") === "cancelled");

  const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avgCheck = paid.length ? Math.round(revenue / paid.length) : 0;
  const conversion = orders.length ? Math.round((paid.length / orders.length) * 100) : 0;

  // Daily series — сколько заказов и выручки в каждый день периода (для графика)
  const series = buildDailySeries(orders, paid, windowMs, now);

  // Top boxes — по числу заказов с этим боксом
  const boxesCount = {};
  for (const o of paid) {
    if (o.box && o.box.id) boxesCount[o.box.id] = (boxesCount[o.box.id] || 0) + 1;
  }
  const topBoxes = Object.entries(boxesCount)
    .map(([id, count]) => ({ id, size: (id || "").toUpperCase(), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top flowers — по сумме стеблей внутри boxes
  const flowersCount = {};
  for (const o of paid) {
    const fl = (o.box && o.box.flowers) || {};
    for (const [fid, qty] of Object.entries(fl)) {
      flowersCount[fid] = (flowersCount[fid] || 0) + (Number(qty) || 0);
    }
  }
  // Подмешаем имена цветов из каталога
  const catalogFlowers = store.listSection("flowers");
  const flowerName = (id) => {
    const f = catalogFlowers.find((x) => x.id === id);
    return f ? f.name : id;
  };
  const topFlowers = Object.entries(flowersCount)
    .map(([id, count]) => ({ id, name: flowerName(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top promos — по числу заказов с применённым промо
  const promosCount = {};
  const promosDiscount = {};
  for (const o of paid) {
    if (o.promo) {
      promosCount[o.promo] = (promosCount[o.promo] || 0) + 1;
      promosDiscount[o.promo] = (promosDiscount[o.promo] || 0) + (Number(o.discount) || 0);
    }
  }
  const topPromos = Object.entries(promosCount)
    .map(([code, count]) => ({ code, count, discount: promosDiscount[code] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top payment methods
  const paymentsCount = {};
  for (const o of paid) {
    const p = (o.customer && o.customer.payment) || "—";
    paymentsCount[p] = (paymentsCount[p] || 0) + 1;
  }
  const topPayments = Object.entries(paymentsCount)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Customers stats для периода: новые (firstOrderAt в окне) и активные (хоть один заказ в окне)
  const allCustomers = store.listCustomers();
  const newCustomers = windowMs
    ? allCustomers.filter((c) => (now - (c.firstOrderAt || 0)) <= windowMs && (c.paidCount || 0) > 0).length
    : allCustomers.filter((c) => (c.paidCount || 0) > 0).length;
  const returningCount = allCustomers.filter((c) => (c.paidCount || 0) >= 2).length;
  const returningRate = allCustomers.length ? Math.round((returningCount / allCustomers.length) * 100) : 0;

  // Воронка G37: уникальные сессии (sid) на каждом шаге за окно периода.
  // view-box → view-cart → view-checkout → оплачено (orders.paid)
  const sinceMs = windowMs ? now - windowMs : 0;
  const events = store.getEvents(sinceMs);
  const uniqSids = (filterEvent) => {
    const s = new Set();
    for (const e of events) if (e.event === filterEvent) s.add(e.sid);
    return s.size;
  };
  const funnel = {
    viewBox: uniqSids("view-box"),
    viewCart: uniqSids("view-cart"),
    viewCheckout: uniqSids("view-checkout"),
    paid: paid.length,
  };

  sendJson(res, 200, {
    ok: true,
    period,
    kpis: {
      orders: orders.length,
      paid: paid.length,
      cancelled: cancelled.length,
      revenue,
      avgCheck,
      conversion,
      newCustomers,
      returningRate,
    },
    series,
    topBoxes,
    topFlowers,
    topPromos,
    topPayments,
    funnel,
  });
}

function buildDailySeries(orders, paid, windowMs, now) {
  const dayMs = 24 * 3600 * 1000;
  // Сколько дней показывать
  let days;
  if (windowMs === null) {
    // all-time: считаем от самого старого заказа, но не больше 365 дней назад (чтобы не разнести график)
    const oldest = orders.reduce((min, o) => Math.min(min, o.createdAt || now), now);
    days = Math.min(365, Math.max(7, Math.ceil((now - oldest) / dayMs) + 1));
  } else {
    days = Math.ceil(windowMs / dayMs);
  }
  const series = [];
  // dayStart считаем по локальному времени сервера (UTC на сервере, но клиент покажет ru-RU дату).
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = todayMid.getTime() - i * dayMs;
    const dayEnd = dayStart + dayMs;
    const inDay = (o) => (o.createdAt || 0) >= dayStart && (o.createdAt || 0) < dayEnd;
    const dayOrders = orders.filter(inDay);
    const dayPaid = paid.filter(inDay);
    series.push({
      date: new Date(dayStart).toISOString().slice(0, 10),
      orders: dayOrders.length,
      paid: dayPaid.length,
      revenue: dayPaid.reduce((s, o) => s + (Number(o.total) || 0), 0),
    });
  }
  return series;
}

module.exports = {
  // public
  getSettings,
  postOrder,
  postTrack,
  getCatalog,
  getPayments,
  getChannels,
  getSitemap,
  getContentPublic,
  getLegalPublic,
  // auth
  login,
  logout,
  me,
  // orders
  listOrders,
  patchOrder,
  getOrder,
  exportOrdersCsv,
  // settings
  patchSettings,
  getAdminSettings,
  // robokassa
  getRobokassa,
  patchRobokassa,
  // catalog
  putCatalogItem,
  deleteCatalogItem,
  reorderCatalogSection,
  // content
  getContent,
  patchContent,
  putContentSection,
  // faq
  listFaq,
  upsertFaq,
  deleteFaq,
  reorderFaq,
  // legal
  listLegal,
  getLegal,
  saveLegal,
  // notifications
  postContactForm,
  notificationsTest,
  // customers (CRM)
  listCustomers,
  getCustomer,
  patchCustomer,
  rebuildCustomers,
  // dashboard
  getStats,
  // uploads
  uploadImage,
  listUploads,
  deleteUpload,
};
