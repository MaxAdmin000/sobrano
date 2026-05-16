const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const {
  buildDeliveryItem,
  buildReceipt,
  formatMoney,
  loadCatalog,
  normalizeCartItems,
  parseMoneyToCents,
  truncateReceiptName
} = require("./catalog");
const {
  buildPaymentSignature,
  buildResultSignature,
  sortShpParams,
  timingSafeEqualHex
} = require("./robokassa");
const { postWebhook } = require("./webhook");
const adminApi = require("./admin");
const store = require("./store");
const notifications = require("./notifications");
const logger = require("./logger");

loadDotEnv(path.join(__dirname, "..", ".env"));

const env = process.env;
let catalog;
try {
  catalog = loadCatalog(env.PRODUCTS_FILE);
} catch (e) {
  console.warn("Catalog not loaded:", e.message);
  catalog = new Map();
}
const port = Number(env.PORT || 8787);
const adminDir = path.join(__dirname, "..", "admin");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rows = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const row of rows) {
    const line = row.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function corsHeaders(req) {
  const allowed = String(env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origin = req.headers.origin || "";
  const allowOrigin = allowed.includes("*") || !origin ? "*" : allowed.includes(origin) ? origin : allowed[0];

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400"
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(req, res, status, data) {
  send(res, status, JSON.stringify(data), {
    ...corsHeaders(req),
    "content-type": "application/json; charset=utf-8"
  });
}

function sendText(req, res, status, text) {
  send(res, status, text, {
    ...corsHeaders(req),
    "content-type": "text/plain; charset=utf-8"
  });
}

function redirect(res, location) {
  res.writeHead(302, { location });
  res.end();
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function parseJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw);
}

async function parseFormBody(req, currentUrl) {
  const params = new URLSearchParams(currentUrl.search);
  if (req.method !== "GET") {
    const raw = await readBody(req);
    const bodyParams = new URLSearchParams(raw);
    for (const [key, value] of bodyParams.entries()) {
      params.set(key, value);
    }
  }
  return Object.fromEntries(params.entries());
}

// Креды берём сначала из админ-стора (БД), потом из env как fallback. Это позволяет
// менять Merchant/Password из админки без рестарта.
function getRobokassaConfig() {
  const stored = store.getRobokassa();
  return {
    merchantLogin: stored.merchantLogin || env.ROBOKASSA_MERCHANT_LOGIN || "",
    password1: stored.password1 || env.ROBOKASSA_PASSWORD1 || "",
    password2: stored.password2 || env.ROBOKASSA_PASSWORD2 || "",
    isTest: stored.merchantLogin
      ? stored.isTest !== false
      : String(env.ROBOKASSA_IS_TEST || "0") === "1",
    hashAlgorithm: stored.hashAlgorithm || env.ROBOKASSA_HASH_ALGORITHM || "md5",
  };
}

function requireRobokassaConfig() {
  const cfg = getRobokassaConfig();
  if (!cfg.merchantLogin || !cfg.password1 || !cfg.password2) {
    throw new Error("Robokassa не настроен — заполните MerchantLogin и пароли в админке");
  }
  return cfg;
}

function normalizeCustomer(customer = {}) {
  const email = String(customer.email || "").trim();
  const phone = String(customer.phone || "").trim();
  const name = String(customer.name || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Customer email is required");
  }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    throw new Error("Customer phone is required");
  }

  return {
    name: name.slice(0, 120),
    phone: phone.slice(0, 40),
    email: email.slice(0, 120),
    address: String(customer.address || "").trim().slice(0, 400),
    comment: String(customer.comment || "").trim().slice(0, 800),
    deliveryDate: String(customer.deliveryDate || "").trim().slice(0, 80)
  };
}

function makeInvId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function makeOrderId(invId) {
  return `TLD-${invId}`;
}

function getShpParams(orderId) {
  return {
    Shp_order: orderId,
    Shp_source: "tilda"
  };
}

function appendPaymentMethods(fields) {
  const methods = String(env.ROBOKASSA_PAYMENT_METHODS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (methods.length) fields.PaymentMethods = methods;
}

async function createPayment(req, res) {
  try {
    const rk = requireRobokassaConfig();
    const payload = await parseJsonBody(req);
    const customer = normalizeCustomer(payload.customer);
    const cartItems = normalizeCartItems({
      clientItems: payload.items,
      catalog,
      env
    });
    const deliveryItem = buildDeliveryItem(payload.delivery, env);
    const payableItems = deliveryItem ? [...cartItems, deliveryItem] : cartItems;
    const totalCents = payableItems.reduce((sum, item) => sum + item.totalCents, 0);

    if (totalCents <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    const invId = payload.invId ? String(payload.invId) : String(makeInvId());
    const orderId = makeOrderId(invId);
    const outSum = formatMoney(totalCents);
    const receiptRaw = buildReceipt(payableItems, env);
    const receipt = encodeURIComponent(receiptRaw);
    const shpParams = getShpParams(orderId);
    const signature = buildPaymentSignature({
      merchantLogin: rk.merchantLogin,
      outSum,
      invId,
      receipt,
      password1: rk.password1,
      shpParams,
      algorithm: rk.hashAlgorithm
    });

    const description = truncateReceiptName(payload.description || `Заказ ${orderId}`).slice(0, 100);
    const fields = {
      MerchantLogin: rk.merchantLogin,
      OutSum: outSum,
      InvId: invId,
      Description: description,
      SignatureValue: signature,
      Receipt: receipt,
      Email: customer.email,
      Culture: env.ROBOKASSA_CULTURE || "ru",
      Encoding: "utf-8",
      ...shpParams
    };

    if (rk.isTest) {
      fields.IsTest = "1";
    }

    appendPaymentMethods(fields);

    const orderPayload = {
      orderId,
      invId,
      outSum,
      customer,
      delivery: payload.delivery || {},
      items: payableItems.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: formatMoney(item.priceCents),
        total: formatMoney(item.totalCents)
      })),
      page: payload.page || null
    };

    await postWebhook(env, "payment.created", orderPayload);

    sendJson(req, res, 200, {
      ok: true,
      order: orderPayload,
      form: {
        method: "POST",
        action: "https://auth.robokassa.ru/Merchant/Index.aspx",
        fields
      }
    });
  } catch (error) {
    console.error("create-payment error:", error);
    sendJson(req, res, 400, {
      ok: false,
      error: error.message || "Payment creation failed"
    });
  }
}

