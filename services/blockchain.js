import { ethers } from "ethers";

// Configuration for Local Hardhat Network (default) or testnet
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const privateKey = process.env.ADMIN_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat Account #0

// Smart Contract ABIs (mocked structures since the actual contracts are not locally defined)
const storageAllocationAbi = [
  "function allocatePool(string poolName, uint256 bytesAmount) external",
  "function allocateUserQuota(string poolName, address userAddress, uint256 bytesAmount) external",
  "function getQuotaStats(address userAddress) external view returns (string tier, uint256 quotaLimitBytes, uint256 usedBytes, uint256 remainingBytes, uint8 usagePercent, uint256 filesUploaded, uint256 maxFiles, bool isActive, uint256 lastUpdated)",
  "function updateQuotaAfterUpload(address userAddress, uint256 fileSizeBytes) external",
  "function refundQuota(address userAddress, uint256 fileSizeBytes) external"
];

const driveV2Abi = [
  "function recordFile(address userAddress, string fileId, string customHash, uint256 sizeBytes) external",
  "function shareFile(string fileId, address recipientAddress, string role, uint256 expiryDays) external",
  "function revokeAccess(string fileId, address userAddress) external",
  "function canUserAccessFile(address userAddress, string fileId, string action) external view returns (bool)"
];

const contractsConfig = {
  storageAllocationAddr: process.env.STORAGE_ALLOC_CONTRACT || "0x0000000000000000000000000000000000000001",
  driveV2Addr: process.env.DRIVE_V2_CONTRACT || "0x0000000000000000000000000000000000000002"
};

class BlockchainService {
  constructor() {
    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      
      this.storageContract = new ethers.Contract(contractsConfig.storageAllocationAddr, storageAllocationAbi, this.wallet);
      this.driveContract = new ethers.Contract(contractsConfig.driveV2Addr, driveV2Abi, this.wallet);
      // We operate in "mock" contract mode if configured, but we will still send REAL transactions to form blocks
      this.isMocked = process.env.USE_REAL_CONTRACTS !== "true";
    } catch (e) {
      console.error("Error initializing BlockchainService:", e);
    }
  }

  // Quota Management
  async checkQuota(userAddress, fileSizeBytes) {
    if (this.isMocked) return true; // Accept all in mock mode
    try {
      const stats = await this.storageContract.getQuotaStats(userAddress);
      // Ensure remaining bytes can handle the file
      if (stats.remainingBytes < fileSizeBytes) {
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check quota:", error);
      return false;
    }
  }

  async updateQuotaAndRecordFile(userAddress, fileId, customHash, fileSizeBytes) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Anchoring file ${fileId} to blockchain to form a block...`);
      try {
        const dataHex = ethers.hexlify(ethers.toUtf8Bytes(`RECORD_FILE|${fileId}|${customHash}|${fileSizeBytes}`));
        const tx = await this.wallet.sendTransaction({
          to: userAddress || this.wallet.address,
          value: 0,
          data: dataHex
        });
        await tx.wait(); // Forms the block!
        console.log(`[DEV MODE] Block formed successfully! TxHash: ${tx.hash}`);
        return { txHash: tx.hash, fileTxHash: tx.hash };
      } catch (err) {
        console.warn(`[DEV MODE] Failed to form block via local transaction. Is your local blockchain (e.g. Hardhat) running?`, err.message);
      }
      return { txHash: null, fileTxHash: null };
    }
    
    // In production, we'd probably bundle these in a single proxy contract call,
    // but here we demonstrate the specified algorithm step
    const tx1 = await this.storageContract.updateQuotaAfterUpload(userAddress, fileSizeBytes);
    await tx1.wait();

    const tx2 = await this.driveContract.recordFile(userAddress, fileId, customHash, fileSizeBytes);
    await tx2.wait();

    return { quotaTxHash: tx1.hash, fileTxHash: tx2.hash, txHash: tx2.hash };
  }

  async refundQuota(userAddress, fileSizeBytes) {
    if (this.isMocked) {
      try {
        const dataHex = ethers.hexlify(ethers.toUtf8Bytes(`REFUND_QUOTA|${fileSizeBytes}`));
        const tx = await this.wallet.sendTransaction({ to: userAddress || this.wallet.address, value: 0, data: dataHex });
        await tx.wait();
      } catch (err) { }
      return;
    }
    const tx = await this.storageContract.refundQuota(userAddress, fileSizeBytes);
    await tx.wait();
  }

  // Action Access check
  async checkPermission(userAddress, fileId, action) {
    if (this.isMocked) return true;
    try {
      return await this.driveContract.canUserAccessFile(userAddress, fileId, action);
    } catch (error) {
       return false;
    }
  }

  // File Sharing
  async shareFile(fileId, recipientAddress, role, expiryDays) {
    if (this.isMocked) {
      try {
        const dataHex = ethers.hexlify(ethers.toUtf8Bytes(`SHARE|${fileId}|${recipientAddress}|${role}`));
        const tx = await this.wallet.sendTransaction({ to: recipientAddress || this.wallet.address, value: 0, data: dataHex });
        await tx.wait();
        console.log(`[DEV MODE] Share transaction mined! TxHash: ${tx.hash}`);
      } catch (err) { }
      return;
    }
    const tx = await this.driveContract.shareFile(fileId, recipientAddress, role, expiryDays);
    await tx.wait();
  }

  // Persist encrypted AES key metadata on-chain as transaction calldata.
  // Works in both mock and real modes without requiring ABI changes.
  async storeEncryptedKey(fileId, recipientAddress, encryptedKeyPayload) {
    try {
      const payload = typeof encryptedKeyPayload === "string"
        ? encryptedKeyPayload
        : JSON.stringify(encryptedKeyPayload || {});
      const encoded = Buffer.from(payload, "utf8").toString("base64");
      const dataHex = ethers.hexlify(
        ethers.toUtf8Bytes(`ENC_KEY|${fileId}|${recipientAddress}|${encoded}`)
      );
      const tx = await this.wallet.sendTransaction({
        to: recipientAddress || this.wallet.address,
        value: 0,
        data: dataHex,
      });
      await tx.wait();
      return tx.hash;
    } catch (err) {
      console.warn("storeEncryptedKey transaction failed:", err?.message || err);
      return null;
    }
  }

  async revokeAccess(fileId, userAddress) {
    if (this.isMocked) {
      console.log(`[MOCK] Revoked access to file ${fileId} for ${userAddress}`);
      return;
    }
    const tx = await this.driveContract.revokeAccess(fileId, userAddress);
    await tx.wait();
  }

  // Admin Functions
  async allocatePool(poolName, bytesAmount) {
    if (this.isMocked) {
      console.log(`[MOCK] Allocated pool ${poolName} with ${bytesAmount} bytes`);
      return;
    }
    const tx = await this.storageContract.allocatePool(poolName, bytesAmount);
    await tx.wait();
  }

  async allocateUserQuota(poolName, userAddress, bytesAmount) {
    if (this.isMocked) {
      console.log(`[MOCK] Allocated ${bytesAmount} bytes to ${userAddress} from pool ${poolName}`);
      return;
    }
    const tx = await this.storageContract.allocateUserQuota(poolName, userAddress, bytesAmount);
    await tx.wait();
  }
}

export const blockchainService = new BlockchainService();
