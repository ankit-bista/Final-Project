import { canUserAccessFileHybrid } from "./permissionService.js";
import { getFileById } from "./models/index.js";
import { Readable } from "stream";

export async function getFileDownloadContent(requesterId, fileId) {
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

  if (process.env.BLOCKCHAIN_MODE === "mock" || file.ipfs_hash?.startsWith("QmMock")) {
    return {
      fileName: file.file_name || "mock-file",
      contentType: "text/plain",
      stream: Readable.from(Buffer.from("This is a mock file content. Real IPFS is not connected.")),
    };
  }

  const gatewayUrl = (process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:5002").replace(/\/$/, "");
  const sourceUrl = `${gatewayUrl}/ipfs/${file.ipfs_hash}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let response;
  try {
    response = await fetch(sourceUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const err = new Error("Failed to fetch file from IPFS (Timeout or Network Error)");
    err.code = "IPFS_FETCH_FAILED";
    throw err;
  }

  if (!response.ok) {
    const err = new Error("Failed to fetch file from IPFS");
    err.code = "IPFS_FETCH_FAILED";
    throw err;
  }

  return {
    fileName: file.file_name || "file",
    contentType: response.headers.get("content-type") || "application/octet-stream",
    stream: Readable.fromWeb(response.body),
  };
}
