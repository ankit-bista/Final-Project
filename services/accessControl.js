import { getFileById, findShare, getDriveMember } from "./models/index.js";

/**
 * DB-backed RBAC for file access.
 *
 * Current schema notes:
 * - `file_shares` has role = 'viewer' | 'editor' and no expiry timestamp.
 * - So this algorithm treats a share row as active until revoked/deleted.
 */
export async function canUserAccessFileDb(userId, fileId, action) {
  // action: 'view' | 'edit'
  const file = await getFileById(fileId);
  if (!file) return false;
  const ownerId = Number(file.user_id);
  if (ownerId === userId) return true;

  // Drive membership RBAC (collaborative drives).
  if (file?.drive_id != null) {
    const member = await getDriveMember(file.drive_id, userId);
    const role = member?.role || null;
    if (role === "admin") return true;
    if (action === "view") return role === "viewer" || role === "editor";
    return role === "editor";
  }

  const required = action === "edit" ? "editor" : "viewer";

  const share = await findShare(fileId, userId);
  if (!share) return false;
  const role = share.role;

  // viewer can view, editor can view + edit; edit requires editor role.
  if (required === "viewer") return role === "viewer" || role === "editor";
  return role === "editor";
}

