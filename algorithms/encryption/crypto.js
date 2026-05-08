import crypto from "crypto";
import { getMethodConfig } from "./config.js";
import { aesCtrTransform } from "./aes.js";

function keyedBlake2Tag(key, nonce, cipherText, authTag) {
  // 256-bit keyed BLAKE2b tag.
  return crypto
    .createHash("blake2b512", { key })
    .update(nonce)
    .update(cipherText)
    .update(authTag)
    .digest()
    .subarray(0, 32);
}

export function encryptBuffer(buffer, password, method = "AES-256") {
  const cfg = getMethodConfig(method);
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(String(password || ""), salt, cfg.iterations, cfg.keyLength, "sha256");
  const cipher = crypto.createCipheriv(cfg.algorithm, key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  const cipherAuthTag = cipher.getAuthTag();
  const authTag = keyedBlake2Tag(key, iv, encrypted, cipherAuthTag);

  return {
    method: cfg.method,
    cipherTextBase64: encrypted.toString("base64"),
    ivBase64: iv.toString("base64"),
    saltBase64: salt.toString("base64"),
    authTagBase64: authTag.toString("base64"),
    cipherAuthTagBase64: cipherAuthTag.toString("base64"),
  };
}

export function decryptBuffer(payload, password) {
  const cfg = getMethodConfig(payload?.method || "AES-256");
  const iv = Buffer.from(String(payload?.ivBase64 || ""), "base64");
  const salt = Buffer.from(String(payload?.saltBase64 || ""), "base64");
  const authTag = Buffer.from(String(payload?.authTagBase64 || ""), "base64");
  const cipherAuthTag = Buffer.from(String(payload?.cipherAuthTagBase64 || ""), "base64");
  const cipherText = Buffer.from(String(payload?.cipherTextBase64 || ""), "base64");
  const key = crypto.pbkdf2Sync(String(password || ""), salt, cfg.iterations, cfg.keyLength, "sha256");

  try {
    // Backward compatibility for previously issued payloads:
    // - IV size 16
    // - no cipherAuthTag
    // - HMAC-SHA256(iv + ciphertext) auth
    if (!cipherAuthTag.length) {
      if (iv.length !== 16) throw new Error("Invalid legacy IV length");
      const expectedLegacyTag = crypto.createHmac("sha256", key).update(iv).update(cipherText).digest();
      if (
        expectedLegacyTag.length !== authTag.length ||
        !crypto.timingSafeEqual(expectedLegacyTag, authTag)
      ) {
        throw new Error("Legacy authentication failed");
      }
      return Buffer.from(aesCtrTransform(cipherText, key, iv));
    }

    if (iv.length !== 12) throw new Error("Invalid nonce length");
    if (cipherAuthTag.length !== 16) throw new Error("Invalid cipher auth tag");
    const expectedTag = keyedBlake2Tag(key, iv, cipherText, cipherAuthTag);
    if (expectedTag.length !== authTag.length || !crypto.timingSafeEqual(expectedTag, authTag)) {
      throw new Error("Authentication failed");
    }
    const decipher = crypto.createDecipheriv(cfg.algorithm, key, iv, { authTagLength: 16 });
    decipher.setAuthTag(cipherAuthTag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]);
  } catch {
    const err = new Error("Decryption failed. Invalid password or corrupted payload.");
    err.code = "DECRYPT_FAILED";
    throw err;
  }
}
