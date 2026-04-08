// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Remix-ready unified contract for this project.
 *
 * It combines:
 * - Quota/storage functions expected by STORAGE_ALLOC_CONTRACT ABI
 * - File/permission functions expected by DRIVE_V2_CONTRACT ABI
 *
 * You can deploy ONE contract in Remix and set BOTH env vars to this address:
 * - STORAGE_ALLOC_CONTRACT=<this_address>
 * - DRIVE_V2_CONTRACT=<this_address>
 */
contract BlockchainDriveUnified {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // -------------------- QUOTA SECTION --------------------
    struct UserQuota {
        string tier;
        uint256 quotaLimitBytes;
        uint256 usedBytes;
        uint8 usagePercent;
        uint256 filesUploaded;
        uint256 maxFiles;
        bool isActive;
        uint256 lastUpdated;
    }

    mapping(address => UserQuota) public quotas;

    event PoolAllocated(string poolName, uint256 bytesAmount);
    event UserQuotaAllocated(string poolName, address indexed userAddress, uint256 bytesAmount);
    event QuotaUpdated(address indexed userAddress, uint256 usedBytes, uint256 quotaLimitBytes);
    event QuotaRefunded(address indexed userAddress, uint256 refundedBytes);

    function allocatePool(string memory poolName, uint256 bytesAmount) external onlyOwner {
        // Placeholder for compatibility with backend ABI.
        emit PoolAllocated(poolName, bytesAmount);
    }

    function allocateUserQuota(string memory poolName, address userAddress, uint256 bytesAmount) external onlyOwner {
        UserQuota storage q = quotas[userAddress];
        q.tier = "CUSTOM";
        q.quotaLimitBytes = bytesAmount;
        if (q.maxFiles == 0) {
            q.maxFiles = type(uint256).max;
        }
        q.isActive = true;
        q.lastUpdated = block.timestamp;
        emit UserQuotaAllocated(poolName, userAddress, bytesAmount);
    }

    function getQuotaStats(address userAddress)
        external
        view
        returns (
            string memory tier,
            uint256 quotaLimitBytes,
            uint256 usedBytes,
            uint256 remainingBytes,
            uint8 usagePercent,
            uint256 filesUploaded,
            uint256 maxFiles,
            bool isActive,
            uint256 lastUpdated
        )
    {
        UserQuota memory q = quotas[userAddress];
        uint256 remain = q.quotaLimitBytes > q.usedBytes ? q.quotaLimitBytes - q.usedBytes : 0;
        return (
            q.tier,
            q.quotaLimitBytes,
            q.usedBytes,
            remain,
            q.usagePercent,
            q.filesUploaded,
            q.maxFiles,
            q.isActive,
            q.lastUpdated
        );
    }

    function updateQuotaAfterUpload(address userAddress, uint256 fileSizeBytes) external {
        UserQuota storage q = quotas[userAddress];
        require(q.isActive, "Quota not active");
        require(q.usedBytes + fileSizeBytes <= q.quotaLimitBytes, "Quota exceeded");

        q.usedBytes += fileSizeBytes;
        q.filesUploaded += 1;
        q.usagePercent = q.quotaLimitBytes == 0
            ? 0
            : uint8((q.usedBytes * 100) / q.quotaLimitBytes);
        q.lastUpdated = block.timestamp;

        emit QuotaUpdated(userAddress, q.usedBytes, q.quotaLimitBytes);
    }

    function refundQuota(address userAddress, uint256 fileSizeBytes) external {
        UserQuota storage q = quotas[userAddress];
        if (fileSizeBytes >= q.usedBytes) {
            q.usedBytes = 0;
        } else {
            q.usedBytes -= fileSizeBytes;
        }
        if (q.filesUploaded > 0) {
            q.filesUploaded -= 1;
        }
        q.usagePercent = q.quotaLimitBytes == 0
            ? 0
            : uint8((q.usedBytes * 100) / q.quotaLimitBytes);
        q.lastUpdated = block.timestamp;

        emit QuotaRefunded(userAddress, fileSizeBytes);
    }

    // -------------------- FILE ACCESS SECTION --------------------
    struct FileRecord {
        address uploader;
        string fileId;      // app stores CID here
        string customHash;
        uint256 sizeBytes;
        bool exists;
    }

    struct AccessGrant {
        bool active;
        string role;        // "viewer" or "editor"
        uint256 expiresAt;  // 0 = no expiry
    }

    // fileKey => record
    mapping(bytes32 => FileRecord) private filesByKey;
    // fileKey => user => access
    mapping(bytes32 => mapping(address => AccessGrant)) private accessByFileAndUser;

    event FileRecorded(address indexed uploader, string fileId, string customHash, uint256 sizeBytes);
    event FileShared(string fileId, address indexed recipient, string role, uint256 expiresAt);
    event AccessRevoked(string fileId, address indexed userAddress);

    function _fileKey(string memory fileId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(fileId));
    }

    function recordFile(address userAddress, string memory fileId, string memory customHash, uint256 sizeBytes) external {
        bytes32 key = _fileKey(fileId);
        filesByKey[key] = FileRecord({
            uploader: userAddress,
            fileId: fileId,
            customHash: customHash,
            sizeBytes: sizeBytes,
            exists: true
        });
        emit FileRecorded(userAddress, fileId, customHash, sizeBytes);
    }

    function shareFile(string memory fileId, address recipientAddress, string memory role, uint256 expiryDays) external {
        bytes32 key = _fileKey(fileId);
        require(filesByKey[key].exists, "File not found");
        require(filesByKey[key].uploader == msg.sender || msg.sender == owner, "Not file owner");

        uint256 expiresAt = expiryDays == 0 ? 0 : block.timestamp + (expiryDays * 1 days);
        accessByFileAndUser[key][recipientAddress] = AccessGrant({
            active: true,
            role: role,
            expiresAt: expiresAt
        });

        emit FileShared(fileId, recipientAddress, role, expiresAt);
    }

    function revokeAccess(string memory fileId, address userAddress) external {
        bytes32 key = _fileKey(fileId);
        require(filesByKey[key].exists, "File not found");
        require(filesByKey[key].uploader == msg.sender || msg.sender == owner, "Not file owner");

        accessByFileAndUser[key][userAddress].active = false;
        emit AccessRevoked(fileId, userAddress);
    }

    function canUserAccessFile(address userAddress, string memory fileId, string memory action) external view returns (bool) {
        bytes32 key = _fileKey(fileId);
        FileRecord memory f = filesByKey[key];
        if (!f.exists) return false;

        // owner/uploader can do all actions
        if (f.uploader == userAddress) return true;

        AccessGrant memory grant = accessByFileAndUser[key][userAddress];
        if (!grant.active) return false;
        if (grant.expiresAt != 0 && grant.expiresAt < block.timestamp) return false;

        bytes32 actionHash = keccak256(abi.encodePacked(action));
        bytes32 viewerHash = keccak256(abi.encodePacked("viewer"));
        bytes32 editorHash = keccak256(abi.encodePacked("editor"));
        bytes32 roleHash = keccak256(abi.encodePacked(grant.role));

        if (actionHash == keccak256(abi.encodePacked("view"))) {
            return roleHash == viewerHash || roleHash == editorHash;
        }
        if (actionHash == keccak256(abi.encodePacked("edit"))) {
            return roleHash == editorHash;
        }

        // deny unknown actions
        return false;
    }
}