async function handleResult(req, res, currentUrl) {
  try {
    const rk = requireRobokassaConfig();
    const params = await parseFormBody(req, currentUrl);
    const outSum = params.OutSum;
    const invId = params.InvId || params.InvoiceID || params.InvoiceId;
    const receivedSignature = params.SignatureValue || params.Signature;
    const shpParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => key.startsWith("Shp_"))
    );
    const expectedSignature = buildResultSignature({
      outSum,
      invId,
      password2: rk.password2,
      shpParams,
      algorithm: rk.hashAlgorithm
    });

    if (!timingSafeEqualHex(receivedSignature, expectedSignature)) {
      console.warn("Invalid ResultURL signature", {
        invId,
        outSum,
        receivedSignature,
        expectedSignature,
        shp: sortShpParams(shpParams)
      });
      sendText(req, res, 400, "bad signature");
      return;
    }

    await postWebhook(env, "payment.succeeded", {
      invId,
      outSum,
      orderId: shpParams.Shp_order || null,
      paymentMethod: params.PaymentMethod || null,
      incCurrLabel: params.IncCurrLabel || null,
      email: params.EMail || params.Email || null,
      raw: params
    });

    sendText(req, res, 200, `OK${invId}`);
  } catch (error) {
    console.error("result error:", error);
    sendText(req, res, 400, "error");
  }
}

function serveAdmin(req, res, pathname) {
  // /admin           → admin/index.html
  // /admin/foo.css   → admin/foo.css
  let rel = pathname.replace(/^\/admin\/?/, "");
  if (!rel) rel = "index.html";
  if (rel.includes("..")) return false;
  const filePath = path.join(adminDir, rel);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  };
  send(res, 200, fs.readFileSync(filePath), {
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": "no-cache",
  });
  return true;
}

