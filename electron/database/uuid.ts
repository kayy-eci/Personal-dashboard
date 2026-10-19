/**
 * Main-process re-export of the shared UUIDv7 generator (renderer-safe Web
 * Crypto implementation in lib/uuid.ts). Kept here so existing imports and
 * tests keep their paths.
 */
export { uuidv7 } from "../../lib/uuid";
