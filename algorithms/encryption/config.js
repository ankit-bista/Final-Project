export const METHODS = {
  "AES-128": { algorithm: "chacha20-poly1305", keyLength: 32, iterations: 10000, speedMBps: 80 },
  "AES-256": { algorithm: "chacha20-poly1305", keyLength: 32, iterations: 100000, speedMBps: 45 },
};

export function getMethodConfig(method = "AES-256") {
  const selected = String(method || "AES-256").toUpperCase();
  const config = METHODS[selected];
  if (!config) {
    const err = new Error("Unsupported encryption method");
    err.code = "INVALID_METHOD";
    throw err;
  }
  return { method: selected, ...config };
}
