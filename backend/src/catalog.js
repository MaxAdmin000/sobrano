const fs = require("node:fs");
const path = require("node:path");

function parseMoneyToCents(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return 0;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

function formatMoney(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

function truncateReceiptName(value) {
  return String(value || "Товар")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 128);
}

function loadCatalog(filePath) {
  const resolved = filePath || path.join(__dirname, "..", "products.json");
  if (!fs.existsSync(resolved)) {
    const example = path.join(__dirname, "..", "products.example.json");
    if (fs.existsSync(example)) {
      return loadCatalog(example);
    }
    return new Map();
  }

  const raw = fs.readFileSync(resolved, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("products.json must contain an array");
  }

  return new Map(
    list.map((product) => {
      if (!product.sku) {
        throw new Error("Every product in products.json must have sku");
      }
      return [
        String(product.sku),
        {
          ...product,
          sku: String(product.sku),
          name: truncateReceiptName(product.name || product.title || product.sku),
          priceCents: parseMoneyToCents(product.price)
        }
      ];
    })
  );
}

function normalizeCartItems({ clientItems, catalog, env }) {
  const items = [];
  const allowClientPrices = String(env.ALLOW_CLIENT_PRICES || "false").toLowerCase() === "true";
  const defaultTax = env.ROBOKASSA_DEFAULT_TAX || "none";
  const defaultPaymentMethod = env.ROBOKASSA_DEFAULT_PAYMENT_METHOD || "full_prepayment";
  const defaultPaymentObject = env.ROBOKASSA_DEFAULT_PAYMENT_OBJECT || "commodity";

  for (const clientItem of clientItems || []) {
    const sku = String(clientItem.sku || clientItem.id || "").trim();
    const quantity = Math.max(1, Math.min(99, Number.parseInt(clientItem.quantity || 1, 10)));
    const catalogItem = sku ? catalog.get(sku) : null;

    if (!catalogItem && !allowClientPrices) {
      throw new Error(`Unknown product SKU: ${sku || "(empty)"}`);
    }

    const source = catalogItem || {
      sku,
      name: truncateReceiptName(clientItem.name || clientItem.title || sku || "Товар"),
      priceCents: parseMoneyToCents(clientItem.price),
      tax: clientItem.tax,
      payment_method: clientItem.payment_method,
      payment_object: clientItem.payment_object
    };

    if (!source.priceCents || source.priceCents < 0) {
      throw new Error(`Invalid price for SKU: ${sku || source.name}`);
    }

    items.push({
      sku: source.sku || sku,
      name: truncateReceiptName(source.name || source.title),
      quantity,
      priceCents: source.priceCents,
      totalCents: source.priceCents * quantity,
      tax: source.tax || defaultTax,
      payment_method: source.payment_method || defaultPaymentMethod,
      payment_object: source.payment_object || defaultPaymentObject
    });
  }

  if (!items.length) {
    throw new Error("Cart is empty");
  }

  return items;
}

function buildDeliveryItem(delivery, env) {
  const method = String(delivery && delivery.method ? delivery.method : "own");
  const prices = {
    own: parseMoneyToCents(env.DELIVERY_OWN_PRICE || "500.00"),
    pickup: parseMoneyToCents(env.DELIVERY_PICKUP_PRICE || "0"),
    yandex: parseMoneyToCents(env.DELIVERY_YANDEX_PRICE || "0")
  };
  const names = {
    own: "Доставка курьером",
    pickup: "Самовывоз",
    yandex: "Доставка Яндекс Go"
  };
  const priceCents = prices[method] || 0;
  if (priceCents <= 0) return null;

  return {
    sku: `delivery-${method}`,
    name: names[method] || "Доставка",
    quantity: 1,
    priceCents,
    totalCents: priceCents,
    tax: env.ROBOKASSA_DEFAULT_TAX || "none",
    payment_method: env.ROBOKASSA_DEFAULT_PAYMENT_METHOD || "full_prepayment",
    payment_object: "service"
  };
}

function buildReceipt(items, env) {
  const receipt = {
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      sum: Number(formatMoney(item.totalCents)),
      tax: item.tax,
      payment_method: item.payment_method,
      payment_object: item.payment_object
    }))
  };

  if (env.ROBOKASSA_SNO) {
    receipt.sno = env.ROBOKASSA_SNO;
  }

  return JSON.stringify(receipt);
}

module.exports = {
  buildDeliveryItem,
  buildReceipt,
  formatMoney,
  loadCatalog,
  normalizeCartItems,
  parseMoneyToCents,
  truncateReceiptName
};
