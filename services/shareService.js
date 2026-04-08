import { blockchainService } from "./blockchain.js";
import { getFileByIdAndOwner, listFilesByOwner } from "./models/fileModel.js";
import { findUserByUsernameOrWallet } from "./models/userModel.js";
import { listSharedWithUser, upsertShare } from "./models/shareModel.js";

/**
 * Share a file with another user by username or wallet address.
 */
export async function shareFileWithUser(ownerId, fileId, username, role, encryptedKey = null) {
  const normalizedRole = role === "editor" ? "editor" : "viewer";
  const enforceContractSharing = process.env.ENFORCE_CONTRACT_SHARING === "true";
  const targetKey = username.trim();
  const file = await getFileByIdAndOwner(fileId, ownerId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const targetUser = await findUserByUsernameOrWallet(targetKey);
  if (!targetUser) {
    const err = new Error("Target user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const granteeId = targetUser.id;
  const granteeWallet = targetUser.wallet_address;

  if (granteeId === ownerId) {
    const err = new Error("Cannot share with yourself");
    err.code = "INVALID";
    throw err;
  }

  const fileCid = file.ipfs_hash || fileId.toString();

  // Hybrid best practice: if enabled, only grant DB access when the contract call succeeds.
  if (enforceContractSharing && granteeWallet) {
    try {
      await blockchainService.shareFile(
        fileCid.toString(),
        granteeWallet,
        normalizedRole,
        0
      );
    } catch (e) {
      const err = new Error("Smart contract denied share");
      err.code = "CONTRACT_DENIED";
      throw err;
    }
  }

  await upsertShare({
    fileId: Number(fileId),
    ownerId: Number(ownerId),
    granteeId: Number(granteeId),
    role: normalizedRole,
    encryptedKey,
  });

  // Store encrypted AES key on-chain for auditability/ownership-access proof.
  let encryptedKeyTxHash = null;
  if (encryptedKey && granteeWallet) {
    encryptedKeyTxHash = await blockchainService.storeEncryptedKey(
      fileCid.toString(),
      granteeWallet,
      encryptedKey
    );
  }

  // Log to smart contract
  if (granteeWallet && !enforceContractSharing) {
    // IMPORTANT: our contract's recordFile uses `fileId` as the IPFS CID string,
    // so shareFile must be called with the same `ipfs_hash` value from DB.
    // Blockchain logging is best-effort for this prototype.
    try {
      await blockchainService.shareFile(
        fileCid.toString(),
        granteeWallet,
        normalizedRole,
        0
      );
    } catch (e) {
      console.warn("Blockchain share logging failed; DB share still applied.", e?.message || e);
    }
  }

  return { encryptedKeyTxHash };
}

/**
 * Share all files in the owner's drive with another user.
 * Implemented by granting file-level shares for every owned file.
 */
export async function shareDriveWithUser(ownerId, username, role, keyShares = {}) {
  const normalizedRole = role === "editor" ? "editor" : "viewer";

  // Resolve target user once; `shareFileWithUser` will also validate, but
  // we keep the "drive share" behavior as a single user intent.
  const targetUser = await findUserByUsernameOrWallet(username.trim());
  if (!targetUser) {
    const err = new Error("Target user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const granteeId = targetUser.id;
  if (granteeId === ownerId) {
    const err = new Error("Cannot share with yourself");
    err.code = "INVALID";
    throw err;
  }

  const ownedFiles = await listFilesByOwner(ownerId);
  if (ownedFiles.length === 0) return;

  // Grant permissions per file (prototype behavior).
  for (const f of ownedFiles) {
    // shareFileWithUser does contract/DB hybrid logic for each file.
    const encryptedKey = keyShares?.[String(f.id)] || null;
    await shareFileWithUser(ownerId, f.id, username, normalizedRole, encryptedKey);
  }
}

/**
 * Get all files that have been shared with a user.
 */
export async function getSharedWithUser(userId) {
  return listSharedWithUser(userId);
}
