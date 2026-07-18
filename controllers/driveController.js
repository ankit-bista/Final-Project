import { uploadAndRecordFile, deleteFileForUser, getUserFiles, anchorFileForUser, deleteFolderForUser } from "../services/fileService.js";
import { shareDriveWithUser, shareFileWithUser, getSharedWithUser, createExpiringLinkForFile, resolveLinkToken } from "../services/collaborationService.js";
import { getDb } from "../services/database.js";
import { getUserRoleAndQuota } from "../services/userRoleService.js";
import { assertCanUpload, getQuotaSnapshot } from "../services/quotaService.js";
import { addCommentToFile, listCommentsForFile } from "../services/commentService.js";
import { getFileDownloadContent } from "../services/fileDownloadService.js";
import {
  createDriveActivityLog,
  createFolder,
  findUserById,
  findUserByUsernameOrWallet,
  findShare,
  getFileById,
  listFilesByDrive,
  listFoldersByDriveAndParent,
} from "../services/models/index.js";
import { canUserAccessFileHybrid } from "../services/permissionService.js";
import {
  createCollaborativeDrive,
  ensureDefaultDriveForUser,
  getDriveMembersByUser,
  inviteDriveMember,
  listMyDrives,
  deleteDriveByAdmin,
  removeDriveMemberByAdmin,
  requireDriveRole,
  updateDriveQuotaByAdmin,
  renameDriveForUser,
} from "../services/driveService.js";

function mapFileResponse(f) {
  return {
    id: f.id,
    filename: f.file_name,
    cid: f.ipfs_hash,
    size_bytes: Number(f.size_bytes || 0),
    custom_hash: f.custom_hash || null,
    tx_hash: f.tx_hash || null,
    encryption: f.encryption || null,
    drive_id: f.drive_id ?? null,
    folder_id: f.folder_id ?? null,
    description: f.description || "",
    uploaded_by: f.uploaded_by ?? null,
  };
}

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.authUserId;
    const user = await findUserById(userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    await ensureDefaultDriveForUser(user.id);
    const [roleInfo, quota] = await Promise.all([
      getUserRoleAndQuota(user.id),
      getQuotaSnapshot(user.id),
    ]);
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name || "",
      walletAddress: user.wallet_address,
      role: roleInfo?.role || "commenter",
      quotaBytes: quota?.quotaBytes || 0,
      usedBytes: quota?.usedBytes || 0,
      remainingBytes: quota?.remainingBytes || 0,
    });
  } catch (err) {
    console.error("Error in /me endpoint:", err);
    res.status(500).json({ error: "Failed to get user info" });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const customFilename = req.body.filename || req.file.originalname;
    const description = req.body.description || "";
    await assertCanUpload(req.authUserId, req.file.size || 0);
    const driveId = req.body?.driveId ? Number(req.body.driveId) : null;
    const folderId = req.body?.folderId != null && req.body.folderId !== "" ? Number(req.body.folderId) : null;

    let encryption = null;
    if (req.body?.encryption) {
      try {
        encryption = JSON.parse(req.body.encryption);
      } catch {
        return res.status(400).json({ error: "Invalid encryption metadata" });
      }
    }

    const result = await uploadAndRecordFile(
      req.authUserId,
      req.file,
      customFilename,
      description,
      encryption,
      { driveId, folderId }
    );
    if (driveId) {
      await createDriveActivityLog({
        driveId,
        actorUserId: req.authUserId,
        action: "file_uploaded",
        targetType: "file",
        metadata: { fileName: customFilename, cid: result.cid },
      });
    }
    res.json({ success: true, cid: result.cid, customHash: result.customHash });
  } catch (err) {
    if (err?.code === "QUOTA_EXCEEDED") return res.status(403).json({ error: err.message || "Storage quota exceeded" });
    if (err?.code === "DRIVE_QUOTA_EXCEEDED") return res.status(403).json({ error: err.message || "Drive quota exceeded" });
    if (err?.code === "ROLE_FORBIDDEN") return res.status(403).json({ error: err.message || "Upload access denied" });
    if (err?.code === "ACCESS_DENIED" || err?.code === "NOT_FOUND") {
      const status = err?.code === "NOT_FOUND" ? 404 : 403;
      return res.status(status).json({ error: err.message || "Drive access denied" });
    }
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed: " + (err?.message || "Unknown error") });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    if (!fileId || isNaN(fileId)) return res.status(400).json({ error: "Invalid file ID" });
    await deleteFileForUser(req.authUserId, fileId);
    res.json({ success: true });
  } catch (err) {
    if (err?.code === "NOT_FOUND") return res.status(404).json({ error: err.message || "File not found" });
    if (err?.code === "ACCESS_DENIED") return res.status(403).json({ error: err.message || "Access denied" });
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

export const listFiles = async (req, res) => {
  try {
    const driveId = req.query?.driveId ? Number(req.query.driveId) : null;
    const folderId = req.query?.folderId != null && req.query.folderId !== "" ? Number(req.query.folderId) : null;
    let files;
    if (driveId) {
      await requireDriveRole(driveId, req.authUserId, ["admin", "editor", "viewer"]);
      const rows = await listFilesByDrive(driveId, folderId);
      files = rows.map(mapFileResponse);
    } else {
      files = await getUserFiles(req.authUserId);
    }
    res.json(files);
  } catch (err) {
    console.error("Error loading files:", err);
    res.status(500).json({ error: "Failed to load files" });
  }
};

export const listDrives = async (req, res) => {
  try {
    await ensureDefaultDriveForUser(req.authUserId);
    const drives = await listMyDrives(req.authUserId);
    return res.json(drives);
  } catch (err) {
    console.error("List drives error:", err);
    return res.status(500).json({ error: "Failed to load drives" });
  }
};

export const createDrive = async (req, res) => {
  try {
    const { name, quotaLimitBytes } = req.body || {};
    const drive = await createCollaborativeDrive({
      ownerId: req.authUserId,
      name,
      quotaLimitBytes: Number(quotaLimitBytes || 0),
    });
    return res.json(drive);
  } catch (err) {
    console.error("Create drive error:", err);
    return res.status(500).json({ error: "Failed to create drive" });
  }
};

export const getDriveMembers = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const members = await getDriveMembersByUser(driveId, req.authUserId);
    return res.json(members);
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to load members" });
  }
};

