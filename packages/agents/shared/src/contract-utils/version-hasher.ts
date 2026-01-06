import { createHash } from "node:crypto";

/**
 * Compute SHA256 hash for contract versioning.
 * Takes any serializable data and returns hex digest.
 */
export const computeVersionHash = (data: unknown): string => {
  const serialized = JSON.stringify(data);
  return createHash("sha256").update(serialized).digest("hex");
};
