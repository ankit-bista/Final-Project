import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";

function toUint8Array(input) {
  if (!input) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) return new Uint8Array(input);
  return new TextEncoder().encode(String(input));
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function generateCustomHash(fileBuffer, fileName) {
  const nameBytes = toUint8Array(fileName || "");
  const fileBytes = toUint8Array(fileBuffer);
  const payload = concatBytes(nameBytes, fileBytes);
  const hexHash = bytesToHex(blake3(payload));
  const timestamp = Date.now();
  return `CUSTOMCID-B3-${hexHash}-${timestamp}`;
}