const server = http.createServer(async (req, res) => {
  const currentUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = currentUrl.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") {
    send(res, 204, "", corsHeaders(req));
    return;
  }

  // ---- Health ----
  if (req.method === "GET" && pathname === "/health") {
    const rk = getRobokassaConfig();
    sendJson(req, res, 200, {
      ok: true,
      products: catalog.size || 0,
      robokassa: {
        ready: !!(rk.merchantLogin && rk.password1 && rk.password2),
        testMode: rk.isTest,
      },
      adminConfigured: !!(env.ADMIN_LOGIN && env.ADMIN_PASSWORD_HASH),
    });
    return;
  }

  // ---- Public site API ----
  if (req.method === "GET" && pathname === "/api/settings") {
    return wrapCors(req, res, () => adminApi.getSettings(req, res));
  }
  if (req.method === "GET" && pathname === "/api/catalog") {
    return wrapCors(req, res, () => adminApi.getCatalog(req, res));
  }
  if (req.method === "GET" && pathname === "/api/payments") {
    return wrapCors(req, res, () => adminApi.getPayments(req, res));
  }
  if (req.method === "GET" && pathname === "/api/channels") {
    return wrapCors(req, res, () => adminApi.getChannels(req, res));
  }
  // Sitemap отдаётся только через /api/sitemap.xml (nginx проксирует только /api/*).
  // В robots.txt указан этот URL — поисковики его прочитают.
  if (req.method === "GET" && pathname === "/api/sitemap.xml") {
    return wrapCors(req, res, () => adminApi.getSitemap(req, res));
  }
  if (req.method === "GET" && pathname === "/api/content") {
    return wrapCors(req, res, () => adminApi.getContentPublic(req, res));
  }
  const legalPub = pathname.match(/^\/api\/legal\/([a-z]+)$/);
  if (req.method === "GET" && legalPub) {
    return wrapCors(req, res, () => adminApi.getLegalPublic(req, res, legalPub[1]));
  }
  if (req.method === "POST" && pathname === "/api/orders") {
    return wrapCors(req, res, () => adminApi.postOrder(req, res, env));
  }
  if (req.method === "POST" && pathname === "/api/track") {
    return wrapCors(req, res, () => adminApi.postTrack(req, res));
  }
  if (req.method === "POST" && pathname === "/api/contact") {
    return wrapCors(req, res, () => adminApi.postContactForm(req, res));
  }

  // ---- Admin auth + endpoints ----
  if (req.method === "POST" && pathname === "/api/admin/login") {
    return wrapCors(req, res, () => adminApi.login(req, res, env));
  }
  if (req.method === "POST" && pathname === "/api/admin/logout") {
    return wrapCors(req, res, () => adminApi.logout(req, res));
  }
  if (req.method === "GET" && pathname === "/api/admin/me") {
    return wrapCors(req, res, () => adminApi.me(req, res));
  }
  if (req.method === "GET" && pathname === "/api/admin/orders") {
    return wrapCors(req, res, () => adminApi.listOrders(req, res));
  }
  if (req.method === "GET" && pathname === "/api/admin/orders/export.csv") {
    return wrapCors(req, res, () => adminApi.exportOrdersCsv(req, res));
  }
  const orderMatch = pathname.match(/^\/api\/admin\/orders\/([A-Za-z0-9_.-]+)$/);
  if (req.method === "PATCH" && orderMatch) {
    return wrapCors(req, res, () => adminApi.patchOrder(req, res, orderMatch[1]));
  }
  if (req.method === "GET" && orderMatch) {
    return wrapCors(req, res, () => adminApi.getOrder(req, res, orderMatch[1]));
  }
  if (req.method === "GET" && pathname === "/api/admin/settings") {
    return wrapCors(req, res, () => adminApi.getAdminSettings(req, res));
  }
  if (req.method === "PATCH" && pathname === "/api/admin/settings") {
    return wrapCors(req, res, () => adminApi.patchSettings(req, res));
  }

  // ---- Admin: content ----
  if (req.method === "GET" && pathname === "/api/admin/content") {
    return wrapCors(req, res, () => adminApi.getContent(req, res));
  }
  const contentMatch = pathname.match(/^\/api\/admin\/content(?:\/([a-zA-Z0-9_-]+))?$/);
  if (req.method === "PATCH" && contentMatch) {
    return wrapCors(req, res, () => adminApi.patchContent(req, res, contentMatch[1] || null));
  }
  if (req.method === "PUT" && contentMatch && contentMatch[1]) {
    return wrapCors(req, res, () => adminApi.putContentSection(req, res, contentMatch[1]));
  }

  // ---- Admin: FAQ ----
  if (req.method === "GET" && pathname === "/api/admin/faq") {
    return wrapCors(req, res, () => adminApi.listFaq(req, res));
  }
  if (req.method === "POST" && pathname === "/api/admin/faq/reorder") {
    return wrapCors(req, res, () => adminApi.reorderFaq(req, res));
  }
  const faqMatch = pathname.match(/^\/api\/admin\/faq(?:\/([a-zA-Z0-9_-]+))?$/);
  if (req.method === "PUT" && faqMatch) {
    return wrapCors(req, res, () => adminApi.upsertFaq(req, res, faqMatch[1] || null));
  }
  if (req.method === "DELETE" && faqMatch && faqMatch[1]) {
    return wrapCors(req, res, () => adminApi.deleteFaq(req, res, faqMatch[1]));
  }

  // ---- Admin: legal docs ----
  if (req.method === "GET" && pathname === "/api/admin/legal") {
    return wrapCors(req, res, () => adminApi.listLegal(req, res));
  }
  const legalMatch = pathname.match(/^\/api\/admin\/legal\/([a-z]+)$/);
  if (req.method === "GET" && legalMatch) {
    return wrapCors(req, res, () => adminApi.getLegal(req, res, legalMatch[1]));
  }
  if (req.method === "PUT" && legalMatch) {
    return wrapCors(req, res, () => adminApi.saveLegal(req, res, legalMatch[1]));
  }

  // ---- Admin: notifications ----
  if (req.method === "POST" && pathname === "/api/admin/notifications/test") {
    return wrapCors(req, res, () => adminApi.notificationsTest(req, res));
  }
  if (req.method === "POST" && pathname === "/api/admin/notifications/test-alerts") {
    return wrapCors(req, res, () => adminApi.notificationsTestAlerts(req, res));
  }

  // ---- Admin: customers (CRM) ----
  if (req.method === "GET" && pathname === "/api/admin/customers") {
    return wrapCors(req, res, () => adminApi.listCustomers(req, res));
  }
  if (req.method === "POST" && pathname === "/api/admin/customers/rebuild") {
    return wrapCors(req, res, () => adminApi.rebuildCustomers(req, res));
  }
  const custMatch = pathname.match(/^\/api\/admin\/customers\/([a-zA-Z0-9_-]+)$/);
  if (req.method === "GET" && custMatch) {
    return wrapCors(req, res, () => adminApi.getCustomer(req, res, custMatch[1]));
  }
  if (req.method === "PATCH" && custMatch) {
    return wrapCors(req, res, () => adminApi.patchCustomer(req, res, custMatch[1]));
  }

  // ---- Admin: dashboard stats ----
  if (req.method === "GET" && pathname === "/api/admin/stats") {
    return wrapCors(req, res, () => adminApi.getStats(req, res));
  }
  if (req.method === "GET" && pathname === "/api/admin/robokassa") {
    return wrapCors(req, res, () => adminApi.getRobokassa(req, res));
  }
  if (req.method === "PATCH" && pathname === "/api/admin/robokassa") {
    return wrapCors(req, res, () => adminApi.patchRobokassa(req, res));
  }

  // ---- Admin: catalog ----
  // PUT  /api/admin/catalog/:section/:id   — upsert
  // DELETE same                             — delete
  // POST /api/admin/catalog/:section/reorder — reorder by ids list
  const catRe = pathname.match(/^\/api\/admin\/catalog\/([a-z]+)(?:\/([^\/]+))?$/);
  if (catRe) {
    const section = catRe[1];
    const id = catRe[2] ? decodeURIComponent(catRe[2]) : null;
    if (!store.SECTIONS.includes(section)) {
      return wrapCors(req, res, () => sendJson(req, res, 404, { ok: false, error: "Unknown section" }));
    }
    if (id === "reorder" && req.method === "POST") {
      return wrapCors(req, res, () => adminApi.reorderCatalogSection(req, res, section));
    }
    if (req.method === "PUT") {
      return wrapCors(req, res, () => adminApi.putCatalogItem(req, res, section, id));
    }
    if (req.method === "DELETE" && id) {
      return wrapCors(req, res, () => adminApi.deleteCatalogItem(req, res, section, id));
    }
  }

  // ---- Admin: uploads ----
  if (req.method === "POST" && pathname === "/api/admin/upload") {
    return wrapCors(req, res, () => adminApi.uploadImage(req, res));
  }
  if (req.method === "GET" && pathname === "/api/admin/uploads") {
    return wrapCors(req, res, () => adminApi.listUploads(req, res));
  }
  const upDel = pathname.match(/^\/api\/admin\/uploads\/([^\/]+)$/);
  if (req.method === "DELETE" && upDel) {
    return wrapCors(req, res, () => adminApi.deleteUpload(req, res, decodeURIComponent(upDel[1])));
  }

  // ---- Public: serve user-uploaded files ----
  if ((req.method === "GET" || req.method === "HEAD") && pathname.startsWith("/uploads/")) {
    const fname = pathname.replace(/^\/uploads\//, "");
    if (fname.includes("..") || fname.includes("/")) {
      sendJson(req, res, 404, { ok: false, error: "Not found" });
      return;
    }
    const filePath = path.join(__dirname, "..", "data", "uploads", fname);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      sendJson(req, res, 404, { ok: false, error: "Not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
      ".avif": "image/avif",
    };
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "public, max-age=2592000, immutable",
    });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // ---- Admin static UI ----
  if ((req.method === "GET" || req.method === "HEAD") && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    if (serveAdmin(req, res, pathname)) return;
  }

  // ---- Robokassa (legacy) ----
  if (req.method === "POST" && pathname === "/api/robokassa/create-payment") {
    await createPayment(req, res);
    return;
  }
  if ((req.method === "GET" || req.method === "POST") && pathname === "/api/robokassa/result") {
    await handleResult(req, res, currentUrl);
    return;
  }
  if (req.method === "GET" && pathname === "/api/robokassa/success") {
    redirect(res, env.PUBLIC_SUCCESS_URL || "/payment-success");
    return;
  }
  if (req.method === "GET" && pathname === "/api/robokassa/fail") {
    redirect(res, env.PUBLIC_FAIL_URL || "/payment-fail");
    return;
  }

  sendJson(req, res, 404, { ok: false, error: "Not found" });
});

