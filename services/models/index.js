// ============================================================
// services/models/index.js
// Combines: fileModel, userModel, shareModel, commentModel, linkModel
// All MongoDB data-access functions in one place.
// ============================================================

import { getDb, nextSequence } from "../database.js";

// ─────────────────────────────────────────
// FILE MODEL
// ─────────────────────────────────────────

export async function createFile({
  userId,
  ipfsHash,
  fileName,
  sizeBytes = 0,
  customHash = null,
  txHash = null,
  encryption = null,
  driveId = null,
  folderId = null,
  uploadedBy = null,
  description = "",
}) {
  const db = await getDb();
  const id = await nextSequence("files");
  await db.collection("files").insertOne({
    id,
    user_id: Number(userId),
    ipfs_hash: ipfsHash,
    file_name: fileName,
    size_bytes: Number(sizeBytes || 0),
    custom_hash: customHash,
    tx_hash: txHash,
    encryption,
    drive_id: driveId != null ? Number(driveId) : null,
    folder_id: folderId != null ? Number(folderId) : null,
    uploaded_by: uploadedBy != null ? Number(uploadedBy) : Number(userId),
    description: String(description || ""),
    created_at: new Date(),
  });
  return { id };
}

export async function getFileById(fileId) {
  const db = await getDb();
  return db.collection("files").findOne({ id: Number(fileId) });
}

export async function getFileByIdAndOwner(fileId, ownerId) {
  const db = await getDb();
  return db.collection("files").findOne({ id: Number(fileId), user_id: Number(ownerId) });
}

export async function listFilesByOwner(ownerId) {
  const db = await getDb();
  return db.collection("files").find({ user_id: Number(ownerId) }).sort({ id: -1 }).toArray();
}

export async function listFilesByDrive(driveId, folderId = null) {
  const db = await getDb();
  const query = { drive_id: Number(driveId) };
  if (folderId == null) query.folder_id = null;
  else query.folder_id = Number(folderId);
  return db.collection("files").find(query).sort({ id: -1 }).toArray();
}

export async function assignLegacyFilesToDrive(ownerId, driveId) {
  const db = await getDb();
  await db.collection("files").updateMany(
    {
      user_id: Number(ownerId),
      $or: [{ drive_id: { $exists: false } }, { drive_id: null }],
    },
    {
      $set: {
        drive_id: Number(driveId),
        folder_id: null,
        uploaded_by: Number(ownerId),
      },
    }
  );
}

export async function deleteFileByIdAndOwner(fileId, ownerId) {
  const db = await getDb();
  const res = await db.collection("files").deleteOne({ id: Number(fileId), user_id: Number(ownerId) });
  return res.deletedCount > 0;
}

export async function updateFileTxHash(fileId, ownerId, txHash) {
  const db = await getDb();
  const ownerQuery = ownerId == null ? {} : { user_id: Number(ownerId) };
  await db.collection("files").updateOne(
    { id: Number(fileId), ...ownerQuery },
    { $set: { tx_hash: txHash } }
  );
}

export async function sumSizeBytesByOwner(ownerId) {
  const db = await getDb();
  const agg = await db
    .collection("files")
    .aggregate([
      { $match: { user_id: Number(ownerId) } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$size_bytes", 0] } } } },
    ])
    .toArray();
  return Number(agg[0]?.total || 0);
}

export async function sumSizeBytesByDrive(driveId) {
  const db = await getDb();
  const agg = await db
    .collection("files")
    .aggregate([
      { $match: { drive_id: Number(driveId) } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$size_bytes", 0] } } } },
    ])
    .toArray();
  return Number(agg[0]?.total || 0);
}

// ─────────────────────────────────────────
// USER MODEL
// ─────────────────────────────────────────

export async function findUserByWallet(walletAddress) {
  const db = await getDb();
  return db.collection("users").findOne({ wallet_address: String(walletAddress || "").toLowerCase() });
}

export async function createUserWithNonce(walletAddress, nonce) {
  const db = await getDb();
  const id = await nextSequence("users");
  const doc = {
    id,
    wallet_address: String(walletAddress || "").toLowerCase(),
    nonce: nonce ?? null,
    username: null,
    role: "commenter",
    quota_bytes: 0,
    created_at: new Date(),
  };
  await db.collection("users").insertOne(doc);
  return doc;
}

export async function updateUserNonceByWallet(walletAddress, nonce) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { wallet_address: String(walletAddress || "").toLowerCase() },
    { $set: { nonce: nonce ?? null } }
  );
}

export async function updateUserNonceById(userId, nonce = null) {
  const db = await getDb();
  await db.collection("users").updateOne({ id: Number(userId) }, { $set: { nonce } });
}

