import express from "express";
import { blockchainService } from "../services/blockchain.js";
import { assignRoleAndQuota, ensureUserRoleSchema, isAdmin } from "../services/userRoleService.js";
import { computeUsedBytes } from "../services/quotaService.js";
import { deleteUserById, listUsersForAdmin } from "../services/models/index.js";

const router = express.Router();
ensureUserRoleSchema().catch(() => {});

// Middleware to check authentication and admin role
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  isAdmin(req.session.userId)
    .then((ok) => {
      if (!ok) return res.status(403).json({ error: "Admin access required" });
      next();
    })
    .catch((err) => res.status(500).json({ error: err?.message || "Role check failed" }));
};

// Allocate a new Storage Pool
router.post("/api/admin/pool/allocate", requireAdmin, async (req, res) => {
  try {
    const { poolName, bytesAmount } = req.body;
    if (!poolName || !bytesAmount) {
      return res.status(400).json({ error: "poolName and bytesAmount required" });
    }
    await blockchainService.allocatePool(poolName, bytesAmount);
    res.json({ success: true, message: `Successfully allocated pool ${poolName}` });
  } catch (err) {
    console.error("Pool allocation failed:", err);
    res.status(500).json({ error: "Pool allocation failed: " + err.message });
  }
});

// Allocate quota to a user from a specific pool
router.post("/api/admin/quota/allocate", requireAdmin, async (req, res) => {
  try {
    const { poolName, userAddress, bytesAmount } = req.body;
    if (!poolName || !userAddress || !bytesAmount) {
      return res.status(400).json({ error: "poolName, userAddress, and bytesAmount required" });
    }
    await blockchainService.allocateUserQuota(poolName, userAddress, bytesAmount);
    res.json({ success: true, message: `Successfully allocated ${bytesAmount} bytes to ${userAddress}` });
  } catch (err) {
    console.error("User quota allocation failed:", err);
    res.status(500).json({ error: "Quota allocation failed: " + err.message });
  }
});

// Get all users (Admin view)
router.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const results = await listUsersForAdmin();
    const withUsage = await Promise.all(
      results.map(async (u) => ({
        ...u,
        storage_used: await computeUsedBytes(u.id),
      }))
    );
    res.json(withUsage);
  } catch (err) {
    console.error("Error in /api/admin/users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/api/admin/users/:id/access", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const { role, quotaBytes } = req.body || {};
    const updated = await assignRoleAndQuota(userId, role, quotaBytes);
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Update access failed:", err);
    res.status(500).json({ error: "Failed to update access" });
  }
});

// Delete a user (Admin only)
router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const deleted = await deleteUserById(userId);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;