// Обёртка CORS для админских и публичных JSON-эндпоинтов
function wrapCors(req, res, handler) {
  const ch = corsHeaders(req);
  const origWrite = res.writeHead.bind(res);
  res.writeHead = function (status, headers) {
    return origWrite(status, Object.assign({}, ch, headers || {}));
  };
  return handler();
}

server.listen(port, () => {
  logger.info("server.started", { port, pid: process.pid, node: process.version });
  console.log(`СОБРАНО backend on http://localhost:${port}`);
  console.log(`  admin UI: http://localhost:${port}/admin`);
  console.log(`  health:   http://localhost:${port}/health`);
  // I48 cron-задачи: SLA-просрочки (every 5 min) + дневная сводка (each min, fires once a day).
  startBackgroundJobs();
});

// ---------- BACKGROUND JOBS (I48) ----------

const STALE_ORDER_THRESHOLD_MS = 30 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS  = 5  * 60 * 1000;
const DIGEST_CHECK_INTERVAL_MS = 60 * 1000;
// UTC-час и минута дневной сводки. 23:30 UTC = 02:30 МСК (после полуночи местного дня).
const DIGEST_HOUR_UTC = 23;
const DIGEST_MINUTE_UTC = 30;
let _lastDigestDate = ""; // строка YYYY-MM-DD — не шлём сводку дважды за день

