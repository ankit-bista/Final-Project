import express from "express";
import { ethers } from "ethers";
import crypto from "crypto";
import { ensureUserRoleSchema } from "../services/userRoleService.js";
import {
  createUserWithNonce,
  findUserById,
  findUserByUsername,
  findUserByWallet,
  setAdminRole,
  updateUsername,
  updateUserNonceById,
  updateUserNonceByWallet,
  updateEncryptionPublicKey,
} from "../services/models/index.js";
import { ensureDefaultDriveForUser } from "../services/driveService.js";

const router = express.Router();
ensureUserRoleSchema().catch((err) => console.warn("Role schema init warning:", err?.message || err));

// 1. Get nonce for a specific wallet address
router.get("/auth/nonce", async (req, res) => {
  const { address } = req.query;
  
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  const normalizedAddress = address.toLowerCase();
  
  // Generate a random nonce
  const nonce = `Welcome to Blockchain Drive! To authenticate, please sign this random nonce: ${crypto.randomBytes(16).toString("hex")}`;

  try {
    const user = await findUserByWallet(normalizedAddress);
    if (user) {
      await updateUserNonceByWallet(normalizedAddress, nonce);
    } else {
      await createUserWithNonce(normalizedAddress, nonce);
    }
    res.json({ nonce });
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// 2. Verify signature and login
router.post("/auth/verify", async (req, res) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: "Address and signature are required" });
  }

  const normalizedAddress = address.toLowerCase();

  try {
      const user = await findUserByWallet(normalizedAddress);
      if (!user) return res.status(401).json({ error: "User not found or database error" });
      const expectedNonce = user.nonce;

      if (!expectedNonce) {
        return res.status(401).json({ error: "Nonce not generated for user" });
      }

      try {
        // Recover address from signature
        const recoveredAddress = ethers.verifyMessage(expectedNonce, signature);
        
        if (recoveredAddress.toLowerCase() === normalizedAddress) {
          req.session.userId = user.id;
          const bootstrapAdminWallet = (process.env.MAIN_ADMIN_WALLET || "").toLowerCase();
          if (bootstrapAdminWallet && user.wallet_address === bootstrapAdminWallet) {
            await setAdminRole(user.id);
          }

          // Persist session before responding (avoids races with Express 5 / async stores)
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save error:", saveErr);
              return res.status(500).json({ error: "Could not create login session" });
            }

            updateUserNonceById(user.id, null).catch(() => {});
            ensureDefaultDriveForUser(user.id).catch((e) =>
              console.warn("Default drive initialization warning:", e?.message || e)
            );

            const needsUsername =
              !user.username ||
              (typeof user.username === "string" && user.username.trim() === "");
            return res.json({
              success: true,
              userId: user.id,
              username: user.username || null,
              needsUsername,
            });
          });
          return;
        } else {
          return res.status(401).json({ error: "Signature verification failed" });
        }
      } catch (error) {
        console.error("Signature verification error:", error);
        return res.status(401).json({ error: "Invalid signature format" });
      }
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
});

// 3. Set username (called after first wallet connection)
router.post("/auth/username", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required" });
  }

  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 20) {
    return res.status(400).json({ error: "Username must be 3–20 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });
  }

  try {
    const existing = await findUserByUsername(trimmed);
    if (existing && existing.id !== req.session.userId) {
      return res.status(409).json({ error: "Username is already taken" });
    }
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    await updateUsername(req.session.userId, trimmed);
    res.json({ success: true, username: trimmed });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save username" });
  }
});

router.post("/auth/encryption-key", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { encryptionPublicKey } = req.body || {};
  if (!encryptionPublicKey || typeof encryptionPublicKey !== "string") {
    return res.status(400).json({ error: "encryptionPublicKey required" });
  }
  try {
    await updateEncryptionPublicKey(req.session.userId, encryptionPublicKey.trim());
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save encryption key" });
  }
});

// 4. Logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

export default router;
