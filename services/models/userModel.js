import { getDb, nextSequence } from "./mongoClient.js";

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
