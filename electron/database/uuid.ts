import { randomBytes } from "node:crypto";

const maximumTimestamp = 0xffff_ffff_ffff;

export function uuidv7(timestamp = Date.now()): string {
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    timestamp > maximumTimestamp
  ) {
    throw new RangeError("UUIDv7 timestamp must be an integer in the 48-bit range");
  }

  const bytes = randomBytes(16);
  let remainingTimestamp = timestamp;

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remainingTimestamp & 0xff;
    remainingTimestamp = Math.floor(remainingTimestamp / 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hexadecimal = bytes.toString("hex");
  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20),
  ].join("-");
}
