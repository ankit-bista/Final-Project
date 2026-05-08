import bcrypt from "bcrypt";
import { getDb, nextSequence } from "./database.js";
import { findUserByUsernameOrWallet } from "./models/index.js";

function normalizePermission(permissionType) {
  return permissionType === "readwrite" ? "readwrite" : "readonly";
}

async function resolveRecipient(recipientAddress) {
  const user = await findUserByUsernameOrWallet(String(recipientAddress || "").trim());
  if (!user) {
    const err = new Error("Recipient not found");
    err.code = "RECIPIENT_NOT_FOUND";
    throw err;
  }
  return user;
}

export async function createBulkShare({
  ownerId,
  fileIds,
  recipientAddress,
  permissionType,
  sharePassword,
  expiresInDays,
}) {
  const db = await getDb();
  const owner = Number(ownerId);
  const recipient = await resolveRecipient(recipientAddress);
  const normalizedIds = [...new Set((fileIds || []).map((id) => Number(id)).filter(Number.isFinite))];
  if (!normalizedIds.length) {
    const err = new Error("At least one valid file ID is required");
    err.code = "INVALID";
    throw err;
  }

  const ownedCount = await db.collection("files").countDocuments({
    id: { $in: normalizedIds },
    user_id: owner,
  });
  if (ownedCount !== normalizedIds.length) {
    const err = new Error("One or more files do not belong to you");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const expiresAt =
    Number.isFinite(Number(expiresInDays)) && Number(expiresInDays) > 0
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

  const id = await nextSequence("bulk_shares");
  const shareDoc = {
    id,
    owner_id: owner,
    recipient_id: Number(recipient.id),
    recipient_wallet: recipient.wallet_address || null,
    file_ids: normalizedIds,
    permission_type: normalizePermission(permissionType),
    password_hash: sharePassword ? await bcrypt.hash(String(sharePassword), 10) : null,
    created_at: new Date(),
    expires_at: expiresAt,
    revoked_at: null,
    access_log: [],
    transaction_hash: null,
  };
  await db.collection("bulk_shares").insertOne(shareDoc);
  return { shareId: id, expiresAt, transactionHash: null };
}

export async function listReceivedShares(userId) {
  const db = await getDb();
  return db
    .collection("bulk_shares")
    .find({ recipient_id: Number(userId) })
    .sort({ created_at: -1 })
    .toArray();
}

export async function listSentShares(userId) {
  const db = await getDb();
  return db
    .collection("bulk_shares")
    .find({ owner_id: Number(userId) })
    .sort({ created_at: -1 })
    .toArray();
}

export async function getShareById(shareId) {
  const db = await getDb();
  return db.collection("bulk_shares").findOne({ id: Number(shareId) });
}

export async function verifyShareAccess({ shareId, requesterId, password, ipAddress }) {
  const db = await getDb();
  const share = await getShareById(shareId);
  if (!share) return { hasAccess: false, reason: "Share not found" };
  if (share.revoked_at) return { hasAccess: false, reason: "Share has been revoked" };
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return { hasAccess: false, reason: "Share has expired" };
  }
  if (Number(share.recipient_id) !== Number(requesterId)) {
    return { hasAccess: false, reason: "Not the intended recipient" };
  }
  if (share.password_hash) {
    const ok = await bcrypt.compare(String(password || ""), share.password_hash);
    if (!ok) return { hasAccess: false, reason: "Invalid share password" };
  }

  await db.collection("bulk_shares").updateOne(
    { id: Number(share.id) },
    {
      $push: {
        access_log: {
          user_id: Number(requesterId),
          ip_address: ipAddress || null,
          accessed_at: new Date(),
        },
      },
    }
  );

  return {
    hasAccess: true,
    permissionType: share.permission_type,
    fileIds: share.file_ids || [],
  };
}

export async function revokeShare({ shareId, ownerId }) {
  const db = await getDb();
  const res = await db.collection("bulk_shares").updateOne(
    { id: Number(shareId), owner_id: Number(ownerId), revoked_at: null },
    { $set: { revoked_at: new Date() } }
  );
  return res.modifiedCount > 0;
}

export async function getShareStats(ownerId) {
  const db = await getDb();
  const shares = await listSentShares(ownerId);
  const now = Date.now();
  let active = 0;
  let expired = 0;
  let revoked = 0;
  let totalAccesses = 0;
  for (const share of shares) {
    totalAccesses += Array.isArray(share.access_log) ? share.access_log.length : 0;
    if (share.revoked_at) revoked += 1;
    else if (share.expires_at && new Date(share.expires_at).getTime() < now) expired += 1;
    else active += 1;
  }
  return { totalShares: shares.length, active, expired, revoked, totalAccesses };
}

export async function searchShares(ownerId, term) {
  const shares = await listSentShares(ownerId);
  const q = String(term || "").toLowerCase().trim();
  if (!q) return shares;
  return shares.filter((s) => {
    const wallet = String(s.recipient_wallet || "").toLowerCase();
    const ids = (s.file_ids || []).join(",");
    return wallet.includes(q) || ids.includes(q) || String(s.id).includes(q);
  });
}
