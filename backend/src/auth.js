// Простая аутентификация для админки.
// Логин/пароль из ENV (ADMIN_LOGIN / ADMIN_PASSWORD_HASH).
// Сессии — токены в памяти процесса (slot-style; перезапуск выходит из всех сессий).
const crypto = require("node:crypto");

const sessions = new Map(); // token -> { login, expiresAt }
const TTL_MS = 12 * 3600 * 1000; // 12 часов

function sha256(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

function safeEq(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function checkCredentials(env, login, password) {
  const adminLogin = env.ADMIN_LOGIN || "";
  const expectedHash = (env.ADMIN_PASSWORD_HASH || "").trim().toLowerCase();
  if (!adminLogin || !expectedHash) return false;
  if (!safeEq(login, adminLogin)) return false;
  return safeEq(sha256(password), expectedHash);
}

// I48 brute-force detector. In-memory, без персистентности — сбрасывается при
// рестарте бэкенда (что и так разрывает все сессии). Окно — 10 минут;
// ≥5 неудач за окно → один Telegram-алерт и сброс таймера cooldown, чтобы не флудить.
const _loginFails = new Map(); // ip → { count, firstAt, lastAt, ua, alertedAt }
const BRUTE_WINDOW_MS = 10 * 60 * 1000;
const BRUTE_THRESHOLD = 5;
const BRUTE_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

function recordLoginFailure(ip, userAgent) {
  const now = Date.now();
  const rec = _loginFails.get(ip) || { count: 0, firstAt: now, lastAt: now, alertedAt: 0, ua: userAgent || "" };
  if (now - rec.firstAt > BRUTE_WINDOW_MS) {
    rec.count = 0;
    rec.firstAt = now;
    rec.alertedAt = 0;
  }
  rec.count++;
  rec.lastAt = now;
  if (userAgent) rec.ua = userAgent;
  _loginFails.set(ip, rec);

  if (rec.count >= BRUTE_THRESHOLD && (now - rec.alertedAt) > BRUTE_ALERT_COOLDOWN_MS) {
    rec.alertedAt = now;
    // Динамический require, чтобы избежать циклической зависимости.
    try {
      const notifications = require("./notifications");
      const logger = require("./logger");
      logger.warn("login.bruteforce_detected", { ip, attempts: rec.count, windowMin: 10 });
      notifications.notifyAdminLoginBruteforce({
        ip, attempts: rec.count, windowMin: 10,
        userAgent: rec.ua, lastAt: rec.lastAt,
      }).catch((e) => { try { require("./logger").warn("login.bruteforce_alert_failed", { err: e && e.message }); } catch (_) {} });
    } catch (e) { /* logger/notifications недоступны — fail-open */ }
  }
}

function clearLoginFailures(ip) {
  if (ip) _loginFails.delete(ip);
}

// K54: после порога брутфорса блокируем IP на 5 минут — даже валидный пароль
// не пройдёт, пока IP в карантине. Это останавливает credential-stuffing,
// если пароль угаданный.
const LOGIN_BLOCK_MS = 5 * 60 * 1000;
function isLoginBlocked(ip) {
  const rec = _loginFails.get(ip);
  if (!rec) return false;
  const now = Date.now();
  if (now - rec.firstAt > BRUTE_WINDOW_MS) return false; // окно истекло
  if (rec.count < BRUTE_THRESHOLD) return false;
  // блокируем на 5 минут от последней попытки
  if (now - rec.lastAt > LOGIN_BLOCK_MS) {
    _loginFails.delete(ip);
    return false;
  }
  return Math.ceil((LOGIN_BLOCK_MS - (now - rec.lastAt)) / 1000); // seconds remaining
}

function login(env, loginValue, password) {
  if (!checkCredentials(env, loginValue, password)) return null;
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { login: loginValue, expiresAt: Date.now() + TTL_MS });
  return token;
}

function logout(token) {
  return sessions.delete(token);
}

function verify(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function tokenFromReq(req) {
  // 1) Authorization: Bearer X
  const h = req.headers["authorization"] || "";
  const m = /^Bearer\s+([A-Za-z0-9._-]+)/.exec(h);
  if (m) return m[1];
  // 2) X-Admin-Token
  if (req.headers["x-admin-token"]) return String(req.headers["x-admin-token"]);
  // 3) Cookie sob_admin
  const c = req.headers["cookie"] || "";
  const cm = /(?:^|;\s*)sob_admin=([A-Za-z0-9._-]+)/.exec(c);
  if (cm) return cm[1];
  return null;
}

function requireAuth(req) {
  const token = tokenFromReq(req);
  return verify(token);
}

module.exports = {
  login,
  logout,
  verify,
  tokenFromReq,
  requireAuth,
  sha256,
  recordLoginFailure,
  clearLoginFailures,
  isLoginBlocked,
};
