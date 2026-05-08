export const METHODS = {
  "AES-128": { algorithm: "aes-128-gcm", keyLength: 16, iterations: 10000, speedMBps: 30 },
  "AES-256": { algorithm: "aes-256-gcm", keyLength: 32, iterations: 100000, speedMBps: 10 },
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