export async function findUserByUsername(username) {
  const db = await getDb();
  return db.collection("users").findOne({ username: String(username || "") });
}

export async function updateUsername(userId, username) {
  const db = await getDb();
  await db.collection("users").updateOne({ id: Number(userId) }, { $set: { username } });
}

export async function findUserById(userId) {
  const db = await getDb();
  return db.collection("users").findOne({ id: Number(userId) });
}

export async function setAdminRole(userId) {
  const db = await getDb();
  await db.collection("users").updateOne({ id: Number(userId) }, { $set: { role: "admin", quota_bytes: 0 } });
}

export async function listUsersForAdmin() {
  const db = await getDb();
  return db
    .collection("users")
    .find(
      {},
      { projection: { _id: 0, id: 1, username: 1, wallet_address: 1, role: 1, quota_bytes: 1, created_at: 1 } }
    )
    .toArray();
}

export async function deleteUserById(userId) {
  const db = await getDb();
  const res = await db.collection("users").deleteOne({ id: Number(userId) });
  return res.deletedCount > 0;
}

export async function findUserByUsernameOrWallet(target) {
  const db = await getDb();
  const key = String(target || "").trim();
  const maybeWallet = key.startsWith("0x") ? key.toLowerCase() : key;
  return db.collection("users").findOne({
    $or: [{ username: key }, { wallet_address: maybeWallet }],
  });
}

export async function updateRoleAndQuota(userId, role, quotaBytes) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { id: Number(userId) },
    { $set: { role: String(role), quota_bytes: Number(quotaBytes || 0) } }
  );
}

export async function updateEncryptionPublicKey(userId, encryptionPublicKey) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { id: Number(userId) },
    { $set: { encryption_public_key: encryptionPublicKey || null } }
  );
}

// ─────────────────────────────────────────
// SHARE MODEL
// ─────────────────────────────────────────

export async function findShare(fileId, granteeId) {
  const db = await getDb();
  return db.collection("file_shares").findOne({
    file_id: Number(fileId),
    grantee_id: Number(granteeId),
  });
}

export async function upsertShare({ fileId, ownerId, granteeId, role, encryptedKey = null }) {
  const db = await getDb();
  const existing = await findShare(fileId, granteeId);
  if (existing) {
    await db.collection("file_shares").updateOne(
      { id: existing.id },
      { $set: { role, encrypted_key: encryptedKey ?? existing.encrypted_key ?? null } }
    );
    return { id: existing.id };
  }
  const id = await nextSequence("file_shares");
  await db.collection("file_shares").insertOne({
    id,
    file_id: Number(fileId),
    owner_id: Number(ownerId),
    grantee_id: Number(granteeId),
    role,
    encrypted_key: encryptedKey,
    created_at: new Date(),
  });
  return { id };
}

export async function deleteSharesByFileId(fileId) {
  const db = await getDb();
  await db.collection("file_shares").deleteMany({ file_id: Number(fileId) });
}

export async function listSharedWithUser(granteeId) {
  const db = await getDb();
  const shares = await db.collection("file_shares").find({ grantee_id: Number(granteeId) }).sort({ file_id: -1 }).toArray();
  if (!shares.length) return [];

  const fileIds = [...new Set(shares.map((s) => Number(s.file_id)))];
  const ownerIds = [...new Set(shares.map((s) => Number(s.owner_id)))];

  const [files, owners] = await Promise.all([
    db.collection("files").find({ id: { $in: fileIds } }).toArray(),
    db.collection("users").find({ id: { $in: ownerIds } }).toArray(),
  ]);

  const fileMap = new Map(files.map((f) => [Number(f.id), f]));
  const ownerMap = new Map(owners.map((u) => [Number(u.id), u]));

  return shares
    .map((s) => {
      const file = fileMap.get(Number(s.file_id));
      const owner = ownerMap.get(Number(s.owner_id));
      if (!file || !owner) return null;
      return {
        id: file.id,
        filename: file.file_name,
        cid: file.ipfs_hash,
        size_bytes: Number(file.size_bytes || 0),
        owner_name: owner.username,
        share_name: `${owner.username || "User"} shares`,
        role: s.role,
        tx_hash: file.tx_hash || null,
        drive_id: file.drive_id ?? null,
        folder_id: file.folder_id ?? null,
      };
    })
    .filter(Boolean);
}

