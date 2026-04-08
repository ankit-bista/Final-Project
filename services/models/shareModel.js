import { getDb, nextSequence } from "./mongoClient.js";

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
        role: s.role,
        tx_hash: file.tx_hash || null,
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
