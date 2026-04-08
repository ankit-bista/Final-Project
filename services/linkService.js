import { randomBytes } from "crypto";
import { canUserAccessFileHybrid } from "./permissionService.js";
import { getFileById } from "./models/fileModel.js";
import { createFileLink, findLinkWithFileByToken } from "./models/linkModel.js";

/**
 * Create a temporary expiring link for a file.
 * Hybrid access:
 * - primary: smart contract permission check (if configured)
 * - fallback: DB RBAC share (prototype resilience)
 */
export async function createExpiringLinkForFile(ownerId, fileId, expiresInMinutes) {
  // `ownerId` argument is actually the requesterId from the route.
  const requesterId = ownerId;
  // Owners can download. For non-owners, treat download as an "edit" permission:
  // viewer role => view+comment only (no download).
  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found")
    err.code = "NOT_FOUND"
    throw err
  }

  const isOwner = Number(file.user_id) === Number(requesterId)
  const allowed = isOwner ? true : await canUserAccessFileHybrid(requesterId, fileId, "edit")
  if (!allowed) {
    const err = new Error("Access denied")
    err.code = "ACCESS_DENIED"
    throw err
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await createFileLink({ fileId, token, expiresAt });
  return { token, url: `/l/${token}`, expiresAt: expiresAt.toISOString().slice(0, 19).replace("T", " ") };
}

/**
 * Resolve a temporary link token and return the file CID and expiry.
 */
export async function resolveLinkToken(token) {
  return findLinkWithFileByToken(token);
}
