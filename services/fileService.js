import { generateCustomHash } from "../utils/customHash.js";
import { uploadToIPFS } from "./ipfsService.js";
import { blockchainService } from "./blockchain.js";
import { getDb } from "./database.js";
import {
  findUserById,
  createFile,
  deleteFileByIdAndOwner,
  listFilesByOwner,
  updateFileTxHash,
  deleteSharesByFileId,
  getFileById,
  getFileByIdAndOwner,
} from "./models/index.js";
import {
  addDriveUsage,
  assertDriveCanUpload,
  ensureDefaultDriveForUser,
  recalculateDriveUsage,
  requireDriveRole,
} from "./driveService.js";

/**
 * Get wallet address for a userId from the DB.
 */
export async function getWalletAddress(userId) {
  try {
    const user = await findUserById(userId);
    if (!user) throw new Error("User not found");
    return user.wallet_address || "0x0000000000000000000000000000000000000000";
  } catch (err) {
    console.warn("wallet_address column missing; using fallback wallet");
    return "0x0000000000000000000000000000000000000000";
  }
}

/**
 * Upload a file to IPFS and record it in the database.
 */
export async function uploadAndRecordFile(userId, file, customFilename, description, encryption = null, options = {}) {
  const newSize = file.size || 0;
  const enforceQuota = process.env.ENFORCE_QUOTA_ON_UPLOAD === "true";
  const [walletAddress, defaultDrive] = await Promise.all([
    getWalletAddress(userId),
    ensureDefaultDriveForUser(userId),
  ]);
  const targetDriveId = Number(options?.driveId || defaultDrive.id);
  const targetFolderId = options?.folderId != null && options?.folderId !== ""
    ? Number(options.folderId)
    : null;

  await assertDriveCanUpload(targetDriveId, userId, newSize);

  // 1. Check quota on blockchain
  try {
    const hasQuota = await blockchainService.checkQuota(walletAddress, newSize);
    if (!hasQuota) {
      if (enforceQuota) {
        const err = new Error("Storage quota exceeded");
        err.code = "QUOTA_EXCEEDED";
        throw err;
      }
      // Prototype behavior: do not block uploads if quota check fails.
      console.warn("Quota check failed; continuing upload for prototype:", { userId, newSize });
    }
  } catch (err) {
    if (enforceQuota) throw err;
    console.warn("Quota check errored; continuing upload for prototype:", err?.message || err);
  }

  // 2. Generate a custom content hash
  const customHash = generateCustomHash(file.buffer, customFilename || file.originalname);

  // 3. Upload to IPFS
  const cid = await uploadToIPFS(file.buffer);

  // 4. Record in database
  const insertResult = await createFile({
    userId,
    ipfsHash: cid,
    fileName: customFilename || file.originalname,
    sizeBytes: newSize,
    customHash,
    encryption,
    driveId: targetDriveId,
    folderId: targetFolderId,
    uploadedBy: Number(userId),
    description: description || "",
  });
  await addDriveUsage(targetDriveId, newSize);

  // 5. Update quota and record on blockchain (if configured)
  let fileTxHash = null;
  try {
    const tx = await blockchainService.updateQuotaAndRecordFile(walletAddress, cid, customHash, newSize);
    fileTxHash = tx?.fileTxHash || tx?.txHash || null;
  } catch (err) {
    console.warn("Blockchain record failed (continuing):", err?.message || err);
  }

  // 6. Persist tx hash
  if (fileTxHash && insertResult?.insertId) {
    await updateFileTxHash(insertResult.insertId, userId, fileTxHash);
  }

  return { cid, customHash, txHash: fileTxHash };
}

/**
 * Delete a file from the database and refund the blockchain quota.
 */
export async function deleteFileForUser(userId, fileId) {
  const walletAddress = await getWalletAddress(userId);
  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const driveId = file?.drive_id != null ? Number(file.drive_id) : null;
  if (driveId != null) {
    const { role } = await requireDriveRole(driveId, userId, ["admin", "editor", "viewer"]);
    const uploaderId = Number(file.uploaded_by || file.user_id);
    const isUploader = uploaderId === Number(userId);
    if (!(role === "admin" || (role === "editor" && isUploader))) {
      const err = new Error("Access denied");
      err.code = "ACCESS_DENIED";
      throw err;
    }
  } else if (Number(file.user_id) !== Number(userId)) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const fileSizeBytes = Number(file.size_bytes || 0);
  await deleteFileByIdAndOwner(fileId, file.user_id);
  await deleteSharesByFileId(fileId);
  if (driveId != null) {
    await recalculateDriveUsage(driveId);
  }
  try {
    await blockchainService.refundQuota(walletAddress, fileSizeBytes);
  } catch (err) {
    console.warn("refundQuota failed; continuing:", err?.message || err);
  }
}

/**
 * Get all files owned by a user.
 */
export async function getUserFiles(userId) {
  const files = await listFilesByOwner(userId);
  return files.map((f) => ({
    id: f.id,
    filename: f.file_name,
    cid: f.ipfs_hash,
    size_bytes: Number(f.size_bytes || 0),
    custom_hash: f.custom_hash || null,
    tx_hash: f.tx_hash || null,
    encryption: f.encryption || null,
    drive_id: f.drive_id ?? null,
    folder_id: f.folder_id ?? null,
    description: f.description || "",
    uploaded_by: f.uploaded_by ?? null,
  }));
}

/**
 * Anchor an existing file on-chain by recording its CID/hash metadata.
 * This sends a blockchain transaction, so gas/coin is spent on real networks.
 */
export async function anchorFileForUser(userId, fileId) {
  const walletAddress = await getWalletAddress(userId);
  const file = await getFileByIdAndOwner(fileId, userId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const cid = file.ipfs_hash;
  const customHash = file.custom_hash || cid;
  const sizeBytes = Number(file.size_bytes || 0);

  const tx = await blockchainService.updateQuotaAndRecordFile(
    walletAddress,
    cid,
    customHash,
    sizeBytes
  );

  const txHash = tx?.fileTxHash || tx?.txHash || null;
  if (txHash) {
    await updateFileTxHash(fileId, userId, txHash);
  }

  return { txHash };
}

export async function deleteFolderForUser(userId, folderId) {
  const db = await getDb();
  const numericFolderId = Number(folderId);
  const folder = await db.collection("folders").findOne({ id: numericFolderId });
  if (!folder) {
    const err = new Error("Folder not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Check drive membership/permissions of the parent drive
  const driveId = Number(folder.drive_id);
  const { role } = await requireDriveRole(driveId, userId, ["admin", "editor"]);

  // Recursive delete helper
  async function recursiveDelete(fid) {
    // 1. Get and delete all files in this folder
    const files = await db.collection("files").find({ folder_id: fid }).toArray();
    for (const file of files) {
      await deleteFileForUser(userId, file.id);
    }

    // 2. Find and delete all subfolders recursively
    const subfolders = await db.collection("folders").find({ parent_folder_id: fid }).toArray();
    for (const sub of subfolders) {
      await recursiveDelete(sub.id);
    }

    // 3. Delete the folder itself
    await db.collection("folders").deleteOne({ id: fid });
  }

  await recursiveDelete(numericFolderId);
  await recalculateDriveUsage(driveId);
  return true;
}
