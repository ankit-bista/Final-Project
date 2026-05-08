/**
 * EDUCATIONAL ONLY - DO NOT USE IN PRODUCTION
 * 
 * This file demonstrates the underlying mathematics behind Ethereum (which ethers.js hides from you).
 * It implements a simplified version of the secp256k1 elliptic curve, basic BigInt modular math, 
 * and shows how a private key turns into a public key and signs a message.
 */

// ============================================================================
// 1. BIG INTEGER MATH & ELLIPTIC CURVE PROTOCOLS
// ============================================================================

// Ethereum uses the secp256k1 curve. Its mathematical equation is: y^2 = x^3 + 7
// The math is done over a Massive Prime Field (p) to keep everything as integers.

// The massive prime number (field size) for secp256k1
const P = 2n ** 256n - 2n ** 32n - 977n; 

// The 'Generator Point' (G) - the universally agreed upon starting coordinate on the curve.
const Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
const Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n; // The order (max private key)

// Custom mathematical inverse using Fermat's Little Theorem (for dividing points)
function modInverse(a, modulus) {
  let [lm, hm] = [1n, 0n];
  let [low, high] = [a % modulus, modulus];
  while (low > 1n) {
    let r = high / low;
    let nm = hm - lm * r;
    let newLow = high - low * r;
    [low, high] = [newLow, low];
    [lm, hm] = [nm, lm];
  }
  return lm % modulus < 0n ? (lm % modulus) + modulus : lm % modulus;
}

// Point Addition: Math to add two distinct points on the elliptic curve
function pointAdd(x1, y1, x2, y2) {
  if (x1 === 0n && y1 === 0n) return [x2, y2];
  if (x2 === 0n && y2 === 0n) return [x1, y1];

  let lambda;
  if (x1 === x2 && y1 === y2) {
    // Point Doubling (adding a point to itself)
    // lambda = (3 * x^2) / (2 * y)
    let num = (3n * x1 * x1) % P;
    let den = modInverse(2n * y1, P);
    lambda = (num * den) % P;
  } else {
    // Normal Point Addition
    // lambda = (y2 - y1) / (x2 - x1)
    let num = (y2 - y1 + P) % P;
    let den = modInverse((x2 - x1 + P) % P, P);
    lambda = (num * den) % P;
  }

  let x3 = (lambda * lambda - x1 - x2 + 2n * P) % P;
  let y3 = (lambda * (x1 - x3) - y1 + 2n * P) % P;
  return [x3, y3];
}

// Scalar Multiplication: The core of Cryptography! 
// This is how we multiply the Generator point by your Private Key.
function scalarMultiply(k, x, y) {
  let [rx, ry] = [0n, 0n]; // Infinity
  let [bx, by] = [x, y];
  
  // Double-and-add algorithm (converts scalar to binary to speed up massive multiplication)
  while (k > 0n) {
    if (k & 1n) {
      [rx, ry] = pointAdd(rx, ry, bx, by);
    }
    [bx, by] = pointAdd(bx, by, bx, by);
    k >>= 1n;
  }
  return [rx, ry];
}

// ============================================================================
// 2. CRYPTOGRAPHIC OPERATIONS (Ethereum Wallet creation)
// ============================================================================

/**
 * 1. Derives an uncompressed Public Key purely from a Private Key using the curve math above.
 * @param {string} privateKeyHex 
 */
export function getPublicKeyFromPrivate(privateKeyHex) {
  const privateKeyBigInt = BigInt(privateKeyHex);
  
  // Math: PublicKey = PrivateKey * GeneratorPoint
  const [pubX, pubY] = scalarMultiply(privateKeyBigInt, Gx, Gy);
  
  console.log("== UNDER THE HOOD: WALLET DERIVATION ==");
  console.log(`Private Key acts as a massive scalar multiplier.`);
  console.log(`Public X Coordinate: ${pubX.toString(16)}`);
  console.log(`Public Y Coordinate: ${pubY.toString(16)}`);
  
  // In Ethereum, address = Keccak256(pubX + pubY) sliced to last 20 bytes
  return { pubX, pubY };
}

/**
 * 2. ECDSA SIGNATURE (Simplified) 
 * Signing a transaction hash (z) with your private key (d) 
 */
export function signTransactionEduc(privateKeyHex, transactionHashHex) {
  const d = BigInt(privateKeyHex);    // Private Key
  const z = BigInt(transactionHashHex); // Target msg/transaction

  // Usually `k` is generated securely and randomly per transaction (RFC 6979)
  // WARNING: hardcoding `k` in production instantly leaks your private key!
  const k = 12345678901234567890n; 

  // Math: k * G = (x1, y1)
  const [x1, y1] = scalarMultiply(k, Gx, Gy);
  
  // The 'r' value of the signature signature is just the x-coordinate of our random point
  const r = x1 % N;

  // The 's' value calculates how the private key and the hash intertwine with the random point
  // s = k^-1 * (z + r * d) mod N
  const kInv = modInverse(k, N);
  const s = (kInv * (z + (r * d) % N)) % N;

  // Ethereum includes an 'recovery id' (v) to know which Y-coordinate was used.
  const v = (y1 % 2n === 0n) ? 27 : 28;

  console.log("\n== UNDER THE HOOD: ECDSA TRANSACTION SIGNING ==");
  console.log(`R Value: ${r.toString(16)}`);
  console.log(`S Value: ${s.toString(16)}`);
  console.log(`V Value: ${v}`);

  return { r, s, v };
}

// --- DEMO RUN ---
if (typeof require !== 'undefined' && require.main === module) {
  const samplePrivKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  // Made up hash of a transaction
  const sampleTxHash = "0x5c4250280f5d47ad9a64dd5b2d7e5dcc70dc776e0ef5a4e3fa3ae6fd0df688dc"; 
  
  getPublicKeyFromPrivate(samplePrivKey);
  signTransactionEduc(samplePrivKey, sampleTxHash);
}