export const inviteMember = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const identifier = String(req.body?.identifier || req.body?.username || "").trim();
    if (!identifier) return res.status(400).json({ error: "identifier required" });
    const target = await findUserByUsernameOrWallet(identifier);
    if (!target) return res.status(404).json({ error: "Target user not found" });
    const member = await inviteDriveMember({
      driveId,
      actorUserId: req.authUserId,
      targetUserId: target.id,
      role: req.body?.role || "viewer",
      quotaTransferBytes: Math.max(0, Number(req.body?.quotaTransferMb || 0)) * 1024 * 1024,
    });
    return res.json({ success: true, member });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" || err?.code === "QUOTA_EXCEEDED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to invite member" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const userId = Number(req.params.userId);
    const ok = await removeDriveMemberByAdmin({
      driveId,
      actorUserId: req.authUserId,
      targetUserId: userId,
    });
    if (!ok) return res.status(404).json({ error: "Member not found" });
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to remove member" });
  }
};

export const updateDriveQuota = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    await updateDriveQuotaByAdmin({
      driveId,
      actorUserId: req.authUserId,
      quotaLimitBytes: Number(req.body?.quotaLimitBytes || 0),
    });
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to update drive quota" });
  }
};

export const deleteDrive = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const ok = await deleteDriveByAdmin({
      driveId,
      actorUserId: req.authUserId,
    });
    if (!ok) return res.status(404).json({ error: "Drive not found" });
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : err?.code === "INVALID" ? 400 : 500;
    return res.status(status).json({ error: err?.message || "Failed to delete drive" });
  }
};

export const createDriveFolder = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    await requireDriveRole(driveId, req.authUserId, ["admin", "editor"]);
    const folder = await createFolder({
      driveId,
      parentFolderId: req.body?.parentFolderId != null ? Number(req.body.parentFolderId) : null,
      name: req.body?.name,
      createdBy: req.authUserId,
    });
    await createDriveActivityLog({
      driveId,
      actorUserId: req.authUserId,
      action: "folder_created",
      targetType: "folder",
      targetId: folder.id,
      metadata: { name: folder.name },
    });
    return res.json(folder);
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to create folder" });
  }
};

export const listDriveFolders = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    await requireDriveRole(driveId, req.authUserId, ["admin", "editor", "viewer"]);
    const parentFolderId = req.query?.parentFolderId != null && req.query.parentFolderId !== ""
      ? Number(req.query.parentFolderId)
      : null;
    const folders = await listFoldersByDriveAndParent(driveId, parentFolderId);
    return res.json(folders);
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to list folders" });
  }
};

export const listDriveFiles = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const folderId = req.query?.folderId != null && req.query.folderId !== "" ? Number(req.query.folderId) : null;
    await requireDriveRole(driveId, req.authUserId, ["admin", "editor", "viewer"]);
    const files = await listFilesByDrive(driveId, folderId);
    return res.json(files.map(mapFileResponse));
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to list files" });
  }
};

