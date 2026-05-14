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
};
