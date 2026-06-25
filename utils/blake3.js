const OUT_LEN = 32;
const BLOCK_LEN = 64;
const CHUNK_LEN = 1024;
const ROUNDS = 7;

const CHUNK_START = 1 << 0;
const CHUNK_END = 1 << 1;
const PARENT = 1 << 2;
const ROOT = 1 << 3;

const IV = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const MSG_PERMUTATION = new Uint8Array([2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8]);

function rotr32(x, n) {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function g(state, a, b, c, d, mx, my) {
  state[a] = (state[a] + state[b] + mx) >>> 0;
  state[d] = rotr32(state[d] ^ state[a], 16);
  state[c] = (state[c] + state[d]) >>> 0;
  state[b] = rotr32(state[b] ^ state[c], 12);
  state[a] = (state[a] + state[b] + my) >>> 0;
  state[d] = rotr32(state[d] ^ state[a], 8);
  state[c] = (state[c] + state[d]) >>> 0;
  state[b] = rotr32(state[b] ^ state[c], 7);
}

function roundFn(state, msg) {
  g(state, 0, 4, 8, 12, msg[0], msg[1]);
  g(state, 1, 5, 9, 13, msg[2], msg[3]);
  g(state, 2, 6, 10, 14, msg[4], msg[5]);
  g(state, 3, 7, 11, 15, msg[6], msg[7]);
  g(state, 0, 5, 10, 15, msg[8], msg[9]);
  g(state, 1, 6, 11, 12, msg[10], msg[11]);
  g(state, 2, 7, 8, 13, msg[12], msg[13]);
  g(state, 3, 4, 9, 14, msg[14], msg[15]);
}

function permute(msg) {
  const out = new Uint32Array(16);
  for (let i = 0; i < 16; i += 1) out[i] = msg[MSG_PERMUTATION[i]];
  return out;
}

function wordsFromBytes(block) {
  const out = new Uint32Array(16);
  for (let i = 0; i < 16; i += 1) {
    const j = i * 4;
    out[i] = (block[j] | (block[j + 1] << 8) | (block[j + 2] << 16) | (block[j + 3] << 24)) >>> 0;
  }
  return out;
}

function bytesFromWords(words) {
  const out = new Uint8Array(words.length * 4);
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i] >>> 0;
    const j = i * 4;
    out[j] = w & 0xff;
    out[j + 1] = (w >>> 8) & 0xff;
    out[j + 2] = (w >>> 16) & 0xff;
    out[j + 3] = (w >>> 24) & 0xff;
  }
  return out;
}

function compress(cv, blockWords, counter, blockLen, flags) {
  const state = new Uint32Array(16);
  state.set(cv, 0);
  state.set(IV, 8);
  state[12] = counter >>> 0;
  state[13] = Math.floor(counter / 0x100000000) >>> 0;
  state[14] = blockLen >>> 0;
  state[15] = flags >>> 0;

  let msg = blockWords;
  for (let r = 0; r < ROUNDS; r += 1) {
    roundFn(state, msg);
    msg = permute(msg);
  }

  const out = new Uint32Array(16);
  for (let i = 0; i < 8; i += 1) {
    out[i] = (state[i] ^ state[i + 8]) >>> 0;
    out[i + 8] = (state[i + 8] ^ cv[i]) >>> 0;
  }
  return out;
}

class Output {
  constructor(inputCv, blockWords, counter, blockLen, flags) {
    this.inputCv = inputCv;
    this.blockWords = blockWords;
    this.counter = counter;
    this.blockLen = blockLen;
    this.flags = flags;
  }

  chainingValue() {
    return compress(this.inputCv, this.blockWords, this.counter, this.blockLen, this.flags).subarray(0, 8);
  }

  rootBytes(outLen) {
    const out = new Uint8Array(outLen);
    let produced = 0;
    let outputBlockCounter = 0;
    while (produced < outLen) {
      const words = compress(
        this.inputCv,
        this.blockWords,
        outputBlockCounter,
        this.blockLen,
        this.flags | ROOT
      );
      const blockBytes = bytesFromWords(words);
      const take = Math.min(blockBytes.length, outLen - produced);
      out.set(blockBytes.subarray(0, take), produced);
      produced += take;
      outputBlockCounter += 1;
    }
    return out;
  }
}

function parentOutput(leftCv, rightCv) {
  const blockWords = new Uint32Array(16);
  blockWords.set(leftCv, 0);
  blockWords.set(rightCv, 8);
  return new Output(IV, blockWords, 0, BLOCK_LEN, PARENT);
}

function chunkOutput(chunkBytes, chunkIndex) {
  let cv = IV;
  const blockCount = Math.ceil(chunkBytes.length / BLOCK_LEN) || 1;
  let blockStart = 0;
  for (let b = 0; b < blockCount - 1; b += 1) {
    const block = chunkBytes.subarray(blockStart, blockStart + BLOCK_LEN);
    const blockWords = wordsFromBytes(block);
    const flags = b === 0 ? CHUNK_START : 0;
    const out = compress(cv, blockWords, chunkIndex, BLOCK_LEN, flags);
    cv = out.subarray(0, 8);
    blockStart += BLOCK_LEN;
  }

  const finalBlock = new Uint8Array(BLOCK_LEN);
  const tail = chunkBytes.subarray(blockStart);
  finalBlock.set(tail, 0);
  const finalWords = wordsFromBytes(finalBlock);
  let flags = CHUNK_END;
  if (blockCount === 1) flags |= CHUNK_START;
  return new Output(cv, finalWords, chunkIndex, tail.length, flags);
}

function parentCv(leftCv, rightCv) {
  return parentOutput(leftCv, rightCv).chainingValue();
}

function addChunkChainingValue(stack, newCv, totalChunks) {
  let cv = newCv;
  let count = totalChunks;
  while ((count & 1) === 0) {
    const left = stack.pop();
    cv = parentCv(left, cv);
    count >>>= 1;
  }
  stack.push(cv);
}

export function blake3(input) {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const chunkCount = Math.ceil(data.length / CHUNK_LEN) || 1;
  const cvStack = [];

  for (let i = 0; i < chunkCount - 1; i += 1) {
    const start = i * CHUNK_LEN;
    const cv = chunkOutput(data.subarray(start, start + CHUNK_LEN), i).chainingValue();
    addChunkChainingValue(cvStack, cv, i + 1);
  }

  const lastIndex = chunkCount - 1;
  const lastStart = lastIndex * CHUNK_LEN;
  let output = chunkOutput(data.subarray(lastStart), lastIndex);
  while (cvStack.length > 0) {
    output = parentOutput(cvStack.pop(), output.chainingValue());
  }
  return output.rootBytes(OUT_LEN);
}

export function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