export const downloadFileContent = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!Number.isFinite(fileId)) return res.status(400).json({ error: "Invalid file ID" });

    const result = await getFileDownloadContent(req.authUserId, fileId);
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    return result.stream.pipe(res);
  } catch (err) {
    if (err.code === "ACCESS_DENIED") return res.status(403).json({ error: err.message });
    if (err.code === "NOT_FOUND") return res.status(404).json({ error: err.message });
    if (err.code === "IPFS_FETCH_FAILED") return res.status(502).json({ error: err.message });
    console.error("Download fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch file content" });
  }
};

export const getFileCrypto = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!Number.isFinite(fileId)) return res.status(400).json({ error: "Invalid file ID" });
    const file = await getFileById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });
    const canView = await canUserAccessFileHybrid(req.authUserId, fileId, "view");
    if (!canView) return res.status(403).json({ error: "Access denied" });

    const requesterId = Number(req.authUserId);
    const ownerId = Number(file.user_id);
    const isOwner = requesterId === ownerId;

    let encryptedKey = file?.encryption?.ownerEncryptedKey || null;
    if (!isOwner) {
      const share = await findShare(fileId, requesterId);
      encryptedKey = share?.encrypted_key || null;
    }
    if (file?.encryption && !encryptedKey) {
      return res.status(403).json({ error: "No encrypted key available for this user" });
    }

    return res.json({
      isEncrypted: Boolean(file?.encryption),
      algorithm: file?.encryption?.algorithm || null,
      iv: file?.encryption?.iv || null,
      encryptedKey,
      cid: file?.ipfs_hash || null,
      originalName: file?.encryption?.originalName || file.file_name,
      originalMimeType: file?.encryption?.originalMimeType || "application/octet-stream",
    });
  } catch (err) {
    console.error("Crypto metadata error:", err);
    return res.status(500).json({ error: "Failed to fetch crypto metadata" });
  }
};

export const getFileComments = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!Number.isFinite(fileId)) return res.status(400).json({ error: "Invalid file ID" });
    const rows = await listCommentsForFile(req.authUserId, fileId);
    res.json(rows);
  } catch (err) {
    if (err.code === "ACCESS_DENIED") return res.status(403).json({ error: err.message });
    console.error("List comments error:", err);
    res.status(500).json({ error: "Failed to load comments" });
  }
};

export const addFileComment = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!Number.isFinite(fileId)) return res.status(400).json({ error: "Invalid file ID" });
    await addCommentToFile(req.authUserId, fileId, req.body?.text);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ACCESS_DENIED") return res.status(403).json({ error: err.message });
    if (err.code === "INVALID") return res.status(400).json({ error: err.message });
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
};

export const anchorFile = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!Number.isFinite(fileId)) return res.status(400).json({ error: "Invalid file ID" });
    const result = await anchorFileForUser(req.authUserId, fileId);
    res.json({ success: true, txHash: result.txHash });
  } catch (err) {
    if (err.code === "NOT_FOUND") return res.status(404).json({ error: err.message });
    console.error("Anchor failed:", err);
    res.status(500).json({ error: "Failed to anchor file on blockchain" });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const files = await getSharedWithUser(req.authUserId);
    res.json(files);
  } catch (err) {
    console.error("Error loading shared files:", err);
    res.status(500).json({ error: "Failed to load shared files" });
  }
};

export const shareFile = async (req, res) => {
  try {
    const ownerId = req.authUserId;
    const fileId = req.params.id;
    const { username, role, encryptedKey, expiresInHours } = req.body;

    if (!fileId || isNaN(fileId)) return res.status(400).send("Invalid file ID");
    if (!username || !username.trim()) return res.status(400).send("Username required");
    if (!role || (role !== "viewer" && role !== "editor")) return res.status(400).send('Role must be "viewer" or "editor"');

    const result = await shareFileWithUser(ownerId, fileId, username.trim(), role, encryptedKey || null, expiresInHours || null);
    res.json({ success: true, expiresAt: result?.expiresAt || null });
  } catch (err) {
    if (err.code === "NOT_FOUND" || err.code === "USER_NOT_FOUND") return res.status(404).send(err.message);
    if (err.code === "INVALID") return res.status(400).send(err.message);
    if (err.code === "CONTRACT_DENIED") return res.status(403).send(err.message);
    console.error("Share error:", err);
    res.status(500).send("Error sharing file");
  }
};

