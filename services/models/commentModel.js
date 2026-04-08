import { getDb, nextSequence } from "./mongoClient.js";

export async function createComment({ fileId, userId, text }) {
  const db = await getDb();
  const id = await nextSequence("file_comments");
  await db.collection("file_comments").insertOne({
    id,
    file_id: Number(fileId),
    user_id: Number(userId),
    comment_text: text,
    created_at: new Date(),
  });
  return { id };
}

export async function listCommentsByFile(fileId) {
  const db = await getDb();
  const comments = await db
    .collection("file_comments")
    .find({ file_id: Number(fileId) })
    .sort({ created_at: -1 })
    .toArray();

  const userIds = [...new Set(comments.map((c) => Number(c.user_id)))];
  const users = userIds.length
    ? await db.collection("users").find({ id: { $in: userIds } }).toArray()
    : [];
  const userMap = new Map(users.map((u) => [Number(u.id), u.username]));

  return comments.map((c) => ({
    id: c.id,
    file_id: c.file_id,
    user_id: c.user_id,
    comment_text: c.comment_text,
    created_at: c.created_at,
    username: userMap.get(Number(c.user_id)) || null,
  }));
}

export async function listRecentCommentsOnOwnedFiles(ownerId, options = {}) {
  const db = await getDb();
  const limit = Number(options.limit || 30);

  const files = await db
    .collection("files")
    .find({ user_id: Number(ownerId) }, { projection: { id: 1, file_name: 1, encryption: 1 } })
    .toArray();

  if (!files.length) return [];
  const fileIds = files.map((f) => Number(f.id));
  const fileMap = new Map(
    files.map((f) => [Number(f.id), f?.encryption?.originalName || f.file_name || "File"])
  );

  const comments = await db
    .collection("file_comments")
    .find({ file_id: { $in: fileIds }, user_id: { $ne: Number(ownerId) } })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  if (!comments.length) return [];
  const userIds = [...new Set(comments.map((c) => Number(c.user_id)))];
  const users = await db.collection("users").find({ id: { $in: userIds } }).toArray();
  const userMap = new Map(users.map((u) => [Number(u.id), u.username || "Unknown"]));

  return comments.map((c) => ({
    commentId: c.id,
    fileId: c.file_id,
    fileName: fileMap.get(Number(c.file_id)) || "File",
    commenterUserId: c.user_id,
    commenterUsername: userMap.get(Number(c.user_id)) || "Unknown",
    text: c.comment_text,
    createdAt: c.created_at,
  }));
}
