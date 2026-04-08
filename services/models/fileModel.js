import { getDb, nextSequence } from "./mongoClient.js";

export async function createFile({
  userId,
  ipfsHash,
  fileName,
  sizeBytes = 0,
  customHash = null,
  txHash = null,
  encryption = null,
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

export async function deleteFileByIdAndOwner(fileId, ownerId) {
  const db = await getDb();
  const res = await db.collection("files").deleteOne({ id: Number(fileId), user_id: Number(ownerId) });
  return res.deletedCount > 0;
}

export async function updateFileTxHash(fileId, ownerId, txHash) {
  const db = await getDb();
  await db.collection("files").updateOne(
    { id: Number(fileId), user_id: Number(ownerId) },
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
