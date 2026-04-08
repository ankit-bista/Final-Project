import { canUserAccessFileHybrid } from "./permissionService.js";
import { createComment, listCommentsByFile } from "./models/commentModel.js";

export async function ensureCommentsSchema() {
  // No-op on MongoDB; kept for boot compatibility.
}

export async function listCommentsForFile(requesterId, fileId) {
  const canView = await canUserAccessFileHybrid(requesterId, fileId, "view");
  if (!canView) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  return listCommentsByFile(fileId);
}

export async function addCommentToFile(requesterId, fileId, text) {
  const clean = typeof text === "string" ? text.trim() : "";
  if (!clean) {
    const err = new Error("Comment text required");
    err.code = "INVALID";
    throw err;
  }
  const canView = await canUserAccessFileHybrid(requesterId, fileId, "view");
  if (!canView) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  await createComment({ fileId, userId: requesterId, text: clean });
}

