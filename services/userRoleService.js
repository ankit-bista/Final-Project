import { findUserById, updateRoleAndQuota } from "./models/userModel.js";

const VALID_ROLES = new Set(["admin", "commenter", "uploader"]);

export async function ensureUserRoleSchema() {
  // No-op on MongoDB; kept for boot compatibility.
}

export function normalizeRole(role) {
  if (!role || typeof role !== "string") return "commenter";
  const value = role.trim().toLowerCase();
  return VALID_ROLES.has(value) ? value : "commenter";
}

export async function getUserRoleAndQuota(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    userId: user.id,
    role: normalizeRole(user.role),
    quotaBytes: Number(user.quota_bytes || 0),
  };
}

export async function isAdmin(userId) {
  const user = await getUserRoleAndQuota(userId);
  return user?.role === "admin";
}

export async function assignRoleAndQuota(targetUserId, role, quotaBytes) {
  const normalizedRole = normalizeRole(role);
  const safeQuota = Number.isFinite(Number(quotaBytes)) ? Math.max(0, Math.floor(Number(quotaBytes))) : 0;
  await updateRoleAndQuota(targetUserId, normalizedRole, safeQuota);
  return getUserRoleAndQuota(targetUserId);
}

