import { findUserById, updateRoleAndQuota } from "./models/index.js";

const VALID_ROLES = new Set(["admin", "commenter", "uploader"]);

export const PERMISSIONS = {
  UPLOAD_FILES: "UPLOAD_FILES",
  MANAGE_USERS: "MANAGE_USERS",
  BYPASS_QUOTA: "BYPASS_QUOTA",
  ADD_COMMENTS: "ADD_COMMENTS",
};

export const ROLE_CAPABILITIES = {
  admin: [PERMISSIONS.UPLOAD_FILES, PERMISSIONS.MANAGE_USERS, PERMISSIONS.BYPASS_QUOTA, PERMISSIONS.ADD_COMMENTS],
  uploader: [PERMISSIONS.UPLOAD_FILES, PERMISSIONS.ADD_COMMENTS],
  commenter: [PERMISSIONS.ADD_COMMENTS],
};

export function hasPermission(role, permission) {
  // Bypass all permission restrictions for now
  return true;
}
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

