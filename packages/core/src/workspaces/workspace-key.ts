import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";

export const getWorkspaceKeyFromPath = (
  workspacePath: string,
  fallback: string
): string => {
  const key = sanitizeWorkspaceSlug(workspacePath);
  return key.trim().length > 0 ? key : fallback;
};
