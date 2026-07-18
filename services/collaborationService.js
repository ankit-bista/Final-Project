// ============================================================
// services/collaborationService.js
// Combines: shareService.js + linkService.js
// Handles all file sharing (user-to-user) and temporary link logic.
// ============================================================

import { randomBytes } from "crypto";
import { blockchainService } from "./blockchain.js";
import { canUserAccessFileHybrid } from "./permissionService.js";
import { transferQuota } from "./quotaService.js";
import {
  getFileById,
  getFileByIdAndOwner,
  listFilesByOwner,
  listSharedWithUser,
  upsertShare,
  createFileLink,
  findLinkWithFileByToken,
  findUserByUsernameOrWallet,
  getDriveMember,
} from "./models/index.js";

// ─────────────────────────────────────────
// SHARING (from shareService.js)
// ─────────────────────────────────────────

/**
 * Share a file with another user by username or wallet address.
 */
export async function shareFileWithUser(ownerId, fileId, username, role, encryptedKey = null, expiresInHours = null) {
  const normalizedRole = role === "editor" ? "editor" : "viewer";
  const enforceContractSharing = process.env.ENFORCE_CONTRACT_SHARING === "true";
  const targetKey = username.trim();
  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const isLegacyOwner = Number(file.user_id) === Number(ownerId);
  if (!isLegacyOwner && file?.drive_id != null) {
    const member = await getDriveMember(file.drive_id, ownerId);
    const roleOnDrive = member?.role || null;
    const isUploader = Number(file.uploaded_by || file.user_id) === Number(ownerId);
    const canShare = roleOnDrive === "admin" || (roleOnDrive === "editor" && isUploader);
    if (!canShare) {
      const err = new Error("You are not allowed to share this file");
      err.code = "ACCESS_DENIED";
      throw err;
    }
  } else if (!isLegacyOwner) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const targetUser = await findUserByUsernameOrWallet(targetKey);
  if (!targetUser) {
    const err = new Error("Target user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const granteeId = targetUser.id;
  const granteeWallet = targetUser.wallet_address;

  if (granteeId === ownerId) {
    const err = new Error("Cannot share with yourself");
    err.code = "INVALID";
    throw err;
  }

  const fileCid = file.ipfs_hash || fileId.toString();

  // Compute expiry timestamp
  const expiresAt =
    Number.isFinite(Number(expiresInHours)) && Number(expiresInHours) > 0
      ? new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000)
      : null;

  // Hybrid best practice: if enabled, only grant DB access when the contract call succeeds.
  if (enforceContractSharing && granteeWallet) {
    try {
      await blockchainService.shareFile(fileCid.toString(), granteeWallet, normalizedRole, 0);
    } catch (e) {
      const err = new Error("Smart contract denied share");
      err.code = "CONTRACT_DENIED";
      throw err;
    }
  }

  await upsertShare({
    fileId: Number(fileId),
    ownerId: Number(file.user_id || ownerId),
    granteeId: Number(granteeId),
    role: normalizedRole,
    encryptedKey,
    expiresAt,
  });

  // Transfer 10MB quota from sharer to grantee (quota assignment feature)
  try {
    const TRANSFER_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB
    await transferQuota(ownerId, granteeId, TRANSFER_LIMIT_BYTES);
  } catch (err) {
    console.warn("Storage quota transfer failed during share:", err.message);
    throw err; 
  }

  // Store encrypted AES key on-chain for auditability/ownership-access proof.
  let encryptedKeyTxHash = null;
  if (encryptedKey && granteeWallet) {
    encryptedKeyTxHash = await blockchainService.storeEncryptedKey(
      fileCid.toString(),
      granteeWallet,
      encryptedKey
    );
  }

  // Log to smart contract (best-effort for prototype).
  if (granteeWallet && !enforceContractSharing) {
    try {
      await blockchainService.shareFile(fileCid.toString(), granteeWallet, normalizedRole, 0);
    } catch (e) {
      console.warn("Blockchain share logging failed; DB share still applied.", e?.message || e);
    }
  }

  return { encryptedKeyTxHash, expiresAt };
}

/**
 * Share all files in the owner's drive with another user.
 */
export async function shareDriveWithUser(ownerId, username, role, keyShares = {}, expiresInHours = null) {
  const normalizedRole = role === "editor" ? "editor" : "viewer";

  const targetUser = await findUserByUsernameOrWallet(username.trim());
  if (!targetUser) {
    const err = new Error("Target user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const granteeId = targetUser.id;
  if (granteeId === ownerId) {
    const err = new Error("Cannot share with yourself");
    err.code = "INVALID";
    throw err;
  }

  const ownedFiles = await listFilesByOwner(ownerId);
  if (ownedFiles.length === 0) return;

  for (const f of ownedFiles) {
    const encryptedKey = keyShares?.[String(f.id)] || null;
    await shareFileWithUser(ownerId, f.id, username, normalizedRole, encryptedKey, expiresInHours);
  }
}

/**
 * Get all files that have been shared with a user.
 */
export async function getSharedWithUser(userId) {
  return listSharedWithUser(userId);
}

// ─────────────────────────────────────────
// LINKS (from linkService.js)
// ─────────────────────────────────────────

/**
 * Create a temporary expiring link for a file.
 */
export async function createExpiringLinkForFile(ownerId, fileId, expiresInMinutes) {
  const requesterId = ownerId;
  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const isOwner = Number(file.user_id) === Number(requesterId);
  const allowed = isOwner ? true : await canUserAccessFileHybrid(requesterId, fileId, "edit");
  if (!allowed) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await createFileLink({ fileId, token, expiresAt });
  return {
    token,
    url: `/l/${token}`,
    expiresAt: expiresAt.toISOString().slice(0, 19).replace("T", " "),
  };
}

/**
 * Resolve a temporary link token and return the file CID and expiry.
 */
export async function resolveLinkToken(token) {
  return findLinkWithFileByToken(token);
}
