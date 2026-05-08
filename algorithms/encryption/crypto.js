import crypto from "crypto";
import { getMethodConfig } from "./config.js";
import { aesCtrTransform } from "./aes.js";

export function encryptBuffer(buffer, password, method = "AES-256") {
  const cfg = getMethodConfig(method);
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(String(password || ""), salt, cfg.iterations, cfg.keyLength, "sha256");
  const encrypted = Buffer.from(aesCtrTransform(source, key, iv));
  const authTag = crypto.createHmac("sha256", key).update(iv).update(encrypted).digest();

  return {
    method: cfg.method,
    cipherTextBase64: encrypted.toString("base64"),
    ivBase64: iv.toString("base64"),
    saltBase64: salt.toString("base64"),
    authTagBase64: authTag.toString("base64"),
  };
}

export function decryptBuffer(payload, password) {
  const cfg = getMethodConfig(payload?.method || "AES-256");
  const iv = Buffer.from(String(payload?.ivBase64 || ""), "base64");
  const salt = Buffer.from(String(payload?.saltBase64 || ""), "base64");
  const authTag = Buffer.from(String(payload?.authTagBase64 || ""), "base64");
  const cipherText = Buffer.from(String(payload?.cipherTextBase64 || ""), "base64");
  const key = crypto.pbkdf2Sync(String(password || ""), salt, cfg.iterations, cfg.keyLength, "sha256");

  try {
    if (iv.length !== 16) throw new Error("Invalid IV length");
    const expectedTag = crypto.createHmac("sha256", key).update(iv).update(cipherText).digest();
    if (expectedTag.length !== authTag.length || !crypto.timingSafeEqual(expectedTag, authTag)) {
      throw new Error("Authentication failed");
    }
    return Buffer.from(aesCtrTransform(cipherText, key, iv));
  } catch {
    const err = new Error("Decryption failed. Invalid password or corrupted payload.");
    err.code = "DECRYPT_FAILED";
    throw err;
  }
}
