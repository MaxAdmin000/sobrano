// K56: простой structured-логгер без зависимостей. Пишет JSON-строку в stdout —
// systemd подхватывает в journalctl, фильтровать удобно через
//   journalctl -u sobrano-backend -o json --output-fields=MESSAGE | jq .
//
// API:
//   log.info("event.name", { id, ... })
//   log.warn("event.name", { reason, ... })
//   log.error("event.name", { err: e.message, ... })
//
// Поля каждой записи: { ts, level, event, ...meta }. ts — ISO-8601 UTC.
// При желании можно зеркалить в файл через env SOBRANO_LOG_FILE — но это
// должно быть приготовлено на стороне OS (logrotate); по умолчанию выключено.

const fs = require("node:fs");
const path = require("node:path");

const FILE_PATH = process.env.SOBRANO_LOG_FILE || "";
let _fileStream = null;
if (FILE_PATH) {
  try {
    fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
    _fileStream = fs.createWriteStream(FILE_PATH, { flags: "a" });
    _fileStream.on("error", (e) => {
      // fail-open: если файл недоступен — просто перестаём в него писать.
      console.warn("[logger] file stream error:", e.message);
      _fileStream = null;
    });
  } catch (e) {
    console.warn("[logger] cannot open log file", FILE_PATH, "—", e.message);
    _fileStream = null;
  }
}

function emit(level, event, meta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event: String(event || "unknown"),
    ...(meta && typeof meta === "object" ? meta : {}),
  });
  // stdout — для journalctl
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
  // опциональный файл
  if (_fileStream) {
    try { _fileStream.write(line + "\n"); } catch (e) { /* ignore */ }
  }
}

module.exports = {
  info:  (event, meta) => emit("info",  event, meta),
  warn:  (event, meta) => emit("warn",  event, meta),
  error: (event, meta) => emit("error", event, meta),
};
