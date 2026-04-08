import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

type EthProvider = {
  request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
};
const KEY_CACHE = "cloudvault_file_keys_v1";

function getProvider(): EthProvider {
  const eth = (window as any)?.ethereum;
  if (!eth) throw new Error("MetaMask is required");
  return eth as EthProvider;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getMyEncryptionPublicKey(account: string): Promise<string> {
  const provider = getProvider();
  const key = await provider.request({
    method: "eth_getEncryptionPublicKey",
    params: [account],
  });
  return String(key);
}

export async function decryptWithMetaMask(account: string, encryptedData: any): Promise<string> {
  const provider = getProvider();
  const payload = typeof encryptedData === "string" ? encryptedData : JSON.stringify(encryptedData);
  return provider.request({
    method: "eth_decrypt",
    params: [payload, account],
  });
}

export function encryptForPublicKey(publicKey: string, plainText: string) {
  // MetaMask eth_getEncryptionPublicKey returns base64 x25519 public key.
  const recipientPub = naclUtil.decodeBase64(publicKey);
  const ephemKeyPair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msg = naclUtil.decodeUTF8(plainText);
  const ciphertext = nacl.box(msg, nonce, recipientPub, ephemKeyPair.secretKey);
  return {
    version: "x25519-xsalsa20-poly1305",
    nonce: naclUtil.encodeBase64(nonce),
    ephemPublicKey: naclUtil.encodeBase64(ephemKeyPair.publicKey),
    ciphertext: naclUtil.encodeBase64(ciphertext),
  };
}

export async function encryptFileInBrowser(file: File, ownerPublicKey: string) {
  const plaintext = await file.arrayBuffer();
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext);
  const encryptedBytes = new Uint8Array(encryptedBuffer);

  const keyBase64 = toBase64(rawKey);
  const ownerEncryptedKey = encryptForPublicKey(ownerPublicKey, keyBase64);
  const encryptedFile = new File([encryptedBytes], `${file.name}.enc`, {
    type: "application/octet-stream",
  });

  return {
    encryptedFile,
    keyBase64,
    encryption: {
      algorithm: "AES-GCM",
      iv: toBase64(iv),
      ownerEncryptedKey,
      originalName: file.name,
      originalMimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  };
}

function readKeyCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeKeyCache(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CACHE, JSON.stringify(value));
}

export function cacheFileKeyByCid(cid: string, keyBase64: string) {
  if (!cid || !keyBase64) return;
  const cache = readKeyCache();
  cache[cid] = keyBase64;
  writeKeyCache(cache);
}

export function getCachedFileKeyByCid(cid?: string | null): string | null {
  if (!cid) return null;
  const cache = readKeyCache();
  return cache[cid] || null;
}

export async function decryptBlobWithWallet(
  account: string,
  blob: Blob,
  encryptedKeyPayload: any,
  ivBase64: string
): Promise<Uint8Array> {
  const keyBase64 = await decryptWithMetaMask(account, encryptedKeyPayload);
  const keyBytes = fromBase64(keyBase64);
  const aesKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = fromBase64(ivBase64);
  const encrypted = new Uint8Array(await blob.arrayBuffer());
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, encrypted);
  return new Uint8Array(plainBuffer);
}