function startBackgroundJobs() {
  // 1) SLA-stale: каждые 5 мин ищем заказы в `new` старше 30 мин и без отметки staleAlertSent.
  setInterval(() => {
    try { sweepStaleOrders(); } catch (e) { console.warn("[stale] sweep failed:", e.message); }
  }, STALE_CHECK_INTERVAL_MS).unref();
  // Один прогон сразу после старта (вдруг бэкенд перезагрузился, а заказ висит).
  setTimeout(() => { try { sweepStaleOrders(); } catch (e) {} }, 30 * 1000).unref();

  // 2) Daily digest: проверяем раз в минуту, попали ли в окно 23:30 UTC.
  setInterval(() => {
    try { maybeSendDigest(); } catch (e) { console.warn("[digest] check failed:", e.message); }
  }, DIGEST_CHECK_INTERVAL_MS).unref();
}

function sweepStaleOrders() {
  const now = Date.now();
  const orders = store.getOrders();
  let count = 0;
  for (const o of orders) {
    if ((o.status || "new") !== "new") continue;
    if (o.staleAlertSent) continue;
    if (!o.createdAt || (now - o.createdAt) < STALE_ORDER_THRESHOLD_MS) continue;
    // Старше 24 ч — не шлём (вероятно, заказ давно «застрял» и админ его уже видел).
    if ((now - o.createdAt) > 24 * 3600 * 1000) {
      o.staleAlertSent = true; // помечаем, чтобы больше не проверять
      continue;
    }
    const minutes = Math.round((now - o.createdAt) / 60000);
    notifications.notifyAdminStaleOrder(o, minutes)
      .catch((e) => console.warn("[stale] tg failed:", e && e.message));
    o.staleAlertSent = true;
    count++;
  }
  if (count > 0) {
    store.save(); // staleAlertSent — теперь персистентен
    console.log(`[stale] alerted on ${count} order(s)`);
  }
}

