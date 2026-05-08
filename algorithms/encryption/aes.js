function xtime(a) {
  const v = a << 1;
  return ((a & 0x80) !== 0 ? v ^ 0x11b : v) & 0xff;
}

function gfMul(a, b) {
  let x = a & 0xff;
  let y = b & 0xff;
  let out = 0;
  while (y > 0) {
    if (y & 1) out ^= x;
    x = xtime(x);
    y >>= 1;
  }
  return out & 0xff;
}

function gfPow(a, n) {
  let result = 1;
  let base = a & 0xff;
  let exp = n;
  while (exp > 0) {
    if (exp & 1) result = gfMul(result, base);
    base = gfMul(base, base);
    exp >>= 1;
  }
  return result & 0xff;
}

function gfInv(a) {
  if ((a & 0xff) === 0) return 0;
  return gfPow(a, 254);
}

function rotl8(x, n) {
  return ((x << n) | (x >>> (8 - n))) & 0xff;
}

function buildSBox() {
  const sbox = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    const inv = gfInv(i);
    const sb = inv ^ rotl8(inv, 1) ^ rotl8(inv, 2) ^ rotl8(inv, 3) ^ rotl8(inv, 4) ^ 0x63;
    sbox[i] = sb & 0xff;
  }
  return sbox;
}

const SBOX = buildSBox();

function subWord(word) {
  return word.map((b) => SBOX[b]);
}

function rotWord(word) {
  return [word[1], word[2], word[3], word[0]];
}

function xorWord(a, b) {
  return [a[0] ^ b[0], a[1] ^ b[1], a[2] ^ b[2], a[3] ^ b[3]];
}

function addRoundKey(state, roundKeyWords, round) {
  for (let c = 0; c < 4; c += 1) {
    const w = roundKeyWords[round * 4 + c];
    for (let r = 0; r < 4; r += 1) {
      state[r][c] ^= w[r];
    }
  }
}

function subBytes(state) {
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      state[r][c] = SBOX[state[r][c]];
    }
  }
}

function shiftRows(state) {
  state[1] = [state[1][1], state[1][2], state[1][3], state[1][0]];
  state[2] = [state[2][2], state[2][3], state[2][0], state[2][1]];
  state[3] = [state[3][3], state[3][0], state[3][1], state[3][2]];
}

function mixColumns(state) {
  for (let c = 0; c < 4; c += 1) {
    const s0 = state[0][c];
    const s1 = state[1][c];
    const s2 = state[2][c];
    const s3 = state[3][c];

    state[0][c] = (gfMul(s0, 2) ^ gfMul(s1, 3) ^ s2 ^ s3) & 0xff;
    state[1][c] = (s0 ^ gfMul(s1, 2) ^ gfMul(s2, 3) ^ s3) & 0xff;
    state[2][c] = (s0 ^ s1 ^ gfMul(s2, 2) ^ gfMul(s3, 3)) & 0xff;
    state[3][c] = (gfMul(s0, 3) ^ s1 ^ s2 ^ gfMul(s3, 2)) & 0xff;
  }
}

export function expandKey(keyBytes) {
  const key = Uint8Array.from(keyBytes);
  const nk = key.length / 4;
  if (!(nk === 4 || nk === 8)) {
    throw new Error("AES key must be 16 or 32 bytes");
  }
  const nr = nk + 6;
  const totalWords = 4 * (nr + 1);

  const words = new Array(totalWords);
  for (let i = 0; i < nk; i += 1) {
    words[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
  }

  let rcon = 1;
  for (let i = nk; i < totalWords; i += 1) {
    let temp = words[i - 1].slice();
    if (i % nk === 0) {
      temp = subWord(rotWord(temp));
      temp[0] ^= rcon;
      rcon = xtime(rcon);
    } else if (nk > 6 && i % nk === 4) {
      temp = subWord(temp);
    }
    words[i] = xorWord(words[i - nk], temp);
  }

  return { words, rounds: nr };
}

export function encryptBlock(block16, expandedKey) {
  const block = Uint8Array.from(block16);
  if (block.length !== 16) throw new Error("AES block must be 16 bytes");
  const { words, rounds } = expandedKey;

  const state = [
    [block[0], block[4], block[8], block[12]],
    [block[1], block[5], block[9], block[13]],
    [block[2], block[6], block[10], block[14]],
    [block[3], block[7], block[11], block[15]],
  ];

  addRoundKey(state, words, 0);
  for (let round = 1; round < rounds; round += 1) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, words, round);
  }
  subBytes(state);
  shiftRows(state);
  addRoundKey(state, words, rounds);

  return Uint8Array.from([
    state[0][0], state[1][0], state[2][0], state[3][0],
    state[0][1], state[1][1], state[2][1], state[3][1],
    state[0][2], state[1][2], state[2][2], state[3][2],
    state[0][3], state[1][3], state[2][3], state[3][3],
  ]);
}

function incrementCounter(counter) {
  for (let i = counter.length - 1; i >= 0; i -= 1) {
    counter[i] = (counter[i] + 1) & 0xff;
    if (counter[i] !== 0) break;
  }
}

export function aesCtrTransform(inputBytes, keyBytes, iv16) {
  const input = Uint8Array.from(inputBytes);
  const iv = Uint8Array.from(iv16);
  if (iv.length !== 16) throw new Error("CTR IV must be 16 bytes");
  const expanded = expandKey(keyBytes);
  const out = new Uint8Array(input.length);
  const counter = Uint8Array.from(iv);

  for (let offset = 0; offset < input.length; offset += 16) {
    const keystream = encryptBlock(counter, expanded);
    const len = Math.min(16, input.length - offset);
    for (let i = 0; i < len; i += 1) {
      out[offset + i] = input[offset + i] ^ keystream[i];
    }
    incrementCounter(counter);
  }

  return out;
}
