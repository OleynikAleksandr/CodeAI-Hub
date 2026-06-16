import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";

export const providerIdSet = new Set<ProviderStackId>([
  "claudeCodeCli",
  "codexCli",
  "geminiCli",
  "kimiCode",
  "glmClaudeCode",
  "glmOpenCode",
  "localModels",
]);

const isProviderDescriptorCandidate = (
  value: unknown
): value is ProviderStackDescriptor => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") {
    return false;
  }
  const providerId = candidate.id as ProviderStackId;
  if (!providerIdSet.has(providerId)) {
    return false;
  }

  const hasValidStatusMessage =
    candidate.statusMessage === undefined ||
    candidate.statusMessage === null ||
    typeof candidate.statusMessage === "string";

  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.connected === "boolean" &&
    hasValidStatusMessage
  );
};

export const parseProviderList = (
  candidates: unknown
): readonly ProviderStackDescriptor[] => {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const result: ProviderStackDescriptor[] = [];
  for (const candidate of candidates) {
    if (isProviderDescriptorCandidate(candidate)) {
      result.push(candidate);
    }
  }

  return result;
};

export const isSessionRecordCandidate = (
  value: unknown
): value is SessionRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.createdAt !== "number" ||
    !Array.isArray(candidate.providerIds)
  ) {
    return false;
  }

  for (const providerId of candidate.providerIds) {
    if (!providerIdSet.has(providerId as ProviderStackId)) {
      return false;
    }
  }
  if (
    !candidate.binding ||
    typeof candidate.binding !== "object" ||
    !("status" in candidate.binding)
  ) {
    return false;
  }

  const binding = candidate.binding as {
    readonly providerSessionId?: unknown;
    readonly status?: unknown;
  };
  if (
    binding.providerSessionId !== null &&
    typeof binding.providerSessionId !== "string"
  ) {
    return false;
  }
  return (
    binding.status === "pending" ||
    binding.status === "ready" ||
    binding.status === "failed"
  );
};
