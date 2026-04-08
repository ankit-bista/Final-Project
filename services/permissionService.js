import { blockchainService } from "./blockchain.js";
import { canUserAccessFileDb } from "./accessControl.js";
import { getWalletAddress } from "./fileService.js";
import { getFileById } from "./models/fileModel.js";

function mapAction(action) {
  // contract expects "view" or "edit"
  return action === "edit" ? "edit" : "view";
}

/**
 * Hybrid permission model:
 * - Primary: check permission in smart contract (trust-minimized)
 * - Fallback: check permission in DB RBAC (prototype resilience)
 *
 * Env:
 * - ENFORCE_CONTRACT_PERMISSIONS=true  => if contract says no/fails => deny
 * - ENFORCE_CONTRACT_PERMISSIONS=false => fallback to DB if contract not available
 */
export async function canUserAccessFileHybrid(userId, fileId, action) {
  const enforceContract = process.env.ENFORCE_CONTRACT_PERMISSIONS === "true";

  const file = await getFileById(fileId);
  if (!file) return false;

  const walletAddress = await getWalletAddress(userId);
  const cid = file.ipfs_hash;
  const contractAction = mapAction(action);

  try {
    const allowedOnChain = await blockchainService.checkPermission(
      walletAddress,
      cid,
      contractAction
    );

    if (allowedOnChain) return true;
    if (enforceContract) return false;
    return await canUserAccessFileDb(userId, fileId, action);
  } catch (err) {
    if (enforceContract) return false;
    return await canUserAccessFileDb(userId, fileId, action);
  }
}