export async function listSharesByOwner(ownerId) {
  const db = await getDb();
  const shares = await db.collection("file_shares").find({ owner_id: Number(ownerId) }).sort({ created_at: -1 }).toArray();
  if (!shares.length) return [];

  const fileIds = [...new Set(shares.map((s) => Number(s.file_id)))];
  const granteeIds = [...new Set(shares.map((s) => Number(s.grantee_id)))];

  const [files, users] = await Promise.all([
    db.collection("files").find({ id: { $in: fileIds } }).toArray(),
    db.collection("users").find({ id: { $in: granteeIds } }).toArray(),
  ]);

  const fileMap = new Map(files.map((f) => [Number(f.id), f]));
  const userMap = new Map(users.map((u) => [Number(u.id), u]));

  return shares
    .map((s) => {
      const file = fileMap.get(Number(s.file_id));
      const user = userMap.get(Number(s.grantee_id));
      if (!file || !user) return null;
      return {
        shareId: s.id,
        fileId: file.id,
        fileName: file?.encryption?.originalName || file.file_name,
        recipientUserId: user.id,
        recipientUsername: user.username || "Unknown",
        recipientWallet: user.wallet_address || null,
        role: s.role,
        createdAt: s.created_at || null,
      };
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────
// COMMENT MODEL
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// LINK MODEL
// ─────────────────────────────────────────

export async function createFileLink({ fileId, token, expiresAt }) {
  const db = await getDb();
  const id = await nextSequence("file_links");
  await db.collection("file_links").insertOne({
    id,
    file_id: Number(fileId),
    token,
    expires_at: new Date(expiresAt),
    created_at: new Date(),
  });
  return { id };
}

export async function findLinkWithFileByToken(token) {
  const db = await getDb();
  const link = await db.collection("file_links").findOne({ token: String(token) });
  if (!link) return null;
  const file = await db.collection("files").findOne({ id: Number(link.file_id) });
  if (!file) return null;
  return {
    cid: file.ipfs_hash,
    expiresAt: new Date(link.expires_at),
  };
}

// ─────────────────────────────────────────
// DRIVE MODEL
// ─────────────────────────────────────────

export async function createDrive({
  name,
  ownerId,
  personal = false,
  quotaLimitBytes = 0,
}) {
  const db = await getDb();
  const id = await nextSequence("drives");
  const now = new Date();
  const doc = {
    id,
    name: String(name || "Untitled Drive"),
    owner_id: Number(ownerId),
    personal: Boolean(personal),
    quota_limit_bytes: Number(quotaLimitBytes || 0),
    quota_used_bytes: 0,
    created_at: now,
    updated_at: now,
  };
  await db.collection("drives").insertOne(doc);
  return doc;
}

export async function getDriveById(driveId) {
  const db = await getDb();
  return db.collection("drives").findOne({ id: Number(driveId) });
}

export async function findPersonalDriveByOwner(ownerId) {
  const db = await getDb();
  return db.collection("drives").findOne({ owner_id: Number(ownerId), personal: true });
}

export async function listDrivesForUser(userId) {
  const db = await getDb();
  const memberships = await db.collection("drive_members").find({ user_id: Number(userId) }).toArray();
  if (!memberships.length) return [];
  const driveIds = [...new Set(memberships.map((m) => Number(m.drive_id)))];
  const drives = await db.collection("drives").find({ id: { $in: driveIds } }).toArray();
  const roleMap = new Map(memberships.map((m) => [Number(m.drive_id), m.role]));
  return drives
    .map((d) => ({
      ...d,
      my_role: roleMap.get(Number(d.id)) || (Number(d.owner_id) === Number(userId) ? "admin" : "viewer"),
    }))
    .sort((a, b) => Number(Boolean(b.personal)) - Number(Boolean(a.personal)));
}

export async function updateDriveQuotaLimit(driveId, quotaLimitBytes) {
  const db = await getDb();
  await db.collection("drives").updateOne(
    { id: Number(driveId) },
    { $set: { quota_limit_bytes: Number(quotaLimitBytes || 0), updated_at: new Date() } }
  );
}

export async function setDriveQuotaUsed(driveId, quotaUsedBytes) {
  const db = await getDb();
  await db.collection("drives").updateOne(
    { id: Number(driveId) },
    { $set: { quota_used_bytes: Math.max(0, Number(quotaUsedBytes || 0)), updated_at: new Date() } }
  );
}

export async function incrementDriveQuotaUsed(driveId, deltaBytes) {
  const db = await getDb();
  await db.collection("drives").updateOne(
    { id: Number(driveId) },
    { $inc: { quota_used_bytes: Number(deltaBytes || 0) }, $set: { updated_at: new Date() } }
  );
}

export async function deleteDriveCascade(driveId) {
  const db = await getDb();
  const numericDriveId = Number(driveId);
  const files = await db
    .collection("files")
    .find({ drive_id: numericDriveId }, { projection: { id: 1 } })
    .toArray();
  const fileIds = files.map((f) => Number(f.id));

  if (fileIds.length > 0) {
    await Promise.all([
      db.collection("file_shares").deleteMany({ file_id: { $in: fileIds } }),
      db.collection("file_comments").deleteMany({ file_id: { $in: fileIds } }),
      db.collection("file_links").deleteMany({ file_id: { $in: fileIds } }),
    ]);
  }

  await Promise.all([
    db.collection("files").deleteMany({ drive_id: numericDriveId }),
    db.collection("folders").deleteMany({ drive_id: numericDriveId }),
    db.collection("drive_members").deleteMany({ drive_id: numericDriveId }),
    db.collection("drive_activity_logs").deleteMany({ drive_id: numericDriveId }),
  ]);

  const res = await db.collection("drives").deleteOne({ id: numericDriveId });
  return res.deletedCount > 0;
}

// ─────────────────────────────────────────
// DRIVE MEMBERS
// ─────────────────────────────────────────

export async function upsertDriveMember({ driveId, userId, role = "viewer", invitedBy = null }) {
  const db = await getDb();
  const normalizedRole = role === "admin" || role === "editor" ? role : "viewer";
  const existing = await db.collection("drive_members").findOne({
    drive_id: Number(driveId),
    user_id: Number(userId),
  });
  if (existing) {
    await db.collection("drive_members").updateOne(
      { id: existing.id },
      { $set: { role: normalizedRole } }
    );
    return { ...existing, role: normalizedRole };
  }
  const id = await nextSequence("drive_members");
  const doc = {
    id,
    drive_id: Number(driveId),
    user_id: Number(userId),
    role: normalizedRole,
    invited_by: invitedBy != null ? Number(invitedBy) : null,
    joined_at: new Date(),
  };
  await db.collection("drive_members").insertOne(doc);
  return doc;
}

export async function getDriveMember(driveId, userId) {
  const db = await getDb();
  return db.collection("drive_members").findOne({
    drive_id: Number(driveId),
    user_id: Number(userId),
  });
}

export async function listDriveMembers(driveId) {
  const db = await getDb();
  const members = await db.collection("drive_members").find({ drive_id: Number(driveId) }).toArray();
  if (!members.length) return [];
  const userIds = [...new Set(members.map((m) => Number(m.user_id)))];
  const users = await db.collection("users").find({ id: { $in: userIds } }).toArray();
  const userMap = new Map(users.map((u) => [Number(u.id), u]));
  return members.map((m) => {
    const u = userMap.get(Number(m.user_id));
    return {
      id: m.id,
      driveId: m.drive_id,
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      username: u?.username || null,
      walletAddress: u?.wallet_address || null,
    };
  });
}

export async function removeDriveMember(driveId, userId) {
  const db = await getDb();
  const res = await db.collection("drive_members").deleteOne({
    drive_id: Number(driveId),
    user_id: Number(userId),
  });
  return res.deletedCount > 0;
}

// ─────────────────────────────────────────
// FOLDER MODEL
// ─────────────────────────────────────────

export async function createFolder({ driveId, parentFolderId = null, name, createdBy }) {
  const db = await getDb();
  const id = await nextSequence("folders");
  const doc = {
    id,
    drive_id: Number(driveId),
    parent_folder_id: parentFolderId != null ? Number(parentFolderId) : null,
    name: String(name || "New Folder"),
    created_by: Number(createdBy),
    created_at: new Date(),
  };
  await db.collection("folders").insertOne(doc);
  return doc;
}

export async function listFoldersByDriveAndParent(driveId, parentFolderId = null) {
  const db = await getDb();
  const query = { drive_id: Number(driveId) };
  if (parentFolderId == null) query.parent_folder_id = null;
  else query.parent_folder_id = Number(parentFolderId);
  return db.collection("folders").find(query).sort({ created_at: -1 }).toArray();
}

// ─────────────────────────────────────────
// DRIVE ACTIVITY LOGS
// ─────────────────────────────────────────

export async function createDriveActivityLog({
  driveId,
  actorUserId,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
}) {
  const db = await getDb();
  const id = await nextSequence("drive_activity_logs");
  await db.collection("drive_activity_logs").insertOne({
    id,
    drive_id: Number(driveId),
    actor_user_id: Number(actorUserId),
    action: String(action),
    target_type: targetType ? String(targetType) : null,
    target_id: targetId != null ? Number(targetId) : null,
    metadata: metadata || {},
    created_at: new Date(),
  });
  return { id };
}

export async function listDriveActivityLogs(driveId, limit = 100) {
  const db = await getDb();
  return db
    .collection("drive_activity_logs")
    .find({ drive_id: Number(driveId) })
    .sort({ created_at: -1 })
    .limit(Math.max(1, Math.min(500, Number(limit || 100))))
    .toArray();
}
