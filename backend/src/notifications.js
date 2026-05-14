// Минимальная отправка уведомлений: e-mail клиенту (SMTP) и Telegram-бот админу.
// Зависимостей нет. Telegram — через https POST в Bot API. SMTP — net/tls сокет с AUTH LOGIN/PLAIN.
// Все методы — fire-and-forget с логгированием ошибок (не блокируют админский запрос).

const https = require("node:https");
const tls = require("node:tls");
const net = require("node:net");
const crypto = require("node:crypto");
const store = require("./store");

// ---------- helpers ----------

const STATUS_LABEL = {
  new: "Новый", paid: "Оплачен", doing: "В сборке",
  shipped: "Отправлен", done: "Выдан", cancelled: "Отменён",
};

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}

function shortName(customer) {
  if (!customer) return "";
  return String(customer.name || "").trim() || "—";
}

// ---------- TELEGRAM ----------

function tgEnabled() {
  const cfg = store.getSettings().notifications && store.getSettings().notifications.telegram;
  return !!(cfg && cfg.enabled && cfg.botToken && cfg.chatId);
}

function tgConfig() {
  return store.getSettings().notifications.telegram || {};
}

async function tgSend(text) {
  if (!tgEnabled()) return { ok: false, skipped: "disabled" };
  const cfg = tgConfig();
  const data = JSON.stringify({
    chat_id: cfg.chatId,
    text: String(text).slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  return new Promise((resolve) => {
    const req = https.request({
      method: "POST",
      host: "api.telegram.org",
      path: `/bot${cfg.botToken}/sendMessage`,
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) },
      timeout: 8000,
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ ok: !!parsed.ok, raw: parsed });
        } catch (e) { resolve({ ok: false, raw }); }
      });
    });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    req.write(data); req.end();
  });
}

async function notifyAdminOrderEvent(event, order) {
  const cfg = tgConfig();
  if (!cfg || !cfg.events || !cfg.events[event]) return { skipped: "event-off" };
  const lines = [];
  if (event === "newOrder") lines.push(`🆕 <b>Новый заказ</b> · ${escapeHtml(order.id)}`);
  else if (event === "paid") lines.push(`💳 <b>Оплачен</b> · ${escapeHtml(order.id)}`);
  else if (event === "cancelled") lines.push(`✖ <b>Отменён</b> · ${escapeHtml(order.id)}`);
  else if (event === "refund") lines.push(`↩️ <b>Возврат</b> · ${escapeHtml(order.id)}`);
  else lines.push(`<b>${escapeHtml(event)}</b> · ${escapeHtml(order.id)}`);

  lines.push(`Клиент: ${escapeHtml(shortName(order.customer))} · ${escapeHtml((order.customer && order.customer.phone) || "")}`);
  if (order.box && order.box.size) lines.push(`Бокс: ${escapeHtml(order.box.size)} · ${order.box.capacity || "?"} стеблей`);
  lines.push(`Сумма: <b>${escapeHtml(fmtMoney(order.total))}</b>`);
  if (order.delivery) lines.push(`Доставка: ${escapeHtml(order.delivery === "yandex" ? "Яндекс Go" : "Своя")}`);
  if (order.customer && order.customer.date) lines.push(`Дата: ${escapeHtml(order.customer.date)} ${escapeHtml(order.customer.time || "")}`);

  return tgSend(lines.join("\n"));
}

// ---------- EMAIL (SMTP) ----------

function emailEnabled() {
  const cfg = store.getSettings().notifications && store.getSettings().notifications.email;
  return !!(cfg && cfg.enabled && cfg.host && cfg.from);
}

function emailConfig() {
  return store.getSettings().notifications.email || {};
}

function shouldEmailStatus(status) {
  const cfg = emailConfig();
  return !!(cfg && cfg.triggers && cfg.triggers[status]);
}

