import type { ProviderStackId } from "../../../../types/provider";

export const inferProviderIdFromRunSlug = (
  runSlug: string
): ProviderStackId | null => {
  const normalized = runSlug.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.includes("gpt") || normalized.includes("o1")) {
    return "codexCli";
  }
  if (
    normalized.includes("claude") ||
    normalized.includes("sonnet") ||
    normalized.includes("opus") ||
    normalized.includes("haiku")
  ) {
    return "claudeCodeCli";
  }
  return null;
};

export const normalizeProviderId = (value: unknown): ProviderStackId | null => {
  if (value === "codexCli" || value === "claudeCodeCli") {
    return value;
  }
  return null;
};
