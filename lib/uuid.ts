/**
 * UUIDv7 generator shared by the Electron main process and the renderer
 * (block duplication assigns ids directly in the editor). Uses Web Crypto so
 * a single implementation works everywhere; format identical to the
 * previous Node-only version (48-bit timestamp, version 7, variant 10).
 */

const maximumTimestamp = 0xffff_ffff_ffff;

export function uuidv7(timestamp = Date.now()): string {
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    timestamp > maximumTimestamp
  ) {
    throw new RangeError("UUIDv7 timestamp must be an integer in the 48-bit range");
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp & 0xff;
    timestamp = Math.floor(timestamp / 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let hexadecimal = "";
  for (const byte of bytes) {
    hexadecimal += byte.toString(16).padStart(2, "0");
  }
  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20),
  ].join("-");
}
