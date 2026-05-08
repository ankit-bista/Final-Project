import { getUserRoleAndQuota, assignRoleAndQuota, hasPermission, PERMISSIONS } from "./userRoleService.js";
import { sumSizeBytesByOwner } from "./models/index.js";

export async function computeUsedBytes(userId) {
  return sumSizeBytesByOwner(userId);
}

export async function getQuotaSnapshot(userId) {
  const user = await getUserRoleAndQuota(userId);
  if (!user) return null;

  const usedBytes = await computeUsedBytes(userId);
  const bypassesQuota = hasPermission(user.role, PERMISSIONS.BYPASS_QUOTA);
  const canUploadGlobal = hasPermission(user.role, PERMISSIONS.UPLOAD_FILES);

  // If they can bypass quota, give them functionally infinite space for UI purposes
  const quotaBytes = bypassesQuota ? Number.MAX_SAFE_INTEGER : Number(user.quotaBytes || 0);
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);

  return {
    role: user.role,
    quotaBytes,
    usedBytes,
    remainingBytes,
    canUpload: canUploadGlobal && (bypassesQuota || remainingBytes > 0)
  };
}

export async function assertCanUpload(userId, fileSizeBytes) {
  const snapshot = await getQuotaSnapshot(userId);
  if (!snapshot) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  if (!snapshot.canUpload) {
    const err = new Error("User role is not authorized to upload files.");
    err.code = "UNAUTHORIZED_ROLE";
    throw err;
  }

  const bypassesQuota = hasPermission(snapshot.role, PERMISSIONS.BYPASS_QUOTA);
  
  if (!bypassesQuota && (snapshot.usedBytes + Number(fileSizeBytes || 0) > snapshot.quotaBytes)) {
    const err = new Error("Upload exceeds assigned quota");
    err.code = "QUOTA_EXCEEDED";
    throw err;
  }

  return snapshot;
}

export async function transferQuota(fromUserId, toUserId, amountBytes) {
  const sender = await getQuotaSnapshot(fromUserId);
  const receiver = await getQuotaSnapshot(toUserId);

  if (!sender || !receiver) {
    const err = new Error("Sender or receiver not found for quota transfer");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  if (sender.remainingBytes < amountBytes) {
    const err = new Error("Insufficient remaining quota to share with user");
    err.code = "QUOTA_EXCEEDED";
    throw err;
  }

  // Deduct from sender
  await assignRoleAndQuota(fromUserId, sender.role, sender.quotaBytes - amountBytes);
  // Add to receiver
  await assignRoleAndQuota(toUserId, receiver.role, receiver.quotaBytes + amountBytes);
}

