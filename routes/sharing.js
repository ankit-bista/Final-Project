import express from "express";
import {
  createBulkShare,
  listReceivedShares,
  listSentShares,
  verifyShareAccess,
  revokeShare,
  getShareStats,
  searchShares,
  getShareById,
} from "../services/sharingService.js";
import { resolveRequestUserId } from "../services/devTestAuth.js";

const router = express.Router();

function requireAuth(req, res, next) {
  const userId = resolveRequestUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  req.authUserId = userId;
  next();
}

function toApiShare(share) {
  return {
    shareId: share.id,
    ownerId: share.owner_id,
    recipientId: share.recipient_id,
    recipientWallet: share.recipient_wallet || null,
    fileIds: share.file_ids || [],
    permissionType: share.permission_type || "readonly",
    passwordProtected: Boolean(share.password_hash),
    expiresAt: share.expires_at || null,
    revokedAt: share.revoked_at || null,
    createdAt: share.created_at || null,
    accessCount: Array.isArray(share.access_log) ? share.access_log.length : 0,
    transactionHash: share.transaction_hash || null,
  };
}

router.post("/bulk", requireAuth, async (req, res) => {
  try {
    const result = await createBulkShare({
      ownerId: req.authUserId,
      fileIds: req.body?.fileIds,
      recipientAddress: req.body?.recipientAddress,
      permissionType: req.body?.permissionType,
      sharePassword: req.body?.sharePassword,
      expiresInDays: req.body?.expiresIn,
    });
    return res.json(result);
  } catch (err) {
    const status =
      err?.code === "RECIPIENT_NOT_FOUND"
        ? 404
        : err?.code === "INVALID" || err?.code === "ACCESS_DENIED"
          ? 400
          : 500;
    return res.status(status).json({ error: err?.message || "Failed to create share" });
  }
});

router.get("/received", requireAuth, async (req, res) => {
  const shares = await listReceivedShares(req.authUserId);
  return res.json(shares.map(toApiShare));
});

router.get("/received/:shareId", requireAuth, async (req, res) => {
  const result = await verifyShareAccess({
    shareId: req.params.shareId,
    requesterId: req.authUserId,
    password: req.query?.password,
    ipAddress: req.ip,
  });
  if (!result.hasAccess) return res.status(403).json({ hasAccess: false, error: result.reason });
  return res.json(result);
});

router.get("/sent", requireAuth, async (req, res) => {
  const shares = await listSentShares(req.authUserId);
  return res.json(shares.map(toApiShare));
});

router.post("/revoke", requireAuth, async (req, res) => {
  const ok = await revokeShare({ shareId: req.body?.shareId, ownerId: req.authUserId });
  if (!ok) return res.status(404).json({ error: "Share not found or already revoked" });
  return res.json({ success: true });
});

router.get("/stats", requireAuth, async (req, res) => {
  const stats = await getShareStats(req.authUserId);
  return res.json(stats);
});

router.get("/:shareId/check-access", requireAuth, async (req, res) => {
  const result = await verifyShareAccess({
    shareId: req.params.shareId,
    requesterId: req.authUserId,
    password: req.query?.password,
    ipAddress: req.ip,
  });
  return res.json(result);
});

router.get("/search", requireAuth, async (req, res) => {
  const rows = await searchShares(req.authUserId, req.query?.q || "");
  return res.json(rows.map(toApiShare));
});

router.get("/:shareId", requireAuth, async (req, res) => {
  const share = await getShareById(req.params.shareId);
  if (!share) return res.status(404).json({ error: "Share not found" });
  if (Number(share.owner_id) !== Number(req.authUserId) && Number(share.recipient_id) !== Number(req.authUserId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  return res.json(toApiShare(share));
});

export default router;
