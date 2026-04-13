import { createHash } from "node:crypto";

export const computeSessionMessageSourceHash = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex");
