import { getUserRoleAndQuota } from "./userRoleService.js";
import { sumSizeBytesByOwner } from "./models/fileModel.js";

export async function computeUsedBytes(userId) {
  return sumSizeBytesByOwner(userId);
}

export async function getQuotaSnapshot(userId) {
  const user = await getUserRoleAndQuota(userId);
  if (!user) return null;

  const usedBytes = await computeUsedBytes(userId);
  // Keep quota enforced only for explicit uploader role.
  // Commenter/admin can still upload in legacy mode.
  const quotaBytes = user.role === "uploader" ? user.quotaBytes : 0;
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);

  return {
    role: user.role,
    quotaBytes,
    usedBytes,
    remainingBytes,
    canUpload: user.role === "admin" || user.role === "commenter" || (user.role === "uploader" && remainingBytes > 0),
  };
}

export async function assertCanUpload(userId, fileSizeBytes) {
  const snapshot = await getQuotaSnapshot(userId);
  if (!snapshot) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  // Legacy behavior: allow commenter + admin uploads.
  if (snapshot.role === "admin" || snapshot.role === "commenter") return snapshot;
  if (snapshot.role !== "uploader") return snapshot;

  if (snapshot.usedBytes + Number(fileSizeBytes || 0) > snapshot.quotaBytes) {
    const err = new Error("Upload exceeds assigned quota");
    err.code = "QUOTA_EXCEEDED";
    throw err;
  }

  return snapshot;
}

