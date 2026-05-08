import express from "express";
import { resolveRequestUserId } from "../services/devTestAuth.js";
import { listSharesByOwner, listRecentCommentsOnOwnedFiles } from "../services/models/index.js";

const router = express.Router();

const requireAuth = (req, res, next) => {
  const userId = resolveRequestUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.authUserId = userId;
  next();
};

// Outgoing share activity for current user (owner -> recipients)
router.get("/shares/outgoing", requireAuth, async (req, res) => {
  try {
    const rows = await listSharesByOwner(req.authUserId);
    res.json(rows);
  } catch (err) {
    console.error("Outgoing shares error:", err);
    res.status(500).json({ error: "Failed to load outgoing shares" });
  }
});

// Comment notifications for current user's owned files
router.get("/notifications/comments", requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 30)));
    const rows = await listRecentCommentsOnOwnedFiles(req.authUserId, { limit });
    res.json(rows);
  } catch (err) {
    console.error("Comment notifications error:", err);
    res.status(500).json({ error: "Failed to load comment notifications" });
  }
});

export default router;
