const crypto = require("node:crypto");

async function postWebhook(env, event, payload) {
  if (!env.ORDER_WEBHOOK_URL) return;

  const body = JSON.stringify({
    event,
    sentAt: new Date().toISOString(),
    payload
  });

  const headers = {
    "content-type": "application/json"
  };

  if (env.ORDER_WEBHOOK_SECRET) {
    headers["x-robokassa-tilda-signature"] = crypto
      .createHmac("sha256", env.ORDER_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(env.ORDER_WEBHOOK_URL, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });
  } catch (error) {
    console.error(`Webhook failed for ${event}:`, error.message);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { postWebhook };
