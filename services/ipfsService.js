import { create as createIpfsClient } from "ipfs-http-client";

// External IPFS (Kubo) HTTP API
const ipfs = createIpfsClient({
  // Many Kubo installs (incl. Homebrew) use 5002 for the API.
  url: process.env.IPFS_API_URL || "http://127.0.0.1:5002/api/v0"
});

/**
 * Uploads a file buffer to IPFS and returns the CID.
 * @param {Buffer} buffer - File buffer to upload
 * @returns {Promise<string>} CID string
 */
export async function uploadToIPFS(buffer) {
  try {
    const { cid } = await ipfs.add(buffer);
    return cid.toString();
  } catch (err) {
    const message = String(err?.message || err || "");
    if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("connect")) {
      const e = new Error(
        "IPFS API is unreachable. Start Kubo daemon and verify IPFS_API_URL (e.g. http://127.0.0.1:5001/api/v0)."
      );
      e.code = "IPFS_UNAVAILABLE";
      throw e;
    }
    throw err;
  }
}

export default ipfs;
