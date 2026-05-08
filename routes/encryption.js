import express from "express";
import multer from "multer";
import {
  getEncryptionMethods,
  validatePasswordStrength,
  encryptBuffer,
  decryptBuffer,
  estimateEncryptionTime,
  compareEncryptionMethods,
} from "../algorithms/encryption/index.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/methods", (req, res) => {
  res.json(getEncryptionMethods());
});

router.post("/validate-password", (req, res) => {
  const { password } = req.body || {};
  res.json(validatePasswordStrength(password));
});

router.post("/encrypt", upload.single("file"), (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "file is required" });
    const password = req.body?.password;
    const method = req.body?.method || "AES-256";
    if (!password) return res.status(400).json({ error: "password is required" });
    const result = encryptBuffer(req.file.buffer, password, method);
    return res.json({
      ...result,
      fileName: req.file.originalname,
      originalSizeBytes: req.file.size || 0,
    });
  } catch (err) {
    const code = err?.code === "INVALID_METHOD" ? 400 : 500;
    return res.status(code).json({ error: err?.message || "Encryption failed" });
  }
});

router.post("/decrypt", (req, res) => {
  try {
    const { password, ...payload } = req.body || {};
    if (!password) return res.status(400).json({ error: "password is required" });
    const output = decryptBuffer(payload, password);
    return res.json({
      plainTextBase64: output.toString("base64"),
      sizeBytes: output.length,
    });
  } catch (err) {
    const code = err?.code === "DECRYPT_FAILED" || err?.code === "INVALID_METHOD" ? 400 : 500;
    return res.status(code).json({ error: err?.message || "Decryption failed" });
  }
});

router.get("/estimate-time", (req, res) => {
  try {
    const bytes = Number(req.query?.bytes || 0);
    const method = req.query?.method || "AES-256";
    return res.json(estimateEncryptionTime(bytes, method));
  } catch (err) {
    return res.status(400).json({ error: err?.message || "Invalid input" });
  }
});

router.post("/compare-methods", (req, res) => {
  try {
    const bytes = Number(req.body?.bytes || 0);
    return res.json(compareEncryptionMethods(bytes));
  } catch (err) {
    return res.status(400).json({ error: err?.message || "Invalid input" });
  }
});

export default router;
