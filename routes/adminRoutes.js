import express from "express";
import { blockchainService } from "../services/blockchain.js";
import { assignRoleAndQuota, ensureUserRoleSchema, isAdmin } from "../services/userRoleService.js";
import { computeUsedBytes } from "../services/quotaService.js";
import {
  createDrive,
  deleteDriveCascade,
  deleteUserById,
  getDriveById,
  findUserByUsernameOrWallet,
  listAllCollaborativeDrivesForAdmin,
  listAllFilesByDrive,
  listDriveMembers,
  listUsersForAdmin,
  upsertDriveMember,
  removeDriveMember,
  updateDriveQuotaLimit,
} from "../services/models/index.js";

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
      results.map(async (u) => {
        let storageUsed = 0;
        try {
          storageUsed = await computeUsedBytes(u.id);
        } catch (usageErr) {
          console.warn("Failed to compute user storage usage:", {
            userId: u?.id,
            message: usageErr?.message || usageErr,
          });
        }
        return {
          ...u,
          storage_used: Number(storageUsed || 0),
        };
      })
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

router.get("/api/admin/drives", requireAdmin, async (req, res) => {
  try {
    const drives = await listAllCollaborativeDrivesForAdmin();
    res.json(drives);
  } catch (err) {
    console.error("Error in /api/admin/drives:", err);
    res.status(500).json({ error: "Failed to fetch drives" });
  }
});

router.post("/api/admin/drives", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Drive name required" });

    const ownerId = req.body?.ownerId ? Number(req.body.ownerId) : Number(req.session.userId);
    if (!Number.isFinite(ownerId)) return res.status(400).json({ error: "Invalid owner ID" });

    const drive = await createDrive({
      name,
      ownerId,
      personal: false,
      quotaLimitBytes: Number(req.body?.quotaLimitBytes || 0),
    });
    await upsertDriveMember({ driveId: drive.id, userId: ownerId, role: "admin", invitedBy: req.session.userId });
    res.json(drive);
  } catch (err) {
    console.error("Admin create drive failed:", err);
    res.status(500).json({ error: "Failed to create drive" });
  }
});

router.get("/api/admin/drives/:id/files", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    if (!Number.isFinite(driveId)) return res.status(400).json({ error: "Invalid drive ID" });
    const files = await listAllFilesByDrive(driveId);
    res.json(files);
  } catch (err) {
    console.error("Admin list drive files failed:", err);
    res.status(500).json({ error: "Failed to fetch drive files" });
  }
});

router.get("/api/admin/drives/:id/members", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    if (!Number.isFinite(driveId)) return res.status(400).json({ error: "Invalid drive ID" });
    const members = await listDriveMembers(driveId);
    res.json(members);
  } catch (err) {
    console.error("Admin list drive members failed:", err);
    res.status(500).json({ error: "Failed to fetch drive members" });
  }
});

router.post("/api/admin/drives/:id/members", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    if (!Number.isFinite(driveId)) return res.status(400).json({ error: "Invalid drive ID" });

    const identifier = String(req.body?.identifier || "").trim();
    if (!identifier) return res.status(400).json({ error: "User identifier required" });

    const user = await findUserByUsernameOrWallet(identifier);
    if (!user) return res.status(404).json({ error: "User not found" });

    const member = await upsertDriveMember({
      driveId,
      userId: user.id,
      role: req.body?.role || "viewer",
      invitedBy: req.session.userId,
    });
    res.json({ success: true, member });
  } catch (err) {
    console.error("Admin add drive member failed:", err);
    res.status(500).json({ error: "Failed to add drive member" });
  }
});

router.delete("/api/admin/drives/:id/members/:userId", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (!Number.isFinite(driveId) || !Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid drive or user ID" });
    }

    const removed = await removeDriveMember(driveId, userId);
    if (!removed) return res.status(404).json({ error: "Member not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin remove drive member failed:", err);
    res.status(500).json({ error: "Failed to remove drive member" });
  }
});

router.post("/api/admin/drives/:id/quota", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    if (!Number.isFinite(driveId)) return res.status(400).json({ error: "Invalid drive ID" });
    await updateDriveQuotaLimit(driveId, Number(req.body?.quotaLimitBytes || 0));
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update drive quota failed:", err);
    res.status(500).json({ error: "Failed to update drive quota" });
  }
});

router.delete("/api/admin/drives/:id", requireAdmin, async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    if (!Number.isFinite(driveId)) return res.status(400).json({ error: "Invalid drive ID" });

    const drive = await getDriveById(driveId);
    if (!drive) return res.status(404).json({ error: "Drive not found" });
    if (drive.personal) return res.status(400).json({ error: "Personal drives cannot be deleted here" });

    const deleted = await deleteDriveCascade(driveId);
    if (!deleted) return res.status(404).json({ error: "Drive not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete drive failed:", err);
    res.status(500).json({ error: "Failed to delete drive" });
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
