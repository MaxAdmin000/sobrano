const crypto = require("node:crypto");

const HASH_ALGORITHMS = {
  md5: "md5",
  ripemd160: "ripemd160",
  sha1: "sha1",
  hs1: "sha1",
  sha256: "sha256",
  hs256: "sha256",
  sha384: "sha384",
  hs384: "sha384",
  sha512: "sha512",
  hs512: "sha512"
};

function normalizeAlgorithm(value) {
  const key = String(value || "md5").trim().toLowerCase();
  const algorithm = HASH_ALGORITHMS[key];
  if (!algorithm) {
    throw new Error(`Unsupported Robokassa hash algorithm: ${value}`);
  }
  return algorithm;
}

function makeHash(value, algorithm) {
  return crypto
    .createHash(normalizeAlgorithm(algorithm))
    .update(String(value), "utf8")
    .digest("hex");
}

function timingSafeEqualHex(left, right) {
  const a = Buffer.from(String(left || "").toLowerCase(), "utf8");
  const b = Buffer.from(String(right || "").toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sortShpParams(params) {
  return Object.entries(params || {})
    .filter(([key, value]) => key.startsWith("Shp_") && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([key, value]) => `${key}=${value}`);
}

function buildPaymentSignature({
  merchantLogin,
  outSum,
  invId,
  receipt,
  password1,
  shpParams,
  algorithm
}) {
  const parts = [merchantLogin, outSum, invId || "", receipt, password1, ...sortShpParams(shpParams)];
  return makeHash(parts.join(":"), algorithm);
}

function buildResultSignature({ outSum, invId, password2, shpParams, algorithm }) {
  const parts = [outSum, invId || "", password2, ...sortShpParams(shpParams)];
  return makeHash(parts.join(":"), algorithm);
}

module.exports = {
  buildPaymentSignature,
  buildResultSignature,
  makeHash,
  sortShpParams,
  timingSafeEqualHex
};
