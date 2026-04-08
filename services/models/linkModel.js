import { getDb, nextSequence } from "./mongoClient.js";

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
