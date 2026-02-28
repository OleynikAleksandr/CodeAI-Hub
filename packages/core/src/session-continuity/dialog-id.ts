import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";

const normalizeSlugToken = (value: string): string =>
  sanitizeWorkspaceSlug(value.trim().toLowerCase());

const resolveProviderSlug = (providerId: string): string => {
  const normalized = normalizeSlugToken(providerId);
  if (normalized === "codexcli") {
    return "codex";
  }
  if (normalized === "claudecodecli") {
    return "claude";
  }
  if (normalized === "geminicli") {
    return "gemini";
  }
  return normalized;
};

const resolveAgentRoleSlug = (role: string | null): string => {
  const normalized = role ? normalizeSlugToken(role) : "";
  if (normalized.length === 0) {
    return "agent";
  }
  return normalized;
};

export const buildHumanReadableDialogId = (options: {
  readonly providerId: string;
  readonly uuid: string;
  readonly agentRole: string | null;
}): string => {
  const provider = resolveProviderSlug(options.providerId);
  const uuid = normalizeSlugToken(options.uuid);
  const role = resolveAgentRoleSlug(options.agentRole);
  return sanitizeWorkspaceSlug(`${provider}-${uuid}-${role}`);
};