function renderClientEmail(order, kind) {
  const contacts = store.getSettings().contacts || {};
  const status = order.status || "new";
  const subject = kind === "new"
    ? `СОБРАНО · Заказ ${order.id} принят`
    : `СОБРАНО · Заказ ${order.id} · ${STATUS_LABEL[status] || status}`;

  const lines = [];
  lines.push(`<p>Здравствуйте${order.customer && order.customer.name ? ", " + escapeHtml(order.customer.name) : ""}!</p>`);
  if (kind === "new") {
    lines.push(`<p>Мы получили ваш заказ <b>№ ${escapeHtml(order.id)}</b>. Спасибо! Сейчас он в статусе «${STATUS_LABEL[status] || status}». Мы напишем, когда соберём и отправим.</p>`);
  } else {
    lines.push(`<p>Статус вашего заказа <b>№ ${escapeHtml(order.id)}</b> изменился: <b>${STATUS_LABEL[status] || status}</b>.</p>`);
    if (order.trackNo) lines.push(`<p>Трек-номер курьера: <code>${escapeHtml(order.trackNo)}</code></p>`);
    if (status === "cancelled" && order.refund && order.refund.reason) {
      lines.push(`<p>Причина: ${escapeHtml(order.refund.reason)}</p>`);
    }
  }
  if (order.total) lines.push(`<p>Сумма заказа: <b>${escapeHtml(fmtMoney(order.total))}</b></p>`);
  if (contacts.telegram) lines.push(`<p>Если есть вопросы — пишите в Telegram: <a href="${escapeHtml(contacts.telegram)}">${escapeHtml(contacts.telegram)}</a> или на ${escapeHtml(contacts.email || "")}</p>`);
  lines.push(`<p style="color:#888;font-size:12px;margin-top:32px">— команда СОБРАНО</p>`);

  return {
    subject,
    html: `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#1A1410;line-height:1.5;max-width:560px;margin:auto;padding:24px">${lines.join("\n")}</body></html>`,
  };
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
}

async function notifyClientOrder(order, kind) {
  if (!emailEnabled()) return { skipped: "disabled" };
  if (!order || !order.customer || !order.customer.email) return { skipped: "no-email" };
  if (kind === "status" && !shouldEmailStatus(order.status)) return { skipped: "status-off" };

  const { subject, html } = renderClientEmail(order, kind);
  const cfg = emailConfig();

  try {
    await sendSmtp({
      host: cfg.host, port: cfg.port || 587, secure: !!cfg.secure,
      user: cfg.user, pass: cfg.pass,
      from: cfg.from, to: order.customer.email,
      subject, html,
    });
    return { ok: true };
  } catch (e) {
    console.warn("email send failed:", e.message);
    return { ok: false, error: e.message };
  }
}

