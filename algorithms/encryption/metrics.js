import { METHODS, getMethodConfig } from "./config.js";

export function getEncryptionMethods() {
  return Object.entries(METHODS).map(([name, cfg]) => ({
    name,
    keyBits: cfg.keyLength * 8,
    kdfIterations: cfg.iterations,
    estimatedSpeedMBps: cfg.speedMBps,
  }));
}

export function estimateEncryptionTime(bytes, method = "AES-256") {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size < 0) {
    const err = new Error("Invalid file size");
    err.code = "INVALID_SIZE";
    throw err;
  }
  const cfg = getMethodConfig(method);
  const seconds = size / (cfg.speedMBps * 1024 * 1024);
  return {
    method: cfg.method,
    fileSizeBytes: size,
    estimatedMs: Math.max(1, Math.round(seconds * 1000)),
  };
}

export function compareEncryptionMethods(bytes) {
  return ["AES-128", "AES-256"].map((method) => estimateEncryptionTime(bytes, method));
}
