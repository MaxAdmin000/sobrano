// СОБРАНО · Cloudflare Worker — прозрачный прокси для Telegram Bot API.
// Нужен, потому что хостинг сервера в РФ блокирует прямой выход на api.telegram.org.
//
// Деплой:
//   1) https://dash.cloudflare.com → Workers & Pages → Create → Hello World.
//   2) Скопируй ВЕСЬ этот файл в редактор Worker'а.
//   3) Deploy. Скопируй URL (вида https://<имя>.<твой-сабдомен>.workers.dev).
//   4) Вставь URL в админке СОБРАНО → Настройки → Telegram → "URL прокси".
//   5) Жми «Тестовое сообщение» — должно прийти в чат.
//
// Безопасность: бот-токен идёт в URL-пути (`/bot<TOKEN>/...`), как и в API Telegram.
// HTTPS шифрует весь путь, поэтому он не утекает по сети. Cloudflare не логирует тело запроса
// и токены без явной настройки. Лимит free-плана — 100 000 запросов/день, для магазина — с запасом.

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Принимаем только методы API: путь должен начинаться с /bot
    if (!url.pathname.startsWith("/bot")) {
      return new Response("Telegram proxy ready. Use /bot<TOKEN>/<method>.", { status: 200 });
    }

    // Форвардим всё как есть (метод + body + query) на реальный API.
    const target = `https://api.telegram.org${url.pathname}${url.search}`;

    const init = {
      method: request.method,
      headers: pickHeaders(request.headers),
      redirect: "follow",
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.arrayBuffer();
    }

    let resp;
    try {
      resp = await fetch(target, init);
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "proxy_fetch_failed", message: e.message }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    // Отдаём ответ один-в-один, без модификации.
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    });
  },
};

// Прокидываем только полезные заголовки запроса (без host/cf-*/x-real-ip и т.п.)
function pickHeaders(h) {
  const out = new Headers();
  const allow = ["content-type", "content-length", "accept", "user-agent"];
  for (const name of allow) {
    const v = h.get(name);
    if (v) out.set(name, v);
  }
  return out;
}