// Минимальная SMTP-отправка. Поддерживает STARTTLS (порт 587) и TLS-сразу (порт 465).
// Авторизация PLAIN или LOGIN. Без MIME-вложений — только plain+html.
function sendSmtp(opts) {
  return new Promise((resolve, reject) => {
    const isSecure = !!opts.secure;
    let socket;
    let buffer = "";
    let stage = "greeting";
    let timer;
    let lastSent = "";

    function done(err) {
      if (timer) clearTimeout(timer);
      if (socket) { try { socket.end(); } catch(e) {} }
      if (err) reject(err); else resolve(true);
    }

    function send(line) {
      lastSent = line;
      socket.write(line + "\r\n");
    }

    function onData(chunk) {
      buffer += chunk.toString("utf8");
      // SMTP-ответ — последовательность строк, последняя без "-" после кода
      let lines = buffer.split(/\r?\n/);
      const last = lines[lines.length - 2]; // последняя завершённая строка
      if (!last) return;
      // Пока в буфере есть строка вида "XYZ-..." — ответ продолжается. Берём последнюю с пробелом после кода.
      const finished = lines.slice(0, -1).some(l => /^\d{3} /.test(l));
      if (!finished) return;
      buffer = ""; // сбрасываем

      const code = parseInt(last.slice(0, 3), 10);
      handle(code, last);
    }

    function handle(code, line) {
      // На любом 4xx/5xx — фейл (кроме фазы AUTH с 334)
      if (code >= 400 && code !== 334) return done(new Error(`SMTP ${code}: ${line} (after: ${lastSent})`));

      if (stage === "greeting") {
        send(`EHLO ${opts.host}`);
        stage = "ehlo";
      } else if (stage === "ehlo") {
        if (!isSecure && opts.port !== 465) {
          send("STARTTLS");
          stage = "starttls";
        } else {
          afterTls();
        }
      } else if (stage === "starttls") {
        // Заворачиваем в TLS
        const sec = tls.connect({ socket, servername: opts.host, rejectUnauthorized: false });
        sec.on("error", done);
        sec.on("data", onData);
        sec.write = sec.write.bind(sec);
        socket.removeAllListeners("data");
        socket = sec;
        socket.once("secureConnect", () => {
          send(`EHLO ${opts.host}`);
          stage = "ehlo2";
        });
      } else if (stage === "ehlo2") {
        afterTls();
      } else if (stage === "auth-user") {
        send(Buffer.from(opts.user, "utf8").toString("base64"));
        stage = "auth-pass";
      } else if (stage === "auth-pass") {
        send(Buffer.from(opts.pass, "utf8").toString("base64"));
        stage = "auth-done";
      } else if (stage === "auth-done") {
        send(`MAIL FROM:<${opts.from.replace(/.*<|>.*/g,"")}>`);
        stage = "mail-from";
      } else if (stage === "mail-from") {
        send(`RCPT TO:<${opts.to}>`);
        stage = "rcpt";
      } else if (stage === "rcpt") {
        send("DATA");
        stage = "data";
      } else if (stage === "data") {
        const headers = [
          `From: ${opts.from}`,
          `To: ${opts.to}`,
          `Subject: =?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          `Content-Transfer-Encoding: 8bit`,
          `Date: ${new Date().toUTCString()}`,
          `Message-Id: <${crypto.randomBytes(8).toString("hex")}@sobrano.store>`,
        ].join("\r\n");
        socket.write(headers + "\r\n\r\n" + opts.html.replace(/^\./gm, "..") + "\r\n.\r\n");
        stage = "data-sent";
      } else if (stage === "data-sent") {
        send("QUIT");
        stage = "quit";
        // Не ждём ответ дольше 2с
        setTimeout(() => done(null), 1500);
      }
    }

    function afterTls() {
      if (opts.user && opts.pass) {
        send("AUTH LOGIN");
        stage = "auth-user";
      } else {
        send(`MAIL FROM:<${opts.from.replace(/.*<|>.*/g,"")}>`);
        stage = "mail-from";
      }
    }

    timer = setTimeout(() => done(new Error("SMTP timeout")), 15000);

    if (isSecure || opts.port === 465) {
      socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host, rejectUnauthorized: false });
    } else {
      socket = net.connect({ host: opts.host, port: opts.port });
    }
    socket.on("data", onData);
    socket.on("error", done);
    socket.on("close", () => { /* connection ended */ });
  });
}

// ---------- public entry: order events ----------

async function onOrderCreated(order) {
  // Async fire-and-forget
  Promise.resolve()
    .then(() => notifyClientOrder(order, "new"))
    .catch((e) => console.warn("notify client created:", e.message));
  Promise.resolve()
    .then(() => notifyAdminOrderEvent("newOrder", order))
    .catch((e) => console.warn("notify admin created:", e.message));
}

async function onOrderStatusChanged(order, prevStatus) {
  Promise.resolve()
    .then(() => notifyClientOrder(order, "status"))
    .catch((e) => console.warn("notify client status:", e.message));
  // Админу — только важные статусы
  if (order.status === "paid" || order.status === "cancelled") {
    Promise.resolve()
      .then(() => notifyAdminOrderEvent(order.status === "paid" ? "paid" : "cancelled", order))
      .catch((e) => console.warn("notify admin status:", e.message));
  }
}

async function onRefundChanged(order) {
  Promise.resolve()
    .then(() => notifyAdminOrderEvent("refund", order))
    .catch((e) => console.warn("notify admin refund:", e.message));
}

async function testTelegram() {
  const r = await tgSend("🌸 СОБРАНО · тест уведомлений. Если видите это сообщение — Telegram подключён корректно.");
  return r;
}

async function testEmail(to) {
  if (!emailEnabled()) return { ok: false, error: "Email не настроен или отключён" };
  if (!to) return { ok: false, error: "Укажите email получателя" };
  const cfg = emailConfig();
  try {
    await sendSmtp({
      host: cfg.host, port: cfg.port || 587, secure: !!cfg.secure,
      user: cfg.user, pass: cfg.pass,
      from: cfg.from, to,
      subject: "СОБРАНО · тест уведомлений",
      html: "<p>Если вы видите это письмо — SMTP подключён корректно.</p>",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  onOrderCreated,
  onOrderStatusChanged,
  onRefundChanged,
  testTelegram,
  testEmail,
};
