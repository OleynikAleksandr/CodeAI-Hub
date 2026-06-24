import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";

const normalizeSlugToken = (value: string): string =>
  sanitizeWorkspaceSlug(value.trim().toLowerCase());

const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";
const PRODUCT_PARTS_SEGMENT = "product-parts";
const CLUSTERS_SEGMENT = "clusters";
const MODULES_SEGMENT = "modules";
const PATH_SEPARATOR_RE = /[\\/]+/;

const resolveProviderSlug = (providerId: string): string => {
  const normalized = normalizeSlugToken(providerId);
  if (normalized === "codexcli") {
    return "codex";
  }
  if (normalized === "claudecodecli") {
    return "claude";
  }
  return normalized;
};

const readSegmentAfter = (
  segments: readonly string[],
  segmentName: string,
  startIndex: number
): string | null => {
  const index = segments.indexOf(segmentName, startIndex);
  return index >= 0 ? (segments[index + 1] ?? null) : null;
};

const resolveDevelopmentTreeRoleSlug = (role: string): string | null => {
  if (!role.startsWith(DEVELOPMENT_TREE_STAGE_PREFIX)) {
    return null;
  }
  const segments = role.split(PATH_SEPARATOR_RE).filter(Boolean);
  const productPartsIndex = segments.indexOf(PRODUCT_PARTS_SEGMENT);
  if (productPartsIndex < 0) {
    return null;
  }

  const partId = segments[productPartsIndex + 1] ?? null;
  const clusterId = readSegmentAfter(
    segments,
    CLUSTERS_SEGMENT,
    productPartsIndex + 2
  );
  const moduleId = readSegmentAfter(
    segments,
    MODULES_SEGMENT,
    productPartsIndex + 2
  );
  return [partId, clusterId, moduleId]
    .filter((segment): segment is string => Boolean(segment))
    .map(normalizeSlugToken)
    .join("-");
};

const resolveAgentRoleSlug = (role: string | null): string => {
  const developmentTreeRole = role ? resolveDevelopmentTreeRoleSlug(role) : "";
  const normalized =
    developmentTreeRole || (role ? normalizeSlugToken(role) : "");
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
