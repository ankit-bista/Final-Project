import { ethers } from "ethers";

// Smart Contract ABIs
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

/** Generate a realistic-looking fake tx hash for mock mode. */
function mockTxHash() {
  return "0x" + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

class BlockchainService {
  constructor() {
    this.initialized = false;
    this.provider = null;
    this.wallet = null;
    this.storageContract = null;
    this.driveContract = null;
    this.isMocked = process.env.USE_REAL_CONTRACTS !== "true";

    if (this.isMocked) {
      // ── MOCK MODE ──────────────────────────────────────────────────────────
      // Do NOT create a JsonRpcProvider — ethers v6 endlessly retries
      // connecting to 127.0.0.1:8545 and floods the console every second.
      console.log("[BlockchainService] Mock mode — no RPC connection needed.");
      this.initialized = true;
    } else {
      // ── REAL MODE ──────────────────────────────────────────────────────────
      this.initPromise = this._initReal();
    }
  }

  async _initReal() {
    try {
      const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
      const privateKey =
        process.env.ADMIN_PRIVATE_KEY ||
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      const storageAllocationAddr =
        process.env.STORAGE_ALLOC_CONTRACT ||
        "0x0000000000000000000000000000000000000001";
      const driveV2Addr =
        process.env.DRIVE_V2_CONTRACT ||
        "0x0000000000000000000000000000000000000002";

      this.storageContract = new ethers.Contract(
        storageAllocationAddr,
        storageAllocationAbi,
        this.wallet
      );
      this.driveContract = new ethers.Contract(
        driveV2Addr,
        driveV2Abi,
        this.wallet
      );
      this.initialized = true;
      console.log("BlockchainService initialized successfully (real mode).");
    } catch (e) {
      console.error("Error initializing BlockchainService:", e.message || e);
      this.initialized = false;
    }
  }

  async ensureInitialized() {
    if (this.isMocked) return; // always ready in mock mode
    if (!this.initialized) await this.initPromise;
    if (!this.initialized)
      throw new Error("Blockchain service failed to initialize");
  }

  // ── Quota Management ───────────────────────────────────────────────────────

  async checkQuota(userAddress, fileSizeBytes) {
    if (this.isMocked) return true;
    try {
      await this.ensureInitialized();
      const stats = await this.storageContract.getQuotaStats(userAddress);
      return (stats.remainingBytes ?? stats[3]) >= fileSizeBytes;
    } catch (error) {
      console.error("Failed to check quota:", error.message || error);
      return false;
    }
  }

  async updateQuotaAndRecordFile(userAddress, fileId, customHash, fileSizeBytes) {
    if (this.isMocked) {
      const hash = mockTxHash();
      console.log(`[DEV MODE] Anchoring file ${fileId} to blockchain... TxHash: ${hash}`);
      return { txHash: hash, fileTxHash: hash };
    }
    try {
      await this.ensureInitialized();
      const tx1 = await this.storageContract.updateQuotaAfterUpload(
        userAddress,
        fileSizeBytes
      );
      await tx1.wait();
      const tx2 = await this.driveContract.recordFile(
        userAddress,
        fileId,
        customHash,
        fileSizeBytes
      );
      await tx2.wait();
      return { quotaTxHash: tx1.hash, fileTxHash: tx2.hash, txHash: tx2.hash };
    } catch (err) {
      console.error("Failed to update quota and record file:", err.message || err);
      throw err;
    }
  }

  async refundQuota(userAddress, fileSizeBytes) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Mock refund ${fileSizeBytes} bytes for ${userAddress}`);
      return;
    }
    try {
      await this.ensureInitialized();
      const tx = await this.storageContract.refundQuota(userAddress, fileSizeBytes);
      await tx.wait();
    } catch (err) {
      console.error("Failed to refund quota:", err.message || err);
      throw err;
    }
  }

  // ── Access Control ─────────────────────────────────────────────────────────

  async checkPermission(userAddress, fileId, action) {
    if (this.isMocked) return true;
    try {
      await this.ensureInitialized();
      return await this.driveContract.canUserAccessFile(userAddress, fileId, action);
    } catch (error) {
      console.warn("Permission check failed:", error.message || error);
      return false;
    }
  }

  // ── File Sharing ───────────────────────────────────────────────────────────

  async shareFile(fileId, recipientAddress, role, expiryDays) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Mock share file ${fileId} → ${recipientAddress} (${role})`);
      return;
    }
    try {
      await this.ensureInitialized();
      const tx = await this.driveContract.shareFile(
        fileId,
        recipientAddress,
        role,
        expiryDays
      );
      await tx.wait();
    } catch (err) {
      console.error("Failed to share file:", err.message || err);
      throw err;
    }
  }

  async storeEncryptedKey(fileId, recipientAddress, encryptedKeyPayload) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Mock storeEncryptedKey for file ${fileId}`);
      return mockTxHash();
    }
    try {
      await this.ensureInitialized();
      const payload =
        typeof encryptedKeyPayload === "string"
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
      console.warn("storeEncryptedKey failed:", err?.message || err);
      return null;
    }
  }

  async revokeAccess(fileId, userAddress) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Mock revokeAccess file ${fileId} for ${userAddress}`);
      return;
    }
    try {
      await this.ensureInitialized();
      const tx = await this.driveContract.revokeAccess(fileId, userAddress);
      await tx.wait();
    } catch (err) {
      console.error("Failed to revoke access:", err.message || err);
      throw err;
    }
  }

  // ── Admin Functions ────────────────────────────────────────────────────────

  async allocatePool(poolName, bytesAmount) {
    if (this.isMocked) {
      console.log(`[DEV MODE] Mock allocatePool: ${poolName} → ${bytesAmount} bytes`);
      return;
    }
    try {
      await this.ensureInitialized();
      const tx = await this.storageContract.allocatePool(poolName, bytesAmount);
      await tx.wait();
    } catch (err) {
      console.error("Failed to allocate pool:", err.message || err);
      throw err;
    }
  }

  async allocateUserQuota(poolName, userAddress, bytesAmount) {
    if (this.isMocked) {
      console.log(
        `[DEV MODE] Mock allocateUserQuota: ${bytesAmount} bytes → ${userAddress}`
      );
      return;
    }
    try {
      await this.ensureInitialized();
      const tx = await this.storageContract.allocateUserQuota(
        poolName,
        userAddress,
        bytesAmount
      );
      await tx.wait();
    } catch (err) {
      console.error("Failed to allocate user quota:", err.message || err);
      throw err;
    }
  }
}

export const blockchainService = new BlockchainService();