function maybeSendDigest() {
  const now = new Date();
  if (now.getUTCHours() !== DIGEST_HOUR_UTC) return;
  if (now.getUTCMinutes() < DIGEST_MINUTE_UTC || now.getUTCMinutes() > DIGEST_MINUTE_UTC + 5) return;
  const dateKey = now.toISOString().slice(0, 10);
  if (_lastDigestDate === dateKey) return;
  _lastDigestDate = dateKey;
  sendDailyDigest(dateKey);
}

function sendDailyDigest(dateKey) {
  // Берём заказы за последние 24 ч.
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const all = store.getOrders().filter((o) => (o.createdAt || 0) >= cutoff);
  const PAID = store.PAID_STATUSES || ["paid", "doing", "shipped", "done"];
  const paid = all.filter((o) => PAID.indexOf(o.status || "new") >= 0);
  const cancelled = all.filter((o) => (o.status || "new") === "cancelled");
  const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avg = paid.length ? Math.round(revenue / paid.length) : 0;
  // Топ-бокс: считаем размеры
  const sizes = {};
  paid.forEach((o) => { if (o.box && o.box.size) sizes[o.box.size] = (sizes[o.box.size] || 0) + 1; });
  const topBox = Object.entries(sizes).sort((a, b) => b[1] - a[1])[0];
  // Новые клиенты за сутки
  const newCustomers = (store.listCustomers ? store.listCustomers() : []).filter((c) => (c.firstOrderAt || 0) >= cutoff).length;
  notifications.notifyAdminDailyDigest({
    date: dateKey,
    orders: all.length,
    paid: paid.length,
    cancelled: cancelled.length,
    revenue,
    avgCheck: avg,
    newCustomers,
    topBox: topBox ? `${topBox[0]} (${topBox[1]})` : "",
  }).catch((e) => console.warn("[digest] tg failed:", e && e.message));
}
