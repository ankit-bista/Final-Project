import { canUserAccessFileHybrid } from "./permissionService.js";
import { getFileById } from "./models/fileModel.js";

export async function getInAppViewUrl(requesterId, fileId) {
  const allowed = await canUserAccessFileHybrid(requesterId, fileId, "view");
  if (!allowed) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const gatewayUrl = (process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:5002").replace(/\/$/, "");
  return `${gatewayUrl}/ipfs/${file.ipfs_hash}`;
}

export async function getInAppFileContent(requesterId, fileId) {
  const allowed = await canUserAccessFileHybrid(requesterId, fileId, "view");
  if (!allowed) {
    const err = new Error("Access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const file = await getFileById(fileId);
  if (!file) {
    const err = new Error("File not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const gatewayUrl = (process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:5002").replace(/\/$/, "");
  const sourceUrl = `${gatewayUrl}/ipfs/${file.ipfs_hash}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    const err = new Error("Failed to fetch file from IPFS");
    err.code = "IPFS_FETCH_FAILED";
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    fileName: file.file_name || "file",
    contentType: response.headers.get("content-type") || "application/octet-stream",
    buffer: Buffer.from(arrayBuffer),
  };
}

