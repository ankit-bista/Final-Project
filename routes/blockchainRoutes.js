import express from "express";
import { blockchainService } from "../services/blockchain.js";
import { getWalletAddress } from "../services/fileService.js";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

router.get("/blockchain/status", requireAuth, async (req, res) => {
  res.json({
    useRealContracts: process.env.USE_REAL_CONTRACTS === "true",
    rpcUrl: process.env.RPC_URL || null,
    storageAllocContract: process.env.STORAGE_ALLOC_CONTRACT || null,
    driveV2Contract: process.env.DRIVE_V2_CONTRACT || null,
    enforceQuotaOnUpload: process.env.ENFORCE_QUOTA_ON_UPLOAD === "true",
    enforceContractPermissions: process.env.ENFORCE_CONTRACT_PERMISSIONS === "true",
    enforceContractSharing: process.env.ENFORCE_CONTRACT_SHARING === "true"
  });
});

router.get("/blockchain/quota", requireAuth, async (req, res) => {
  try {
    const walletAddress = await getWalletAddress(req.session.userId);

    if (process.env.USE_REAL_CONTRACTS !== "true") {
      return res.json({
        walletAddress,
        mode: "mock",
        quotaLimitBytes: null,
        usedBytes: null,
        remainingBytes: null,
        usagePercent: null
      });
    }

    const stats = await blockchainService.storageContract.getQuotaStats(walletAddress);
    // ethers v6 returns a Result with named + indexed access
    res.json({
      walletAddress,
      mode: "real",
      tier: stats.tier ?? stats[0],
      quotaLimitBytes: (stats.quotaLimitBytes ?? stats[1])?.toString?.() ?? String(stats[1]),
      usedBytes: (stats.usedBytes ?? stats[2])?.toString?.() ?? String(stats[2]),
      remainingBytes: (stats.remainingBytes ?? stats[3])?.toString?.() ?? String(stats[3]),
      usagePercent: Number(stats.usagePercent ?? stats[4])
    });
  } catch (err) {
    console.error("Quota endpoint error:", err);
    res.status(500).json({ error: "Failed to fetch quota" });
  }
});

export default router;