export const shareDrive = async (req, res) => {
  try {
    const ownerId = req.authUserId;
    const { username, role, keyShares, expiresInHours } = req.body;

    if (!username || !username.trim()) return res.status(400).send("Username required");
    if (!role || (role !== "viewer" && role !== "editor")) return res.status(400).send('Role must be "viewer" or "editor"');

    await shareDriveWithUser(ownerId, username.trim(), role, keyShares || {}, expiresInHours || null);
    res.sendStatus(200);
  } catch (err) {
    if (err.code === "USER_NOT_FOUND") return res.status(404).send(err.message);
    if (err.code === "INVALID") return res.status(400).send(err.message);
    if (err.code === "CONTRACT_DENIED") return res.status(403).send(err.message);
    console.error("Drive share error:", err);
    res.status(500).send("Error sharing drive");
  }
};

export const getShareTarget = async (req, res) => {
  try {
    const identifier = String(req.query?.identifier || "").trim();
    if (!identifier) return res.status(400).json({ error: "identifier required" });
    const target = await findUserByUsernameOrWallet(identifier);
    if (!target) return res.status(404).json({ error: "Target user not found" });
    return res.json({
      id: target.id,
      walletAddress: target.wallet_address,
      encryptionPublicKey: target.encryption_public_key || null,
      username: target.username || null,
    });
  } catch (err) {
    console.error("Share target lookup error:", err);
    return res.status(500).json({ error: "Failed to resolve share target" });
  }
};

export const createExpiringLink = async (req, res) => {
  try {
    const requesterId = req.authUserId;
    const fileId = req.params.id;
    const expiresInMinutes = Number(req.body.expiresInMinutes) || 60;

    if (!fileId || isNaN(fileId)) return res.status(400).send("Invalid file ID");
    if (!Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0) return res.status(400).send("Expiry time must be a positive number");

    const link = await createExpiringLinkForFile(requesterId, fileId, expiresInMinutes);
    res.json({ url: link.url, expiresAt: link.expiresAt });
  } catch (err) {
    if (err.code === "NOT_FOUND") return res.status(404).send(err.message);
    if (err.code === "ACCESS_DENIED") return res.status(403).send(err.message);
    console.error("Link creation error:", err);
    res.status(500).send("Error creating link");
  }
};

export const resolveExpiringLink = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length === 0) return res.status(400).send("Invalid token");

    const link = await resolveLinkToken(token);
    if (!link) return res.status(404).send("Link not found");
    if (link.expiresAt.getTime() < Date.now()) return res.status(410).send("Link expired");

    const gatewayUrl = process.env.IPFS_GATEWAY_URL || "http://localhost:8080";
    res.redirect(`${gatewayUrl}/ipfs/${link.cid}`);
  } catch (err) {
    console.error("Link resolution error:", err);
    res.status(500).send("Error resolving link");
  }
};

export const getUserItems = async (req, res) => {
  try {
    const files = await getUserFiles(req.authUserId);
    const db = await getDb();
    const folders = await db.collection("folders")
      .find({ created_by: Number(req.authUserId) })
      .sort({ created_at: -1 })
      .toArray();

    const items = [
      ...folders.map((f) => ({
        id: f.id,
        name: f.name,
        type: "folder",
        size: null,
        dateAdded: f.created_at,
      })),
      ...files.map((f) => ({
        id: f.id,
        name: f.file_name || f.filename,
        type: "file",
        size: f.size_bytes,
        dateAdded: f.created_at,
      })),
    ];

    items.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    return res.json(items);
  } catch (err) {
    console.error("Failed to load user items:", err);
    return res.status(500).json({ error: "Failed to load files and folders" });
  }
};

export const deleteApiFile = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    await deleteFileForUser(req.authUserId, fileId);
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to delete file" });
  }
};

export const deleteApiFolder = async (req, res) => {
  try {
    const folderId = Number(req.params.id);
    await deleteFolderForUser(req.authUserId, folderId);
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to delete folder" });
  }
};

export const renameDrive = async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Drive name is required" });

    await renameDriveForUser({
      driveId,
      actorUserId: req.authUserId,
      name: name.trim(),
    });

    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : 500;
    return res.status(status).json({ error: err?.message || "Failed to rename drive" });
  }
};

export const deleteApiDrive = async (req, res) => {
  try {
    const driveId = Number(req.params.id);
    const ok = await deleteDriveByAdmin({
      driveId,
      actorUserId: req.authUserId,
    });
    if (!ok) return res.status(404).json({ error: "Drive not found" });
    return res.json({ success: true });
  } catch (err) {
    const status = err?.code === "NOT_FOUND" ? 404 : err?.code === "ACCESS_DENIED" ? 403 : err?.code === "INVALID" ? 400 : 500;
    return res.status(status).json({ error: err?.message || "Failed to delete drive" });
  }
};
