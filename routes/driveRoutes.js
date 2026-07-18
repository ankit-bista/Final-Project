import express from "express";
import multer from "multer";
import { resolveRequestUserId } from "../services/devTestAuth.js";
import * as driveController from "../controllers/driveController.js";

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  const userId = resolveRequestUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.authUserId = userId;
  next();
};

// User / Auth
router.get("/me", requireAuth, driveController.getCurrentUser);
router.get("/api/user/items", requireAuth, driveController.getUserItems);

// Upload / Delete
router.post("/upload", requireAuth, upload.single("file"), driveController.uploadFile);
router.post("/delete/:id", requireAuth, driveController.deleteFile);
router.delete("/api/files/:id", requireAuth, driveController.deleteApiFile);
router.delete("/api/folders/:id", requireAuth, driveController.deleteApiFolder);

// List Files & Drives
router.get("/files", requireAuth, driveController.listFiles);
router.get("/api/drives/me", requireAuth, driveController.listDrives);

// Drive Management
router.post("/api/drives", requireAuth, driveController.createDrive);
router.patch("/api/drives/:id", requireAuth, driveController.renameDrive);
router.delete("/api/drives/:id", requireAuth, driveController.deleteApiDrive);
router.delete("/api/drives/:driveId", requireAuth, driveController.deleteDrive);

// Drive Members & Quota
router.get("/api/drives/:driveId/members", requireAuth, driveController.getDriveMembers);
router.post("/api/drives/:driveId/invite", requireAuth, driveController.inviteMember);
router.delete("/api/drives/:driveId/members/:userId", requireAuth, driveController.removeMember);
router.post("/api/drives/:driveId/quota", requireAuth, driveController.updateDriveQuota);

// Drive Folders & Files
router.post("/api/drives/:driveId/folders", requireAuth, driveController.createDriveFolder);
router.get("/api/drives/:driveId/folders", requireAuth, driveController.listDriveFolders);
router.get("/api/drives/:driveId/files", requireAuth, driveController.listDriveFiles);

// File Operations
router.get("/files/:id/content", requireAuth, driveController.downloadFileContent);
router.get("/files/:id/crypto", requireAuth, driveController.getFileCrypto);
router.post("/files/:id/anchor", requireAuth, driveController.anchorFile);

// File Comments
router.get("/files/:id/comments", requireAuth, driveController.getFileComments);
router.post("/files/:id/comments", requireAuth, driveController.addFileComment);

// Sharing & Collaboration
router.get("/shared-with-me", requireAuth, driveController.getSharedFiles);
router.post("/share/:id", requireAuth, driveController.shareFile);
router.post("/drive/share", requireAuth, driveController.shareDrive);
router.get("/share-target", requireAuth, driveController.getShareTarget);

// Links
router.post("/files/:id/link", requireAuth, driveController.createExpiringLink);
router.get("/l/:token", driveController.resolveExpiringLink);

export default router;
