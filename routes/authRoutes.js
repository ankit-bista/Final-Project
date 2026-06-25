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
  
  // Validate address format (basic check)
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
    return res.status(400).json({ error: "Invalid Ethereum address format" });
  }

  try {
    // Generate a random nonce
    const nonce = `Welcome to Blockchain Drive! To authenticate, please sign this random nonce: ${crypto.randomBytes(16).toString("hex")}`;

    const user = await findUserByWallet(normalizedAddress);
    if (user) {
      await updateUserNonceByWallet(normalizedAddress, nonce);
    } else {
      await createUserWithNonce(normalizedAddress, nonce);
    }
    res.json({ nonce });
  } catch (err) {
    console.error("Database error in /auth/nonce:", err.message || err);
    return res.status(500).json({ error: "Failed to generate nonce. Please try again." });
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
    if (!user) {
      console.warn("User not found for wallet:", normalizedAddress);
      return res.status(401).json({ error: "User not found or database error" });
    }

    const expectedNonce = user.nonce;
    if (!expectedNonce) {
      console.warn("Nonce missing for wallet:", normalizedAddress);
      return res.status(401).json({ error: "Nonce not generated for user" });
    }

    try {
      // Recover address from signature
      const recoveredAddress = ethers.verifyMessage(expectedNonce, signature);
      
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        console.warn("Signature mismatch - recovered:", recoveredAddress, "expected:", normalizedAddress);
        return res.status(401).json({ error: "Signature verification failed" });
      }

      // Check admin status
      const bootstrapAdminWallet = (process.env.MAIN_ADMIN_WALLET || "").toLowerCase();
      if (bootstrapAdminWallet && user.wallet_address === bootstrapAdminWallet) {
        await setAdminRole(user.id).catch(e => console.warn("Admin role error:", e?.message));
      }

      req.session.userId = user.id;

      // Persist session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr.message || saveErr);
          return res.status(500).json({ error: "Could not create login session" });
        }

        // Clean up nonce and initialize drive (non-blocking)
        updateUserNonceById(user.id, null).catch(e => 
          console.warn("Nonce cleanup warning:", e?.message || e)
        );
        ensureDefaultDriveForUser(user.id).catch(e =>
          console.warn("Default drive initialization warning:", e?.message || e)
        );

        const needsUsername =
          !user.username ||
          (typeof user.username === "string" && user.username.trim() === "");
        
        res.json({
          success: true,
          userId: user.id,
          username: user.username || null,
          needsUsername,
        });
      });
    } catch (error) {
      console.error("Signature verification error:", error.message || error);
      return res.status(401).json({ error: "Invalid signature format" });
    }
  } catch (err) {
    console.error("Database error in /auth/verify:", err.message || err);
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
